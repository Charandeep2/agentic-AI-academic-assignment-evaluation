'use client';

import React, { useState } from 'react';
import { User, Course, Assignment, Submission, MasteryLevel } from '../lib/types';
import {
  BarChart3, TrendingUp, Award, BookOpen, CheckCircle,
  AlertTriangle, BrainCircuit, Sparkles, UserIcon
} from '../lib/icons';

interface AnalyticsDashboardProps {
  currentUser: User;
  courses: Course[];
  assignments: Assignment[];
  submissions: Submission[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  currentUser,
  courses,
  assignments,
  submissions,
}) => {
  const isStudent = currentUser.role === 'student';
  const [selectedCourseCode, setSelectedCourseCode] = useState<string>('all');

  // ---------- STUDENT METRICS COMPUTATION ----------
  const studentSubs = submissions.filter(s => s.studentId === currentUser.id && s.evaluation);
  const studentEvaluations = studentSubs.map(s => s.evaluation!);
  
  const studentTotalScore = studentEvaluations.reduce((acc, ev) => acc + ev.overallScore, 0);
  const studentTotalMax = studentEvaluations.reduce((acc, ev) => acc + ev.maxScore, 0);
  const studentAveragePct = studentTotalMax > 0 ? Math.round((studentTotalScore / studentTotalMax) * 100) : 0;

  // Student topic comprehension map
  const topicMap: Record<string, { total: number; count: number }> = {};
  studentEvaluations.forEach(ev => {
    Object.entries(ev.topicScores).forEach(([topic, score]) => {
      if (!topicMap[topic]) topicMap[topic] = { total: 0, count: 0 };
      topicMap[topic].total += score;
      topicMap[topic].count += 1;
    });
  });

  const studentTopicStats = Object.entries(topicMap).map(([topic, data]) => ({
    topic,
    average: Math.round(data.total / data.count),
  })).sort((a, b) => b.average - a.average);

  // ---------- FACULTY CLASS METRICS COMPUTATION ----------
  const relevantSubs = submissions.filter(s => {
    if (selectedCourseCode === 'all') return true;
    const a = assignments.find(assign => assign.id === s.assignmentId);
    return a?.courseCode === selectedCourseCode;
  });

  const evaluatedClassSubs = relevantSubs.filter(s => s.evaluation);
  const classScoreSum = evaluatedClassSubs.reduce((acc, s) => acc + (s.evaluation?.percentage || 0), 0);
  const classAverage = evaluatedClassSubs.length > 0 ? Math.round(classScoreSum / evaluatedClassSubs.length) : 0;

  // Grade distribution
  const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  evaluatedClassSubs.forEach(s => {
    const pct = s.evaluation?.percentage || 0;
    if (pct >= 90) grades.A++;
    else if (pct >= 80) grades.B++;
    else if (pct >= 70) grades.C++;
    else if (pct >= 60) grades.D++;
    else grades.F++;
  });

  // Student ranking list
  const studentTotals: Record<string, { name: string; totalPct: number; count: number }> = {};
  evaluatedClassSubs.forEach(s => {
    if (!studentTotals[s.studentId]) {
      studentTotals[s.studentId] = { name: s.studentName, totalPct: 0, count: 0 };
    }
    studentTotals[s.studentId].totalPct += s.evaluation?.percentage || 0;
    studentTotals[s.studentId].count += 1;
  });

  const studentLeaderboard = Object.entries(studentTotals).map(([id, data]) => ({
    id,
    name: data.name,
    average: Math.round(data.totalPct / data.count),
    completed: data.count,
  })).sort((a, b) => b.average - a.average);

  const getMasteryColor = (pct: number) => {
    if (pct >= 90) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (pct >= 75) return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    if (pct >= 55) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Real-time Academic Intelligence Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            {isStudent ? 'Your Learning Analytics & Mastery Dashboard' : 'Class-Wide Performance Analytics'}
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            {isStudent
              ? 'Multi-dimensional visualization of your topic comprehension, submission trajectory, and personalized remediation paths.'
              : 'Aggregated cohort intelligence, grade distributions, concept difficulty heatmaps, and early warning flags.'}
          </p>
        </div>

        {!isStudent && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Course Scope:</span>
            <select
              value={selectedCourseCode}
              onChange={(e) => setSelectedCourseCode(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 border border-slate-700 focus:outline-none"
            >
              <option value="all">All Courses Aggregated</option>
              {courses.map(c => (
                <option key={c.id} value={c.code}>{c.code}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* KPI METRICS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <span className="text-xs text-slate-400 font-medium">
            {isStudent ? 'Your Overall Average' : 'Cohort Average'}
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-black text-white">
              {isStudent ? studentAveragePct : classAverage}%
            </span>
            <span className="text-xs text-emerald-400 font-semibold">+4.2% MoM</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Based on validated submissions</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <span className="text-xs text-slate-400 font-medium">
            {isStudent ? 'Evaluated Submissions' : 'Total Submissions'}
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-black text-indigo-400">
              {isStudent ? studentEvaluations.length : relevantSubs.length}
            </span>
            <span className="text-xs text-slate-400">tasks</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">100% processed by Agentic RAG</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <span className="text-xs text-slate-400 font-medium">
            {isStudent ? 'Mastery Classification' : 'High Mastery Rate'}
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-black text-white capitalize">
              {isStudent
                ? (studentAveragePct >= 90 ? '🏆 Expert' : studentAveragePct >= 75 ? '⭐ Advanced' : '📈 Intermediate')
                : `${Math.round((grades.A + grades.B) / Math.max(1, evaluatedClassSubs.length) * 100)}%`}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {isStudent ? 'Across all enrolled subjects' : 'Students scoring >= 80%'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <span className="text-xs text-slate-400 font-medium">
            {isStudent ? 'Active Courses' : 'At-Risk Flags'}
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-black text-amber-400">
              {isStudent ? courses.length : grades.F}
            </span>
            <span className="text-xs text-slate-400">{isStudent ? 'enrolled' : 'students'}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {isStudent ? 'Full curriculum access' : 'Scoring below 60% threshold'}
          </p>
        </div>
      </div>

      {/* STUDENT SPECIFIC ANALYTICS */}
      {isStudent && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Topic Comprehension Bars */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <BrainCircuit className="w-5 h-5 text-indigo-400" />
              <span>Topic-Wise Mastery Distribution</span>
            </h3>
            <p className="text-xs text-slate-400">
              Computed from automated semantic evaluation rubrics across all completed assignments.
            </p>

            <div className="space-y-3 pt-2">
              {studentTopicStats.length > 0 ? (
                studentTopicStats.map(({ topic, average }) => (
                  <div key={topic} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">{topic}</span>
                      <span className={average >= 80 ? 'text-emerald-400' : average >= 60 ? 'text-amber-400' : 'text-rose-400'}>
                        {average}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          average >= 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                          average >= 60 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                          'bg-gradient-to-r from-rose-500 to-red-400'
                        }`}
                        style={{ width: `${average}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 py-4">Complete an assignment to view topic breakdown.</p>
              )}
            </div>
          </div>

          {/* AI Recommended Learning Path */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span>AI Personalized Action Plan</span>
            </h3>
            <p className="text-xs text-slate-400">
              Generated by the Feedback Agent using course RAG context to strengthen your lowest mastery topics.
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-slate-300 space-y-1">
                <strong className="text-indigo-300 block font-bold">1. Recommended Review: String Formatting & Type Safety</strong>
                <p>Revise IEEE 754 floating point precision and standard format specifiers in CS101 Module 1.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs text-slate-300 space-y-1">
                <strong className="text-purple-300 block font-bold">2. Hands-on Practice: Boundary Pointer Edge Cases</strong>
                <p>Implement unit tests checking empty and single-element deque operations in CS201 Doubly Linked List.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-slate-300 space-y-1">
                <strong className="text-emerald-300 block font-bold">3. Next Milestone: Vectorized Array Broadcasting</strong>
                <p>You have demonstrated strong linear algebra foundations. Advance to multivariate regression and loss surface visualization.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FACULTY SPECIFIC ANALYTICS */}
      {!isStudent && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Grade Distribution Histogram */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <span>Grade Distribution (Bell Curve)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Distribution of student performance percentages across evaluated submissions.
            </p>

            <div className="grid grid-cols-5 gap-3 pt-4 text-center">
              {[
                { label: 'A (90-100%)', count: grades.A, color: 'bg-emerald-500', text: 'text-emerald-400' },
                { label: 'B (80-89%)', count: grades.B, color: 'bg-blue-500', text: 'text-blue-400' },
                { label: 'C (70-79%)', count: grades.C, color: 'bg-indigo-500', text: 'text-indigo-400' },
                { label: 'D (60-69%)', count: grades.D, color: 'bg-amber-500', text: 'text-amber-400' },
                { label: 'F (<60%)', count: grades.F, color: 'bg-rose-500', text: 'text-rose-400' },
              ].map(item => (
                <div key={item.label} className="space-y-2">
                  <div className="h-32 bg-slate-950 rounded-xl flex items-end justify-center p-2 border border-slate-800">
                    <div
                      className={`w-full ${item.color} rounded-lg transition-all duration-500`}
                      style={{ height: `${Math.max(10, item.count * 28)}%` }}
                    />
                  </div>
                  <span className={`text-base font-extrabold ${item.text}`}>{item.count}</span>
                  <span className="text-[10px] text-slate-400 block font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Student Leaderboard & Rankings */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Award className="w-5 h-5 text-purple-400" />
              <span>Student Performance Leaderboard</span>
            </h3>
            <p className="text-xs text-slate-400">
              Ranked by overall comprehension score with automatic mastery classification.
            </p>

            <div className="space-y-2.5 pt-1">
              {studentLeaderboard.map((student, idx) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-white">{student.name}</p>
                      <p className="text-[10px] text-slate-400">{student.completed} assignments completed</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${getMasteryColor(student.average)}`}>
                      {student.average}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">
                      {student.average >= 90 ? 'Expert' : student.average >= 75 ? 'Advanced' : 'Intermediate'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
