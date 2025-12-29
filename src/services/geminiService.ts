
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, QuestionType, AnalyticsFeedback, ExamSession, ExamMode } from '../types';
import { STATIC_EXAM_DATA } from '../data/examData';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helper: 문항 텍스트에서 불필요한 번호(1. 21. 등) 제거 ---
const stripLeadingNumbers = (text: string): string => {
  // 문장 시작 부분의 "1. ", "21. ", "1) ", "Q1:" 등 패턴 제거
  return text.replace(/^(\d+[\s.)-]+\s*|Q\d+[:\s-]*)/i, '').trim();
};

// --- Audio Decoding Helpers ---
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
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

const cleanJson = (text: string) => text.replace(/```json/g, '').replace(/```/g, '').trim();

/**
 * AI 문항 합성 엔진: 회차별 고유 시나리오를 창작합니다.
 */
export const generateQuestionsBySet = async (
  mode: ExamMode, 
  setNumber: number, 
  isPremium: boolean
): Promise<Question[]> => {
  const readingCount = mode === 'LISTENING' ? 0 : 20;
  const listeningCount = mode === 'READING' ? 0 : 20;

  const themes = [
    "Workplace Safety Gear & Protection",
    "Agricultural Machinery & Tool Use",
    "Construction Site Communication",
    "Employment Contract & Labor Rights",
    "Daily Life & Public Transportation",
    "Korean Traditional Culture & Respect",
    "Industrial Accident & First Aid",
    "Office Manners & Work Habits",
    "Traditional Markets & Price Negotiation",
    "Hospitals, Banks & Public Services"
  ];
  const currentTheme = themes[(setNumber - 1) % themes.length];

  try {
    const prompt = `You are a Senior EPS-TOPIK Examiner. Create Exam Set #${setNumber}.
    THEME: ${currentTheme}.
    
    CRITICAL REQUIREMENTS:
    1. SYNTHESIZE 100% NEW SCENARIOS. Use unique names, places, and specific objects.
    2. NEVER REUSE text from existing databases.
    3. REMOVE all leading question numbers (like "1. ", "21. ") from questionText and context.
    4. For READING: Create situational passages or vocabulary questions.
    5. For LISTENING: Create a natural dialogue script (not just single words) for TTS.
    
    Structure: ${readingCount} Reading + ${listeningCount} Listening.
    Return as JSON array.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["READING", "LISTENING"] },
              category: { type: Type.STRING },
              questionText: { type: Type.STRING },
              context: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 4, maxItems: 4 },
              correctAnswer: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ["id", "type", "category", "questionText", "options", "correctAnswer"]
          }
        }
      }
    });

    const questions: Question[] = JSON.parse(cleanJson(response.text || '[]'));
    
    // 번호 정화 작업 적용
    return questions.map(q => ({
      ...q,
      questionText: stripLeadingNumbers(q.questionText),
      context: q.context ? stripLeadingNumbers(q.context) : undefined
    }));

  } catch (error) {
    console.warn("AI Synthesis failed, using diverse shuffle fallback.");
  }

  // Fallback (셔플 + 번호 정화)
  return [...STATIC_EXAM_DATA]
    .sort(() => Math.random() - 0.5)
    .slice(0, readingCount + listeningCount)
    .map(q => ({
      ...q,
      questionText: stripLeadingNumbers(q.questionText),
      context: q.context ? stripLeadingNumbers(q.context) : undefined
    }));
};

export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `잘 듣고 질문에 답하십시오. ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      return await decodeAudioData(decode(base64), ctx, 24000, 1);
    }
    return null;
  } catch { return null; }
};

export const generateImageForQuestion = async (description: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Professional EPS-TOPIK exam line-art illustration. Simple, clean, black and white. Theme: ${description}` }] },
    });
    const parts = response.candidates?.[0]?.content?.parts;
    const imgPart = parts?.find(p => p.inlineData);
    return imgPart ? `data:image/png;base64,${imgPart.inlineData.data}` : null;
  } catch { return null; }
};

export const analyzePerformance = async (session: ExamSession): Promise<AnalyticsFeedback | null> => {
  try {
    const prompt = `Analyze this EPS-TOPIK result. Score: ${session.score}/${session.questions.length}. Provide JSON feedback.`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJson(response.text || '{}'));
  } catch { return null; }
};
