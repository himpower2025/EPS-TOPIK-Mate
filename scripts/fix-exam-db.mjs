#!/usr/bin/env node
/**
 * EPS-TOPIK Mate — DB 자동 교정 스크립트
 *
 * 실행:  node scripts/fix-exam-db.mjs          (미리보기, 파일 변경 없음)
 *        node scripts/fix-exam-db.mjs --write  (examData.ts 실제 수정 + .bak 백업)
 *
 * 기계적으로 100% 판정 가능한 것만 고칩니다. 대본 재작성처럼 사람이
 * 판단해야 하는 항목은 건드리지 않고 audit/report.html 로 남깁니다.
 *
 * 적용 내용
 *  1) M2  context 의 "대본:" 접두어 제거
 *  2) M1  context 가 비었는데 questionText 가 대본인 경우 → context 로 이동,
 *         questionText 는 유형별 표준 지시문으로 교체
 *  3) F1  "1번 X, 2번 Y…" 보기 낭독 대본을 TTS 가 번호까지 읽도록 정규화
 *  4) IMG imageRole('stimulus' | 'hint') 자동 태깅
 *         stimulus = 그림이 있어야 풀리는 문제 → 화면에 표시
 *         hint     = 대본에 답이 다 나오는 삽화 → 계속 숨김(정답 유출 방지)
 *  5) H2  "…그림을 고릅니다" 로 끝나는 해설을 텍스트 보기에 맞게 교정
 *  6) 개별 오류 3건 하드픽스 (s28_l_28 중복 보기 등)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_TS = path.join(ROOT, 'src/data/examData.ts');
const WRITE = process.argv.includes('--write');

const strip = (s) => String(s ?? '').replace(/[\s.,!?'"''""·~]/g, '');
const stem = (s) =>
  strip(s).replace(/(입니다|습니다|어요|아요|예요|이에요|해요|합니다|있습니다|있어요|이다)$/u, '');

// ---------------------------------------------------------------- 로드
function load() {
  let src = fs.readFileSync(DATA_TS, 'utf8');
  let js = src
    .replace(/^import[\s\S]*?from\s+['"].*?['"];?\s*$/m, '')
    .replace(/export const STATIC_EXAM_DATA\s*:\s*Question\[\]\s*=/, 'const DATA =')
    .replace(/QuestionType\.READING/g, '"READING"')
    .replace(/QuestionType\.LISTENING/g, '"LISTENING"');
  js += '\nmodule.exports = DATA;\n';
  const tmp = path.join(ROOT, '.__examData.cjs');
  fs.writeFileSync(tmp, js, 'utf8');
  const require = createRequire(pathToFileURL(tmp));
  const data = require(tmp);
  fs.unlinkSync(tmp);
  return { src, data };
}

// ---------------------------------------------------------------- 직렬화
const q2 = (s) => JSON.stringify(String(s));
function serialize(q) {
  const p = [];
  p.push(`id: ${q2(q.id)}`);
  p.push(`type: QuestionType.${q.type}`);
  p.push(`category: ${q2(q.category)}`);
  p.push(`questionText: ${q2(q.questionText)}`);
  if (q.context !== undefined && q.context !== null && String(q.context).length)
    p.push(`context: ${q2(q.context)}`);
  p.push(`options: [${q.options.map(q2).join(', ')}]`);
  if (q.optionImages) p.push(`optionImages: [${q.optionImages.map(q2).join(', ')}]`);
  p.push(`correctAnswer: ${q.correctAnswer}`);
  p.push(`explanation: ${q2(q.explanation ?? '')}`);
  if (q.imageUrl) p.push(`imageUrl: ${q2(q.imageUrl)}`);
  if (q.imagePrompt) p.push(`imagePrompt: ${q2(q.imagePrompt)}`);
  if (q.imageRole) p.push(`imageRole: ${q2(q.imageRole)}`);
  if (q.audioReadsOptions) p.push(`audioReadsOptions: true`);
  if (q.audioUrl) p.push(`audioUrl: ${q2(q.audioUrl)}`);
  if (q.sourceRef) p.push(`sourceRef: ${q2(q.sourceRef)}`);
  return `{ ${p.join(', ')} }`;
}

// ---------------------------------------------------------------- 표준 지시문
function standardPrompt(q) {
  const c = q.category || '';
  if (/그림/.test(c)) return '다음을 듣고 알맞은 그림을 고르십시오.';
  if (/응답|이어지는|대화 완성/.test(c)) return '다음을 듣고 이어지는 말을 고르십시오.';
  if (/들은/.test(c) || /어휘/.test(c)) return '들은 것을 고르십시오.';
  return '다음을 듣고 물음에 알맞은 답을 고르십시오.';
}

// ---------------------------------------------------------------- 하드픽스
const HARD = {
  s28_l_28: (q) => {
    // 보기 1번과 4번이 "부부와 자녀3" 으로 중복
    q.options[3] = '부모와 자녀 2명';
    return '중복 보기 교체';
  },
  s12_l_27: (q) => {
    q.imagePrompt =
      'A wall calendar page for June, the number 10 clearly circled in red under the Saturday column.';
    q.imageRole = 'stimulus';
    return '그림 없이 풀 수 없어 자료 그림 지정';
  },
  s12_l_28: (q) => {
    q.imagePrompt = 'A pile of fresh red chili peppers on a white plate.';
    q.imageRole = 'stimulus';
    return '그림 없이 풀 수 없어 자료 그림 지정';
  },
  s12_l_29: (q) => {
    q.imagePrompt = 'A subway station platform with a train arriving and passengers waiting.';
    q.imageRole = 'stimulus';
    return '그림 없이 풀 수 없어 자료 그림 지정';
  },
  s13_l_26: (q) => {
    q.imagePrompt = 'A small white bowl filled with coarse salt on a wooden table.';
    q.imageRole = 'stimulus';
    return '그림 없이 풀 수 없어 자료 그림 지정';
  },
  s13_l_27: (q) => {
    q.imagePrompt = 'A passenger airplane flying in a clear blue sky.';
    q.imageRole = 'stimulus';
    return '그림 없이 풀 수 없어 자료 그림 지정';
  },
};

// ---------------------------------------------------------------- 실행
const { src, data } = load();
const changes = [];
const byId = new Map(data.map((q) => [q.id, q]));

for (const q of data) {
  const before = JSON.stringify(q);
  const notes = [];

  // 1) "대본:" 접두어 제거
  if (typeof q.context === 'string' && /^\s*대본:/.test(q.context)) {
    q.context = q.context.replace(/^\s*대본:\s*/, '').trim();
    notes.push('대본: 접두어 제거');
  }

  // 2) context 비었고 questionText 가 실제 대본인 듣기 문제
  if (
    q.type === 'LISTENING' &&
    !(q.context && String(q.context).trim()) &&
    !/고르십시오|고르세요|고릅니다/.test(q.questionText || '')
  ) {
    q.context = q.questionText;
    q.questionText = standardPrompt(q);
    notes.push('발문↔대본 구조 정규화');
  }

  // 3) 보기 낭독형 대본 정규화 — TTS 가 번호를 지우지 않도록 마침표로 끊어줌
  if (q.type === 'LISTENING' && /1\s?번[\s\S]{0,40}2\s?번/.test(q.context || '')) {
    const parts = String(q.context)
      .split(/\s*\d+\s?번\s*/)
      .map((s) => s.replace(/[,.]\s*$/, '').trim())
      .filter(Boolean);
    if (parts.length === 4) {
      q.context = parts.map((t, i) => `${i + 1}번, ${t}.`).join(' ');
      q.audioReadsOptions = true;
      notes.push('보기 낭독 대본 정규화');
    }
  }

  // 4) imageRole 태깅
  if (q.imageUrl || q.imagePrompt) {
    if (q.type === 'READING') {
      q.imageRole = 'stimulus';
    } else if (q.audioReadsOptions) {
      // 보기를 번호와 함께 낭독하는 유형은 그림이 유일한 판단 근거입니다.
      q.imageRole = 'stimulus';
      notes.push('imageRole=stimulus (보기 낭독형)');
    } else if (!q.imageRole) {
      const heard = String(q.context || q.questionText || '')
        .replace(/\[.*?\]/g, '')
        .replace(/\d+\s?번/g, '')
        .trim();
      const ans = stem(q.options?.[q.correctAnswer]);
      const leaks = ans.length > 1 && strip(heard).includes(ans);
      q.imageRole = leaks ? 'hint' : 'stimulus';
      notes.push(`imageRole=${q.imageRole}`);
    }
  }

  // 5) 해설의 "그림" 표현 교정 (보기가 텍스트인 경우만)
  if (!q.optionImages && q.imageRole !== 'stimulus' && /그림|사진/.test(q.explanation || '')) {
    const opt = q.options?.[q.correctAnswer] ?? '';
    const fixed = String(q.explanation)
      .replace(/(?:알맞은\s*)?(?:그림|사진)(?:을|를)?\s*(?:고릅니다|고르는 문제입니다|선택합니다)\.?/g, `정답은 '${opt}'입니다.`)
      .replace(/(?:그림|사진)\s*(?:속|안|의)?\s*/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (fixed !== q.explanation && fixed.length > 5) {
      q.explanation = fixed;
      notes.push('해설의 그림 표현 교정');
    }
  }

  // 6) 하드픽스
  if (HARD[q.id]) notes.push(HARD[q.id](q));

  if (JSON.stringify(q) !== before) changes.push({ id: q.id, notes });
}

