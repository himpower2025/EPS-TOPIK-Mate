import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, AnalyticsFeedback, ExamSession, ExamMode, PlanType } from '../types';
import { STATIC_EXAM_DATA } from '../data/examData';

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- 오디오 처리 유틸리티 ---
function decode(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
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
 * 문제 생성 및 추출 엔진 (플랜별 DB 매핑)
 */
export const generateQuestionsBySet = async (
  mode: ExamMode, 
  setNumber: number, 
  plan: PlanType
): Promise<Question[]> => {
  const isReadingLab = mode === 'READING';
  const isListeningLab = mode === 'LISTENING';
  const isFullExam = mode === 'FULL';
  const isOdd = setNumber % 2 !== 0;

  let dbSetIndex = -1;
  let useAI = false;

  // 1. 모드별/플랜별 DB 인덱스 매핑
  if (isFullExam) {
    if (plan === '1m') {
      const map1m = [12, 14, 16, 18, 20];
      dbSetIndex = map1m[setNumber - 1] || -1;
      if (dbSetIndex === -1) useAI = true;
    } else if (plan === '3m') {
      if (setNumber <= 15) {
        dbSetIndex = setNumber * 2;
      } else {
        useAI = true;
      }
    } else if (plan === '6m') {
      if (setNumber <= 30) {
        dbSetIndex = setNumber;
      } else {
        useAI = true;
      }
    } else {
      dbSetIndex = 1;
      if (setNumber > 1) useAI = true;
    }
  } else {
    // 랩 모드
    if (plan === 'free') {
      dbSetIndex = 1;
      if (setNumber > 2) useAI = true;
    } else {
      dbSetIndex = Math.ceil(setNumber / 2);
      if (dbSetIndex > 30) useAI = true;
    }
  }

  // 2. DB 추출 로직
  if (!useAI && dbSetIndex > 0 && dbSetIndex <= 30) {
    const rPref = `s${dbSetIndex}_r_`;
    const lPref = `s${dbSetIndex}_l_`;
    
    if (isReadingLab) {
      const allR = STATIC_EXAM_DATA.filter(q => q.id.startsWith(rPref));
      return isOdd ? allR.slice(0, 10) : allR.slice(10, 20);
    } else if (isListeningLab) {
      const allL = STATIC_EXAM_DATA.filter(q => q.id.startsWith(lPref));
      return isOdd ? allL.slice(0, 9) : allL.slice(9, 21);
    } else {
      return [
        ...STATIC_EXAM_DATA.filter(q => q.id.startsWith(rPref)),
        ...STATIC_EXAM_DATA.filter(q => q.id.startsWith(lPref))
      ];
    }
  }

  // 3. AI 생성
  const ai = getAI();
  try {
    const prompt = `Act as an EPS-TOPIK examiner. Mode: ${mode}, Set: ${setNumber}. 
    Create ${isFullExam ? "40" : "10"} questions. 
    Include 'imagePrompt' for each. Return JSON.`;

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
              type: { type: Type.STRING },
              category: { type: Type.STRING },
              questionText: { type: Type.STRING },
              context: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              imagePrompt: { type: Type.STRING },
              optionImagePrompts: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["id", "type", "questionText", "options", "correctAnswer"]
          }
        }
      }
    });
    return JSON.parse(cleanJson(response.text || '[]'));
  } catch (e) {
    console.error("AI Generation Error", e);
    return STATIC_EXAM_DATA.slice(0, 10);
  }
};

export const generateImage = async (prompt: string): Promise<string | null> => {
  if (!prompt) return null;
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `EPS-TOPIK illustration: ${prompt}` }] }
    });
    const parts = response.candidates?.[0]?.content?.parts;
    const imgPart = parts?.find(p => p.inlineData);
    return imgPart?.inlineData?.data ? `data:image/png;base64,${imgPart.inlineData.data}` : null;
  } catch { return null; }
};

export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: { responseModalities: [Modality.AUDIO] }
    });
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      return await decodeAudioData(decode(base64), ctx, 24000, 1);
    }
    return null;
  } catch { return null; }
};

export const analyzePerformance = async (session: ExamSession): Promise<AnalyticsFeedback | null> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze score: ${session.score}. Return JSON.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJson(response.text || '{}'));
  } catch { return null; }
};
