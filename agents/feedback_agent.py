"""
Feedback Agent - Generates personalized, context-aware feedback using RAG.
Retrieves relevant course materials to provide targeted learning recommendations.
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


class FeedbackAgent:
    """
    RAG-powered Feedback Agent that generates personalized academic feedback.
    
    Uses retrieved course materials as context to provide:
    - Topic-specific learning resources
    - Personalized improvement plans
    - Concept explanations for weak areas
    """

    def __init__(self, knowledge_base=None):
        """
        Initialize the Feedback Agent.
        
        Args:
            knowledge_base: Optional KnowledgeBase instance for RAG retrieval
        """
        self.knowledge_base = knowledge_base
        self.use_mock = USE_MOCK_LLM or not GEMINI_API_KEY or not GENAI_AVAILABLE
        if not self.use_mock and GENAI_AVAILABLE:
            genai.configure(api_key=GEMINI_API_KEY)
            self.model = genai.GenerativeModel(LLM_MODEL)

    def generate_feedback(self, submission_content: str, evaluation: dict,
                          assignment_description: str, topics: list) -> dict:
        """
        Generate detailed personalized feedback using RAG context.
        
        Args:
            submission_content: Student's submission text
            evaluation: Dict from AssessmentAgent with scores and analysis
            assignment_description: The assignment description
            topics: List of topics covered
            
        Returns:
            dict with: detailed_feedback, learning_resources, improvement_plan, encouragement
        """
        # Retrieve relevant context from knowledge base
        rag_context = ""
        if self.knowledge_base:
            try:
                weak_topics = self._identify_weak_topics(evaluation.get("topic_scores", {}))
                query = f"Teaching materials for: {', '.join(weak_topics or topics)}"
                rag_results = self.knowledge_base.query(query, n_results=3)
                if rag_results:
                    rag_context = "\n\n".join([doc for doc in rag_results])
            except Exception as e:
                print(f"RAG retrieval failed: {e}")

        if self.use_mock:
            return self._mock_feedback(evaluation, topics, rag_context)
        else:
            return self._llm_feedback(submission_content, evaluation,
                                       assignment_description, topics, rag_context)

    def _llm_feedback(self, content, evaluation, description, topics, rag_context):
        """Generate feedback using LLM with RAG context."""
        prompt = f"""You are a supportive academic tutor providing personalized feedback to a student.

## Assignment: {description}
## Topics: {', '.join(topics)}

## Student's Evaluation:
- Overall Score: {evaluation.get('overall_score', 0)}/{evaluation.get('max_score', 100)}
- Mastery Level: {evaluation.get('mastery_level', 'unknown')}
- Strengths: {evaluation.get('strengths', 'N/A')}
- Weaknesses: {evaluation.get('weaknesses', 'N/A')}

## Topic Scores:
{json.dumps(evaluation.get('topic_scores', {}), indent=2)}

## Relevant Course Materials (RAG Context):
{rag_context if rag_context else 'No additional context available.'}

## Student's Submission:
{content[:2000]}

Generate a comprehensive, encouraging, and constructive feedback response in this JSON format:
{{
    "detailed_feedback": "<2-3 paragraphs of personalized, constructive feedback addressing specific aspects of the submission>",
    "learning_resources": ["<resource/topic suggestion 1>", "<resource/topic suggestion 2>", "<resource/topic suggestion 3>"],
    "improvement_plan": "<step-by-step plan for the student to improve in weak areas>",
    "encouragement": "<motivational closing message>"
}}

