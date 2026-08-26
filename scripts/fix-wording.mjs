#!/usr/bin/env node
/**
 * EPS-TOPIK Mate — 발문·보기·해설 마무리 정리
 *
 *   node scripts/fix-wording.mjs          # 미리보기
 *   node scripts/fix-wording.mjs --write  # 반영
 *
 * [1] H3 · 발문은 "알맞은 그림을 고르십시오" 인데 보기가 텍스트인 문항
 *     그림 4장을 새로 만드는 대신 내용 일치형으로 발문을 바꿉니다.
 *     EPS-TOPIK 에 실제로 있는 유형이고, 추가 자료가 필요 없습니다.
 *     (보기가 시각·개수·날짜처럼 그림으로 그릴 수 있는 것은
 *      render-materials.mjs 에서 이미 그림 4장으로 만들었습니다)
 *
 * [2] M3 · 보기가 "…하는 그림" 같은 설명문인 문항 → 문장형 보기로 교체
 *
 * [3] F3 잔여 · 사진이 필요한 읽기 문항에 imagePrompt 를 넣어
 *     자료 목록(materials)에 잡히게 합니다.
 *
 * [4] H2 · 그림이 없는데 해설이 "그림을 고릅니다"로 끝나는 문항 정리
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_TS = path.join(ROOT, 'src/data/examData.ts');
const WRITE = process.argv.includes('--write');

/* ── [1] 발문 교체 ─────────────────────────────────── */
const REPHRASE = [
  's7_l_24', 's8_l_36', 's9_l_36', 's15_l_23', 's15_l_29', 's15_l_36',
  's15_l_37', 's16_l_37', 's18_l_24', 's14_l_37', 's19_l_36', 's12_l_37',
];

/* ── [2] 보기 교체 ─────────────────────────────────── */
const OPTIONS = {
  s7_l_24: ['책만 들어 있습니다', '책과 필통과 지갑이 들어 있습니다', '옷만 들어 있습니다', '음식만 들어 있습니다'],
  s8_l_36: ['문을 잠급니다', '문을 열어 줍니다', '짐을 버립니다', '전화를 합니다'],
  s30_l_24: ['우유', '주스와 계란과 빵', '밥', '주스와 도넛'],
};

/* ── [3] 사진이 필요한 읽기 문항 ───────────────────── */
const PROMPTS = {
  s10_r_11: 'A large office photocopier standing beside a desk in an office.',
  s20_r_11: 'A large office photocopier standing beside a desk in an office.',
  s30_r_3:  'A large office photocopier with a control panel and paper tray.',
  s12_r_2:  'A person holding a steaming coffee mug, standing by a window and looking outside.',
  s27_r_2:  'A man in a white shirt standing in front of a mirror, holding up two neckties and choosing between them.',
  s28_r_14: 'Several brooms standing upright against a wall in a storage corner.',
};

/* ── 직렬화 ────────────────────────────────────────── */
const q2 = (s) => JSON.stringify(String(s));
function serialize(q) {
  const p = [];
  p.push(`id: ${q2(q.id)}`, `type: QuestionType.${q.type}`, `category: ${q2(q.category)}`,
         `questionText: ${q2(q.questionText)}`);
  if (q.context) p.push(`context: ${q2(q.context)}`);
  p.push(`options: [${q.options.map(q2).join(', ')}]`);
  if (q.optionImages) p.push(`optionImages: [${q.optionImages.map(q2).join(', ')}]`);
  p.push(`correctAnswer: ${q.correctAnswer}`, `explanation: ${q2(q.explanation ?? '')}`);
  if (q.imageUrl) p.push(`imageUrl: ${q2(q.imageUrl)}`);
  if (q.imagePrompt) p.push(`imagePrompt: ${q2(q.imagePrompt)}`);
  if (q.imageRole) p.push(`imageRole: ${q2(q.imageRole)}`);
  if (q.audioReadsOptions) p.push(`audioReadsOptions: true`);
  if (q.intendedLeak) p.push(`intendedLeak: true`);
  if (q.audioUrl) p.push(`audioUrl: ${q2(q.audioUrl)}`);
  if (q.sourceRef) p.push(`sourceRef: ${q2(q.sourceRef)}`);
  return `{ ${p.join(', ')} }`;
}

