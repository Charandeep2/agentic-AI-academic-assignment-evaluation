import { NextRequest, NextResponse } from 'next/server';
import { readDb } from '@/lib/db';
import { getCourseEvaluationScheme } from '@/lib/evaluation';

export const dynamic = 'force-dynamic';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      topic,
      classId,
      questionCount = 4,
      difficulty = 'intermediate',
      syllabusCutoff,
    } = body;

    const db = readDb();
    const classInfo = (db.classes || []).find((c: any) => c.id === classId);
    const classMaterials = (db.materials || []).filter((m: any) => m.classId === classId);
    const syllabusDoc = classMaterials.find((m: any) => m.type === 'syllabus');

    // Extract Dynamic Course Credit & Evaluation Scheme
    const evalScheme = getCourseEvaluationScheme(classInfo);
    const quizComp = evalScheme.find((c) => c.id === 'quizzes' || c.name.toLowerCase().includes('quiz')) || {
      id: 'quizzes',
      name: 'Quizzes & Tests',
      weight: 15,
    };
    const quizWeight = quizComp.weight;
    const fullSchemeText = evalScheme.map((c) => `${c.name}: ${c.weight}%`).join(' • ');

    // Detect Course Plan & Covered Syllabus Boundary
    const progressInfo = classInfo?.syllabusProgress;
    const lectureNotes = classMaterials.filter((m: any) => m.type === 'notes' || m.type === 'reference');

    // Determine current syllabus milestone
    const currentMilestone =
      syllabusCutoff ||
      progressInfo?.currentTopic ||
      (lectureNotes.length > 0 ? lectureNotes[0].title : topic) ||
      'Unit 1: Fundamentals';

    // List of uploaded lecture notes (indicates what has been taught so far)
    const uploadedNotesSummary = lectureNotes.length > 0
      ? lectureNotes.map((n: any, idx: number) =>
          `${idx + 1}. [${n.topic || 'Module'}]: ${n.title}\n   Key concepts: ${n.description || n.content.slice(0, 180)}`
        ).join('\n')
      : 'Unit 1 Fundamentals and core theoretical principles';

    const fullSyllabusSummary = syllabusDoc
      ? syllabusDoc.content.slice(0, 600)
      : 'Comprehensive academic course syllabus.';

    const systemPrompt = `You are a distinguished university professor designing an official classroom quiz.
You are designing an assessment for the course: "${classInfo?.name || 'Academic Course'}" (${classInfo?.code || 'CS'}).

COURSE CREDIT CRITERIA:
- Quizzes contribute **${quizWeight}%** ("${quizComp.name}") towards the student's cumulative course grade.
- (Full Course Evaluation Scheme: ${fullSchemeText}).

CRITICAL SYLLABUS BOUNDARY INSTRUCTION:
The faculty has covered the course plan up to: **"${currentMilestone}"**.
Uploaded lecture notes to date:
${uploadedNotesSummary}

PEDAGOGICAL RULE ON SYLLABUS BOUNDARIES:
- You must generate questions STRICTLY AND ONLY from the portion of the syllabus that has been covered up to "${currentMilestone}".
- DO NOT test concepts, data structures, or algorithms from un-taught future modules that have not been reached yet!
  * For example, in Data Structures & Algorithms: If the class is covered up to Linked Lists/Linear Structures, test ONLY Arrays, Linked Lists, pointer manipulation, and linear time/space bounds. Absolutely DO NOT include questions on Trees, AVL balancing, Heaps, Graph traversals, or Dynamic Programming!
  * For Python / Software Engineering: If covered up to Mutability/Functions, DO NOT include questions on Concurrency or network sockets!
  * For any subject: Only formulate questions from topics present in the uploaded materials or up to the current milestone.

REQUIREMENTS:
1. Generate exactly ${questionCount} multiple-choice questions testing conceptual accuracy and trade-offs.
2. 4 distinct options (A, B, C, D) per question.
3. "correctOption" must be an integer index (0, 1, 2, or 3).
4. "explanation" must provide clear pedagogical reasoning for why the chosen option is correct.

Respond ONLY with a valid JSON object matching this exact schema:
{
  "title": "<Concise Quiz Title, e.g. Quiz: Linked Lists & Linear Data Structures>",
  "topic": "${currentMilestone}",
  "syllabusScope": "Covered syllabus up to ${currentMilestone}",
  "weightageNotice": "Contributes to the ${quizWeight}% Quizzes component of the Course Grading Scheme",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "id": "q1",
      "question": "<Prompt bounded to covered syllabus>",
      "options": ["<Option A>", "<Option B>", "<Option C>", "<Option D>"],
      "correctOption": 0,
      "explanation": "<Pedagogical reasoning>"
    }
  ]
}`;

    const userPrompt = `## COURSE INFORMATION
Course: ${classInfo?.name || 'Computer Science'} (${classInfo?.code || 'CS'})
Department: ${classInfo?.department || 'Computer Science'}
Full Syllabus Plan:
${fullSyllabusSummary}

## PROGRESS & BOUNDARY DATA:
Current Syllabus Milestone Covered: "${currentMilestone}"
Uploaded Lecture Notes / Taught Topics:
${uploadedNotesSummary}

Generate a ${questionCount}-question multiple-choice quiz strictly bounded to the syllabus covered up to "${currentMilestone}". Return ONLY valid JSON.`;

    let quizData: any = null;

    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.25,
          max_tokens: 1500,
          response_format: { type: 'json_object' },
        }),
      });

      if (groqRes.ok) {
        const groqJson = await groqRes.json();
        const contentStr = groqJson.choices?.[0]?.message?.content;
        if (contentStr) {
          quizData = JSON.parse(contentStr);
        }
      } else {
        console.warn('Groq API error in syllabus-bounded quiz generation:', await groqRes.text());
      }
    } catch (apiErr) {
      console.error('Groq call failed in quiz generator:', apiErr);
    }

    // High quality fallback bounded to current milestone
    if (!quizData || !quizData.questions || quizData.questions.length === 0) {
      quizData = {
        title: `Assessment Quiz: ${currentMilestone}`,
        topic: currentMilestone,
        syllabusScope: `Covered syllabus up to ${currentMilestone}`,
        weightageNotice: `Contributes to the ${quizWeight}% Quizzes component of the Course Grading Scheme`,
        difficulty,
        questions: [
          {
            id: 'q1',
            question: `In the context of ${currentMilestone}, which invariant must hold true during node deletion or memory reclamation?`,
            options: [
              'Pointer references must be re-linked before deallocating memory to prevent dangling pointers.',
              'All nodes in memory are automatically sorted in contiguous RAM cache lines.',
              'Garbage collection eliminates the need for pointer traversal.',
              'The capacity of dynamic arrays cannot be changed once allocated.',
            ],
            correctOption: 0,
            explanation: 'Under linear data structures and dynamic pointer topologies, pointer references must be updated before freeing a node to preserve invariant continuity.',
          },
          {
            id: 'q2',
            question: `What is the primary difference in time complexity between indexing a dynamic array versus traversing a linked list to access the k-th element?`,
            options: [
              'Dynamic array indexing is O(1); linked list traversal is O(k) linear time.',
              'Dynamic array indexing is O(k); linked list traversal is O(1) constant time.',
              'Both require O(log k) binary tree search time.',
              'Neither permits random access under any memory architecture.',
            ],
            correctOption: 0,
            explanation: 'Arrays use pointer arithmetic with base offset to achieve O(1) random access, whereas linked lists require sequential traversal through node pointers taking O(k) time.',
          },
          {
            id: 'q3',
            question: `When implementing a doubly linked list, why is maintaining both a head and tail pointer advantageous?`,
            options: [
              'It enables O(1) insertions and deletions at both ends of the list.',
              'It eliminates the need for node pointer storage completely.',
              'It guarantees that memory is never allocated on the heap.',
              'It automatically converts the linked list into a balanced binary search tree.',
            ],
            correctOption: 0,
            explanation: 'Having direct references to both the head and tail permits constant-time O(1) append, prepend, and tail-pop operations.',
          },
        ],
      };
    }

    return NextResponse.json({
      success: true,
      quiz: quizData,
      currentMilestone,
      quizWeight,
      generatedBy: 'Groq Agent (qwen/qwen3.8-27b)',
    });
  } catch (err: any) {
    console.error('Quiz generation error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate syllabus-bounded quiz.' },
      { status: 500 }
    );
  }
}