Be specific, reference their actual work, and be encouraging. Respond ONLY with valid JSON."""

        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
            return json.loads(text)
        except Exception as e:
            print(f"LLM feedback generation failed: {e}")
            return self._mock_feedback(evaluation, topics, rag_context)

    def _mock_feedback(self, evaluation, topics, rag_context=""):
        """Generate mock feedback based on evaluation results."""
        score = evaluation.get("overall_score", 0)
        max_score = evaluation.get("max_score", 100)
        percentage = (score / max_score) * 100 if max_score > 0 else 0
        mastery = evaluation.get("mastery_level", "intermediate")
        topic_scores = evaluation.get("topic_scores", {})
        
        weak_topics = self._identify_weak_topics(topic_scores)
        strong_topics = self._identify_strong_topics(topic_scores)

        # Detailed feedback based on performance level
        if percentage >= 90:
            detailed = (
                f"Excellent work! Your submission demonstrates expert-level mastery across the covered topics. "
                f"Your understanding of {', '.join(strong_topics[:2]) if strong_topics else 'the subject'} is particularly impressive. "
                f"The quality of your implementation and explanations shows deep conceptual understanding.\n\n"
                f"While your overall performance is outstanding, consider exploring advanced applications "
                f"and edge cases to further strengthen your expertise. "
                f"Your work could serve as a reference for other students."
            )
        elif percentage >= 75:
            detailed = (
                f"Great job on this submission! You show strong understanding of the core concepts, "
                f"especially in {', '.join(strong_topics[:2]) if strong_topics else 'several areas'}. "
                f"Your work demonstrates solid analytical and implementation skills.\n\n"
                f"To reach expert level, focus on deepening your understanding of "
                f"{', '.join(weak_topics[:2]) if weak_topics else 'the more challenging topics'}. "
                f"Adding more detailed explanations and handling edge cases will strengthen your work."
            )
        elif percentage >= 60:
            detailed = (
                f"Good effort on this assignment! You've demonstrated understanding of the fundamental concepts. "
                f"Your work on {', '.join(strong_topics[:1]) if strong_topics else 'the basics'} shows promise.\n\n"
                f"To improve significantly, dedicate more time to "
                f"{', '.join(weak_topics[:2]) if weak_topics else 'practicing implementations'}. "
                f"Try breaking complex problems into smaller parts and building up your solutions incrementally. "
                f"Don't hesitate to revisit the course materials for clarity."
            )
        else:
            detailed = (
                f"Thank you for your submission. While there are areas that need improvement, "
                f"every expert was once a beginner. Your willingness to attempt the assignment is the first step.\n\n"
                f"I recommend starting with the fundamentals of "
                f"{', '.join(weak_topics[:2]) if weak_topics else ', '.join(topics[:2])}. "
                f"Review the lecture notes, work through the examples step by step, and practice with "
                f"simpler problems before tackling complex ones. Consider attending office hours or "
                f"forming a study group for additional support."
            )

        # Learning resources
        resources = []
        for topic in (weak_topics or topics)[:3]:
            resources.append(f"Review course materials on '{topic}' - focus on fundamental concepts and examples")
        resources.append("Practice with online coding platforms (LeetCode, HackerRank) for hands-on experience")
        resources.append("Watch tutorial videos on the weak topics for visual learning reinforcement")

        # Add RAG-based resources if available
        if rag_context:
            resources.insert(0, f"📚 Relevant study material found in the knowledge base - review the course notes")

        # Improvement plan
        if percentage >= 75:
            plan = (
                "1. ✅ Continue your excellent practice with the strong topics\n"
                f"2. 📚 Deep-dive into {weak_topics[0] if weak_topics else topics[0]} with advanced examples\n"
                "3. 💻 Attempt challenge problems to push beyond current mastery\n"
                "4. 📝 Document your solutions with detailed explanations\n"
                "5. 🔄 Review and refactor your code for optimization"
            )
        elif percentage >= 50:
            plan = (
                f"1. 📖 Re-read course materials on {', '.join(weak_topics[:2]) if weak_topics else 'core topics'}\n"
                "2. 💻 Practice 2-3 problems daily on weak topics\n"
                "3. 📝 Write pseudo-code before implementing solutions\n"
                "4. 🤝 Discuss concepts with classmates or in study groups\n"
                "5. 🎯 Set small, achievable goals for each study session"
            )
        else:
            plan = (
                "1. 📚 Start by reviewing the basic concepts from lecture notes\n"
                f"2. 📖 Focus specifically on {topics[0] if topics else 'fundamentals'} first\n"
                "3. ✍️ Write out concepts in your own words to test understanding\n"
                "4. 💻 Follow along with code examples from class, then modify them\n"
                "5. 🆘 Visit office hours or tutoring center for personalized help\n"
                "6. 🔄 Re-attempt this assignment after reviewing the material"
            )

        # Encouragement
        encouragements = {
            "expert": "🏆 Outstanding achievement! Keep pushing boundaries - you're on track for excellence!",
            "advanced": "⭐ You're doing great! With a little more effort on the weak areas, expert level is within reach!",
            "intermediate": "📈 You're making solid progress! Every practice session brings you closer to mastery. Keep going!",
            "beginner": "🌱 Remember: every expert started where you are now. Stay consistent, ask for help, and you'll see improvement! You've got this!",
        }

        return {
            "detailed_feedback": detailed,
            "learning_resources": resources,
            "improvement_plan": plan,
            "encouragement": encouragements.get(mastery, "Keep up the good work! 💪"),
        }

    def _identify_weak_topics(self, topic_scores: dict, threshold: float = 70) -> list:
        """Identify topics where the student scored below threshold."""
        return [topic for topic, score in topic_scores.items() if score < threshold]

    def _identify_strong_topics(self, topic_scores: dict, threshold: float = 75) -> list:
        """Identify topics where the student scored above threshold."""
        return [topic for topic, score in topic_scores.items() if score >= threshold]
