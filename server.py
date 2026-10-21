"""
FastAPI Backend Server for AI Academic Assessment System.
Powered by Groq LLM API (qwen/qwen3.8-27b) and Agentic Evaluation Pipeline.
"""
import os
import json
import base64
import urllib.request
import urllib.error
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from agents.multi_agent_pipeline import (
    ExtractorAgent,
    EvaluatorAgent,
    AuditorAgent,
    MultiAgentPipeline,
    extract_text_from_file_data,
)

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")

app = FastAPI(
    title="AI Academic Assessment & Performance Analytics API",
    description="Agentic AI backend for evaluating student submissions using Groq LLM and RAG grounding.",
    version="1.0.0",
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EvaluationRequest(BaseModel):
    submissionContent: str
    assignmentTitle: str
    assignmentDescription: Optional[str] = ""
    topics: List[str]
    maxMarks: Optional[float] = 100.0
    submissionType: Optional[str] = "mixed"  # "theory", "code", or "mixed"


class ExtractRubricRequest(BaseModel):
    documentText: Optional[str] = ""
    fileData: Optional[str] = ""  # Base64 encoded or text
    fileName: Optional[str] = ""
    assignmentTitle: Optional[str] = ""
    totalPoints: Optional[float] = 100.0
    courseContext: Optional[str] = ""


class AgentEvaluateRequest(BaseModel):
    submissionContent: str
    rubric: Dict[str, Any]
    ragChunks: Optional[List[str]] = None
    fileName: Optional[str] = "solution.py"


class AgentAuditRequest(BaseModel):
    submissionContent: str
    rubric: Dict[str, Any]
    evaluatorDraft: Dict[str, Any]


class MultiAgentPipelineRequest(BaseModel):
    submissionContent: str
    assignment: Dict[str, Any]
    ragChunks: Optional[List[str]] = None
    fileName: Optional[str] = "solution.py"

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "AI Academic Assessment Backend",
        "llm_provider": "Groq",
        "model": GROQ_MODEL,
        "docs_url": "/docs",
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "groq_configured": bool(GROQ_API_KEY),
        "model": GROQ_MODEL,
    }

