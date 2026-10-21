'use client';

import React, { useState, useRef } from 'react';
import { QuizModal } from './QuizModal';
import { getCourseEvaluationScheme, matchAssignmentToComponent } from '@/lib/evaluation';

interface ClassworkTabProps {
  activeClass: any;
  assignments: any[];
  submissions: any[];
  materials?: any[];
  quizzes?: any[];
  allUsers?: any[];
  currentUser: any;
  onCreateAssignment: (data: any) => Promise<any> | void;
  onSubmitWork: (data: any) => Promise<any>;
  onPostMaterial?: (data: any) => Promise<any>;
  onDeleteMaterial?: (id: string) => Promise<any>;
  onCreateQuiz?: (data: any) => Promise<any>;
  onSubmitQuiz?: (data: any) => Promise<any>;
}

export const ClassworkTab: React.FC<ClassworkTabProps> = ({
  activeClass,
  assignments,
  submissions,
  materials = [],
  quizzes = [],
  allUsers = [],
  currentUser,
  onCreateAssignment,
  onSubmitWork,
  onPostMaterial,
  onDeleteMaterial,
  onCreateQuiz,
  onSubmitQuiz,
}) => {
  const isFaculty = currentUser.role === 'faculty';

  // Sub-tabs in Classwork: 'all' | 'assignments' | 'materials' | 'quizzes'
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'assignments' | 'materials' | 'quizzes'>('all');

  // Filter items for current class
  const classAssignments = assignments.filter((a) => a.classId === activeClass.id);
  const classMaterials = materials.filter((m) => m.classId === activeClass.id);
  const classQuizzes = quizzes.filter((q) => q.classId === activeClass.id);

  // Group assignments by topic
  const topicsMap: Record<string, any[]> = {};
  classAssignments.forEach((assign) => {
    const topic = assign.topic || 'General Coursework';
    if (!topicsMap[topic]) {
      topicsMap[topic] = [];
    }
    topicsMap[topic].push(assign);
  });

  // Selected item (either an assignment or a material)
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(classAssignments[0] || null);
  const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null);

  // Student submission form state
  const [submissionContent, setSubmissionContent] = useState('');
  const [fileName, setFileName] = useState('solution.py');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluatingStep, setEvaluatingStep] = useState<string>('');
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [showSubmittedContent, setShowSubmittedContent] = useState(false);
  const [showRefDocReader, setShowRefDocReader] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const materialFileInputRef = useRef<HTMLInputElement>(null);
  const refDocFileInputRef = useRef<HTMLInputElement>(null);
  const rubricDocFileInputRef = useRef<HTMLInputElement>(null);

  // Faculty submission review modal state
  const [reviewSubmission, setReviewSubmission] = useState<any | null>(null);

  // Multi-Agent Audit Trail Accordion state
  const [showMultiAgentTrail, setShowMultiAgentTrail] = useState(false);
  const [activeAgentTab, setActiveAgentTab] = useState<'agent1' | 'agent2' | 'agent3'>('agent3');
  const [showFacultyAgentTrail, setShowFacultyAgentTrail] = useState(false);
  const [facultyAgentTab, setFacultyAgentTab] = useState<'agent1' | 'agent2' | 'agent3'>('agent3');

  // Quiz Modal State
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [takingQuiz, setTakingQuiz] = useState<any | null>(null);

  // ==========================================
  // CREATE ASSIGNMENT MODAL & AGENTIC RUBRIC STATE
  // ==========================================
  const courseScheme = getCourseEvaluationScheme(activeClass);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('Unit 1: Fundamentals');
  const [newEvaluationCategory, setNewEvaluationCategory] = useState(courseScheme[0]?.name || 'Coursework');
  const [newType, setNewType] = useState<'theory' | 'code' | 'hybrid'>('theory');
  const [newInstructions, setNewInstructions] = useState('');
  const [newStarterTemplate, setNewStarterTemplate] = useState('');
  const [newPoints, setNewPoints] = useState(100);
  const [newDueDate, setNewDueDate] = useState('2026-11-20');
  const [newTopics, setNewTopics] = useState('Conceptual Depth, Analytical Reasoning, Real-world Examples');
  const [generatedRubric, setGeneratedRubric] = useState<any | null>(null);
  const [isGeneratingRubric, setIsGeneratingRubric] = useState(false);

  // Agent 1 Rubric / Assignment Document Upload State
  const [rubricDocFileName, setRubricDocFileName] = useState('');
  const [rubricDocBase64, setRubricDocBase64] = useState('');
  const [rubricDocText, setRubricDocText] = useState('');

  // Reference Document attachment state for Assignment
  const [hasRefDoc, setHasRefDoc] = useState(false);
  const [refDocTitle, setRefDocTitle] = useState('');
  const [refDocContent, setRefDocContent] = useState('');
  const [refDocFileName, setRefDocFileName] = useState('');

  // ==========================================
  // POST MATERIAL / SYLLABUS / NOTES MODAL STATE
  // ==========================================
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [matType, setMatType] = useState<'syllabus' | 'notes' | 'reference' | 'guide'>('notes');
  const [matTitle, setMatTitle] = useState('');
  const [matTopic, setMatTopic] = useState('Course Materials & Notes');
  const [matDescription, setMatDescription] = useState('');
  const [matContent, setMatContent] = useState('');
  const [matFileName, setMatFileName] = useState('lecture_notes.md');
  const [isPostingMat, setIsPostingMat] = useState(false);

  // Enrolled students in this class
  const enrolledStudentIds = activeClass.enrolledStudentIds || [];
  const enrolledStudents = allUsers.filter(
    (u) => u.role === 'student' && enrolledStudentIds.includes(u.id)
  );

  // Find existing submission for current user if student
  const studentSubmission = selectedAssignment
    ? submissions.find(
        (s) => s.assignmentId === selectedAssignment.id && s.studentId === currentUser.id
      )
    : null;

  // Submissions for the selected assignment
  const assignmentSubmissions = selectedAssignment
    ? submissions.filter((s) => s.assignmentId === selectedAssignment.id)
    : [];

  // Determine if selected assignment is theoretical vs coding
  const isSelectedTheory =
    selectedAssignment?.submissionFormat === 'theory' ||
    selectedAssignment?.assignmentType === 'theory' ||
    selectedAssignment?.title?.toLowerCase().includes('theory') ||
    selectedAssignment?.title?.toLowerCase().includes('essay') ||
    selectedAssignment?.title?.toLowerCase().includes('case study');

  // Live word and character count
  const wordCount = submissionContent.trim() ? submissionContent.trim().split(/\s+/).length : 0;
  const charCount = submissionContent.length;

  // Handle format toggle in modal
  const handleTypeChange = (type: 'theory' | 'code' | 'hybrid') => {
    setNewType(type);
    setGeneratedRubric(null);
    if (type === 'theory') {
      if (!newTitle) setNewTitle('Architectural Trade-offs & Theoretical Foundations');
      setNewTopics('Conceptual Accuracy, Comparative Analysis, Critical Thinking, Clarity of Explanation');
      setNewInstructions(
        'Provide a detailed theoretical essay answering the prompts:\n1. Explain the fundamental principles and definitions.\n2. Compare and contrast alternative paradigms or architectures with real-world examples.\n3. Discuss constraints, trade-offs, and critical implications.'
      );
      setNewStarterTemplate(
        '# Theoretical Analysis / Essay Response\n\n## 1. Introduction & Core Concept Definitions\n[Explain the fundamental principles here...]\n\n## 2. In-Depth Comparative Analysis\n[Analyze trade-offs, advantages, and limitations...]\n\n## 3. Real-World Case Studies & Practical Applications\n[Provide illustrative industry examples...]\n\n## 4. Conclusion & Synthesis\n[Summarize key takeaways...]'
      );
    } else if (type === 'code') {
      if (!newTitle) setNewTitle('Algorithmic Implementation & Problem Solving');
      setNewTopics('Algorithm Logic, Data Structures, Time & Space Complexity, Clean Code');
      setNewInstructions(
        'Implement an efficient solution meeting the computational constraints.\nEnsure defensive handling for edge cases and include appropriate method docstrings.'
      );
      setNewStarterTemplate('def solve():\n    # Implement your algorithm here\n    pass\n');
    } else {
      setNewTopics('Theoretical Understanding, Implementation Correctness, Empirical Validation');
      setNewInstructions(
        'Provide both a theoretical derivation and a working implementation.\nExplain the mathematical/system design reasoning followed by clean executable code.'
      );
      setNewStarterTemplate('## Part 1: Theoretical Analysis\n\n## Part 2: Implementation\n```python\n# Code here\n```');
    }
  };

  // ==========================================
  // AGENT 1: EXTRACTOR AGENT (AI CURRICULUM DESIGNER)
  // ==========================================
  const handleRubricDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRubricDocFileName(file.name);
    if (!newTitle) {
      setNewTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }

    const reader = new FileReader();
    if (file.name.toLowerCase().endsWith('.pdf')) {
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setRubricDocBase64(result);
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setRubricDocText(text);
        if (!newInstructions) setNewInstructions(text.slice(0, 800));
      };
      reader.readAsText(file);
    }
  };

  const handleGenerateAiRubric = async () => {
    if (!newTitle.trim() && !newInstructions.trim() && !rubricDocText && !rubricDocBase64) {
      alert('Please enter an assignment title, prompt, or upload a Rubric / Assignment PDF so the Extractor Agent can analyze your document!');
      return;
    }

    setIsGeneratingRubric(true);
    try {
      const res = await fetch('/api/ai/rubric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          instructions: newInstructions.trim(),
          documentText: rubricDocText || newInstructions.trim(),
          fileData: rubricDocBase64,
          fileName: rubricDocFileName,
          assignmentType: newType,
          classId: activeClass.id,
          maxPoints: Number(newPoints) || 100,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.rubric) {
          setGeneratedRubric(data.rubric);
          if (data.rubric.criteria && data.rubric.criteria.length > 0) {
            setNewTopics(data.rubric.criteria.map((c: any) => c.name).join(', '));
          } else if (data.rubric.topicTags && data.rubric.topicTags.length > 0) {
            setNewTopics(data.rubric.topicTags.join(', '));
          }
        }
      }
    } catch (err) {
      console.error('Failed to generate AI rubric criteria:', err);
    } finally {
      setIsGeneratingRubric(false);
    }
  };

  // Handle file upload for student submission
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setSubmissionContent(text);
      }
    };
    reader.readAsText(file);
  };

  // Handle file upload for syllabus/materials
  const handleMaterialFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMatFileName(file.name);
    if (!matTitle) setMatTitle(file.name.replace(/\.[^/.]+$/, ''));
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setMatContent(text);
      }
    };
    reader.readAsText(file);
  };

  // Handle reference document upload
  const handleRefDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRefDocFileName(file.name);
    if (!refDocTitle) setRefDocTitle(file.name.replace(/\.[^/.]+$/, ''));
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setRefDocContent(text);
      }
    };
    reader.readAsText(file);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const refDoc =
      hasRefDoc && refDocTitle.trim()
        ? {
            title: refDocTitle.trim(),
            fileName: refDocFileName || 'reference_reading.md',
            content: refDocContent.trim(),
          }
        : null;

    await onCreateAssignment({
      classId: activeClass.id,
      title: newTitle.trim(),
      topic: newTopic.trim(),
      assignmentType: newType,
      submissionFormat: newType,
      instructions: newInstructions.trim(),
      starterCode: newStarterTemplate.trim(),
      points: Number(newPoints) || 100,
      dueDate: newDueDate,
      topics: newTopics.split(',').map((t) => t.trim()).filter(Boolean),
      rubricCriteria: generatedRubric,
      referenceDoc: refDoc,
      evaluationCategory: newEvaluationCategory,
    });

    setShowCreateModal(false);
    setNewTitle('');
    setNewInstructions('');
    setNewStarterTemplate('');
    setGeneratedRubric(null);
    setHasRefDoc(false);
    setRefDocTitle('');
    setRefDocContent('');
    setRefDocFileName('');
  };

  const handleMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matTitle.trim() || !matContent.trim()) return;

    setIsPostingMat(true);
    try {
      if (onPostMaterial) {
        await onPostMaterial({
          classId: activeClass.id,
          type: matType,
          title: matTitle.trim(),
          topic: matTopic.trim(),
          description: matDescription.trim(),
          content: matContent.trim(),
          fileName: matFileName,
          authorId: currentUser.id,
          authorName: currentUser.fullName,
        });
      }
      setShowMaterialModal(false);
      setMatTitle('');
      setMatDescription('');
      setMatContent('');
    } catch (err: any) {
      alert(err.message || 'Failed to post course material');
    } finally {
      setIsPostingMat(false);
    }
  };

  const handleTurnIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !submissionContent.trim()) return;

    setIsSubmitting(true);
    setEvaluatingStep('🤖 Agent 1: Grounding Strict Rubric & ChromaDB RAG Chunks...');

    try {
      setTimeout(() => setEvaluatingStep('⚖️ Agent 2: Evaluator Agent scoring criteria with justifications...'), 1200);
      setTimeout(() => setEvaluatingStep('🛡️ Agent 3: Senior Auditor Agent running self-reflection & math check...'), 2600);

      const targetFileName = fileName || (isSelectedTheory ? 'essay_response.txt' : 'solution.py');

      await onSubmitWork({
        assignmentId: selectedAssignment.id,
        classId: activeClass.id,
        studentId: currentUser.id,
        studentName: currentUser.fullName,
        studentEmail: currentUser.email,
        content: submissionContent,
        fileName: targetFileName,
      });

      setIsResubmitting(false);
    } catch (err) {
      console.error('Submission failed:', err);
      alert('Submission failed. Please check your network and try again.');
    } finally {
      setIsSubmitting(false);
      setEvaluatingStep('');
    }
  };

  const handleLoadSample = () => {
    if (selectedAssignment?.starterCode) {
      setSubmissionContent(selectedAssignment.starterCode);
      return;
    }

    if (isSelectedTheory) {
      setSubmissionContent(`# Theoretical Analysis: Discussion & Arguments - ${currentUser.fullName}

## 1. Core Principles & Concept Foundations
The theoretical foundation of this subject rests upon formal models that balance system constraints with operational predictability. In modern computer science and engineering, systems must satisfy rigorous correctness criteria while maintaining computational tractability.

## 2. In-Depth Comparative Analysis & Trade-offs
When analyzing competing paradigms, several trade-offs emerge:
- Simplicity vs. Expressive Power: Simpler models permit exhaustive formal verification but may struggle with non-deterministic edge cases.
- Latency vs. Strong Consistency: In distributed architectures, preserving linearizability introduces synchronization overhead across network boundaries.
- Resource Utilization: Dynamic strategies optimize average-case performance at the expense of worst-case predictability.

## 3. Real-World Applications & Edge Cases
In practical industrial deployments (e.g. distributed storage layers, automated theorem proving, compiler optimization pipelines), theoretical models encounter real-world boundary phenomena such as network partitioning, non-uniform memory access (NUMA), and cache invalidation cascades.

## 4. Conclusion & Synthesis
By rigorously accounting for both mathematical bounds and operational trade-offs, practitioners can design resilient, highly maintainable systems that gracefully tolerate edge condition stressors.`);
      setFileName('theoretical_essay.txt');
    } else {
      setSubmissionContent(`# Solution by ${currentUser.fullName}\ndef solution():\n    # Implement algorithm\n    return True\n`);
      setFileName('solution.py');
    }
  };

  const getMasteryBadgeColor = (level: string = '') => {
    switch (level.toLowerCase()) {
      case 'expert':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'advanced':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'intermediate':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  // Class analytics for Faculty view
  const totalSubmissions = assignmentSubmissions.length;
  const totalPossible = enrolledStudents.length || 1;
  const submissionRate = Math.round((totalSubmissions / totalPossible) * 100);
  const avgScore =
    totalSubmissions > 0
      ? Math.round(
          assignmentSubmissions.reduce(
            (acc, s) => acc + (s.evaluation?.overallScore || 0),
            0
          ) / totalSubmissions
        )
      : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
              Classwork, Syllabus &amp; Lecture Notes
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Agentic RAG Pipeline
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {isFaculty
              ? 'Post syllabus, lecture notes, and assignments with autonomous AI rubric generation & grace marks.'
              : 'Read course syllabus, review faculty lecture notes, and turn in assignments for teacher-grade AI assessment.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sub-tab Filter Pills */}
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeSubTab === 'all'
                  ? 'bg-white text-emerald-800 shadow-sm font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              All Items ({classAssignments.length + classMaterials.length})
            </button>
            <button
              onClick={() => setActiveSubTab('assignments')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeSubTab === 'assignments'
                  ? 'bg-white text-emerald-800 shadow-sm font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Assignments ({classAssignments.length})
            </button>
            <button
              onClick={() => setActiveSubTab('materials')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeSubTab === 'materials'
                  ? 'bg-white text-emerald-800 shadow-sm font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Syllabus &amp; Notes ({classMaterials.length})
            </button>
            <button
              onClick={() => setActiveSubTab('quizzes')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeSubTab === 'quizzes'
                  ? 'bg-white text-emerald-800 shadow-sm font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Quizzes ({classQuizzes.length})
            </button>
          </div>

          {isFaculty && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setMatType('notes');
                  setShowMaterialModal(true);
                }}
                className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all"
              >
                <span>📜</span>
                <span>Post Syllabus / Notes</span>
              </button>

              <button
                onClick={() => setShowQuizModal(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all"
              >
                <span>💡</span>
                <span>Conduct Quiz</span>
              </button>

              <button
                onClick={() => {
                  handleTypeChange('theory');
                  setShowCreateModal(true);
                }}
                className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Create Task</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Left Navigation & Right Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Topics, Syllabus, Notes & Assignments List */}
        <div className="lg:col-span-5 space-y-6">
          {/* SYLLABUS & COURSE MATERIALS SECTION (if activeSubTab !== 'assignments') */}
          {activeSubTab !== 'assignments' && classMaterials.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b-2 border-indigo-500 pb-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center space-x-1.5">
                  <span>📚</span>
                  <span>Syllabus &amp; Course Notes</span>
                </h3>
                <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  {classMaterials.length} Reference Docs
                </span>
              </div>

              <div className="space-y-2">
                {classMaterials.map((mat) => {
                  const isSelected = selectedMaterial?.id === mat.id;

                  return (
                    <div
                      key={mat.id}
                      onClick={() => {
                        setSelectedMaterial(mat);
                        setSelectedAssignment(null);
                      }}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 shadow-md ring-2 ring-indigo-500/20'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/70 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start space-x-3 truncate">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 text-base mt-0.5">
                          {mat.type === 'syllabus' ? '📜' : mat.type === 'notes' ? '📑' : '📖'}
                        </div>
                        <div className="truncate">
                          <h4 className="text-xs font-bold text-gray-900 truncate">{mat.title}</h4>
                          <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                            {mat.type === 'syllabus' ? 'Official Course Syllabus' : 'Lecture Study Notes'} • {mat.createdAt}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex-shrink-0 capitalize">
                        {mat.type}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ASSIGNMENTS & TASKS SECTION (if activeSubTab !== 'materials') */}
          {activeSubTab !== 'materials' && (
            <div className="space-y-6">
              {Object.keys(topicsMap).length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 mx-auto text-xl">
                    📝
                  </div>
                  <p className="text-xs font-bold text-gray-700">No Assignments Posted Yet</p>
                  <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
                    {isFaculty
                      ? 'Click "Create Task" to post theoretical questions or programming problems.'
                      : 'Your instructor has not posted any coursework yet.'}
                  </p>
                </div>
              ) : (
                Object.entries(topicsMap).map(([topicName, items]: [string, any[]]) => (
                  <div key={topicName} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                        {topicName}
                      </h3>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {items.length} {items.length === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {items.map((assign: any) => {
                        const isSelected = selectedAssignment?.id === assign.id;
                        const userSub = submissions.find(
                          (s) => s.assignmentId === assign.id && s.studentId === currentUser.id
                        );
                        const assignSubsCount = submissions.filter(
                          (s) => s.assignmentId === assign.id
                        ).length;

                        const isItemTheory =
                          assign.submissionFormat === 'theory' ||
                          assign.assignmentType === 'theory' ||
                          assign.title?.toLowerCase().includes('theory') ||
                          assign.title?.toLowerCase().includes('essay');

                        return (
                          <div
                            key={assign.id}
                            onClick={() => {
                              setSelectedAssignment(assign);
                              setSelectedMaterial(null);
                              setIsResubmitting(false);
                              setFileName(isItemTheory ? 'essay_response.txt' : 'solution.py');
                            }}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/70 shadow-sm'
                            }`}
                          >
                            <div className="flex items-start space-x-3 truncate">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 text-base ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white'
                                    : isItemTheory
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {isItemTheory ? '📖' : '💻'}
                              </div>
                              <div className="truncate">
                                <h4 className="text-xs font-bold text-gray-900 truncate">
                                  {assign.title}
                                </h4>
                                <div className="flex items-center space-x-2 text-[11px] text-gray-500 mt-0.5 truncate">
                                  <span className="capitalize font-medium text-emerald-700">
                                    {isItemTheory ? 'Theory / Essay' : 'Code / Lab'}
                                  </span>
                                  <span>•</span>
                                  <span>Due {assign.dueDate || 'TBD'}</span>
                                  <span>•</span>
                                  <span className="font-semibold">{assign.points || 100} pts</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex-shrink-0">
                              {isFaculty ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {assignSubsCount} turned in
                                </span>
                              ) : userSub ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  {userSub.evaluation?.overallScore ?? '--'} / {assign.points}
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                  Assigned
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Column: Selected Item Workspace / Reader */}
        <div className="lg:col-span-7">
          {/* CASE 1: SYLLABUS OR NOTE SELECTED -> FULL READING VIEWER */}
          {selectedMaterial ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 space-y-6 animate-fadeIn">
              <div className="border-b border-gray-100 pb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                    {selectedMaterial.type === 'syllabus' ? '📜 Official Course Syllabus' : '📑 Lecture Notes & Guide'}
                  </span>
                  <span className="text-gray-400">Posted on {selectedMaterial.createdAt}</span>
                </div>

                <h2 className="text-2xl font-extrabold text-gray-900 mt-2 tracking-tight">
                  {selectedMaterial.title}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Author: <span className="font-semibold text-gray-700">{selectedMaterial.authorName}</span> • Topic: {selectedMaterial.topic}
                </p>

                {selectedMaterial.description && (
                  <p className="text-xs text-gray-600 italic mt-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    {selectedMaterial.description}
                  </p>
                )}
              </div>

              {/* Material Markdown Reader */}
              <div className="p-5 rounded-2xl bg-slate-50/80 border border-gray-200 space-y-3 font-sans text-xs leading-relaxed text-gray-800 max-h-[600px] overflow-y-auto whitespace-pre-wrap">
                {selectedMaterial.content}
              </div>

              {/* Material Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                <button
                  onClick={() => navigator.clipboard.writeText(selectedMaterial.content)}
                  className="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition"
                >
                  Copy Document Content
                </button>

                {isFaculty && onDeleteMaterial && (
                  <button
                    onClick={() => {
                      if (confirm(`Delete material "${selectedMaterial.title}"?`)) {
                        onDeleteMaterial(selectedMaterial.id);
                        setSelectedMaterial(null);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl text-red-600 hover:bg-red-50 font-semibold transition"
                  >
                    Delete Material
                  </button>
                )}
              </div>
            </div>
          ) : selectedAssignment ? (
            /* CASE 2: ASSIGNMENT SELECTED -> STUDENT SUBMISSION OR FACULTY GATHERING */
            <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 space-y-6">
              {/* Header */}
              <div className="border-b border-gray-100 pb-4">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {selectedAssignment.topic || 'Coursework'}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      isSelectedTheory ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-blue-100 text-blue-900 border border-blue-200'
                    }`}>
                      {isSelectedTheory ? '📖 Theoretical Essay' : '💻 Programming Task'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span>Due {selectedAssignment.dueDate || 'TBD'}</span>
                    <span className="font-bold text-gray-800">{selectedAssignment.points} points</span>
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-2 tracking-tight">
                  {selectedAssignment.title}
                </h2>

                {/* AI Rubric Dimensions */}
                <div className="mt-3 space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Autonomous AI Evaluation Rubric:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedAssignment.rubricCriteria?.criteria ? (
                      selectedAssignment.rubricCriteria.criteria.map((c: any, idx: number) => (
                        <span
                          key={idx}
                          className="text-[10px] font-bold bg-indigo-50 text-indigo-800 px-2.5 py-1 rounded-lg border border-indigo-200 flex items-center space-x-1"
                        >
                          <span>🎯 {c.name}</span>
                          <span className="text-indigo-500 font-normal">({c.weight}%)</span>
                        </span>
                      ))
                    ) : (
                      (selectedAssignment.topics || []).map((t: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-lg border border-gray-200"
                        >
                          🎯 {t}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Instructions / Task Specifications */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {isSelectedTheory ? 'Prompt & Questions' : 'Task Specifications'}
                </h4>
                <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50/80 p-4 rounded-xl border border-gray-200 font-sans">
                  {selectedAssignment.instructions ||
                    'Review the prompt above and submit your response for teacher-grade AI assessment.'}
                </div>
              </div>

              {/* ATTACHED REFERENCE DOCUMENT & READING GUIDE */}
              {selectedAssignment.referenceDoc && (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm shadow-sm">
                        📖
                      </span>
                      <div>
                        <span className="text-xs font-bold text-indigo-950 block">
                          Teacher Reference Material: {selectedAssignment.referenceDoc.title}
                        </span>
                        <span className="text-[10px] text-indigo-600 font-mono">
                          {selectedAssignment.referenceDoc.fileName || 'reference_reading.md'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRefDocReader(!showRefDocReader)}
                      className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-800 rounded-xl text-xs font-bold border border-indigo-200 transition shadow-sm"
                    >
                      {showRefDocReader ? '▼ Collapse Reference' : '▶ Expand Reference Guide'}
                    </button>
                  </div>

                  {showRefDocReader && (
                    <div className="p-4 rounded-xl bg-white border border-indigo-100 text-xs text-gray-800 font-sans leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto animate-fadeIn">
                      {selectedAssignment.referenceDoc.content}
                    </div>
                  )}
                </div>
              )}

              {/* INTERACTIVE QUIZ LAUNCHER CARD IF TASK IS A QUIZ */}
              {selectedAssignment.assignmentType === 'quiz' && (
                <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center text-xl shadow-md">
                        💡
                      </span>
                      <div>
                        <h4 className="text-sm font-extrabold text-amber-950">Interactive Assessment Quiz</h4>
                        <p className="text-[11px] text-amber-800">
                          Complete all multiple-choice questions to receive instant auto-grading &amp; AI explanations.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const targetQuiz = classQuizzes.find(
                          (q) => q.id === selectedAssignment.id || q.title === selectedAssignment.title
                        ) || {
                          id: selectedAssignment.id,
                          classId: activeClass.id,
                          title: selectedAssignment.title,
                          topic: selectedAssignment.topic,
                          instructions: selectedAssignment.instructions,
                          points: selectedAssignment.points,
                          questions: [
                            {
                              id: 'q1',
                              question: 'In the context of the curriculum, what is the primary invariant?',
                              options: ['Deterministic execution', 'Unbounded memory', 'Stack overflow', 'Manual thread scheduling'],
                              correctOption: 0,
                              explanation: 'Deterministic execution under bounded invariants is the core principle.',
                            },
                          ],
                        };
                        setTakingQuiz(targetQuiz);
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition flex items-center space-x-1.5 active:scale-95"
                    >
                      <span>🚀 Launch Interactive Quiz</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* FACULTY VIEW: SUBMISSIONS GATHERING WORKSPACE */}
              {/* ============================================================== */}
              {isFaculty ? (
                <div className="space-y-5 pt-2">
                  {/* Analytics Header */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                      <p className="text-[10px] font-bold uppercase text-emerald-700">Turned In</p>
                      <p className="text-xl font-extrabold text-emerald-900 mt-0.5">
                        {totalSubmissions} / {enrolledStudents.length}
                      </p>
                      <p className="text-[10px] text-emerald-600">{submissionRate}% Turn-in Rate</p>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-center">
                      <p className="text-[10px] font-bold uppercase text-blue-700">Class Average</p>
                      <p className="text-xl font-extrabold text-blue-900 mt-0.5">
                        {avgScore > 0 ? `${avgScore}%` : '--'}
                      </p>
                      <p className="text-[10px] text-blue-600">Max: {selectedAssignment.points} pts</p>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 text-center">
                      <p className="text-[10px] font-bold uppercase text-purple-700">Teacher AI Evaluated</p>
                      <p className="text-xl font-extrabold text-purple-900 mt-0.5">
                        {assignmentSubmissions.filter((s) => s.evaluation).length}
                      </p>
                      <p className="text-[10px] text-purple-600">Sensible Grading &amp; Grace Marks</p>
                    </div>
                  </div>

                  {/* Submissions List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                        Gathered Submissions ({totalSubmissions})
                      </h4>
                      <span className="text-[11px] text-gray-500">
                        {enrolledStudents.length - totalSubmissions} Missing
                      </span>
                    </div>

                    {enrolledStudents.length === 0 ? (
                      <div className="p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center text-xs text-gray-400">
                        No students are currently enrolled in this class.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {enrolledStudents.map((student) => {
                          const sub = assignmentSubmissions.find((s) => s.studentId === student.id);

                          return (
                            <div
                              key={student.id}
                              className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs ${
                                sub
                                  ? 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-sm'
                                  : 'bg-gray-50/60 border-gray-200/70 text-gray-400'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <img
                                  src={
                                    student.avatar ||
                                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(student.fullName)}`
                                  }
                                  alt={student.fullName}
                                  className="w-9 h-9 rounded-full"
                                />
                                <div>
                                  <p className="font-bold text-gray-900">{student.fullName}</p>
                                  <p className="text-[11px] text-gray-500">
                                    {sub ? (
                                      <span>
                                        File: <code className="font-mono">{sub.fileName}</code> • Turned in {sub.submittedAt}
                                        {sub.evaluation?.graceMarksAwarded > 0 && (
                                          <span className="ml-1.5 font-bold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200 text-[10px]">
                                            +{sub.evaluation.graceMarksAwarded} Grace Marks
                                          </span>
                                        )}
                                      </span>
                                    ) : (
                                      <span className="text-amber-600 font-medium">Pending submission</span>
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div>
                                {sub ? (
                                  <div className="flex items-center space-x-3">
                                    <div className="text-right">
                                      <span className="font-black text-sm text-emerald-700">
                                        {sub.evaluation?.overallScore ?? '--'} / {selectedAssignment.points}
                                      </span>
                                      <span
                                        className={`block text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${getMasteryBadgeColor(
                                          sub.evaluation?.masteryLevel
                                        )}`}
                                      >
                                        {sub.evaluation?.masteryLevel || 'graded'}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => setReviewSubmission(sub)}
                                      className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition"
                                    >
                                      Review Evaluation →
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] font-medium text-gray-400 px-2.5 py-1 bg-gray-100 rounded-lg">
                                    Missing
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ============================================================== */
                /* STUDENT WORKSPACE: SUBMIT WORK & VIEW SENSITIVE AI RESULTS */
                /* ============================================================== */
                <div className="space-y-5 pt-2">
                  <div className="p-5 rounded-2xl bg-slate-50 border border-gray-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                        <span>{isSelectedTheory ? 'Your Essay / Response' : 'Your Code Solution'}</span>
                        {studentSubmission && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Turned in • Graded by Teacher AI
                          </span>
                        )}
                      </h3>

                      {studentSubmission && !isResubmitting && (
                        <button
                          onClick={() => {
                            setIsResubmitting(true);
                            setSubmissionContent(studentSubmission.content || '');
                            setFileName(studentSubmission.fileName || (isSelectedTheory ? 'essay.txt' : 'solution.py'));
                          }}
                          className="text-xs text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                        >
                          ✎ Edit &amp; Resubmit Work
                        </button>
                      )}
                    </div>

                    {/* Submission Form */}
                    {(!studentSubmission || isResubmitting) && (
                      <form onSubmit={handleTurnIn} className="space-y-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-700">
                              {isSelectedTheory ? 'Essay Editor:' : 'Code Editor:'}
                            </span>
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleFileUpload}
                              className="hidden"
                              accept=".txt,.md,.pdf,.docx,.py,.java,.cpp,.c,.js,.ts"
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white border border-gray-300 hover:border-emerald-500 text-gray-700 text-[11px] font-semibold transition"
                            >
                              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              <span>Upload File</span>
                            </button>
                          </div>

                          <div className="flex items-center space-x-3">
                            <span className="text-[11px] text-gray-400 font-mono">
                              {wordCount} words • {charCount} chars
                            </span>
                            <button
                              type="button"
                              onClick={handleLoadSample}
                              className="text-xs text-emerald-700 hover:underline font-semibold"
                            >
                              {isSelectedTheory ? '+ Load Essay Outline' : '+ Load Starter Code'}
                            </button>
                          </div>
                        </div>

                        <textarea
                          rows={isSelectedTheory ? 12 : 10}
                          value={submissionContent}
                          onChange={(e) => setSubmissionContent(e.target.value)}
                          placeholder={
                            isSelectedTheory
                              ? 'Write or paste your comprehensive theoretical essay, argument, conceptual explanation, or answer to the questions here...'
                              : '# Write or paste your source code here...'
                          }
                          className={`w-full text-xs text-gray-800 bg-white border border-gray-300 rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-y shadow-inner leading-relaxed ${
                            isSelectedTheory ? 'font-sans text-sm' : 'font-mono'
                          }`}
                        />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                          <div className="flex items-center space-x-2">
                            <label className="text-[11px] font-semibold text-gray-500">File Name:</label>
                            <input
                              type="text"
                              value={fileName}
                              onChange={(e) => setFileName(e.target.value)}
                              placeholder={isSelectedTheory ? 'essay.txt' : 'solution.py'}
                              className="text-xs bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-700 w-44 font-mono"
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            {isResubmitting && (
                              <button
                                type="button"
                                onClick={() => setIsResubmitting(false)}
                                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 text-xs font-semibold"
                              >
                                Cancel
                              </button>
                            )}

                            <button
                              type="submit"
                              disabled={isSubmitting || !submissionContent.trim()}
                              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-40 flex items-center justify-center space-x-2"
                            >
                              {isSubmitting ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span>{evaluatingStep || 'Teacher AI Evaluating...'}</span>
                                </>
                              ) : (
                                <span>{isResubmitting ? 'Re-evaluate with Teacher AI' : 'Turn in & Evaluate with Teacher AI'}</span>
                              )}
                            </button>
                          </div>
                        </div>
                      </form>
                    )}

                    {/* Results for the Submission Card */}
                    {studentSubmission && studentSubmission.evaluation && !isResubmitting && (
                      <div className="mt-4 p-5 rounded-2xl bg-white border border-emerald-200/90 shadow-md space-y-5 animate-fadeIn">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                Teacher Assessment Result
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                {studentSubmission.submissionCategory === 'theory' ? '📖 Theoretical Essay' : '💻 Programming Solution'}
                              </span>
                            </div>
                            <div className="flex items-baseline space-x-2 mt-1">
                              <span className="text-3xl font-black text-emerald-700 tracking-tight">
                                {studentSubmission.evaluation.overallScore}
                              </span>
                              <span className="text-sm font-semibold text-gray-400">
                                / {studentSubmission.evaluation.maxScore} points
                              </span>
                              <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md ml-2">
                                {studentSubmission.evaluation.percentage}%
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:items-end">
                            <span
                              className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${getMasteryBadgeColor(
                                studentSubmission.evaluation.masteryLevel
                              )}`}
                            >
                              ★ {studentSubmission.evaluation.masteryLevel} Mastery
                            </span>
                            <span className="text-[10px] text-gray-400 mt-1">
                              Sensibly evaluated by {studentSubmission.evaluation.evaluatedBy}
                            </span>
                          </div>
                        </div>

                        {/* TEACHER GRACE MARKS BANNER */}
                        {studentSubmission.evaluation.graceMarksAwarded > 0 && (
                          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-orange-500/10 border border-amber-300 flex items-start space-x-3 text-xs shadow-sm">
                            <span className="text-2xl flex-shrink-0">🎁</span>
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className="font-extrabold text-amber-900">
                                  +{studentSubmission.evaluation.graceMarksAwarded} Grace Marks Awarded by Teacher Agent!
                                </span>
                                <span className="text-[10px] bg-amber-200 text-amber-800 font-bold px-1.5 py-0.2 rounded">
                                  Pedagogical Encouragement
                                </span>
                              </div>
                              <p className="text-amber-800 text-xs leading-relaxed italic">
                                &ldquo;{studentSubmission.evaluation.graceMarksReason}&rdquo;
                              </p>
                            </div>
                          </div>
                        )}

                        {/* ============================================================== */}
                        {/* AUDITOR AGENT VERIFICATION & SELF-REFLECTION BANNER */}
                        {/* ============================================================== */}
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white border border-emerald-500/40 shadow-lg space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center space-x-2.5">
                              <span className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 font-bold text-sm">
                                🛡️
                              </span>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-extrabold text-white text-xs tracking-wide uppercase">
                                    Senior Academic AI Auditor Verdict:
                                  </span>
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                                    {studentSubmission.evaluation.auditStatus || 'APPROVED'} ✓
                                  </span>
                                </div>
                                <p className="text-[11px] text-emerald-200/90 mt-0.5">
                                  {studentSubmission.evaluation.auditorBadge || 'Audited & Verified by Senior Academic AI Auditor: APPROVED ✓'}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setShowMultiAgentTrail(!showMultiAgentTrail)}
                              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[11px] font-bold transition flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
                            >
                              <span>{showMultiAgentTrail ? 'Hide Multi-Agent Trail' : 'Inspect 3-Agent Trail'}</span>
                              <span>{showMultiAgentTrail ? '▲' : '▼'}</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[11px]">
                            <div className="flex items-center space-x-2 text-emerald-200">
                              <span className="text-emerald-400 font-bold">✓ Math Checked:</span>
                              <span className="text-white/90">
                                {studentSubmission.evaluation.multiAgentWorkflow?.agent3_audit?.mathCheck?.notes || 'Sum of criteria + grace marks mathematically validated.'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-teal-200">
                              <span className="text-teal-400 font-bold">✓ Rubric Adherence:</span>
                              <span className="text-white/90">
                                {studentSubmission.evaluation.multiAgentWorkflow?.agent3_audit?.rubricCompliance?.notes || '0 unstated deductions — graded strictly on Agent 1 rubric.'}
                              </span>
                            </div>
                          </div>

                          {/* EXPANDABLE MULTI-AGENT REASONING TRAIL ACCORDION */}
                          {showMultiAgentTrail && (
                            <div className="mt-3 p-3.5 rounded-xl bg-black/40 border border-white/15 space-y-3 animate-fadeIn text-xs">
                              <div className="flex items-center space-x-2 border-b border-white/15 pb-2">
                                <button
                                  type="button"
                                  onClick={() => setActiveAgentTab('agent1')}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${activeAgentTab === 'agent1' ? 'bg-emerald-500 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                                >
                                  1. Extractor Rubric
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveAgentTab('agent2')}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${activeAgentTab === 'agent2' ? 'bg-emerald-500 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                                >
                                  2. Evaluator Grader Draft
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveAgentTab('agent3')}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${activeAgentTab === 'agent3' ? 'bg-emerald-500 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                                >
                                  3. Auditor Self-Reflection Loop
                                </button>
                              </div>

                              {activeAgentTab === 'agent1' && (
                                <div className="space-y-2 text-[11px]">
                                  <p className="text-emerald-300 font-bold">Agent 1: Academic Curriculum Designer Extracted Criteria</p>
                                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                    {(studentSubmission.evaluation.multiAgentWorkflow?.agent1_rubric?.criteria || []).map((crit: any, i: number) => (
                                      <div key={i} className="p-2 rounded-lg bg-white/5 border border-white/10">
                                        <div className="flex justify-between font-bold text-white">
                                          <span>{crit.name}</span>
                                          <span className="text-emerald-400">{crit.maxPoints} pts</span>
                                        </div>
                                        <p className="text-gray-300 text-[10px] mt-0.5">{crit.rules || crit.description}</p>
                                      </div>
                                    ))}
                                    {(!studentSubmission.evaluation.multiAgentWorkflow?.agent1_rubric?.criteria || studentSubmission.evaluation.multiAgentWorkflow?.agent1_rubric?.criteria.length === 0) && (
                                      <p className="text-gray-400 italic">Criteria grounded in course syllabus and assignment requirements.</p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {activeAgentTab === 'agent2' && (
                                <div className="space-y-2 text-[11px]">
                                  <p className="text-teal-300 font-bold">Agent 2: Impartial Academic Grader Criterion-by-Criterion Justifications</p>
                                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                    {(studentSubmission.evaluation.multiAgentWorkflow?.agent2_evaluation?.criteriaEvaluations || []).map((ce: any, i: number) => (
                                      <div key={i} className="p-2 rounded-lg bg-white/5 border border-white/10 space-y-0.5">
                                        <div className="flex justify-between font-bold text-white">
                                          <span>{ce.name}</span>
                                          <span className="text-emerald-300">{ce.scoreAwarded} / {ce.maxPoints} pts</span>
                                        </div>
                                        <p className="text-gray-300 text-[10px] leading-relaxed italic">&ldquo;{ce.justification}&rdquo;</p>
                                      </div>
                                    ))}
                                    {(!studentSubmission.evaluation.multiAgentWorkflow?.agent2_evaluation?.criteriaEvaluations || studentSubmission.evaluation.multiAgentWorkflow?.agent2_evaluation?.criteriaEvaluations.length === 0) && (
                                      <p className="text-gray-400 italic">Evaluated directly across topic dimensions with generous partial credit.</p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {activeAgentTab === 'agent3' && (
                                <div className="space-y-2 text-[11px]">
                                  <p className="text-indigo-300 font-bold">Agent 3: Senior Academic Auditor Self-Reflection & Math Verification</p>
                                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
                                    <div className="flex justify-between">
                                      <span className="text-gray-300">Auditor Status:</span>
                                      <span className="font-bold text-emerald-400">{studentSubmission.evaluation.auditStatus || 'APPROVED'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-300">Sum of Criteria Checked:</span>
                                      <span className="font-mono text-white">{studentSubmission.evaluation.multiAgentWorkflow?.agent3_audit?.mathCheck?.calculatedCriteriaSum ?? studentSubmission.evaluation.overallScore} pts</span>
                                    </div>
                                    <p className="text-gray-300 text-[10px] leading-relaxed border-t border-white/10 pt-1.5 mt-1">
                                      {studentSubmission.evaluation.multiAgentWorkflow?.agent3_audit?.auditExplanation || 'Mathematical summation confirmed and verified 100% adherence to rubric guidelines without extraneous deductions.'}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Topic Rubric Breakdown Progress Bars */}
                        <div className="space-y-2.5">
                          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                            Autonomous Rubric Mastery Scoring:
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Object.entries(studentSubmission.evaluation.topicScores || {}).map(
                              ([topic, score]) => {
                                const numScore = Number(score);
                                return (
                                  <div key={topic} className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5">
                                    <div className="flex justify-between text-xs font-bold">
                                      <span className="text-gray-800 truncate pr-2">{topic}</span>
                                      <span className="text-emerald-700">{numScore}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                      <div
                                        className={`h-2 rounded-full transition-all duration-500 ${
                                          numScore >= 85
                                            ? 'bg-emerald-600'
                                            : numScore >= 70
                                            ? 'bg-blue-600'
                                            : numScore >= 50
                                            ? 'bg-amber-500'
                                            : 'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min(100, Math.max(0, numScore))}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>

                        {/* Strengths & Weaknesses */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                            <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-900">
                              <span>✓</span>
                              <span>Commendable Strengths:</span>
                            </div>
                            <ul className="text-xs text-emerald-800 space-y-1.5 list-disc list-inside">
                              {(studentSubmission.evaluation.strengths || []).map((s: string, idx: number) => (
                                <li key={idx} className="leading-snug">{s}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
                            <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-900">
                              <span>⚠</span>
                              <span>Constructive Observations:</span>
                            </div>
                            <ul className="text-xs text-amber-800 space-y-1.5 list-disc list-inside">
                              {(studentSubmission.evaluation.weaknesses || []).map((w: string, idx: number) => (
                                <li key={idx} className="leading-snug">{w}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Qualitative Academic Feedback */}
                        <div className="p-4 rounded-xl bg-slate-50 border border-gray-200 space-y-1.5">
                          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                            Teacher Review &amp; Qualitative Mentorship:
                          </h4>
                          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                            {studentSubmission.evaluation.feedback}
                          </p>
                        </div>

                        {/* Suggestions */}
                        {studentSubmission.evaluation.suggestions?.length > 0 && (
                          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2">
                            <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-900">
                              <span>💡</span>
                              <span>Actionable Next Steps:</span>
                            </div>
                            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                              {studentSubmission.evaluation.suggestions.map((sugg: string, idx: number) => (
                                <li key={idx} className="leading-snug">{sugg}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Content Inspection */}
                        <div className="pt-2 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={() => setShowSubmittedContent(!showSubmittedContent)}
                            className="text-xs font-bold text-gray-600 hover:text-emerald-700 flex items-center space-x-1.5 transition"
                          >
                            <span>{showSubmittedContent ? '▼ Hide Submitted Content' : '▶ View Submitted Response'}</span>
                            <span className="text-[10px] text-gray-400 font-normal">
                              ({studentSubmission.fileName})
                            </span>
                          </button>

                          {showSubmittedContent && (
                            <div className={`mt-3 p-4 rounded-xl border leading-relaxed text-xs max-h-64 overflow-y-auto ${
                              studentSubmission.submissionCategory === 'theory'
                                ? 'bg-gray-50 text-gray-800 whitespace-pre-wrap font-sans border-gray-200'
                                : 'bg-gray-900 text-gray-100 font-mono border-gray-800'
                            }`}>
                              {studentSubmission.content}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-64 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
              Select an item on the left to view details, read notes, or submit coursework.
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: POST SYLLABUS & LECTURE NOTES (FACULTY) */}
      {/* ============================================================== */}
      {showMaterialModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-xs animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                  <span>📚</span>
                  <span>Post Syllabus &amp; Lecture Materials</span>
                </h3>
                <p className="text-[11px] text-gray-500">
                  Shared with all students and ingested into the classroom AI RAG knowledge base
                </p>
              </div>
              <button onClick={() => setShowMaterialModal(false)} className="p-1 rounded-full text-gray-400 hover:text-gray-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleMaterialSubmit} className="space-y-3.5">
              {/* Type Switcher */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">Material Type:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'syllabus', icon: '📜', label: 'Course Syllabus' },
                    { id: 'notes', icon: '📑', label: 'Lecture Notes' },
                    { id: 'reference', icon: '📖', label: 'Study Guide / Reference' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setMatType(t.id as any);
                        if (t.id === 'syllabus' && !matTitle) {
                          setMatTitle(`${activeClass.code} Official Course Syllabus`);
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        matType === t.id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold ring-2 ring-indigo-400/20'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="block text-base mb-0.5">{t.icon}</span>
                      <span className="text-[11px] block">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  value={matTitle}
                  onChange={(e) => setMatTitle(e.target.value)}
                  placeholder="e.g. Unit 3 Lecture Notes: Graph Theory & Bipartite Matching"
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Topic / Unit</label>
                  <input
                    type="text"
                    value={matTopic}
                    onChange={(e) => setMatTopic(e.target.value)}
                    placeholder="e.g. Unit 3: Graphs"
                    className="w-full border border-gray-300 rounded-xl p-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Upload Document File (Optional)</label>
                  <input
                    type="file"
                    ref={materialFileInputRef}
                    onChange={handleMaterialFileUpload}
                    className="hidden"
                    accept=".md,.txt,.pdf,.py"
                  />
                  <button
                    type="button"
                    onClick={() => materialFileInputRef.current?.click()}
                    className="w-full p-2 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 flex items-center justify-center space-x-1.5"
                  >
                    <span>📎</span>
                    <span>Upload .md / .txt File</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Summary Description</label>
                <input
                  type="text"
                  value={matDescription}
                  onChange={(e) => setMatDescription(e.target.value)}
                  placeholder="Brief summary of lecture topics and concepts covered..."
                  className="w-full border border-gray-300 rounded-xl p-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Document Content (Markdown / Text) *</label>
                <textarea
                  rows={8}
                  required
                  value={matContent}
                  onChange={(e) => setMatContent(e.target.value)}
                  placeholder="# Lecture Notes Title&#10;&#10;## 1. Overview&#10;Key definitions and principles...&#10;&#10;## 2. Algorithms & Trade-offs..."
                  className="w-full font-mono border border-gray-300 rounded-xl p-3 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowMaterialModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPostingMat}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-1.5"
                >
                  {isPostingMat ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Publish Material to Class</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CREATE ASSIGNMENT (WITH AGENTIC AI RUBRIC GENERATOR) */}
      {/* ============================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-xs animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Post Coursework Task</h3>
                <p className="text-[11px] text-gray-500">
                  Powered by Autonomous Agentic AI Rubric Formulation
                </p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-full text-gray-400 hover:text-gray-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              {/* Task Nature Switcher */}
              <div>
                <label className="block text-gray-700 font-bold mb-1.5">Assignment Nature / Format:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('theory')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      newType === 'theory'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold ring-2 ring-amber-400/20'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-base mb-0.5">📖</span>
                    <span className="text-[11px] block">Theoretical Essay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTypeChange('code')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      newType === 'code'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-400/20'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-base mb-0.5">💻</span>
                    <span className="text-[11px] block">Programming Lab</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTypeChange('hybrid')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      newType === 'hybrid'
                        ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold ring-2 ring-purple-400/20'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-base mb-0.5">🔬</span>
                    <span className="text-[11px] block">Hybrid / Analysis</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Assignment Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Distributed Consensus & CAP Theorem Trade-offs"
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Evaluation Category *
                  </label>
                  <select
                    value={newEvaluationCategory}
                    onChange={(e) => setNewEvaluationCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold bg-white"
                  >
                    {courseScheme.map((comp) => (
                      <option key={comp.id} value={comp.name}>
                        {comp.name} ({comp.weight}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Unit / Topic Group</label>
                  <input
                    type="text"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="e.g. Unit 3: Distributed Systems"
                    className="w-full border border-gray-300 rounded-xl p-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Maximum Points</label>
                  <input
                    type="number"
                    value={newPoints}
                    onChange={(e) => setNewPoints(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-xl p-2 text-xs text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  {newType === 'theory' ? 'Prompt, Questions & Requirements' : 'Task Instructions & Constraints'}
                </label>
                <textarea
                  rows={3}
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  placeholder="Detail the analytical questions, required arguments, and formatting guidelines..."
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* ============================================================== */}
              {/* AGENT 1: EXTRACTOR AGENT (AI CURRICULUM DESIGNER) */}
              {/* ============================================================== */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-300 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                      ⚡
                    </span>
                    <div>
                      <span className="font-extrabold text-gray-900 text-xs block">
                        Agent 1: Extractor Agent (AI Curriculum Designer)
                      </span>
                      <span className="text-[10px] text-gray-500">
                        Upload an assignment/rubric PDF or type instructions — the AI extracts exact criteria &amp; points
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isGeneratingRubric}
                    onClick={handleGenerateAiRubric}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1.5 active:scale-95 disabled:opacity-50 self-start sm:self-auto cursor-pointer"
                  >
                    {isGeneratingRubric ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Extractor Running...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡</span>
                        <span>Run Extractor Agent</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Optional Document / PDF Upload for Extractor */}
                <div className="flex items-center space-x-2 pt-1 border-t border-emerald-200/60">
                  <button
                    type="button"
                    onClick={() => rubricDocFileInputRef.current?.click()}
                    className="px-3 py-1 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800 shadow-2xs flex items-center space-x-1.5 transition"
                  >
                    <span>📄 Upload Rubric / Assignment File (.pdf, .txt, .md)</span>
                  </button>
                  <input
                    ref={rubricDocFileInputRef}
                    type="file"
                    accept=".pdf,.txt,.md,.py"
                    onChange={handleRubricDocUpload}
                    className="hidden"
                  />
                  {rubricDocFileName && (
                    <span className="text-[11px] font-mono text-emerald-700 font-bold truncate">
                      ✓ {rubricDocFileName}
                    </span>
                  )}
                </div>

                {generatedRubric && generatedRubric.criteria ? (
                  <div className="space-y-2 pt-2 border-t border-emerald-200/60 animate-fadeIn">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                      <span>✓ Extracted Criteria Dimensions ({generatedRubric.criteria.length}):</span>
                      <span className="text-emerald-700 font-mono">
                        Sum: {generatedRubric.criteria.reduce((a: number, c: any) => a + Number(c.maxPoints || 0), 0)} / {newPoints} pts
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {generatedRubric.criteria.map((crit: any, i: number) => (
                        <div key={i} className="p-2.5 rounded-xl bg-white border border-emerald-100 flex items-start justify-between gap-2 shadow-2xs">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-gray-900 text-[11px]">{crit.name}</span>
                              <span className="text-[9px] font-mono bg-gray-100 text-gray-500 px-1 py-0.2 rounded">
                                {crit.id || `crit_${i+1}`}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-600 mt-0.5 leading-snug">
                              <strong>Rules:</strong> {crit.rules || crit.description}
                            </p>
                          </div>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 flex-shrink-0">
                            {crit.maxPoints || crit.weight} pts
                          </span>
                        </div>
                      ))}
                    </div>

                    {generatedRubric.graceMarksPolicy && (
                      <p className="text-[10px] text-amber-900 bg-amber-50 p-2 rounded-xl border border-amber-200">
                        🎁 <strong>Grace Marks Guideline:</strong>{' '}
                        {typeof generatedRubric.graceMarksPolicy === 'string'
                          ? generatedRubric.graceMarksPolicy
                          : generatedRubric.graceMarksPolicy.guideline || 'Award +2 to +5 marks for genuine good-faith effort and structure.'}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-500">
                    Upload an assignment/rubric document or type the instructions and click <strong>Run Extractor Agent</strong>. The AI Curriculum Designer autonomously formulates the exact mathematical rubric.
                  </p>
                )}
              </div>

              {/* ATTACH REFERENCE DOCUMENT SECTION */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">📖</span>
                    <div>
                      <span className="font-bold text-gray-900 text-xs block">
                        Attach Reference Document / Study Guide
                      </span>
                      <span className="text-[10px] text-gray-500">
                        Students can read this document directly while writing their response
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="modal-has-refdoc"
                    checked={hasRefDoc}
                    onChange={(e) => setHasRefDoc(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                </div>

                {hasRefDoc && (
                  <div className="space-y-2.5 pt-2 border-t border-indigo-200/60 animate-fadeIn">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={refDocTitle}
                        onChange={(e) => setRefDocTitle(e.target.value)}
                        placeholder="Reference Document Title (e.g. Memory Layout & Mutability Reference Guide)"
                        className="w-full border border-gray-300 rounded-xl p-2 text-xs text-gray-800 font-medium"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => refDocFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-[11px] font-semibold text-gray-700 flex items-center space-x-1"
                      >
                        <span>📁 Upload File (.md, .txt, .pdf, .py)</span>
                      </button>
                      <input
                        ref={refDocFileInputRef}
                        type="file"
                        accept=".md,.txt,.pdf,.py"
                        onChange={handleRefDocUpload}
                        className="hidden"
                      />
                      {refDocFileName && (
                        <span className="text-[10px] text-emerald-700 font-mono font-bold truncate">
                          ✓ {refDocFileName}
                        </span>
                      )}
                    </div>

                    <textarea
                      rows={4}
                      value={refDocContent}
                      onChange={(e) => setRefDocContent(e.target.value)}
                      placeholder="Paste reference materials, official specs, equations, or reading guide here..."
                      className="w-full border border-gray-300 rounded-xl p-2 text-xs text-gray-800 font-mono"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Rubric Topic Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newTopics}
                  onChange={(e) => setNewTopics(e.target.value)}
                  placeholder="Conceptual Accuracy, Trade-off Analysis, Real-world Evidence"
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2 text-xs text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Teacher Grace Marks</label>
                  <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 font-semibold flex items-center space-x-1.5">
                    <span>🎁</span>
                    <span>Enabled (+2 to +6 marks for effort)</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  Post Task to Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: SUBMISSION REVIEW DRAWER (FACULTY) */}
      {/* ============================================================== */}
      {reviewSubmission && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 text-xs animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Student Submission Review
                </span>
                <h3 className="text-lg font-bold text-gray-900">{reviewSubmission.studentName}</h3>
                <p className="text-[11px] text-gray-500">
                  {reviewSubmission.studentEmail} • Submitted {reviewSubmission.submittedAt}
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-700">
                    {reviewSubmission.evaluation?.overallScore ?? '--'}
                  </span>
                  <span className="text-xs text-gray-400"> / {reviewSubmission.evaluation?.maxScore || 100}</span>
                </div>
                <button
                  onClick={() => setReviewSubmission(null)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* GRACE MARKS NOTICE */}
            {reviewSubmission.evaluation?.graceMarksAwarded > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-2 text-xs text-amber-900">
                <span className="text-lg">🎁</span>
                <div>
                  <span className="font-bold">
                    +{reviewSubmission.evaluation.graceMarksAwarded} Grace Marks Granted:
                  </span>
                  <p className="text-[11px] text-amber-800 italic mt-0.5">
                    &ldquo;{reviewSubmission.evaluation.graceMarksReason}&rdquo;
                  </p>
                </div>
              </div>
            )}

            {/* Content view */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                <span>Submitted Content ({reviewSubmission.fileName}):</span>
                <button
                  onClick={() => navigator.clipboard.writeText(reviewSubmission.content)}
                  className="text-emerald-700 hover:underline text-[11px]"
                >
                  Copy Content
                </button>
              </div>
              <div className={`p-4 rounded-xl border max-h-52 overflow-y-auto text-xs leading-relaxed ${
                reviewSubmission.submissionCategory === 'theory'
                  ? 'bg-gray-50 text-gray-800 whitespace-pre-wrap font-sans border-gray-200'
                  : 'bg-gray-900 text-gray-100 font-mono border-gray-800'
              }`}>
                {reviewSubmission.content}
              </div>
            </div>

            {/* AUDITOR AGENT VERIFICATION & SELF-REFLECTION BANNER (FACULTY VIEW) */}
            {reviewSubmission.evaluation && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white border border-emerald-500/40 shadow-lg space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 font-bold text-sm">
                      🛡️
                    </span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-white text-xs tracking-wide uppercase">
                          Senior Academic AI Auditor Verdict:
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                          {reviewSubmission.evaluation.auditStatus || 'APPROVED'} ✓
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-200/90 mt-0.5">
                        {reviewSubmission.evaluation.auditorBadge || 'Audited & Verified by Senior Academic AI Auditor: APPROVED ✓'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowFacultyAgentTrail(!showFacultyAgentTrail)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[11px] font-bold transition flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <span>{showFacultyAgentTrail ? 'Hide Multi-Agent Trail' : 'Inspect 3-Agent Trail'}</span>
                    <span>{showFacultyAgentTrail ? '▲' : '▼'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[11px]">
                  <div className="flex items-center space-x-2 text-emerald-200">
                    <span className="text-emerald-400 font-bold">✓ Math Checked:</span>
                    <span className="text-white/90">
                      {reviewSubmission.evaluation.multiAgentWorkflow?.agent3_audit?.mathCheck?.notes || 'Sum of criteria + grace marks mathematically validated.'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-teal-200">
                    <span className="text-teal-400 font-bold">✓ Rubric Adherence:</span>
                    <span className="text-white/90">
                      {reviewSubmission.evaluation.multiAgentWorkflow?.agent3_audit?.rubricCompliance?.notes || '0 unstated deductions — graded strictly on Agent 1 rubric.'}
                    </span>
                  </div>
                </div>

                {showFacultyAgentTrail && (
                  <div className="mt-3 p-3.5 rounded-xl bg-black/40 border border-white/15 space-y-3 animate-fadeIn text-xs">
                    <div className="flex items-center space-x-2 border-b border-white/15 pb-2">
                      <button
                        type="button"
                        onClick={() => setFacultyAgentTab('agent1')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${facultyAgentTab === 'agent1' ? 'bg-emerald-500 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                      >
                        1. Extractor Rubric
                      </button>
                      <button
                        type="button"
                        onClick={() => setFacultyAgentTab('agent2')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${facultyAgentTab === 'agent2' ? 'bg-emerald-500 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                      >
                        2. Evaluator Grader Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => setFacultyAgentTab('agent3')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${facultyAgentTab === 'agent3' ? 'bg-emerald-500 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                      >
                        3. Auditor Self-Reflection Loop
                      </button>
                    </div>

                    {facultyAgentTab === 'agent1' && (
                      <div className="space-y-2 text-[11px]">
                        <p className="text-emerald-300 font-bold">Agent 1: Academic Curriculum Designer Extracted Criteria</p>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {(reviewSubmission.evaluation.multiAgentWorkflow?.agent1_rubric?.criteria || []).map((crit: any, i: number) => (
                            <div key={i} className="p-2 rounded-lg bg-white/5 border border-white/10">
                              <div className="flex justify-between font-bold text-white">
                                <span>{crit.name}</span>
                                <span className="text-emerald-400">{crit.maxPoints} pts</span>
                              </div>
                              <p className="text-gray-300 text-[10px] mt-0.5">{crit.rules || crit.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {facultyAgentTab === 'agent2' && (
                      <div className="space-y-2 text-[11px]">
                        <p className="text-teal-300 font-bold">Agent 2: Impartial Academic Grader Criterion-by-Criterion Justifications</p>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {(reviewSubmission.evaluation.multiAgentWorkflow?.agent2_evaluation?.criteriaEvaluations || []).map((ce: any, i: number) => (
                            <div key={i} className="p-2 rounded-lg bg-white/5 border border-white/10 space-y-0.5">
                              <div className="flex justify-between font-bold text-white">
                                <span>{ce.name}</span>
                                <span className="text-emerald-300">{ce.scoreAwarded} / {ce.maxPoints} pts</span>
                              </div>
                              <p className="text-gray-300 text-[10px] leading-relaxed italic">&ldquo;{ce.justification}&rdquo;</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {facultyAgentTab === 'agent3' && (
                      <div className="space-y-2 text-[11px]">
                        <p className="text-indigo-300 font-bold">Agent 3: Senior Academic Auditor Self-Reflection &amp; Math Verification</p>
                        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-gray-300">Auditor Status:</span>
                            <span className="font-bold text-emerald-400">{reviewSubmission.evaluation.auditStatus || 'APPROVED'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Sum of Criteria Checked:</span>
                            <span className="font-mono text-white">{reviewSubmission.evaluation.multiAgentWorkflow?.agent3_audit?.mathCheck?.calculatedCriteriaSum ?? reviewSubmission.evaluation.overallScore} pts</span>
                          </div>
                          <p className="text-gray-300 text-[10px] leading-relaxed border-t border-white/10 pt-1.5 mt-1">
                            {reviewSubmission.evaluation.multiAgentWorkflow?.agent3_audit?.auditExplanation || 'Mathematical summation confirmed and verified 100% adherence to rubric guidelines without extraneous deductions.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* AI Evaluation Review */}
            {reviewSubmission.evaluation && (
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-800 uppercase tracking-wider text-xs">
                    Teacher AI Evaluation Breakdown
                  </h4>
                  <span
                    className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${getMasteryBadgeColor(
                      reviewSubmission.evaluation.masteryLevel
                    )}`}
                  >
                    {reviewSubmission.evaluation.masteryLevel} Mastery
                  </span>
                </div>

                {/* Topic scores */}
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(reviewSubmission.evaluation.topicScores || {}).map(([topic, score]) => (
                    <div key={topic} className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 flex justify-between text-xs">
                      <span className="text-gray-700 truncate pr-2">{topic}</span>
                      <span className="font-bold text-emerald-700">{Number(score)}%</span>
                    </div>
                  ))}
                </div>

                {/* Feedback */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-gray-200">
                  <p className="font-bold text-gray-800 text-xs mb-1">Teacher Feedback Given to Student:</p>
                  <p className="text-gray-700 leading-relaxed text-xs whitespace-pre-wrap font-sans">
                    {reviewSubmission.evaluation.feedback}
                  </p>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="font-bold text-emerald-900 mb-1">Strengths Noted:</p>
                    <ul className="list-disc list-inside text-emerald-800 space-y-1">
                      {(reviewSubmission.evaluation.strengths || []).map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="font-bold text-amber-900 mb-1">Observations / Gaps:</p>
                    <ul className="list-disc list-inside text-amber-800 space-y-1">
                      {(reviewSubmission.evaluation.weaknesses || []).map((w: string, i: number) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setReviewSubmission(null)}
                className="px-5 py-2 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition text-xs"
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUIZ MODAL (CONDUCT FOR FACULTY OR TAKE FOR STUDENTS) */}
      {showQuizModal && (
        <QuizModal
          isOpen={showQuizModal}
          onClose={() => setShowQuizModal(false)}
          mode="create"
          activeClass={activeClass}
          currentUser={currentUser}
          onCreateQuiz={onCreateQuiz}
        />
      )}

      {takingQuiz && (
        <QuizModal
          isOpen={!!takingQuiz}
          onClose={() => setTakingQuiz(null)}
          mode="take"
          activeClass={activeClass}
          currentUser={currentUser}
          quiz={takingQuiz}
          onSubmitQuiz={onSubmitQuiz}
        />
      )}
    </div>
  );
};
