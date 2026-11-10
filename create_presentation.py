"""
Generates a professional 6-slide presentation on the Agentic AI Academic Assessment System (AI Pathashala).
Slide 1: The Problem
Slides 2-6: The Agentic Solution & Workflow in simple, understandable words.
"""

import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_deck(output_filename="AI_Pathashala_Agentic_Assessment.pptx"):
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]  # Blank layout

    # Color Palette Definitions
    DARK_BG = RGBColor(15, 23, 42)        # #0F172A (Navy slate)
    LIGHT_BG = RGBColor(248, 250, 252)    # #F8FAFC (Soft white-gray)
    CARD_BG = RGBColor(255, 255, 255)     # #FFFFFF (White)
    CARD_BORDER = RGBColor(226, 232, 240) # #E2E8F0 (Border)
    
    PRIMARY_EMERALD = RGBColor(5, 150, 105) # #059669
    TEAL_ACCENT = RGBColor(13, 148, 136)    # #0D9488
    AMBER_ACCENT = RGBColor(217, 119, 6)    # #D97706
    RED_ACCENT = RGBColor(220, 38, 38)      # #DC2626
    INDIGO_ACCENT = RGBColor(79, 70, 229)   # #4F46E5
    
    TEXT_MAIN = RGBColor(15, 23, 42)       # #0F172A
    TEXT_MUTED = RGBColor(100, 116, 139)   # #64748B
    TEXT_WHITE = RGBColor(255, 255, 255)   # #FFFFFF

    def add_header(slide, badge_text, badge_color, title_text, subtitle_text):
        # Category Badge
        badge_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.5), Inches(2.8), Inches(0.38))
        badge_box.fill.solid()
        badge_box.fill.fore_color.rgb = badge_color
        badge_box.line.color.rgb = badge_color
        tf = badge_box.text_frame
        tf.word_wrap = True
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        p.text = badge_text.upper()
        p.font.name = "Arial"
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = TEXT_WHITE
        p.alignment = PP_ALIGN.CENTER

        # Slide Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.95), Inches(11.7), Inches(0.65))
        tf_title = title_box.text_frame
        tf_title.word_wrap = True
        p_title = tf_title.paragraphs[0]
        p_title.text = title_text
        p_title.font.name = "Arial"
        p_title.font.size = Pt(22)
        p_title.font.bold = True
        p_title.font.color.rgb = TEXT_MAIN

        # Slide Subtitle
        sub_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.55), Inches(11.7), Inches(0.45))
        tf_sub = sub_box.text_frame
        tf_sub.word_wrap = True
        p_sub = tf_sub.paragraphs[0]
        p_sub.text = subtitle_text
        p_sub.font.name = "Arial"
        p_sub.font.size = Pt(13)
        p_sub.font.color.rgb = TEXT_MUTED

    def add_card(slide, left, top, width, height, title, points, header_color, bg_color=CARD_BG, border_color=CARD_BORDER):
        # Outer Card Box
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = bg_color
        card.line.color.rgb = border_color
        card.line.width = Pt(1.5)

        # Header Pill / Accent Box inside Card
        accent_bar = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left + Inches(0.2), top + Inches(0.2), width - Inches(0.4), Inches(0.5))
        accent_bar.fill.solid()
        accent_bar.fill.fore_color.rgb = header_color
        accent_bar.line.color.rgb = header_color
        tf_bar = accent_bar.text_frame
        tf_bar.word_wrap = True
        tf_bar.vertical_anchor = MSO_ANCHOR.MIDDLE
        p_bar = tf_bar.paragraphs[0]
        p_bar.text = title
        p_bar.font.name = "Arial"
        p_bar.font.size = Pt(13)
        p_bar.font.bold = True
        p_bar.font.color.rgb = TEXT_WHITE
        p_bar.alignment = PP_ALIGN.CENTER

        # Bullet content textbox
        content_box = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.8), width - Inches(0.4), height - Inches(0.95))
        tf_content = content_box.text_frame
        tf_content.word_wrap = True
        
        for i, pt in enumerate(points):
            p = tf_content.add_paragraph() if i > 0 else tf_content.paragraphs[0]
            p.text = f"•  {pt}"
            p.font.name = "Arial"
            p.font.size = Pt(11.5)
            p.font.color.rgb = TEXT_MAIN
            p.space_after = Pt(10)
            p.line_spacing = 1.15

    # =========================================================================
    # SLIDE 1: THE PROBLEM
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    add_header(
        s1,
        badge_text="The Core Problem",
        badge_color=RED_ACCENT,
        title_text="Why Traditional Academic Grading & Simple AI Prompting Both Fail",
        subtitle_text="Evaluating student work manually is slow and exhausting, but relying on a single AI prompt introduces severe errors."
    )

    card_w = Inches(3.64)
    card_h = Inches(4.9)
    top_pos = Inches(2.1)

    s1_cards = [
        (
            "1. The Teacher's Grading Nightmare",
            [
                "Huge Workload: Teachers evaluate hundreds of assignments and essays every semester.",
                "Delayed Feedback: Takes days or weeks for students to learn what they did wrong.",
                "Subjective & Inconsistent: Grading criteria shift when a teacher gets tired late at night.",
                "No Time for Mentorship: Teachers spend all their time marking papers instead of mentoring."
            ],
            RED_ACCENT
        ),
        (
            "2. Why 'Single-Prompt' AI Fails",
            [
                "Hallucinations: Dumping a PDF into one prompt causes the AI to miss vital requirements.",
                "Arithmetic Mistakes: AI regularly fails at basic addition (criteria scores don't match the total score!).",
                "Unfair Penalties: Deducts marks for personal stylistic biases not mentioned in any rubric.",
                "No Curriculum Grounding: AI grades in a vacuum without knowing what was taught in class."
            ],
            AMBER_ACCENT
        ),
        (
            "3. The Impact on Students",
            [
                "Generic Feedback: Students receive vague grades like '75/100' with zero explanation.",
                "Discourages Effort: Hardworking students who make small slips get penalized without grace marks.",
                "Lack of Trust: Students cannot see the reasoning or math behind automated grading scores.",
                "Need for a Solution: A system that grades sensibly, fairly, and transparently like a real teacher."
            ],
            INDIGO_ACCENT
        )
    ]

    for idx, (title, pts, color) in enumerate(s1_cards):
        left_pos = Inches(0.8) + idx * Inches(3.9)
        add_card(s1, left_pos, top_pos, card_w, card_h, title, pts, color)

    # =========================================================================
    # SLIDE 2: THE AGENTIC AI SOLUTION (OVERVIEW)
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    add_header(
        s2,
        badge_text="The Agentic AI Solution",
        badge_color=PRIMARY_EMERALD,
        title_text="The Solution: A 3-Stage Autonomous Multi-Agent Pipeline",
        subtitle_text="Instead of one giant prompt, we break grading into 3 cooperating AI agents that exchange structured data and audit each other."
    )

    s2_cards = [
        (
            "Stage 1: Extractor Agent",
            [
                "Role: Academic Curriculum Designer.",
                "Action: Runs when faculty uploads an assignment or rubric document (PDF/Text).",
                "Output: Extracts exact rules and builds a strict mathematical JSON rubric summing to 100%.",
                "Benefit: Faculty never have to manually type or configure complex evaluation criteria."
            ],
            TEAL_ACCENT
        ),
        (
            "Stage 2: Evaluator Agent",
            [
                "Role: Impartial Academic Grader.",
                "Action: Runs when a student submits homework (coding solution or theory essay).",
                "Grounding: Uses ChromaDB vector search to pull exact syllabus lecture notes before grading.",
                "Output: Grades criterion-by-criterion with clear 2-sentence justifications for every score."
            ],
            PRIMARY_EMERALD
        ),
        (
            "Stage 3: Auditor Agent",
            [
                "Role: Senior Academic Auditor.",
                "Action: Runs the Agentic Self-Reflection Loop before any score is saved to the database.",
                "Verification: Double-checks arithmetic summation and verifies zero unstated penalties.",
                "Output: Issues an official 'APPROVED ✓' badge or corrects mistakes automatically."
            ],
            INDIGO_ACCENT
        )
    ]

    for idx, (title, pts, color) in enumerate(s2_cards):
        left_pos = Inches(0.8) + idx * Inches(3.9)
        add_card(s2, left_pos, top_pos, card_w, card_h, title, pts, color)

    # =========================================================================
    # SLIDE 3: AGENT 1 - THE EXTRACTOR AGENT
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    add_header(
        s3,
        badge_text="Agent 1: Ingestion & Rules",
        badge_color=TEAL_ACCENT,
        title_text="Agent 1 — The Extractor Agent: Autonomous Curriculum Designer",
        subtitle_text="Turns unstructured assignment PDFs and instructions into strict, mathematical grading rubrics with zero human effort."
    )

    s3_cards = [
        (
            "How It Reads Documents",
            [
                "Automatic PDF Parsing: Uses built-in 'pypdf' tool to read binary PDF assignments.",
                "Handles Any Format: Understands programming tasks, theoretical essays, or hybrid case studies.",
                "Syllabus Context: Automatically connects the assignment to current course milestones."
            ],
            TEAL_ACCENT
        ),
        (
            "Mathematical Rubric Formulation",
            [
                "Generates Exact Criteria: Identifies 3 to 5 core competencies (e.g. Correctness, Edge Cases, Complexity).",
                "Ensures Math Accuracy: Mathematically balances weights so maxPoints sum exactly to 100.",
                "Strict Rule Definitions: Writes explicit rules for how students earn full or partial marks."
            ],
            PRIMARY_EMERALD
        ),
        (
            "Pedagogical Grace Marks Policy",
            [
                "Encourages Student Effort: Recommends awarding between +2 to +6 grace marks for sincere attempts.",
                "Teacher-Like Empathy: Ensures students with good conceptual understanding aren't crushed by minor syntax slips.",
                "Stored in Database: Persisted as JSON alongside the assignment for downstream agents."
            ],
            AMBER_ACCENT
        )
    ]

    for idx, (title, pts, color) in enumerate(s3_cards):
        left_pos = Inches(0.8) + idx * Inches(3.9)
        add_card(s3, left_pos, top_pos, card_w, card_h, title, pts, color)

    # =========================================================================
    # SLIDE 4: AGENT 2 - THE EVALUATOR AGENT & RAG
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    add_header(
        s4,
        badge_text="Agent 2: Scoring & Grounding",
        badge_color=PRIMARY_EMERALD,
        title_text="Agent 2 — The Evaluator Agent: Impartial Grader with Vector RAG",
        subtitle_text="Evaluates student work step-by-step against Agent 1's rubric rules, grounded by ChromaDB lecture notes."
    )

    s4_cards = [
        (
            "ChromaDB Vector RAG Grounding",
            [
                "No Guessing or Hallucinating: Evaluator queries ChromaDB for relevant lecture notes and syllabus standards.",
                "Cosine Similarity Search: Pulls top syllabus chunks matching the assignment topics.",
                "Curriculum Alignment: Grades students on what was actually taught in their specific course."
            ],
            PRIMARY_EMERALD
        ),
        (
            "Point-by-Point Evaluation",
            [
                "Step-by-Step Scoring: Evaluates each criterion individually instead of giving a blanket score.",
                "Strict Bounds: Cannot award more marks than the maxPoints established by Agent 1.",
                "Dual Format Mastery: Understands code logic, complexity, and theoretical essay clarity."
            ],
            TEAL_ACCENT
        ),
        (
            "2-Sentence Justification Contract",
            [
                "Clear Explanations: Every score comes with exactly two sentences explaining what was earned and what was missed.",
                "Actionable Advice: Highlights 3 specific strengths and constructive areas for improvement.",
                "Proposes Grace Marks: Flags genuine student effort for teacher grace marks."
            ],
            INDIGO_ACCENT
        )
    ]

    for idx, (title, pts, color) in enumerate(s4_cards):
        left_pos = Inches(0.8) + idx * Inches(3.9)
        add_card(s4, left_pos, top_pos, card_w, card_h, title, pts, color)

    # =========================================================================
    # SLIDE 5: AGENT 3 - THE AUDITOR AGENT (SELF-REFLECTION)
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    add_header(
        s5,
        badge_text="Agent 3: Self-Reflection Loop",
        badge_color=INDIGO_ACCENT,
        title_text="Agent 3 — The Auditor Agent: The Agentic Self-Reflection Loop",
        subtitle_text="The breakthrough concept that makes the system truly agentic: the AI verifies its own math and rules before saving."
    )

    s5_cards = [
        (
            "1. Arithmetic Math Verification",
            [
                "Calculates Sum Independently: Verifies sum of criterion scores + grace marks == overall score.",
                "Eliminates Math Bugs: Prevents common LLM addition errors before grades are finalized.",
                "Caps Total: Guarantees grades never exceed maximum possible assignment points."
            ],
            INDIGO_ACCENT
        ),
        (
            "2. Rubric Compliance Guardrail",
            [
                "Zero Unstated Deductions: Verifies no points were docked for rules not in Agent 1's rubric.",
                "Protects Student Fairness: Ensures evaluation is objective, unbiased, and compliant with course standards.",
                "Audits Reasoning: Scrutinizes Agent 2's justifications to prevent unwarranted penalties."
            ],
            AMBER_ACCENT
        ),
        (
            "3. Verifiable Audit Verdict",
            [
                "APPROVED Verdict: Issues official 'Audited & Verified: APPROVED ✓' badge.",
                "CORRECTED Fallback: If math or reasoning is flawed, it adjusts the score and notes the reason.",
                "Complete Audit Trail: Both student and faculty can click 'Inspect 3-Agent Trail' to see full reasoning."
            ],
            PRIMARY_EMERALD
        )
    ]

    for idx, (title, pts, color) in enumerate(s5_cards):
        left_pos = Inches(0.8) + idx * Inches(3.9)
        add_card(s5, left_pos, top_pos, card_w, card_h, title, pts, color)

    # =========================================================================
    # SLIDE 6: COMPLETE ECOSYSTEM & REAL-WORLD IMPACT
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    add_header(
        s6,
        badge_text="Platform & Impact",
        badge_color=PRIMARY_EMERALD,
        title_text="AI Pathashala: Complete Classroom Ecosystem & Real-World Impact",
        subtitle_text="Bringing it all together into an intuitive, transparent academic platform built for both students and educators."
    )

    s6_cards = [
        (
            "Modern Classroom Hub",
            [
                "Google Classroom-Style UI: Clean, responsive interface with Stream, Classwork, People, and Grades tabs.",
                "Customizable Credit Schemes: Teachers set custom course weights (e.g. End Term 40%, Mid Term 30%, Quiz 15%, Lab 15%).",
                "Dual Database Engine: Instant reactive JSON state synchronized with a robust SQLite backend."
            ],
            PRIMARY_EMERALD
        ),
        (
            "Specialized Ecosystem Agents",
            [
                "JARVIS AI Tutor: 24/7 Socratic mentor grounded in syllabus with strict enrollment privacy guardrails.",
                "Adaptive Quiz Agent: Synthesizes dynamic multiple-choice quizzes with distractors and explanations.",
                "Grace Marks Engine: Rewards intellectual curiosity and good-faith effort with pedagogical empathy."
            ],
            TEAL_ACCENT
        ),
        (
            "The Real-World Transformation",
            [
                "For Students: Instant, fair, transparent grading with clear 2-sentence justifications and verifiable badges.",
                "For Teachers: Saves hours of manual grading time while maintaining 100% curriculum standards.",
                "Trust & Transparency: Eliminates the black-box problem by providing a verifiable 3-agent audit trail."
            ],
            INDIGO_ACCENT
        )
    ]

    for idx, (title, pts, color) in enumerate(s6_cards):
        left_pos = Inches(0.8) + idx * Inches(3.9)
        add_card(s6, left_pos, top_pos, card_w, card_h, title, pts, color)

    output_path = os.path.abspath(output_filename)
    prs.save(output_path)
    print(f"Presentation saved successfully at: {output_path}")
    return output_path

if __name__ == "__main__":
    create_deck()
