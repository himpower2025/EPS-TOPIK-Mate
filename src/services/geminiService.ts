
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
 * AI 이미지 생성 (설명을 바탕으로 시험용 그림 제작)
 */
export const generateImageForQuestion = async (description: string): Promise<string | null> => {
  if (!description || description.length > 200) return null;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `EPS-TOPIK exam style illustration: ${description}. Clear black lines, white background, no text in image.` }]
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
 * AI 무한 문제 생성 로직
 * STATIC_EXAM_DATA(400문항)를 예시로 사용하여 새로운 문제를 생성합니다.
 */
export const generateQuestions = async (count: number = 40, isPremium: boolean = false, mode: 'FULL' | 'LISTENING' | 'READING' = 'FULL'): Promise<Question[]> => {
  if (!isPremium) {
    // 무료 사용자는 기존 400문항 중 랜덤 셔플
    let filtered = [...STATIC_EXAM_DATA];
    if (mode === 'LISTENING') filtered = filtered.filter(q => q.type === QuestionType.LISTENING);
    if (mode === 'READING') filtered = filtered.filter(q => q.type === QuestionType.READING);
    return filtered.sort(() => 0.5 - Math.random()).slice(0, count);
  }

  // 프리미엄: AI를 통한 무한 생성
  try {
    const samples = STATIC_EXAM_DATA.sort(() => 0.5 - Math.random()).slice(0, 5);
    const prompt = `You are a professional EPS-TOPIK examiner. 
    Based on these samples: ${JSON.stringify(samples)}, 
    generate ${count} completely NEW questions for ${mode} mode.
    
    Rules:
    1. If mode is READING, generate reading questions (vocabulary, grammar, passages).
    2. If mode is LISTENING, generate listening questions (scripts in 'context' field).
    3. If mode is FULL, generate 1-20 Reading, 21-40 Listening.
    4. Questions and options must be in Korean. Explanation in English.
    5. 'context' for images should be a short description like 'A person riding a bicycle'.
    
    Return as a JSON array of Questions.`;

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
              explanation: { type: Type.STRING }
            },
            required: ["id", "type", "category", "questionText", "options", "correctAnswer"]
          }
        }
      }
    });

    const text = response.text;
    if (text) return JSON.parse(cleanJsonString(text));
    throw new Error("Empty response");
  } catch (error) {
    console.error("AI Generation failed, falling back to static data", error);
    return STATIC_EXAM_DATA.sort(() => 0.5 - Math.random()).slice(0, count);
  }
};

/**
 * AI 음성 생성 (TTS)
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
    console.error("TTS Error:", error);
    return null;
  }
};

export const analyzePerformance = async (session: ExamSession): Promise<AnalyticsFeedback | null> => {
  try {
    const prompt = `Analyze EPS-TOPIK result: ${session.score}/${session.questions.length}. Provide JSON feedback.`;
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
    return response.text ? JSON.parse(cleanJsonString(response.text)) : null;
  } catch (error) {
    return null;
  }
};
