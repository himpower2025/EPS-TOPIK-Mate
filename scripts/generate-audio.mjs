#!/usr/bin/env node
/**
 * EPS-TOPIK Mate — 듣기 음성 일괄 사전 생성
 *
 *   GEMINI_API_KEY=xxx node scripts/generate-audio.mjs            # 전체
 *   GEMINI_API_KEY=xxx node scripts/generate-audio.mjs --set 1,2  # 특정 세트
 *   GEMINI_API_KEY=xxx node scripts/generate-audio.mjs --only s3_l_25
 *   GEMINI_API_KEY=xxx node scripts/generate-audio.mjs --force    # 기존 파일 덮어쓰기
 *
 * 결과: public/audio/s{n}_l_{n}.wav  +  examData.ts 에 audioUrl 자동 기입
 *
 * ── 왜 실시간 TTS 대신 사전 생성인가 ─────────────────────────────
 *  · 음색 고정: 사용자마다 다른 목소리가 나오지 않습니다.
 *  · 비용: 듣기 600문항 × 사용자 수 → 600회 1번으로 끝납니다.
 *  · 속도: 재생 버튼 누르면 즉시 나옵니다. (지금은 매번 수 초 대기)
 *  · 보안: 지금은 브라우저 번들에 API_KEY 가 들어가 누구나 꺼낼 수 있습니다.
 *          사전 생성하면 클라이언트에서 키를 완전히 제거할 수 있습니다.
 *  · 오프라인: PWA 캐시에 담기므로 네트워크 없이도 시험이 진행됩니다.
 * ──────────────────────────────────────────────────────────────
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_TS = path.join(ROOT, 'src/data/examData.ts');
const AUDIO_DIR = path.join(ROOT, 'public/audio');
const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;

// ── 음색: src/services/geminiService.ts 의 EXAM_VOICES 와 반드시 동일하게 유지
const VOICES = { man: 'Rasalgethi', woman: 'Achernar' };
const MODEL = 'gemini-2.5-flash-preview-tts';

const args = process.argv.slice(2);
const argVal = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const FORCE = args.includes('--force');
const ONLY = argVal('--only');
const SETS = argVal('--set')?.split(',').map((s) => `s${s.trim()}_`);

if (!API_KEY) {
  console.error('GEMINI_API_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

// ---------------------------------------------------------------- 데이터 로드
function load() {
  let js = fs
    .readFileSync(DATA_TS, 'utf8')
    .replace(/^import[\s\S]*?from\s+['"].*?['"];?\s*$/m, '')
    .replace(/export const STATIC_EXAM_DATA\s*:\s*Question\[\]\s*=/, 'const DATA =')
    .replace(/QuestionType\.READING/g, '"READING"')
    .replace(/QuestionType\.LISTENING/g, '"LISTENING"');
  js += '\nmodule.exports = DATA;\n';
  const tmp = path.join(ROOT, '.__audioData.cjs');
  fs.writeFileSync(tmp, js, 'utf8');
  const require = createRequire(pathToFileURL(tmp));
  const data = require(tmp);
  fs.unlinkSync(tmp);
  return data;
}

// ---------------------------------------------------------------- 대본 준비
// src/services/geminiService.ts 의 prepareAudioScript 와 동일한 규칙
function prepare(raw) {
  let text = String(raw ?? '').replace(/\[.*?\]/g, '').trim();
  text = text.replace(/^대본:\s*/i, '').trim();
  text = text.replace(/\.\.\./g, '. ');
  const readsAllOptions = /1\s?번[\s\S]{0,60}2\s?번[\s\S]{0,60}3\s?번/.test(text);
  if (!readsAllOptions) {
    text = text.replace(/\d+\s?번/g, '').replace(/^\d+[.)]\s*/gm, '');
  }
  text = text.replace(/\s*\/\s*/g, '\n');
  const pairs = [
    [/\n?가\s*:\s*/g, '\nMan: '], [/\n?나\s*:\s*/g, '\nWoman: '],
    [/\n?남자?\s*:\s*/g, '\nMan: '], [/\n?여자?\s*:\s*/g, '\nWoman: '],
    [/\n?A\s*:\s*/g, '\nMan: '], [/\n?B\s*:\s*/g, '\nWoman: '],
  ];
  let hasTags = /(가|나|남|여|남자|여자|Man|Woman|A|B)\s*:/.test(text);
  if (hasTags) for (const [from, to] of pairs) text = text.replace(from, to);
  text = text.trim();
  return { script: text, isDialogue: /Man: |Woman: /.test(text) };
}

