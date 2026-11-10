import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-gray-200 text-center space-y-4 shadow-xl text-gray-800">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl font-bold mx-auto">
          🎓
        </div>
        <h2 className="text-xl font-bold text-gray-900">Page Not Found</h2>
        <p className="text-xs text-gray-500">
          The requested page could not be found in AI Pathashala.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md"
        >
          Return to Classroom
        </Link>
      </div>
    </div>
  );
}
