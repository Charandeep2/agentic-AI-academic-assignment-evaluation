import { NextRequest, NextResponse } from 'next/server';
import { KNOWLEDGE_BASE_DOCS } from '@/lib/mockData';
import { Evaluation, MasteryLevel } from '@/lib/types';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ status: 'Evaluation API ready' });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { submissionContent, assignmentTitle, assignmentDescription, topics, maxMarks } = body;

    if (!submissionContent || !assignmentTitle) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. RAG Knowledge Retrieval: match curriculum topics
    const relevantDocs = KNOWLEDGE_BASE_DOCS.filter(doc =>
      topics.some((topic: string) =>
        doc.keyConcepts.map(k => k.toLowerCase()).includes(topic.toLowerCase())
      ) ||
      doc.excerpt.toLowerCase().includes((topics[0] || '').toLowerCase())
    );

    const ragContext = relevantDocs.length > 0
      ? relevantDocs.map(d => `${d.title}: ${d.excerpt}`)
      : ['Course Core Syllabus Guidelines'];

    // 2. Formulate Prompt for Groq LLM
    const systemPrompt = `You are an expert university professor and automated academic assessment agent.
Evaluate student assignments with high rigor, constructive feedback, topic-wise mastery scoring, and explainability.

Return ONLY a valid JSON object with this exact schema:
{
  "overallScore": <number between 0 and ${maxMarks}>,
  "percentage": <number between 0 and 100>,
  "masteryLevel": <one of: "beginner", "intermediate", "advanced", "expert">,
  "topicScores": { ${topics.map((t: string) => `"${t}": <number 0-100>`).join(', ')} },
  "strengths": [<3-4 specific strings praising what was done correctly>],
  "weaknesses": [<2-3 specific strings highlighting deficiencies or missing edge cases>],
  "feedback": "<2-3 paragraph detailed, constructive, academic explanation of the student's work>",
  "suggestions": [<3 actionable strings for improvement or further study>]
}`;

    const userPrompt = `## ASSIGNMENT DETAILS
Title: ${assignmentTitle}
Description: ${assignmentDescription}
Rubric Topics: ${topics.join(', ')}
Maximum Marks: ${maxMarks}

## COURSE KNOWLEDGE BASE CONTEXT (RAG Grounding)
${ragContext.join('\n\n')}

## STUDENT SUBMISSION CONTENT
\`\`\`
${submissionContent}
\`\`\`

Evaluate this student submission thoroughly against the rubric topics and knowledge base context. Return ONLY the JSON object.`;

    let llmEvaluation = null;

    try {
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.2,
          max_tokens: 1500,
        })
      });

      if (groqResponse.ok) {
        const groqData = await groqResponse.json();
        const rawContent = groqData.choices?.[0]?.message?.content || '';

        // Extract JSON from markdown fences if present
        let cleanedJson = rawContent.trim();
        if (cleanedJson.includes('```json')) {
          cleanedJson = cleanedJson.split('```json')[1].split('```')[0].trim();
        } else if (cleanedJson.includes('```')) {
          cleanedJson = cleanedJson.split('```')[1].split('```')[0].trim();
        }

        const parsed = JSON.parse(cleanedJson);
        llmEvaluation = parsed;
      } else {
        console.warn('Groq API status not OK:', groqResponse.status, await groqResponse.text());
      }
    } catch (llmErr) {
      console.error('Groq LLM call failed, falling back to heuristic engine:', llmErr);
    }

    // 3. Fallback Heuristic Calculation if LLM JSON parse failed
    if (!llmEvaluation || !llmEvaluation.topicScores) {
      const content = submissionContent.trim();
      const wordCount = content.split(/\s+/).length;
      const hasCode = /(def |class |import |function |for |while |return |print|const |let )/i.test(content);
      const hasComments = /(#|\/\/|\/\*|""")/.test(content);
      const hasErrorHandling = /(try|except|catch|throw|raise|finally)/i.test(content);

      const topicScores: Record<string, number> = {};
      let totalTopicScore = 0;

      topics.forEach((topic: string) => {
        const topicKeywords = topic.toLowerCase().split(/\s+/);
        const matches = topicKeywords.filter((kw: string) => content.toLowerCase().includes(kw)).length;
        const coverageRatio = matches / Math.max(1, topicKeywords.length);

        let baseScore = 65;
        if (wordCount > 100) baseScore += 10;
        if (hasCode) baseScore += 10;
        if (hasComments) baseScore += 5;
        if (hasErrorHandling) baseScore += 5;

        const calculated = Math.min(98, Math.max(35, Math.round(baseScore * (0.7 + 0.3 * coverageRatio))));
        topicScores[topic] = calculated;
        totalTopicScore += calculated;
      });

      const averageTopicScore = topics.length > 0 ? totalTopicScore / topics.length : 70;
      const overallPercentage = Math.round(averageTopicScore);
      const overallScore = Math.round((overallPercentage / 100) * maxMarks);

      let masteryLevel: MasteryLevel = 'intermediate';
      if (overallPercentage >= 90) masteryLevel = 'expert';
      else if (overallPercentage >= 75) masteryLevel = 'advanced';
      else if (overallPercentage >= 55) masteryLevel = 'intermediate';
      else masteryLevel = 'beginner';

      llmEvaluation = {
        overallScore,
        percentage: overallPercentage,
        masteryLevel,
        topicScores,
        strengths: [
          hasCode ? 'Executable code structure with clean syntax.' : 'Addressed the core assignment requirements.',
          hasComments ? 'Provided inline code explanations aiding maintainability.' : 'Logical problem decomposition.',
          'Demonstrated foundational subject understanding.'
        ],
        weaknesses: [
          wordCount < 70 ? 'Submission is somewhat brief; consider expanding edge cases.' : 'Could improve boundary condition handling.',
          'Consider adhering to strict PEP 8 type hinting.'
        ],
        feedback: `The submission demonstrated a ${masteryLevel.toUpperCase()} level understanding of "${assignmentTitle}". Your implementation covers the foundational requirements.`,
        suggestions: [
          `Review course materials on ${topics[0] || 'core concepts'} for deeper understanding.`,
          'Incorporate comprehensive unit test assertions.',
          'Add detailed docstrings for all custom functions.'
        ]
      };
    }

    const evaluation: Evaluation = {
      id: `eval-${Date.now()}`,
      submissionId: `sub-${Date.now()}`,
      overallScore: Number(llmEvaluation.overallScore) || 75,
      maxScore: Number(maxMarks) || 100,
      percentage: Number(llmEvaluation.percentage) || 75,
      masteryLevel: (llmEvaluation.masteryLevel as MasteryLevel) || 'intermediate',
      topicScores: llmEvaluation.topicScores || {},
      strengths: Array.isArray(llmEvaluation.strengths) ? llmEvaluation.strengths : ['Good effort shown.'],
      weaknesses: Array.isArray(llmEvaluation.weaknesses) ? llmEvaluation.weaknesses : ['Include more edge cases.'],
      feedback: llmEvaluation.feedback || 'Evaluated successfully.',
      suggestions: Array.isArray(llmEvaluation.suggestions) ? llmEvaluation.suggestions : ['Continue practice.'],
      ragContextUsed: ragContext,
      evaluatedBy: `Agentic AI Assessor (Groq ${GROQ_MODEL} + RAG)`,
      evaluatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    return NextResponse.json({ evaluation });
  } catch (error: any) {
    console.error('Evaluation API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
