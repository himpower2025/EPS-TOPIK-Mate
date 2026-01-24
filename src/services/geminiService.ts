
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, QuestionType, AnalyticsFeedback, ExamSession, ExamMode, PlanType } from '../types';
import { STATIC_EXAM_DATA } from '../data/examData';

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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

const cleanJson = (text: string | undefined) => (text || '').replace(/```json/g, '').replace(/```/g, '').replace(/\/\*.*?\*\//gs, '').trim();

/**
 * [Core] 모드 및 플랜에 따른 문항 생성/추출 엔진
 */
export const generateQuestionsBySet = async (mode: ExamMode, setNumber: number, plan: PlanType): Promise<Question[]> => {
  // 1. 무료 플랜 사용자 전용 로직 (요청하신 슬라이싱 적용)
  if (plan === 'free') {
    if (mode === 'READING') {
      return STATIC_EXAM_DATA.filter(q => q.id.startsWith('s1_r')).slice(0, 10);
    } 
    if (mode === 'LISTENING') {
      return STATIC_EXAM_DATA.filter(q => q.id.startsWith('s1_l')).slice(0, 10);
    }
    if (mode === 'FULL') {
      const r_part = STATIC_EXAM_DATA.filter(q => q.id.startsWith('s2_r')).slice(0, 10);
      const l_part = STATIC_EXAM_DATA.filter(q => q.id.startsWith('s2_l')).slice(0, 10);
      return [...r_part, ...l_part];
    }
  }

  // 2. 유료 플랜 사용자 로직: DB 데이터 우선
  const prefix = `s${setNumber}_`;
  const dbQuestions = STATIC_EXAM_DATA.filter(q => q.id.startsWith(prefix));
  
  if (dbQuestions.length >= 10) {
    if (mode === 'READING') return dbQuestions.filter(q => q.type === QuestionType.READING);
    if (mode === 'LISTENING') return dbQuestions.filter(q => q.type === QuestionType.LISTENING);
    return dbQuestions; 
  }

  // 3. AI 무한 생성 엔진 가동
  return await callGeminiToGenerateQuestions(mode, setNumber);
};

async function callGeminiToGenerateQuestions(mode: ExamMode, setNumber: number): Promise<Question[]> {
  const ai = getAI();
  const themes = ["Construction Site Safety", "Agricultural Equipment", "Manufacturing Workplace", "Service Industry Korean", "Public Safety Signs", "Hospitality & Tourism"];
  const currentTheme = themes[setNumber % themes.length];
  
  const prompt = `You are a world-class EPS-TOPIK expert examiner.
  Generate 20 high-quality Korean exam questions for Round ${setNumber}.
  Theme: ${currentTheme}.
  Current Mode: ${mode}.
  
  Requirements:
  1. If mode is FULL: 10 Reading, 10 Listening.
  2. For READING: Include realistic work scenarios, safety signs, or long passages.
  3. For LISTENING: Provide a natural dialogue script in the 'context' field.
  4. Visuals: Every single question MUST have an 'imagePrompt' for AI generation.
  5. JSON: Return a strict JSON array of Question objects.`;

  try {
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
              type: { type: Type.STRING, enum: [QuestionType.READING, QuestionType.LISTENING] },
              category: { type: Type.STRING },
              questionText: { type: Type.STRING },
              context: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              imagePrompt: { type: Type.STRING }
            },
            required: ["id", "type", "questionText", "options", "correctAnswer", "imagePrompt"]
          }
        }
      }
    });

    const text = response.text;
    return JSON.parse(cleanJson(text));
  } catch (error) {
    console.error("AI Generation failed:", error);
    return [...STATIC_EXAM_DATA].sort(() => Math.random() - 0.5).slice(0, 10);
  }
}

export const generateImage = async (prompt: string): Promise<string | null> => {
  if (!prompt) return null;
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [{ text: `Professional industrial/educational illustration for EPS-TOPIK: ${prompt}. Clean vector art style, bright colors, white background.` }] 
      },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return part?.inlineData ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (err) {
    console.error("Image generation failed:", err);
    return null;
  }
};

export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `잘 듣고 알맞은 것을 고르십시오. ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        }
      }
    });
    
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      return await decodeAudioData(decodeBase64(base64), ctx, 24000, 1);
    }
    return null;
  } catch (err) {
    console.error("Speech generation failed:", err);
    return null;
  }
};

export const analyzePerformance = async (session: ExamSession): Promise<AnalyticsFeedback | null> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze EPS-TOPIK Performance. Score: ${session.score}/${session.questions.length}. Feedback in English.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJson(response.text));
  } catch {
    return null;
  }
};