function load() {
  let js = fs.readFileSync(DATA_TS, 'utf8')
    .replace(/^import[\s\S]*?from\s+['"].*?['"];?\s*$/m, '')
    .replace(/export const STATIC_EXAM_DATA\s*:\s*Question\[\]\s*=/, 'const DATA =')
    .replace(/QuestionType\.READING/g, '"READING"')
    .replace(/QuestionType\.LISTENING/g, '"LISTENING"');
  const tmp = path.join(ROOT, '.__fw.cjs');
  fs.writeFileSync(tmp, js + '\nmodule.exports = DATA;\n', 'utf8');
  const data = createRequire(pathToFileURL(tmp))(tmp);
  fs.unlinkSync(tmp);
  return data;
}

const src0 = fs.readFileSync(DATA_TS, 'utf8');
const data = load();
const byId = new Map(data.map((q) => [q.id, q]));
const touched = new Set();
const tally = {};
const bump = (k) => (tally[k] = (tally[k] || 0) + 1);

// [1] 발문 교체 — 보기가 그림으로 대체되지 않은 문항만
for (const id of REPHRASE) {
  const q = byId.get(id);
  if (!q || q.optionImages) continue;
  q.questionText = '들은 내용과 같은 것을 고르십시오.';
  if (q.imageUrl || q.imagePrompt) q.imageRole = 'hint'; // 삽화가 정답을 드러내므로 숨김
  touched.add(id);
  bump('[1] 그림 선택형 → 내용 일치형 발문');
}

// [2] 보기 교체
for (const [id, opts] of Object.entries(OPTIONS)) {
  const q = byId.get(id);
  if (!q) continue;
  q.options = opts;
  touched.add(id);
  bump('[2] "…그림" 보기를 문장형으로 교체');
}

// [3] imagePrompt 보강
for (const [id, prompt] of Object.entries(PROMPTS)) {
  const q = byId.get(id);
  if (!q || q.imageUrl) continue;
  q.imagePrompt = prompt;
  q.imageRole = 'stimulus';
  touched.add(id);
  bump('[3] 필요한 사진 지정');
}

// [4] 해설의 "그림" 표현 — 그림이 실제로 없는 문항만
for (const q of data) {
  if (q.optionImages || q.imageRole === 'stimulus') continue;
  if (!/그림|사진/.test(q.explanation || '')) continue;
  const opt = q.options?.[q.correctAnswer] ?? '';
  const fixed = String(q.explanation)
    .replace(/(?:알맞은\s*|해당\s*)?(?:그림|사진)(?:을|를)?\s*(?:고릅니다|고르는 문제입니다|선택합니다|고르십시오)\.?/g, `정답은 '${opt}'입니다.`)
    .replace(/(?:그림|사진)\s*(?:속|안|의|에)?\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (fixed !== q.explanation && fixed.length > 5) {
    q.explanation = fixed;
    touched.add(q.id);
    bump('[4] 해설의 그림 표현 정리');
  }
}

// 반영
let out = src0;
let ok = 0;
for (const id of touched) {
  const re = new RegExp(`\\{[^\\n]*?id:\\s*"${id}"[\\s\\S]*?\\}(?=\\s*,?\\s*(?:\\n|\\]))`);
  if (!re.test(out)) { console.warn(`  ! ${id} 미발견`); continue; }
  out = out.replace(re, serialize(byId.get(id)));
  ok++;
}

console.log(`\n대상 ${touched.size}문항 / 치환 ${ok}건\n`);
Object.entries(tally).forEach(([k, v]) => console.log(`  ${String(v).padStart(3)}건  ${k}`));

if (WRITE) {
  fs.copyFileSync(DATA_TS, DATA_TS + '.bak4');
  fs.writeFileSync(DATA_TS, out, 'utf8');
  console.log(`\n적용 완료 (백업: examData.ts.bak4)`);
} else {
  console.log(`\n미리보기입니다. --write 를 붙이면 반영됩니다.`);
}
