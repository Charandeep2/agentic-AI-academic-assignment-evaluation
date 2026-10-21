export type Role = 'student' | 'faculty';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: Role;
  department: string;
  avatarUrl?: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  department: string;
  facultyId: string;
  facultyName: string;
  description: string;
  enrolledCount: number;
}

export interface Assignment {
  id: string;
  courseId: string;
  courseCode: string;
  title: string;
  description: string;
  dueDate: string;
  maxMarks: number;
  topics: string[];
  type: 'assignment' | 'project' | 'lab' | 'quiz';
  isOverdue?: boolean;
}

export type MasteryLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface Evaluation {
  id: string;
  submissionId: string;
  overallScore: number;
  maxScore: number;
  percentage: number;
  masteryLevel: MasteryLevel;
  topicScores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
  suggestions: string[];
  ragContextUsed?: string[];
  evaluatedBy: string;
  evaluatedAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  content: string;
  fileName?: string;
  submittedAt: string;
  status: 'submitted' | 'evaluating' | 'evaluated';
  evaluation?: Evaluation;
}

export interface LearningGap {
  topic: string;
  courseCode: string;
  averageScore: number;
  studentsAffected: number;
  severity: 'low' | 'medium' | 'high';
  suggestedAction: string;
}

export interface ClassAnalytics {
  courseCode: string;
  courseName: string;
  totalStudents: number;
  classAverage: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  overdueSubmissions: number;
  gradeDistribution: {
    grade: string;
    count: number;
    range: string;
  }[];
  topicMastery: {
    topic: string;
    averageScore: number;
    masteryLevel: MasteryLevel;
  }[];
  learningGaps: LearningGap[];
  studentRankings: {
    studentId: string;
    studentName: string;
    averageScore: number;
    completedCount: number;
    mastery: MasteryLevel;
  }[];
}

export interface StudentPerformance {
  studentId: string;
  studentName: string;
  overallAverage: number;
  overallMastery: MasteryLevel;
  totalSubmissions: number;
  evaluatedCount: number;
  courseBreakdown: {
    courseCode: string;
    courseName: string;
    averageScore: number;
    mastery: MasteryLevel;
    submissionsCount: number;
  }[];
  topicComprehension: {
    topic: string;
    score: number;
    mastery: MasteryLevel;
  }[];
  performanceHistory: {
    date: string;
    assignmentTitle: string;
    score: number;
    courseCode: string;
  }[];
  strongTopics: string[];
  weakTopics: string[];
  recommendations: string[];
}
