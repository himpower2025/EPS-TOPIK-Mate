import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, QuestionType, AnalyticsFeedback, ExamSession, ExamMode, PlanType } from '../types';
import { STATIC_EXAM_DATA } from '../data/examData';

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function decodeBase64(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  try {
    return await ctx.decodeAudioData(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
  } catch (e) {
    const dataInt16 = new Int16Array(data.buffer, data.byteOffset, Math.floor(data.byteLength / 2));
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
}

const cleanJson = (text: string | undefined): string =>
  (text ?? "").replace(/```json/g, '').replace(/```/g, '').replace(/\/\*.*?\*\//gs, '').trim();

export const cleanText = (text: string): string => {
  if (!text) return "";
  let cleaned = text.replace(/\[.*?\]/g, '').trim();
  const questionMarkIndex = cleaned.lastIndexOf('?');
  if (questionMarkIndex !== -1 && questionMarkIndex < cleaned.length - 1) {
    const after = cleaned.substring(questionMarkIndex + 1).trim();
    if (after.length > 0) {
      cleaned = cleaned.substring(0, questionMarkIndex + 1);
    }
  }
  return cleaned;
};

export const generateQuestionsBySet = async (mode: ExamMode, roundNumber: number, plan: PlanType): Promise<Question[]> => {
  if (roundNumber <= 30) {
    const setPrefix = `s${roundNumber}_`;
    const staticSet = STATIC_EXAM_DATA.filter(q =>
      q.id.startsWith(setPrefix) && (mode === 'FULL' || q.type === mode)
    );

    const CATEGORY_MAP: Record<string, string> = {
      "빈칸 채우기": "Fill in the Blanks",
      "관계있는 단어": "Related Words",
      "표지판": "Signboards",
      "문장 이해": "Sentence Comprehension",
      "듣기 이해": "Listening Comprehension",
      "그림 선택": "Picture Selection",
      "동작 파악": "Action Identification",
      "위치 파악": "Location Identification",
      "사람 수 세기": "Person Counting",
      "시간 파악": "Time Identification",
      "대화 응답": "Conversation Response",
      "이야기 이해": "Story Comprehension",
      "장소 파악": "Place Identification",
      "날씨 파악": "Weather Identification",
      "사물 파악": "Object Identification"
    };

    if (staticSet.length > 0) {
      return staticSet.map(q => ({
        ...q,
        category: CATEGORY_MAP[q.category] || q.category,
        questionText: cleanText(q.questionText),
        context: q.context ? cleanText(q.context) : undefined
      })).sort((a, b) => {
        return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
      });
    }
  }

  const ai = getAI();
  const difficultyContext = plan === 'free' ? "Standard Beginner Level" : "High-tier Workplace and Technical Industry Scenarios";

  const samples = STATIC_EXAM_DATA
    .filter(q => mode === 'FULL' || q.type === mode)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(q => ({
      type: q.type,
      questionText: q.questionText,
      context: q.context,
      options: q.options,
      correctAnswer: q.correctAnswer,
      imagePrompt: q.imagePrompt
    }));

  const prompt = `You are an elite EPS-TOPIK Question Designer. 
  TASK: Generate 20 high-fidelity questions for Round ${roundNumber}.
  USER STATUS: ${plan} (${difficultyContext}).
  TYPE: ${mode} (Match exactly).

  CORE INSTRUCTIONS:
  1. NO REDUNDANCY: Each question must feature a unique workplace scenario (Industrial, Agricultural, etc.).
  2. IMAGE PROMPT PRECISION: Provide extremely descriptive 'imagePrompt' for an illustrator. 
     - Ex: "A side-view 2D vector of a worker in a blue uniform wearing a white safety helmet and using a yellow electric drill on a wooden board."
  3. AUDIO FIDELITY: For LISTENING, use 'Man:' and 'Woman:' tags in the 'context' field.
  4. LANGUAGE: 
     - Exam content (questionText, options, context): Korean.
     - Metadata (category, explanation, imagePrompt): STRICTLY ENGLISH.
  5. CATEGORIES (Use these English names ONLY):
     - Fill in the Blanks, Related Words, Signboards, Sentence Comprehension, Listening Comprehension, Picture Selection, Action Identification, Location Identification, Person Counting, Time Identification, Conversation Response, Story Comprehension, Place Identification, Weather Identification, Object Identification.
  6. REFERENCE SAMPLES (Follow this style):
     ${JSON.stringify(samples, null, 2)}

  JSON FORMAT REQUIRED.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro-preview-06-05",
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

    const text = response.text;
    if (!text) throw new Error("Empty AI response");

    let generated: Question[] = JSON.parse(cleanJson(text));
    generated = generated.map(q => ({
      ...q,
      category: q.category || "General",
      imagePrompt: q.imagePrompt || (q.type === QuestionType.READING ? `A clear educational illustration of: ${q.questionText}` : undefined)
    })).filter((q: Question) => mode === 'FULL' || q.type === mode);

    return generated;
  } catch (err) {
    console.error("AI Generation Error:", err);
    const filtered = STATIC_EXAM_DATA.filter(q => mode === 'FULL' || q.type === mode);
    return [...filtered].sort(() => Math.random() - 0.5).slice(0, 20);
  }
};

// ============================================================
// ✅ generateImage 핵심 수정
//
// 우선순위:
//   1순위: imageUrl 있음 → 로컬 파일 즉시 반환 (비용 0원, 속도 즉시)
//   2순위: imageUrl 없음 → Imagen AI로 생성 (기존 방식)
//   3순위: AI도 실패 → null 반환
// ============================================================
export const generateImage = async (
  prompt: string,
  imageUrl?: string   // DB의 imageUrl 필드값을 여기에 전달
): Promise<string | null> => {

  // 1순위: 로컬 파일 경로가 있으면 바로 반환 — AI 호출 전혀 없음
  if (imageUrl) {
    return imageUrl;
  }

  // imagePrompt도 없으면 포기
  if (!prompt) return null;

  const ai = getAI();
  const enhancedPrompt = `A clear, high-quality educational illustration for a Korean language exam.
Style: Simple 2D vector art, clean lines, white background, no decorative text overlays.
Subject: ${prompt}`;

  // 2순위: Imagen 3
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: enhancedPrompt,
      config: { numberOfImages: 1, aspectRatio: '1:1' }
    });
    const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (imageBytes) return `data:image/png;base64,${imageBytes}`;
  } catch (err) {
    console.warn('Imagen 3 failed, trying Fast:', err);
  }

  // 3순위: Imagen 3 Fast
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-fast-generate-001',
      prompt: enhancedPrompt,
      config: { numberOfImages: 1, aspectRatio: '1:1' }
    });
    const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (imageBytes) return `data:image/png;base64,${imageBytes}`;
  } catch (err) {
    console.error('All image generation failed:', err);
  }

  return null;
};

export const generateSpeech = async (text: string, ctx: AudioContext): Promise<AudioBuffer | null> => {
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
      contents: [{ parts: [{ text: `Listen carefully. ${text}` }] }],
      config
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0 || !candidates[0].content) return null;

    const audioData = candidates[0].content.parts?.[0]?.inlineData?.data;
    if (audioData) return await decodeAudioData(decodeBase64(audioData), ctx, 24000, 1);
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
      model: "gemini-2.5-flash-preview-05-20",
      contents: `Perform an expert analysis on these results. Score: ${session.score}/${session.questions.length}. 
      
      SESSION DATA:
      - Mode: ${session.mode}
      - Questions: ${JSON.stringify(session.questions.map(q => ({ category: q.category, correct: session.userAnswers[q.id] === q.correctAnswer })))}

      OUTPUT REQUIREMENTS:
      - All text MUST be in STRICT ENGLISH. Do NOT use Korean in the response.
      - Translate any Korean category names to English in your analysis.
      - overallAssessment: 2-3 sentence summary in English.
      - strengths: List of categories (in English) where they performed well.
      - weaknesses: List of categories (in English) needing focus.
      - studyPlan: Actionable 7-day plan in English.

      Return JSON.`,
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
    const text = response.text;
    if (!text) return null;
    return JSON.parse(cleanJson(text));
  } catch {
    return null;
  }
};