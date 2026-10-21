'use client';

import React, { useState } from 'react';
import { User, Course, Assignment, Submission, LearningGap } from '../lib/types';
import { AgenticAssessmentPipeline } from '../lib/aiAgentService';
import {
  BookOpen, CheckCircle, Clock, AlertTriangle, Send, Sparkles,
  Award, BrainCircuit, UserIcon, ShieldCheck, ChevronRight
} from '../lib/icons';

interface FacultyPortalProps {
  currentUser: User;
  courses: Course[];
  assignments: Assignment[];
  submissions: Submission[];
  onNewAssignment: (assignment: Assignment) => void;
  onUpdateSubmission: (submission: Submission) => void;
}

export const FacultyPortal: React.FC<FacultyPortalProps> = ({
  currentUser,
  courses,
  assignments,
  submissions,
  onNewAssignment,
  onUpdateSubmission,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'courses' | 'assignments' | 'queue' | 'gaps'>('queue');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [evaluatingSubId, setEvaluatingSubId] = useState<string | null>(null);

  // New Assignment Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCourseId, setNewCourseId] = useState(courses[0]?.id || '');
  const [newDesc, setNewDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState('2026-11-15');
  const [newMaxMarks, setNewMaxMarks] = useState(100);
  const [newTopics, setNewTopics] = useState('Dynamic Programming, Memoization, State Transitions');
  const [newType, setNewType] = useState<'assignment' | 'project' | 'lab'>('assignment');

  // Score override state
  const [overrideModalSub, setOverrideModalSub] = useState<Submission | null>(null);
  const [overrideScoreInput, setOverrideScoreInput] = useState<number>(0);

  const filteredSubmissions = submissions.filter(sub => {
    if (selectedCourseFilter === 'all') return true;
    const assign = assignments.find(a => a.id === sub.assignmentId);
    return assign?.courseCode === selectedCourseFilter;
  });

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const course = courses.find(c => c.id === newCourseId);
    if (!course) return;

    const parsedTopics = newTopics
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const assignment: Assignment = {
      id: `a-${Date.now()}`,
      courseId: course.id,
      courseCode: course.code,
      title: newTitle,
      description: newDesc,
      dueDate: newDueDate,
      maxMarks: Number(newMaxMarks),
      topics: parsedTopics.length > 0 ? parsedTopics : ['Core Fundamentals'],
      type: newType,
      isOverdue: false,
    };

    onNewAssignment(assignment);
    setNewTitle('');
    setNewDesc('');
    setActiveSubTab('assignments');
  };

  const handleTriggerAiEvaluation = async (sub: Submission) => {
    const assignment = assignments.find(a => a.id === sub.assignmentId);
    if (!assignment) return;

    setEvaluatingSubId(sub.id);

    try {
      const evaluation = await AgenticAssessmentPipeline.evaluateSubmission({
        submissionContent: sub.content,
        assignmentTitle: assignment.title,
        assignmentDescription: assignment.description,
        topics: assignment.topics,
        maxMarks: assignment.maxMarks,
      });

      const updated: Submission = {
        ...sub,
        status: 'evaluated',
        evaluation,
      };

      onUpdateSubmission(updated);
    } catch (err) {
      console.error('Failed to evaluate submission:', err);
    } finally {
      setEvaluatingSubId(null);
    }
  };

  const handleApplyOverride = () => {
    if (!overrideModalSub || !overrideModalSub.evaluation) return;

    const oldEval = overrideModalSub.evaluation;
    const newScore = Math.min(oldEval.maxScore, Math.max(0, Number(overrideScoreInput)));
    const newPct = Math.round((newScore / oldEval.maxScore) * 100);

    const updated: Submission = {
      ...overrideModalSub,
      evaluation: {
        ...oldEval,
        overallScore: newScore,
        percentage: newPct,
        evaluatedBy: `Faculty Override (${currentUser.fullName})`,
      },
    };

    onUpdateSubmission(updated);
    setOverrideModalSub(null);
  };

  // Learning gaps mock compute
  const learningGaps: LearningGap[] = [
    {
      topic: 'Recursion & Memoization',
      courseCode: 'CS101',
      averageScore: 56,
      studentsAffected: 3,
      severity: 'high',
      suggestedAction: 'Hold a focused workshop illustrating call-stack unwinding with visual trees.',
    },
    {
      topic: 'Amortized Complexity & Pointer Manipulation',
      courseCode: 'CS201',
      averageScore: 62,
      studentsAffected: 2,
      severity: 'medium',
      suggestedAction: 'Provide additional step-by-step debugging walkthroughs on boundary edge cases.',
    },
    {
      topic: 'Vectorized NumPy Broadcasting',
      courseCode: 'CS301',
      averageScore: 71,
      studentsAffected: 1,
      severity: 'low',
      suggestedAction: 'Assign practice drill on matrix tensor transpositions.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Faculty Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border border-purple-500/20 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Faculty Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Instructor Dashboard: {currentUser.fullName}
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Monitor student submissions, trigger multi-agent automated evaluations, override marks, and diagnose topic-wise conceptual gaps across your cohorts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center">
              <p className="text-xs text-slate-400 font-medium">Submissions</p>
              <p className="text-xl font-bold text-purple-300">{submissions.length}</p>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center">
              <p className="text-xs text-slate-400 font-medium">Pending AI Queue</p>
              <p className="text-xl font-bold text-amber-400">
                {submissions.filter(s => s.status === 'submitted').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Faculty Sub-Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveSubTab('queue')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeSubTab === 'queue'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            📥 Submissions & AI Grading Queue ({submissions.length})
          </button>
          <button
            onClick={() => setActiveSubTab('assignments')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeSubTab === 'assignments'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            📋 Manage & Create Assignments
          </button>
          <button
            onClick={() => setActiveSubTab('gaps')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeSubTab === 'gaps'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            🔍 Learning Gap Detector
          </button>
          <button
            onClick={() => setActiveSubTab('courses')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeSubTab === 'courses'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            🏛️ Department Courses
          </button>
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Filter Course:</span>
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="bg-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none"
          >
            <option value="all">All Courses</option>
            {courses.map(c => (
              <option key={c.id} value={c.code}>{c.code}</option>
            ))}
          </select>
        </div>
      </div>

      {/* SUB TAB 1: SUBMISSIONS & AI GRADING QUEUE */}
      {activeSubTab === 'queue' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <BrainCircuit className="w-4 h-4 text-purple-400" />
                <span>Student Submissions Review ({filteredSubmissions.length})</span>
              </h2>
              <span className="text-xs text-slate-400">Live AI Assessor Status: Active</span>
            </div>

            <div className="divide-y divide-slate-800">
              {filteredSubmissions.map((sub) => {
                const assign = assignments.find(a => a.id === sub.assignmentId);
                const isEvaluating = evaluatingSubId === sub.id;
                const eval_ = sub.evaluation;

                return (
                  <div key={sub.id} className="p-5 hover:bg-slate-800/30 transition-all space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                            {assign?.courseCode}
                          </span>
                          <span className="text-sm font-bold text-white">{assign?.title}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
                          <span className="font-semibold text-slate-300">Student: {sub.studentName}</span>
                          <span>•</span>
                          <span>File: {sub.fileName}</span>
                          <span>•</span>
                          <span>Submitted: {sub.submittedAt}</span>
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        {eval_ ? (
                          <div className="text-right">
                            <span className="text-base font-extrabold text-white">
                              {eval_.overallScore} / {eval_.maxScore}
                            </span>
                            <span className="text-xs text-emerald-400 block font-semibold">
                              {eval_.percentage}% ({eval_.masteryLevel})
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Pending Evaluation
                          </span>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleTriggerAiEvaluation(sub)}
                            disabled={isEvaluating}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                              isEvaluating
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-sm'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{isEvaluating ? 'Evaluating...' : eval_ ? 'Re-Evaluate AI' : 'Run AI Grading'}</span>
                          </button>

                          {eval_ && (
                            <button
                              onClick={() => {
                                setOverrideModalSub(sub);
                                setOverrideScoreInput(eval_.overallScore);
                              }}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                            >
                              Override
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Preview Submission snippet */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-28">
                      <pre>{sub.content}</pre>
                    </div>

                    {/* Quick Evaluation highlights if evaluated */}
                    {eval_ && (
                      <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 text-xs space-y-1.5">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(eval_.topicScores).map(([topic, score]) => (
                            <span key={topic} className="px-2 py-0.5 rounded bg-slate-800/80 text-[11px] text-slate-300">
                              {topic}: <strong className={score >= 80 ? 'text-emerald-400' : 'text-amber-400'}>{score}%</strong>
                            </span>
                          ))}
                        </div>
                        <p className="text-slate-400 italic text-[11px] mt-1">"{eval_.feedback}"</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 2: ASSIGNMENT CREATOR & LIST */}
      {activeSubTab === 'assignments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Assignment Creator Form */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span>Create New Assignment</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Set rubric topics and automated evaluation parameters</p>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Assignment Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Dynamic Programming & Memoization"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target Course</label>
                  <select
                    value={newCourseId}
                    onChange={(e) => setNewCourseId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.code} - {c.name.split(' ')[0]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Assessment Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none"
                  >
                    <option value="assignment">Assignment</option>
                    <option value="project">Project</option>
                    <option value="lab">Lab Assessment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description & Requirements</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Define technical expectations, function signatures, constraints..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Topic Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newTopics}
                  onChange={(e) => setNewTopics(e.target.value)}
                  placeholder="Recursion, Dynamic Programming, Memoization"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">The AI Assessment Agent breaks down grades against these exact topics.</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Max Marks</label>
                  <input
                    type="number"
                    value={newMaxMarks}
                    onChange={(e) => setNewMaxMarks(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 text-sm transition-all"
              >
                Publish Assignment
              </button>
            </form>
          </div>

          {/* Current Assignments List */}
          <div className="lg:col-span-7 space-y-3">
            <h2 className="text-base font-bold text-white">Active Assignments ({assignments.length})</h2>
            {assignments.map((assignment) => {
              const count = submissions.filter(s => s.assignmentId === assignment.id).length;

              return (
                <div key={assignment.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                      {assignment.courseCode}
                    </span>
                    <span className="text-xs text-slate-400">
                      Due: {assignment.dueDate} • Max: {assignment.maxMarks}
                    </span>
                  </div>
                  <h3 className="font-semibold text-white text-sm">{assignment.title}</h3>
                  <p className="text-xs text-slate-400">{assignment.description}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                    <div className="flex flex-wrap gap-1">
                      {assignment.topics.map((t, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {t}
                        </span>
                      ))}
                    </div>
                    <span className="font-semibold text-purple-300">{count} submissions received</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB TAB 3: LEARNING GAP DETECTOR */}
      {activeSubTab === 'gaps' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Automated Learning Gap Analysis</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Synthesized by the Analytics Agent by inspecting all evaluated submission rubrics across CS cohorts.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {learningGaps.map((gap, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border ${
                    gap.severity === 'high'
                      ? 'bg-rose-950/20 border-rose-500/30'
                      : gap.severity === 'medium'
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-indigo-950/20 border-indigo-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">{gap.courseCode}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        gap.severity === 'high'
                          ? 'bg-rose-500/20 text-rose-300'
                          : gap.severity === 'medium'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-indigo-500/20 text-indigo-300'
                      }`}
                    >
                      {gap.severity} Severity
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-sm mt-2">{gap.topic}</h4>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-slate-400">Class Average:</span>
                    <span className="font-bold text-rose-400">{gap.averageScore}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-slate-400">Students Flagged:</span>
                    <span className="font-bold text-amber-300">{gap.studentsAffected} students</span>
                  </div>
                  <div className="mt-3 p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                    <strong className="text-purple-300 block mb-0.5">Recommended Intervention:</strong>
                    {gap.suggestedAction}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 4: DEPARTMENT COURSES */}
      {activeSubTab === 'courses' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-purple-500/20 text-purple-300">
                  {course.code}
                </span>
                <span className="text-xs text-slate-400">{course.enrolledCount} Enrolled</span>
              </div>
              <h3 className="font-bold text-white text-base">{course.name}</h3>
              <p className="text-xs text-slate-400 line-clamp-3">{course.description}</p>
              <div className="pt-3 border-t border-slate-800 text-xs text-slate-400">
                Department: {course.department}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Faculty Score Override */}
      {overrideModalSub && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Override Assessment Grade</h3>
            <p className="text-xs text-slate-400">
              Student: <strong className="text-white">{overrideModalSub.studentName}</strong>
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                New Marks (Max: {overrideModalSub.evaluation?.maxScore})
              </label>
              <input
                type="number"
                value={overrideScoreInput}
                onChange={(e) => setOverrideScoreInput(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setOverrideModalSub(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyOverride}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white"
              >
                Save Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
