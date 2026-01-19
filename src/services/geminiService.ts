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
 * 무한 문제 생성 엔진 (Gemini 3 Pro)
 */
export const generateQuestionsBySet = async (
  _mode: ExamMode, 
  setNumber: number, 
  plan: PlanType
): Promise<Question[]> => {
  const ai = getAI();
  const categories = ["Workplace Safety", "Industrial Tools", "Daily Life in Korea", "Public Signs", "Transportation", "Shopping & Prices"];
  const category = categories[setNumber % categories.length];

  try {
    const prompt = `당신은 대한민국 산업인력공단 EPS-TOPIK 출제 위원입니다. 
    Round ${setNumber}를 위한 고퀄리티 문항 10개를 생성하십시오. (주제: ${category}, 플랜: ${plan})
    
    [필수 규칙]
    1. 읽기(READING)와 듣기(LISTENING)를 5:5 비율로 섞으십시오.
    2. 모든 문항은 실시간 AI 이미지 생성을 위한 'imagePrompt'를 가져야 합니다.
    3. 만약 문제가 "그림을 보고 맞는 것을 고르십시오" 유형이라면, 'optionImagePrompts' 필드에 4개의 보기용 이미지 프롬프트를 포함시키십시오.
    4. 실제 한국어 시험 수준을 유지하되, 설명(explanation)은 학습자를 위해 영어로 작성하십시오.
    5. JSON 형식으로 Question 인터페이스를 엄격히 준수하여 반환하십시오.`;

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
  } catch (error) {
    console.error("AI Generation Error:", error);
    return [...STATIC_EXAM_DATA].sort(() => Math.random() - 0.5).slice(0, 10);
  }
};

/**
 * AI 고화질 삽화 생성 엔진
 */
export const generateImage = async (prompt: string): Promise<string | null> => {
  if (!prompt) return null;
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [{ text: `EPS-TOPIK educational illustration: ${prompt}. Clean, 2D vector style, bright lighting.` }] 
      },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });
    
    // [Fix] Optional Chaining(?.)을 사용하여 candidates와 parts 접근 시 발생하던 타입 에러를 완전히 해결했습니다.
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (err) {
    console.error("Image Generation Failed:", err);
    return null; 
  }
};

/**
 * AI 리얼 보이스 생성 엔진 (Gemini 2.5 TTS)
 */
export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  const ai = getAI();
  const isDialogue = text.includes("Man:") || text.includes("Woman:") || text.includes("남:") || text.includes("여:");
  
  try {
    const config: any = { 
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
      }
    };

    if (isDialogue) {
      config.speechConfig = {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            { speaker: 'Man', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
            { speaker: 'Woman', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
          ]
        }
      };
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config
    });
    
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      return await decodeAudioData(decode(base64), ctx, 24000, 1);
    }
    return null;
  } catch (err) {
    console.error("Speech Generation Failed:", err);
    return null; 
  }
};

export const analyzePerformance = async (session: ExamSession): Promise<AnalyticsFeedback | null> => {
  const ai = getAI();
  try {
    const prompt = `EPS-TOPIK 성적 분석: ${session.score}/${session.questions.length}. 
    분석 보고서를 영어로 작성하고 JSON으로 반환하십시오.`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJson(response.text || '{}'));
  } catch { return null; }
};