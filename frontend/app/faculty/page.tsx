'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FacultyPortalRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ai_pathashala_user_id', 'u-faculty-1');
      router.replace('/?portal=faculty');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-gray-700">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-sm font-bold">Launching AI Pathashala Faculty Portal...</h2>
        <p className="text-xs text-gray-400">Setting up independent faculty tab</p>
      </div>
    </div>
  );
}
