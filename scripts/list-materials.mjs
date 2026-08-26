#!/usr/bin/env node
/**
 * EPS-TOPIK Mate — 필요한 자료(그림·표·영수증 등) 목록 생성
 *
 *   node scripts/list-materials.mjs
 *
 * 출력: audit/materials.html   (작업용 체크리스트)
 *       audit/materials.csv    (엑셀로 열어서 관리)
 *
 * 제작 방법을 3가지로 나눕니다.
 *   RENDER — 글자가 들어가는 자료(달력·영수증·표지판·그래프·메뉴판).
 *            scripts/render-materials.mjs 로 코드가 그립니다. 구하실 필요 없습니다.
 *   PHOTO  — 실제 사물·장소·행동 사진. 직접 촬영하거나 무료 사진 사이트에서 받으세요.
 *   AI     — 사진으로 구하기 애매한 장면(특정 동작·상황). 이미지 생성으로 만든 뒤
 *            파일로 저장해서 고정합니다. 실행 중 생성은 하지 않습니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'audit');

function load() {
  let js = fs
    .readFileSync(path.join(ROOT, 'src/data/examData.ts'), 'utf8')
    .replace(/^import[\s\S]*?from\s+['"].*?['"];?\s*$/m, '')
    .replace(/export const STATIC_EXAM_DATA\s*:\s*Question\[\]\s*=/, 'const DATA =')
    .replace(/QuestionType\.READING/g, '"READING"')
    .replace(/QuestionType\.LISTENING/g, '"LISTENING"');
  js += '\nmodule.exports = DATA;\n';
  const tmp = path.join(ROOT, '.__mat.cjs');
  fs.writeFileSync(tmp, js, 'utf8');
  const data = createRequire(pathToFileURL(tmp))(tmp);
  fs.unlinkSync(tmp);
  return data;
}

const GENERATED = path.join(ROOT, 'public/images/exam/generated');
const already = fs.existsSync(GENERATED)
  ? new Set(fs.readdirSync(GENERATED).map((f) => f.replace(/\.svg$/, '')))
  : new Set();

function classify(q) {
  const t = [q.questionText, (q.options || []).join(' '), q.explanation, q.imagePrompt].join(' ');
  if (/영수증|거스름돈/.test(t)) return ['RENDER', '영수증'];
  if (/월\s*\d+\s*일|며칠|무슨 요일|달력/.test(t)) return ['RENDER', '달력'];
  if (/몇 시|시각|시계/.test(t)) return ['RENDER', '시계'];
  if (/표지|금지|경고|주의하|사인/.test(t)) return ['RENDER', '표지판'];
  if (/그래프|가장 많|가장 적|비율|통계|조사/.test(t)) return ['RENDER', '그래프'];
  if (/안내문|모집|공고|광고|알려/.test(t)) return ['RENDER', '안내문'];
  if (/얼마|가격|값|메뉴|차림표|요금/.test(t)) return ['RENDER', '메뉴판·가격표'];
  if (/시간표|목록|명함|표에서/.test(t)) return ['RENDER', '표'];
  if (/무엇을 하고|무엇을 합니|어떤 상황|도와|하려고/.test(t)) return ['AI', '행동·상황 장면'];
  return ['PHOTO', '사물·장소 사진'];
}

/** 정답을 근거로 "무슨 그림이 필요한지" 한국어 한 줄로 */
function describe(q) {
  const ans = q.options?.[q.correctAnswer] ?? '';
  const qt = (q.questionText || '').replace(/\s*고르십시오\.?$/, '');
  return `${qt} → 정답이 "${ans}" 가 되도록 하는 그림`;
}

const data = load();
const rows = [];
for (const q of data) {
  const needsMaterial =
    (!q.imageUrl && !q.optionImages && !!q.imagePrompt) ||
    (q.type === 'READING' &&
      !q.imageUrl &&
      !q.imagePrompt &&
      !q.optionImages &&
      !/어휘|용어/.test(q.category || '') &&
      !(q.context && q.context.trim()) &&
      /다음|이 |여기|위 |아래|표|그래프|영수증|안내문|표지|광고|메모|명함|카드|그림/.test(q.questionText || ''));
  if (!needsMaterial) continue;

  const [method, kind] = classify(q);
  rows.push({
    id: q.id,
    set: q.id.split('_')[0].replace('s', ''),
    type: q.type === 'READING' ? '읽기' : '듣기',
    category: q.category,
    method: already.has(q.id) ? 'RENDER(완료)' : method,
    kind,
    need: describe(q),
    answer: q.options?.[q.correctAnswer] ?? '',
    prompt: q.imagePrompt || '',
    file: `/images/exam/${method === 'RENDER' ? 'generated' : q.type === 'READING' ? 'reading' : 'listening'}/${q.id}.${method === 'RENDER' ? 'svg' : 'png'}`,
  });
}

