#!/usr/bin/env node
/**
 * EPS-TOPIK Mate — 업로드한 이미지 파일을 DB에 자동 연결
 *
 *   node scripts/link-images.mjs          # 무엇이 연결될지 미리보기
 *   node scripts/link-images.mjs --write  # examData.ts 에 반영
 *
 * 하시는 일: public/images/exam/ 아래 아무 폴더에나
 *            파일 이름을 문항 ID 로 맞춰서 넣기만 하면 됩니다.
 *
 *   public/images/exam/listening/s4_l_27.png
 *   public/images/exam/reading/s12_r_2.jpg
 *   public/images/exam/photo/s26_l_25.webp     ← 폴더 이름은 자유
 *
 * 이 스크립트가 폴더 전체를 훑어서
 *   · 파일이 있으면  imageUrl 을 그 경로로 설정하고 imagePrompt 는 제거
 *   · 보기 그림은    s3_r_11_1 ~ _4 처럼 뒤에 _1~_4 를 붙이면 optionImages 로 연결
 *   · imageRole 은   'stimulus' 로 설정 (그림이 문제의 자료라는 뜻)
 *
 * 손으로 examData.ts 를 고치면 68줄에서 오타가 반드시 납니다. 이걸 쓰세요.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IMG_ROOT = path.join(ROOT, 'public/images/exam');
const DATA_TS = path.join(ROOT, 'src/data/examData.ts');
const WRITE = process.argv.includes('--write');
const EXT = /\.(png|jpg|jpeg|webp|svg)$/i;

/* 이미지 폴더 전체 훑기 */
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (EXT.test(e.name)) acc.push(p);
  }
  return acc;
}

if (!fs.existsSync(IMG_ROOT)) {
  console.error(`이미지 폴더가 없습니다: ${IMG_ROOT}`);
  process.exit(1);
}

// generated/ 는 정답에 맞춰 직접 그린 자료이므로 최우선.
// 같은 문항에 파일이 여럿이면 generated → 그 외 순으로 채택합니다.
const files = walk(IMG_ROOT).sort((a, b) => {
  const g = (p) => (p.includes(`${path.sep}generated${path.sep}`) ? 1 : 0);
  return g(a) - g(b); // generated 가 뒤 → Map.set 으로 덮어써서 최종 채택
});
const single = new Map();   // id -> url
const options = new Map();  // id -> { idx -> url }

for (const abs of files) {
  const url = '/' + path.relative(path.join(ROOT, 'public'), abs).split(path.sep).join('/');
  const base = path.basename(abs).replace(EXT, '');
  const opt = base.match(/^(s\d+_[rl]_\d+)_([1-4])$/);
  if (opt) {
    if (!options.has(opt[1])) options.set(opt[1], {});
    options.get(opt[1])[Number(opt[2])] = url;
  } else if (/^s\d+_[rl]_\d+$/.test(base)) {
    single.set(base, url);
  }
  // generated 의 보기 그림이 있으면 단일 그림은 무시
  if (opt && single.has(opt[1]) && url.includes('/generated/')) single.delete(opt[1]);
}

