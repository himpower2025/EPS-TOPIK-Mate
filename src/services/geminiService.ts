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

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer> {
  try {
    // Attempt standard decoding (works for WAV/MP3 headered data)
    const audioDataCopy = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    return await ctx.decodeAudioData(audioDataCopy as ArrayBuffer);
  } catch (e) {
    console.warn("Standard decode failed, falling back to raw PCM", e);
    // Generic PCM fallback
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

// ============================================================
// ✅ cleanText 수정
// 기존: 물음표(?) 뒤 내용을 전부 잘라버려서 듣기 스크립트가 손상됨
// 수정: 대괄호 안 정답 힌트만 제거, 스크립트 내용은 보존
// ============================================================
export const cleanText = (text: string): string => {
  if (!text) return "";
  // 대괄호 안의 정답 힌트만 제거 (예: [정답: 2번])
  return text.replace(/\[.*?\]/g, '').trim();
};

// ============================================================
// ✅ 새로운 함수: 듣기 스크립트 전처리
// 역할:
//   1. "대본:" 접두어 제거
//   2. DB의 다양한 대화 태그를 TTS가 인식하는 Man:/Woman: 형식으로 통일
//   3. 단일 발화인지 대화형인지 판별
// ============================================================
export interface AudioLine {
  speaker: 'Man' | 'Woman' | 'Narrator';
  text: string;
}

export const prepareAudioScript = (rawText: string): { script: string; isDialogue: boolean; lines: AudioLine[] } => {
  if (!rawText) return { script: '', isDialogue: false, lines: [] };

  // 1단계: 대괄호 힌트 제거
  let text = rawText.replace(/\[.*?\]/g, '').trim();

  // 2단계: "대본:" 접두어 제거
  text = text.replace(/^대본:\s*/i, '').trim();

  // 3단계: 말줄임표(...) 정리 — TTS가 자연스럽게 읽도록
  text = text.replace(/\.\.\./g, '. ');

  // 4단계: 대화 태그 통일 (DB에 있는 모든 패턴 → Man:/Woman:)
  // 패턴: 가:/나:, 남:/여:, 남자:/여자:, Man:/Woman: 등
  const dialoguePatterns = [
    // 가:/나: 패턴 — 가=남자, 나=여자로 매핑
    { from: /\n?가\s*:\s*/g, to: '\nMan: ' },
    { from: /\n?나\s*:\s*/g, to: '\nWoman: ' },
    // 남:/여: 패턴
    { from: /\n?남\s*:\s*/g, to: '\nMan: ' },
    { from: /\n?여\s*:\s*/g, to: '\nWoman: ' },
    // 남자:/여자: 패턴
    { from: /\n?남자\s*:\s*/g, to: '\nMan: ' },
    { from: /\n?여자\s*:\s*/g, to: '\nWoman: ' },
    // 이미 Man:/Woman: 형식인 경우 (AI 생성 문제)
    { from: /\n?Man\s*:\s*/g, to: '\nMan: ' },
    { from: /\n?Woman\s*:\s*/g, to: '\nWoman: ' },
    // A:/B: 패턴
    { from: /\n?A\s*:\s*/g, to: '\nMan: ' },
    { from: /\n?B\s*:\s*/g, to: '\nWoman: ' },
  ];

  let processed = text;
  for (const { from, to } of dialoguePatterns) {
    processed = processed.replace(from, to);
  }
  processed = processed.trim();

  // 5단계: 대화형 여부 판별
  const isDialogue = processed.includes('Man: ') || processed.includes('Woman: ');

  // 6단계: 스피커별 라인 분해 (브라우저 TTS 멀티 보이스 재생용)
  const lines: AudioLine[] = [];
  const rawLines = processed.split('\n');
  let currentSpeaker: 'Man' | 'Woman' | 'Narrator' = 'Narrator';
  
  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    if (trimmed.startsWith('Man:')) {
      currentSpeaker = 'Man';
      lines.push({ speaker: currentSpeaker, text: trimmed.substring(4).trim() });
    } else if (trimmed.startsWith('Woman:')) {
      currentSpeaker = 'Woman';
      lines.push({ speaker: currentSpeaker, text: trimmed.substring(6).trim() });
    } else {
      if (lines.length > 0) {
         lines[lines.length - 1].text += ' ' + trimmed;
      } else {
         lines.push({ speaker: currentSpeaker, text: trimmed });
      }
    }
  }

  return { script: processed, isDialogue, lines };
};

export const generateQuestionsBySet = async (
  mode: ExamMode,
  roundNumber: number,
  plan: PlanType
): Promise<Question[]> => {
  const isAiSet = (plan === '6m' && roundNumber > 15);

  if (!isAiSet) {
    let dbSetNumber = roundNumber;
    if (plan === '1m' && mode === 'FULL') dbSetNumber = roundNumber + 3;
    if (plan === '3m' && mode === 'FULL') dbSetNumber = roundNumber + 18;
    if (plan === '6m' && mode === 'FULL') dbSetNumber = roundNumber + 15;

    const setPrefix = `s${dbSetNumber}_`;
    const staticSet = STATIC_EXAM_DATA.filter(
      q => q.id.startsWith(setPrefix) && (mode === 'FULL' || q.type === mode)
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
      let filteredSet = staticSet
        .map(q => ({
          ...q,
          category: CATEGORY_MAP[q.category] || q.category,
          questionText: cleanText(q.questionText),
          context: q.context ?? undefined
        }))
        .sort((a, b) =>
          a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
        );

      if (plan === 'free' && mode !== 'FULL') {
        filteredSet = filteredSet.slice(0, 10);
      }

      return filteredSet;
    }
  }

  const ai = getAI();
  const difficultyContext =
    plan === 'free'
      ? "Standard Beginner Level"
      : "High-tier Workplace and Technical Industry Scenarios";

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
  1. NO REDUNDANCY: Each question must feature a unique workplace scenario.
  2. IMAGE PROMPT PRECISION: Provide extremely descriptive 'imagePrompt' for an illustrator.
  3. AUDIO FORMAT: For LISTENING questions, write dialogue using ONLY these tags:
     - Single speaker: plain Korean text
     - Two speakers: use "Man: [text]" and "Woman: [text]" tags on separate lines
     Do NOT use 가:/나: or 남:/여: tags. Use Man:/Woman: ONLY.
  4. LANGUAGE:
     - Exam content (questionText, options, context): Korean text, but dialogue tags in English (Man:/Woman:)
     - Metadata (category, explanation, imagePrompt): STRICTLY ENGLISH.
  5. CATEGORIES (Use these English names ONLY):
     Fill in the Blanks, Related Words, Signboards, Sentence Comprehension,
     Listening Comprehension, Picture Selection, Action Identification,
     Location Identification, Person Counting, Time Identification,
     Conversation Response, Story Comprehension, Place Identification,
     Weather Identification, Object Identification.
  6. REFERENCE SAMPLES:
     ${JSON.stringify(samples, null, 2)}

  JSON FORMAT REQUIRED.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
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
    generated = generated
      .map(q => ({
        ...q,
        category: q.category || "General",
        imagePrompt:
          q.imagePrompt ||
          (q.type === QuestionType.READING
            ? `A clear educational illustration of: ${q.questionText}`
            : undefined)
      }))
      .filter((q: Question) => mode === 'FULL' || q.type === mode);

    return generated;
  } catch (err) {
    console.error("AI Generation Error:", err);
    const filtered = STATIC_EXAM_DATA.filter(q => mode === 'FULL' || q.type === mode);
    return [...filtered].sort(() => Math.random() - 0.5).slice(0, 20);
  }
};