const DIRECTOR = `You are generating the official audio track for a Korean language
proficiency exam (EPS-TOPIK, beginner level, for foreign workers).

# AUDIO PROFILE
Professional Korean exam narrators recording in a quiet studio. Standard Seoul
Korean. Neutral and composed — a public announcement, not a drama.

# DIRECTOR'S NOTES
Style: Calm and even. No emotional colouring, no rising sing-song intonation,
  no cheerfulness. Comfortable middle register; never bright or shrill.
Articulation: Every syllable clearly separated, final consonants fully
  pronounced, for learners still building listening skills.
Pace: Slightly slower than natural conversation, never robotic.
Pause: About one second between speaker turns, 0.6 seconds between sentences.

Read ONLY the lines under TRANSCRIPT. Do not read these notes aloud.

# TRANSCRIPT`;

// ---------------------------------------------------------------- WAV 저장
function pcmToWav(pcm, sampleRate = 24000, channels = 1, bits = 16) {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * channels * bits) / 8;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE((channels * bits) / 8, 32);
  header.writeUInt16LE(bits, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

// ---------------------------------------------------------------- API 호출
async function synth(script, isDialogue, attempt = 0) {
  const speechConfig = isDialogue
    ? {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            { speaker: 'Man', voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICES.man } } },
            { speaker: 'Woman', voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICES.woman } } },
          ],
        },
      }
    : { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICES.woman } } };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${DIRECTOR}\n${script}` }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig },
      }),
    },
  );

  if (!res.ok) {
    // 500 / 429 는 일시적 오류라 재시도 (공식 문서 권장)
    if ((res.status >= 500 || res.status === 429) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      return synth(script, isDialogue, attempt + 1);
    }
    throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  }

  const json = await res.json();
  const b64 = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
  if (!b64) throw new Error('오디오 파트 없음');
  return pcmToWav(Buffer.from(b64, 'base64'));
}

// ---------------------------------------------------------------- 메인
const data = load();
let targets = data.filter((q) => q.type === 'LISTENING');
if (ONLY) targets = targets.filter((q) => q.id === ONLY);
if (SETS) targets = targets.filter((q) => SETS.some((p) => q.id.startsWith(p)));

fs.mkdirSync(AUDIO_DIR, { recursive: true });
console.log(`대상 ${targets.length}문항 · 음색 남 ${VOICES.man} / 여 ${VOICES.woman}\n`);

const done = [];
let skipped = 0,
  failed = 0;

for (const [i, q] of targets.entries()) {
  const file = path.join(AUDIO_DIR, `${q.id}.wav`);
  if (fs.existsSync(file) && !FORCE) {
    skipped++;
    done.push(q.id);
    continue;
  }

  const isInstruction = /고르십시오|고르세요|들은 것을/.test(q.questionText || '');
  const raw =
    q.context && q.questionText && !isInstruction && q.context !== q.questionText
      ? `${q.context}\n${q.questionText}`
      : q.context || q.questionText;

  const { script, isDialogue } = prepare(raw);
  if (!script) {
    console.warn(`  - ${q.id} 대본 없음, 건너뜀`);
    continue;
  }

  try {
    const wav = await synth(script, isDialogue);
    fs.writeFileSync(file, wav);
    done.push(q.id);
    console.log(`  ✓ [${i + 1}/${targets.length}] ${q.id} (${(wav.length / 1024).toFixed(0)}KB)`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${q.id}: ${err.message}`);
  }

  await new Promise((r) => setTimeout(r, 400)); // rate limit 여유
}

// audioUrl 을 examData.ts 에 기입
let src = fs.readFileSync(DATA_TS, 'utf8');
let wrote = 0;
for (const id of done) {
  if (new RegExp(`id: "${id}"[^\\n]*audioUrl`).test(src)) continue;
  const re = new RegExp(`(\\{[^\\n]*?id: "${id}"[\\s\\S]*?)(\\s*\\}(?=\\s*,?\\s*(?:\\n|\\])))`);
  if (re.test(src)) {
    src = src.replace(re, `$1, audioUrl: "/audio/${id}.wav"$2`);
    wrote++;
  }
}
if (wrote) {
  fs.writeFileSync(DATA_TS, src, 'utf8');
}

console.log(`\n생성 ${done.length - skipped} · 재사용 ${skipped} · 실패 ${failed} · audioUrl 기입 ${wrote}`);
console.log(`파일 위치: public/audio/`);
