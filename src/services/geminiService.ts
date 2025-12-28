
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
 * AI Image Generation for Exam Context
 */
export const generateImageForQuestion = async (description: string): Promise<string | null> => {
  if (!description || description.length > 200) return null;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Professional EPS-TOPIK exam illustration. Simple line art, high contrast, clear objects. Subject: ${description}. White background.` }]
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
 * AI Question Generation Engine
 * Uses the 400-question DB as a seed to maintain style and difficulty.
 */
export const generateQuestions = async (count: number = 40, isPremium: boolean = false, mode: 'FULL' | 'LISTENING' | 'READING' = 'FULL'): Promise<Question[]> => {
  let dbPool = [...STATIC_EXAM_DATA];
  if (mode === 'LISTENING') dbPool = dbPool.filter(q => q.type === QuestionType.LISTENING);
  if (mode === 'READING') dbPool = dbPool.filter(q => q.type === QuestionType.READING);
  
  const shuffledDb = dbPool.sort(() => 0.5 - Math.random());
  const selectedFromDb = shuffledDb.slice(0, count);

  if (!isPremium) return selectedFromDb;

  try {
    const seedSamples = shuffledDb.slice(0, 5);
    const prompt = `You are an expert EPS-TOPIK examiner. Create ${count} new questions mirroring these samples: ${JSON.stringify(seedSamples)}.
    Mode: ${mode}. If FULL, Questions 1-20 are READING, 21-40 are LISTENING.
    Text must be in natural Korean. Explain in English. 
    Listening scripts should involve conversations like 'Man: ... Woman: ...' for realism.
    Return JSON array of Question objects.`;

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

    const aiQuestions = JSON.parse(cleanJsonString(response.text || '[]'));
    if (aiQuestions && aiQuestions.length > 0) {
      // Merge DB and AI questions for the ultimate pool
      return [...selectedFromDb.slice(0, count/2), ...aiQuestions.slice(0, count/2)].sort(() => 0.5 - Math.random());
    }
  } catch (error) {
    console.warn("AI Generation fallback to DB.");
  }
  return selectedFromDb;
};

/**
 * Natural Multi-Speaker TTS System
 * Automatically detects Man/Woman in script and uses distinct voices.
 */
export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  try {
    const hasMultipleSpeakers = /남:|여:|Man:|Woman:/.test(text);
    
    const config: any = {
      responseModalities: [Modality.AUDIO],
    };

    if (hasMultipleSpeakers) {
      config.speechConfig = {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            { speaker: 'Man', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
            { speaker: 'Nam', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
            { speaker: 'Woman', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            { speaker: 'Yeo', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
          ]
        }
      };
    } else {
      config.speechConfig = {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
      };
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `잘 듣고 질문에 답하십시오. ${text}` }] }],
      config: config
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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze EPS-TOPIK score: ${session.score}/${session.questions.length}. Provide English feedback.`,
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
