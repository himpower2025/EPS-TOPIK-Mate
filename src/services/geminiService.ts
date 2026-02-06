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

/**
 * 플랜별 데이터 매핑 및 고도화된 AI 유사 문항 생성 로직
 */
export const generateQuestionsBySet = async (mode: ExamMode, roundNumber: number, plan: PlanType): Promise<Question[]> => {
  // 1. 무료 사용자/맛보기 로직 (Set 10 정밀 필터링)
  if (plan === 'free') {
    if (mode === 'READING') {
      return STATIC_EXAM_DATA.filter(q => q.id.includes('s10_r_') && parseInt(q.id.split('_r_')[1]) <= 10);
    }
    if (mode === 'LISTENING') {
      return STATIC_EXAM_DATA.filter(q => q.id.includes('s10_l_') && parseInt(q.id.split('_l_')[1]) >= 21 && parseInt(q.id.split('_l_')[1]) <= 29);
    }
    if (mode === 'FULL') {
      const r = STATIC_EXAM_DATA.filter(q => q.id.includes('s10_r_') && parseInt(q.id.split('_r_')[1]) >= 11 && parseInt(q.id.split('_r_')[1]) <= 20);
      const l = STATIC_EXAM_DATA.filter(q => q.id.includes('s10_l_') && parseInt(q.id.split('_l_')[1]) >= 30 && parseInt(q.id.split('_l_')[1]) <= 40);
      return [...r, ...l];
    }
  }

  // 2. 플랜별 타겟 인덱스 결정
  let targetSetIndex = -1;
  let useAI = false;

  if (plan === '1m') {
    if (mode === 'READING' || mode === 'LISTENING') targetSetIndex = roundNumber; // 1-5
    else if (mode === 'FULL') targetSetIndex = [12, 14, 16, 18, 20][roundNumber - 1];
  } 
  else if (plan === '3m') {
    if (mode === 'READING' || mode === 'LISTENING') targetSetIndex = roundNumber; // 1-20
    else if (mode === 'FULL') {
      if (roundNumber <= 10) targetSetIndex = roundNumber + 20; // 21-30
      else useAI = true; // 31-40 (AI Generated)
    }
  } 
  else if (plan === '6m') {
    if (mode === 'READING' || mode === 'LISTENING') {
      if (roundNumber <= 15) targetSetIndex = roundNumber; // 1-15
      else useAI = true; // 16-50 (AI Generated)
    } else if (mode === 'FULL') {
      if (roundNumber <= 15) targetSetIndex = roundNumber + 15; // 16-30
      else useAI = true; // 31-50 (AI Generated)
    }
  }

  // 3. DB 로드 또는 AI 생성 실행
  if (!useAI && targetSetIndex !== -1) {
    const prefix = `s${targetSetIndex}_`;
    const setData = STATIC_EXAM_DATA.filter(q => q.id.startsWith(prefix));
    
    if (mode === 'READING') return setData.filter(q => q.type === QuestionType.READING).slice(0, 20);
    if (mode === 'LISTENING') return setData.filter(q => q.type === QuestionType.LISTENING).slice(0, 20);
    if (mode === 'FULL') {
      const r = setData.filter(q => q.type === QuestionType.READING).slice(0, 20);
      const l = setData.filter(q => q.type === QuestionType.LISTENING).slice(0, 20);
      return [...r, ...l];
    }
  }

  // AI 생성: DB와의 유사도를 극대화하는 프롬프트 엔지니어링
  const ai = getAI();
  try {
    const prompt = `You are an official EPS-TOPIK Question Developer.
    TASK: Generate a ${mode === 'FULL' ? 'Reading(20) and Listening(20)' : mode + ' (20)'} question set for Round ${roundNumber}.
    CRITICAL QUALITY GUIDELINES:
    1. STRICT SIMILARITY: Analyze the existing 30-set database structure. The vocabulary level must be exactly the same as the EPS-TOPIK standard (Intermediate-Beginner).
    2. VARIETY: Cover diverse categories: Industrial safety, workplace etiquette, daily tools, Korean culture, and simple dialogues.
    3. NO REPETITION: Do not use the same scenarios from the database. Create fresh but plausible workplace situations.
    4. LISTENING SCRIPTS: For listening questions, provide natural Korean scripts in the 'context' field. 
       - Single Speaker: Plain text.
       - Dialogue: Use 'Man: ...', 'Woman: ...' or '남: ...', '여: ...' format.
    5. VISUAL PROMPTS: Every question MUST have a descriptive 'imagePrompt' for AI rendering.
    
    FORMAT: JSON array of Question objects.`;

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

    const jsonText = cleanJson(response.text);
    return JSON.parse(jsonText);
  } catch (err) {
    console.error("Critical AI Generation Error:", err);
    // Fallback: 10번 세트에서 무작위로 가져오기
    return STATIC_EXAM_DATA.filter(q => q.id.includes('s10_')).slice(0, 20);
  }
};

export const generateImage = async (prompt: string): Promise<string | null> => {
  if (!prompt) return null;
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [{ text: `High-fidelity EPS-TOPIK exam visual aid: ${prompt}. Professional industrial illustration, clean and clear for educational testing, white background, no text inside image.` }] 
      },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    
    const candidate = response.candidates?.[0];
    const part = candidate?.content?.parts?.find(p => p.inlineData);
    return part?.inlineData ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (err) {
    console.error("Image generation failed:", err);
    return null;
  }
};

export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  const ai = getAI();
  // 대화 형식 파악
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
            { speaker: 'Woman', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            { speaker: '남', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
            { speaker: '여', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
          ]
        }
      };
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config
    });
    
    const candidate = response.candidates?.[0];
    const audioData = candidate?.content?.parts?.[0]?.inlineData?.data;
    if (audioData) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      return await decodeAudioData(decodeBase64(audioData), ctx, 24000, 1);
    }
    return null;
  } catch (err) {
    console.error("TTS generation failed:", err);
    return null;
  }
};

export const analyzePerformance = async (session: ExamSession): Promise<AnalyticsFeedback | null> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze EPS-TOPIK test results. Score: ${session.score}/${session.questions.length}. Provide deep insights in English. Return JSON.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJson(response.text));
  } catch {
    return null;
  }
};
