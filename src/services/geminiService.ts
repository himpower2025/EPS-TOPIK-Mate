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

const cleanJson = (text: string | undefined): string => 
  (text ?? "").replace(/```json/g, '').replace(/```/g, '').replace(/\/\*.*?\*\//gs, '').trim();

export const generateQuestionsBySet = async (mode: ExamMode, roundNumber: number, plan: PlanType): Promise<Question[]> => {
  const ai = getAI();
  
  // Custom difficulty based on user plan
  const difficultyContext = plan === 'free' ? "Standard Beginner Level" : "High-tier Workplace and Technical Industry Scenarios";

  const prompt = `You are an elite EPS-TOPIK Question Designer. 
  TASK: Generate 20 high-fidelity questions for Round ${roundNumber}.
  USER STATUS: ${plan} (${difficultyContext}).
  TYPE: ${mode} (Match exactly).

  CORE INSTRUCTIONS:
  1. NO REDUNDANCY: Each question must feature a unique workplace scenario (Industrial, Agricultural, etc.).
  2. IMAGE PROMPT PRECISION: Provide extremely descriptive 'imagePrompt' for an illustrator. 
     - Ex: "A side-view 2D vector of a worker in a blue uniform wearing a white safety helmet and using a yellow electric drill on a wooden board."
  3. AUDIO FIDELITY: For LISTENING, use 'Man:' and 'Woman:' tags in the 'context' field. Include realistic pauses or industrial background descriptions in the prompt.
  4. LANGUAGE: Korean for exam content. Professional English for analysis and instructions.

  JSON FORMAT REQUIRED.`;

  try {
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

    const parsed = JSON.parse(cleanJson(response.text));
    return parsed.filter((q: Question) => mode === 'FULL' || q.type === mode);
  } catch (err) {
    console.error("AI Generation Error:", err);
    return STATIC_EXAM_DATA.filter(q => mode === 'FULL' || q.type === mode).slice(0, 20);
  }
};

export const generateImage = async (prompt: string): Promise<string | null> => {
  if (!prompt) return null;
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [{ text: `Professional EPS-TOPIK exam visual. Clean 2D educational art, high contrast, white background. ${prompt}` }] 
      },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return part?.inlineData ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (err) {
    console.error("Image generation failed:", err);
    return null;
  }
};

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
      contents: [{ parts: [{ text: `잘 듣고 알맞은 것을 고르십시오. ${text}` }] }],
      config
    });
    
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioData) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      return await decodeAudioData(decodeBase64(audioData), ctx, 24000, 1);
    }
    return null;
  } catch (err) {
    console.error("Speech engine failed:", err);
    return null;
  }
};

export const analyzePerformance = async (session: ExamSession): Promise<AnalyticsFeedback | null> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Perform an expert analysis on these results. Score: ${session.score}/${session.questions.length}. Provide tactical study advice in professional English. Return JSON.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJson(response.text));
  } catch {
    return null;
  }
};