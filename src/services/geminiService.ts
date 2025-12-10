import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, QuestionType, AnalyticsFeedback, ExamSession } from '../types';
import { STATIC_EXAM_DATA } from '../data/examData';

// [FIX] Vite replaces 'process.env.API_KEY' with the actual string at build time.
// We declare process variable to satisfy TypeScript, but we do not check its existence 
// at runtime because Vite inlines the value.
declare const process: { env: { API_KEY: string } };

const getAiClient = () => {
  // Directly access process.env.API_KEY so Vite can replace it.
  // Do NOT check 'typeof process' because it will fail in the browser.
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    console.warn("Gemini API Key is missing. Features relying on AI will utilize static data or fail gracefully.");
    return null;
  }
  
  try {
    return new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error("Error initializing GoogleGenAI client:", error);
    return null;
  }
};

function cleanJsonString(text: string): string {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function pcmToAudioBuffer(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000, 
  numChannels: number = 1
): AudioBuffer {
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

// --- Main Service Functions ---

export const generateQuestions = async (count: number = 10, useStatic: boolean = false): Promise<Question[]> => {
  const ai = getAiClient();

  if (useStatic || !ai) {
    if (!ai && !useStatic) {
      console.warn("Gemini API Key is missing. Falling back to static data.");
    }
    return Array.from({ length: count }, (_, i) => {
      const q = STATIC_EXAM_DATA[i % STATIC_EXAM_DATA.length];
      return { ...q, id: `static_${Date.now()}_${i}` };
    });
  }

  const prompt = `
    You are an expert EPS-TOPIK exam creator.
    Generate ${count} practice questions similar to the official HRD Korea exams.
    
    Structure:
    - Mix of READING and LISTENING types.
    - Difficulty: Beginner to Intermediate (Topic Level 1-2).
    - Themes: Manufacturing, Construction, Agriculture, Daily Life in Korea, Workplace Safety.

    Format requirements:
    1. 'questionText', 'options', 'context' MUST be in natural Korean.
    2. 'context' for listening is the script. For reading, it's the passage/scenario.
    3. 'explanation' MUST be in English.
    4. 'sourceRef' should cite a similar question type.

    Return strictly valid JSON array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
              context: { type: Type.STRING, nullable: true },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                minItems: 4,
                maxItems: 4
              },
              correctAnswer: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              sourceRef: { type: Type.STRING }
            },
            required: ["id", "type", "category", "questionText", "options", "correctAnswer", "explanation"]
          }
        }
      }
    });

    if (response.text) {
      const cleanedText = cleanJsonString(response.text);
      return JSON.parse(cleanedText) as Question[];
    }
    return [];
  } catch (error) {
    console.error("Failed to generate questions:", error);
    return STATIC_EXAM_DATA;
  }
};

export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  const ai = getAiClient();
  
  if (!ai) {
    console.warn("TTS Skipped: API Key not found.");
    return null;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, 
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const bytes = base64ToBytes(base64Audio);
      return pcmToAudioBuffer(bytes, audioContext);
    } else {
      console.warn("TTS Response did not contain audio data.", response);
    }
    return null;
  } catch (error) {
    console.error("TTS generation failed:", error);
    return null;
  }
};

export const analyzePerformance = async (session: ExamSession): Promise<AnalyticsFeedback | null> => {
  const ai = getAiClient();
  if (!ai) {
    return {
      overallAssessment: "Could not connect to AI. Please check internet.",
      strengths: ["Completing the exam"],
      weaknesses: ["N/A"],
      studyPlan: "Practice with static questions."
    };
  }

  const prompt = `
    Analyze this EPS-TOPIK exam result.
    Score: ${session.score} / ${session.questions.length}.
    User Answers: ${JSON.stringify(session.userAnswers)}.
    Categories: ${JSON.stringify(session.questions.map(q => q.category))}.
    Provide encouraging feedback in English.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
          }
        }
      }
    });

    if (response.text) {
      const cleanedText = cleanJsonString(response.text);
      return JSON.parse(cleanedText) as AnalyticsFeedback;
    }
    return null;
  } catch (error) {
    console.error("Analysis failed", error);
    return null;
  }
};