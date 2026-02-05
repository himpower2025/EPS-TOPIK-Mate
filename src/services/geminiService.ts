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

const cleanJson = (text: string | undefined): string => 
  (text ?? "").replace(/```json/g, '').replace(/```/g, '').replace(/\/\*.*?\*\//gs, '').trim();

/**
 * 플랜별 데이터 매핑 및 AI 생성 핵심 로직
 */
export const generateQuestionsBySet = async (mode: ExamMode, roundNumber: number, plan: PlanType): Promise<Question[]> => {
  // 1. 무료 사용자/맛보기 로직 (Set 10 활용)
  if (plan === 'free') {
    if (mode === 'READING') {
      return STATIC_EXAM_DATA.filter(q => q.id.includes('s10_r_') && parseInt(q.id.split('_r_')[1]) <= 10);
    }
    if (mode === 'LISTENING') {
      return STATIC_EXAM_DATA.filter(q => q.id.includes('s10_l_') && parseInt(q.id.split('_l_')[1]) >= 21 && parseInt(q.id.split('_l_')[1]) <= 29);
    }
    if (mode === 'FULL') {
      const r = STATIC_EXAM_DATA.filter(q => q.id.includes('s10_r_') && parseInt(q.id.split('_r_')[1]) >= 11 && parseInt(q.id.split('_r_')[1]) <= 20);
      const l = STATIC_EXAM_DATA.filter(q => q.id.includes('s10_l_') && parseInt(q.id.split('_l_')[1]) >= 30 && parseInt(q.id.split('_l_')[1]) <= 40);
      return [...r, ...l];
    }
  }

  // 2. 유료 플랜 매핑 로직 시작
  let targetSetIndex = -1;
  let useAI = false;

  if (plan === '1m') {
    if (mode === 'READING' || mode === 'LISTENING') targetSetIndex = roundNumber; // 1-5
    else if (mode === 'FULL') targetSetIndex = [12, 14, 16, 18, 20][roundNumber - 1]; // 12, 14...
  } 
  else if (plan === '3m') {
    if (mode === 'READING' || mode === 'LISTENING') targetSetIndex = roundNumber; // 1-20
    else if (mode === 'FULL') {
      if (roundNumber <= 10) targetSetIndex = roundNumber + 20; // 21-30
      else useAI = true; // 31-40 (AI)
    }
  } 
  else if (plan === '6m') {
    if (mode === 'READING' || mode === 'LISTENING') {
      if (roundNumber <= 15) targetSetIndex = roundNumber; // 1-15
      else useAI = true; // 16-50 (AI)
    } else if (mode === 'FULL') {
      if (roundNumber <= 15) targetSetIndex = roundNumber + 15; // 16-30
      else useAI = true; // 31-50 (AI)
    }
  }

  // DB에서 가져오기
  if (!useAI && targetSetIndex !== -1) {
    const setPrefix = `s${targetSetIndex}_`;
    const setData = STATIC_EXAM_DATA.filter(q => q.id.startsWith(setPrefix));
    
    if (mode === 'READING') return setData.filter(q => q.type === QuestionType.READING).slice(0, 20);
    if (mode === 'LISTENING') return setData.filter(q => q.type === QuestionType.LISTENING).slice(0, 20);
    if (mode === 'FULL') {
      const r = setData.filter(q => q.type === QuestionType.READING).slice(0, 20);
      const l = setData.filter(q => q.type === QuestionType.LISTENING).slice(0, 20);
      return [...r, ...l];
    }
  }

  // AI 생성 로직 (Gaps 필터링)
  const ai = getAI();
  try {
    const prompt = `You are an elite EPS-TOPIK examiner. Generate a COMPLETE ${mode} question set for Round ${roundNumber}. 
    Your goal is to perfectly mimic the difficulty, vocabulary, and patterns of the existing 30-set database.
    - If mode is READING: 20 high-quality reading questions.
    - If mode is LISTENING: 20 high-quality listening questions with scripts.
    - If mode is FULL: 20 reading + 20 listening questions.
    Ensure 'imagePrompt' is included for all visual-based questions. Return as JSON.`;

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

    const jsonText = cleanJson(response.text);
    return JSON.parse(jsonText);
  } catch (err) {
    console.error("AI Generation Error:", err);
    return STATIC_EXAM_DATA.slice(0, 20); // Fallback
  }
};

export const generateImage = async (prompt: string): Promise<string | null> => {
  if (!prompt) return null;
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [{ text: `High-quality industrial photography for EPS-TOPIK exam: ${prompt}. Professional, clean, and educational.` }] 
      },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    
    const candidate = response.candidates?.[0];
    const part = candidate?.content?.parts?.find(p => p.inlineData);
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
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        }
      }
    });
    
    const candidate = response.candidates?.[0];
    const audioData = candidate?.content?.parts?.[0]?.inlineData?.data;
    if (audioData) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      return await decodeAudioData(decodeBase64(audioData), ctx, 24000, 1);
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
      contents: `Analyze EPS-TOPIK session score: ${session.score}/${session.questions.length}.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJson(response.text));
  } catch {
    return null;
  }
};
