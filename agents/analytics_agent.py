"""
Analytics Agent - Computes performance analytics and identifies learning patterns.
Provides data-driven insights for both students and faculty.
"""
import json
import sys
sys.path.insert(0, '.')

try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

from config import GEMINI_API_KEY, LLM_MODEL, USE_MOCK_LLM
from database import get_session, User, Course, Assignment, Submission, Evaluation, Enrollment


class AnalyticsAgent:
    """
    AI-powered Analytics Agent for academic performance analysis.
    
    Provides:
    - Student-level performance summaries
    - Class-level analytics for faculty
    - Learning gap identification
    - Performance trend analysis
    - Subject-wise comprehension scoring
    """

    def __init__(self):
        self.use_mock = USE_MOCK_LLM or not GEMINI_API_KEY or not GENAI_AVAILABLE
        if not self.use_mock and GENAI_AVAILABLE:
            genai.configure(api_key=GEMINI_API_KEY)
            self.model = genai.GenerativeModel(LLM_MODEL)

    def get_student_performance(self, student_id: int) -> dict:
        """
        Get comprehensive performance analytics for a student.
        
        Returns:
            dict with: overall_average, course_performance, topic_mastery,
                       performance_trend, mastery_summary, recommendations
        """
        session = get_session()
        try:
            student = session.query(User).filter(User.id == student_id).first()
            if not student:
                return {"error": "Student not found"}

            submissions = session.query(Submission).filter(
                Submission.student_id == student_id
            ).all()

            course_performance = {}
            all_topic_scores = {}
            performance_trend = []
            total_score = 0
            total_max = 0
            evaluated_count = 0

            for sub in submissions:
                eval_ = sub.evaluation
                assignment = sub.assignment
                course = assignment.course

                if eval_:
                    evaluated_count += 1
                    percentage = eval_.percentage

                    # Course-level aggregation
                    if course.code not in course_performance:
                        course_performance[course.code] = {
                            "course_name": course.name,
                            "scores": [],
                            "mastery_levels": [],
                        }
                    course_performance[course.code]["scores"].append(percentage)
                    course_performance[course.code]["mastery_levels"].append(eval_.mastery_level)

                    # Topic scores aggregation
                    for topic, score in eval_.topic_scores.items():
                        if topic not in all_topic_scores:
                            all_topic_scores[topic] = []
                        all_topic_scores[topic].append(score)

                    # Performance trend
                    performance_trend.append({
                        "date": sub.submitted_at.strftime("%Y-%m-%d"),
                        "score": percentage,
                        "assignment": assignment.title[:30],
                        "course": course.code,
                    })

                    total_score += eval_.overall_score
                    total_max += eval_.max_score

            # Compute averages
            overall_avg = (total_score / total_max * 100) if total_max > 0 else 0

            for code in course_performance:
                scores = course_performance[code]["scores"]
                course_performance[code]["average"] = round(sum(scores) / len(scores), 1) if scores else 0
                # Most common mastery level
                levels = course_performance[code]["mastery_levels"]
                course_performance[code]["mastery"] = max(set(levels), key=levels.count) if levels else "N/A"

            # Topic mastery averages
            topic_mastery = {}
            for topic, scores in all_topic_scores.items():
                avg = round(sum(scores) / len(scores), 1)
                topic_mastery[topic] = {
                    "average_score": avg,
                    "mastery_level": self._score_to_mastery(avg),
                    "attempts": len(scores),
                }

            # Sort trend by date
            performance_trend.sort(key=lambda x: x["date"])

            # Identify weak and strong areas
            weak_topics = [t for t, d in topic_mastery.items() if d["average_score"] < 65]
            strong_topics = [t for t, d in topic_mastery.items() if d["average_score"] >= 80]

            # Generate recommendations
            recommendations = self._generate_student_recommendations(
                overall_avg, weak_topics, strong_topics, course_performance
            )

            return {
                "student_name": student.full_name,
                "overall_average": round(overall_avg, 1),
                "total_submissions": len(submissions),
                "evaluated_submissions": evaluated_count,
                "course_performance": course_performance,
                "topic_mastery": topic_mastery,
                "performance_trend": performance_trend,
                "weak_topics": weak_topics,
                "strong_topics": strong_topics,
                "recommendations": recommendations,
                "overall_mastery": self._score_to_mastery(overall_avg),
            }
        finally:
            session.close()

    def get_class_analytics(self, course_id: int) -> dict:
        """
        Get class-level analytics for a course (faculty view).
        
        Returns:
            dict with: class_average, grade_distribution, submission_stats,
                       topic_analysis, student_rankings, learning_gaps, at_risk_students
        """
        session = get_session()
        try:
            course = session.query(Course).filter(Course.id == course_id).first()
            if not course:
                return {"error": "Course not found"}

            assignments = session.query(Assignment).filter(
                Assignment.course_id == course_id
            ).all()

            enrollments = session.query(Enrollment).filter(
                Enrollment.course_id == course_id
            ).all()

            total_students = len(enrollments)
            enrolled_student_ids = [e.student_id for e in enrollments]

            # Gather all evaluations for this course
            student_scores = {}  # student_id -> list of percentages
            topic_all_scores = {}  # topic -> list of scores
            all_percentages = []
            total_submissions = 0
            evaluated_submissions = 0
            overdue_count = 0
            assignment_stats = []

            for assignment in assignments:
                submissions = session.query(Submission).filter(
                    Submission.assignment_id == assignment.id
                ).all()

                submitted_ids = [s.student_id for s in submissions]
                not_submitted = [sid for sid in enrolled_student_ids if sid not in submitted_ids]

                a_scores = []
                for sub in submissions:
                    total_submissions += 1
                    if sub.evaluation:
                        evaluated_submissions += 1
                        pct = sub.evaluation.percentage
                        a_scores.append(pct)
                        all_percentages.append(pct)

                        if sub.student_id not in student_scores:
                            student_scores[sub.student_id] = []
                        student_scores[sub.student_id].append(pct)

                        for topic, score in sub.evaluation.topic_scores.items():
                            if topic not in topic_all_scores:
                                topic_all_scores[topic] = []
                            topic_all_scores[topic].append(score)

                if assignment.is_overdue and not_submitted:
                    overdue_count += len(not_submitted)

                assignment_stats.append({
                    "title": assignment.title,
                    "type": assignment.assignment_type,
                    "submitted": len(submissions),
                    "total_students": total_students,
                    "completion_rate": round(len(submissions) / max(total_students, 1) * 100, 1),
                    "average_score": round(sum(a_scores) / len(a_scores), 1) if a_scores else 0,
                    "is_overdue": assignment.is_overdue,
                    "due_date": assignment.due_date.strftime("%Y-%m-%d") if assignment.due_date else "N/A",
                })

            # Class average
            class_avg = round(sum(all_percentages) / len(all_percentages), 1) if all_percentages else 0

            # Grade distribution
            grade_dist = {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}
            for p in all_percentages:
                if p >= 90: grade_dist["A"] += 1
                elif p >= 80: grade_dist["B"] += 1
                elif p >= 70: grade_dist["C"] += 1
                elif p >= 60: grade_dist["D"] += 1
                else: grade_dist["F"] += 1

            # Student rankings
            student_rankings = []
            at_risk_students = []
            for sid, scores in student_scores.items():
                student = session.query(User).filter(User.id == sid).first()
                avg = round(sum(scores) / len(scores), 1)
                student_rankings.append({
                    "student_name": student.full_name if student else f"Student #{sid}",
                    "student_id": sid,
                    "average_score": avg,
                    "submissions_count": len(scores),
                    "mastery_level": self._score_to_mastery(avg),
                })
                if avg < 60:
                    at_risk_students.append({
                        "name": student.full_name if student else f"Student #{sid}",
                        "average": avg,
                        "concern": "Below passing threshold",
                    })

            student_rankings.sort(key=lambda x: x["average_score"], reverse=True)

            # Topic analysis
            topic_analysis = {}
            learning_gaps = []
            for topic, scores in topic_all_scores.items():
                avg = round(sum(scores) / len(scores), 1)
                topic_analysis[topic] = {
                    "average": avg,
                    "min": round(min(scores), 1),
                    "max": round(max(scores), 1),
                    "mastery": self._score_to_mastery(avg),
                }
                if avg < 65:
                    learning_gaps.append({
                        "topic": topic,
                        "average_score": avg,
                        "severity": "High" if avg < 50 else "Medium",
                    })

            learning_gaps.sort(key=lambda x: x["average_score"])

            # Students who haven't submitted
            pending_students = total_students * len(assignments) - total_submissions

            return {
                "course_name": course.name,
                "course_code": course.code,
                "total_students": total_students,
                "class_average": class_avg,
                "grade_distribution": grade_dist,
                "total_submissions": total_submissions,
                "evaluated_submissions": evaluated_submissions,
                "pending_submissions": pending_students,
                "overdue_submissions": overdue_count,
                "assignment_stats": assignment_stats,
                "student_rankings": student_rankings,
                "topic_analysis": topic_analysis,
                "learning_gaps": learning_gaps,
                "at_risk_students": at_risk_students,
                "overall_mastery": self._score_to_mastery(class_avg),
            }
        finally:
            session.close()

    def generate_insights(self, analytics_data: dict) -> str:
        """Generate AI-powered textual insights from analytics data."""
        if self.use_mock:
            return self._mock_insights(analytics_data)
        
        try:
            prompt = f"""You are an educational data analyst. Based on the following academic analytics data, 
provide 3-5 key insights and actionable recommendations for the instructor.

Analytics Data:
{json.dumps(analytics_data, indent=2, default=str)[:3000]}

Provide concise, actionable insights focusing on:
1. Overall class performance trends
2. Specific learning gaps that need attention
3. Students who may need additional support
4. Topics that require re-teaching or supplementary materials
5. Positive trends to reinforce

Format as bullet points. Be specific and data-driven."""

            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return self._mock_insights(analytics_data)

    def _mock_insights(self, data: dict) -> str:
        """Generate mock insights based on analytics data."""
        insights = []
        
        class_avg = data.get("class_average", 0)
        if class_avg >= 80:
            insights.append(f"📊 **Strong Class Performance**: The class average of {class_avg}% indicates good overall understanding of the material.")
        elif class_avg >= 60:
            insights.append(f"📊 **Moderate Class Performance**: The class average of {class_avg}% suggests some students may need additional support.")
        else:
            insights.append(f"⚠️ **Concerning Class Performance**: The class average of {class_avg}% indicates widespread difficulty with the material.")

        gaps = data.get("learning_gaps", [])
        if gaps:
            gap_topics = ", ".join([g["topic"] for g in gaps[:3]])
            insights.append(f"🔍 **Learning Gaps Identified**: Topics needing attention: {gap_topics}. Consider scheduling review sessions.")

        at_risk = data.get("at_risk_students", [])
        if at_risk:
            insights.append(f"🚨 **At-Risk Students**: {len(at_risk)} student(s) are below the passing threshold. Individual intervention recommended.")

        pending = data.get("pending_submissions", 0)
        if pending > 0:
            insights.append(f"📋 **Pending Submissions**: {pending} submission(s) are still outstanding. Consider sending reminders.")

        overdue = data.get("overdue_submissions", 0)
        if overdue > 0:
            insights.append(f"⏰ **Overdue Alerts**: {overdue} submission(s) are overdue. Follow up with affected students.")

        grade_dist = data.get("grade_distribution", {})
        if grade_dist:
            total = sum(grade_dist.values())
            if total > 0:
                a_pct = round(grade_dist.get("A", 0) / total * 100)
                f_pct = round(grade_dist.get("F", 0) / total * 100)
                insights.append(f"📈 **Grade Distribution**: {a_pct}% A grades, {f_pct}% failing. {'Well balanced.' if f_pct < 20 else 'High failure rate needs attention.'}")

        return "\n\n".join(insights) if insights else "📊 Insufficient data to generate insights. More submissions needed."

    def _score_to_mastery(self, score: float) -> str:
        """Convert a percentage score to mastery level."""
        if score >= 90:
            return "expert"
        elif score >= 75:
            return "advanced"
        elif score >= 55:
            return "intermediate"
        else:
            return "beginner"

    def _generate_student_recommendations(self, overall_avg, weak_topics, strong_topics, course_performance):
        """Generate personalized recommendations for a student."""
        recs = []
        
        if overall_avg >= 85:
            recs.append("🌟 Excellent performance! Consider mentoring peers or taking on advanced projects.")
        elif overall_avg >= 70:
            recs.append("👍 Good performance! Focus on consistency and deepening understanding of challenging topics.")
        else:
            recs.append("📚 Dedicate more study time and seek help from instructors during office hours.")

        if weak_topics:
            recs.append(f"🎯 Priority improvement areas: {', '.join(weak_topics[:3])}")
        
        if strong_topics:
            recs.append(f"💪 Leverage your strengths in {', '.join(strong_topics[:2])} to build confidence")

        # Course-specific recommendations
        for code, data in course_performance.items():
            if data.get("average", 0) < 60:
                recs.append(f"⚠️ Need significant improvement in {data['course_name']} (avg: {data['average']}%)")

        return recs
