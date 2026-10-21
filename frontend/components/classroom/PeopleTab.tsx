'use client';

import React, { useState } from 'react';

interface PeopleTabProps {
  activeClass: any;
  allUsers: any[];
}

export const PeopleTab: React.FC<PeopleTabProps> = ({
  activeClass,
  allUsers,
}) => {
  const [copied, setCopied] = useState(false);

  const teacher = allUsers.find(u => u.id === activeClass.facultyId) || {
    fullName: activeClass.facultyName || 'Instructor',
    email: activeClass.facultyEmail || 'instructor@university.edu',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Teacher',
  };

  const enrolledIds = activeClass.enrolledStudentIds || [];
  const classmates = allUsers.filter(u => 
    u.role === 'student' && enrolledIds.includes(u.id)
  );

  const handleCopyCode = () => {
    if (activeClass?.classCode) {
      navigator.clipboard.writeText(activeClass.classCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Teachers Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-2">
          <h2 className="text-2xl font-bold text-emerald-800">Teachers</h2>
        </div>

        <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition border border-transparent hover:border-gray-100">
          <div className="flex items-center space-x-4">
            <img
              src={teacher.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(teacher.fullName)}`}
              alt={teacher.fullName}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <p className="text-sm font-bold text-gray-900">{teacher.fullName}</p>
              <p className="text-xs text-gray-500">{teacher.email}</p>
            </div>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            Course Instructor
          </span>
        </div>
      </div>

      {/* Classmates Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-2">
          <h2 className="text-2xl font-bold text-emerald-800">Classmates</h2>
          <span className="text-xs font-medium text-gray-500">{classmates.length} students</span>
        </div>

        {classmates.length === 0 ? (
          <div className="p-8 rounded-2xl bg-gray-50 border border-dashed border-gray-200 text-center space-y-3">
            <p className="text-sm font-bold text-gray-700">No students enrolled yet</p>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Share the class code with your students so they can join this classroom from their dashboard.
            </p>
            <div className="inline-flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-gray-300">
              <span className="text-xs text-gray-500">Class Code:</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">{activeClass.classCode}</span>
              <button
                onClick={handleCopyCode}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2 py-0.5 rounded-lg transition"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {classmates.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between py-3.5 px-3 rounded-2xl hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-4">
                  <img
                    src={student.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(student.fullName)}`}
                    alt={student.fullName}
                    className="w-9 h-9 rounded-full"
                  />
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-gray-900">{student.fullName}</p>
                    <p className="text-[11px] text-gray-500">{student.email}</p>
                  </div>
                </div>

                <span className="text-[11px] text-gray-400 font-medium">Enrolled</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
