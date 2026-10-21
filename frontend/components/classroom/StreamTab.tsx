'use client';

import React, { useState } from 'react';
import { QuizModal } from './QuizModal';
import { getCourseEvaluationScheme } from '@/lib/evaluation';

interface StreamTabProps {
  activeClass: any;
  announcements: any[];
  assignments: any[];
  materials?: any[];
  quizzes?: any[];
  currentUser: any;
  onPostAnnouncement: (content: string) => void;
  onAddComment: (announcementId: string, comment: string) => void;
  onPostMaterial?: (materialData: any) => Promise<any>;
  onCreateAssignment?: (assignmentData: any) => Promise<any>;
  onCreateQuiz?: (quizData: any) => Promise<any>;
  onSubmitQuiz?: (submissionData: any) => Promise<any>;
  onNavigateToTab?: (tab: 'stream' | 'classwork' | 'people' | 'grades', itemId?: string) => void;
}

export const StreamTab: React.FC<StreamTabProps> = ({
  activeClass,
  announcements,
  assignments,
  materials = [],
  quizzes = [],
  currentUser,
  onPostAnnouncement,
  onAddComment,
  onPostMaterial,
  onCreateAssignment,
  onCreateQuiz,
  onSubmitQuiz,
  onNavigateToTab,
}) => {
  const isFaculty = currentUser.role === 'faculty';

  // Quick announcement state
  const [announcementText, setAnnouncementText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Modals triggered from Stream
  const [showSyllabusModal, setShowSyllabusModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);

  // Selected item modal on stream
  const [readingMaterial, setReadingMaterial] = useState<any | null>(null);
  const [takingQuiz, setTakingQuiz] = useState<any | null>(null);

  // Syllabus Modal Fields
  const [sylType, setSylType] = useState<'syllabus' | 'notes' | 'reference'>('syllabus');
  const [sylTitle, setSylTitle] = useState(`${activeClass.code} Course Syllabus`);
  const [sylTopic, setSylTopic] = useState('Course Overview');
  const [sylContent, setSylContent] = useState('');
  const [sylFileName, setSylFileName] = useState('syllabus.md');
  const [isPostingSyl, setIsPostingSyl] = useState(false);

  // Assignment Modal Fields
  const courseScheme = getCourseEvaluationScheme(activeClass);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignTopic, setAssignTopic] = useState('Unit 1: Fundamentals');
  const [assignEvalCategory, setAssignEvalCategory] = useState(courseScheme[0]?.name || 'Coursework');
  const [assignType, setAssignType] = useState<'theory' | 'code' | 'hybrid'>('theory');
  const [assignInstructions, setAssignInstructions] = useState('');
  const [assignPoints, setAssignPoints] = useState(100);
  const [assignDueDate, setAssignDueDate] = useState('2026-11-20');
  const [assignTopics, setAssignTopics] = useState('Conceptual Depth, Trade-offs, Core Definitions');
  const [assignRefDocTitle, setAssignRefDocTitle] = useState('');
  const [assignRefDocContent, setAssignRefDocContent] = useState('');
  const [assignRefDocFileName, setAssignRefDocFileName] = useState('');
  const [hasRefDoc, setHasRefDoc] = useState(false);
  const [isCreatingAssign, setIsCreatingAssign] = useState(false);
  const [isGeneratingRubric, setIsGeneratingRubric] = useState(false);
  const [generatedRubric, setGeneratedRubric] = useState<any | null>(null);

  const classAnnouncements = announcements.filter((a) => a.classId === activeClass.id);
  const classAssignments = assignments.filter((a) => a.classId === activeClass.id);
  const classMaterials = materials.filter((m) => m.classId === activeClass.id);
  const classQuizzes = quizzes.filter((q) => q.classId === activeClass.id);

  const getThemeGradient = (theme: string) => {
    switch (theme) {
      case 'teal':
        return 'from-teal-700 via-teal-600 to-emerald-800';
      case 'purple':
        return 'from-purple-800 via-indigo-700 to-purple-900';
      default:
        return 'from-blue-700 via-indigo-600 to-blue-900';
    }
  };

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    onPostAnnouncement(announcementText);
    setAnnouncementText('');
    setIsPosting(false);
  };

  const handleCommentSubmit = (announcementId: string, e: React.FormEvent) => {
    e.preventDefault();
    const comment = commentInputs[announcementId];
    if (!comment || !comment.trim()) return;
    onAddComment(announcementId, comment);
    setCommentInputs((prev) => ({ ...prev, [announcementId]: '' }));
  };

  // Syllabus file reader
  const handleSylFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSylFileName(file.name);
    if (!sylTitle) setSylTitle(file.name.replace(/\.[^/.]+$/, ''));
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') setSylContent(text);
    };
    reader.readAsText(file);
  };

  // Reference doc file reader in assignment
  const handleRefDocFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAssignRefDocFileName(file.name);
    if (!assignRefDocTitle) setAssignRefDocTitle(file.name.replace(/\.[^/.]+$/, ''));
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') setAssignRefDocContent(text);
    };
    reader.readAsText(file);
  };

  // Post Syllabus from Stream
  const handleSylSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sylTitle.trim() || !sylContent.trim()) return;

    setIsPostingSyl(true);
    try {
      if (onPostMaterial) {
        await onPostMaterial({
          classId: activeClass.id,
          type: sylType,
          title: sylTitle.trim(),
          topic: sylTopic.trim(),
          description: `Posted directly from Stream by ${currentUser.fullName}`,
          content: sylContent.trim(),
          fileName: sylFileName,
          authorId: currentUser.id,
          authorName: currentUser.fullName,
        });
      }
      setShowSyllabusModal(false);
      setSylContent('');
    } catch (err) {
      console.error('Failed to post syllabus from stream:', err);
    } finally {
      setIsPostingSyl(false);
    }
  };

  // Generate Rubric for Assignment
  const handleGenerateRubric = async () => {
    if (!assignTitle.trim() && !assignInstructions.trim()) {
      alert('Please enter an assignment title or instructions first!');
      return;
    }
    setIsGeneratingRubric(true);
    try {
      const res = await fetch('/api/ai/rubric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: assignTitle.trim(),
          instructions: assignInstructions.trim(),
          assignmentType: assignType,
          classId: activeClass.id,
          maxPoints: Number(assignPoints) || 100,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.rubric) {
          setGeneratedRubric(data.rubric);
          if (data.rubric.topicTags && data.rubric.topicTags.length > 0) {
            setAssignTopics(data.rubric.topicTags.join(', '));
          }
        }
      }
    } catch (err) {
      console.error('Rubric gen error:', err);
    } finally {
      setIsGeneratingRubric(false);
    }
  };

  // Create Assignment from Stream
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTitle.trim()) return;

    setIsCreatingAssign(true);
    try {
      if (onCreateAssignment) {
        const refDoc = hasRefDoc && assignRefDocTitle.trim()
          ? {
              title: assignRefDocTitle.trim(),
              fileName: assignRefDocFileName || 'reference_reading.md',
              content: assignRefDocContent.trim(),
            }
          : null;

        await onCreateAssignment({
          classId: activeClass.id,
          title: assignTitle.trim(),
          topic: assignTopic.trim(),
          assignmentType: assignType,
          submissionFormat: assignType,
          instructions: assignInstructions.trim(),
          points: Number(assignPoints) || 100,
          dueDate: assignDueDate,
          topics: assignTopics.split(',').map((t) => t.trim()).filter(Boolean),
          rubricCriteria: generatedRubric,
          referenceDoc: refDoc,
          evaluationCategory: assignEvalCategory,
        });
      }
      setShowAssignmentModal(false);
      setAssignTitle('');
      setAssignInstructions('');
      setAssignRefDocContent('');
      setGeneratedRubric(null);
    } catch (err) {
      console.error('Failed to create assignment from stream:', err);
    } finally {
      setIsCreatingAssign(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Class Hero Banner */}
      <div
        className={`rounded-3xl p-8 bg-gradient-to-r ${getThemeGradient(
          activeClass.colorTheme
        )} text-white shadow-md relative overflow-hidden`}
      >
        <div className="relative z-10 space-y-2">
          <span className="text-xs uppercase tracking-wider font-bold bg-white/20 px-3 py-1 rounded-full inline-block backdrop-blur-sm">
            {activeClass.code}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{activeClass.name}</h1>
          <p className="text-sm text-white/90 font-medium">
            {activeClass.section} • {activeClass.room}
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-white/20 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-white/80 font-medium">Class code:</span>
            <span className="font-mono bg-white/20 px-2 py-0.5 rounded font-bold">{activeClass.classCode}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-white/80">Instructor:</span>
            <span className="font-bold">{activeClass.facultyName}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Sidebar & Right Feed */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Quick Stats & Upcoming Work */}
        <div className="md:col-span-4 space-y-4">
          {/* Quick Nav Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">Class Highlights</h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                Active
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div
                onClick={() => onNavigateToTab && onNavigateToTab('classwork')}
                className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 cursor-pointer hover:bg-indigo-100/70 transition"
              >
                <span className="text-base block">📜</span>
                <span className="text-sm font-extrabold text-indigo-900 block mt-0.5">{classMaterials.length}</span>
                <span className="text-[10px] text-indigo-700 font-medium">Materials</span>
              </div>

              <div
                onClick={() => onNavigateToTab && onNavigateToTab('classwork')}
                className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 cursor-pointer hover:bg-emerald-100/70 transition"
              >
                <span className="text-base block">📝</span>
                <span className="text-sm font-extrabold text-emerald-900 block mt-0.5">{classAssignments.length}</span>
                <span className="text-[10px] text-emerald-700 font-medium">Tasks</span>
              </div>

              <div
                onClick={() => onNavigateToTab && onNavigateToTab('classwork')}
                className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100 cursor-pointer hover:bg-amber-100/70 transition"
              >
                <span className="text-base block">💡</span>
                <span className="text-sm font-extrabold text-amber-900 block mt-0.5">{classQuizzes.length}</span>
                <span className="text-[10px] text-amber-700 font-medium">Quizzes</span>
              </div>
            </div>
          </div>

          {/* Upcoming Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">Upcoming Due Dates</h3>
            {classAssignments.length > 0 ? (
              <div className="space-y-3">
                {classAssignments.slice(0, 3).map((a) => (
                  <div key={a.id} className="text-xs space-y-0.5 border-b border-gray-100 pb-2 last:border-none">
                    <p className="font-bold text-gray-900 truncate">{a.title}</p>
                    <p className="text-[11px] text-gray-500">Due {a.dueDate}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Woohoo, no work due soon!</p>
            )}
          </div>
        </div>

        {/* Right Column: Faculty Action Bar & Feed */}
        <div className="md:col-span-8 space-y-5">
          {/* ============================================================== */}
          {/* FACULTY CLASSROOM QUICK-ACTION BAR (REQUESTED BY USER) */}
          {/* ============================================================== */}
          {isFaculty && (
            <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    ✨
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
                      Quick Share to Classroom Stream
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Post syllabus, assignments, conduct quizzes, or make class announcements
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Faculty Controls
                </span>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. Post Syllabus */}
                <button
                  type="button"
                  onClick={() => setShowSyllabusModal(true)}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200/80 text-indigo-900 transition-all hover:shadow-md active:scale-95 group text-center"
                >
                  <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">📜</span>
                  <span className="text-xs font-bold">Post Syllabus</span>
                  <span className="text-[10px] text-indigo-600/90 font-medium mt-0.5">Course Outline</span>
                </button>

                {/* 2. Post Assignment */}
                <button
                  type="button"
                  onClick={() => setShowAssignmentModal(true)}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-900 transition-all hover:shadow-md active:scale-95 group text-center"
                >
                  <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">📝</span>
                  <span className="text-xs font-bold">Post Assignment</span>
                  <span className="text-[10px] text-emerald-600/90 font-medium mt-0.5">With Reference Docs</span>
                </button>

                {/* 3. Conduct Quiz */}
                <button
                  type="button"
                  onClick={() => setShowQuizModal(true)}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-50/70 hover:bg-amber-100 border border-amber-200/80 text-amber-900 transition-all hover:shadow-md active:scale-95 group text-center"
                >
                  <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">💡</span>
                  <span className="text-xs font-bold">Conduct Quiz</span>
                  <span className="text-[10px] text-amber-600/90 font-medium mt-0.5">AI MCQs &amp; Auto-grade</span>
                </button>

                {/* 4. Announce */}
                <button
                  type="button"
                  onClick={() => setIsPosting(true)}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition-all hover:shadow-md active:scale-95 group text-center"
                >
                  <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">📢</span>
                  <span className="text-xs font-bold">Announcement</span>
                  <span className="text-[10px] text-slate-500 font-medium mt-0.5">Class Discussion</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Announcement Box */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            {!isPosting ? (
              <div
                onClick={() => setIsPosting(true)}
                className="flex items-center space-x-3 cursor-pointer py-1"
              >
                <img src={currentUser.avatar} alt={currentUser.fullName} className="w-9 h-9 rounded-full" />
                <span className="text-xs text-gray-500 hover:text-gray-700">
                  Announce something to your class...
                </span>
              </div>
            ) : (
              <form onSubmit={handlePost} className="space-y-3">
                <textarea
                  rows={3}
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="Announce something to your class..."
                  className="w-full text-xs text-gray-800 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  autoFocus
                />
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsPosting(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!announcementText.trim()}
                    className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition disabled:opacity-50"
                  >
                    Post to Stream
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Stream Announcements Feed */}
          <div className="space-y-4">
            {classAnnouncements.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center space-y-2">
                <p className="text-xs font-bold text-gray-700">No Announcements Yet</p>
                <p className="text-[11px] text-gray-400">This is where you can talk to your class.</p>
              </div>
            ) : (
              classAnnouncements.map((ann) => {
                const isSylAnnouncement =
                  ann.content.includes('📚 Posted new') || ann.content.toLowerCase().includes('syllabus');
                const isAssignAnnouncement =
                  ann.content.includes('📢 New') || ann.type === 'assignment';
                const isQuizAnnouncement =
                  ann.content.includes('💡 New Quiz') || ann.type === 'quiz';

                return (
                  <div
                    key={ann.id}
                    className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3.5 hover:border-gray-300 transition"
                  >
                    {/* Author Info */}
                    <div className="flex items-center space-x-3">
                      <img src={ann.authorAvatar} alt={ann.authorName} className="w-9 h-9 rounded-full" />
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">{ann.authorName}</h4>
                        <p className="text-[10px] text-gray-400">{ann.createdAt}</p>
                      </div>
                    </div>

                    {/* Body Content */}
                    <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">{ann.content}</p>

                    {/* INTERACTIVE CARDS EMBEDDED IN STREAM */}
                    {isSylAnnouncement && classMaterials.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between gap-3">
                        <div className="flex items-center space-x-2.5 truncate">
                          <span className="text-xl">📜</span>
                          <div className="truncate">
                            <span className="text-xs font-bold text-indigo-900 block truncate">
                              Course Syllabus &amp; Lecture Reference Notes
                            </span>
                            <span className="text-[10px] text-indigo-700 font-medium">
                              Ingested into RAG knowledge base
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (onNavigateToTab) onNavigateToTab('classwork');
                          }}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex-shrink-0 shadow-sm transition"
                        >
                          View Document
                        </button>
                      </div>
                    )}

                    {isAssignAnnouncement && (
                      <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-3">
                        <div className="flex items-center space-x-2.5 truncate">
                          <span className="text-xl">📝</span>
                          <div className="truncate">
                            <span className="text-xs font-bold text-emerald-950 block truncate">
                              Assignment &amp; Reference Study Materials
                            </span>
                            <span className="text-[10px] text-emerald-700 font-medium">
                              AI Evaluator with Teacher Grace Marks
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (onNavigateToTab) onNavigateToTab('classwork');
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex-shrink-0 shadow-sm transition"
                        >
                          Open Task
                        </button>
                      </div>
                    )}

                    {isQuizAnnouncement && (
                      <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between gap-3">
                        <div className="flex items-center space-x-2.5 truncate">
                          <span className="text-xl">💡</span>
                          <div className="truncate">
                            <span className="text-xs font-bold text-amber-950 block truncate">
                              Interactive Class Quiz Available
                            </span>
                            <span className="text-[10px] text-amber-700 font-medium">
                              Instant AI Scoring &amp; Explanations
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const found = classQuizzes[0];
                            if (found) setTakingQuiz(found);
                            else if (onNavigateToTab) onNavigateToTab('classwork');
                          }}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold flex-shrink-0 shadow-sm transition"
                        >
                          {isFaculty ? 'View Quiz' : 'Take Quiz'}
                        </button>
                      </div>
                    )}

                    {/* Comments Section */}
                    <div className="pt-3 border-t border-gray-100 space-y-2.5">
                      {ann.comments && ann.comments.length > 0 && (
                        <div className="space-y-2">
                          {ann.comments.map((comm: any) => (
                            <div key={comm.id} className="flex items-start space-x-2.5 text-xs">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
                              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex-1">
                                <span className="font-bold text-gray-900 text-[11px] block">{comm.authorName}</span>
                                <span className="text-gray-700 text-xs">{comm.content}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Class Comment */}
                      <form
                        onSubmit={(e) => handleCommentSubmit(ann.id, e)}
                        className="flex items-center space-x-2 pt-1"
                      >
                        <input
                          type="text"
                          value={commentInputs[ann.id] || ''}
                          onChange={(e) =>
                            setCommentInputs({ ...commentInputs, [ann.id]: e.target.value })
                          }
                          placeholder="Add class comment..."
                          className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                          type="submit"
                          disabled={!commentInputs[ann.id]?.trim()}
                          className="text-xs font-semibold px-3 py-2 bg-emerald-600 text-white rounded-xl disabled:opacity-40 hover:bg-emerald-700 transition"
                        >
                          Send
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: POST SYLLABUS DIRECTLY FROM STREAM (FACULTY) */}
      {/* ============================================================== */}
      {showSyllabusModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 flex items-center space-x-2">
                  <span>📜</span>
                  <span>Post Syllabus / Notes to Stream</span>
                </h3>
                <p className="text-[11px] text-gray-500">
                  Broadcasts official syllabus to the stream and saves to course materials
                </p>
              </div>
              <button onClick={() => setShowSyllabusModal(false)} className="text-gray-400 hover:text-gray-700 text-base">
                ✕
              </button>
            </div>

            <form onSubmit={handleSylSubmit} className="space-y-3.5">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Document Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'syllabus', label: 'Syllabus' },
                    { id: 'notes', label: 'Lecture Notes' },
                    { id: 'reference', label: 'Reference' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSylType(t.id as any)}
                      className={`p-2 rounded-xl border text-center transition ${
                        sylType === t.id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  value={sylTitle}
                  onChange={(e) => setSylTitle(e.target.value)}
                  placeholder="e.g. CS101 Official Course Syllabus & Policies"
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Upload File (.md, .txt)</label>
                <input
                  type="file"
                  accept=".md,.txt"
                  onChange={handleSylFileUpload}
                  className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Content / Markdown Outline *</label>
                <textarea
                  rows={6}
                  required
                  value={sylContent}
                  onChange={(e) => setSylContent(e.target.value)}
                  placeholder="# Course Syllabus Outline&#10;&#10;## Modules:&#10;1. Foundations&#10;2. Architecture..."
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowSyllabusModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPostingSyl}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm transition disabled:opacity-50"
                >
                  {isPostingSyl ? 'Publishing...' : 'Publish to Stream'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: POST ASSIGNMENT WITH REFERENCE DOC DIRECTLY FROM STREAM */}
      {/* ============================================================== */}
      {showAssignmentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-xs animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 flex items-center space-x-2">
                  <span>📝</span>
                  <span>Post Assignment with Reference Materials</span>
                </h3>
                <p className="text-[11px] text-gray-500">
                  Attach reference reading docs &amp; auto-generate AI rubric criteria
                </p>
              </div>
              <button onClick={() => setShowAssignmentModal(false)} className="text-gray-400 hover:text-gray-700 text-base">
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-3.5">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Assignment Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'theory', icon: '📖', label: 'Theoretical Essay' },
                    { id: 'code', icon: '💻', label: 'Coding Lab' },
                    { id: 'hybrid', icon: '🔬', label: 'Hybrid Task' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAssignType(t.id as any)}
                      className={`p-2 rounded-xl border text-center transition ${
                        assignType === t.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      <span className="block text-base">{t.icon}</span>
                      <span className="text-[11px] block">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={assignTitle}
                    onChange={(e) => setAssignTitle(e.target.value)}
                    placeholder="e.g. Distributed Consensus & Raft Invariants"
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Course Evaluation Category *</label>
                  <select
                    value={assignEvalCategory}
                    onChange={(e) => setAssignEvalCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {courseScheme.map((comp) => (
                      <option key={comp.id} value={comp.name}>
                        {comp.name} ({comp.weight}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Instructions / Requirements</label>
                <textarea
                  rows={3}
                  value={assignInstructions}
                  onChange={(e) => setAssignInstructions(e.target.value)}
                  placeholder="Describe the task questions or implementation constraints..."
                  className="w-full border border-gray-300 rounded-xl p-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* ATTACH REFERENCE DOCUMENT SECTION */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">📖</span>
                    <span className="font-bold text-gray-800 text-xs">Attach Reference Document / Reading Guide</span>
                  </div>
                  <input
                    type="checkbox"
                    id="refdoc-toggle"
                    checked={hasRefDoc}
                    onChange={(e) => setHasRefDoc(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                </div>

                {hasRefDoc && (
                  <div className="space-y-2 pt-2 border-t border-slate-200 animate-fadeIn">
                    <input
                      type="text"
                      value={assignRefDocTitle}
                      onChange={(e) => setAssignRefDocTitle(e.target.value)}
                      placeholder="Reference Document Title (e.g. Official Raft Consensus Paper Summary)"
                      className="w-full border border-gray-300 rounded-xl p-2 text-xs text-gray-800 font-medium"
                    />

                    <div>
                      <input
                        type="file"
                        accept=".md,.txt,.pdf,.py"
                        onChange={handleRefDocFileUpload}
                        className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-slate-200 file:text-slate-800"
                      />
                    </div>

                    <textarea
                      rows={3}
                      value={assignRefDocContent}
                      onChange={(e) => setAssignRefDocContent(e.target.value)}
                      placeholder="Paste reference reading material, API specs, or background theory..."
                      className="w-full border border-gray-300 rounded-xl p-2 text-xs text-gray-800 font-mono"
                    />
                  </div>
                )}
              </div>

              {/* AI Rubric Generation Button */}
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-emerald-950 text-xs block">AI Rubric &amp; Grace Marks Agent</span>
                  <span className="text-[10px] text-emerald-700">Formulates balanced criteria &amp; +2 to +6 grace marks policy</span>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateRubric}
                  disabled={isGeneratingRubric}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  {isGeneratingRubric ? 'Analyzing...' : '✨ Auto-Generate'}
                </button>
              </div>

              {generatedRubric?.criteria && (
                <div className="p-2.5 rounded-xl bg-white border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
                  <span className="font-bold">Formulated Criteria:</span>
                  <p className="text-gray-600 text-[10px]">
                    {generatedRubric.criteria.map((c: any) => `${c.name} (${c.weight}%)`).join(' • ')}
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAssignmentModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAssign}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition disabled:opacity-50"
                >
                  {isCreatingAssign ? 'Posting...' : 'Post Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* QUIZ MODAL (CREATE OR TAKE) */}
      {/* ============================================================== */}
      {showQuizModal && (
        <QuizModal
          isOpen={showQuizModal}
          onClose={() => setShowQuizModal(false)}
          mode="create"
          activeClass={activeClass}
          currentUser={currentUser}
          onCreateQuiz={onCreateQuiz}
        />
      )}

      {takingQuiz && (
        <QuizModal
          isOpen={!!takingQuiz}
          onClose={() => setTakingQuiz(null)}
          mode="take"
          activeClass={activeClass}
          currentUser={currentUser}
          quiz={takingQuiz}
          onSubmitQuiz={onSubmitQuiz}
        />
      )}
    </div>
  );
};
