
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

const cleanJson = (text: string) => text.replace(/```json/g, '').replace(/```/g, '').trim();

export const generateQuestionsBySet = async (
  mode: ExamMode, 
  setNumber: number, 
  _isPremium: boolean
): Promise<Question[]> => {
  const readingCount = mode === 'LISTENING' ? 0 : 20;
  const listeningCount = mode === 'READING' ? 0 : 20;

  const themes = [
    "Construction & Safety", "Agriculture & Livestock", "Manufacturing & Salary",
    "Daily Life & Transport", "Hospital & Emergency", "Traditional Market & Food",
    "Office Etiquette", "Public Services", "Housing & Moving", "Weather & Seasons"
  ];
  const currentTheme = themes[setNumber % themes.length];

  try {
    const prompt = `You are an EPS-TOPIK examiner. Create Set #${setNumber} (Theme: ${currentTheme}).
    
    STRICT PATTERNS FOR LISTENING (Q21-Q40):
    1. Pattern A (Q21-22): Word Recognition. 'context' is the target word. 'options' are 4 similar sounding words.
    2. Pattern B (Q23-24): Dialogue to Image. 'context' is the dialogue. 'options' are 4 strings describing DIFFERENT images (one matches context). Set 'hasImageOptions' to true.
    3. Pattern C (Q25-29): Look at Image, Choose Spoken Option. 'imagePrompt' describes ONE main image. 'options' are 4 spoken sentences (e.g. "1. It's a desk. 2. It's a chair...").
    4. Pattern D (Q36-37): Dialogue to Situation Image. Similar to Pattern B.
    
    Structure your JSON with 'imagePrompt' (for Q context) or 'optionImagePrompts' (array of 4 for Pattern B/D).
    
    Return JSON array.`;

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
              explanation: { type: Type.STRING },
              imagePrompt: { type: Type.STRING },
              optionImagePrompts: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["id", "type", "category", "questionText", "options", "correctAnswer"]
          }
        }
      }
    });

    const questions = JSON.parse(cleanJson(response.text || '[]'));
    return questions;
  } catch (error) {
    console.warn("Synthesis failed, falling back.");
    return [...STATIC_EXAM_DATA].sort(() => Math.random() - 0.5).slice(0, readingCount + listeningCount);
  }
};

export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `잘 듣고 질문에 알맞은 대답을 고르십시오. ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      return await decodeAudioData(decode(base64), ctx, 24000, 1);
    }
    return null;
  } catch { return null; }
};

export const generateImage = async (prompt: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `EPS-TOPIK Korean exam style illustration, simple minimalist black and white line art, clean educational clip art. Subject: ${prompt}` }] },
    });
    const parts = response.candidates?.[0]?.content?.parts;
    const imgPart = parts?.find(p => p.inlineData);
    if (imgPart && imgPart.inlineData && imgPart.inlineData.data) {
        return `data:image/png;base64,${imgPart.inlineData.data}`;
    }
    return null;
  } catch { return null; }
};

export const analyzePerformance = async (session: ExamSession): Promise<AnalyticsFeedback | null> => {
  try {
    const prompt = `Analyze EPS-TOPIK Score: ${session.score}/${session.questions.length}. Provide expert JSON feedback.`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJson(response.text || '{}'));
  } catch { return null; }
};
