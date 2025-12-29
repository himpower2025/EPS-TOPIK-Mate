
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, QuestionType, AnalyticsFeedback, ExamSession, ExamMode } from '../types';
import { STATIC_EXAM_DATA } from '../data/examData';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helper: 문항 텍스트에서 불필요한 번호(1. 21. 등) 제거 ---
const stripLeadingNumbers = (text: string): string => {
  if (!text) return "";
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
 * AI 문항 합성 엔진: 읽기/듣기 영역을 엄격하게 구분하여 생성합니다.
 */
export const generateQuestionsBySet = async (
  mode: ExamMode, 
  setNumber: number, 
  _isPremium: boolean
): Promise<Question[]> => {
  const isFull = mode === 'FULL';
  const readingCount = mode === 'LISTENING' ? 0 : (isFull ? 20 : 20);
  const listeningCount = mode === 'READING' ? 0 : (isFull ? 20 : 20);

  const themes = [
    "Workplace Safety & Protective Gear",
    "Agricultural Tools & Equipment",
    "Construction Site Communication",
    "Employment Contract & Labor Rights",
    "Daily Life & Public Transportation",
    "Korean Traditional Culture & Manners",
    "Manufacturing & Machine Operation",
    "Office Etiquette & Habits",
    "Emergency Situations & First Aid",
    "Banking & Public Institutions"
  ];
  const currentTheme = themes[(setNumber - 1) % themes.length];

  try {
    const prompt = `You are a professional EPS-TOPIK examiner. Create a completely NEW Exam Set #${setNumber}.
    THEME: ${currentTheme}.
    MODE: ${mode} (${readingCount} Reading questions, ${listeningCount} Listening questions).
    
    STRICT GUIDELINES:
    1. SYNTHESIZE original scenarios. Do NOT copy from existing databases.
    2. QUESTION SEPARATION: 
       - If type is READING, the 'context' must be a text passage or image description.
       - If type is LISTENING, the 'context' must be the script for audio. Users will NOT see this text.
    3. NO NUMBERS: Do NOT include question numbers (like "1. ", "21. ") inside 'questionText' or 'context'.
    4. VARIETY: Use unique names, places, and specific industrial numbers.
    
    Return as JSON array of Question objects.`;

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
    
    // 후처리: 번호 정화 작업 및 타입 보정
    return questions.map(q => ({
      ...q,
      questionText: stripLeadingNumbers(q.questionText),
      context: q.context ? stripLeadingNumbers(q.context) : undefined
    }));

  } catch (error) {
    console.warn("AI Synthesis failed, using diverse shuffle fallback.");
  }

  // Fallback (셔플 + 번호 정화)
  const pool = [...STATIC_EXAM_DATA]
    .filter(q => {
      if (mode === 'READING') return q.type === QuestionType.READING;
      if (mode === 'LISTENING') return q.type === QuestionType.LISTENING;
      return true;
    })
    .sort(() => Math.random() - 0.5);

  return pool.slice(0, readingCount + listeningCount).map(q => ({
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
      contents: { parts: [{ text: `Simple black and white line art illustration for EPS-TOPIK Korean exam. Topic: ${description}` }] },
    });
    const parts = response.candidates?.[0]?.content?.parts;
    const imgPart = parts?.find(p => p.inlineData);
    if (imgPart && imgPart.inlineData) {
      return `data:image/png;base64,${imgPart.inlineData.data}`;
    }
    return null;
  } catch { return null; }
};

export const analyzePerformance = async (session: ExamSession): Promise<AnalyticsFeedback | null> => {
  try {
    const prompt = `Analyze this EPS-TOPIK result. Score: ${session.score}/${session.questions.length}. Provide expert JSON feedback.`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJson(response.text || '{}'));
  } catch { return null; }
};
