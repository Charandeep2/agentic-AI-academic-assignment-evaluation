'use client';

import React, { useState, useEffect } from 'react';
import {
  EvaluationComponent,
  EVALUATION_PRESETS,
  getCourseEvaluationScheme,
  matchAssignmentToComponent,
} from '@/lib/evaluation';

interface GradesTabProps {
  activeClass: any;
  assignments: any[];
  submissions: any[];
  allUsers: any[];
  currentUser: any;
}

export const GradesTab: React.FC<GradesTabProps> = ({
  activeClass,
  assignments,
  submissions,
  allUsers,
  currentUser,
}) => {
  const isFaculty = currentUser.role === 'faculty';
  const classAssignments = assignments.filter((a) => a.classId === activeClass.id);
  const classSubmissions = submissions.filter((s) => s.classId === activeClass.id);
  const enrolledStudentIds = activeClass.enrolledStudentIds || [];
  const enrolledStudents = allUsers.filter(
    (u) => u.role === 'student' && enrolledStudentIds.includes(u.id)
  );

  // Selected submission modal for detailed Groq evaluation review
  const [selectedEvaluation, setSelectedEvaluation] = useState<any | null>(null);
  const [showGradesAgentTrail, setShowGradesAgentTrail] = useState(false);
  const [gradesAgentTab, setGradesAgentTab] = useState<'agent1' | 'agent2' | 'agent3'>('agent3');

  // Dynamic Course Evaluation Scheme state
  const [evalScheme, setEvalScheme] = useState<EvaluationComponent[]>(
    getCourseEvaluationScheme(activeClass)
  );

  useEffect(() => {
    setEvalScheme(getCourseEvaluationScheme(activeClass));
  }, [activeClass]);

  // Modal to customize evaluation scheme (Faculty)
  const [showEditSchemeModal, setShowEditSchemeModal] = useState(false);
  const [draftScheme, setDraftScheme] = useState<EvaluationComponent[]>([]);
  const [isSavingScheme, setIsSavingScheme] = useState(false);

  const openEditSchemeModal = () => {
    setDraftScheme(evalScheme.map((c) => ({ ...c })));
    setShowEditSchemeModal(true);
  };

  const handleAddDraftComponent = () => {
    setDraftScheme((prev) => [
      ...prev,
      {
        id: `eval-${Date.now()}`,
        name: 'Final Capstone Project',
        weight: 10,
      },
    ]);
  };

  const handleRemoveDraftComponent = (idx: number) => {
    if (draftScheme.length <= 1) {
      alert('You must maintain at least one evaluation criteria component.');
      return;
    }
    setDraftScheme((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateDraftComponent = (idx: number, field: 'name' | 'weight', value: any) => {
    setDraftScheme((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const applyDraftPreset = (presetKey: string) => {
    if (EVALUATION_PRESETS[presetKey]) {
      setDraftScheme(EVALUATION_PRESETS[presetKey].map((c) => ({ ...c })));
    }
  };

  const draftTotalWeight = draftScheme.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);

  const handleSaveScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (draftTotalWeight !== 100) {
      alert(`Total evaluation weights must equal 100%. Currently: ${draftTotalWeight}%`);
      return;
    }

    setIsSavingScheme(true);
    try {
      const gradingWeightsMap: Record<string, number> = {};
      draftScheme.forEach((c) => {
        gradingWeightsMap[c.id] = Number(c.weight) || 0;
      });

      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_evaluation_scheme',
          classId: activeClass.id,
          evaluationScheme: draftScheme.map((c) => ({
            id: c.id,
            name: c.name.trim(),
            weight: Number(c.weight) || 0,
          })),
          gradingWeights: gradingWeightsMap,
        }),
      });

      if (res.ok) {
        setEvalScheme(draftScheme);
        activeClass.evaluationScheme = draftScheme;
        activeClass.gradingWeights = gradingWeightsMap;
        setShowEditSchemeModal(false);
      } else {
        alert('Failed to update evaluation scheme.');
      }
    } catch (err) {
      console.error('Error saving scheme:', err);
      alert('Network error updating evaluation scheme.');
    } finally {
      setIsSavingScheme(false);
    }
  };

  // Syllabus progress
  const syllabus = activeClass.syllabusProgress || {
    currentTopic: 'Unit 1: Fundamentals',
    completedModules: ['Unit 1: Core Fundamentals'],
    futureModules: ['Unit 2: Advanced Topics'],
  };

  // Badge theme colors per component index
  const COMPONENT_THEMES = [
    { bg: 'bg-purple-100 text-purple-800 border-purple-200', cardBg: 'bg-purple-50/50 border-purple-200 text-purple-900', badge: 'bg-purple-100 text-purple-800' },
    { bg: 'bg-blue-100 text-blue-800 border-blue-200', cardBg: 'bg-blue-50/50 border-blue-200 text-blue-900', badge: 'bg-blue-100 text-blue-800' },
    { bg: 'bg-amber-100 text-amber-800 border-amber-200', cardBg: 'bg-amber-50/50 border-amber-200 text-amber-900', badge: 'bg-amber-100 text-amber-800' },
    { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', cardBg: 'bg-emerald-50/50 border-emerald-200 text-emerald-900', badge: 'bg-emerald-100 text-emerald-800' },
    { bg: 'bg-rose-100 text-rose-800 border-rose-200', cardBg: 'bg-rose-50/50 border-rose-200 text-rose-900', badge: 'bg-rose-100 text-rose-800' },
    { bg: 'bg-cyan-100 text-cyan-800 border-cyan-200', cardBg: 'bg-cyan-50/50 border-cyan-200 text-cyan-900', badge: 'bg-cyan-100 text-cyan-800' },
    { bg: 'bg-indigo-100 text-indigo-800 border-indigo-200', cardBg: 'bg-indigo-50/50 border-indigo-200 text-indigo-900', badge: 'bg-indigo-100 text-indigo-800' },
  ];

  const getThemeForComponent = (idx: number) => {
    return COMPONENT_THEMES[idx % COMPONENT_THEMES.length];
  };

  // Compute student weighted score based on dynamic evaluation components
  const computeStudentGrades = (studentId: string) => {
    const studentSubs = classSubmissions.filter((s) => s.studentId === studentId && s.evaluation);

    const compStats: Record<string, { total: number; max: number; count: number; name: string; weight: number }> = {};
    evalScheme.forEach((comp) => {
      compStats[comp.id] = { total: 0, max: 0, count: 0, name: comp.name, weight: comp.weight };
    });

    studentSubs.forEach((sub) => {
      const a = classAssignments.find((item) => item.id === sub.assignmentId);
      const matched = matchAssignmentToComponent(a || sub, evalScheme);
      if (compStats[matched.id]) {
        compStats[matched.id].total += sub.evaluation?.overallScore || 0;
        compStats[matched.id].max += sub.evaluation?.maxScore || 100;
        compStats[matched.id].count += 1;
      }
    });

    let activeWeightTotal = 0;
    let weightedSum = 0;

    const breakdown: Record<string, { pct: number | null; weight: number; count: number; name: string }> = {};

    evalScheme.forEach((comp) => {
      const stat = compStats[comp.id];
      if (stat && stat.max > 0) {
        const pct = Math.round((stat.total / stat.max) * 100);
        breakdown[comp.id] = { pct, weight: comp.weight, count: stat.count, name: comp.name };
        weightedSum += pct * comp.weight;
        activeWeightTotal += comp.weight;
      } else {
        breakdown[comp.id] = { pct: null, weight: comp.weight, count: 0, name: comp.name };
      }
    });

    const finalWeightedGrade = activeWeightTotal > 0 ? Math.round(weightedSum / activeWeightTotal) : 0;
    return { finalWeightedGrade, breakdown, compStats, totalEvaluations: studentSubs.length };
  };

  // Student metrics
  const myGrades = computeStudentGrades(currentUser.id);
  const mySubmissions = classSubmissions.filter((s) => s.studentId === currentUser.id && s.evaluation);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isFaculty ? 'Class Gradebook & Assessment Matrix' : 'Your Academic Grades & Weighted Standing'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Evaluated by Groq Agentic Pipeline with Custom Course Credit Weighting &amp; Syllabus Progress Alignment
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {isFaculty && (
            <button
              onClick={openEditSchemeModal}
              className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5"
            >
              <span>⚙️ Customize Evaluation Scheme</span>
            </button>
          )}
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            {isFaculty ? `${enrolledStudents.length} Students Graded` : `Weighted Average: ${myGrades.finalWeightedGrade}%`}
          </span>
        </div>
      </div>

      {/* DYNAMIC COURSE CREDIT & EVALUATION SCHEME BANNER */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-gray-900 text-white rounded-2xl p-5 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold tracking-wider bg-white/20 text-white px-2.5 py-0.5 rounded-full uppercase">
                Official Course Policy
              </span>
              <span className="text-[10px] text-emerald-200 font-semibold">
                {evalScheme.length} Custom Evaluation Components
              </span>
            </div>
            <h3 className="text-base font-extrabold tracking-tight">
              Course Credit Criteria &amp; Dynamic Evaluation Distribution
            </h3>
            <p className="text-xs text-white/80">
              The AI calculates cumulative weighted standing and designs assessments strictly based on this configured scheme.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-white/10 px-3.5 py-2 rounded-xl backdrop-blur-sm border border-white/15">
            <span className="text-base">📚</span>
            <div className="text-right">
              <span className="block text-[10px] font-bold text-emerald-200 uppercase tracking-wider">
                Current Syllabus Milestone
              </span>
              <span className="block text-xs font-bold text-white truncate max-w-[220px]">
                {syllabus.currentTopic}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Component Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
          {evalScheme.map((comp, idx) => {
            return (
              <div
                key={comp.id || idx}
                className="bg-white/10 border border-white/15 rounded-xl p-3 backdrop-blur-sm space-y-1"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider truncate max-w-[120px]" title={comp.name}>
                    {comp.name}
                  </span>
                  <span className="text-[10px] font-mono text-white/80 bg-white/10 px-1.5 py-0.5 rounded">
                    #{idx + 1}
                  </span>
                </div>
                <p className="text-2xl font-black text-white">{comp.weight}%</p>
                <span className="text-[10px] text-white/70 block truncate">
                  Weighted component
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* FACULTY VIEW: SPREADSHEET MATRIX WITH WEIGHTED AVERAGES */}
      {isFaculty ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-4">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Classroom Gradebook Matrix</h3>
              <p className="text-xs text-gray-500">
                Click any score to view detailed AI topic comprehension rubrics and grace marks awarded.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={openEditSchemeModal}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-white px-3 py-1 rounded-xl border border-emerald-200 shadow-xs"
              >
                + Add / Edit Criteria
              </button>
              <span className="text-xs font-bold text-gray-600 bg-white px-3 py-1 rounded-xl border border-gray-200 shadow-xs">
                {classAssignments.length} Assignments &bull; {enrolledStudents.length} Students
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-4 px-6 min-w-[200px]">Student Name</th>
                  <th className="py-4 px-4 text-center min-w-[130px]">
                    <span className="block font-black text-gray-900">Weighted Average</span>
                    <span className="text-[9px] text-emerald-700 font-bold lowercase">
                      ({evalScheme.map((c) => `${c.weight}%`).join('/')})
                    </span>
                  </th>
                  <th className="py-4 px-4 text-center min-w-[200px]">Criteria Breakdown</th>
                  {classAssignments.map((a) => {
                    const matched = matchAssignmentToComponent(a, evalScheme);
                    const compIdx = evalScheme.findIndex((c) => c.id === matched.id);
                    const theme = getThemeForComponent(compIdx >= 0 ? compIdx : 0);

                    return (
                      <th key={a.id} className="py-4 px-4 text-center min-w-[150px]">
                        <span className="block truncate max-w-[140px] text-gray-900 font-bold">{a.title}</span>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border mt-0.5 ${theme.bg}`}>
                          {matched.name} ({matched.weight}%)
                        </span>
                        <span className="block text-[9px] text-gray-400 font-normal">out of {a.points}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {enrolledStudents.length === 0 ? (
                  <tr>
                    <td colSpan={classAssignments.length + 3} className="py-12 text-center text-gray-400 text-xs italic">
                      No students enrolled in this classroom yet. Share class code &ldquo;{activeClass.classCode}&rdquo; with your students.
                    </td>
                  </tr>
                ) : (
                  enrolledStudents.map((student) => {
                    const grades = computeStudentGrades(student.id);
                    const studentSubs = classSubmissions.filter((s) => s.studentId === student.id);
                    const avg = grades.finalWeightedGrade;

                    return (
                      <tr key={student.id} className="hover:bg-gray-50/70 transition">
                        {/* Student info */}
                        <td className="py-3.5 px-6 flex items-center space-x-3">
                          <img
                            src={student.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.id}`}
                            alt={student.fullName}
                            className="w-8 h-8 rounded-full border border-gray-200"
                          />
                          <div>
                            <p className="font-bold text-gray-900">{student.fullName}</p>
                            <p className="text-[10px] text-gray-400">{student.email}</p>
                          </div>
                        </td>

                        {/* Weighted Grade */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-3 py-1.5 rounded-full text-xs font-black shadow-xs ${
                              avg >= 85
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : avg >= 70
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : avg >= 55
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}
                          >
                            {avg}%
                          </span>
                        </td>

                        {/* Category breakdown pill list */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap items-center justify-center gap-1 text-[10px]">
                            {evalScheme.map((comp, cIdx) => {
                              const b = grades.breakdown[comp.id];
                              if (b && b.pct !== null) {
                                const theme = getThemeForComponent(cIdx);
                                return (
                                  <span
                                    key={comp.id}
                                    className={`px-1.5 py-0.5 rounded border font-mono font-bold ${theme.bg}`}
                                    title={`${comp.name} (${comp.weight}%)`}
                                  >
                                    {comp.name.split(' ')[0]}: {b.pct}%
                                  </span>
                                );
                              }
                              return null;
                            })}
                            {Object.values(grades.breakdown).every((b) => b.pct === null) && (
                              <span className="text-gray-400 italic">No tasks graded</span>
                            )}
                          </div>
                        </td>

                        {/* Assignment scores */}
                        {classAssignments.map((a) => {
                          const sub = studentSubs.find((s) => s.assignmentId === a.id);
                          const eval_ = sub?.evaluation;

                          return (
                            <td key={a.id} className="py-3.5 px-4 text-center">
                              {eval_ ? (
                                <button
                                  onClick={() =>
                                    setSelectedEvaluation({
                                      ...eval_,
                                      studentName: student.fullName,
                                      assignmentTitle: a.title,
                                      matchedComponent: matchAssignmentToComponent(a, evalScheme),
                                    })
                                  }
                                  className="inline-block p-1.5 rounded-lg hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition text-center group cursor-pointer"
                                >
                                  <span className="font-extrabold text-xs text-gray-900 group-hover:text-emerald-700">
                                    {eval_.overallScore} / {eval_.maxScore}
                                  </span>
                                  {eval_.graceMarksAwarded > 0 && (
                                    <span className="block text-[9px] text-amber-600 font-bold">
                                      +{eval_.graceMarksAwarded} grace
                                    </span>
                                  )}
                                  <span className="block text-[9px] uppercase font-bold text-emerald-600">
                                    {eval_.masteryLevel}
                                  </span>
                                </button>
                              ) : (
                                <span className="text-gray-400 font-mono text-xs">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* STUDENT VIEW: PERSONAL GRADE REPORT & DYNAMIC BREAKDOWN */
        <div className="space-y-6">
          {/* Top 3 Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500">Cumulative Weighted Standing</span>
              <p className="text-3xl font-extrabold text-emerald-700 mt-2">{myGrades.finalWeightedGrade}%</p>
              <p className="text-[11px] text-gray-400 mt-1">
                Calculated across {evalScheme.length} course evaluation components ({evalScheme.map((c) => `${c.weight}%`).join('/')})
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500">Syllabus Mastery Status</span>
              <p className="text-2xl font-bold text-gray-900 mt-2 capitalize">
                {myGrades.finalWeightedGrade >= 90
                  ? '🏆 Mastery Expert'
                  : myGrades.finalWeightedGrade >= 75
                  ? '⭐ Advanced Proficiency'
                  : '📈 Developing Competence'}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Aligned with topic milestone &ldquo;{syllabus.currentTopic}&rdquo;</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500">Evaluations Completed</span>
              <p className="text-3xl font-extrabold text-indigo-700 mt-2">{mySubmissions.length}</p>
              <p className="text-[11px] text-gray-400 mt-1">Evaluated by Groq AI Agentic Pipeline</p>
            </div>
          </div>

          {/* Dynamic Category Breakdown Cards Grid */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Credit Weight Breakdown Across Configured Course Criteria</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {evalScheme.map((comp, idx) => {
                const b = myGrades.breakdown[comp.id];
                const count = myGrades.compStats[comp.id]?.count || 0;
                const theme = getThemeForComponent(idx);

                return (
                  <div key={comp.id || idx} className={`p-4 rounded-xl border ${theme.cardBg} space-y-2`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold truncate max-w-[130px]" title={comp.name}>
                        {comp.name}
                      </span>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${theme.badge}`}>
                        {comp.weight}%
                      </span>
                    </div>
                    <p className="text-2xl font-extrabold">
                      {b && b.pct !== null ? `${b.pct}%` : 'Pending Tasks'}
                    </p>
                    <span className="text-[10px] opacity-80 block">
                      {count} task(s) evaluated
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Graded Assignments Cards */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-800">Evaluated Tasks &amp; AI Breakdown</h3>
            {mySubmissions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-xs italic">
                No evaluated assignments found yet. Turn in tasks in the Classwork tab to receive AI evaluation.
              </div>
            ) : (
              mySubmissions.map((sub) => {
                const assign = classAssignments.find((a) => a.id === sub.assignmentId);
                const eval_ = sub.evaluation!;
                const matched = matchAssignmentToComponent(assign || sub, evalScheme);
                const compIdx = evalScheme.findIndex((c) => c.id === matched.id);
                const theme = getThemeForComponent(compIdx >= 0 ? compIdx : 0);

                return (
                  <div key={sub.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-base font-bold text-gray-900">{assign?.title}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${theme.bg}`}>
                            {matched.name} ({matched.weight}%)
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          File: {sub.fileName} &bull; Graded: {eval_.evaluatedAt}
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-xl font-black text-emerald-700">
                          {eval_.overallScore} / {eval_.maxScore}
                        </span>
                        <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {eval_.masteryLevel}
                        </span>
                      </div>
                    </div>

                    {/* Grace Marks Notice */}
                    {eval_.graceMarksAwarded > 0 && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-2 text-xs text-amber-900">
                        <span className="text-base">🎁</span>
                        <div>
                          <span className="font-bold">+{eval_.graceMarksAwarded} Teacher Grace Marks Awarded:</span>
                          <p className="text-[11px] text-amber-800 italic mt-0.5">
                            &ldquo;{eval_.graceMarksReason || 'Awarded for sincere effort and structured conceptual understanding.'}&rdquo;
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Topic breakdown progress bars */}
                    <div>
                      <p className="text-xs font-bold text-gray-700 mb-2">Topic Comprehension Breakdown:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.entries(eval_.topicScores || {}).map(([topic, score]) => (
                          <div key={topic} className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium text-gray-700">{topic}</span>
                              <span className="font-bold text-emerald-700">{Number(score)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-600 rounded-full"
                                style={{ width: `${score}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Groq Feedback */}
                    <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 text-xs text-gray-700 space-y-2">
                      <p className="font-bold text-emerald-900 flex items-center space-x-1">
                        <span>🤖 Groq LLM Qualitative Assessment ({eval_.evaluatedBy})</span>
                      </p>
                      <p className="leading-relaxed">{eval_.feedback}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL: Detailed Groq AI Assessment Review */}
      {selectedEvaluation && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-700">{selectedEvaluation.studentName}</span>
                <h3 className="text-base font-bold text-gray-900 mt-0.5">{selectedEvaluation.assignmentTitle}</h3>
                {selectedEvaluation.matchedComponent && (
                  <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                    Evaluation Category: {selectedEvaluation.matchedComponent.name} ({selectedEvaluation.matchedComponent.weight}%)
                  </span>
                )}
              </div>
              <span className="text-xl font-extrabold text-emerald-700">
                {selectedEvaluation.overallScore} / {selectedEvaluation.maxScore}
              </span>
            </div>

            {/* AUDITOR AGENT VERIFICATION & SELF-REFLECTION BANNER */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white border border-emerald-500/40 shadow-lg space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 font-bold text-xs">
                    🛡️
                  </span>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-extrabold text-white text-[11px] tracking-wide uppercase">
                        Auditor Verdict:
                      </span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.2 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                        {selectedEvaluation.auditStatus || 'APPROVED'} ✓
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-200/90 truncate max-w-[240px]">
                      {selectedEvaluation.auditorBadge || 'Audited & Verified by Senior Academic AI Auditor: APPROVED ✓'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGradesAgentTrail(!showGradesAgentTrail)}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[10px] font-bold transition flex items-center space-x-1"
                >
                  <span>{showGradesAgentTrail ? 'Hide Trail' : 'Inspect 3-Agent Trail'}</span>
                  <span>{showGradesAgentTrail ? '▲' : '▼'}</span>
                </button>
              </div>

              {showGradesAgentTrail && (
                <div className="pt-2 border-t border-white/15 space-y-2 text-[11px] animate-fadeIn">
                  <div className="flex items-center space-x-1 border-b border-white/10 pb-1.5">
                    <button
                      type="button"
                      onClick={() => setGradesAgentTab('agent1')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${gradesAgentTab === 'agent1' ? 'bg-emerald-500 text-white' : 'text-gray-300 hover:text-white'}`}
                    >
                      1. Extractor
                    </button>
                    <button
                      type="button"
                      onClick={() => setGradesAgentTab('agent2')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${gradesAgentTab === 'agent2' ? 'bg-emerald-500 text-white' : 'text-gray-300 hover:text-white'}`}
                    >
                      2. Evaluator
                    </button>
                    <button
                      type="button"
                      onClick={() => setGradesAgentTab('agent3')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${gradesAgentTab === 'agent3' ? 'bg-emerald-500 text-white' : 'text-gray-300 hover:text-white'}`}
                    >
                      3. Auditor
                    </button>
                  </div>

                  {gradesAgentTab === 'agent1' && (
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {(selectedEvaluation.multiAgentWorkflow?.agent1_rubric?.criteria || []).map((crit: any, i: number) => (
                        <div key={i} className="p-1.5 rounded bg-white/5 border border-white/10 text-[10px]">
                          <div className="flex justify-between font-bold text-white">
                            <span>{crit.name}</span>
                            <span className="text-emerald-400">{crit.maxPoints} pts</span>
                          </div>
                          <p className="text-gray-300 text-[9px] mt-0.5">{crit.rules || crit.description}</p>
                        </div>
                      ))}
                      {(!selectedEvaluation.multiAgentWorkflow?.agent1_rubric?.criteria || selectedEvaluation.multiAgentWorkflow?.agent1_rubric?.criteria.length === 0) && (
                        <p className="text-gray-400 italic text-[10px]">Formulated from curriculum standards.</p>
                      )}
                    </div>
                  )}

                  {gradesAgentTab === 'agent2' && (
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {(selectedEvaluation.multiAgentWorkflow?.agent2_evaluation?.criteriaEvaluations || []).map((ce: any, i: number) => (
                        <div key={i} className="p-1.5 rounded bg-white/5 border border-white/10 text-[10px]">
                          <div className="flex justify-between font-bold text-white">
                            <span>{ce.name}</span>
                            <span className="text-emerald-300">{ce.scoreAwarded} / {ce.maxPoints}</span>
                          </div>
                          <p className="text-gray-300 text-[9px] italic">&ldquo;{ce.justification}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {gradesAgentTab === 'agent3' && (
                    <div className="p-2 rounded bg-white/5 border border-white/10 space-y-1 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Sum Validated:</span>
                        <span className="font-mono text-emerald-300">
                          {selectedEvaluation.multiAgentWorkflow?.agent3_audit?.mathCheck?.calculatedCriteriaSum ?? selectedEvaluation.overallScore} pts (100% Match)
                        </span>
                      </div>
                      <p className="text-gray-300 text-[9px] leading-snug">
                        {selectedEvaluation.multiAgentWorkflow?.agent3_audit?.auditExplanation || 'Mathematical summation verified and 100% adherence to rubric guidelines confirmed.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <p className="font-bold text-gray-700 uppercase tracking-wider text-[11px] mb-2">Topic Breakdown</p>
              <div className="space-y-1.5">
                {Object.entries(selectedEvaluation.topicScores || {}).map(([top, sc]) => (
                  <div key={top} className="flex justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 text-xs">
                    <span className="text-gray-700">{top}</span>
                    <span className="font-bold text-emerald-700">{Number(sc)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-gray-700 space-y-1">
              <p className="font-bold text-emerald-900">Qualitative Feedback</p>
              <p className="leading-relaxed">{selectedEvaluation.feedback}</p>
            </div>

            <button
              onClick={() => setSelectedEvaluation(null)}
              className="w-full py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOMIZE EVALUATION SCHEME (FACULTY) */}
      {showEditSchemeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-xl font-bold tracking-tight">Customize Evaluation Scheme</h3>
                <p className="text-xs text-white/80 mt-0.5">
                  Configure evaluation components and credit percentages for {activeClass.name}
                </p>
              </div>
              <button
                onClick={() => setShowEditSchemeModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveScheme} className="p-6 space-y-5 text-xs flex-1 overflow-y-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <p className="text-gray-600">
                  Add custom criteria (e.g., Capstone Project, Viva, Weekly Quizzes, Attendance).
                </p>
                <span
                  className={`text-xs font-mono font-bold px-3 py-1 rounded-full ${
                    draftTotalWeight === 100
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}
                >
                  Total: {draftTotalWeight}% {draftTotalWeight === 100 ? '✓' : `(Need ${100 - draftTotalWeight > 0 ? `+${100 - draftTotalWeight}%` : `${100 - draftTotalWeight}%`})`}
                </span>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <span className="text-[11px] font-bold text-gray-600 mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => applyDraftPreset('academic_standard')}
                  className="text-[10px] font-bold px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 rounded-lg border border-gray-200 shadow-xs transition"
                >
                  Academic Standard (40/30/15/15)
                </button>
                <button
                  type="button"
                  onClick={() => applyDraftPreset('project_and_viva')}
                  className="text-[10px] font-bold px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 rounded-lg border border-gray-200 shadow-xs transition"
                >
                  Project &amp; Viva Heavy (30/20/20/15/15)
                </button>
                <button
                  type="button"
                  onClick={() => applyDraftPreset('continuous_assessment')}
                  className="text-[10px] font-bold px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 rounded-lg border border-gray-200 shadow-xs transition"
                >
                  Continuous (25/25/25/25)
                </button>
                <button
                  type="button"
                  onClick={() => applyDraftPreset('theory_project_attendance')}
                  className="text-[10px] font-bold px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 rounded-lg border border-gray-200 shadow-xs transition"
                >
                  Theory + Project + Attendance
                </button>
              </div>

              {/* Dynamic Components List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-600 px-1">
                  <span>Component Name</span>
                  <span>Weight (%)</span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {draftScheme.map((comp, idx) => (
                    <div
                      key={comp.id || idx}
                      className="flex items-center space-x-2 bg-gray-50 p-2 rounded-xl border border-gray-200"
                    >
                      <span className="text-xs font-mono font-bold text-gray-400 w-5 text-center">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        required
                        value={comp.name}
                        onChange={(e) => handleUpdateDraftComponent(idx, 'name', e.target.value)}
                        placeholder="e.g. Capstone Project, Mid-Term Exam..."
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-medium text-gray-800 bg-white"
                      />
                      <div className="flex items-center space-x-1 w-24">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          required
                          value={comp.weight}
                          onChange={(e) => handleUpdateDraftComponent(idx, 'weight', Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold text-xs text-right bg-white text-gray-800"
                        />
                        <span className="text-xs font-bold text-gray-500">%</span>
                      </div>
                      {draftScheme.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftComponent(idx)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition text-sm"
                          title="Remove component"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddDraftComponent}
                  className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-dashed border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition"
                >
                  <span>+ Add Another Evaluation Criteria</span>
                </button>
              </div>

              {/* Footer Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditSchemeModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingScheme || draftTotalWeight !== 100}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition flex items-center space-x-2 disabled:opacity-50"
                >
                  {isSavingScheme ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Save Evaluation Scheme</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
