import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, AnalyticsFeedback, ExamSession, ExamMode, PlanType } from '../types';
import { STATIC_EXAM_DATA } from '../data/examData';

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- 오디오 처리 유틸리티 (PCM 디코딩) ---
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

const cleanJson = (text: string) => text.replace(/```json/g, '').replace(/```/g, '').replace(/\/\*.*?\*\//gs, '').trim();

/**
 * [핵심] 무한 변형 생성 엔진 (Gemini 3 Pro)
 * 정적 데이터를 시드로 활용하여 완전히 새로운 10문항을 창조합니다.
 */
export const generateQuestionsBySet = async (_mode: ExamMode, setNumber: number, _plan: PlanType): Promise<Question[]> => {
  const ai = getAI();
  
  const industries = ["제조업(Manufacturing)", "건설업(Construction)", "농축산업(Agriculture)", "어업(Fishery)", "서비스업(Service)"];
  const currentIndustry = industries[setNumber % industries.length];
  const seeds = STATIC_EXAM_DATA.slice(0, 5);

  try {
    const systemInstruction = `당신은 대한민국 산업인력공단 EPS-TOPIK 수석 출제위원입니다.
    제공된 샘플 데이터의 문법적 구조와 출제 의도를 분석하여, '${currentIndustry}' 분야의 완전히 새로운 실전 문항 10개를 생성하십시오.
    
    [출제 원칙]
    1. 중복 금지: 기존 샘플과 단어 하나라도 겹치지 않는 새로운 상황을 설정하십시오.
    2. 시각화 최적화: 모든 문항은 'imagePrompt'를 가져야 하며, 초사실적인 묘사를 포함해야 합니다.
    3. 듣기 문항: 'context' 필드에 남성과 여성의 대화(남:, 여:) 또는 안내 방송 내용을 상세히 작성하십시오.
    4. JSON 형식으로 Question 인터페이스를 엄격히 준수하여 반환하십시오.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `다음 샘플의 형식을 따르되, '${currentIndustry}' 테마로 10문제를 생성해줘: ${JSON.stringify(seeds)}`,
      config: {
        systemInstruction,
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
              imagePrompt: { type: Type.STRING },
              optionImagePrompts: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["id", "type", "questionText", "options", "correctAnswer", "imagePrompt"]
          }
        }
      }
    });

    // [Fix] response.text가 undefined인 경우 빈 배열 문자열을 전달하도록 수정
    return JSON.parse(cleanJson(response.text || '[]'));
  } catch (error) {
    console.warn("AI Generation fallback to static data", error);
    return [...STATIC_EXAM_DATA].sort(() => Math.random() - 0.5).slice(0, 10);
  }
};

/**
 * 초사실적 시각화 엔진 (Gemini 2.5 Flash Image)
 */
export const generateImage = async (prompt: string): Promise<string | null> => {
  if (!prompt) return null;
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [{ text: `Photorealistic industrial photography, EPS-TOPIK style: ${prompt}. Sharp focus, clear lighting, realistic scene.` }] 
      },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    
    // [Fix] candidates와 parts에 대한 Optional Chaining 적용
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return part?.inlineData ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (err) {
    console.error("Image generation failed:", err);
    return null;
  }
};

/**
 * 리얼 멀티 스피커 보이스 엔진 (Gemini 2.5 TTS)
 */
export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  const ai = getAI();
  const hasMan = text.includes("남:") || text.includes("Man:");
  const hasWoman = text.includes("여:") || text.includes("Woman:");
  
  try {
    const config: any = { 
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
      }
    };

    if (hasMan && hasWoman) {
      config.speechConfig = {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            { speaker: '남', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
            { speaker: '여', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            { speaker: 'Man', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
            { speaker: 'Woman', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
          ]
        }
      };
    } else if (hasMan) {
      config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName = 'Puck';
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config
    });
    
    // [Fix] candidates 접근 시 Optional Chaining 적용
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      return await decodeAudioData(decodeBase64(base64), ctx, 24000, 1);
    }
    return null;
  } catch (err) {
    console.error("Speech generation failed:", err);
    return null;
  }
};

export const analyzePerformance = async (session: ExamSession): Promise<AnalyticsFeedback | null> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze EPS-TOPIK result: ${session.score}/${session.questions.length}. Return JSON.`,
      config: { responseMimeType: "application/json" }
    });
    // [Fix] response.text가 undefined인 경우 빈 객체 문자열 전달
    return JSON.parse(cleanJson(response.text || '{}'));
  } catch {
    return null;
  }
};