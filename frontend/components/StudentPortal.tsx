'use client';

import React, { useState } from 'react';
import { User, Course, Assignment, Submission, MasteryLevel } from '../lib/types';
import { AgenticAssessmentPipeline } from '../lib/aiAgentService';
import {
  BookOpen, CheckCircle, Clock, AlertTriangle, Send, Sparkles,
  FileCode, Award, BrainCircuit, ChevronRight
} from '../lib/icons';

interface StudentPortalProps {
  currentUser: User;
  courses: Course[];
  assignments: Assignment[];
  submissions: Submission[];
  onNewSubmission: (sub: Submission) => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  currentUser,
  courses,
  assignments,
  submissions,
  onNewSubmission,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'assignments' | 'grades' | 'courses'>('assignments');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  
  // Submission Form State
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(assignments[0]?.id || '');
  const [submissionText, setSubmissionText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('solution.py');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [selectedEvaluationSubmission, setSelectedEvaluationSubmission] = useState<Submission | null>(
    submissions.find(s => s.studentId === currentUser.id && s.evaluation) || null
  );

  const studentSubmissions = submissions.filter(s => s.studentId === currentUser.id);

  const filteredAssignments = assignments.filter(a => {
    if (selectedCourseFilter !== 'all' && a.courseCode !== selectedCourseFilter) return false;
    return true;
  });

  const getSubmissionForAssignment = (assignmentId: string) => {
    return studentSubmissions.find(s => s.assignmentId === assignmentId);
  };

  const handleRunAiEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionText.trim()) return;

    const assignment = assignments.find(a => a.id === selectedAssignmentId);
    if (!assignment) return;

    setIsEvaluating(true);

