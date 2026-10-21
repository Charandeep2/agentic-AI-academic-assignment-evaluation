'use client';

import React from 'react';
import { User, Role } from '../lib/types';
import { GraduationCap, BookOpen, BarChart3, UserIcon, Sparkles } from '../lib/icons';

interface NavbarProps {
  currentUser: User;
  onRoleSwitch: (role: Role) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onRoleSwitch,
  activeTab,
  onTabChange,
}) => {
  const isStudent = currentUser.role === 'student';

  const navItems = isStudent
    ? [
        { id: 'portal', label: 'Student Portal', icon: GraduationCap },
        { id: 'analytics', label: 'My Performance Analytics', icon: BarChart3 },
        { id: 'knowledge', label: 'RAG Knowledge Base', icon: BookOpen },
      ]
    : [
        { id: 'portal', label: 'Faculty Portal', icon: BookOpen },
        { id: 'analytics', label: 'Class Analytics & Gaps', icon: BarChart3 },
        { id: 'knowledge', label: 'Course Materials', icon: BookOpen },
      ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Project Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                  AcademiaAI
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                  Agentic RAG
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Academic Assessment & Analytics System
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex space-x-1 sm:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Role Switcher & Active User Info */}
          <div className="flex items-center space-x-3">
            {/* Quick Demo Role Switcher */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => onRoleSwitch('student')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isStudent
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🎓 Student
              </button>
              <button
                onClick={() => onRoleSwitch('faculty')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  !isStudent
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                👨‍🏫 Faculty
              </button>
            </div>

            {/* User Profile Pill */}
            <div className="hidden md:flex items-center space-x-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-indigo-300">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="text-left text-xs">
                <p className="font-semibold text-slate-200">{currentUser.fullName}</p>
                <p className="text-slate-400 capitalize">{currentUser.role} • {currentUser.department.split('&')[0]}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
