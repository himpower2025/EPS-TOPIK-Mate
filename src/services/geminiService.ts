import { GoogleGenAI, Modality } from "@google/genai";
import { Question, AnalyticsFeedback, ExamSession, ExamMode, PlanType } from '../types';
import { STATIC_EXAM_DATA } from '../data/examData';

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Utilities ---
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
 * [Core Engine] Supply questions based on user plan
 * 1m: 1-5 Exam, 1-20 Lab
 * 3m: 1-30 Exam, 1-70 Lab
 * 6m: 1-70 Exam (30 DB + 40 AI), 1-150 Lab (60 DB + 90 AI)
 */
export const generateQuestionsBySet = async (mode: ExamMode, setNumber: number, plan: PlanType): Promise<Question[]> => {
  if (plan === 'free') {
    return STATIC_EXAM_DATA.slice(0, 10);
  }

  if (plan === '6m') {
    if (mode === 'FULL') {
      if (setNumber <= 30) return STATIC_EXAM_DATA.filter(q => q.id.startsWith(`s${setNumber}_`));
      return await callGeminiToGenerateQuestions(mode, setNumber, 40);
    } else {
      if (setNumber <= 60) {
        const dbIdx = Math.ceil(setNumber / 2);
        const isOdd = setNumber % 2 !== 0;
        const typeKey = mode === 'READING' ? 'r' : 'l';
        const all = STATIC_EXAM_DATA.filter(q => q.id.startsWith(`s${dbIdx}_${typeKey}_`));
        return isOdd ? all.slice(0, 10) : all.slice(10, 20);
      }
      return await callGeminiToGenerateQuestions(mode, setNumber, 10);
    }
  }

  if (plan === '3m') {
    if (mode === 'FULL') {
      if (setNumber <= 30) return STATIC_EXAM_DATA.filter(q => q.id.startsWith(`s${setNumber}_`));
      return await callGeminiToGenerateQuestions(mode, setNumber, 40);
    } else {
      if (setNumber <= 60) {
        const dbIdx = Math.ceil(setNumber / 2);
        const isOdd = setNumber % 2 !== 0;
        const typeKey = mode === 'READING' ? 'r' : 'l';
        const all = STATIC_EXAM_DATA.filter(q => q.id.startsWith(`s${dbIdx}_${typeKey}_`));
        return isOdd ? all.slice(0, 10) : all.slice(10, 20);
      }
      return await callGeminiToGenerateQuestions(mode, setNumber, 10);
    }
  }

  if (plan === '1m') {
    if (mode === 'FULL') {
      return STATIC_EXAM_DATA.filter(q => q.id.startsWith(`s${setNumber}_`));
    } else {
      const dbIdx = Math.ceil(setNumber / 2);
      const isOdd = setNumber % 2 !== 0;
      const typeKey = mode === 'READING' ? 'r' : 'l';
      const all = STATIC_EXAM_DATA.filter(q => q.id.startsWith(`s${dbIdx}_${typeKey}_`));
      return isOdd ? all.slice(0, 10) : all.slice(10, 20);
    }
  }

  return STATIC_EXAM_DATA.slice(0, 10);
};

async function callGeminiToGenerateQuestions(mode: ExamMode, setNumber: number, count: number): Promise<Question[]> {
  const ai = getAI();
  const prompt = `You are an expert EPS-TOPIK examiner. Create ${count} realistic exam questions.
  Mode: ${mode}, Round: ${setNumber}. 
  Focus on industrial safety and workplace Korean. 
  Each question must have an 'imagePrompt' for visual generation.
  IMPORTANT: Explanations and UI text in the JSON must be in English. Question text and options must be in Korean.
  Format: JSON array of Question objects.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJson(response.text || '[]'));
  } catch (err) {
    console.error("AI Generation failed:", err);
    return STATIC_EXAM_DATA.sort(() => Math.random() - 0.5).slice(0, count);
  }
}

export const generateImage = async (prompt: string): Promise<string | null> => {
  if (!prompt) return null;
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `High-quality industrial photography or EPS-TOPIK style illustration: ${prompt}` }] },
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
      contents: `Analyze EPS-TOPIK score: ${session.score}/${session.questions.length}. 
      Provide detailed feedback, strengths, and weaknesses strictly in English for a global student.
      Output as JSON.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJson(response.text || '{}'));
  } catch { return null; }
};