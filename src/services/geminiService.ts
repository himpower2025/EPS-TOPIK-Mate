/// <reference types="vite/client" />
import { Modality } from "@google/genai";
import { Question, QuestionType, AnalyticsFeedback, ExamSession, ExamMode, PlanType } from '../types';
import { STATIC_EXAM_DATA } from '../data/examData';

// ──────────────────────────────────────────────────────────────
// Firebase Functions URL
// 배포 후에는 실제 Functions URL 로 바꾸세요.
// 개발 중에는 로컬 에뮬레이터 URL을 씁니다.
// ──────────────────────────────────────────────────────────────
const FUNCTIONS_BASE =
  import.meta.env.VITE_FUNCTIONS_URL ||
  'http://localhost:5001/eps-topik-mate/us-central1';

/** Functions 엔드포인트를 호출하는 공통 헬퍼 */
async function callFunction<T>(name: string, body: unknown): Promise<T> {
  const res = await fetch(`${FUNCTIONS_BASE}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[${name}] ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

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

  // 3.5단계: 숫자 마커 처리
  //  - 보기 4개를 번호와 함께 낭독하는 유형(1번…2번…3번…4번…)은 실제 시험과
  //    동일하므로 번호를 그대로 살린다. 지우면 단어 나열만 들려 문제가 성립하지 않는다.
  //  - 그 외에 정답 번호만 남아 있는 경우("1번 비누입니다")는 정답 유출이므로 제거한다.
  const readsAllOptions = /1\s?번[\s\S]{0,60}2\s?번[\s\S]{0,60}3\s?번/.test(text);
  if (!readsAllOptions) {
    text = text.replace(/\d+\s?번/g, '');
    text = text.replace(/^\d+[\.\)]\s*/gm, '');
  }

  // 4단계: 교대 기호 ("/") 를 개행으로 변경
  text = text.replace(/\s*\/\s*/g, '\n');

  // 5단계: 대화 태그 통일 (DB에 있는 모든 패턴 → Man:/Woman:)
  let hasTags = /(가|나|남|여|남자|여자|Man|Woman|A|B)\s*:/.test(text);

  // 숨겨진 대화 감지(태그 없이 물음표로 질문과 대답이 나뉘는 경우)
  if (!hasTags && !readsAllOptions && text.includes('?')) {
    const firstQ = text.indexOf('?');
    // 물음표 뒤에 글자가 있으면 대화로 간주하여 강제 분리
    if (firstQ !== -1 && firstQ < text.length - 2) {
      const part1 = text.substring(0, firstQ + 1).trim();
      const part2 = text.substring(firstQ + 1).trim();
      text = `Man: ${part1}\nWoman: ${part2}`;
      hasTags = true;
    }
  }

  const dialoguePatterns = [
    { from: /\n?가\s*:\s*/g, to: '\nMan: ' },
    { from: /\n?나\s*:\s*/g, to: '\nWoman: ' },
    { from: /\n?남\s*:\s*/g, to: '\nMan: ' },
    { from: /\n?여\s*:\s*/g, to: '\nWoman: ' },
    { from: /\n?남자\s*:\s*/g, to: '\nMan: ' },
    { from: /\n?여자\s*:\s*/g, to: '\nWoman: ' },
    { from: /\n?Man\s*:\s*/g, to: '\nMan: ' },
    { from: /\n?Woman\s*:\s*/g, to: '\nWoman: ' },
    { from: /\n?A\s*:\s*/g, to: '\nMan: ' },
    { from: /\n?B\s*:\s*/g, to: '\nWoman: ' },
  ];

  let processed = text;
  if (hasTags) {
    for (const { from, to } of dialoguePatterns) {
      processed = processed.replace(from, to);
    }
  }
  
  // 만약 "/" 로 분리하여 개행은 되었으나 태그가 없었다면 강제 교대
  const splitRaw = processed.split('\n').filter(l => l.trim().length > 0);
  if (!hasTags && splitRaw.length > 1) {
      let forced = '';
      splitRaw.forEach((line, index) => {
          forced += (index % 2 === 0 ? `Man: ${line}\n` : `Woman: ${line}\n`);
      });
      processed = forced.trim();
  }

  processed = processed.trim();

  // 6단계: 대화형 여부 판별
  const isDialogue = processed.includes('Man: ') || processed.includes('Woman: ');

  // 7단계: 스피커별 라인 분해 (브라우저 TTS 멀티 보이스 재생용)
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

  // 샘플 문항 3개를 서버에 보내면 참고용으로 활용됩니다.
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
      imagePrompt: q.imagePrompt,
    }));

  try {
    const generated = await callFunction<Question[]>('generateQuestions', {
      roundNumber, mode, plan, samples,
    });
    return generated
      .map(q => ({
        ...q,
        category: q.category || 'General',
        imagePrompt:
          q.imagePrompt ||
          (q.type === QuestionType.READING
            ? `A clear educational illustration of: ${q.questionText}`
            : undefined),
      }))
      .filter((q: Question) => mode === 'FULL' || q.type === mode);
  } catch (err) {
    console.error('generateQuestions error:', err);
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

  try {
    const data = await callFunction<{ image: string }>('generateImage', { prompt });
    return data.image ?? null;
  } catch (err) {
    console.error('generateImage error:', err);
    return null;
  }
};

// ============================================================
// 🎧 EPS-TOPIK 듣기 음성 엔진
//
// 기존 문제점
//   1. model 이 "gemini-2.5-flash" 였습니다. 이 모델은 AUDIO 모달리티를
//      지원하지 않아 매번 실패했고, 결국 100% 브라우저 speechSynthesis
//      폴백으로 재생되고 있었습니다. "어색하고 하이톤"의 실제 원인입니다.
//   2. 폴백에서 여성 pitch 를 1.1 / 1.25 로 올려 더 높게 만들었습니다.
//   3. Puck(Upbeat) / Kore(Firm) 는 시험 낭독용 음색이 아닙니다.
//
// 변경 사항
//   1. 전용 TTS 모델 사용 (gemini-2.5-flash-preview-tts)
//   2. 시험 낭독에 맞는 차분한 음색으로 교체 (아래 EXAM_VOICES 에서 조절)
//   3. 프롬프트를 공식 가이드 구조(Audio Profile / Director's Notes /
//      TRANSCRIPT)로 재작성 — 지시문을 그대로 읽어버리는 오작동 방지
//   4. 동일 대본 재요청을 막는 캐시
//   5. 폴백 음성도 pitch 1.0 기준으로 정상화
// ============================================================

/**
 * 음색을 바꾸고 싶으면 이 값만 고치면 됩니다.
 * 사용 가능한 30종 중 시험 낭독에 적합한 후보:
 *   남성 — Charon(차분·설명체) / Iapetus(또렷) / Algenib(저음) / Rasalgethi(안정)
 *   여성 — Erinome(또렷) / Gacrux(성숙) / Achernar(부드러움) / Schedar(균일) / Vindemiatrix(온화)
 * 피해야 할 음색 — Puck·Laomedeia(Upbeat), Fenrir(Excitable), Leda(Youthful), Zephyr·Autonoe(Bright)
 */
export const EXAM_VOICES = {
  man: 'Rasalgethi',      // Informative — 낮고 안정적인 설명체 남성
  woman: 'Achernar',  // Soft — 부드럽고 낮게 깔리는 여성
  narrator: 'Schedar' // 기복 없는 안내 방송 톤
} as const;

const TTS_MODELS = [
  'gemini-2.5-flash-preview-tts', // 정확한 낭독에 안정적
  'gemini-3.1-flash-tts-preview'  // 1차 실패 시 대체
];

/** 같은 대본을 두 번 생성하지 않도록 하는 세션 캐시 */
const audioCache = new Map<string, AudioBuffer>();

const DIRECTOR_NOTES = `You are generating the official audio track for a Korean
language proficiency exam (EPS-TOPIK, beginner level, for foreign workers).

# AUDIO PROFILE
Professional Korean exam narrators recording in a quiet studio. Standard Seoul
Korean. Neutral, composed, unhurried — the tone of a public announcement, not
a drama or an advertisement.

# DIRECTOR'S NOTES
Style: Calm and even. No emotional colouring, no rising sing-song intonation,
  no cheerfulness. Keep the pitch in a comfortable middle register; never
  bright or shrill.
Articulation: Every syllable clearly separated. Final consonants fully
  pronounced. This is for learners who are still building listening skills.
Pace: Slightly slower than natural conversation, but never robotic.
Pause: Leave about one second of silence between speaker turns and about
  0.6 seconds between sentences.
Accent: Standard Seoul Korean, textbook pronunciation.

Read ONLY the lines under TRANSCRIPT. Do not read these notes aloud, do not
add greetings, comments, or sound effects.

# TRANSCRIPT`;

export const generateSpeech = async (
  rawText: string,
  ctx: AudioContext
): Promise<AudioBuffer | null> => {
  const { script, isDialogue } = prepareAudioScript(rawText);
  if (!script) return null;

  const cacheKey = `${isDialogue ? 'd' : 's'}:${script}`;
  const cached = audioCache.get(cacheKey);
  if (cached) return cached;

  // TTS 는 음성 사전 생성 완료 후 이 경로를 거치지 않습니다.
  // 사전 생성이 안 된 문항의 실시간 폴백입니다. 키를 VITE_GEMINI_KEY 로 넣으세요.
  const ttsKey = (import.meta as any).env?.VITE_GEMINI_KEY ?? '';
  if (!ttsKey) {
    console.warn('[TTS] VITE_GEMINI_KEY 없음 — 브라우저 음성으로 폴백합니다.');
    return null;
  }
  const { GoogleGenAI: _GAI } = await import('@google/genai');
  const ai = new _GAI({ apiKey: ttsKey });

  const speechConfig = isDialogue
    ? {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            { speaker: 'Man', voiceConfig: { prebuiltVoiceConfig: { voiceName: EXAM_VOICES.man } } },
            { speaker: 'Woman', voiceConfig: { prebuiltVoiceConfig: { voiceName: EXAM_VOICES.woman } } }
          ]
        }
      }
    : {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: EXAM_VOICES.woman } }
      };

  const prompt = `${DIRECTOR_NOTES}\n${script}`;

  for (const model of TTS_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig }
      });

      const audioData = response.candidates?.[0]?.content?.parts?.find(
        (p: any) => p.inlineData?.data
      )?.inlineData?.data;

      if (!audioData) {
        console.warn(`[TTS] ${model}: 오디오 파트 없음, 다음 모델 시도`);
        continue;
      }

      // Gemini TTS 출력은 24kHz 16bit mono PCM(L16) 입니다.
      const buffer = await decodeAudioData(decodeBase64(audioData), ctx, 24000, 1);
      audioCache.set(cacheKey, buffer);
      return buffer;
    } catch (err: any) {
      console.warn(`[TTS] ${model} 실패:`, err?.message ?? err);
    }
  }

  console.error('[TTS] 모든 TTS 모델 실패 — 브라우저 음성으로 폴백합니다.');
  return null;
};

export const analyzePerformance = async (
  session: ExamSession
): Promise<AnalyticsFeedback | null> => {
  try {
    return await callFunction<AnalyticsFeedback>('analyzePerformance', { session });
  } catch (err) {
    console.error('analyzePerformance error:', err);
    return null;
  }
};