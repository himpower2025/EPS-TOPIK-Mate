import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, QuestionType, AnalyticsFeedback, ExamSession, ExamMode, PlanType } from '../types';
import { STATIC_EXAM_DATA } from '../data/examData';

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- 유틸리티 함수 ---
function decodeBase64(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const cleanJson = (text: string) => text.replace(/```json/g, '').replace(/```/g, '').replace(/\/\*.*?\*\//gs, '').trim();

/**
 * [AI 극대화 엔진] 기존 DB에서 참조 문항을 무작위로 추출합니다.
 */
const getReferenceQuestions = (count: number = 3): string => {
  const shuffled = [...STATIC_EXAM_DATA].sort(() => 0.5 - Math.random());
  return JSON.stringify(shuffled.slice(0, count), null, 2);
};

/**
 * 산업 분야 결정 (세트 번호에 따라 AI의 전문 분야를 고정)
 */
const getIndustrialContext = (setNumber: number): string => {
  const sectors = [
    "Construction (Scaffolding, Rebar, Concrete)",
    "Manufacturing (Machine Operation, Safety Gear, Assembly)",
    "Agriculture (Greenhouses, Farming Tools, Harvest)",
    "Logistics (Warehouse, Forklift, Packaging)",
    "Daily Workplace (Office manners, Salary, Insurance)"
  ];
  return sectors[setNumber % sectors.length];
};

/**
 * [Core Engine] 플랜별 문항 공급 로직
 */
export const generateQuestionsBySet = async (mode: ExamMode, setNumber: number, plan: PlanType): Promise<Question[]> => {
  if (plan === 'free') {
    return STATIC_EXAM_DATA.slice(0, 10);
  }

  // 3개월/6개월 프리미엄 플랜 로직
  if (plan === '3m' || plan === '6m') {
    const isFullExam = mode === 'FULL';
    const dbLimit = isFullExam ? 30 : 60; // DB 사용 가능 범위

    if (setNumber <= dbLimit) {
      // DB 범위 내: 실제 데이터 활용
      if (isFullExam) return STATIC_EXAM_DATA.filter(q => q.id.startsWith(`s${setNumber}_`));
      
      const dbIdx = Math.ceil(setNumber / 2);
      const isOdd = setNumber % 2 !== 0;
      const typeKey = mode === 'READING' ? 'r' : 'l';
      const all = STATIC_EXAM_DATA.filter(q => q.id.startsWith(`s${dbIdx}_${typeKey}_`));
      return isOdd ? all.slice(0, 10) : all.slice(10, 20);
    } else {
      // [AI 극대화] DB 범위를 벗어나면 AI가 전문적인 유사 문항 생성
      const count = isFullExam ? 40 : 10;
      return await callGeminiToGenerateQuestions(mode, setNumber, count);
    }
  }

  // 1개월 플랜: DB 위주
  return STATIC_EXAM_DATA.sort(() => 0.5 - Math.random()).slice(0, 10);
};

/**
 * [핵심 고도화] AI 문제 생성 함수
 * Few-shot Prompting과 Logic Verification이 결합되었습니다.
 */
async function callGeminiToGenerateQuestions(mode: ExamMode, setNumber: number, count: number): Promise<Question[]> {
  const ai = getAI();
  const reference = getReferenceQuestions(3);
  const sector = getIndustrialContext(setNumber);

  const prompt = `You are a Senior EPS-TOPIK Examiner with 20 years of experience. 
  Your task is to create ${count} unique, high-quality exam questions for "Round ${setNumber}".
  
  [Theme/Sector for this Round]: ${sector}
  [Format Guide]: Use the provided Reference Questions as a template for style and difficulty.
  
  [Reference Questions (Actual Exam Data)]:
  ${reference}
  
  [Strict Rules for Quality Control]:
  1. Language: Question text and Options MUST be in Korean. Explanations and UI feedback MUST be in English.
  2. Uniqueness: Do not copy the reference questions. Create NEW scenarios, NEW workplace dialogues, and NEW industrial contexts.
  3. Logical Rigor: Each question must have ONLY ONE indisputably correct answer.
  4. Plausibility: The 3 incorrect options must be plausible to challenge the student.
  5. Visual Sync: 'imagePrompt' must be extremely descriptive so a visual AI can draw exactly what is needed for the question.
  6. Difficulty: Maintain the standard EPS-TOPIK level (Intermediate Korean).

  Mode: ${mode === 'FULL' ? 'Mix of Reading and Listening' : mode}
  
  Return ONLY a valid JSON array of Question objects.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        temperature: 0.8, // 다양성을 위해 온도를 약간 높임
        topP: 0.95
      }
    });
    
    const generated = JSON.parse(cleanJson(response.text || '[]'));
    
    // 만약 AI가 충분한 양을 생성하지 못했을 경우를 대비한 최소한의 가드 (재귀 방지)
    if (generated.length === 0) throw new Error("Empty AI response");
    
    return generated;
  } catch (err) {
    console.error("Critical: AI Generation failed, falling back to database mixing.", err);
    // 실패 시 DB 데이터를 섞어서 제공하여 사용자 경험 유지
    return [...STATIC_EXAM_DATA].sort(() => 0.5 - Math.random()).slice(0, count);
  }
}

export const generateImage = async (prompt: string): Promise<string | null> => {
  if (!prompt) return null;
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `High-quality industrial photography, clean studio lighting, realistic EPS-TOPIK context: ${prompt}` }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return part?.inlineData ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch { return null; }
};

export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `잘 듣고 대답하세요. ${text}` }] }],
      config: { 
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
      }
    });
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      return await decodeAudioData(decodeBase64(base64), ctx, 24000, 1);
    }
    return null;
  } catch { return null; }
};

export const analyzePerformance = async (session: ExamSession): Promise<AnalyticsFeedback | null> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze EPS-TOPIK score: ${session.score}/${session.questions.length}. Provide expert feedback in English.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJson(response.text || '{}'));
  } catch { return null; }
};