@app.post("/api/db/sync-user")
def sync_user(payload: Dict[str, Any]):
    """Sync a user into SQLite database (database.py)."""
    try:
        from database import get_session, User
        from auth import hash_password
        session = get_session()
        try:
            username = payload.get("username", "").strip()
            email = payload.get("email", "").strip().lower()
            if not username or not email:
                return {"status": "error", "message": "Missing username or email"}
            
            existing = session.query(User).filter(
                (User.username == username) | (User.email == email)
            ).first()

            if not existing:
                new_user = User(
                    username=username,
                    password_hash=hash_password(payload.get("password", "secret123")),
                    role=payload.get("role", "student"),
                    full_name=payload.get("fullName", username),
                    email=email,
                    department=payload.get("department", "Computer Science")
                )
                session.add(new_user)
                session.commit()
                return {"status": "created", "id": new_user.id, "username": new_user.username}
            return {"status": "exists", "id": existing.id, "username": existing.username}
        finally:
            session.close()
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/db/sync-course")
def sync_course(payload: Dict[str, Any]):
    """Sync a course into SQLite database (database.py)."""
    try:
        from database import get_session, Course, User
        session = get_session()
        try:
            code = payload.get("code", "CS100").strip().upper()
            existing = session.query(Course).filter(Course.code == code).first()
            if not existing:
                # Find faculty user or default to first faculty
                faculty = session.query(User).filter(User.role == "faculty").first()
                fac_id = faculty.id if faculty else 1
                new_course = Course(
                    code=code,
                    name=payload.get("name", "Untitled Course"),
                    department=payload.get("subject", "Computer Science"),
                    faculty_id=fac_id,
                    description=payload.get("section", "")
                )
                session.add(new_course)
                session.commit()
                return {"status": "created", "id": new_course.id, "code": new_course.code}
            return {"status": "exists", "id": existing.id, "code": existing.code}
        finally:
            session.close()
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/db/sync-enrollment")
def sync_enrollment(payload: Dict[str, Any]):
    """Sync an enrollment into SQLite database (database.py)."""
    try:
        from database import get_session, Enrollment, User, Course
        session = get_session()
        try:
            student_id = payload.get("studentId")
            course_code = payload.get("courseCode")
            # Lookup user and course
            user = session.query(User).filter((User.id == student_id) | (User.username == student_id)).first()
            course = session.query(Course).filter(Course.code == course_code).first() if course_code else None
            if user and course:
                existing_enroll = session.query(Enrollment).filter(
                    Enrollment.student_id == user.id,
                    Enrollment.course_id == course.id
                ).first()
                if not existing_enroll:
                    enroll = Enrollment(student_id=user.id, course_id=course.id)
                    session.add(enroll)
                    session.commit()
                    return {"status": "enrolled", "id": enroll.id}
            return {"status": "skipped"}
        finally:
            session.close()
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/db/sync-submission")
def sync_submission(payload: Dict[str, Any]):
    """Sync a submission and evaluation into SQLite database (database.py)."""
    try:
        from database import get_session, Submission, Evaluation, User, Assignment
        session = get_session()
        try:
            student_id = payload.get("studentId")
            user = session.query(User).filter((User.id == student_id) | (User.username == student_id)).first()
            if not user:
                user = session.query(User).filter(User.role == "student").first()
            
            u_id = user.id if user else 1
            
            # Find or fallback assignment
            assignment = session.query(Assignment).first()
            a_id = assignment.id if assignment else 1
            
            eval_data = payload.get("evaluation", {})
            sub = Submission(
                assignment_id=a_id,
                student_id=u_id,
                file_name=payload.get("fileName", "solution.py"),
                file_path=payload.get("filePath", ""),
                content=payload.get("content", ""),
                status="evaluated"
            )
            session.add(sub)
            session.commit()
            
            eval_record = Evaluation(
                submission_id=sub.id,
                overall_score=float(eval_data.get("overallScore", 85.0)),
                max_score=float(eval_data.get("maxScore", 100.0)),
                topic_scores_json=json.dumps(eval_data.get("topicScores", {})),
                strengths="\n".join(eval_data.get("strengths", [])),
                weaknesses="\n".join(eval_data.get("weaknesses", [])),
                feedback=eval_data.get("feedback", ""),
                suggestions="\n".join(eval_data.get("suggestions", [])),
                mastery_level=eval_data.get("masteryLevel", "advanced"),
                evaluated_by=eval_data.get("evaluatedBy", "Groq AI Agent")
            )
            session.add(eval_record)
            session.commit()
            return {"status": "synced", "submission_id": sub.id, "evaluation_id": eval_record.id}
        finally:
            session.close()
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/rag/embed")
def embed_and_retrieve(payload: Dict[str, Any]):
    """Semantic concept matching and RAG retrieval."""
    query = payload.get("query", "")
    topics = payload.get("topics", [])
    
    # Try knowledge base
    try:
        from rag.knowledge_base import KnowledgeBase
        kb = KnowledgeBase()
        if hasattr(kb, "query") and kb.is_available:
            results = kb.query(f"{query} {' '.join(topics)}", n_results=3)
            if results:
                return {"status": "success", "context": results}
    except Exception:
        pass
    
    # Structured curriculum knowledge grounding
    knowledge = [
        {"topic": "Data Types", "context": "Python variables, immutable primitives, memory references, and IEEE-754 precision."},
        {"topic": "Dynamic Arrays", "context": "Doubling capacity amortized O(1) push operations and contiguous cache locality."},
        {"topic": "Linked Lists", "context": "Pointer operations, sentinel nodes, and O(1) boundary insertions and deletions."},
        {"topic": "Gradient Descent", "context": "Vectorized matrix operations with learning rate parameter decay and convex loss optimization."},
        {"topic": "Automata Theory", "context": "Formal definition of DFA M = (Q, Sigma, delta, q0, F) with transition function closure."}
    ]
    matched = [k["context"] for k in knowledge if any(t.lower() in k["topic"].lower() or t.lower() in k["context"].lower() for t in topics)]
    return {"status": "success", "context": matched or ["Core syllabus grounding guidelines"]}

