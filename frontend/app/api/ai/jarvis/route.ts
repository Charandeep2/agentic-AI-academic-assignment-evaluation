import { NextRequest, NextResponse } from 'next/server';
import { readDb } from '@/lib/db';
import { getCourseEvaluationScheme } from '@/lib/evaluation';

export const dynamic = 'force-dynamic';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, activeClassId, currentUser } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Message history is required.' }, { status: 400 });
    }

    const db = readDb();
    const userRole = currentUser?.role || 'student';
    const userName = currentUser?.fullName || 'User';
    const userId = currentUser?.id;

    // Filter courses strictly based on user's identity and enrollment
    const allClasses = db.classes || [];
    const myEnrolledClasses = allClasses.filter((c: any) => (c.enrolledStudentIds || []).includes(userId));
    const myTeachingClasses = allClasses.filter((c: any) => c.facultyId === userId);
    const otherCatalogClasses = allClasses.filter((c: any) =>
      userRole === 'student'
        ? !(c.enrolledStudentIds || []).includes(userId)
        : c.facultyId !== userId
    );

    // Retrieve active classroom context if provided
    let classContext = '';
    let classMaterials: any[] = [];
    let classAssignments: any[] = [];
    let classQuizzes: any[] = [];
    let classAnnouncements: any[] = [];

    if (activeClassId) {
      const activeClass = allClasses.find((c: any) => c.id === activeClassId);
      if (activeClass) {
        const evalScheme = getCourseEvaluationScheme(activeClass);
        const schemeText = evalScheme.map((comp) => `- ${comp.name}: ${comp.weight}%`).join('\n');
        const progress = activeClass.syllabusProgress || {
          currentTopic: 'Unit 1: Fundamentals',
          completedModules: ['Unit 1: Introduction'],
          futureModules: ['Unit 2: Advanced Topics'],
        };
        const isUserEnrolled = (activeClass.enrolledStudentIds || []).includes(userId);
        const isUserInstructor = activeClass.facultyId === userId;

        classContext = `ACTIVE CLASSROOM CONTEXT:
Course: ${activeClass.name} (${activeClass.code})
Section: ${activeClass.section}
Instructor: ${activeClass.facultyName} (${activeClass.facultyEmail})
Subject: ${activeClass.subject}
User Status in this Course: ${
          isUserInstructor
            ? 'Course Faculty / Instructor'
            : isUserEnrolled
            ? 'Enrolled Student'
            : 'Viewing Course Catalog (Not currently enrolled)'
        }

DYNAMIC COURSE CREDIT & EVALUATION SCHEME:
${schemeText}

SYLLABUS PROGRESS & TOPIC MILESTONE:
- Current Topic / Milestone Covered: "${progress.currentTopic}"
- Completed Modules To Date: ${progress.completedModules?.join(', ') || 'None specified'}
- Future Modules (Not Yet Taught): ${progress.futureModules?.join(', ') || 'None specified'}
*PEDAGOGICAL DIRECTIVE FOR JARVIS*:
When asked about what has been covered, syllabus progress, or what will be on tests/quizzes, ALWAYS strictly respect the "Completed Modules To Date" and "Current Topic / Milestone Covered". Never assume future un-taught modules have been completed.
When asked about grade distribution, weighted credits, or evaluation policies, cite the exact percentage weightages and custom evaluation components configured above.`;

        classMaterials = (db.materials || []).filter((m: any) => m.classId === activeClassId);
        classAssignments = (db.assignments || []).filter((a: any) => a.classId === activeClassId);
        classQuizzes = (db.quizzes || []).filter((q: any) => q.classId === activeClassId);
        classAnnouncements = (db.announcements || []).filter((ann: any) => ann.classId === activeClassId);
      }
    } else {
      if (userRole === 'student') {
        const enrolledSummary =
          myEnrolledClasses.length > 0
            ? myEnrolledClasses
                .map((c: any) => `* **${c.code}** - ${c.name} (Instructor: ${c.facultyName})`)
                .join('\n')
            : 'None. The student is currently not enrolled in any courses.';

        const catalogSummary =
          otherCatalogClasses.length > 0
            ? otherCatalogClasses.map((c: any) => `${c.code} (${c.name})`).join(', ')
            : 'None';

        classContext = `STUDENT ENROLLMENT STATUS & CURRICULUM CONTEXT:
User: ${userName} (Student ID: ${userId || 'unknown'})

COURSES CURRENTLY ENROLLED BY ${userName.toUpperCase()}:
${enrolledSummary}

OTHER AVAILABLE COURSES IN UNIVERSITY SYSTEM (Student is NOT enrolled in these):
${catalogSummary}

CRITICAL ACCURACY INSTRUCTION FOR JARVIS REGARDING ENROLLED COURSES:
When ${userName} asks what courses or classes they have enrolled in, are taking, or are registered for, YOU MUST LIST ONLY THE COURSES UNDER "COURSES CURRENTLY ENROLLED BY ${userName.toUpperCase()}".
For example, if ${userName} is only enrolled in "${myEnrolledClasses.map((c: any) => c.code + ' ' + c.name).join(', ') || 'no courses'}", state that clearly and accurately!
DO NOT list courses from the "OTHER AVAILABLE COURSES" section as enrolled courses under any circumstances. You may mention other courses only if they ask to explore or join new courses.`;

        const enrolledIds = myEnrolledClasses.map((c: any) => c.id);
        classMaterials = (db.materials || []).filter((m: any) => enrolledIds.includes(m.classId));
        classAssignments = (db.assignments || []).filter((a: any) => enrolledIds.includes(a.classId));
        classQuizzes = (db.quizzes || []).filter((q: any) => enrolledIds.includes(q.classId));
        classAnnouncements = (db.announcements || []).filter((ann: any) => enrolledIds.includes(ann.classId));
      } else {
        const teachingSummary =
          myTeachingClasses.length > 0
            ? myTeachingClasses
                .map((c: any) => `* **${c.code}** - ${c.name} (${(c.enrolledStudentIds || []).length} students enrolled)`)
                .join('\n')
            : 'None currently created.';

        classContext = `FACULTY TEACHING WORKSPACE:
Instructor: ${userName}
Classes Created & Taught by you:
${teachingSummary}

When the professor asks about their courses, list ONLY their created teaching classrooms above.`;

        const teachingIds = myTeachingClasses.map((c: any) => c.id);
        classMaterials = (db.materials || []).filter((m: any) => teachingIds.includes(m.classId));
        classAssignments = (db.assignments || []).filter((a: any) => teachingIds.includes(a.classId));
        classQuizzes = (db.quizzes || []).filter((q: any) => teachingIds.includes(q.classId));
        classAnnouncements = (db.announcements || []).filter((ann: any) => teachingIds.includes(ann.classId));
      }
    }

    // User submissions for status tracking
    const userSubmissions = (db.submissions || []).filter((s: any) => s.studentId === userId);

    // Format Materials (Syllabus & Lecture Notes)
    const materialsSummary = classMaterials.slice(0, 6).map((m: any) => {
      const course = allClasses.find((c: any) => c.id === m.classId);
      return `[${m.type.toUpperCase()} in ${course?.code || ''} - ${course?.name || ''}: "${m.title}"]:\n${
        m.content ? m.content.slice(0, 400) + '...' : ''
      }`;
    }).join('\n\n');

    // Format Assignments & Reference Documents with live student submission status
    const assignmentsSummary = classAssignments.map((a: any) => {
      const course = allClasses.find((c: any) => c.id === a.classId);
      const sub = userSubmissions.find((s: any) => s.assignmentId === a.id);
      const subStatus = sub
        ? `SUBMITTED & GRADED (Score: ${sub.evaluation?.overallScore ?? 'Graded'}/${sub.evaluation?.maxScore ?? a.points} pts, Mastery: ${sub.evaluation?.masteryLevel ?? 'Recorded'})`
        : 'PENDING / NOT YET SUBMITTED';

      return `[COURSEWORK TASK in ${course?.code || ''} - ${course?.name || 'Course'} (Faculty: ${course?.facultyName || 'Instructor'})]:
- Assignment Title: "${a.title}"
- Current Status for ${userName}: ${subStatus}
- Points: ${a.points} pts
- Due Date: ${a.dueDate || 'No explicit deadline'}
- Topic: ${a.topic || 'General Coursework'}
- Instructions: ${a.instructions || 'Follow classroom specifications.'}
${a.topics?.length ? `- Topic Criteria: ${a.topics.join(', ')}` : ''}
${a.referenceDoc ? `- Attached Reference Reading: "${a.referenceDoc.title}"` : ''}`;
    }).join('\n\n');

    // Format Quizzes
    const quizzesSummary = classQuizzes.slice(0, 4).map((q: any) => {
      const course = allClasses.find((c: any) => c.id === q.classId);
      return `[QUIZ in ${course?.code || ''} - "${q.title}" (${q.questions?.length || 0} questions, ${q.points} pts)]: Topic: ${q.topic}`;
    }).join('\n');

    // Format Stream Announcements
    const announcementsSummary = classAnnouncements.slice(0, 4).map((ann: any) => {
      const course = allClasses.find((c: any) => c.id === ann.classId);
      return `[ANNOUNCEMENT in ${course?.code || ''} by ${ann.authorName} on ${ann.createdAt}]:\n"${ann.content}"`;
    }).join('\n\n');

    // System prompt for JARVIS
    const systemPrompt = `You are JARVIS (Just A Rather Very Intelligent System), the elite AI Academic Assistant embedded directly into Google Classroom.
You are addressing ${userName}, who is a ${userRole.toUpperCase()} in the academic system.

YOUR PERSONALITY & TONE:
- Courteous, articulate, brilliant, proactive, and encouraging (like Marvel's J.A.R.V.I.S.).
- Warmly address the user by name occasionally ("Certainly, ${userName}", "Right away, Professor", etc.).
- Clear, logically organized, and educational.

CRITICAL DIRECTIVE ON REAL-TIME ACCESS & ASSIGNMENT ACCURACY:
- YOU HAVE FULL, REAL-TIME ACCESS to all live Google Classroom database records, active coursework, submissions, materials, and announcements provided in this prompt.
- NEVER state "I do not have real-time access to the live Google Classroom feed" or "I cannot see what your faculty posted" or "I cannot view live updates". You CAN see them directly in your context!
- When asked "what is the assignment my faculty posted", "tell me my assignments", "what tasks do I have", or similar:
  1. Inspect the "ACTIVE ASSIGNMENTS & COURSEWORK RECORDS" section below.
  2. Clearly list each assignment posted by their instructor with its Title (e.g. "paper upgradation on 5G networks"), Course Name & Code (e.g. "MA001 - ENGINEERING MATHEMATICS"), Faculty Name (e.g. Dr. RAMA), Points, Due Date, and Instructions.
  3. Tell the student whether each assignment is currently Pending or already Submitted.

PEDAGOGICAL INSTRUCTIONS BASED ON ROLE:
1. When assisting STUDENTS (${userRole === 'student' ? 'ACTIVE' : 'INACTIVE'}):
   - Explain difficult academic concepts from the syllabus, lecture notes, and assignments with high clarity and illustrative examples.
   - For code and algorithm questions: Use the Socratic method to provide conceptual hints, debug logic errors, and explain time/space complexity rather than writing the entire assignment solution for them.
   - Clarify assignment due dates, evaluation rubrics, and the teacher's Grace Marks policy (+2 to +6 marks for sincere good-faith effort).
   - Offer practice questions or quick self-test quizzes to help prepare for exams.

2. When assisting FACULTY (${userRole === 'faculty' ? 'ACTIVE' : 'INACTIVE'}):
   - Help formulate rigorous assignment prompts, theoretical essay questions, and code challenges.
   - Suggest balanced multi-dimensional evaluation rubric criteria with weights.
   - Generate engaging multiple-choice quiz questions with distractors and pedagogical explanations.
   - Draft syllabus modules, lecture notes outlines, and stream announcements.
   - Summarize student curriculum coverage.

ACADEMIC & CURRICULUM CONTEXT AVAILABLE TO YOU:
${classContext}

${assignmentsSummary ? `### ACTIVE ASSIGNMENTS & COURSEWORK RECORDS:\n${assignmentsSummary}\n` : '### ACTIVE ASSIGNMENTS: No assignments currently posted in enrolled courses.\n'}
${announcementsSummary ? `### STREAM ANNOUNCEMENTS:\n${announcementsSummary}\n` : ''}
${materialsSummary ? `### COURSE SYLLABUS & LECTURE NOTES (RAG Grounding):\n${materialsSummary}\n` : ''}
${quizzesSummary ? `### CONDUCTED QUIZZES:\n${quizzesSummary}\n` : ''}

