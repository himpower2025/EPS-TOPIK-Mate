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

// 1. undefined 입력을 명시적으로 허용하여 타입 에러 해결
const cleanJson = (text: string | undefined): string => 
  (text || '').replace(/```json/g, '').replace(/```/g, '').replace(/\/\*.*?\*\//gs, '').trim();

export const generateQuestionsBySet = async (mode: ExamMode, setNumber: number, plan: PlanType): Promise<Question[]> => {
  // 무료 플랜일 경우 정적 데이터 반환 (변수 사용 명시하여 미사용 경고 해결)
  if (plan === 'free') {
    if (mode === 'READING') return STATIC_EXAM_DATA.filter(q => q.id.startsWith('s1_r')).slice(0, 10);
    if (mode === 'LISTENING') return STATIC_EXAM_DATA.filter(q => q.id.startsWith('s1_l')).slice(0, 10);
    return [...STATIC_EXAM_DATA].slice(0, 10);
  }

  const ai = getAI();
  const themes = ["Safety Gear", "Industrial Tools", "Daily Life", "Signs", "Workplace Dialogues"];
  const theme = themes[setNumber % themes.length];

  try {
    const prompt = `You are a professional EPS-TOPIK examiner. Create 10 realistic questions for Round ${setNumber} (Theme: ${theme}, Mode: ${mode}). Mix READING and LISTENING. Return JSON matching the Question interface.`;

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

    // 2. response.text ?? "" 를 사용하여 undefined 방지
    const jsonText = cleanJson(response.text ?? "");
    return jsonText ? JSON.parse(jsonText) : [];
  } catch (error) {
    console.warn("AI Generation failed, using fallback data", error);
    return [...STATIC_EXAM_DATA].sort(() => Math.random() - 0.5).slice(0, 10);
  }
};

export const generateImage = async (prompt: string): Promise<string | null> => {
  if (!prompt) return null;
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [{ text: `Industrial educational illustration for Korean exam: ${prompt}. 2D vector art, white background.` }] 
      },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    
    // 3. Optional Chaining(?.)을 사용하여 Object is possibly 'undefined' 에러 해결
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
      contents: [{ parts: [{ text: `질문을 잘 듣고 답하십시오. ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        }
      }
    });
    
    // 4. Optional Chaining으로 안전하게 접근
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
      contents: `EPS-TOPIK Analysis. Score: ${session.score}/${session.questions.length}. Feedback in English. Return JSON.`,
      config: { responseMimeType: "application/json" }
    });
    // 5. response.text ?? "" 로 안전하게 전달
    const jsonText = cleanJson(response.text ?? "");
    return jsonText ? JSON.parse(jsonText) : null;
  } catch {
    return null;
  }
};