// ============================================================
// ✅ generateImage — imageUrl 있으면 로컬 파일 즉시 반환
// ============================================================
export const generateImage = async (
  prompt: string,
  imageUrl?: string
): Promise<string | null> => {
  if (imageUrl) return imageUrl;
  if (!prompt) return null;

  const ai = getAI();
  const enhancedPrompt = `A clear, high-quality educational illustration for a Korean language exam.
Style: Simple 2D vector art, clean lines, white background, no decorative text overlays.
Subject: ${prompt}`;

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

// ============================================================
// ✅ generateSpeech 전면 수정
//
// 변경 사항:
//   1. prepareAudioScript()로 스크립트 전처리 (대화태그 통일)
//   2. 단일 발화: Kore 목소리 (한국어 여성)
//   3. 대화형: Puck(남) + Kore(여) 멀티스피커
//   4. TTS 프롬프트에 한국어 자연스러운 억양 지시 추가
// ============================================================
export const generateSpeech = async (
  rawText: string,
  ctx: AudioContext
): Promise<AudioBuffer | null> => {
  const ai = getAI();

  const { script, isDialogue } = prepareAudioScript(rawText);

  if (!script) return null;

  try {
    let config: any;

    if (isDialogue) {
      config = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'Man',
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
              },
              {
                speaker: 'Woman',
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
              }
            ]
          }
        }
      };
    } else {
      config = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        }
      };
    }

    const ttsInstruction = isDialogue
      ? `다음은 EPS-TOPIK 한국어 시험 듣기 문제입니다. Man과 Woman 역할을 나누어 두 사람이 자연스럽게 대화하는 것처럼 읽어주세요. 적당한 속도로 또렷하게 발음해주세요.\n\n${script}`
      : `다음은 EPS-TOPIK 한국어 시험 듣기 문제입니다. 한국어 원어민처럼 자연스럽고 또렷하게 읽어주세요.\n\n${script}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: ttsInstruction }] }],
      config
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0 || !candidates[0].content) {
      console.error("No valid candidates returned from AI for audio.");
      return null;
    }

    // Search for the part containing audio data
    const audioPart = candidates[0].content.parts?.find(p => p.inlineData?.data);
    const audioData = audioPart?.inlineData?.data;
    
    if (audioData) {
      return await decodeAudioData(decodeBase64(audioData), ctx, 24000, 1);
    }
    
    console.error("AI responded but no audio parts were found. Modality might be unsupported in this key's region.");
    return null;
  } catch (err: any) {
    console.error("Speech engine failed with error:", err.message, err);
    return null;
  }
};

export const analyzePerformance = async (
  session: ExamSession
): Promise<AnalyticsFeedback | null> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Perform an expert analysis on these results. Score: ${session.score}/${session.questions.length}.
      
      SESSION DATA:
      - Mode: ${session.mode}
      - Questions: ${JSON.stringify(
        session.questions.map(q => ({
          category: q.category,
          correct: session.userAnswers[q.id] === q.correctAnswer
        }))
      )}

      OUTPUT REQUIREMENTS:
      - All text MUST be in STRICT ENGLISH.
      - overallAssessment: 2-3 sentence summary.
      - strengths: Categories where they performed well.
      - weaknesses: Categories needing focus.
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