// Enum 대신 const object를 사용하여 런타임 바인딩 에러 방지
export const QuestionType = {
  READING: 'READING',
  LISTENING: 'LISTENING'
} as const;

export type QuestionType = typeof QuestionType[keyof typeof QuestionType];

export interface Question {
  id: string;
  type: QuestionType;
  category: string;
  questionText: string;
  context?: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  sourceRef?: string;
}

export interface ExamSession {
  id: string;
  questions: Question[];
  userAnswers: Record<string, number>;
  score: number;
  completedAt: string;
}

export interface UserStats {
  totalExams: number;
  averageScore: number;
  weakAreas: string[];
  recentScores: number[];
  categoryPerformance: Record<string, number>;
}

export interface AnalyticsFeedback {
  overallAssessment: string;
  strengths: string[];
  weaknesses: string[];
  studyPlan: string;
}

export type PlanType = 'free' | '1m' | '3m' | '6m';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  plan: PlanType;
  subscriptionExpiry: string | null;
  examsRemaining: number;
}