
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, QuestionType, AnalyticsFeedback, ExamSession, ExamMode } from '../types';
import { STATIC_EXAM_DATA } from '../data/examData';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Audio Decoding Helpers (Based on Gemini Native Audio Requirements) ---
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

function sanitizeQuestionText(text: string): string {
  if (!text) return '';
  return text
    .replace(/^(\d+|Q\d+|[A-Z]\d+)[\.\s\-\:]*/i, '') 
    .replace(/\[.*?\]/g, '')                        
    .trim();
}

export const generateQuestionsBySet = async (
  mode: ExamMode, 
  setNumber: number, 
  isPremium: boolean
): Promise<Question[]> => {
  const readingCount = mode === 'LISTENING' ? 0 : 20;
  const listeningCount = mode === 'READING' ? 0 : 20;
  const totalCount = readingCount + listeningCount;

  if (!isPremium && setNumber > 1) {
    throw new Error("Premium access required for this set.");
  }

  try {
    const prompt = `You are an expert EPS-TOPIK (Employment Permit System - Test of Proficiency in Korean) examiner. 
    Create Exam Set #${setNumber} for mode: ${mode}.
    
    Layout Rules:
    - READING: Use short passages, workplace scenarios, or sign descriptions.
    - LISTENING: Provide scripts for short conversations or single statements.
    
    Content:
    - ${readingCount > 0 ? `Include ${readingCount} READING questions.` : ''}
    - ${listeningCount > 0 ? `Include ${listeningCount} LISTENING questions.` : ''}
    - Do not include question numbers in 'questionText'.
    - Use natural workplace Korean.
    
    Return a JSON array of ${totalCount} Question objects.`;

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
    if (aiQuestions && aiQuestions.length > 0) {
      return aiQuestions.map((q: any) => ({
        ...q,
        questionText: sanitizeQuestionText(q.questionText)
      }));
    }
  } catch (error) {
    console.warn("AI Generation fallback to static data.");
  }

  // Fallback to static DB
  const shuffled = [...STATIC_EXAM_DATA].sort(() => Math.random() - 0.5);
  const result: Question[] = [];
  if (readingCount > 0) result.push(...shuffled.filter(q => q.type === QuestionType.READING).slice(0, readingCount));
  if (listeningCount > 0) result.push(...shuffled.filter(q => q.type === QuestionType.LISTENING).slice(0, listeningCount));
  
  return result.map(q => ({...q, questionText: sanitizeQuestionText(q.questionText)}));
};

export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `다음 내용을 잘 듣고 질문에 답하십시오. ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      const bytes = decode(base64Audio);
      return await decodeAudioData(bytes, audioContext, 24000, 1);
    }
    return null;
  } catch (error) {
    console.error("Speech generation failed:", error);
    return null;
  }
};

export const generateImageForQuestion = async (description: string): Promise<string | null> => {
  if (!description || description.length > 300) return null;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [{ 
          text: `Professional educational line art for Korean Language Exam (EPS-TOPIK). Style: Black and white official workbook illustration, clean lines, high contrast, white background, no text inside the image. Subject: ${description}` 
        }] 
      },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    const parts = response?.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch { return null; }
};

export const analyzePerformance = async (session: ExamSession): Promise<AnalyticsFeedback | null> => {
  try {
    const prompt = `Analyze EPS-TOPIK Session. Score: ${session.score}/${session.questions.length}. Mode: ${session.mode}. Provide English feedback.`;
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
    return JSON.parse(cleanJsonString(response.text || '{}'));
  } catch { return null; }
};
