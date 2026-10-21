'use client';

import React, { useState } from 'react';

interface ClassroomHeaderProps {
  currentUser: any;
  activeClass: any | null;
  activeTab: 'stream' | 'classwork' | 'people' | 'grades';
  onTabChange: (tab: 'stream' | 'classwork' | 'people' | 'grades') => void;
  onNavigateHome: () => void;
  onLogout: () => void;
  onOpenJarvis?: () => void;
  classes?: any[];
  onSelectClass?: (c: any) => void;
  onOpenCreateClass?: () => void;
  onOpenJoinClass?: () => void;
}

export const ClassroomHeader: React.FC<ClassroomHeaderProps> = ({
  currentUser,
  activeClass,
  activeTab,
  onTabChange,
  onNavigateHome,
  onLogout,
  onOpenJarvis,
  classes = [],
  onSelectClass,
  onOpenCreateClass,
  onOpenJoinClass,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showSideDrawer, setShowSideDrawer] = useState(false);

  const isFaculty = currentUser?.role === 'faculty';

  // Filter user's specific classes:
  // Faculty: only classes created by this faculty
  // Student: only classes where student is enrolled
  const userClasses = classes.filter((cls) => {
    if (isFaculty) {
      return (
        cls.facultyId === currentUser?.id ||
        (cls.facultyEmail &&
          currentUser?.email &&
          cls.facultyEmail.toLowerCase() === currentUser.email.toLowerCase())
      );
    } else {
      return (cls.enrolledStudentIds || []).includes(currentUser?.id);
    }
  });

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 text-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left: Hamburger Menu Bar & Logo / Class Title */}
          <div className="flex items-center space-x-3">
            {/* HAMBURGER MENU BUTTON (OPENS DRAWER WITH JARVIS OPTION) */}
            <button
              type="button"
              onClick={() => setShowSideDrawer(true)}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition focus:outline-none"
              title="Open Navigation Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Google Classroom Branding */}
            <div
              onClick={onNavigateHome}
              className="flex items-center space-x-2.5 cursor-pointer select-none"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm font-bold text-lg">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-gray-800 tracking-tight flex items-center space-x-1.5">
                  <span>Google Classroom</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    AI Pipeline
                  </span>
                </span>
                {activeClass && (
                  <span className="text-xs text-gray-500 font-medium truncate max-w-xs sm:max-w-md">
                    {activeClass.name} • {activeClass.section}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Classroom Tabs (Only when inside a class) */}
          {activeClass ? (
            <nav className="hidden md:flex space-x-1">
              {[
                { id: 'stream', label: 'Stream' },
                { id: 'classwork', label: 'Classwork' },
                { id: 'people', label: 'People' },
                { id: 'grades', label: currentUser.role === 'faculty' ? 'Grades' : 'My Grades' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id as any)}
                  className={`px-5 py-5 text-sm font-semibold border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'border-emerald-600 text-emerald-700 font-bold'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          ) : (
            <div className="hidden lg:flex items-center space-x-2 text-xs text-gray-500 font-medium">
              <span>Academic Session 2026-2027</span>
              <span>•</span>
              <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold">
                Groq AI Assessment Engine
              </span>
            </div>
          )}

          {/* Right: JARVIS Action Button / + Plus Action / Role Badge / Profile Avatar */}
          <div className="flex items-center space-x-2.5">
            {/* JARVIS AI Shortcut Button in Header */}
            {onOpenJarvis && (
              <button
                type="button"
                onClick={onOpenJarvis}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
                title="Ask JARVIS AI Assistant"
              >
                <span className="text-sm">🤖</span>
                <span className="hidden sm:inline">JARVIS</span>
              </button>
            )}

            {/* Google Classroom "+" Create / Join Button */}
            <div className="relative">
              <button
                onClick={() => setShowPlusMenu(!showPlusMenu)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition"
                title="Create or join a class"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>

              {/* "+" Dropdown Menu */}
              {showPlusMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50 text-gray-800 text-xs animate-fadeIn">
                  {isFaculty ? (
                    <>
                      <button
                        onClick={() => {
                          setShowPlusMenu(false);
                          if (onOpenCreateClass) onOpenCreateClass();
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 hover:text-emerald-800 font-semibold flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Create class</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowPlusMenu(false);
                          if (onOpenJoinClass) onOpenJoinClass();
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-100 font-medium text-gray-600 flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        <span>Join class</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setShowPlusMenu(false);
                          if (onOpenJoinClass) onOpenJoinClass();
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 hover:text-emerald-800 font-semibold flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        <span>Join class</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Role Badge */}
            <span
              className={`hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isFaculty
                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              {isFaculty ? '👨‍🏫 Faculty' : '🎓 Student'}
            </span>

            {/* Profile Avatar & Authenticated User Card (Privacy Protected) */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-9 h-9 rounded-full ring-2 ring-emerald-500/30 overflow-hidden focus:outline-none hover:ring-emerald-600 transition"
              >
                <img
                  src={
                    currentUser.avatar ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.fullName)}`
                  }
                  alt={currentUser.fullName}
                  className="w-full h-full object-cover"
                />
              </button>

              {/* Authenticated User Privacy Card */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 py-3 z-50 text-gray-800 text-xs animate-fadeIn">
                  {/* User Profile Info */}
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center space-x-3">
                    <img
                      src={
                        currentUser.avatar ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.fullName)}`
                      }
                      alt={currentUser.fullName}
                      className="w-11 h-11 rounded-full flex-shrink-0"
                    />
                    <div className="truncate">
                      <p className="font-extrabold text-sm text-gray-900 truncate">{currentUser.fullName}</p>
                      <p className="text-gray-500 truncate text-[11px]">{currentUser.email}</p>
                      <span className="text-[10px] text-emerald-700 font-bold uppercase">
                        {currentUser.role} • {currentUser.department}
                      </span>
                    </div>
                  </div>

                  {/* Privacy & Security Notice */}
                  <div className="p-3 mx-2 my-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center space-x-1.5 text-[11px] font-bold text-gray-800">
                      <span>🔒</span>
                      <span>Secure Session Active</span>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-tight">
                      To protect your academic grades and privacy, switching accounts requires signing out first.
                    </p>
                  </div>

                  {/* Sign Out Button (Only authenticated pathway to switch account) */}
                  <div className="px-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full text-center py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold transition flex items-center justify-center space-x-2 border border-red-200 shadow-sm"
                    >
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        {activeClass && (
          <div className="flex md:hidden border-t border-gray-100 overflow-x-auto justify-around py-2">
            {[
              { id: 'stream', label: 'Stream' },
              { id: 'classwork', label: 'Classwork' },
              { id: 'people', label: 'People' },
              { id: 'grades', label: 'Grades' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id as any)}
                className={`text-xs px-3 py-1 font-semibold rounded-full ${
                  activeTab === tab.id ? 'bg-emerald-600 text-white' : 'text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* GOOGLE CLASSROOM LEFT HAMBURGER MENU DRAWER WITH JARVIS OPTION */}
      {/* ============================================================== */}
      {showSideDrawer && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setShowSideDrawer(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-fadeIn"
          />

          {/* Drawer Panel */}
          <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-50 animate-slideRight">
            {/* Drawer Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
                  </svg>
                </div>
                <span className="font-extrabold text-gray-900 text-base tracking-tight">
                  Google Classroom
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowSideDrawer(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>

            {/* Current User Summary */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center space-x-3">
              <img
                src={currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.fullName)}`}
                alt={currentUser.fullName}
                className="w-10 h-10 rounded-full flex-shrink-0"
              />
              <div className="truncate">
                <p className="text-xs font-extrabold text-gray-900 truncate">{currentUser.fullName}</p>
                <p className="text-[11px] text-gray-500 truncate">{currentUser.email}</p>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                  {currentUser.role}
                </span>
              </div>
            </div>

            {/* Navigation Options */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {/* 1. JARVIS CHATBOT OPTION (REQUESTED BY USER) */}
              <div className="mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSideDrawer(false);
                    if (onOpenJarvis) onOpenJarvis();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition-all active:scale-[0.98] group"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl group-hover:scale-110 transition-transform">🤖</span>
                    <div className="text-left">
                      <span className="block font-bold">JARVIS AI Assistant</span>
                      <span className="block text-[10px] text-cyan-200 font-normal">
                        Ask questions, code hints &amp; course info
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm">
                    Online
                  </span>
                </button>
              </div>

              {/* 2. Classes Home */}
              <button
                type="button"
                onClick={() => {
                  setShowSideDrawer(false);
                  onNavigateHome();
                }}
                className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100 font-semibold text-xs transition"
              >
                <span className="text-base">🏠</span>
                <span>All Classes</span>
              </button>

              {/* 3. Enrolled / Teaching Section */}
              <div className="pt-3 pb-1 border-t border-gray-100">
                <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {isFaculty ? 'Teaching Courses' : 'Enrolled Courses'} ({userClasses.length})
                </p>
              </div>

              {userClasses.length === 0 ? (
                <div className="px-3 py-6 text-center space-y-1">
                  <span className="text-2xl block">📚</span>
                  <p className="text-xs font-semibold text-gray-600">
                    {isFaculty ? 'No courses created yet' : 'No courses enrolled yet'}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {isFaculty ? 'Click + to create your first class' : 'Click + to enter a class code'}
                  </p>
                </div>
              ) : (
                userClasses.map((cls) => {
                  const isSelected = activeClass?.id === cls.id;

                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => {
                        setShowSideDrawer(false);
                        if (onSelectClass) onSelectClass(cls);
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-left text-xs transition ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-extrabold flex-shrink-0">
                        {cls.code?.slice(0, 2) || 'CS'}
                      </span>
                      <div className="truncate">
                        <p className="truncate font-semibold">{cls.name}</p>
                        <p className="text-[10px] text-gray-400">{cls.section}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Drawer Footer: Sign Out */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => {
                  setShowSideDrawer(false);
                  onLogout();
                }}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition"
              >
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out of Classroom</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