@app.post("/api/evaluate")
def evaluate_submission(req: EvaluationRequest):
    """
    Evaluates student submission (coding or theoretical) sensibly like a real human teacher,
    with pedagogical empathy and grace marks for solid effort.
    """
    topics_str = ", ".join(req.topics)
    topic_placeholders = ", ".join([f'"{t}": <0-100>' for t in req.topics])
    
    system_prompt = (
        "You are an empathetic, seasoned university professor evaluating a student's submission. "
        "Evaluate sensibly, constructively, and fairly like an experienced teacher who values intellectual curiosity and genuine effort.\n"
        "PEDAGOGICAL EVALUATION GUIDELINES:\n"
        "1. THEORETICAL / CONCEPTUAL ASSIGNMENTS: Evaluate thesis clarity, conceptual understanding, logical flow, analytical depth, and supporting arguments. Do NOT penalize for lack of code if the assignment is theoretical!\n"
        "2. CODING / PRACTICAL ASSIGNMENTS: Evaluate algorithmic logic, code clarity, edge case handling, and modular structure.\n"
        "3. GENEROUS PARTIAL CREDIT: Give generous partial credit for good intuition, sound reasoning, and earnest attempts.\n"
        "4. TEACHER'S GRACE MARKS: If the student demonstrates sincere effort, good structure, or solid conceptual grasp despite minor slips or edge cases, award between +2 and +6 GRACE MARKS! Explain why in an encouraging tone.\n\n"
        "Return ONLY a valid JSON object matching this exact format:\n"
        "{\n"
        f'  "overallScore": <number 0 to {req.maxMarks}, including grace marks>,\n'
        '  "percentage": <number 0 to 100>,\n'
        '  "masteryLevel": "<beginner | intermediate | advanced | expert>",\n'
        '  "graceMarksAwarded": <number 0 to 6>,\n'
        '  "graceMarksReason": "<warm, encouraging teacher note explaining why grace marks were awarded>",\n'
        f'  "topicScores": {{ {topic_placeholders} }},\n'
        '  "strengths": [<3-4 specific bullet points praising strong concepts, logic, or articulation>],\n'
        '  "weaknesses": [<2-3 constructive points noting missing nuances, edge cases, or room for improvement>],\n'
        '  "feedback": "<2-3 paragraph detailed, constructive, warm academic explanation of the student\'s work>",\n'
        '  "suggestions": [<3 actionable suggestions for further learning and improvement>]\n'
        "}"
    )

    user_prompt = (
        f"## ASSIGNMENT DETAILS\n"
        f"Title: {req.assignmentTitle}\n"
        f"Type: {req.submissionType or 'theory/code'}\n"
        f"Description: {req.assignmentDescription}\n"
        f"Topics: {topics_str}\n"
        f"Max Marks: {req.maxMarks}\n\n"
        f"## STUDENT SUBMISSION CONTENT\n"
        f"```\n{req.submissionContent}\n```\n\n"
        f"Evaluate this submission sensibly as an encouraging human professor. Return ONLY valid JSON."
    )

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 1500,
    }

    try:
        url = "https://api.groq.com/openai/v1/chat/completions"
        data_bytes = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            url,
            data=data_bytes,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0",
            }
        )
        
        with urllib.request.urlopen(request, timeout=30) as response:
            res_json = json.loads(response.read().decode("utf-8"))
            raw_text = res_json["choices"][0]["message"]["content"].strip()
            
            # Clean markdown formatting if present
            if "```json" in raw_text:
                raw_text = raw_text.split("```json")[1].split("```")[0].strip()
            elif "```" in raw_text:
                raw_text = raw_text.split("```")[1].split("```")[0].strip()
                
            parsed_eval = json.loads(raw_text)
            
            return {
                "evaluation": {
                    "id": f"eval-{int(os.times().system * 1000)}",
                    "overallScore": parsed_eval.get("overallScore", 80),
                    "maxScore": req.maxMarks,
                    "percentage": parsed_eval.get("percentage", 80),
                    "masteryLevel": parsed_eval.get("masteryLevel", "advanced"),
                    "topicScores": parsed_eval.get("topicScores", {}),
                    "strengths": parsed_eval.get("strengths", []),
                    "weaknesses": parsed_eval.get("weaknesses", []),
                    "feedback": parsed_eval.get("feedback", ""),
                    "suggestions": parsed_eval.get("suggestions", []),
                    "evaluatedBy": f"Groq LLM ({GROQ_MODEL})",
                }
            }
            
    except Exception as e:
        print(f"Groq API error in backend, using deterministic fallback: {e}")
        # Deterministic fallback calculation
        base_pct = 78
        topic_scores = {t: base_pct for t in req.topics}
        return {
            "evaluation": {
                "id": "eval-fallback",
                "overallScore": round((base_pct / 100) * req.maxMarks, 1),
                "maxScore": req.maxMarks,
                "percentage": base_pct,
                "masteryLevel": "advanced",
                "topicScores": topic_scores,
                "strengths": [
                    "Clean code formatting and structure.",
                    "Proper functional decomposition.",
                ],
                "weaknesses": [
                    "Could include additional boundary condition checks.",
                ],
                "feedback": f"Good submission covering {topics_str}.",
                "suggestions": [
                    "Explore performance optimization under heavy loads.",
                    "Add comprehensive docstrings.",
                ],
                "evaluatedBy": "Heuristic Assessment Fallback",
            }
        }

