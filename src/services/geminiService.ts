
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, QuestionType, AnalyticsFeedback, ExamSession, ExamMode } from '../types';
import { STATIC_EXAM_DATA } from '../data/examData';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Audio Decoding Helpers ---
function decode(base64: string): Uint8Array {
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

function cleanJsonString(text: string): string {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

export const generateQuestionsBySet = async (
  mode: ExamMode, 
  setNumber: number, 
  isPremium: boolean
): Promise<Question[]> => {
  const readingCount = mode === 'LISTENING' ? 0 : 20;
  const listeningCount = mode === 'READING' ? 0 : 20;
  const totalCount = readingCount + listeningCount;

  // 회차별 테마 배정 (중복 방지를 위한 시드)
  const themes = [
    "Workplace Safety & Protective Gear",
    "Agricultural Tools & Harvesting",
    "Construction Site Communication",
    "Manufacturing Machine Operation",
    "Employment Contracts & Labor Laws",
    "Korean Traditional Culture & Holidays",
    "Daily Life & Public Transportation",
    "Office Manners & Teamwork",
    "Industrial Accident Prevention",
    "Shopping & Financial Transactions"
  ];
  const currentTheme = themes[(setNumber - 1) % themes.length];

  try {
    const prompt = `You are a professional EPS-TOPIK examiner. Create Exam Set #${setNumber}.
    THEME FOR THIS SET: ${currentTheme}.
    
    CRITICAL INSTRUCTIONS:
    1. NEVER REUSE existing question patterns. 
    2. SYNTHESIZE 100% original scenarios, dialogues, and reading passages.
    3. Ensure variety in vocabulary related to ${currentTheme}.
    4. For READING: Create clear situational passages (50-100 chars).
    5. For LISTENING: Provide a natural dialogue script in 'context' for TTS.
    
    Structure: ${readingCount} Reading, ${listeningCount} Listening.
    Return as JSON array of Question objects.`;

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
              options: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 4, maxItems: 4 },
              correctAnswer: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ["id", "type", "category", "questionText", "options", "correctAnswer"]
          }
        }
      }
    });

    const aiQuestions = JSON.parse(cleanJsonString(response.text || '[]'));
    if (aiQuestions.length > 0) return aiQuestions;
  } catch (error) {
    console.warn("AI Generation fallback due to duplication control.");
  }

  // Fallback with strong shuffle
  return [...STATIC_EXAM_DATA].sort(() => Math.random() - 0.5).slice(0, totalCount);
};

export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `잘 듣고 대답하십시오. ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      return await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
    }
    return null;
  } catch { return null; }
};

export const generateImageForQuestion = async (description: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Professional EPS-TOPIK exam line-art. Simple black and white illustration of: ${description}` }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    const parts = response.candidates?.[0]?.content?.parts;
    for (const part of parts!) if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    return null;
  } catch { return null; }
};

export const analyzePerformance = async (session: ExamSession): Promise<AnalyticsFeedback | null> => {
  try {
    const prompt = `Analyze EPS-TOPIK Result. Score: ${session.score}/${session.questions.length}. Provide JSON analysis.`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '{}'));
  } catch { return null; }
};
