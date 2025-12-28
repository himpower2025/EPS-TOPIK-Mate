
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, QuestionType, AnalyticsFeedback, ExamSession } from '../types';
import { STATIC_EXAM_DATA } from '../data/examData';

// API Key initialization
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to clean JSON string from Markdown code blocks
function cleanJsonString(text: string): string {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

/**
 * [핵심] 문제 텍스트 정제 함수
 * 1. 문항 앞의 번호 제거 (예: "1. ", "21. ")
 * 2. 대괄호 속 정답 제거 (예: "[아예]", "[스키]")
 */
function sanitizeQuestionText(text: string): string {
  if (!text) return '';
  return text
    .replace(/^\d+[\.\s]*/, '') // 시작하는 숫자와 점 제거
    .replace(/\[.*?\]/g, '')     // 대괄호와 그 안의 내용(정답) 제거
    .trim();
}

// PCM decoding helpers
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
 * AI 이미지 생성 (Nano Banana)
 */
export const generateImageForQuestion = async (description: string): Promise<string | null> => {
  if (!description || description.length > 200) return null;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Professional educational line art for EPS-TOPIK exam: ${description}. Official workbook style, clear black and white, pure white background, no text.` }]
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
    console.error("AI Image Generation failed:", error);
    return null;
  }
};

/**
 * AI 문제 생성 및 데이터 정제
 */
export const generateQuestions = async (count: number = 40, isPremium: boolean = false, mode: 'FULL' | 'LISTENING' | 'READING' = 'FULL'): Promise<Question[]> => {
  let dbPool = [...STATIC_EXAM_DATA];
  if (mode === 'LISTENING') dbPool = dbPool.filter(q => q.type === QuestionType.LISTENING);
  if (mode === 'READING') dbPool = dbPool.filter(q => q.type === QuestionType.READING);
  
  const shuffledDb = dbPool.sort(() => 0.5 - Math.random());
  
  // 정적 데이터 정제 적용
  const cleanedDb = shuffledDb.map(q => ({
    ...q,
    questionText: sanitizeQuestionText(q.questionText)
  }));

  const selectedFromDb = cleanedDb.slice(0, count);

  if (!isPremium) return selectedFromDb;

  try {
    const seedSamples = cleanedDb.slice(0, 5);
    const prompt = `You are an expert EPS-TOPIK examiner. Create ${count} new unique questions.
    Reference samples: ${JSON.stringify(seedSamples)}.
    Mode: ${mode}.
    IMPORTANT: 
    - Do NOT include question numbers like "1. " in 'questionText'.
    - Do NOT include answers in brackets like "[word]" in 'questionText'.
    - 'context' for listening must be a dialogue.
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
      return aiQuestions.map((q: any) => ({ 
        ...q, 
        questionText: sanitizeQuestionText(q.questionText) 
      })).slice(0, count);
    }
  } catch (error) {
    console.warn("AI Question Generation fallback triggered.");
  }
  return selectedFromDb;
};

/**
 * 듣기 오디오 생성 (TTS)
 */
export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  try {
    const hasMan = /남:|Man:|Nam:/.test(text);
    const hasWoman = /여:|Woman:|Yeo:/.test(text);
    
    const config: any = {
      responseModalities: [Modality.AUDIO],
    };

    if (hasMan && hasWoman) {
      config.speechConfig = {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            { speaker: 'Man', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
            { speaker: 'Woman', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
          ]
        }
      };
    } else {
      config.speechConfig = {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      };
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `다음 내용을 잘 듣고 질문에 답하십시오. ${text}` }] }],
      config: config,
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      const bytes = decodeBase64(base64Audio);
      return await decodeAudioData(bytes, audioContext, 24000, 1);
    }
    return null;
  } catch (error) {
    console.error("Speech Generation failed:", error);
    return null;
  }
};

/**
 * 성과 분석 보고서 생성
 */
export const analyzePerformance = async (session: ExamSession): Promise<AnalyticsFeedback | null> => {
  try {
    const prompt = `Analyze this EPS-TOPIK result: Score ${session.score}/${session.questions.length}. 
    Provide encouraging feedback in English. 
    Strengths, weaknesses, and a study plan based on categories: ${JSON.stringify(session.questions.map(q => q.category))}.`;

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

    if (response.text) {
      return JSON.parse(cleanJsonString(response.text));
    }
    return null;
  } catch (error) {
    console.error("Performance analysis failed:", error);
    return null;
  }
};