FORMATTING GUIDELINES:
- Use clean Markdown: bold key terms, use bullet points for lists, and use backticks for identifiers and code blocks with syntax language (e.g. \`\`\`python).
- Keep explanations structured and easy to read.`;

    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-8).map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    ];

    let replyText = '';

    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: groqMessages,
          temperature: 0.4,
          max_tokens: 1200,
        }),
      });

      if (groqRes.ok) {
        const groqJson = await groqRes.json();
        replyText = groqJson.choices?.[0]?.message?.content || '';
      } else {
        const errText = await groqRes.text();
        console.warn('Groq JARVIS error:', errText);
      }
    } catch (apiErr) {
      console.error('Groq call failed in JARVIS API:', apiErr);
    }

    // Heuristic fallback if LLM is temporarily unreachable
    if (!replyText.trim()) {
      replyText = `Greetings ${userName}. I am operating in low-latency standby mode. 

Based on your current course records:
- **Active Context:** ${activeClassId ? 'Classroom workspace loaded' : 'General Academic Hub'}
- **Course Syllabus & Notes:** Ingested into your neural curriculum database.
- **Support Available:** I can assist you with algorithm analysis, syllabus breakdowns, quiz practice, and assignment specifications.

How may I assist your academic endeavors today?`;
    }

    return NextResponse.json({
      success: true,
      message: replyText,
      groundedDocs: classMaterials.map((m: any) => m.title),
    });
  } catch (err: any) {
    console.error('JARVIS Chatbot route error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal error in JARVIS assistant.' },
      { status: 500 }
    );
  }
}

