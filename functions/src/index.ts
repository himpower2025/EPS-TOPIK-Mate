/**
 * EPS-TOPIK Mate — Firebase Cloud Functions
 *
 * 클라이언트 측 Gemini 호출 3가지를 서버로 이전합니다.
 *   /analyzePerformance  — 성적 분석 (gemini-1.5-flash)
 *   /generateImage       — 즉석 이미지 생성 (imagen-3)
 *   /generateQuestions   — AI 문제 생성 (gemini-1.5-flash, Pro 플랜용)
 *
 * API 키 관리
 *   개발: firebase functions:secrets:set GEMINI_API_KEY
 *   로컬: functions/.env 파일에  GEMINI_API_KEY=xxx  (gitignore 에 포함)
 *   절대 코드에 하드코딩하지 마세요.
 *
 * 배포
 *   cd functions && npm run build
 *   firebase deploy --only functions
 *
 * CORS
 *   allowedOrigins 에 실제 도메인을 추가하세요.
 *   개발 중에는 http://localhost:5173 을 허용합니다.
 */

import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { GoogleGenAI, Type } from '@google/genai';

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

// ── CORS 허용 오리진 ────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://eps-topik-mate.web.app',
  'https://eps-topik-mate.firebaseapp.com',
  // 커스텀 도메인이 있으면 여기에 추가
];

function setCors(req: any, res: any): boolean {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Max-Age', '3600');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true; // preflight 처리 완료
  }
  return false;
}

function getAI(key: string) {
  return new GoogleGenAI({ apiKey: key });
}

function cleanJson(text: string): string {
  return text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
}

// ── 1. 성적 분석 ─────────────────────────────────────────────
export const analyzePerformance = onRequest(
  { secrets: [GEMINI_API_KEY], cors: false, timeoutSeconds: 60 },
  async (req, res) => {
    if (setCors(req, res)) return;
    if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

    const { session } = req.body || {};
    if (!session) { res.status(400).json({ error: 'session required' }); return; }

    const ai = getAI(GEMINI_API_KEY.value());
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: `Perform an expert analysis on these results. Score: ${session.score}/${session.questions?.length ?? 0}.

SESSION DATA:
- Mode: ${session.mode}
- Questions: ${JSON.stringify(
  (session.questions || []).map((q: any) => ({
    category: q.category,
    correct: session.userAnswers?.[q.id] === q.correctAnswer,
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
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallAssessment: { type: Type.STRING },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
              studyPlan: { type: Type.STRING },
            },
            required: ['overallAssessment', 'strengths', 'weaknesses', 'studyPlan'],
          },
        },
      });

      const text = response.text;
      if (!text) { res.status(500).json({ error: 'Empty AI response' }); return; }
      res.json(JSON.parse(cleanJson(text)));
    } catch (err: any) {
      console.error('analyzePerformance error:', err);
      res.status(500).json({ error: err.message || 'Analysis failed' });
    }
  }
);

// ── 2. 즉석 이미지 생성 ──────────────────────────────────────
export const generateImage = onRequest(
  { secrets: [GEMINI_API_KEY], cors: false, timeoutSeconds: 60, memory: '512MiB' },
  async (req, res) => {
    if (setCors(req, res)) return;
    if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

    const { prompt } = req.body || {};
    if (!prompt) { res.status(400).json({ error: 'prompt required' }); return; }

    const ai = getAI(GEMINI_API_KEY.value());
    const enhancedPrompt =
      `A clear, high-quality educational illustration for a Korean language exam. ` +
      `Style: Simple 2D vector art, clean lines, white background, no decorative text overlays. ` +
      `Subject: ${prompt}`;

    const models = ['imagen-3.0-generate-002', 'imagen-3.0-fast-generate-001'];
    for (const model of models) {
      try {
        const response = await ai.models.generateImages({
          model,
          prompt: enhancedPrompt,
          config: { numberOfImages: 1, aspectRatio: '1:1' },
        });
        const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
        if (imageBytes) {
          res.json({ image: `data:image/png;base64,${imageBytes}` });
          return;
        }
      } catch (err) {
        console.warn(`${model} failed:`, err);
      }
    }
    res.status(500).json({ error: 'Image generation failed' });
  }
);

// ── 3. AI 문제 생성 (Pro 플랜) ────────────────────────────────
export const generateQuestions = onRequest(
  { secrets: [GEMINI_API_KEY], cors: false, timeoutSeconds: 120, memory: '512MiB' },
  async (req, res) => {
    if (setCors(req, res)) return;
    if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

    const { roundNumber, mode, plan, samples } = req.body || {};
    if (!roundNumber || !mode) {
      res.status(400).json({ error: 'roundNumber and mode required' });
      return;
    }

    const difficultyContext =
      plan === 'free'
        ? 'Standard Beginner Level'
        : 'High-tier Workplace and Technical Industry Scenarios';

    const ai = getAI(GEMINI_API_KEY.value());
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: `You are an elite EPS-TOPIK Question Designer.
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
   ${JSON.stringify(samples || [], null, 2)}

JSON FORMAT REQUIRED.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['READING', 'LISTENING'] },
                category: { type: Type.STRING },
                questionText: { type: Type.STRING },
                context: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
                imagePrompt: { type: Type.STRING },
              },
              required: ['id', 'type', 'questionText', 'options', 'correctAnswer', 'imagePrompt'],
            },
          },
        },
      });

      const text = response.text;
      if (!text) { res.status(500).json({ error: 'Empty AI response' }); return; }
      res.json(JSON.parse(cleanJson(text)));
    } catch (err: any) {
      console.error('generateQuestions error:', err);
      res.status(500).json({ error: err.message || 'Generation failed' });
    }
  }
);
