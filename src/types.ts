
export enum QuestionType {
  READING = 'READING',
  LISTENING = 'LISTENING'
}

export type ExamMode = 'FULL' | 'LISTENING' | 'READING';

export interface Question {
  id: string;
  type: QuestionType;
  category: string;
  questionText: string;
  context?: string; // For Reading: Passage text. For Listening: Audio Script (Hidden from user).
  options: string[];
  optionImages?: string[]; // For questions where options are images (URLs)
  correctAnswer: number;
  explanation: string;
  sourceRef?: string;
  // Metadata for AI Visual Generation
  imagePrompt?: string; // Prompt for the main question context image (signs, charts, objects)
  optionImagePrompts?: string[]; // Array of 4 prompts for questions where each option is a different image
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
