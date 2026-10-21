'use client';

import React, { useState, useEffect } from 'react';
import { ClassroomHeader } from '@/components/classroom/ClassroomHeader';
import { LoginPage } from '@/components/classroom/LoginPage';
import { ClassCardGrid } from '@/components/classroom/ClassCardGrid';
import { StreamTab } from '@/components/classroom/StreamTab';
import { ClassworkTab } from '@/components/classroom/ClassworkTab';
import { PeopleTab } from '@/components/classroom/PeopleTab';
import { GradesTab } from '@/components/classroom/GradesTab';
import { JarvisChatbot } from '@/components/classroom/JarvisChatbot';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [activeClass, setActiveClass] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'stream' | 'classwork' | 'people' | 'grades'>('stream');
  const [isLoading, setIsLoading] = useState(true);
  const [isJarvisOpen, setIsJarvisOpen] = useState(false);

  // Load initial data from the database API
  const fetchData = async () => {
    try {
      const [authRes, classesRes] = await Promise.all([
        fetch('/api/auth'),
        fetch('/api/classes'),
      ]);

      if (authRes.ok) {
        const authData = await authRes.json();
        const users = authData.users || [];
        setAllUsers(users);

        // Check saved session in localStorage
        const savedUserId = localStorage.getItem('google_classroom_user_id');
        if (savedUserId) {
          const found = users.find((u: any) => u.id === savedUserId);
          if (found) {
            setCurrentUser(found);
          } else {
            localStorage.removeItem('google_classroom_user_id');
            setCurrentUser(null);
          }
        } else {
          // No active session -> show Login / Register page
          setCurrentUser(null);
        }
      }

      if (classesRes.ok) {
        const cData = await classesRes.json();
        setClasses(cData.classes || []);
        setAnnouncements(cData.announcements || []);
        setAssignments(cData.assignments || []);
        setSubmissions(cData.submissions || []);
        setMaterials(cData.materials || []);
        setQuizzes(cData.quizzes || []);
      }
    } catch (err) {
      console.error('Failed to load database records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem('google_classroom_user_id', user.id);
    // Refresh users list in background in case a new account registered
    fetch('/api/auth')
      .then(res => res.json())
      .then(data => {
        if (data.users) setAllUsers(data.users);
      })
      .catch(() => {});
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveClass(null);
    localStorage.removeItem('google_classroom_user_id');
  };

  const handleSwitchUser = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem('google_classroom_user_id', user.id);
  };

  // Create a new Classroom (Faculty)
  const handleCreateClass = async (classData: any) => {
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_class',
          ...classData,
        }),
      });

      const data = await res.json();
      if (res.ok && data.class) {
        setClasses(prev => [data.class, ...prev]);
        return data.class;
      } else {
        throw new Error(data.error || 'Failed to create classroom');
      }
    } catch (err: any) {
      console.error('Error creating class:', err);
      throw err;
    }
  };

  // Join a Classroom using Class Code (Student)
  const handleJoinClass = async (classCode: string) => {
    if (!currentUser) throw new Error('Please sign in to join a class');
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join_class',
          classCode,
          studentId: currentUser.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.class) {
        setClasses(prev =>
          prev.map(c => (c.id === data.class.id ? data.class : c))
        );
        return data.class;
      } else {
        throw new Error(data.error || 'Failed to join classroom');
      }
    } catch (err: any) {
      console.error('Error joining class:', err);
      throw err;
    }
  };

  const handlePostAnnouncement = async (content: string) => {
    if (!activeClass || !currentUser) return;
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'post_announcement',
          classId: activeClass.id,
          authorId: currentUser.id,
          authorName: currentUser.fullName,
          authorAvatar: currentUser.avatar,
          content,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(prev => [data.announcement, ...prev]);
      }
    } catch (err) {
      console.error('Failed to post announcement:', err);
    }
  };

  const handleAddComment = async (announcementId: string, content: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_comment',
          announcementId,
          authorName: currentUser.fullName,
          content,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(prev =>
          prev.map(a => (a.id === announcementId ? data.announcement : a))
        );
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleCreateAssignment = async (assignmentData: any) => {
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_assignment',
          ...assignmentData,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAssignments(prev => [...prev, data.assignment]);
      }
    } catch (err) {
      console.error('Failed to create assignment:', err);
    }
  };

  const handlePostMaterial = async (materialData: any) => {
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'post_material',
          ...materialData,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMaterials(prev => [data.material, ...prev]);
        if (data.announcement) {
          setAnnouncements(prev => [data.announcement, ...prev]);
        }
        return data.material;
      }
    } catch (err) {
      console.error('Failed to post material:', err);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_material',
          materialId,
        }),
      });
      if (res.ok) {
        setMaterials(prev => prev.filter(m => m.id !== materialId));
      }
    } catch (err) {
      console.error('Failed to delete material:', err);
    }
  };

  const handleSubmitWork = async (submissionData: any) => {
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submissionData),
    });

    if (res.ok) {
      const data = await res.json();
      setSubmissions(prev => {
        const filtered = prev.filter(
          s => !(s.assignmentId === submissionData.assignmentId && s.studentId === submissionData.studentId)
        );
        return [data.submission, ...filtered];
      });
      return data.submission;
    }
    throw new Error('Submission failed');
  };

  const handleCreateQuiz = async (quizData: any) => {
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_quiz',
          ...quizData,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setQuizzes(prev => [data.quiz, ...prev]);
        if (data.assignment) {
          setAssignments(prev => [...prev, data.assignment]);
        }
        if (data.announcement) {
          setAnnouncements(prev => [data.announcement, ...prev]);
        }
        return data.quiz;
      }
    } catch (err) {
      console.error('Failed to create quiz:', err);
    }
  };

  const handleSubmitQuiz = async (submissionData: any) => {
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_quiz',
          ...submissionData,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.submission) {
          setSubmissions(prev => [
            data.submission,
            ...prev.filter(s => !(s.assignmentId === submissionData.quizId && s.studentId === submissionData.studentId)),
          ]);
        }
        return data;
      }
    } catch (err) {
      console.error('Failed to submit quiz:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-gray-700">Connecting to Google Classroom Database...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Login & Register Screen
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} availableUsers={allUsers} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 flex flex-col font-sans">
      {/* Google Classroom Sticky Header */}
      <ClassroomHeader
        currentUser={currentUser}
        activeClass={activeClass}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNavigateHome={() => {
          setActiveClass(null);
          setActiveTab('stream');
        }}
        onLogout={handleLogout}
        onOpenJarvis={() => setIsJarvisOpen(true)}
        classes={classes}
        onSelectClass={(c) => {
          setActiveClass(c);
          setActiveTab('stream');
        }}
        onOpenCreateClass={() => {
          setActiveClass(null);
        }}
        onOpenJoinClass={() => {
          setActiveClass(null);
        }}
      />

      {/* Main Viewport */}
      <main className="flex-1">
        {/* If no class selected -> Show Google Classroom Courses Card Grid */}
        {!activeClass ? (
          <ClassCardGrid
            classes={classes}
            assignments={assignments}
            currentUser={currentUser}
            onSelectClass={(c) => {
              setActiveClass(c);
              setActiveTab('stream');
            }}
            onCreateClass={handleCreateClass}
            onJoinClass={handleJoinClass}
          />
        ) : (
          /* Inside a Class -> 4 Google Classroom Tabs */
          <div>
            {activeTab === 'stream' && (
              <StreamTab
                activeClass={activeClass}
                announcements={announcements}
                assignments={assignments}
                materials={materials}
                quizzes={quizzes}
                currentUser={currentUser}
                onPostAnnouncement={handlePostAnnouncement}
                onAddComment={handleAddComment}
                onPostMaterial={handlePostMaterial}
                onCreateAssignment={handleCreateAssignment}
                onCreateQuiz={handleCreateQuiz}
                onSubmitQuiz={handleSubmitQuiz}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'classwork' && (
              <ClassworkTab
                activeClass={activeClass}
                assignments={assignments}
                submissions={submissions}
                materials={materials}
                quizzes={quizzes}
                allUsers={allUsers}
                currentUser={currentUser}
                onCreateAssignment={handleCreateAssignment}
                onSubmitWork={handleSubmitWork}
                onPostMaterial={handlePostMaterial}
                onDeleteMaterial={handleDeleteMaterial}
                onCreateQuiz={handleCreateQuiz}
                onSubmitQuiz={handleSubmitQuiz}
              />
            )}

            {activeTab === 'people' && (
              <PeopleTab
                activeClass={activeClass}
                allUsers={allUsers}
              />
            )}

            {activeTab === 'grades' && (
              <GradesTab
                activeClass={activeClass}
                assignments={assignments}
                submissions={submissions}
                allUsers={allUsers}
                currentUser={currentUser}
              />
            )}
          </div>
        )}
      </main>

      {/* Google Classroom Style Footer */}
      <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="flex items-center space-x-2">
            <span>Google Classroom AI Clone</span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold">Groq LLM (qwen/qwen3.8-27b)</span>
          </p>
          <p className="text-gray-400">
            Persistent Database Pipeline: <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px]">frontend/data/db.json</code> &amp; <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px]">data/uploads/</code>
          </p>
        </div>
      </footer>

      {/* Floating JARVIS AI Trigger Button (Bottom-Right) */}
      {!isJarvisOpen && (
        <button
          type="button"
          onClick={() => setIsJarvisOpen(true)}
          className="fixed bottom-6 right-6 z-30 flex items-center space-x-2.5 px-4 py-3 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-cyan-300 rounded-full shadow-2xl border border-cyan-500/40 hover:border-cyan-400 hover:scale-105 active:scale-95 transition-all group ring-2 ring-cyan-500/20"
          title="Open JARVIS AI Assistant"
        >
          <div className="relative">
            <span className="text-xl">🤖</span>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-950 animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-950" />
          </div>
          <div className="text-left hidden sm:block">
            <span className="block text-xs font-extrabold tracking-wider text-cyan-300 uppercase">
              JARVIS AI
            </span>
            <span className="block text-[10px] text-slate-400 font-medium">
              Academic Copilot • Online
            </span>
          </div>
        </button>
      )}

      {/* JARVIS Chatbot Modal / Assistant */}
      <JarvisChatbot
        isOpen={isJarvisOpen}
        onClose={() => setIsJarvisOpen(false)}
        currentUser={currentUser}
        activeClass={activeClass}
      />
    </div>
  );
}
