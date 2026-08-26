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
  imagePrompt?: string;       // Prompt for the main question context image (signs, charts, objects)
  imageUrl?: string;          // 로컬 이미지 파일 경로 (있으면 AI 생성 건너뜀)
  // 그림의 역할.
  //   'stimulus' = 그림이 있어야 풀 수 있는 문제 → 반드시 화면에 표시
  //   'hint'     = 대본에 답이 다 나오는 삽화 → 정답 유출이므로 표시하지 않음
  imageRole?: 'stimulus' | 'hint';
  intendedLeak?: boolean;      // 유형상 대본이 정답을 읽어주는 게 정상인 문항(들은 것 고르기 등)
  audioReadsOptions?: boolean; // 대본이 보기 4개를 번호와 함께 낭독하는 유형
  audioUrl?: string;           // 사전 생성된 음성 파일 경로 (있으면 실시간 TTS 생략)
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