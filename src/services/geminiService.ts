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
  // Ensure we are reading the correct portion of the buffer
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
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
 * Removes text inside brackets [] which often contains answers or spoilers in the DB.
 */
export const cleanText = (text: string): string => {
  if (!text) return "";
  return text.replace(/\[.*?\]/g, '').trim();
};

export const generateQuestionsBySet = async (mode: ExamMode, roundNumber: number, plan: PlanType): Promise<Question[]> => {
  // 30세트 이하인 경우 먼저 정적 데이터(DB)에서 해당 라운드 데이터를 찾습니다.
  if (roundNumber <= 30) {
    const setPrefix = `s${roundNumber}_`;
    const staticSet = STATIC_EXAM_DATA.filter(q => 
      q.id.startsWith(setPrefix) && (mode === 'FULL' || q.type === mode)
    );
    
    // 해당 라운드 데이터가 DB에 존재하면 반환합니다.
    if (staticSet.length > 0) {
      return [...staticSet].sort((a, b) => {
        // ID 순서대로 정렬 (예: s10_r_1, s10_r_2...)
        return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
      });
    }
  }

  const ai = getAI();
  
  // Custom difficulty based on user plan
  const difficultyContext = plan === 'free' ? "Standard Beginner Level" : "High-tier Workplace and Technical Industry Scenarios";

  // Get some samples from static data to guide the AI
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
  3. AUDIO FIDELITY: For LISTENING, use 'Man:' and 'Woman:' tags in the 'context' field. Include realistic pauses or industrial background descriptions in the prompt.
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
      model: "gemini-3.1-pro-preview",
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
    
    // Fallback for missing imagePrompts or categories
    generated = generated.map(q => ({
      ...q,
      category: q.category || "General",
      imagePrompt: q.imagePrompt || (q.type === QuestionType.READING ? `A clear educational illustration of: ${q.questionText}` : undefined)
    })).filter((q: Question) => mode === 'FULL' || q.type === mode);

    return generated;
  } catch (err) {
    console.error("AI Generation Error:", err);
    // Fallback to static data but shuffle it to feel "infinite"
    const filtered = STATIC_EXAM_DATA.filter(q => mode === 'FULL' || q.type === mode);
    return [...filtered].sort(() => Math.random() - 0.5).slice(0, 20);
  }
};

export const generateImage = async (prompt: string): Promise<string | null> => {
  if (!prompt) return null;
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [{ text: `Professional educational illustration for EPS-TOPIK exam. Clean 2D vector art, white background, high clarity. Subject: ${prompt}` }] 
      },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
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
      contents: [{ parts: [{ text: `Listen carefully and choose the correct answer. ${text}` }] }],
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
      contents: `Perform an expert analysis on these results. Score: ${session.score}/${session.questions.length}. 
      
      SESSION DATA:
      - Mode: ${session.mode}
      - Questions: ${JSON.stringify(session.questions.map(q => ({ category: q.category, correct: session.userAnswers[q.id] === q.correctAnswer })))}

      OUTPUT REQUIREMENTS:
      - All text must be in STRICT ENGLISH.
      - overallAssessment: 2-3 sentence summary.
      - strengths: List of categories where they performed well.
      - weaknesses: List of categories needing focus.
      - studyPlan: Actionable 7-day plan.

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