    try {
      const evaluation = await AgenticAssessmentPipeline.evaluateSubmission({
        submissionContent: submissionText,
        assignmentTitle: assignment.title,
        assignmentDescription: assignment.description,
        topics: assignment.topics,
        maxMarks: assignment.maxMarks,
      });

      const newSub: Submission = {
        id: `sub-${Date.now()}`,
        assignmentId: assignment.id,
        studentId: currentUser.id,
        studentName: currentUser.fullName,
        studentEmail: currentUser.email,
        content: submissionText,
        fileName: fileName || 'submission.py',
        submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'evaluated',
        evaluation,
      };

      onNewSubmission(newSub);
      setSelectedEvaluationSubmission(newSub);
      setActiveSubTab('grades');
      setSubmissionText('');
    } catch (err) {
      console.error('AI Evaluation error:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const getMasteryBadge = (level?: MasteryLevel) => {
    switch (level) {
      case 'expert':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">🏆 Expert Mastery</span>;
      case 'advanced':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">⭐ Advanced</span>;
      case 'intermediate':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">📈 Intermediate</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">🌱 Beginner</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Student Learning Terminal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Welcome back, {currentUser.fullName}!
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Submit programming assignments, receive instant RAG-grounded AI assessments, track topic-wise mastery, and inspect continuous learning gaps.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center">
              <p className="text-xs text-slate-400 font-medium">Submissions</p>
              <p className="text-xl font-bold text-indigo-300">{studentSubmissions.length}</p>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center">
              <p className="text-xs text-slate-400 font-medium">Evaluated</p>
              <p className="text-xl font-bold text-emerald-400">
                {studentSubmissions.filter(s => s.status === 'evaluated').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveSubTab('assignments')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeSubTab === 'assignments'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            📝 Assignments & Submission
          </button>
          <button
            onClick={() => setActiveSubTab('grades')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeSubTab === 'grades'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            📊 Evaluated Grades & AI Feedback
          </button>
          <button
            onClick={() => setActiveSubTab('courses')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeSubTab === 'courses'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            📚 Enrolled Courses
          </button>
        </div>

        {/* Course Filter */}
        {activeSubTab === 'assignments' && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium">Filter Course:</span>
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Enrolled Courses</option>
              {courses.map(c => (
                <option key={c.id} value={c.code}>{c.code} - {c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: ASSIGNMENTS & LIVE SUBMISSION STUDIO */}
      {activeSubTab === 'assignments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Assignment List (Left Column) */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Available Assignments ({filteredAssignments.length})</span>
            </h2>

            <div className="space-y-3">
              {filteredAssignments.map((assignment) => {
                const existingSub = getSubmissionForAssignment(assignment.id);
                const isSelected = selectedAssignmentId === assignment.id;

                return (
                  <div
                    key={assignment.id}
                    onClick={() => setSelectedAssignmentId(assignment.id)}
                    className={`p-4 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-500/10'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                          {assignment.courseCode}
                        </span>
                        <h3 className="font-semibold text-slate-200 text-sm mt-1">
                          {assignment.title}
                        </h3>
                      </div>
                      <div>
                        {existingSub ? (
                          <span className="flex items-center space-x-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Submitted ({existingSub.evaluation?.overallScore ?? '--'}/{assignment.maxMarks})</span>
                          </span>
                        ) : assignment.isOverdue ? (
                          <span className="flex items-center space-x-1 text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Overdue</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Due {assignment.dueDate}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                      {assignment.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {assignment.topics.map((t, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submission & AI Evaluation Studio (Right Column) */}
          <div className="lg:col-span-7">
            {selectedAssignmentId ? (
              (() => {
                const currentAssignment = assignments.find(a => a.id === selectedAssignmentId);
                const existingSub = getSubmissionForAssignment(selectedAssignmentId);

                return (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                            {currentAssignment?.courseCode}
                          </span>
                          <span className="text-xs text-slate-400">Max Marks: {currentAssignment?.maxMarks}</span>
                        </div>
                        <h2 className="text-lg font-bold text-white mt-1">
                          {currentAssignment?.title}
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                          {currentAssignment?.description}
                        </p>
                      </div>

                      {existingSub && (
                        <button
                          onClick={() => {
                            setSelectedEvaluationSubmission(existingSub);
                            setActiveSubTab('grades');
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 flex items-center space-x-1"
                        >
                          <span>View Evaluation</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Pre-fill Template helper buttons */}
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold text-slate-300">Code / Text Submission Editor:</span>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (currentAssignment?.courseCode === 'CS101') {
                              setSubmissionText(`# CS101 Solution - ${currentUser.fullName}\n\ndef process_records(data: list) -> dict:\n    """Processes and validates student grades using type conversions."""\n    summary = {"valid": 0, "averages": 0.0}\n    try:\n        parsed = [float(x) for x in data if x is not None]\n        summary["valid"] = len(parsed)\n        summary["averages"] = sum(parsed) / max(1, len(parsed))\n    except (ValueError, TypeError) as err:\n        print(f"Parsing error: {err}")\n    return summary\n\n# Test execution\nscores = ["98.5", "87.0", "92.3"]\nprint(f"Summary computed: {process_records(scores)}")`);
                            } else if (currentAssignment?.courseCode === 'CS201') {
                              setSubmissionText(`# CS201 Doubly Linked List\n\nclass Node:\n    def __init__(self, val):\n        self.val = val\n        self.next = None\n        self.prev = None\n\nclass Deque:\n    def __init__(self):\n        self.head = None\n        self.tail = None\n        self.count = 0\n        \n    def push_back(self, val):\n        node = Node(val)\n        if not self.tail:\n            self.head = self.tail = node\n        else:\n            self.tail.next = node\n            node.prev = self.tail\n            self.tail = node\n        self.count += 1`);
                            } else {
                              setSubmissionText(`# CS301 Machine Learning Gradient Descent\nimport numpy as np\n\ndef batch_gradient_descent(X, y, lr=0.05, epochs=500):\n    m, n = X.shape\n    weights = np.zeros(n)\n    bias = 0.0\n    for _ in range(epochs):\n        y_pred = X @ weights + bias\n        dw = (1 / m) * (X.T @ (y_pred - y))\n        db = (1 / m) * np.sum(y_pred - y)\n        weights -= lr * dw\n        bias -= lr * db\n    return weights, bias`);
                            }
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 font-medium"
                        >
                          Load Sample Solution
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubmissionText('')}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleRunAiEvaluation} className="space-y-4">
                      <div className="relative">
                        <textarea
                          rows={12}
                          value={submissionText}
                          onChange={(e) => setSubmissionText(e.target.value)}
                          placeholder={`# Paste or write your ${currentAssignment?.title} solution here...\n# Include functions, docstrings, type annotations, and edge case handling.`}
                          className="w-full bg-slate-950 font-mono text-xs sm:text-sm text-slate-200 rounded-xl p-4 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        <div className="flex items-center space-x-2">
                          <FileCode className="w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            placeholder="file_name.py"
                            className="bg-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none w-36"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isEvaluating || !submissionText.trim()}
                          className={`flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all ${
                            isEvaluating || !submissionText.trim()
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/25'
                          }`}
                        >
                          {isEvaluating ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Agentic Evaluation in Progress...</span>
                            </>
                          ) : (
                            <>
                              <BrainCircuit className="w-4 h-4" />
                              <span>Submit & Run AI Evaluation</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                );
              })()
            ) : (
              <div className="h-64 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 text-sm">
                Select an assignment from the left to start your submission.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED GRADES & EXPLAINABLE AI FEEDBACK */}
      {activeSubTab === 'grades' && (
        <div className="space-y-6">
          {studentSubmissions.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-400">
              <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="font-semibold text-slate-300">No evaluations yet.</p>
              <p className="text-xs text-slate-500 mt-1">Submit an assignment above to trigger the intelligent assessment agent.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Submission selector */}
              <div className="lg:col-span-4 space-y-3">
                <h3 className="text-sm font-bold text-white">Your Evaluated Work</h3>
                {studentSubmissions.map((sub) => {
                  const assignment = assignments.find(a => a.id === sub.assignmentId);
                  const isSelected = selectedEvaluationSubmission?.id === sub.id;
                  const eval_ = sub.evaluation;

                  return (
                    <div
                      key={sub.id}
                      onClick={() => setSelectedEvaluationSubmission(sub)}
                      className={`p-4 rounded-xl cursor-pointer border transition-all ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500 shadow-lg'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400">{assignment?.courseCode}</span>
                        {eval_ && (
                          <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                            {eval_.overallScore} / {eval_.maxScore} ({eval_.percentage}%)
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-slate-200 text-sm mt-1">{assignment?.title}</h4>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Submitted {sub.submittedAt}</span>
                        {eval_ && getMasteryBadge(eval_.masteryLevel)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Evaluation Detail Panel */}
              <div className="lg:col-span-8">
                {selectedEvaluationSubmission && selectedEvaluationSubmission.evaluation ? (
                  (() => {
                    const eval_ = selectedEvaluationSubmission.evaluation!;
                    const assignment = assignments.find(a => a.id === selectedEvaluationSubmission.assignmentId);

                    return (
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                        {/* Header Score Gauge Banner */}
                        <div className="p-5 rounded-xl bg-gradient-to-r from-slate-950 via-indigo-950/50 to-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                              {assignment?.courseCode} • {assignment?.title}
                            </span>
                            <h2 className="text-2xl font-black text-white mt-2">
                              {eval_.overallScore} <span className="text-sm font-normal text-slate-400">/ {eval_.maxScore} Marks</span>
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Evaluated by: {eval_.evaluatedBy} on {eval_.evaluatedAt}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            {getMasteryBadge(eval_.masteryLevel)}
                            <div className="w-32 bg-slate-800 h-2.5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
                                style={{ width: `${eval_.percentage}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-indigo-300">{eval_.percentage}% Overall Comprehension</span>
                          </div>
                        </div>

                        {/* Topic-Wise Mastery Breakdown */}
                        <div>
                          <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
                            <BrainCircuit className="w-4 h-4 text-indigo-400" />
                            <span>Topic-Wise Mastery Breakdown</span>
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Object.entries(eval_.topicScores).map(([topic, score]) => (
                              <div key={topic} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                                <div className="flex justify-between text-xs font-semibold mb-1">
                                  <span className="text-slate-200">{topic}</span>
                                  <span className={score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-rose-400'}>
                                    {score}%
                                  </span>
                                </div>
                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${score}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* AI Explainable Feedback */}
                        <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-slate-200 text-xs sm:text-sm leading-relaxed">
                          <p className="font-bold text-indigo-300 text-xs uppercase tracking-wider mb-1 flex items-center space-x-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Personalized Qualitative Assessment</span>
                          </p>
                          <p>{eval_.feedback}</p>
                        </div>

                        {/* Strengths & Weaknesses Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1 mb-2">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Key Strengths Identified</span>
                            </h4>
                            <ul className="space-y-1.5 text-xs text-slate-300">
                              {eval_.strengths.map((str, idx) => (
                                <li key={idx} className="flex items-start space-x-1.5">
                                  <span className="text-emerald-400">•</span>
                                  <span>{str}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20">
                            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1 mb-2">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Areas for Growth</span>
                            </h4>
                            <ul className="space-y-1.5 text-xs text-slate-300">
                              {eval_.weaknesses.map((weak, idx) => (
                                <li key={idx} className="flex items-start space-x-1.5">
                                  <span className="text-amber-400">•</span>
                                  <span>{weak}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* RAG Context Retrieval Citations */}
                        {eval_.ragContextUsed && eval_.ragContextUsed.length > 0 && (
                          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                            <p className="font-semibold text-slate-300 mb-2 flex items-center space-x-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                              <span>RAG Knowledge Base Citations Used in this Evaluation:</span>
                            </p>
                            <div className="space-y-1.5">
                              {eval_.ragContextUsed.map((ctx, idx) => (
                                <div key={idx} className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-indigo-200">
                                  {ctx}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="h-64 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 text-sm">
                    Select a submission from the left to view complete evaluation analytics.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ENROLLED COURSES */}
      {activeSubTab === 'courses' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300">
                  {course.code}
                </span>
                <span className="text-xs text-slate-400">{course.department}</span>
              </div>
              <h3 className="font-bold text-white text-base">{course.name}</h3>
              <p className="text-xs text-slate-400 line-clamp-3">{course.description}</p>
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Instructor: {course.facultyName}</span>
                <span className="text-indigo-400 font-semibold">{course.enrolledCount} Students</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
