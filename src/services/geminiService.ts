
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, QuestionType, AnalyticsFeedback, ExamSession } from '../types';
import { STATIC_EXAM_DATA } from '../data/examData';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

function cleanJsonString(text: string): string {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

function decode(base64: string) {
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

/**
 * AI 이미지 생성 (설명을 바탕으로 시험용 그림 제작)
 */
export const generateImageForQuestion = async (description: string): Promise<string | null> => {
  if (!description) return null;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A clear black and white illustration for EPS-TOPIK exam, professional line art style, showing: ${description}. White background, simple context.` }]
      },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });

    const parts = response?.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("AI Image Generation Error:", error);
    return null;
  }
};

/**
 * AI 문제 생성 및 셔플 로직
 */
export const generateQuestions = async (count: number = 40, isPremium: boolean = false, mode: 'FULL' | 'LISTENING' | 'READING' = 'FULL'): Promise<Question[]> => {
  // 모드별 필터링
  let baseData = [...STATIC_EXAM_DATA];
  if (mode === 'LISTENING') baseData = baseData.filter(q => q.type === QuestionType.LISTENING);
  if (mode === 'READING') baseData = baseData.filter(q => q.type === QuestionType.READING);

  // 항상 셔플하여 중복 방지
  const shuffled = baseData.sort(() => 0.5 - Math.random());
  
  // 프리미엄이고 AI 생성이 필요한 경우 (나중에 확장)
  if (isPremium && count > shuffled.length) {
     // AI 생성 로직은 생략 (STATIC 데이터 우선 사용)
  }

  return shuffled.slice(0, count);
};

/**
 * AI 음성 생성 (TTS)
 */
export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `다음을 듣고 질문에 답하십시오: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      const bytes = decode(base64Audio);
      return await decodeAudioData(bytes, audioContext, 24000, 1);
    }
    return null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

export const analyzePerformance = async (session: ExamSession): Promise<AnalyticsFeedback | null> => {
  try {
    const prompt = `Analyze EPS-TOPIK score ${session.score}/${session.questions.length}. Give study advice in JSON format.`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallAssessment: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            studyPlan: { type: Type.STRING }
          },
          required: ["overallAssessment", "strengths", "weaknesses", "studyPlan"]
        }
      }
    });
    
    const text = response.text;
    return text ? JSON.parse(cleanJsonString(text)) : null;
  } catch (error) {
    console.error("Analysis Error:", error);
    return null;
  }
};
