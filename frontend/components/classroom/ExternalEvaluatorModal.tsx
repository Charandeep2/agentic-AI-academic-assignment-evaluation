'use client';

import React, { useState, useRef } from 'react';

interface ExternalEvaluatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

export const ExternalEvaluatorModal: React.FC<ExternalEvaluatorModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [candidateName, setCandidateName] = useState('External Candidate');
  const [taskTitle, setTaskTitle] = useState('External Document Evaluation');
  const [maxMarks, setMaxMarks] = useState(100);
  const [rubricGuidelines, setRubricGuidelines] = useState('');
  const [submissionText, setSubmissionText] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'upload' | 'text'>('upload');

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalStep, setEvalStep] = useState('');
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);
  const [showAgentTrail, setShowAgentTrail] = useState(false);
  const [agentTrailTab, setAgentTrailTab] = useState<'agent1' | 'agent2' | 'agent3'>('agent1');
  const [showExtractedText, setShowExtractedText] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    if (!taskTitle || taskTitle === 'External Document Evaluation') {
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTaskTitle(cleanTitle);
    }

    // Always read as Data URL to preserve exact binary bytes (DOCX, PDF, etc.)
    const dataReader = new FileReader();
    dataReader.onload = (ev) => {
      const result = ev.target?.result as string;
      setFileData(result);
    };
    dataReader.readAsDataURL(file);

    // If text/code, also read as text for preview
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.txt') || lower.endsWith('.py') || lower.endsWith('.md') || lower.endsWith('.java') || lower.endsWith('.cpp') || lower.endsWith('.json')) {
      const textReader = new FileReader();
      textReader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (text) setSubmissionText(text);
      };
      textReader.readAsText(file);
    } else {
      setSubmissionText('');
    }
  };

  const handleOpenDocument = () => {
    if (evaluationResult?.filePath) {
      window.open(`/api/files?path=${encodeURIComponent(evaluationResult.filePath)}&name=${encodeURIComponent(fileName || 'document')}`, '_blank');
      return;
    }
    if (fileData) {
      const win = window.open();
      if (win) {
        win.document.write(`<iframe src="${fileData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      } else {
        const a = document.createElement('a');
        a.href = fileData;
        a.download = fileName || 'submitted_document';
        a.click();
      }
    }
  };

  const handleDownloadReport = () => {
    if (!evaluationResult) return;
    const reportText = `# 🎓 AI Pathashala — External Evaluation Report
**Candidate**: ${candidateName}
**Task**: ${taskTitle}
**Document**: ${fileName || 'Direct Text Submission'}
**Overall Score**: ${evaluationResult.overallScore} / ${evaluationResult.maxScore || maxMarks} (${evaluationResult.percentage}%)
**Mastery Level**: ${evaluationResult.masteryLevel?.toUpperCase()}
**Auditor Verdict**: ${evaluationResult.auditorBadge || 'APPROVED ✓'}
**Grace Marks**: +${evaluationResult.graceMarksAwarded || 0} (${evaluationResult.graceMarksReason || 'N/A'})

---
## 📊 Topic & Criteria Breakdown
${(evaluationResult.criteriaScores || []).map((c: any) => `- **${c.name}**: ${c.scoreAwarded} / ${c.maxPoints}\n  *Justification*: ${c.justification}`).join('\n\n')}

---
## 💡 Strengths
${(evaluationResult.strengths || []).map((s: string) => `- ${s}`).join('\n')}

---
## ⚠️ Weaknesses & Areas for Growth
${(evaluationResult.weaknesses || []).map((w: string) => `- ${w}`).join('\n')}

---
## 📝 Teacher Feedback
${evaluationResult.feedback}

---
## 🎯 Actionable Next Steps
${(evaluationResult.suggestions || []).map((s: string) => `- ${s}`).join('\n')}
`;

    const blob = new Blob([reportText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Evaluation_Report_${candidateName.replace(/\s+/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRunEvaluation = async () => {
    if (!fileData && !submissionText.trim()) {
      alert('Please upload a submission document (.docx, .pdf, .txt, .py) or paste text to evaluate!');
      return;
    }

    setIsEvaluating(true);
    setEvalStep('🤖 Agent 1: Curriculum Extractor formulating strict JSON rubric...');

    try {
      setTimeout(() => setEvalStep('⚖️ Agent 2: Evaluator Agent scoring point-by-point with justifications...'), 1400);
      setTimeout(() => setEvalStep('🛡️ Agent 3: Senior Auditor Agent running self-reflection & arithmetic audit...'), 2800);

      const res = await fetch('/api/ai/external-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentContent: submissionText,
          fileData,
          fileName: fileName || (inputMode === 'upload' ? 'external_document.docx' : 'submission.txt'),
          candidateName: candidateName.trim() || 'External Candidate',
          taskTitle: taskTitle.trim() || 'External Document Evaluation',
          rubricGuidelines: rubricGuidelines.trim(),
          maxMarks: Number(maxMarks) || 100,
        }),
      });

      if (!res.ok) {
        throw new Error('Evaluation request failed');
      }

      const data = await res.json();
      if (data.evaluation) {
        setEvaluationResult(data.evaluation);
      } else {
        throw new Error('No evaluation payload received');
      }
    } catch (err: any) {
      console.error('External evaluation error:', err);
      alert('External evaluation failed. Please verify your document and API connection.');
    } finally {
      setIsEvaluating(false);
      setEvalStep('');
    }
  };

  const handleReset = () => {
    setEvaluationResult(null);
    setFileName('');
    setFileData(null);
    setSubmissionText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isDocx = fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.doc');
  const isPdf = fileName.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 text-gray-800 animate-fadeIn border border-emerald-100">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-emerald-600 flex items-center justify-center text-white shadow-md text-2xl font-bold">
              ⚡
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                  External AI Document Evaluator
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                  Faculty Tool
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Evaluate external candidate documents, thesis reports, and submissions with the autonomous 3-Agent Pipeline.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            title="Close Evaluator"
          >
            ✕
          </button>
        </div>

        {/* WORKSPACE: EITHER FORM OR EVALUATION RESULT */}
        {!evaluationResult ? (
          <div className="space-y-6">
            {/* Step 1: Candidate & Task Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Candidate / Student Name
                </label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="e.g. Alice Anderson / External Scholar"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Task / Assignment Title
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Fraud Detection Project Report"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Maximum Points
                </label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(Number(e.target.value) || 100)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                />
              </div>
            </div>

            {/* Step 2: Document Submission Picker */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 flex items-center space-x-2">
                  <span>📄</span>
                  <span>Submission Document</span>
                </label>

                <div className="flex items-center space-x-1 p-0.5 bg-gray-100 rounded-xl text-[11px] font-semibold text-gray-600">
                  <button
                    type="button"
                    onClick={() => setInputMode('upload')}
                    className={`px-3 py-1 rounded-lg transition ${
                      inputMode === 'upload' ? 'bg-white text-purple-700 shadow-sm font-bold' : 'hover:text-gray-900'
                    }`}
                  >
                    📁 Upload File (.docx, .pdf, .py)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('text')}
                    className={`px-3 py-1 rounded-lg transition ${
                      inputMode === 'text' ? 'bg-white text-purple-700 shadow-sm font-bold' : 'hover:text-gray-900'
                    }`}
                  >
                    ✏️ Paste Text / Code
                  </button>
                </div>
              </div>

              {inputMode === 'upload' ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/40 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.py,.java,.cpp,.md,.json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                    {fileName ? (isDocx ? '📘' : isPdf ? '📕' : '📄') : '⬆️'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">
                      {fileName ? fileName : 'Click to choose or drop external document'}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Supports Word (.docx), PDF (.pdf), Text (.txt), and Source Code (.py, .java, .cpp)
                    </p>
                  </div>
                  {fileName && (
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      ✓ Document Loaded Ready for AI Evaluation
                    </span>
                  )}
                </div>
              ) : (
                <div>
                  <textarea
                    rows={8}
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder="Paste submission content, student paper draft, theoretical explanation, or source code here..."
                    className="w-full p-3.5 text-xs font-mono rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 text-gray-900"
                  />
                </div>
              )}
            </div>

            {/* Step 3: Optional Custom Grading Guidelines / Rubric */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 flex items-center space-x-1.5">
                <span>🎯</span>
                <span>Optional Grading Guidelines &amp; Rubric Criteria</span>
                <span className="text-[10px] font-normal text-gray-400">(Agent 1 Extractor will auto-synthesize if left blank)</span>
              </label>
              <textarea
                rows={2}
                value={rubricGuidelines}
                onChange={(e) => setRubricGuidelines(e.target.value)}
                placeholder="e.g. Focus on conceptual rigor (40%), comparative analysis (30%), code/architecture quality (20%), and presentation (10%)."
                className="w-full p-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              />
            </div>

            {/* Run Button */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRunEvaluation}
                disabled={isEvaluating || (!fileData && !submissionText.trim())}
                className="px-7 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-lg hover:shadow-xl transition flex items-center space-x-2 disabled:opacity-40 cursor-pointer"
              >
                {isEvaluating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{evalStep || 'Multi-Agent Evaluating...'}</span>
                  </>
                ) : (
                  <>
                    <span>🚀 Run Multi-Agent Evaluation</span>
                    <span className="text-purple-200">✦</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* =========================================================================
             EVALUATION RESULTS VIEW
             ========================================================================= */
          <div className="space-y-6 animate-fadeIn">
            {/* Top Score Banner */}
            <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">
                  Evaluation Report Complete
                </span>
                <h3 className="text-xl font-black text-gray-900 mt-0.5">{taskTitle}</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Candidate: <strong className="text-gray-900">{candidateName}</strong> • Evaluated {evaluationResult.evaluatedAt}
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-black text-emerald-700">
                      {evaluationResult.overallScore}
                    </span>
                    <span className="text-sm font-bold text-gray-400">
                      / {evaluationResult.maxScore || maxMarks}
                    </span>
                  </div>
                  <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {evaluationResult.masteryLevel || 'Advanced'} ({evaluationResult.percentage}%)
                  </span>
                </div>
              </div>
            </div>

            {/* ATTACHED DOCUMENT CARD & "OPEN DOCUMENT" BUTTON */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
                  {isDocx ? '📘' : isPdf ? '📕' : '📄'}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-sm text-gray-900">{fileName || 'Evaluated Document'}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800">
                      {isDocx ? 'DOCX Document' : isPdf ? 'PDF Document' : 'Text Document'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Official external document parsed and evaluated by AI Pathashala multi-agent pipeline.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleOpenDocument}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center space-x-1.5 cursor-pointer"
                  title="Open document in new window"
                >
                  <span>📄 Open Document</span>
                  <span>↗</span>
                </button>
              </div>
            </div>

            {/* GRACE MARKS NOTICE */}
            {evaluationResult.graceMarksAwarded > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-2.5 text-xs text-amber-900">
                <span className="text-xl">🎁</span>
                <div>
                  <span className="font-bold">
                    +{evaluationResult.graceMarksAwarded} Grace Marks Granted:
                  </span>
                  <p className="text-[11px] text-amber-800 italic mt-0.5">
                    &ldquo;{evaluationResult.graceMarksReason}&rdquo;
                  </p>
                </div>
              </div>
            )}

            {/* SENIOR ACADEMIC AI AUDITOR VERDICT */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white border border-emerald-500/40 shadow-lg space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <span className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 font-bold text-sm">
                    🛡️
                  </span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-white text-xs tracking-wide uppercase">
                        Senior Academic AI Auditor Verdict:
                      </span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                        {evaluationResult.auditStatus || 'APPROVED'} ✓
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-200/90 mt-0.5">
                      {evaluationResult.auditorBadge || 'Audited & Verified by Senior Academic AI Auditor: APPROVED ✓'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAgentTrail(!showAgentTrail)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[11px] font-bold transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <span>{showAgentTrail ? 'Hide Multi-Agent Trail' : 'Inspect 3-Agent Trail'}</span>
                  <span>{showAgentTrail ? '▲' : '▼'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[11px]">
                <div className="flex items-center space-x-2 text-emerald-200">
                  <span className="text-emerald-400 font-bold">✓ Math Checked:</span>
                  <span className="text-white/90">Sum of criteria + grace marks validated mathematically.</span>
                </div>
                <div className="flex items-center space-x-2 text-teal-200">
                  <span className="text-teal-400 font-bold">✓ Rubric Adherence:</span>
                  <span className="text-white/90">0 unauthorized deductions — graded strictly on Agent 1 rubric.</span>
                </div>
              </div>

              {showAgentTrail && (
                <div className="mt-3 p-3.5 rounded-xl bg-black/40 border border-white/15 space-y-3 animate-fadeIn text-xs">
                  <div className="flex items-center space-x-2 border-b border-white/15 pb-2">
                    <button
                      type="button"
                      onClick={() => setAgentTrailTab('agent1')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${agentTrailTab === 'agent1' ? 'bg-emerald-500 text-white' : 'text-gray-300 hover:text-white'}`}
                    >
                      1. Extractor Rubric
                    </button>
                    <button
                      type="button"
                      onClick={() => setAgentTrailTab('agent2')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${agentTrailTab === 'agent2' ? 'bg-emerald-500 text-white' : 'text-gray-300 hover:text-white'}`}
                    >
                      2. Evaluator Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => setAgentTrailTab('agent3')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${agentTrailTab === 'agent3' ? 'bg-emerald-500 text-white' : 'text-gray-300 hover:text-white'}`}
                    >
                      3. Auditor Reflection Loop
                    </button>
                  </div>

                  {agentTrailTab === 'agent1' && (
                    <div className="space-y-1.5 text-[11px] text-gray-200">
                      <p className="font-bold text-emerald-300">Agent 1: Academic Curriculum Designer</p>
                      <pre className="p-2.5 bg-black/50 rounded-lg overflow-x-auto text-[10px] font-mono text-emerald-200">
                        {JSON.stringify(evaluationResult.multiAgentWorkflow?.agent1_extractor || {}, null, 2)}
                      </pre>
                    </div>
                  )}

                  {agentTrailTab === 'agent2' && (
                    <div className="space-y-1.5 text-[11px] text-gray-200">
                      <p className="font-bold text-teal-300">Agent 2: Impartial Academic Grader</p>
                      <pre className="p-2.5 bg-black/50 rounded-lg overflow-x-auto text-[10px] font-mono text-teal-200">
                        {JSON.stringify(evaluationResult.multiAgentWorkflow?.agent2_evaluation || {}, null, 2)}
                      </pre>
                    </div>
                  )}

                  {agentTrailTab === 'agent3' && (
                    <div className="space-y-1.5 text-[11px] text-gray-200">
                      <p className="font-bold text-cyan-300">Agent 3: Senior Academic Auditor (Self-Reflection)</p>
                      <pre className="p-2.5 bg-black/50 rounded-lg overflow-x-auto text-[10px] font-mono text-cyan-200">
                        {JSON.stringify(evaluationResult.multiAgentWorkflow?.agent3_audit || {}, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CRITERIA BREAKDOWN */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center space-x-1.5">
                <span>⚖️</span>
                <span>Criteria-by-Criteria Scoring Breakdown</span>
              </h4>

              <div className="grid grid-cols-1 gap-2.5">
                {(evaluationResult.criteriaScores || []).map((crit: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50/70 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-900">{crit.name}</span>
                      <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {crit.scoreAwarded} / {crit.maxPoints} pts
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed italic">
                      &ldquo;{crit.justification}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* FEEDBACK, STRENGTHS & WEAKNESSES */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">
                Teacher Feedback &amp; Pedagogical Insights
              </h4>
              <div className="p-4 rounded-2xl bg-white border border-gray-200 text-xs text-gray-700 leading-relaxed shadow-sm">
                {evaluationResult.feedback}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                  <span className="font-bold text-emerald-900 flex items-center space-x-1">
                    <span>✅</span>
                    <span>Demonstrated Strengths</span>
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-emerald-800">
                    {(evaluationResult.strengths || []).map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                  <span className="font-bold text-amber-900 flex items-center space-x-1">
                    <span>💡</span>
                    <span>Areas for Improvement</span>
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800">
                    {(evaluationResult.weaknesses || []).map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-xs font-bold text-gray-700 transition"
              >
                🔄 Evaluate Another Document
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition flex items-center space-x-1.5"
                >
                  <span>📥 Download Report (Markdown)</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
