'use client';

import React, { useState } from 'react';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
  availableUsers: any[];
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  availableUsers,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'student' | 'faculty'>('student');
  const [department, setDepartment] = useState('Computer Science');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          username: loginIdentifier,
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        setSuccessMsg('Logged in successfully!');
        setTimeout(() => onLoginSuccess(data.user), 300);
      } else {
        setErrorMsg(data.error || 'Invalid credentials. Please verify your username and password.');
      }
    } catch (err: any) {
      setErrorMsg('Failed to connect to authentication server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (password.length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          fullName,
          username,
          email,
          password,
          role,
          department,
        }),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        setSuccessMsg('Account created successfully! Redirecting...');
        setTimeout(() => onLoginSuccess(data.user), 600);
      } else {
        setErrorMsg(data.error || 'Registration failed. Please check your information.');
      }
    } catch (err: any) {
      setErrorMsg('Failed to register account. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (user: any) => {
    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-emerald-50/30 flex flex-col justify-center items-center p-4 py-8">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl border border-gray-200/80 p-8 space-y-6">
        {/* Google Classroom Branding */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-emerald-600/20">
            <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Google Classroom</h1>
          <p className="text-xs text-gray-500 font-medium">
            AI-Driven Academic Assessment & Performance Analytics
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Create Account */}
        <div className="flex bg-gray-100/90 p-1 rounded-2xl border border-gray-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all ${
              mode === 'login'
                ? 'bg-white text-emerald-800 shadow-sm font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all ${
              mode === 'register'
                ? 'bg-white text-emerald-800 shadow-sm font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium text-center flex items-center justify-center space-x-2 animate-fadeIn">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium text-center flex items-center justify-center space-x-2 animate-fadeIn">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        {/* MODE: SIGN IN */}
        {mode === 'login' ? (
          <form onSubmit={handleFormLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Username or Email</label>
              <input
                type="text"
                required
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="e.g. dr.smith or alice@student.edu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-800 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold rounded-xl shadow-md transition-all text-sm flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Sign In to Classroom</span>
              )}
            </button>

            <p className="text-center text-[11px] text-gray-500 pt-1">
              New to Classroom?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg('');
                }}
                className="text-emerald-700 font-bold hover:underline"
              >
                Create an account
              </button>
            </p>
          </form>
        ) : (
          /* MODE: REGISTER */
          <form onSubmit={handleFormRegister} className="space-y-3.5 text-xs">
            {/* Role Selector Card Buttons */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1.5">I am registering as:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    role === 'student'
                      ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 text-emerald-900 font-bold'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🎓</span>
                    <span className="text-xs font-bold">Student</span>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 font-normal">
                    Join classrooms &amp; submit assignments
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('faculty')}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    role === 'faculty'
                      ? 'border-purple-500 bg-purple-50/60 ring-2 ring-purple-500/20 text-purple-900 font-bold'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">👨‍🏫</span>
                    <span className="text-xs font-bold">Faculty</span>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 font-normal">
                    Create classrooms &amp; manage evaluations
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={role === 'faculty' ? 'Dr. Sarah Smith' : 'Alex Johnson'}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. alexj"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 text-sm bg-white"
                >
                  <option value="Computer Science">Computer Science</option>
                  <option value="Artificial Intelligence">Artificial Intelligence</option>
                  <option value="Software Engineering">Software Engineering</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Cybersecurity">Cybersecurity</option>
                  <option value="Information Systems">Information Systems</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold rounded-xl shadow-md transition-all text-sm flex items-center justify-center space-x-2 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Register &amp; Access Classroom</span>
              )}
            </button>

            <p className="text-center text-[11px] text-gray-500 pt-1">
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                }}
                className="text-emerald-700 font-bold hover:underline"
              >
                Sign in here
              </button>
            </p>
          </form>
        )}

        {/* Demo Fast Login Section */}
        <div className="border-t border-gray-100 pt-4 space-y-2.5">
          <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Or Click to Sign In with Demo Accounts:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
            {(availableUsers || []).slice(0, 4).map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleQuickLogin(u)}
                className="flex items-center space-x-2.5 p-2 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left group"
              >
                <img
                  src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.fullName)}`}
                  alt={u.fullName}
                  className="w-7 h-7 rounded-full flex-shrink-0"
                />
                <div className="truncate">
                  <p className="text-xs font-bold text-gray-800 group-hover:text-emerald-700 truncate">
                    {u.fullName}
                  </p>
                  <p className="text-[10px] text-gray-500 capitalize">
                    {u.role === 'faculty' ? '👨‍🏫 Faculty' : '🎓 Student'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center text-[10px] text-gray-400 pt-1 border-t border-gray-100">
          Powered by <strong>Groq LLM</strong> (qwen/qwen3.8-27b) &amp; Persistent Database Pipeline
        </div>
      </div>
    </div>
  );
};