rows.sort((a, b) => a.method.localeCompare(b.method) || Number(a.set) - Number(b.set));

fs.mkdirSync(OUT, { recursive: true });

// CSV
const csv = [
  '문항ID,세트,영역,유형,제작방법,자료종류,필요한 자료,정답,저장할 파일 경로,AI 생성용 영문 프롬프트',
  ...rows.map((r) =>
    [r.id, r.set, r.type, r.category, r.method, r.kind, r.need, r.answer, r.file, r.prompt]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  ),
].join('\n');
fs.writeFileSync(path.join(OUT, 'materials.csv'), '\uFEFF' + csv, 'utf8');

// HTML
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const color = { RENDER: '#0d9488', 'RENDER(완료)': '#94a3b8', PHOTO: '#b45309', AI: '#7c3aed' };
const counts = rows.reduce((a, r) => ((a[r.method] = (a[r.method] || 0) + 1), a), {});

const html = `<!doctype html><html lang="ko"><meta charset="utf-8">
<title>필요한 자료 체크리스트</title>
<style>
 body{font-family:system-ui,'Apple SD Gothic Neo',sans-serif;margin:0;background:#f6f7f9;color:#111;font-size:14px}
 .top{position:sticky;top:0;background:#111;color:#fff;padding:14px 20px;z-index:9}
 .top button{margin-right:6px;padding:6px 12px;border:0;border-radius:99px;cursor:pointer;font-weight:700}
 table{border-collapse:collapse;width:calc(100% - 40px);margin:16px 20px;background:#fff;box-shadow:0 1px 3px #0001}
 th,td{border-bottom:1px solid #eee;padding:9px 11px;text-align:left;vertical-align:top}
 th{background:#f1f3f5;font-size:12px;text-transform:uppercase;letter-spacing:.05em}
 .m{color:#fff;padding:2px 9px;border-radius:99px;font-size:11px;font-weight:800;white-space:nowrap}
 code{background:#f1f3f5;padding:1px 5px;border-radius:4px;font-size:12px}
 .p{color:#666;font-size:12px}
</style>
<div class="top">
  <b>필요한 자료 체크리스트</b> — 총 ${rows.length}건
  &nbsp;<button onclick="f('all')">전체</button>
  ${Object.entries(counts)
    .map(([k, v]) => `<button style="background:${color[k]};color:#fff" onclick="f('${k}')">${k} ${v}</button>`)
    .join('')}
</div>
<table>
<tr><th>ID</th><th>영역</th><th>방법</th><th>종류</th><th>필요한 자료</th><th>저장 경로</th></tr>
${rows
  .map(
    (r) => `<tr data-m="${r.method}">
<td><b>${r.id}</b><br><span class="p">${esc(r.category)}</span></td>
<td>${r.type}</td>
<td><span class="m" style="background:${color[r.method]}">${r.method}</span></td>
<td>${esc(r.kind)}</td>
<td>${esc(r.need)}${r.prompt ? `<br><span class="p">AI 프롬프트: ${esc(r.prompt)}</span>` : ''}</td>
<td><code>${esc(r.file)}</code></td>
</tr>`,
  )
  .join('\n')}
</table>
<script>function f(m){document.querySelectorAll('tr[data-m]').forEach(t=>{t.style.display=(m==='all'||t.dataset.m===m)?'':'none'})}</script>
</html>`;
fs.writeFileSync(path.join(OUT, 'materials.html'), html, 'utf8');

console.log(`\n총 ${rows.length}건`);
Object.entries(counts).forEach(([k, v]) => console.log(`  ${k.padEnd(14)} ${v}건`));
console.log(`\naudit/materials.html · audit/materials.csv`);