/* 데이터 로드 */
function load() {
  const js = fs.readFileSync(DATA_TS, 'utf8')
    .replace(/^import[\s\S]*?from\s+['"].*?['"];?\s*$/m, '')
    .replace(/export const STATIC_EXAM_DATA\s*:\s*Question\[\]\s*=/, 'const DATA =')
    .replace(/QuestionType\.READING/g, '"READING"')
    .replace(/QuestionType\.LISTENING/g, '"LISTENING"');
  const tmp = path.join(ROOT, '.__link.cjs');
  fs.writeFileSync(tmp, js + '\nmodule.exports = DATA;\n', 'utf8');
  const data = createRequire(pathToFileURL(tmp))(tmp);
  fs.unlinkSync(tmp);
  return data;
}

const data = load();
const byId = new Map(data.map((q) => [q.id, q]));

// generated/ 에 직접 그린 자료가 있는 문항은 그 자료가 정답 기준입니다.
// 저장소에 남아 있던 옛 파일이 이를 덮어쓰지 않도록 제외합니다.
const GEN = path.join(IMG_ROOT, 'generated');
const generatedIds = new Set(
  fs.existsSync(GEN)
    ? fs.readdirSync(GEN).map((f) => f.replace(EXT, '').replace(/_[1-4]$/, ''))
    : [],
);
for (const id of generatedIds) {
  const hasGenOption = fs.existsSync(path.join(GEN, `${id}_1.svg`));
  if (hasGenOption) single.delete(id);
  else options.delete(id);
}

const plan = [];
const orphans = [];

for (const [id, url] of single) {
  const q = byId.get(id);
  if (!q) { orphans.push(url); continue; }
  if (q.imageUrl === url) continue;
  plan.push({ id, kind: 'imageUrl', url, was: q.imageUrl ?? (q.imagePrompt ? '(AI 생성 중)' : '(없음)') });
}

for (const [id, map] of options) {
  const q = byId.get(id);
  if (!q) { orphans.push(`${id}_1~4`); continue; }
  const urls = [1, 2, 3, 4].map((i) => map[i]).filter(Boolean);
  if (urls.length !== 4) {
    console.warn(`  ! ${id}: 보기 그림이 ${urls.length}장뿐입니다 (4장 필요). 건너뜁니다.`);
    continue;
  }
  if (JSON.stringify(q.optionImages) === JSON.stringify(urls)) continue;
  plan.push({ id, kind: 'optionImages', url: urls, was: q.optionImages ? '(교체)' : '(없음)' });
}

/* 아직 파일이 없는 문항 */
const missing = data.filter(
  (q) => !q.imageUrl && !q.optionImages && q.imagePrompt && !single.has(q.id) && !options.has(q.id),
);

console.log(`\n이미지 파일 ${files.length}개 발견 · 연결 대상 ${plan.length}건\n`);
for (const p of plan) {
  console.log(`  ${p.id.padEnd(12)} ${p.was} → ${Array.isArray(p.url) ? `보기 4장` : p.url}`);
}
if (orphans.length) {
  console.log(`\n대응하는 문항이 없는 파일 ${orphans.length}개 (파일명 오타일 수 있습니다):`);
  orphans.slice(0, 20).forEach((o) => console.log(`  ${o}`));
}
console.log(`\n아직 파일이 없는 문항: ${missing.length}건`);
if (missing.length) console.log('  ' + missing.map((q) => q.id).join(', '));

/* 반영 */
if (!WRITE) {
  console.log(`\n미리보기입니다. --write 를 붙이면 examData.ts 에 반영됩니다.`);
  process.exit(0);
}

let src = fs.readFileSync(DATA_TS, 'utf8');
let ok = 0;
for (const p of plan) {
  const re = new RegExp(`(\\{[^\\n]*?id: "${p.id}"[\\s\\S]*?)(\\s*\\}(?=\\s*,?\\s*(?:\\n|\\])))`);
  if (!re.test(src)) { console.warn(`  ! ${p.id} 블록 미발견`); continue; }
  src = src.replace(re, (m, head, tail) => {
    const h = head
      .replace(/,\s*imageUrl: "[^"]*"/g, '')
      .replace(/,\s*optionImages: \[[^\]]*\]/g, '')
      .replace(/,\s*imagePrompt: "[^"]*"/g, '')
      .replace(/,\s*imageRole: "[^"]*"/g, '')
      .replace(/,\s*,/g, ',')
      .replace(/,\s*$/, '');
    const add = p.kind === 'imageUrl'
      ? `, imageUrl: ${JSON.stringify(p.url)}, imageRole: "stimulus"`
      : `, optionImages: [${p.url.map((u) => JSON.stringify(u)).join(', ')}]`;
    return h + add + tail;
  });
  ok++;
}

fs.copyFileSync(DATA_TS, DATA_TS + '.bak-link');
fs.writeFileSync(DATA_TS, src, 'utf8');
console.log(`\n${ok}건 연결 완료 (백업: examData.ts.bak-link)`);
console.log(`확인: npx tsc --noEmit && node scripts/audit-exam-db.mjs`);
