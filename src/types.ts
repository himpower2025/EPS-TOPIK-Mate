
export const QuestionType = {
  READING: 'READING',
  LISTENING: 'LISTENING'
} as const;

export type QuestionType = typeof QuestionType[keyof typeof QuestionType];

export type ExamMode = 'FULL' | 'LISTENING' | 'READING';

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
  mode: ExamMode;
  setNumber: number;
  questions: Question[];
  userAnswers: Record<string, number>;
  score: number;
  completedAt: string;
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
