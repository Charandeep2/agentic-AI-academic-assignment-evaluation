'use client';

import React, { useState } from 'react';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOption: number;
  explanation: string;
}

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'take' | 'review';
  activeClass: any;
  currentUser: any;
  quiz?: any | null; // For taking/reviewing
  existingSubmission?: any | null; // If student already took it
  onCreateQuiz?: (quizData: any) => Promise<any>;
  onSubmitQuiz?: (submissionData: any) => Promise<any>;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  isOpen,
  onClose,
  mode: initialMode,
  activeClass,
  currentUser,
  quiz,
  existingSubmission,
  onCreateQuiz,
  onSubmitQuiz,
}) => {
  const isFaculty = currentUser.role === 'faculty';

  // State for Faculty: Quiz Creation
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState(
    activeClass?.syllabusProgress?.currentTopic || activeClass?.subject || 'Core Coursework Concepts'
  );
  const [syllabusCutoff, setSyllabusCutoff] = useState(
    activeClass?.syllabusProgress?.currentTopic || 'Unit 1: Fundamentals'
  );
  const [instructions, setInstructions] = useState('Answer all questions to test your conceptual understanding.');
  const [points, setPoints] = useState(100);
  const [timeLimit, setTimeLimit] = useState(10);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const [questions, setQuestions] = useState<QuizQuestion[]>([
    {
      id: 'q1',
      question: 'Which of the following describes the core trade-off in the topic?',
      options: [
        'Deterministic bounds vs runtime overhead',
        'Stack allocation vs CPU cache misses',
        'Automatic GC vs linear recursion',
        'Static types vs physical RAM bus width',
      ],
      correctOption: 0,
      explanation: 'Balancing algorithmic bounds with operational overhead is central to system architecture.',
    },
  ]);

  // State for Student: Taking Quiz
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gradedResult, setGradedResult] = useState<any | null>(existingSubmission?.evaluation || null);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);

  if (!isOpen) return null;

  // AI Quiz Generation handler
  const handleAiGenerate = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/ai/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim() || activeClass.subject || 'Computer Science Concepts',
          syllabusCutoff: syllabusCutoff.trim(),
          classId: activeClass.id,
          questionCount: 4,
          difficulty: 'intermediate',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.quiz) {
          if (data.quiz.title) setTitle(data.quiz.title);
          if (data.quiz.topic) setTopic(data.quiz.topic);
          if (data.quiz.questions && data.quiz.questions.length > 0) {
            setQuestions(data.quiz.questions);
          }
        }
      }
    } catch (err) {
      console.error('Failed to generate AI quiz:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Add a blank question
  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q-${Date.now()}`,
        question: 'New question prompt...',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctOption: 0,
        explanation: 'Pedagogical explanation for why this option is correct.',
      },
    ]);
  };

  // Remove question
  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) {
      alert('A quiz must have at least one question.');
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  // Update question field
  const handleUpdateQuestion = (idx: number, field: keyof QuizQuestion, value: any) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  // Update specific option
  const handleUpdateOption = (qIdx: number, optIdx: number, value: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const newOpts = [...updated[qIdx].options];
      newOpts[optIdx] = value;
      updated[qIdx] = { ...updated[qIdx], options: newOpts };
      return updated;
    });
  };

  // Submit Faculty Creation
  const handlePublishQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a quiz title.');
      return;
    }
    if (questions.length === 0) {
      alert('Please add at least one question.');
      return;
    }

    setIsPublishing(true);
    try {
      if (onCreateQuiz) {
        await onCreateQuiz({
          classId: activeClass.id,
          title: title.trim(),
          topic: topic.trim(),
          instructions: instructions.trim(),
          points: Number(points) || 100,
          timeLimitMinutes: Number(timeLimit) || 10,
          questions,
          authorId: currentUser.id,
          authorName: currentUser.fullName,
        });
      }
      onClose();
    } catch (err) {
      console.error('Failed to publish quiz:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  // Submit Student Answers
  const handleSubmitAnswers = async () => {
    if (!quiz) return;
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < quiz.questions.length) {
      if (!confirm(`You have answered ${answeredCount} of ${quiz.questions.length} questions. Do you want to submit anyway?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (onSubmitQuiz) {
        const result = await onSubmitQuiz({
          quizId: quiz.id,
          studentId: currentUser.id,
          studentName: currentUser.fullName,
          studentEmail: currentUser.email,
          answers,
        });
        if (result && result.evaluation) {
          setGradedResult(result.evaluation);
        }
      }
    } catch (err) {
      console.error('Failed to submit quiz:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // VIEW: FACULTY QUIZ CREATOR
  // ==========================================
  if (initialMode === 'create' || isFaculty) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden my-auto animate-fadeIn">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-3">
              <span className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg">
                💡
              </span>
              <div>
                <h3 className="font-extrabold text-base tracking-tight">Conduct / Post Classroom Quiz</h3>
                <p className="text-[11px] text-amber-100 font-medium">
                  Create interactive MCQs with instant auto-grading, AI explanations &amp; Gradebook sync
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition text-sm"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handlePublishQuiz} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Top Toolbar: AI Question Generator Banner */}
            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4.5 space-y-3 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-full inline-block">
                      Syllabus-Bounded AI Quiz Generator
                    </span>
                    <span className="text-[10px] font-bold text-gray-500">
                      Credit Weight: {activeClass?.gradingWeights?.quizzes || 15}%
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-gray-800">
                    Groq LLM automatically designs MCQs bounded strictly to the covered syllabus portion.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={isGeneratingAi}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex-shrink-0 active:scale-95"
                >
                  {isGeneratingAi ? (
                    <>
                      <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Generating Syllabus Quiz...</span>
                    </>
                  ) : (
                    <>
                      <span>✨ AI Generate Bounded Questions</span>
                    </>
                  )}
                </button>
              </div>

              {/* Syllabus Milestone Cutoff Control */}
              <div className="pt-2 border-t border-amber-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-amber-900 mb-1 flex items-center space-x-1">
                    <span>📚 Syllabus Boundary / Completed Portion:</span>
                  </label>
                  <input
                    type="text"
                    value={syllabusCutoff}
                    onChange={(e) => setSyllabusCutoff(e.target.value)}
                    placeholder="e.g. Unit 2: Linear Data Structures (up to Linked Lists)"
                    className="w-full text-xs border border-amber-300 bg-white rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-gray-800"
                  />
                </div>
                <div className="flex items-center text-[10px] text-amber-800 bg-amber-100/60 p-2 rounded-xl border border-amber-200/50">
                  <span>
                    🛡️ <strong>Pedagogical Guarantee:</strong> AI will strictly test concepts up to this milestone (e.g. Arrays, Linked Lists). It will NOT test future un-taught topics like Trees, Graphs, or DP.
                  </span>
                </div>
              </div>
            </div>

            {/* Basic Quiz Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-8 space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Quiz Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Pop Quiz: Python Memory Allocation & Reference Counting"
                  className="w-full text-xs border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Topic / Module</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Unit 1: Fundamentals"
                  className="w-full text-xs border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="md:col-span-6 space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Instructions / Description</label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Read each scenario carefully before selecting your answer."
                  className="w-full text-xs border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Total Points</label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="w-full text-xs border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                />
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Time Limit (mins)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  className="w-full text-xs border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Questions Section */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center space-x-1.5">
                  <span>Questions List ({questions.length})</span>
                </h4>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center space-x-1 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200"
                >
                  <span>+ Add Question</span>
                </button>
              </div>

              <div className="space-y-4">
                {questions.map((q, qIdx) => (
                  <div
                    key={q.id || qIdx}
                    className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-3 relative hover:border-amber-300 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-lg">
                        Q{qIdx + 1}
                      </span>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          className="text-[11px] text-red-600 hover:text-red-700 font-bold"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-600 block mb-1">Question Prompt</label>
                      <textarea
                        rows={2}
                        value={q.question}
                        onChange={(e) => handleUpdateQuestion(qIdx, 'question', e.target.value)}
                        placeholder="Enter the question or problem scenario..."
                        className="w-full text-xs border border-gray-200 bg-white rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none font-medium"
                      />
                    </div>

                    {/* Options (A, B, C, D) with Radio for Correct Option */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-600 block">
                        Answer Options (Select the correct option with the radio button):
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = q.correctOption === optIdx;
                          const letter = ['A', 'B', 'C', 'D'][optIdx] || `${optIdx + 1}`;

                          return (
                            <div
                              key={optIdx}
                              className={`flex items-center space-x-2 p-2 rounded-xl border transition ${
                                isCorrect
                                  ? 'bg-emerald-50/80 border-emerald-400 ring-1 ring-emerald-400/30'
                                  : 'bg-white border-gray-200'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`correct-${qIdx}`}
                                checked={isCorrect}
                                onChange={() => handleUpdateQuestion(qIdx, 'correctOption', optIdx)}
                                className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <span
                                className={`text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  isCorrect ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {letter}
                              </span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                                placeholder={`Option ${letter}`}
                                className="w-full text-xs bg-transparent border-none focus:outline-none font-medium text-gray-800"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Teacher / AI Explanation */}
                    <div>
                      <label className="text-[11px] font-bold text-gray-600 block mb-1">
                        Pedagogical Explanation (Shown to students after submission):
                      </label>
                      <input
                        type="text"
                        value={q.explanation}
                        onChange={(e) => handleUpdateQuestion(qIdx, 'explanation', e.target.value)}
                        placeholder="Explain why the correct answer is true..."
                        className="w-full text-xs border border-gray-200 bg-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-700"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer buttons */}
            <div className="pt-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPublishing}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition disabled:opacity-50 flex items-center space-x-1.5"
              >
                {isPublishing ? (
                  <span>Publishing Quiz...</span>
                ) : (
                  <>
                    <span>🚀 Publish Quiz to Class</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: STUDENT QUIZ TAKER OR REVIEW
  // ==========================================
  if (!quiz) return null;

  const currentQ = quiz.questions?.[activeQuestionIdx] || quiz.questions?.[0];
  const totalQ = quiz.questions?.length || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden my-auto animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <span className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg">
              💡
            </span>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">{quiz.title}</h3>
              <p className="text-[11px] text-amber-100 font-medium">
                {quiz.topic} • {quiz.points} points total • {quiz.timeLimitMinutes || 10} mins limit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* GRADED RESULT BANNER (If already submitted) */}
          {gradedResult ? (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-400/80 rounded-3xl p-6 text-center space-y-3 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl mx-auto shadow-md">
                  🏆
                </div>
                <div>
                  <h4 className="text-xl font-extrabold text-gray-900">Quiz Completed!</h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Your answers were evaluated and synced to your academic gradebook.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-6 pt-2">
                  <div className="bg-white px-4 py-2.5 rounded-2xl border border-emerald-200 shadow-sm">
                    <span className="text-[10px] text-gray-500 font-bold uppercase block">Your Score</span>
                    <span className="text-2xl font-black text-emerald-700">
                      {gradedResult.overallScore} / {gradedResult.maxScore}
                    </span>
                  </div>

                  <div className="bg-white px-4 py-2.5 rounded-2xl border border-emerald-200 shadow-sm">
                    <span className="text-[10px] text-gray-500 font-bold uppercase block">Accuracy</span>
                    <span className="text-2xl font-black text-teal-700">{gradedResult.percentage}%</span>
                  </div>

                  <div className="bg-white px-4 py-2.5 rounded-2xl border border-emerald-200 shadow-sm">
                    <span className="text-[10px] text-gray-500 font-bold uppercase block">Mastery Level</span>
                    <span className="text-sm font-extrabold capitalize text-purple-700 mt-1 block">
                      {gradedResult.masteryLevel || 'Proficient'}
                    </span>
                  </div>
                </div>

                {gradedResult.feedback && (
                  <p className="text-xs text-emerald-900 font-medium max-w-lg mx-auto bg-white/70 p-3 rounded-xl border border-emerald-200">
                    {gradedResult.feedback}
                  </p>
                )}
              </div>

              {/* DETAILED QUESTION BREAKDOWN */}
              <div className="space-y-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-gray-700">Question-by-Question Review</h5>
                {(gradedResult.breakdown || []).map((item: any, idx: number) => (
                  <div
                    key={item.questionId || idx}
                    className={`p-4 rounded-2xl border transition space-y-3 ${
                      item.isCorrect
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : 'border-red-300 bg-red-50/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                            item.isCorrect ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                          }`}
                        >
                          {item.isCorrect ? '✓' : '✕'}
                        </span>
                        <span className="text-xs font-extrabold text-gray-900">Question {idx + 1}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.isCorrect
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                      >
                        {item.isCorrect ? 'Correct' : 'Needs Review'}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-gray-800 whitespace-pre-wrap">{item.question}</p>

                    {/* Options list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {item.options.map((opt: string, oIdx: number) => {
                        const isStudentChoice = item.studentChoice === oIdx;
                        const isCorrectOption = item.correctOption === oIdx;

                        let style = 'bg-white border-gray-200 text-gray-700';
                        if (isCorrectOption) {
                          style = 'bg-emerald-100 border-emerald-400 text-emerald-900 font-bold';
                        } else if (isStudentChoice && !isCorrectOption) {
                          style = 'bg-red-100 border-red-400 text-red-900 line-through';
                        }

                        return (
                          <div key={oIdx} className={`p-2.5 rounded-xl border text-[11px] flex items-center space-x-2 ${style}`}>
                            <span className="font-bold w-4">{['A', 'B', 'C', 'D'][oIdx]}.</span>
                            <span className="flex-1">{opt}</span>
                            {isCorrectOption && <span className="text-emerald-700 text-xs font-bold">✓ Correct</span>}
                            {isStudentChoice && !isCorrectOption && <span className="text-red-700 text-xs font-bold">Your Choice</span>}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {item.explanation && (
                      <div className="bg-white/80 p-3 rounded-xl border border-gray-200 text-[11px] text-gray-700">
                        <span className="font-bold text-gray-900">💡 Teacher Explanation: </span>
                        <span>{item.explanation}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  Close &amp; Return to Classroom
                </button>
              </div>
            </div>
          ) : (
            /* ACTIVE QUIZ QUESTION TAKER */
            <div className="space-y-6">
              {/* Stepper / Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="font-bold text-gray-700">
                    Question {activeQuestionIdx + 1} of {totalQ}
                  </span>
                  <span>{Object.keys(answers).length} answered</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((activeQuestionIdx + 1) / totalQ) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question Card */}
              {currentQ && (
                <div className="bg-gray-50/70 p-6 rounded-3xl border border-gray-200 space-y-4">
                  <h4 className="text-sm font-bold text-gray-900 whitespace-pre-wrap leading-relaxed">
                    {currentQ.question}
                  </h4>

                  {/* Options */}
                  <div className="space-y-2.5 pt-2">
                    {currentQ.options.map((opt: string, optIdx: number) => {
                      const isSelected = answers[currentQ.id] === optIdx;
                      const letter = ['A', 'B', 'C', 'D'][optIdx] || `${optIdx + 1}`;

                      return (
                        <div
                          key={optIdx}
                          onClick={() => setAnswers((prev) => ({ ...prev, [currentQ.id]: optIdx }))}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center space-x-3 ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20 shadow-sm'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 ${
                              isSelected ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="text-xs font-medium text-gray-800 flex-1">{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Navigation & Submit */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  disabled={activeQuestionIdx === 0}
                  onClick={() => setActiveQuestionIdx((prev) => Math.max(0, prev - 1))}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition"
                >
                  ← Previous
                </button>

                <div className="flex space-x-2">
                  {activeQuestionIdx < totalQ - 1 ? (
                    <button
                      type="button"
                      onClick={() => setActiveQuestionIdx((prev) => Math.min(totalQ - 1, prev + 1))}
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleSubmitAnswers}
                      className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 flex items-center space-x-1.5"
                    >
                      {isSubmitting ? (
                        <span>Evaluating Quiz...</span>
                      ) : (
                        <>
                          <span>✓ Submit Quiz for Assessment</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