# ============================================================================
# MULTI-AGENT WORKFLOW ENDPOINTS (Extractor -> Evaluator -> Auditor)
# ============================================================================

@app.post("/api/agents/extract-rubric")
def api_extract_rubric(req: ExtractRubricRequest):
    """
    Agent 1 (Extractor Agent): Runs when faculty uploads an assignment/rubric PDF or text.
    Autonomously extracts the exact grading criteria, max points, and rules into strict JSON.
    """
    raw_text = req.documentText or ""
    
    # If base64 file data provided (e.g. uploaded PDF or document)
    if req.fileData:
        try:
            # Handle potential data URL scheme
            b64_str = req.fileData
            if "," in b64_str:
                b64_str = b64_str.split(",")[1]
            file_bytes = base64.b64decode(b64_str)
            extracted = extract_text_from_file_data(file_bytes, req.fileName or "rubric.pdf")
            if extracted:
                raw_text = f"{extracted}\n\n{raw_text}".strip()
        except Exception as e:
            print(f"Error decoding uploaded file in extract-rubric: {e}")

    if not raw_text.strip():
        raw_text = f"Assignment on {req.assignmentTitle or 'Core Topics'}. Standard university coursework requiring conceptual mastery and sound implementation."

    extractor = ExtractorAgent()
    rubric = extractor.extract_rubric(
        document_text=raw_text,
        assignment_title=req.assignmentTitle or "Coursework Assignment",
        total_points=req.totalPoints or 100.0,
        course_context=req.courseContext or "",
    )
    return {
        "status": "success",
        "agent": "Extractor Agent (Academic Curriculum Designer)",
        "rubric": rubric,
    }


@app.post("/api/agents/evaluate")
def api_evaluate_agent(req: AgentEvaluateRequest):
    """
    Agent 2 (Evaluator Agent): Runs when student uploads homework.
    Evaluates step-by-step through each criterion in the strict JSON rubric,
    grounded with ChromaDB RAG chunks, assigning scores and a 2-sentence justification.
    """
    evaluator = EvaluatorAgent()
    eval_draft = evaluator.evaluate(
        student_submission=req.submissionContent,
        rubric=req.rubric,
        rag_context_chunks=req.ragChunks,
        file_name=req.fileName or "solution.py",
    )
    return {
        "status": "success",
        "agent": "Evaluator Agent (Impartial Academic Grader)",
        "evaluatorDraft": eval_draft,
    }


@app.post("/api/agents/audit")
def api_audit_agent(req: AgentAuditRequest):
    """
    Agent 3 (Auditor Agent): The Agentic Self-Reflection Loop.
    Audits the math summation, verifies no unstated rubric deductions occurred,
    and returns APPROVED or CORRECTED with the final audited scores.
    """
    auditor = AuditorAgent()
    audit_result = auditor.audit(
        student_submission=req.submissionContent,
        rubric=req.rubric,
        evaluator_draft=req.evaluatorDraft,
    )
    return {
        "status": "success",
        "agent": "Auditor Agent (Senior Academic Auditor)",
        "auditResult": audit_result,
    }


@app.post("/api/agents/pipeline")
def api_run_multi_agent_pipeline(req: MultiAgentPipelineRequest):
    """
    Executes the entire 3-Agent Autonomous Pipeline:
    Agent 1 (Extractor Rubric) -> ChromaDB RAG Grounding -> Agent 2 (Evaluator) -> Agent 3 (Auditor Self-Reflection Loop).
    """
    pipeline = MultiAgentPipeline()
    result = pipeline.run_pipeline(
        student_submission=req.submissionContent,
        assignment_info=req.assignment,
        rag_context_chunks=req.ragChunks,
        file_name=req.fileName or "solution.py",
    )
    return {
        "status": "success",
        "evaluation": result,
    }


if __name__ == "__main__":
    import uvicorn
    print(f"Starting Backend on port 8000 with Groq model: {GROQ_MODEL}")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