// ---------------------------------------------------------------- 파일 반영
let out = src;
let replaced = 0;
for (const { id } of changes) {
  const q = byId.get(id);
  const re = new RegExp(`\\{[^\\n]*?id:\\s*"${id}"[\\s\\S]*?\\}(?=\\s*,?\\s*(?:\\n|\\]))`);
  const m = out.match(re);
  if (!m) {
    console.warn(`  ! ${id} 블록을 찾지 못해 건너뜁니다`);
    continue;
  }
  out = out.replace(re, serialize(q));
  replaced++;
}

console.log(`\n수정 대상 ${changes.length}문항 / 치환 성공 ${replaced}건\n`);
const tally = {};
changes.forEach((c) => c.notes.forEach((n) => (tally[n] = (tally[n] || 0) + 1)));
Object.entries(tally)
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}건  ${k}`));

if (WRITE) {
  fs.copyFileSync(DATA_TS, DATA_TS + '.bak');
  fs.writeFileSync(DATA_TS, out, 'utf8');
  console.log(`\n적용 완료. 원본은 examData.ts.bak 로 백업했습니다.`);
  console.log(`다음: node scripts/audit-exam-db.mjs 로 재검사하세요.`);
} else {
  console.log(`\n미리보기입니다. 실제 반영하려면 --write 를 붙여 실행하세요.`);
}
