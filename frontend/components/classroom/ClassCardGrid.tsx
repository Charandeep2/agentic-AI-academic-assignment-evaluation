'use client';

import React, { useState } from 'react';
import { EvaluationComponent, EVALUATION_PRESETS, getCourseEvaluationScheme } from '@/lib/evaluation';

interface ClassCardGridProps {
  classes: any[];
  assignments?: any[];
  currentUser: any;
  onSelectClass: (c: any) => void;
  onCreateClass: (data: any) => Promise<any>;
  onJoinClass: (code: string) => Promise<any>;
}

export const ClassCardGrid: React.FC<ClassCardGridProps> = ({
  classes,
  assignments = [],
  currentUser,
  onSelectClass,
  onCreateClass,
  onJoinClass,
}) => {
  const isFaculty = currentUser?.role === 'faculty';

  // Tab filter: Faculty has 'my_classes' vs 'all', Student has 'enrolled' vs 'explore'
  const [activeFilter, setActiveFilter] = useState<'primary' | 'all'>('primary');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Create class form state
  const [newClassName, setNewClassName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newSection, setNewSection] = useState('Section A • Fall 2026');
  const [newSubject, setNewSubject] = useState('Computer Science');
  const [newRoom, setNewRoom] = useState('Hall 301');
  const [newTheme, setNewTheme] = useState('blue');
  const [isCreating, setIsCreating] = useState(false);
  const [createSuccessCode, setCreateSuccessCode] = useState<string | null>(null);

  // Dynamic Course Credit & Evaluation Scheme state
  const [evalComponents, setEvalComponents] = useState<EvaluationComponent[]>([
    { id: 'end_term', name: 'End-Term Examination', weight: 40 },
    { id: 'mid_term', name: 'Mid-Term Examination', weight: 30 },
    { id: 'quizzes', name: 'Quizzes & Tests', weight: 15 },
    { id: 'labs', name: 'Labs & Practical Coursework', weight: 15 },
  ]);

  const totalWeight = evalComponents.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);

  const handleAddComponent = () => {
    setEvalComponents((prev) => [
      ...prev,
      {
        id: `eval-${Date.now()}`,
        name: 'Final Capstone Project',
        weight: 10,
      },
    ]);
  };

  const handleRemoveComponent = (idx: number) => {
    if (evalComponents.length <= 1) {
      alert('You must have at least one evaluation component.');
      return;
    }
    setEvalComponents((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateComponent = (idx: number, field: 'name' | 'weight', value: any) => {
    setEvalComponents((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const applyPresetScheme = (presetKey: string) => {
    if (EVALUATION_PRESETS[presetKey]) {
      setEvalComponents(EVALUATION_PRESETS[presetKey].map((c) => ({ ...c })));
    }
  };

  // Initial Syllabus Progress state
  const [currentTopicMilestone, setCurrentTopicMilestone] = useState('Unit 1: Core Fundamentals');
  const [completedModulesStr, setCompletedModulesStr] = useState('Unit 1: Foundations & Architecture');
  const [futureModulesStr, setFutureModulesStr] = useState('Unit 2: Intermediate Concepts, Unit 3: Scalability & Optimization');

  // Join class form state
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  // Copy feedback state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    if (totalWeight !== 100) {
      alert(`Course evaluation component weights must sum to 100%. Currently: ${totalWeight}%`);
      return;
    }

    setIsCreating(true);
    try {
      const gradingWeightsMap: Record<string, number> = {};
      evalComponents.forEach((c) => {
        gradingWeightsMap[c.id] = Number(c.weight) || 0;
      });
      // Legacy convenience aliases
      gradingWeightsMap.endTerm = evalComponents.find((c) => c.id === 'end_term' || c.name.toLowerCase().includes('end'))?.weight ?? 40;
      gradingWeightsMap.midTerm = evalComponents.find((c) => c.id === 'mid_term' || c.name.toLowerCase().includes('mid'))?.weight ?? 30;
      gradingWeightsMap.quizzes = evalComponents.find((c) => c.id === 'quizzes' || c.name.toLowerCase().includes('quiz'))?.weight ?? 15;
      gradingWeightsMap.labs = evalComponents.find((c) => c.id === 'labs' || c.name.toLowerCase().includes('lab') || c.name.toLowerCase().includes('coursework'))?.weight ?? 15;

      const created = await onCreateClass({
        name: newClassName.trim(),
        code: (newCourseCode || 'CS' + Math.floor(100 + Math.random() * 800)).toUpperCase().trim(),
        section: newSection.trim(),
        subject: newSubject.trim(),
        room: newRoom.trim(),
        colorTheme: newTheme,
        facultyId: currentUser.id,
        facultyName: currentUser.fullName,
        facultyEmail: currentUser.email,
        evaluationScheme: evalComponents.map((c) => ({
          id: c.id,
          name: c.name.trim(),
          weight: Number(c.weight) || 0,
        })),
        gradingWeights: gradingWeightsMap,
        syllabusProgress: {
          currentTopic: currentTopicMilestone.trim() || 'Unit 1: Fundamentals',
          completedModules: completedModulesStr.split(',').map((s) => s.trim()).filter(Boolean),
          futureModules: futureModulesStr.split(',').map((s) => s.trim()).filter(Boolean),
          lastUpdated: new Date().toISOString().split('T')[0],
        },
      });

      if (created?.classCode) {
        setCreateSuccessCode(created.classCode);
      } else {
        setShowCreateModal(false);
      }
      setNewClassName('');
      setNewCourseCode('');
    } catch (err: any) {
      alert(err.message || 'Failed to create classroom');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;

    setJoinError('');
    setJoinSuccess('');
    setIsJoining(true);

    try {
      const joined = await onJoinClass(joinCodeInput.trim());
      setJoinSuccess(`Enrolled in "${joined.name}"!`);
      setTimeout(() => {
        setShowJoinModal(false);
        setJoinCodeInput('');
        setJoinSuccess('');
      }, 1200);
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join class. Please check the code.');
    } finally {
      setIsJoining(false);
    }
  };

  const getThemeGradient = (theme: string) => {
    switch (theme) {
      case 'teal':
        return 'from-teal-600 via-teal-700 to-emerald-800';
      case 'purple':
        return 'from-purple-700 via-indigo-700 to-purple-900';
      case 'emerald':
        return 'from-emerald-600 via-teal-700 to-emerald-800';
      case 'rose':
        return 'from-rose-600 via-pink-700 to-rose-800';
      case 'amber':
        return 'from-amber-600 via-orange-600 to-amber-700';
      default:
        return 'from-blue-600 via-indigo-700 to-blue-800';
    }
  };

  // Determine classes to display (strict privacy: faculty only sees created, student only sees enrolled)
  const myClasses = classes.filter(
    (c) =>
      c.facultyId === currentUser?.id ||
      (c.facultyEmail && currentUser?.email && c.facultyEmail.toLowerCase() === currentUser.email.toLowerCase())
  );
  const enrolledClasses = classes.filter((c) =>
    (c.enrolledStudentIds || []).includes(currentUser?.id)
  );

  const displayedClasses = isFaculty ? myClasses : enrolledClasses;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {isFaculty ? 'My Teaching Classrooms' : 'My Enrolled Courses'}
            </h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                isFaculty ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isFaculty ? 'Instructor' : 'Student'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {isFaculty
              ? `Welcome back, ${currentUser.fullName}. Manage your active courses or create new classrooms for your students.`
              : `Welcome back, ${currentUser.fullName}. Access your coursework, stream announcements, and review Groq AI grades.`}
          </p>
        </div>

        {/* Action Controls: Badge & Create/Join Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700">
            {isFaculty
              ? `${myClasses.length} Active Classroom${myClasses.length === 1 ? '' : 's'}`
              : `${enrolledClasses.length} Enrolled Course${enrolledClasses.length === 1 ? '' : 's'}`}
          </div>

          {/* Create Class Button for Faculty */}
          {isFaculty && (
            <button
              onClick={() => {
                setShowCreateModal(true);
                setCreateSuccessCode(null);
              }}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Class</span>
            </button>
          )}

          {/* Join Class Button for Students */}
          {!isFaculty && (
            <button
              onClick={() => {
                setShowJoinModal(true);
                setJoinError('');
                setJoinSuccess('');
              }}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Join Class</span>
            </button>
          )}
        </div>
      </div>

      {/* Class Cards Grid */}
      {displayedClasses.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-12 text-center space-y-4 max-w-lg mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-bold">
            {isFaculty ? '👨‍🏫' : '🎓'}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              {isFaculty ? 'No Classrooms Created Yet' : 'No Enrolled Classes Found'}
            </h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {isFaculty
                ? 'Create your first classroom to begin posting assignments, lecture announcements, and managing Groq AI student evaluations.'
                : 'You have not joined any classes yet. Click "Join Class" and enter the 6-character class code given by your instructor.'}
            </p>
          </div>
          <div>
            {isFaculty ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition"
              >
                + Create Your First Class
              </button>
            ) : (
              <button
                onClick={() => setShowJoinModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition"
              >
                + Join a Class with Code
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedClasses.map((c) => {
            // Find real upcoming assignment for this class
            const classAssignments = assignments.filter((a) => a.classId === c.id);
            const nextAssignment = classAssignments[0];
            const isStudentEnrolled = c.enrolledStudentIds?.includes(currentUser.id);
            const isFacultyOwner = c.facultyId === currentUser.id;

            return (
              <div
                key={c.id}
                onClick={() => onSelectClass(c)}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer flex flex-col group relative"
              >
                {/* Colorful Class Header Banner */}
                <div className={`p-5 bg-gradient-to-r ${getThemeGradient(c.colorTheme)} text-white relative`}>
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5 pr-6">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded backdrop-blur-sm">
                        {c.code}
                      </span>
                      <h2 className="text-lg font-bold tracking-tight group-hover:underline truncate mt-1">
                        {c.name}
                      </h2>
                      <p className="text-xs text-white/80 font-medium truncate">{c.section}</p>
                    </div>

                    {/* Class Code Pill with Copy functionality */}
                    <button
                      type="button"
                      onClick={(e) => handleCopyCode(c.classCode, e)}
                      title="Copy Class Code"
                      className="flex items-center space-x-1 text-[11px] px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/30 border border-white/20 text-white font-mono transition backdrop-blur-sm"
                    >
                      <span>{c.classCode}</span>
                      <svg className="w-3.5 h-3.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {copiedCode === c.classCode ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        )}
                      </svg>
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-white/90">
                    <span className="font-medium truncate max-w-[180px]">
                      {c.facultyName || 'Instructor'}
                    </span>
                    {copiedCode === c.classCode && (
                      <span className="text-[10px] bg-emerald-400 text-gray-900 font-bold px-1.5 py-0.5 rounded animate-pulse">
                        Code Copied!
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body with Real Dynamic Coursework */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Upcoming Coursework
                    </p>
                    {nextAssignment ? (
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100/70 transition flex items-center justify-between">
                        <div className="truncate pr-2">
                          <p className="text-xs font-semibold text-gray-800 truncate">
                            {nextAssignment.title}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            Due {nextAssignment.dueDate || 'Soon'} • {nextAssignment.points || 100} pts
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex-shrink-0">
                          Active
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-400 text-xs italic">
                        No upcoming assignments due soon
                      </div>
                    )}
                  </div>

                  {/* Course Credit Weights & Syllabus Progress Milestone Badges */}
                  <div className="pt-2 border-t border-gray-100 space-y-1.5 text-[10px]">
                    <div className="flex items-center justify-between text-gray-600 bg-gray-50 px-2 py-1 rounded-lg overflow-hidden">
                      <span className="font-semibold text-gray-700 flex items-center space-x-1 truncate">
                        <span>⚖️ Scheme:</span>
                        <span className="font-mono text-gray-800 truncate">
                          {getCourseEvaluationScheme(c)
                            .map((comp) => `${comp.weight}% ${comp.name.split(' ')[0]}`)
                            .join(' • ')}
                        </span>
                      </span>
                    </div>
                    {c.syllabusProgress?.currentTopic && (
                      <div className="flex items-center space-x-1 text-emerald-800 bg-emerald-50/70 border border-emerald-100 px-2 py-0.5 rounded-lg truncate">
                        <span className="font-bold flex-shrink-0">📚 Covered to:</span>
                        <span className="truncate font-semibold">{c.syllabusProgress.currentTopic}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Enrolled Students Count & Access Action */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-gray-500 text-xs">
                    <span className="font-medium text-gray-600 flex items-center space-x-1.5">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span>{(c.enrolledStudentIds || []).length} Students</span>
                    </span>

                    {!isFaculty && !isStudentEnrolled ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onJoinClass(c.classCode);
                        }}
                        className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-200 transition"
                      >
                        Join Class
                      </button>
                    ) : (
                      <span className="font-bold text-emerald-700 flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                        <span>Open Class</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: CREATE CLASSROOM (FACULTY) */}
      {/* ==================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-xl font-bold tracking-tight">Create Classroom</h3>
                <p className="text-xs text-white/80 mt-0.5">
                  Set up course details, syllabus progress, and AI evaluation credit criteria
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {createSuccessCode ? (
              /* Success confirmation with copy code */
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Classroom Created!</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Share this Class Code with your students so they can join:
                  </p>
                </div>
                <div className="bg-gray-100 p-4 rounded-2xl border border-gray-200 flex items-center justify-center space-x-3">
                  <span className="font-mono text-2xl font-black text-emerald-800 tracking-wider">
                    {createSuccessCode}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createSuccessCode);
                      setCopiedCode(createSuccessCode);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
                  >
                    {copiedCode === createSuccessCode ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateSuccessCode(null);
                  }}
                  className="w-full py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleCreateSubmit} className="p-6 space-y-5 text-xs flex-1 overflow-y-auto">
                {/* 1. Basic Course Details */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center space-x-1.5 border-b border-gray-100 pb-1.5">
                    <span>1. Course Information</span>
                  </h4>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Class Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder="e.g. Data Structures & Algorithms or Machine Learning"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 text-sm font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Course Code</label>
                      <input
                        type="text"
                        value={newCourseCode}
                        onChange={(e) => setNewCourseCode(e.target.value)}
                        placeholder="e.g. CS201"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Section</label>
                      <input
                        type="text"
                        value={newSection}
                        onChange={(e) => setNewSection(e.target.value)}
                        placeholder="e.g. Section B • Fall 2026"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Subject</label>
                      <input
                        type="text"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        placeholder="e.g. Computer Science"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Room</label>
                      <input
                        type="text"
                        value={newRoom}
                        onChange={(e) => setNewRoom(e.target.value)}
                        placeholder="e.g. Hall 401 or Online"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 text-sm"
                      />
                    </div>
                  </div>

                  {/* Color Theme Picker */}
                  <div>
                    <label className="block text-gray-700 font-bold mb-1.5">Class Header Theme</label>
                    <div className="flex space-x-3">
                      {[
                        { id: 'blue', color: 'bg-blue-600' },
                        { id: 'teal', color: 'bg-teal-600' },
                        { id: 'purple', color: 'bg-purple-700' },
                        { id: 'emerald', color: 'bg-emerald-600' },
                        { id: 'rose', color: 'bg-rose-600' },
                        { id: 'amber', color: 'bg-amber-600' },
                      ].map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setNewTheme(theme.id)}
                          className={`w-7 h-7 rounded-full ${theme.color} ring-offset-2 transition-all ${
                            newTheme === theme.id ? 'ring-2 ring-gray-900 scale-110' : 'opacity-80 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Dynamic Course Credit & Evaluation Scheme */}
                <div className="space-y-3 pt-3 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center space-x-1.5">
                        <span>⚖️ 2. Dynamic Course Credit &amp; Evaluation Scheme</span>
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Add, remove, or customize evaluation categories. Groq AI will evaluate and weight student standing according to this criteria.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full ${
                        totalWeight === 100
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}>
                        Total: {totalWeight}% {totalWeight === 100 ? '✓' : `(Need ${100 - totalWeight > 0 ? `+${100 - totalWeight}%` : `${100 - totalWeight}%`})`}
                      </span>
                    </div>
                  </div>

                  {/* Presets */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                    <span className="text-[11px] font-bold text-gray-600 mr-1">Quick Presets:</span>
                    <button
                      type="button"
                      onClick={() => applyPresetScheme('academic_standard')}
                      className="text-[10px] font-bold px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 rounded-lg border border-gray-200 shadow-xs transition"
                    >
                      Academic Standard (40/30/15/15)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetScheme('project_and_viva')}
                      className="text-[10px] font-bold px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 rounded-lg border border-gray-200 shadow-xs transition"
                    >
                      Project &amp; Viva Heavy (30/20/20/15/15)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetScheme('continuous_assessment')}
                      className="text-[10px] font-bold px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 rounded-lg border border-gray-200 shadow-xs transition"
                    >
                      Continuous (25/25/25/25)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetScheme('theory_project_attendance')}
                      className="text-[10px] font-bold px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 rounded-lg border border-gray-200 shadow-xs transition"
                    >
                      Theory + Project + Attendance
                    </button>
                  </div>

                  {/* Dynamic Evaluation Component Rows */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-600 px-1">
                      <span>Evaluation Components ({evalComponents.length})</span>
                      <span>Weight (%)</span>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {evalComponents.map((comp, idx) => (
                        <div
                          key={comp.id || idx}
                          className="flex items-center space-x-2 bg-gray-50 hover:bg-gray-100/80 p-2 rounded-xl border border-gray-200 transition"
                        >
                          <span className="text-xs font-mono font-bold text-gray-400 w-5 text-center">
                            {idx + 1}.
                          </span>
                          <input
                            type="text"
                            required
                            value={comp.name}
                            onChange={(e) => handleUpdateComponent(idx, 'name', e.target.value)}
                            placeholder="e.g. End-Term Exam, Project, Viva, Quiz..."
                            className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-medium text-gray-800 bg-white"
                          />
                          <div className="flex items-center space-x-1 w-24">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              required
                              value={comp.weight}
                              onChange={(e) => handleUpdateComponent(idx, 'weight', Number(e.target.value))}
                              className="w-full px-2 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold text-xs text-right bg-white text-gray-800"
                            />
                            <span className="text-xs font-bold text-gray-500">%</span>
                          </div>
                          {evalComponents.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveComponent(idx)}
                              title="Delete component"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition text-sm"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add Evaluation Component Button */}
                    <button
                      type="button"
                      onClick={handleAddComponent}
                      className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-dashed border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition"
                    >
                      <span>+ Add Another Evaluation Component</span>
                      <span className="text-[10px] text-emerald-600 font-normal">
                        (e.g., Final Capstone, Oral Viva, Attendance, Case Studies)
                      </span>
                    </button>
                  </div>
                </div>

                {/* 3. Syllabus Progress & AI Assessment Boundary */}
                <div className="space-y-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center space-x-1.5">
                        <span>📚 3. Syllabus Milestone &amp; AI Quiz Boundary</span>
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Defines how far the class has progressed. AI strictly limits quiz questions up to this portion.
                      </p>
                    </div>
                  </div>

                  <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 space-y-1">
                    <p className="text-[11px] font-bold text-emerald-900 flex items-center space-x-1">
                      <span>🤖 Agentic Syllabus Boundary Guarantee:</span>
                    </p>
                    <p className="text-[10px] text-emerald-800 leading-relaxed">
                      The AI quiz generator and evaluation agent will strictly test students only on concepts covered up to your milestone. It will never ask un-taught future curriculum topics.
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Portion / Topic Covered to Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={currentTopicMilestone}
                      onChange={(e) => setCurrentTopicMilestone(e.target.value)}
                      placeholder="e.g. Unit 2: Linear Data Structures (up to Linked Lists)"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 text-sm font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">
                        Completed Modules (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={completedModulesStr}
                        onChange={(e) => setCompletedModulesStr(e.target.value)}
                        placeholder="e.g. Unit 1: Foundations, Unit 2: Arrays & Lists"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">
                        Future Modules (Not Yet Taught)
                      </label>
                      <input
                        type="text"
                        value={futureModulesStr}
                        onChange={(e) => setFutureModulesStr(e.target.value)}
                        placeholder="e.g. Unit 3: Trees, Unit 4: Graphs, Unit 5: DP"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-3 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || totalWeight !== 100}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition flex items-center space-x-2 disabled:opacity-50"
                  >
                    {isCreating ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Create Classroom</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: JOIN CLASSROOM (STUDENT) */}
      {/* ==================================================== */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold tracking-tight">Join Classroom</h3>
                <p className="text-xs text-white/80 mt-0.5">
                  Enter the code provided by your instructor
                </p>
              </div>
              <button
                onClick={() => setShowJoinModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleJoinSubmit} className="p-6 space-y-4 text-xs">
              {/* Current user confirmation */}
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex items-center space-x-3">
                <img
                  src={currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.fullName)}`}
                  alt={currentUser.fullName}
                  className="w-9 h-9 rounded-full"
                />
                <div className="truncate">
                  <p className="font-bold text-gray-900 truncate">You are joining as {currentUser.fullName}</p>
                  <p className="text-[10px] text-gray-500 truncate">{currentUser.email}</p>
                </div>
              </div>

              {joinError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium text-center">
                  {joinError}
                </div>
              )}

              {joinSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium text-center">
                  {joinSuccess}
                </div>
              )}

              <div>
                <label className="block text-gray-700 font-bold mb-1">Class Code</label>
                <input
                  type="text"
                  required
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                  placeholder="e.g. py-7x9q or cs-4k2w"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 text-sm font-mono uppercase"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Ask your teacher for the class code, then enter it here. Class codes use letters and numbers without spaces.
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isJoining}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition flex items-center space-x-2"
                >
                  {isJoining ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Join Class</span>
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
