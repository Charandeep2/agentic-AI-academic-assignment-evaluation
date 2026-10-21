"""
Assessment Agent - Evaluates student submissions using LLM or heuristic-based analysis.
This agent forms the core of the automated assessment pipeline.
"""
import json
import re
import random
from datetime import datetime

# Try to import Google Generative AI
try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

import sys
sys.path.insert(0, '.')
from config import GEMINI_API_KEY, LLM_MODEL, USE_MOCK_LLM


class AssessmentAgent:
    """
    Agentic AI Assessment Agent that evaluates student submissions.
    
    Supports two modes:
    1. LLM Mode: Uses Google Gemini for intelligent evaluation
    2. Mock Mode: Uses heuristic analysis for demonstration
    """

    def __init__(self):
        self.use_mock = USE_MOCK_LLM or not GEMINI_API_KEY or not GENAI_AVAILABLE
        if not self.use_mock and GENAI_AVAILABLE:
            genai.configure(api_key=GEMINI_API_KEY)
            self.model = genai.GenerativeModel(LLM_MODEL)
        self.evaluation_criteria = [
            "completeness", "correctness", "code_quality",
            "understanding", "creativity", "documentation"
        ]

    def evaluate(self, submission_content: str, assignment_description: str,
                 topics: list, max_marks: float = 100.0) -> dict:
        """
        Evaluate a student submission.
        
        Args:
            submission_content: The text/code content of the submission
            assignment_description: What the assignment requires
            topics: List of topic strings the assignment covers
            max_marks: Maximum marks for the assignment
            
        Returns:
            dict with keys: overall_score, topic_scores, strengths, weaknesses,
                           feedback, suggestions, mastery_level
        """
        if self.use_mock:
            return self._mock_evaluate(submission_content, assignment_description, topics, max_marks)
        else:
            return self._llm_evaluate(submission_content, assignment_description, topics, max_marks)

    def _llm_evaluate(self, content: str, description: str, topics: list, max_marks: float) -> dict:
        """Evaluate using Google Gemini LLM."""
        prompt = f"""You are an expert academic evaluator. Evaluate the following student submission thoroughly.

## Assignment Description:
{description}

## Topics Covered:
{', '.join(topics)}

## Maximum Marks: {max_marks}

## Student Submission:
{content}

## Evaluation Instructions:
1. Assess the submission against the assignment requirements
2. Evaluate mastery of each topic listed
3. Identify specific strengths and weaknesses
4. Provide constructive, personalized feedback
5. Suggest areas for improvement

## Required JSON Output Format:
{{
    "overall_score": <float between 0 and {max_marks}>,
    "topic_scores": {{ {', '.join([f'"{t}": <score 0-100>' for t in topics])} }},
    "strengths": "<bullet-pointed list of specific strengths>",
    "weaknesses": "<bullet-pointed list of specific areas for improvement>",
    "feedback": "<comprehensive paragraph of constructive feedback>",
    "suggestions": "<specific actionable suggestions for improvement>",
    "mastery_level": "<one of: beginner, intermediate, advanced, expert>"
}}

Respond ONLY with valid JSON. Be fair, constructive, and specific in your evaluation."""

        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Extract JSON from response (handle markdown code blocks)
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            result = json.loads(response_text)
            
            # Validate and clamp values
            result["overall_score"] = max(0, min(max_marks, float(result.get("overall_score", 0))))
            for topic in topics:
                if topic in result.get("topic_scores", {}):
                    result["topic_scores"][topic] = max(0, min(100, float(result["topic_scores"][topic])))
            
            if result.get("mastery_level") not in ["beginner", "intermediate", "advanced", "expert"]:
                result["mastery_level"] = self._determine_mastery(result["overall_score"], max_marks)
            
            return result
        except Exception as e:
            print(f"LLM evaluation failed, falling back to mock: {e}")
            return self._mock_evaluate(content, description, topics, max_marks)

    def _mock_evaluate(self, content: str, description: str, topics: list, max_marks: float) -> dict:
        """
        Heuristic-based evaluation for mock/demo mode.
        Analyzes content structure, length, keyword presence, code quality, etc.
        """
        scores = {}
        
        # ---- Content Analysis ----
        content_lower = content.lower()
        word_count = len(content.split())
        line_count = len(content.strip().split('\n'))
        has_code = bool(re.search(r'(def |class |import |for |while |if |```)', content))
        has_comments = bool(re.search(r'(#.*|//.*|/\*.*\*/|\'\'\'.*\'\'\'|""".*""")', content, re.DOTALL))
        has_docstrings = bool(re.search(r'(\'\'\'|""")', content))
        has_examples = bool(re.search(r'(example|demo|output|result|print)', content_lower))
        has_structure = bool(re.search(r'(##|class |def )', content))
        
        # ---- Base Score Calculation ----
        # Length score (0-25 points)
        if word_count > 300:
            length_score = 25
        elif word_count > 150:
            length_score = 20
        elif word_count > 80:
            length_score = 15
        elif word_count > 30:
            length_score = 10
        else:
            length_score = 5

        # Code quality score (0-25 points)
        code_score = 0
        if has_code:
            code_score += 10
        if has_comments or has_docstrings:
            code_score += 8
        if has_examples:
            code_score += 7

        # Structure score (0-25 points)
        structure_score = 0
        if has_structure:
            structure_score += 10
        if line_count > 20:
            structure_score += 8
        if bool(re.search(r'(def |class )', content)):
            structure_score += 7

        # Topic relevance score (0-25 points)
        topic_matches = 0
        for topic in topics:
            topic_words = topic.lower().split()
            for word in topic_words:
                if word in content_lower:
                    topic_matches += 1
                    break
        topic_ratio = topic_matches / max(len(topics), 1)
        topic_score = int(topic_ratio * 25)

        # Overall base score
        base_score = length_score + code_score + structure_score + topic_score
        
        # Add some controlled randomness for realism
        random.seed(hash(content[:100]) % 10000)
        noise = random.uniform(-5, 5)
        overall_percentage = max(15, min(98, base_score + noise))
        overall_score = round((overall_percentage / 100) * max_marks, 1)

        # ---- Topic-wise Scores ----
        for topic in topics:
            topic_lower = topic.lower()
            topic_words = topic_lower.split()
            
            # Check how well this topic is covered
            mentions = sum(1 for w in topic_words if w in content_lower)
            topic_coverage = mentions / max(len(topic_words), 1)
            
            base_topic = overall_percentage
            topic_variation = random.uniform(-12, 12)
            coverage_bonus = topic_coverage * 10
            
            scores[topic] = round(max(10, min(100, base_topic + topic_variation + coverage_bonus)), 1)

        # ---- Mastery Level ----
        mastery = self._determine_mastery(overall_score, max_marks)

        # ---- Generate Strengths & Weaknesses ----
        strengths_list = []
        weaknesses_list = []

        if word_count > 150:
            strengths_list.append("Comprehensive and detailed submission with thorough explanations")
        if has_code:
            strengths_list.append("Includes working code implementations demonstrating practical understanding")
        if has_docstrings:
            strengths_list.append("Well-documented code with docstrings and comments")
        if has_structure:
            strengths_list.append("Well-organized submission with clear structure and sections")
        if topic_ratio > 0.7:
            strengths_list.append("Good coverage of most required topics")
        if has_examples:
            strengths_list.append("Includes practical examples and demonstrations")

        if word_count < 80:
            weaknesses_list.append("Submission is too brief - needs more detailed explanations and examples")
        if not has_code:
            weaknesses_list.append("Missing code implementations to demonstrate practical skills")
        if not has_comments and not has_docstrings:
            weaknesses_list.append("Lacks code documentation - add comments and docstrings")
        if topic_ratio < 0.5:
            missing_topics = [t for t in topics if t.lower().split()[0] not in content_lower]
            if missing_topics:
                weaknesses_list.append(f"Missing coverage of topics: {', '.join(missing_topics[:3])}")
        if not has_structure:
            weaknesses_list.append("Improve organization with clear sections and headings")

        if not strengths_list:
            strengths_list.append("Submitted the assignment on time")
        if not weaknesses_list:
            weaknesses_list.append("Consider adding more advanced implementations for extra credit")

        strengths = "• " + "\n• ".join(strengths_list)
        weaknesses = "• " + "\n• ".join(weaknesses_list)

        # ---- Feedback & Suggestions ----
        feedback = self._generate_feedback(overall_percentage, mastery, strengths_list, weaknesses_list, topics)
        suggestions = self._generate_suggestions(overall_percentage, topics, weaknesses_list)

        return {
            "overall_score": overall_score,
            "topic_scores": scores,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "feedback": feedback,
            "suggestions": suggestions,
            "mastery_level": mastery,
        }

    def _determine_mastery(self, score: float, max_marks: float) -> str:
        """Determine mastery level from score percentage."""
        pct = (score / max_marks) * 100 if max_marks > 0 else 0
        if pct >= 90:
            return "expert"
        elif pct >= 75:
            return "advanced"
        elif pct >= 55:
            return "intermediate"
        else:
            return "beginner"

    def _generate_feedback(self, percentage, mastery, strengths, weaknesses, topics):
        """Generate comprehensive feedback paragraph."""
        if percentage >= 90:
            opening = "Outstanding work! Your submission demonstrates expert-level understanding."
        elif percentage >= 75:
            opening = "Great job! Your submission shows a strong grasp of the material."
        elif percentage >= 60:
            opening = "Good effort! Your submission shows understanding of the core concepts, with room for growth."
        elif percentage >= 40:
            opening = "Your submission addresses some basics, but needs significant improvement in several areas."
        else:
            opening = "Your submission needs substantial work. Please review the course materials and seek additional help."

        detail = f" You demonstrated particular strength in: {strengths[0].lower() if strengths else 'basic concepts'}."
        improvement = f" To improve, focus on: {weaknesses[0].lower() if weaknesses else 'adding more detail'}."
        closing = f" Keep practicing the topics covered ({', '.join(topics[:3])}) to strengthen your {mastery}-level understanding."

        return opening + detail + improvement + closing

    def _generate_suggestions(self, percentage, topics, weaknesses):
        """Generate actionable improvement suggestions."""
        suggestions = []
        
        if percentage < 60:
            suggestions.append(f"📚 Review the fundamentals of {topics[0] if topics else 'the subject'}")
            suggestions.append("🎯 Start with simpler examples and gradually increase complexity")
        if percentage < 80:
            suggestions.append(f"💻 Practice implementing {', '.join(topics[:2])} with hands-on coding exercises")
            suggestions.append("📖 Read additional reference materials and documentation")
        
        suggestions.append("🔄 Revisit your weak areas and attempt similar problems")
        suggestions.append(f"👥 Consider discussing {topics[-1] if topics else 'concepts'} with peers or in study groups")
        
        if percentage >= 80:
            suggestions.append("🚀 Challenge yourself with advanced problems to achieve expert mastery")

        return "• " + "\n• ".join(suggestions)
