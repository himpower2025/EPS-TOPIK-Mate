
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
  
  // Use 'plan' to define specific workplace scenarios
  const workplaceContext = plan === 'free' ? "Basic Service/Manufacturing" : "Heavy Industry, Construction, and Modern Agriculture Scenarios";

  const prompt = `You are a legendary EPS-TOPIK Question Architect. 
  TASK: Generate 20 high-fidelity exam questions for Round ${roundNumber}.
  USER LEVEL: ${plan} (${workplaceContext}).
  MODALITY: ${mode} (If LISTENING, only audio-based. If READING, only visual-text based).

  ULTIMATE QUALITY GUIDELINES:
  1. HYPER-REALISM: Create scenarios actually found in Korean factories, farms, and sites. No generic or repetitive content.
  2. IMAGE PROMPT EXCELLENCE: The 'imagePrompt' must be an architecturally detailed description. 
     - Poor: "A crane."
     - Superior: "A high-angle 3D vector illustration of a yellow industrial tower crane lifting a steel beam in a busy Korean construction site with safety fences, white background, high contrast."
  3. AUDIO SCRIPT DEPTH: For LISTENING, use 'Man:' and 'Woman:' tags. Include natural Korean pauses like '음...', '저...' for high realism. Script must be in the 'context' field.
  4. NO BLANKS: Every single question MUST have a valid 'imagePrompt'.
  5. LANGUAGE: Korean for exam content. Professional English for categories, explanations, and instructions.

  JSON SCHEMA: Strictly follow the Question interface. No markdown garbage outside JSON.`;

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
    console.error("AI Question Engine Error:", err);
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
        parts: [{ text: `High-definition professional EPS-TOPIK exam visual. Clean line art style, vibrant industrial colors, white background. Subject: ${prompt}` }] 
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
      contents: [{ parts: [{ text: `문제를 잘 듣고 알맞은 답을 고르십시오. ${text}` }] }],
      config
    });
    
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioData) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      return await decodeAudioData(decodeBase64(audioData), ctx, 24000, 1);
    }
    return null;
  } catch (err) {
    console.error("Speech generation error:", err);
    return null;
  }
};

export const analyzePerformance = async (session: ExamSession): Promise<AnalyticsFeedback | null> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Perform a deep academic analysis on these EPS-TOPIK mock test results. Score: ${session.score}/${session.questions.length}. Identify weak grammatical points and suggest a 7-day study plan in professional English. Return JSON.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJson(response.text));
  } catch {
    return null;
  }
};
