'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface JarvisChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  activeClass: any | null;
}

export const JarvisChatbot: React.FC<JarvisChatbotProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeClass,
}) => {
  const isFaculty = currentUser?.role === 'faculty';
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Initialize welcome greeting from JARVIS
  useEffect(() => {
    if (messages.length === 0 && currentUser) {
      const greeting = isFaculty
        ? `Greetings, Professor ${currentUser.fullName.split(' ').pop() || currentUser.fullName}. I am **JARVIS**, your academic copilot.
        
I am ready to help you:
- Formulate course assignment prompts & multi-dimensional evaluation rubrics
- Generate conceptual quiz questions with pedagogical explanations
- Summarize lecture notes & verify syllabus alignment
- Draft classroom announcements

How may I assist your curriculum today?`
        : `Greetings, ${currentUser.fullName}. I am **JARVIS**, your AI Academic Assistant.

I am grounded in your enrolled course syllabus, lecture notes, and assignments. I can help you:
- Clarify difficult academic theories and system architectures
- Debug code algorithms and analyze time/space complexities
- Explain assignment requirements, grading rubrics, and grace marks policies
- Quiz you on core concepts for upcoming exams

What would you like to explore today?`;

      setMessages([
        {
          id: 'welcome-msg',
          role: 'assistant',
          content: greeting,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [currentUser, isFaculty]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  if (!isOpen) return null;

  // Quick suggestions based on role
  const quickSuggestions = isFaculty
    ? [
        '✨ Create an essay rubric for distributed systems',
        '💡 Generate 3 conceptual quiz questions on Unit 1',
        '📢 Draft an encouraging announcement on upcoming due dates',
        '📜 Summarize key topics covered in the syllabus',
      ]
    : [
        '🧠 Explain Python memory model & mutability rules',
        '⚡ What are the 4 Coffman conditions for deadlock?',
        '💻 How does CPython reference counting work with GIL?',
        '🎁 How do teachers award grace marks for effort?',
        '❓ Give me a practice quiz question on data structures',
      ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          activeClassId: activeClass?.id || null,
          currentUser: {
            id: currentUser.id,
            fullName: currentUser.fullName,
            role: currentUser.role,
            department: currentUser.department,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: ChatMessage = {
          id: `jarvis-${Date.now()}`,
          role: 'assistant',
          content: data.message || 'I have analyzed your request.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const errData = await res.json();
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `Apologies, ${currentUser.fullName}. I encountered a neural connection interruption: ${errData.error || 'Connection failed'}. Please retry momentarily.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err) {
      console.error('JARVIS chat error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `My neural subsystems are momentarily reconnecting. Please verify the server connection and try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (confirm('Clear JARVIS conversation history?')) {
      setMessages([]);
    }
  };

  // Simple Markdown Formatter Helper
  const renderFormattedContent = (content: string) => {
    // Break into code blocks vs regular text
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const firstLineEnd = part.indexOf('\n');
        const lang = firstLineEnd !== -1 ? part.slice(3, firstLineEnd).trim() : '';
        const code = firstLineEnd !== -1 ? part.slice(firstLineEnd + 1, -3) : part.slice(3, -3);

        return (
          <div key={index} className="my-2.5 rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-md">
            <div className="px-3.5 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>{lang || 'code'}</span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(code)}
                className="hover:text-emerald-400 transition"
              >
                Copy
              </button>
            </div>
            <pre className="p-3 text-xs text-emerald-300 font-mono overflow-x-auto whitespace-pre leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Format bold, bullet points, headers, inline code
      const lines = part.split('\n');
      return (
        <div key={index} className="space-y-1">
          {lines.map((line, lIdx) => {
            if (line.startsWith('### ')) {
              return <h5 key={lIdx} className="text-xs font-bold text-emerald-400 mt-2">{line.replace('### ', '')}</h5>;
            }
            if (line.startsWith('## ')) {
              return <h4 key={lIdx} className="text-sm font-extrabold text-cyan-300 mt-2.5">{line.replace('## ', '')}</h4>;
            }
            if (line.startsWith('- ') || line.startsWith('* ')) {
              const itemText = line.slice(2);
              return (
                <div key={lIdx} className="flex items-start space-x-2 text-xs text-slate-200 pl-1">
                  <span className="text-cyan-400 text-sm leading-none mt-0.5">•</span>
                  <span dangerouslySetInnerHTML={{ __html: formatInline(itemText) }} />
                </div>
              );
            }
            if (!line.trim()) {
              return <div key={lIdx} className="h-1.5" />;
            }
            return (
              <p
                key={lIdx}
                className="text-xs text-slate-200 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatInline(line) }}
              />
            );
          })}
        </div>
      );
    });
  };

  const formatInline = (str: string) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="bg-slate-800 text-cyan-300 px-1 py-0.5 rounded font-mono text-[11px]">$1</code>');
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-end sm:items-center justify-end sm:p-6 p-0">
      {/* Backdrop overlay for mobile */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto sm:hidden"
      />

      {/* Main JARVIS Window */}
      <div className="pointer-events-auto w-full sm:max-w-xl h-[92vh] sm:h-[680px] bg-slate-900/95 backdrop-blur-xl border border-cyan-500/30 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white animate-fadeIn ring-1 ring-cyan-500/20">
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-b border-cyan-500/20 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            {/* Hologram Orb Icon */}
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-xl shadow-lg shadow-cyan-500/30 ring-1 ring-cyan-400/50">
                🤖
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-sm tracking-wider text-cyan-300 uppercase">
                  J.A.R.V.I.S.
                </h3>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 tracking-tight">
                  Academic AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate max-w-[240px]">
                {activeClass ? `${activeClass.code} • ${activeClass.name}` : 'Neural Curriculum Core • Online'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Clear History Button */}
            <button
              type="button"
              onClick={handleClearHistory}
              title="Clear chat history"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition text-xs"
            >
              🗑️
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              title="Close JARVIS"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Classroom Context Banner */}
        <div className="px-4 py-1.5 bg-cyan-950/40 border-b border-cyan-500/10 flex items-center justify-between text-[10px] text-cyan-300/80">
          <span className="flex items-center space-x-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="truncate">
              Grounded with Classroom Syllabus, Materials &amp; Assignments
            </span>
          </span>
          <span className="capitalize font-mono text-[9px] bg-slate-800/80 px-2 py-0.5 rounded text-cyan-300">
            {isFaculty ? 'Faculty Mode' : 'Student Mode'}
          </span>
        </div>

        {/* Chat Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => {
            const isUser = m.role === 'user';

            return (
              <div
                key={m.id}
                className={`flex items-start space-x-2.5 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-xs shadow-sm mt-0.5 ${
                    isUser
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white ring-1 ring-cyan-400/40'
                  }`}
                >
                  {isUser ? currentUser.fullName.charAt(0) : 'J'}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 space-y-1.5 relative group ${
                    isUser
                      ? 'bg-emerald-600/90 text-white rounded-tr-none shadow-md'
                      : 'bg-slate-800/80 border border-slate-700/80 rounded-tl-none text-slate-100 shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-[10px] opacity-70">
                    <span className="font-bold">{isUser ? 'You' : 'JARVIS'}</span>
                    <span>{m.timestamp}</span>
                  </div>

                  <div className="text-xs leading-relaxed">
                    {renderFormattedContent(m.content)}
                  </div>

                  {!isUser && (
                    <div className="pt-1 flex justify-end opacity-0 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => handleCopy(m.id, m.content)}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                      >
                        <span>{copiedId === m.id ? '✓ Copied' : '📋 Copy'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Thinking / Typing Indicator */}
          {isLoading && (
            <div className="flex items-start space-x-2.5 animate-fadeIn">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center text-xs ring-1 ring-cyan-400/40">
                J
              </div>
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl rounded-tl-none p-3 flex items-center space-x-2 text-xs text-cyan-300">
                <div className="flex space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[11px] font-mono">JARVIS is synthesizing response...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center space-x-2 overflow-x-auto scrollbar-none flex-shrink-0">
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex-shrink-0">
            Prompt Ideas:
          </span>
          {quickSuggestions.map((sug, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(sug.replace(/^[^\w]+/, ''))}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-[11px] text-slate-200 hover:text-cyan-300 border border-slate-700/60 transition whitespace-nowrap flex-shrink-0"
            >
              {sug}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-950 border-t border-cyan-500/20 flex-shrink-0">
          <div className="flex items-end space-x-2 bg-slate-900 border border-cyan-500/30 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-cyan-400/50 transition">
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask JARVIS anything about ${activeClass?.name || 'your curriculum, code, or assignments'}...`}
              className="w-full text-xs bg-transparent text-white placeholder-slate-500 focus:outline-none resize-none font-sans"
            />

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-cyan-500/20 transition disabled:opacity-40 flex items-center space-x-1.5 flex-shrink-0 active:scale-95"
            >
              <span>Send</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 pt-1.5">
            <span>Press <strong>Enter</strong> to send • <strong>Shift+Enter</strong> for newline</span>
            <span className="text-cyan-400/60">Powered by Groq LLM (qwen/qwen3.8-27b)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

