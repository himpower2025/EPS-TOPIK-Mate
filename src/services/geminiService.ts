
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, QuestionType, AnalyticsFeedback, ExamSession, ExamMode } from '../types';
import { STATIC_EXAM_DATA } from '../data/examData';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

  // 정적 데이터에서 풀링
  let dbPool = [...STATIC_EXAM_DATA];
  
  // 프리미엄이 아니거나 AI 생성이 실패할 경우를 대비한 기본 셔플링 시드
  const seed = setNumber * 123;
  const pseudoRandom = () => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  if (!isPremium && setNumber > 1) {
    throw new Error("Premium access required for this set.");
  }

  try {
    const prompt = `You are an expert EPS-TOPIK examiner. Create Exam Set #${setNumber} for mode: ${mode}.
    Requirement:
    - ${readingCount > 0 ? `Include ${readingCount} READING questions.` : ''}
    - ${listeningCount > 0 ? `Include ${listeningCount} LISTENING questions.` : ''}
    - Difficulty: Standard EPS-TOPIK level.
    - Reference logic: Use the provided static examples but change variables, scenarios, and vocabulary to make Set #${setNumber} feel unique.
    - DO NOT include question numbers or answers in brackets in 'questionText'.
    - 'context' for listening must be a full script.
    - Return a JSON array of ${totalCount} Question objects.`;

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
    if (aiQuestions && aiQuestions.length >= totalCount) {
      return aiQuestions.map((q: any) => ({
        ...q,
        questionText: sanitizeQuestionText(q.questionText)
      }));
    }
  } catch (error) {
    console.warn(`AI Generation for Set ${setNumber} failed, falling back to smart shuffling.`);
  }

  // Fallback: 셔플링된 정적 데이터 리턴
  const shuffled = dbPool.sort(() => pseudoRandom() - 0.5);
  const result: Question[] = [];
  
  if (readingCount > 0) {
    result.push(...shuffled.filter(q => q.type === QuestionType.READING).slice(0, readingCount));
  }
  if (listeningCount > 0) {
    result.push(...shuffled.filter(q => q.type === QuestionType.LISTENING).slice(0, listeningCount));
  }

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
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
      
      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = audioContext.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
      return buffer;
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const generateImageForQuestion = async (description: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Educational line art for EPS-TOPIK: ${description}. Clear, high contrast, black and white, white background.` }] },
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
    const prompt = `Analyze EPS-TOPIK Result. Score: ${session.score}/${session.questions.length}. Mode: ${session.mode}. Set: ${session.setNumber}. Provide English feedback.`;
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
