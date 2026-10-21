import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

function generateClassCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let prefix = '';
  for (let i = 0; i < 2; i++) {
    prefix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${suffix}`;
}

export async function GET(req: NextRequest) {
  const db = readDb();
  return NextResponse.json({
    classes: db.classes || [],
    announcements: db.announcements || [],
    assignments: db.assignments || [],
    submissions: db.submissions || [],
    materials: db.materials || [],
    quizzes: db.quizzes || [],
    quizSubmissions: db.quizSubmissions || [],
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const db = readDb();
    if (!db.classes) db.classes = [];
    if (!db.announcements) db.announcements = [];
    if (!db.assignments) db.assignments = [];
    if (!db.submissions) db.submissions = [];
    if (!db.materials) db.materials = [];
    if (!db.quizzes) db.quizzes = [];
    if (!db.quizSubmissions) db.quizSubmissions = [];

    // ==========================================
    // ACTION: FACULTY CREATES A NEW CLASSROOM
    // ==========================================
    if (action === 'create_class') {
      const {
        name,
        code,
        section,
        room,
        subject,
        colorTheme,
        facultyId,
        facultyName,
        facultyEmail,
      } = body;

      if (!name || !facultyId) {
        return NextResponse.json(
          { error: 'Class Name and Faculty ID are required to create a classroom.' },
          { status: 400 }
        );
      }

      let classCode = generateClassCode();
      while (db.classes.some((c: any) => c.classCode?.toLowerCase() === classCode.toLowerCase())) {
        classCode = generateClassCode();
      }

      const newClass = {
        id: `c-${Date.now()}`,
        code: (code || 'CS' + Math.floor(100 + Math.random() * 800)).toUpperCase().trim(),
        name: name.trim(),
        section: section?.trim() || 'Section A • Fall 2026',
        room: room?.trim() || 'Main Hall',
        subject: subject?.trim() || 'Computer Science',
        facultyId,
        facultyName: facultyName || 'Faculty Instructor',
        facultyEmail: facultyEmail || 'instructor@university.edu',
        colorTheme: colorTheme || 'blue',
        classCode,
        enrolledStudentIds: [],
        gradingWeights: body.gradingWeights || { endTerm: 40, midTerm: 30, quizzes: 15, labs: 15 },
        evaluationScheme: body.evaluationScheme || [
          { id: 'end_term', name: 'End-Term Examination', weight: 40 },
          { id: 'mid_term', name: 'Mid-Term Examination', weight: 30 },
          { id: 'quizzes', name: 'Quizzes & Tests', weight: 15 },
          { id: 'labs', name: 'Labs & Practical Coursework', weight: 15 },
        ],
        syllabusProgress: body.syllabusProgress || {
          currentTopic: 'Unit 1: Fundamentals',
          completedModules: ['Unit 1: Fundamentals & Core Principles'],
          futureModules: ['Unit 2: Advanced Topics & System Architectures'],
        },
        createdAt: new Date().toISOString(),
      };

      db.classes.unshift(newClass);

      // Create an initial Welcome Syllabus note for this new class
      const defaultSyllabus = {
        id: `mat-${Date.now()}`,
        classId: newClass.id,
        type: 'syllabus',
        title: `${newClass.code} Course Syllabus & Policies`,
        topic: 'Course Overview',
        description: `Official syllabus outline for ${newClass.name}.`,
        content: `# ${newClass.code}: ${newClass.name}\n\n## 1. Course Information\n- **Instructor:** ${facultyName}\n- **Section:** ${newClass.section}\n- **Class Code:** \`${newClass.classCode}\`\n\n## 2. Learning Goals\nStudents will explore fundamental paradigms, theoretical models, and hands-on implementations in ${newClass.subject}.\n\n## 3. Course Credit & Evaluation Scheme\n- **End-Term Exam:** ${newClass.gradingWeights.endTerm}%\n- **Mid-Term Exam:** ${newClass.gradingWeights.midTerm}%\n- **Quizzes & Tests:** ${newClass.gradingWeights.quizzes}%\n- **Practical Labs & Coursework:** ${newClass.gradingWeights.labs}%\n\n## 4. Evaluation Philosophy\nSubmissions are evaluated with teacher-aligned pedagogical empathy, rigorous criterion breakdowns, and generous grace marks for sincere good-faith efforts.`,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        authorId: facultyId,
        authorName: facultyName,
      };
      db.materials.unshift(defaultSyllabus);

      writeDb(db);

      // Async sync to SQLite
      try {
        fetch('http://localhost:8000/api/db/sync-course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: newClass.code,
            name: newClass.name,
            subject: newClass.subject,
            section: newClass.section,
          }),
        }).catch(() => {});
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: 'Classroom created successfully!',
        class: newClass,
      });
    }

    // ==========================================
    // ACTION: STUDENT JOINS A CLASSROOM VIA CODE
    // ==========================================
    if (action === 'join_class') {
      const { classCode, studentId } = body;

      if (!classCode || !studentId) {
        return NextResponse.json(
          { error: 'Class code and Student ID are required.' },
          { status: 400 }
        );
      }

      const cleanCode = classCode.trim().toLowerCase();
      const targetClass = db.classes.find(
        (c: any) => (c.classCode || '').toLowerCase() === cleanCode
      );

      if (!targetClass) {
        return NextResponse.json(
          { error: `No class found with code "${classCode}". Please check with your instructor.` },
          { status: 404 }
        );
      }

      if (!targetClass.enrolledStudentIds) {
        targetClass.enrolledStudentIds = [];
      }

      if (targetClass.enrolledStudentIds.includes(studentId)) {
        return NextResponse.json(
          { error: `You are already enrolled in "${targetClass.name}".` },
          { status: 400 }
        );
      }

      targetClass.enrolledStudentIds.push(studentId);
      writeDb(db);

      try {
        fetch('http://localhost:8000/api/db/sync-enrollment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId,
            courseCode: targetClass.code,
          }),
        }).catch(() => {});
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Successfully joined ${targetClass.name}!`,
        class: targetClass,
      });
    }

    // ==========================================
    // ACTION: FACULTY POSTS SYLLABUS / NOTES / MATERIAL
    // ==========================================
    if (action === 'post_material') {
      const {
        classId,
        type,
        title,
        topic,
        description,
        content,
        fileName,
        authorId,
        authorName,
      } = body;

      if (!classId || !title || !content) {
        return NextResponse.json(
          { error: 'Class ID, title, and content are required to post course materials.' },
          { status: 400 }
        );
      }

      const materialType = type || 'notes'; // 'syllabus' | 'notes' | 'reference' | 'guide'
      const newMaterial = {
        id: `mat-${Date.now()}`,
        classId,
        type: materialType,
        title: title.trim(),
        topic: topic?.trim() || 'Course Materials & Notes',
        description: description?.trim() || '',
        content: content.trim(),
        fileName: fileName?.trim() || (materialType === 'syllabus' ? 'syllabus.md' : 'lecture_notes.md'),
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        authorId: authorId || 'u-faculty-1',
        authorName: authorName || 'Instructor',
      };

      db.materials.unshift(newMaterial);

      // Automatically post a notification to the class Stream
      const newAnnouncement = {
        id: `ann-${Date.now()}`,
        classId,
        authorId: authorId || 'u-faculty-1',
        authorName: authorName || 'Instructor',
        authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Teacher',
        content: `📚 Posted new ${materialType.toUpperCase()}: "${newMaterial.title}". Review the concepts and lecture notes in the Classwork tab.`,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        comments: [],
      };
      db.announcements.unshift(newAnnouncement);

      writeDb(db);

      return NextResponse.json({
        success: true,
        message: 'Course material posted successfully!',
        material: newMaterial,
        announcement: newAnnouncement,
      });
    }

    // ==========================================
    // ACTION: DELETE MATERIAL
    // ==========================================
    if (action === 'delete_material') {
      const { materialId } = body;
      db.materials = db.materials.filter((m: any) => m.id !== materialId);
      writeDb(db);
      return NextResponse.json({ success: true, message: 'Material deleted' });
    }

    // ==========================================
    // ACTION: CREATE ASSIGNMENT (WITH AGENTIC RUBRIC CRITERIA & REFERENCE DOC)
    // ==========================================
    if (action === 'create_assignment') {
      const {
        classId,
        title,
        topic,
        instructions,
        points,
        dueDate,
        topics,
        assignmentType,
        submissionFormat,
        starterCode,
        rubricCriteria,
        referenceDoc,
      } = body;

      const newAssignment = {
        id: `a-${Date.now()}`,
        classId,
        topic: topic || 'General Coursework',
        title: title.trim(),
        assignmentType: assignmentType || 'assignment',
        submissionFormat: submissionFormat || (assignmentType === 'theory' ? 'theory' : 'code'),
        instructions: instructions || '',
        starterCode: starterCode || '',
        points: Number(points) || 100,
        dueDate: dueDate || '2026-11-20',
        topics: Array.isArray(topics) ? topics : (topics || '').split(',').map((t: string) => t.trim()).filter(Boolean),
        rubricCriteria: rubricCriteria || null,
        referenceDoc: referenceDoc || null,
        evaluationCategory: body.evaluationCategory || null,
        evaluationCategoryId: body.evaluationCategoryId || null,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };

      // Automatically announce new assignment in the stream
      const refDocNote = newAssignment.referenceDoc?.title
        ? `\n📖 Attached Reference: "${newAssignment.referenceDoc.title}"`
        : '';
      const assignAnn = {
        id: `ann-${Date.now()}`,
        classId,
        authorId: 'u-faculty',
        authorName: 'Instructor',
        authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Teacher',
        content: `📢 New ${newAssignment.submissionFormat === 'theory' ? 'Theoretical Task' : 'Assignment'} Posted: "${newAssignment.title}" (${newAssignment.points} pts). Due on ${newAssignment.dueDate}.${refDocNote}`,
        type: 'assignment',
        assignmentId: newAssignment.id,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        comments: [],
      };
      db.announcements.unshift(assignAnn);

      db.assignments.push(newAssignment);
      writeDb(db);
      return NextResponse.json({ success: true, assignment: newAssignment, announcement: assignAnn });
    }

    // ==========================================
    // ACTION: CREATE / CONDUCT QUIZ
    // ==========================================
    if (action === 'create_quiz') {
      const {
        classId,
        title,
        topic,
        instructions,
        timeLimitMinutes,
        points,
        questions,
        authorId,
        authorName,
      } = body;

      if (!classId || !title?.trim() || !questions || questions.length === 0) {
        return NextResponse.json(
          { error: 'Class ID, title, and at least one quiz question are required.' },
          { status: 400 }
        );
      }

      const quizId = `q-${Date.now()}`;
      const totalPoints = Number(points) || 100;

      const newQuiz = {
        id: quizId,
        classId,
        title: title.trim(),
        topic: topic?.trim() || 'Class Quiz',
        instructions: instructions?.trim() || 'Answer all questions to the best of your ability.',
        timeLimitMinutes: Number(timeLimitMinutes) || 10,
        points: totalPoints,
        questions: questions.map((q: any, idx: number) => ({
          id: q.id || `q-${idx + 1}`,
          question: q.question.trim(),
          options: q.options || [],
          correctOption: typeof q.correctOption === 'number' ? q.correctOption : 0,
          explanation: q.explanation?.trim() || 'Correct by concept definition.',
        })),
        authorId: authorId || 'u-faculty-1',
        authorName: authorName || 'Instructor',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };

      db.quizzes.unshift(newQuiz);

      // Create linked assignment entry so it participates seamlessly in Classwork and Gradebook
      const linkedAssignment = {
        id: quizId,
        classId,
        topic: newQuiz.topic,
        title: `Quiz: ${newQuiz.title}`,
        assignmentType: 'quiz',
        submissionFormat: 'quiz',
        instructions: newQuiz.instructions,
        points: totalPoints,
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        topics: [newQuiz.topic, 'Quiz Assessment'],
        quizId: newQuiz.id,
        createdAt: newQuiz.createdAt,
      };
      db.assignments.push(linkedAssignment);

      // Post stream announcement with type 'quiz'
      const quizAnn = {
        id: `ann-${Date.now()}`,
        classId,
        authorId: authorId || 'u-faculty',
        authorName: authorName || 'Instructor',
        authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Teacher',
        content: `💡 New Quiz Posted: "${newQuiz.title}" (${newQuiz.questions.length} questions • ${totalPoints} pts). Available for all enrolled students.`,
        type: 'quiz',
        quizId: newQuiz.id,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        comments: [],
      };
      db.announcements.unshift(quizAnn);

      writeDb(db);
      return NextResponse.json({
        success: true,
        message: 'Quiz created successfully!',
        quiz: newQuiz,
        assignment: linkedAssignment,
        announcement: quizAnn,
      });
    }

    // ==========================================
    // ACTION: SUBMIT QUIZ (STUDENT TAKES QUIZ)
    // ==========================================
    if (action === 'submit_quiz') {
      const { quizId, studentId, studentName, studentEmail, answers } = body;
      const quiz = db.quizzes.find((q: any) => q.id === quizId);

      if (!quiz) {
        return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
      }

      const totalQuestions = quiz.questions.length;
      let correctCount = 0;
      const breakdown = quiz.questions.map((q: any) => {
        const studentChoice = answers ? answers[q.id] : undefined;
        const isCorrect = studentChoice === q.correctOption;
        if (isCorrect) correctCount++;
        return {
          questionId: q.id,
          question: q.question,
          options: q.options,
          studentChoice,
          correctOption: q.correctOption,
          isCorrect,
          explanation: q.explanation,
        };
      });

      const percentage = Math.round((correctCount / totalQuestions) * 100);
      const overallScore = Math.round((percentage / 100) * quiz.points);
      const masteryLevel =
        percentage >= 90 ? 'expert' : percentage >= 75 ? 'advanced' : percentage >= 50 ? 'intermediate' : 'needs_practice';

      const evaluation = {
        overallScore,
        maxScore: quiz.points,
        percentage,
        correctCount,
        totalQuestions,
        masteryLevel,
        strengths:
          percentage >= 75
            ? ['Strong mastery of core concepts tested in this quiz.', 'Accurate analytical judgment under quiz constraints.']
            : ['Demonstrated effort on fundamental questions.'],
        weaknesses:
          percentage < 100
            ? [`Missed ${totalQuestions - correctCount} question(s). Review the detailed explanations provided below.`]
            : ['No weaknesses identified. Perfect score!'],
        feedback:
          percentage === 100
            ? `Outstanding performance! You scored a perfect 100% on "${quiz.title}". Your conceptual mastery is exceptional.`
            : percentage >= 75
            ? `Great job! You achieved ${percentage}% (${correctCount}/${totalQuestions} correct) on "${quiz.title}". Review the questions you missed to solidify your understanding.`
            : `You scored ${percentage}% (${correctCount}/${totalQuestions} correct) on "${quiz.title}". Carefully review the teacher explanations below to reinforce these core ideas.`,
        breakdown,
        evaluatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };

      const quizSubmission = {
        id: `qsub-${Date.now()}`,
        quizId,
        assignmentId: quizId,
        studentId,
        studentName,
        studentEmail,
        answers,
        evaluation,
        submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };

      // Add to quizSubmissions
      db.quizSubmissions = db.quizSubmissions.filter(
        (qs: any) => !(qs.quizId === quizId && qs.studentId === studentId)
      );
      db.quizSubmissions.unshift(quizSubmission);

      // Also upsert into db.submissions so it syncs with Gradebook & student portal
      const stdSub = {
        id: `sub-quiz-${Date.now()}`,
        assignmentId: quizId,
        classId: quiz.classId,
        studentId,
        studentName,
        studentEmail,
        content: `Completed Quiz: ${quiz.title}\nScore: ${overallScore}/${quiz.points} (${percentage}%)\nCorrect: ${correctCount}/${totalQuestions}`,
        fileName: 'quiz_results.json',
        submittedAt: quizSubmission.submittedAt,
        evaluation,
      };

      db.submissions = db.submissions.filter(
        (s: any) => !(s.assignmentId === quizId && s.studentId === studentId)
      );
      db.submissions.unshift(stdSub);

      writeDb(db);

      return NextResponse.json({
        success: true,
        message: 'Quiz submitted and graded successfully!',
        submission: quizSubmission,
        evaluation,
      });
    }

    // ==========================================
    // ACTION: POST ANNOUNCEMENT
    // ==========================================
    if (action === 'post_announcement') {
      const { classId, authorId, authorName, authorAvatar, content } = body;
      const newAnnouncement = {
        id: `ann-${Date.now()}`,
        classId,
        authorId,
        authorName,
        authorAvatar: authorAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Teacher',
        content,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        comments: [],
      };

      db.announcements.unshift(newAnnouncement);
      writeDb(db);
      return NextResponse.json({ success: true, announcement: newAnnouncement });
    }

    // ==========================================
    // ACTION: ADD COMMENT
    // ==========================================
    if (action === 'add_comment') {
      const { announcementId, authorName, content } = body;
      const announcement = db.announcements.find((a: any) => a.id === announcementId);
      if (announcement) {
        if (!announcement.comments) announcement.comments = [];
        announcement.comments.push({
          id: `comm-${Date.now()}`,
          authorName,
          content,
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        });
        writeDb(db);
        return NextResponse.json({ success: true, announcement });
      }
    }

    // ==========================================
    // ACTION: UPDATE COURSE EVALUATION SCHEME / CRITERIA
    // ==========================================
    if (action === 'update_evaluation_scheme' || action === 'update_grading_weights') {
      const { classId, evaluationScheme, gradingWeights } = body;
      const target = db.classes.find((c: any) => c.id === classId);
      if (target) {
        if (evaluationScheme) {
          target.evaluationScheme = evaluationScheme;
        }
        if (gradingWeights) {
          target.gradingWeights = gradingWeights;
        }
        writeDb(db);
        return NextResponse.json({
          success: true,
          class: target,
          evaluationScheme: target.evaluationScheme,
          gradingWeights: target.gradingWeights,
        });
      }
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // ==========================================
    // ACTION: UPDATE SYLLABUS PROGRESS / COVERED TOPICS
    // ==========================================
    if (action === 'update_syllabus_progress') {
      const { classId, currentTopic, completedModules, futureModules } = body;
      const target = db.classes.find((c: any) => c.id === classId);
      if (target) {
        target.syllabusProgress = {
          currentTopic: currentTopic || target.syllabusProgress?.currentTopic || 'Unit 1: Fundamentals',
          completedModules: completedModules || target.syllabusProgress?.completedModules || [],
          futureModules: futureModules || target.syllabusProgress?.futureModules || [],
        };
        writeDb(db);
        return NextResponse.json({ success: true, class: target, syllabusProgress: target.syllabusProgress });
      }
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Classes POST error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
