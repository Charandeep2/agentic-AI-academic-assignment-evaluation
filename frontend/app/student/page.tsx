'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentPortalRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ai_pathashala_user_id', 'u-student-1');
      router.replace('/?portal=student');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-gray-700">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-sm font-bold">Launching AI Pathashala Student Portal...</h2>
        <p className="text-xs text-gray-400">Setting up independent student tab</p>
      </div>
    </div>
  );
}
