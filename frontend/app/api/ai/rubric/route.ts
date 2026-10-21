import { NextRequest, NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      instructions,
      documentText,
      fileData,
      fileName,
      assignmentType,
      classId,
      maxPoints = 100,
    } = body;

    const totalPts = Number(maxPoints) || 100;

    // 1. Gather Course Context & Syllabus if available
    const db = readDb();
    const classMaterials = (db.materials || []).filter((m: any) => m.classId === classId);
    const syllabusDoc = classMaterials.find((m: any) => m.type === 'syllabus');
    const classInfo = (db.classes || []).find((c: any) => c.id === classId);

    const courseContext = [
      classInfo ? `Course: ${classInfo.name} (${classInfo.code}) - ${classInfo.department}` : '',
      syllabusDoc ? `Syllabus Overview: ${syllabusDoc.content.slice(0, 400)}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    // Combine raw document text from file upload, instructions, and prompt
    const rawDocText = [
      documentText || '',
      instructions || '',
      title ? `Title: ${title}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    // 2. Try Calling Python Backend Agent 1 (which handles PDF decoding via pypdf)
    try {
      const fastApiRes = await fetch('http://localhost:8000/api/agents/extract-rubric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText: rawDocText,
          fileData: fileData || '',
          fileName: fileName || '',
          assignmentTitle: title || 'Coursework Assignment',
          totalPoints: totalPts,
          courseContext,
        }),
      });

      if (fastApiRes.ok) {
        const fastApiJson = await fastApiRes.json();
        if (fastApiJson.rubric && fastApiJson.rubric.criteria) {
          return NextResponse.json({
            success: true,
            rubric: fastApiJson.rubric,
            generatedBy: fastApiJson.agent || 'Extractor Agent (Academic Curriculum Designer)',
          });
        }
      }
    } catch (e) {
      // Backend unavailable, fallback to direct Groq execution
    }

    // 3. Direct Groq Extractor Agent Call
    const systemPrompt = `You are an academic curriculum designer. Read this assignment document and extract the exact grading criteria. Output a strict JSON object containing an array of criteria, the maximum points for each, and the specific rules for earning those points.

PEDAGOGICAL GUIDELINES:
1. Ensure the sum of 'maxPoints' across all criteria exactly equals ${totalPts}.
2. For each criterion, specify clear, strict rules for earning full points, partial credit, and common pitfalls.
3. Formulate an encouraging Grace Marks policy guideline for genuine student effort (+2 to +6 marks).

Respond ONLY with a valid JSON object matching this exact schema:
{
  "assignmentTitle": "${title || 'Assignment'}",
  "totalPoints": ${totalPts},
  "criteria": [
    {
      "id": "crit_1",
      "name": "<Criterion Title, e.g. Algorithmic Correctness / Conceptual Precision>",
      "maxPoints": <number>,
      "rules": "<Specific rules for earning points under this criterion>"
    }
  ],
  "graceMarksPolicy": {
    "maxGrace": 5,
    "guideline": "<Guidelines for awarding grace marks for sincere good-faith effort and structure>"
  },
  "pedagogicalAdvice": "<1-2 sentence advice on grading this assignment sensibly>"
}`;

    const userPrompt = `## ASSIGNMENT DOCUMENT CONTENT
Course: ${classInfo?.name || 'Academic Course'}
Title: ${title || 'Assignment Document'}
Total Points: ${totalPts}
${courseContext ? `Course Context:\n${courseContext}\n` : ''}
--- RAW DOCUMENT / INSTRUCTIONS TEXT ---
${rawDocText || 'Comprehensive coursework assignment requiring sound conceptual foundations and practical implementation.'}
---------------------------------------

Extract the exact grading criteria, maximum points, and rules. Return ONLY valid JSON.`;

    let rubricData: any = null;

    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
          max_tokens: 1400,
        }),
      });

      if (groqRes.ok) {
        const groqJson = await groqRes.json();
        let rawContent = groqJson.choices?.[0]?.message?.content || '';

        if (rawContent.includes('```json')) {
          rawContent = rawContent.split('```json')[1].split('```')[0].trim();
        } else if (rawContent.includes('```')) {
          rawContent = rawContent.split('```')[1].split('```')[0].trim();
        }

        rubricData = JSON.parse(rawContent);
      }
    } catch (e) {
      console.warn('Groq Extractor Agent call failed, using heuristic fallback:', e);
    }

    // Heuristic Fallback
    if (!rubricData || !rubricData.criteria) {
      const isTheory =
        assignmentType === 'theory' ||
        (title && /theory|essay|analysis|discuss|explain/i.test(title)) ||
        /explain|discuss|critique|analyze/i.test(instructions || '');

      rubricData = isTheory
        ? {
            assignmentTitle: title || 'Theoretical Essay & Critical Analysis',
            totalPoints: totalPts,
            criteria: [
              {
                id: 'crit_1',
                name: 'Conceptual Precision & Definitions',
                maxPoints: Math.round(totalPts * 0.35),
                rules: 'Accurately defines principles, terms, and conceptual frameworks without ambiguity.',
              },
              {
                id: 'crit_2',
                name: 'Analytical Reasoning & Depth',
                maxPoints: Math.round(totalPts * 0.35),
                rules: 'Thorough critical evaluation comparing trade-offs, constraints, and alternatives.',
              },
              {
                id: 'crit_3',
                name: 'Academic Structure & Evidence',
                maxPoints: Math.round(totalPts * 0.30),
                rules: 'Clear thesis statement, well-organized sections, and real-world empirical examples.',
              },
            ],
            graceMarksPolicy: {
              maxGrace: 5,
              guideline: 'Award +2 to +5 grace marks for structured effort and sound analytical arguments.',
            },
            pedagogicalAdvice: 'Grade with an emphasis on clarity of reasoning and depth of thought.',
          }
        : {
            assignmentTitle: title || 'Algorithmic Implementation & Problem Solving',
            totalPoints: totalPts,
            criteria: [
              {
                id: 'crit_1',
                name: 'Algorithmic Correctness & Logic',
                maxPoints: Math.round(totalPts * 0.40),
                rules: 'Reliably solves test cases adhering strictly to problem requirements.',
              },
              {
                id: 'crit_2',
                name: 'Edge Case & Defensive Handling',
                maxPoints: Math.round(totalPts * 0.30),
                rules: 'Handles empty inputs, extreme boundary conditions, and invalid arguments.',
              },
              {
                id: 'crit_3',
                name: 'Code Quality & Complexity',
                maxPoints: Math.round(totalPts * 0.30),
                rules: 'Optimal time/space complexity with clean modular functional decomposition.',
              },
            ],
            graceMarksPolicy: {
              maxGrace: 5,
              guideline: 'Award +2 to +5 grace marks for thoughtful defensive checks and clean code formatting.',
            },
            pedagogicalAdvice: 'Award generous partial marks for sound algorithmic intuition.',
          };
    }

    // Ensure criteria have id, name, maxPoints, and rules
    rubricData.criteria = (rubricData.criteria || []).map((c: any, idx: number) => ({
      id: c.id || `crit_${idx + 1}`,
      name: c.name || `Criterion ${idx + 1}`,
      maxPoints: Number(c.maxPoints || Math.round(totalPts / rubricData.criteria.length)),
      rules: c.rules || c.description || 'Demonstrates subject mastery meeting curriculum standards.',
      weight: c.weight || Math.round((Number(c.maxPoints || 25) / totalPts) * 100),
      description: c.rules || c.description || '',
    }));

    return NextResponse.json({
      success: true,
      rubric: rubricData,
      generatedBy: `Extractor Agent (Academic Curriculum Designer - ${GROQ_MODEL})`,
    });
  } catch (err: any) {
    console.error('Rubric Extractor Agent error:', err);
    return NextResponse.json({ error: err.message || 'Extractor Agent failed' }, { status: 500 });
  }
}
