import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, QuestionType, AnalyticsFeedback, ExamSession, ExamMode } from '../types';
import { STATIC_EXAM_DATA } from '../data/examData';

/**
 * Re-initialize AI client to ensure the latest API key is used.
 */
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Audio Helpers ---
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

const cleanJson = (text: string) => text.replace(/```json/g, '').replace(/```/g, '').trim();

/**
 * INFINITE QUESTION GENERATOR
 * Uses Gemini 3 Pro to create new, unique exam content based on current trends.
 */
export const generateQuestionsBySet = async (
  mode: ExamMode, 
  setNumber: number, 
  _isPremium: boolean
): Promise<Question[]> => {
  const ai = getAI();
  const themes = ["Safety", "Hospital", "Transport", "Market", "Bank", "Farming", "Factory", "Etiquette"];
  const theme = themes[setNumber % themes.length];

  try {
    const prompt = `Act as an official EPS-TOPIK examiner. Create 20 unique Korean questions for Round ${setNumber} (Theme: ${theme}).
    IMPORTANT: Provide English explanations. Every question MUST have an 'imagePrompt' for AI visualization.
    For Listening questions, provide 'context' as a Man/Woman dialogue if needed.
    Return only a JSON array matching the Question type.`;

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
              imagePrompt: { type: Type.STRING }
            },
            required: ["id", "type", "category", "questionText", "options", "correctAnswer", "explanation"]
          }
        }
      }
    });

    return JSON.parse(cleanJson(response.text || '[]'));
  } catch (error) {
    console.warn("AI generation failed, using static fallback.");
    return [...STATIC_EXAM_DATA].sort(() => Math.random() - 0.5).slice(0, 20);
  }
};

/**
 * PRO VISUAL SYNTHESIS
 * Generates realistic exam images including tables and IDs.
 */
export const generateImage = async (prompt: string): Promise<string | null> => {
  if (!prompt) return null;
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { 
        parts: [{ text: `Official EPS-TOPIK Exam Graphic. Clean, high-quality, professional educational illustration. SUBJECT: ${prompt}.` }] 
      },
      config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } }
    });
    const parts = response.candidates?.[0]?.content?.parts;
    const imgPart = parts?.find(p => p.inlineData);
    return imgPart?.inlineData?.data ? `data:image/png;base64,${imgPart.inlineData.data}` : null;
  } catch { return null; }
};

/**
 * MULTI-SPEAKER SPEECH GENERATION
 */
export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  const ai = getAI();
  const isDialogue = text.includes("Man:") || text.includes("Woman:") || text.includes("가:") || text.includes("나:");
  try {
    const config: any = { responseModalities: [Modality.AUDIO] };
    if (isDialogue) {
      config.speechConfig = {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            { speaker: 'Man', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
            { speaker: 'Woman', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
          ]
        }
      };
    } else {
      config.speechConfig = { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } };
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `잘 듣고 질문에 알맞은 대답을 고르십시오. ${text}` }] }],
      config
    });
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      return await decodeAudioData(decode(base64), ctx, 24000, 1);
    }
    return null;
  } catch { return null; }
};

export const analyzePerformance = async (session: ExamSession): Promise<AnalyticsFeedback | null> => {
  const ai = getAI();
  try {
    const prompt = `Analyze EPS-TOPIK results. Score: ${session.score}/${session.questions.length}. Provide expert feedback in English. Return JSON.`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJson(response.text || '{}'));
  } catch { return null; }
};