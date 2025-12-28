
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, QuestionType, AnalyticsFeedback, ExamSession } from '../types';
import { STATIC_EXAM_DATA } from '../data/examData';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

function cleanJsonString(text: string): string {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

function decodeBase64(base64: string) {
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
 * AI 이미지 생성 (그림 문제 대응)
 */
export const generateImageForQuestion = async (description: string): Promise<string | null> => {
  if (!description || description.length > 200) return null;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Professional EPS-TOPIK exam illustration. Style: Simple black and white line art, professional, clear. Subject: ${description}. White background only.` }]
      },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    const parts = response?.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * [핵심] DB 기반 무한 문제 생성 엔진
 */
export const generateQuestions = async (count: number = 40, isPremium: boolean = false, mode: 'FULL' | 'LISTENING' | 'READING' = 'FULL'): Promise<Question[]> => {
  // 1. 기본적으로 400문항 DB에서 무작위 추출 (기본 풀 구성)
  let dbPool = [...STATIC_EXAM_DATA];
  if (mode === 'LISTENING') dbPool = dbPool.filter(q => q.type === QuestionType.LISTENING);
  if (mode === 'READING') dbPool = dbPool.filter(q => q.type === QuestionType.READING);
  
  const shuffledDb = dbPool.sort(() => 0.5 - Math.random());
  
  // 무료 사용자이거나 AI 생성이 실패할 경우를 대비해 DB 기반으로 먼저 섞음
  const selectedFromDb = shuffledDb.slice(0, count);

  if (!isPremium) return selectedFromDb;

  // 2. 프리미엄 사용자: DB 문항을 Seed로 하여 유사 문형 AI 생성
  try {
    // DB에서 학습용 샘플 10개를 뽑아 AI에게 전달
    const seedSamples = shuffledDb.slice(0, 10);
    const prompt = `You are an official EPS-TOPIK examiner. 
    Use the following database questions as your strict standard for vocabulary, grammar level, and style:
    ${JSON.stringify(seedSamples)}

    TASK:
    Generate ${count} completely new questions that follow the EXACT same logic, difficulty, and format as the samples. 
    - Mode: ${mode}
    - If FULL mode: Questions 1-20 must be READING, 21-40 must be LISTENING.
    - All text must be in natural Korean. Explanations in English.
    - For LISTENING questions, put the script in the 'context' field.
    - For READING questions with images, put a short description in 'context'.
    
    Return a JSON array of Question objects.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // 복잡한 추론을 위해 Pro 모델 사용
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
              explanation: { type: Type.STRING }
            },
            required: ["id", "type", "category", "questionText", "options", "correctAnswer"]
          }
        }
      }
    });

    const aiQuestions = JSON.parse(cleanJsonString(response.text || '[]'));
    
    // DB 문제와 AI 생성 문제를 적절히 섞어 최상의 경험 제공 (50:50 비율 등)
    if (aiQuestions && aiQuestions.length > 0) {
      const half = Math.floor(count / 2);
      return [...selectedFromDb.slice(0, half), ...aiQuestions.slice(0, count - half)].sort(() => 0.5 - Math.random());
    }
  } catch (error) {
    console.warn("AI Generation failed, using full DB shuffle instead.");
  }

  return selectedFromDb;
};

/**
 * TTS 음성 생성
 */
export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `잘 듣고 질문에 답하십시오. ${text}` }] }],
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
      const bytes = decodeBase64(base64Audio);
      return await decodeAudioData(bytes, audioContext, 24000, 1);
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const analyzePerformance = async (session: ExamSession): Promise<AnalyticsFeedback | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze EPS-TOPIK results: ${JSON.stringify(session.score)}/${session.questions.length}. Provide JSON study plan.`,
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
    return response.text ? JSON.parse(cleanJsonString(response.text)) : null;
  } catch (error) {
    return null;
  }
};
