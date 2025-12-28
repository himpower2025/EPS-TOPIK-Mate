
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, QuestionType, AnalyticsFeedback, ExamSession } from '../types';
import { STATIC_EXAM_DATA } from '../data/examData';

// [가이드라인] process.env.API_KEY를 사용하여 인스턴스 생성
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function cleanJsonString(text: string): string {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

/**
 * PCM 데이터 디코딩 (가이드라인 예제 준수)
 */
function decode(base64: string) {
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
 * 400문항의 정적 데이터베이스를 활용하거나 프리미엄 유저를 위해 새로운 문제를 생성합니다.
 */
export const generateQuestions = async (count: number = 40, isPremium: boolean = false): Promise<Question[]> => {
  if (!isPremium) {
    // 400문항 중 랜덤하게 셔플하여 반환
    const shuffled = [...STATIC_EXAM_DATA].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).map((q, i) => ({
      ...q,
      id: `${q.id}_${Date.now()}_${i}`
    }));
  }

  // 프리미엄: AI를 통해 완전히 새로운 문제를 생성 (시스템 인스트럭션 포함)
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate ${count} ORIGINAL EPS-TOPIK questions. Mixed Reading/Listening.`,
      config: {
        systemInstruction: "You are an expert EPS-TOPIK examiner. Create realistic questions based on HRD Korea standards.",
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
              options: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 4, maxItems: 4 },
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
      return JSON.parse(cleanJsonString(response.text));
    }
    return STATIC_EXAM_DATA.slice(0, count);
  } catch (error) {
    console.error("AI Question Generation Error:", error);
    return STATIC_EXAM_DATA.slice(0, count);
  }
};

/**
 * 음성 생성 (TTS)
 */
export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  try {
    const hasMale = /남자:|남:/.test(text);
    const hasFemale = /여자:|여:/.test(text);
    const normalizedText = text.replace(/남:/g, '남자:').replace(/여:/g, '여자:');

    let speechConfig;
    if (hasMale && hasFemale) {
      // 다중 화자 (2명)
      speechConfig = {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            { speaker: '남자', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
            { speaker: '여자', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
          ]
        }
      };
    } else {
      speechConfig = {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      };
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: normalizedText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: speechConfig,
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
    console.error("TTS Error:", error);
    return null;
  }
};

/**
 * 성적 분석
 */
export const analyzePerformance = async (session: ExamSession): Promise<AnalyticsFeedback | null> => {
  const prompt = `Analyze EPS-TOPIK Score: ${session.score}/${session.questions.length}. Provide a 7-day plan.`;
  try {
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
    console.error("Analysis Error:", error);
    return null;
  }
};
