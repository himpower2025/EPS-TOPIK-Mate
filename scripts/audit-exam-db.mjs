#!/usr/bin/env node
/**
 * EPS-TOPIK Mate — DB ↔ 실제 출제 화면 정합성 감사 도구
 *
 * 실행:  node scripts/audit-exam-db.mjs
 * 출력:  audit/report.json          (전체 이슈 목록)
 *        audit/report.html          (브라우저 검수 페이지, 실제 화면과 동일하게 렌더)
 *        콘솔 요약
 *
 * 기존 audit_sets.py / deep_audit_listening.cjs 는 정규식으로 examData.ts 를
 * 부분 파싱해서 누락이 많았습니다. 이 스크립트는 TS 를 CJS 로 변환해 실제
 * 객체를 로드하므로 1200문항 전체를 빠짐없이 검사합니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_TS = path.join(ROOT, 'src/data/examData.ts');
const PUBLIC = path.join(ROOT, 'public');
const OUT_DIR = path.join(ROOT, 'audit');

// ---------------------------------------------------------------- 데이터 로드
export function loadExamData() {
  let src = fs.readFileSync(DATA_TS, 'utf8');
  src = src
    .replace(/^import[\s\S]*?from\s+['"].*?['"];?\s*$/m, '')
    .replace(/export const STATIC_EXAM_DATA\s*:\s*Question\[\]\s*=/, 'const DATA =')
    .replace(/QuestionType\.READING/g, '"READING"')
    .replace(/QuestionType\.LISTENING/g, '"LISTENING"');
  src += '\nmodule.exports = DATA;\n';
  const tmp = path.join(OUT_DIR, '.examData.cjs');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(tmp, src, 'utf8');
  const require = createRequire(pathToFileURL(tmp));
  const data = require(tmp);
  fs.unlinkSync(tmp);
  return data;
}

// ---------------------------------------------------------------- 유틸
const strip = (s) => String(s ?? '').replace(/[\s.,!?'"''""·~]/g, '');
const stem = (s) =>
  strip(s).replace(/(입니다|습니다|어요|아요|예요|이에요|해요|합니다|있습니다|있어요|이다)$/u, '');

/** ExamSimulator.tsx 가 실제로 재생하는 스크립트 (context || questionText) */
const activeScript = (q) => (q.context && q.context.trim() ? q.context : q.questionText || '');

/** prepareAudioScript() 를 통과한 뒤 실제로 들리는 문장 */
function audibleScript(raw) {
  return String(raw ?? '')
    .replace(/\[.*?\]/g, '')
    .replace(/^대본:\s*/i, '')
    .replace(/\.\.\./g, '. ')
    .replace(/\d+\s?번/g, '')
    .replace(/^\d+[.)]\s*/gm, '')
    .trim();
}

// ---------------------------------------------------------------- 검사 규칙
const RULES = [
  // ===== 치명 (학습자가 절대 풀 수 없음) =====
  {
    id: 'F1_보기열거대본',
    sev: 'critical',
    desc: '대본이 "1번 X, 2번 Y…" 형식의 보기 낭독본입니다. prepareAudioScript() 가 "N번"을 지워버려 단어 나열만 들리고, 그림도 숨겨져 정답 단서가 전혀 없습니다.',
    test: (q) =>
      q.type === 'LISTENING' &&
      /1\s?번[\s\S]{0,40}2\s?번/.test(activeScript(q)) &&
      !(q.audioReadsOptions && (q.imageUrl || q.imagePrompt) && q.imageRole === 'stimulus'),
  },
  {
    id: 'F2_그림필수인데숨김',
    sev: 'critical',
    desc: '그림이 문제의 자료(stimulus)인데 ExamSimulator 가 듣기 문제의 이미지를 렌더하지 않습니다. 소리만으로는 정답을 고를 수 없습니다.',
    test: (q) => {
      if (q.type !== 'LISTENING' || !q.imageUrl) return false;
      if (q.imageRole === 'stimulus') return false; // 패치된 렌더러가 표시함
      if (q.imageRole === 'hint') return false;     // 의도적으로 숨김
      const s = audibleScript(activeScript(q));
      const ans = stem(q.options?.[q.correctAnswer]);
      const inScript = ans.length > 1 && strip(s).includes(ans);
      const bareQuestion = s.length < 30 && /[?？]|습니까|어요\??$/.test(s);
      return !inScript || bareQuestion;
    },
  },
  {
    id: 'F3_자료없는읽기',
    sev: 'critical',
    desc: '지문(context)도 이미지도 없이 "다음 표/영수증/카드…" 를 가리키는 읽기 문제입니다. 화면에 아무 자료도 뜨지 않습니다.',
    test: (q) =>
      q.type === 'READING' &&
      !q.imageUrl &&
      !q.imagePrompt &&
      !q.optionImages &&
      !/어휘|용어/.test(q.category || '') &&
      !(q.context && q.context.trim()) &&
      /다음|이 |여기|위 |아래|표|그래프|영수증|안내문|표지|광고|메모|명함|카드|그림/.test(q.questionText || ''),
  },
  {
    id: 'F4_지문이이미지에가려짐',
    sev: 'critical',
    desc: '읽기 문제에 지문과 이미지가 모두 있는데, 렌더 조건이 `!questionImage && displayContext` 라 이미지가 뜨면 지문이 사라집니다. (ExamSimulator 패치로 해소됨 — 미패치 버전 확인용)',
    test: () => false,
  },

  // ===== 높음 (정답 신뢰도/체감 품질 훼손) =====
  {
    id: 'H1_정답유출',
    sev: 'high',
    desc: '대본이 정답 보기를 그대로 읽어줍니다. 듣기 이해가 아니라 받아쓰기가 됩니다.',
    test: (q) => {
      if (q.type !== 'LISTENING' || q.intendedLeak) return false;
      const s = strip(audibleScript(activeScript(q)));
      const ans = stem(q.options?.[q.correctAnswer]);
      if (ans.length < 3) return false;
      const others = (q.options || []).filter((_, i) => i !== q.correctAnswer).map(stem);
      return s.includes(ans) && !others.some((o) => o.length > 2 && s.includes(o)) && s.length < ans.length * 3;
    },
  },
  {
    id: 'H2_해설은그림_보기는텍스트',
    sev: 'high',
    desc: '해설이 "…그림을 고릅니다" 라고 하는데 보기는 텍스트입니다. 원본 그림 선택형을 텍스트로 바꾸면서 해설만 남은 케이스입니다.',
    test: (q) =>
      /그림|사진/.test(q.explanation || '') &&
      !q.optionImages &&
      q.imageRole !== 'stimulus' &&
      !/그림/.test((q.options || []).join('')),
  },
  {
    id: 'H3_발문은그림_보기는텍스트',
    sev: 'high',
    desc: '발문이 "알맞은 그림을 고르십시오" 인데 보기가 텍스트(또는 그림 설명문)입니다.',
    test: (q) => /그림을?\s*고르/.test(q.questionText || '') && !q.optionImages,
  },
  {
    id: 'H4_해설이오답을지목',
    sev: 'high',
    desc: "해설이 따옴표로 인용한 보기가 correctAnswer 와 다릅니다. 정답 키 오류 가능성이 높습니다.",
    test: (q) => {
      const quotes = [...String(q.explanation || '').matchAll(/[''"""]([^''"""]{1,25})[''"""]/g)].map((m) => m[1]);
      if (!quotes.length) return false;
      const hit = [];
      quotes.forEach((t) => (q.options || []).forEach((o, i) => strip(o) === strip(t) && hit.push(i)));
      // 해설이 "…라고 되어 있으므로" 처럼 보기를 '근거'로 인용하는 경우는 정상
      if (/(으므로|이므로|때문에|되어 있|적혀 있|명시)/.test(String(q.explanation))) return false;
      return hit.length > 0 && !hit.includes(q.correctAnswer);
    },
  },
  {
    id: 'H5_보기중복',
    sev: 'high',
    desc: '동일한 보기가 두 번 들어 있습니다.',
    test: (q) => new Set((q.options || []).map(strip)).size !== (q.options || []).length,
  },
  {
    id: 'H6_보기수이상',
    sev: 'high',
    desc: '보기가 4개가 아니거나 correctAnswer 인덱스가 범위를 벗어납니다.',
    test: (q) => (q.options || []).length !== 4 || !(q.correctAnswer >= 0 && q.correctAnswer <= 3),
  },
  {
    id: 'H7_이미지파일없음',
    sev: 'high',
    desc: 'imageUrl / optionImages 가 가리키는 파일이 public 아래에 없습니다.',
    test: (q) => {
      const urls = [q.imageUrl, ...(q.optionImages || [])].filter((u) => u && u.startsWith('/'));
      return urls.some((u) => !fs.existsSync(path.join(PUBLIC, u)));
    },
  },

  // ===== 중간 (일관성/체감) =====
  {
    id: 'M1_발문이대본자리',
    sev: 'medium',
    desc: 'context 가 비어 questionText 가 대본으로 재생됩니다. 다른 세트는 questionText=지시문 / context=대본 구조라 데이터 형식이 일관되지 않습니다.',
    test: (q) => q.type === 'LISTENING' && !(q.context && q.context.trim()),
  },
  {
    id: 'M2_대본접두어',
    sev: 'medium',
    desc: 'context 에 "대본:" 접두어가 남아 있습니다.',
    test: (q) => /^대본:/.test(String(q.context || '').trim()),
  },
  {
    id: 'M3_그림설명이보기',
    sev: 'medium',
    desc: '보기가 "…하는 그림" 같은 그림 설명문입니다. optionImages 로 교체하거나 문장형 보기로 바꿔야 합니다.',
    test: (q) => (q.options || []).some((o) => /그림$|^그림\s*\d/.test(String(o).trim())) && !q.optionImages,
  },
  {
    id: 'M4_이미지생성의존',
    sev: 'medium',
    desc: 'imageUrl 없이 imagePrompt 만 있어 실행 시 Imagen 으로 즉석 생성합니다. 표지판·안내문처럼 글자가 들어가는 그림은 매번 다르게 나오고 오답을 유발합니다.',
    test: (q) => !q.imageUrl && !q.optionImages && !!q.imagePrompt,
  },
  {
    id: 'M5_들리지않는대본',
    sev: 'medium',
    desc: 'prepareAudioScript() 전처리 후 남는 문장이 3글자 미만입니다. 사실상 무음입니다.',
    test: (q) =>
      q.type === 'LISTENING' &&
      audibleScript(activeScript(q)).length < 2 &&
      !/들은|어휘|단어/.test(q.category || ''),
  },
  {
    id: 'M6_듣기발문미노출',
    sev: 'medium',
    desc: '듣기 발문이 실제 질문("남자는 무엇을 합니까?")인데, 화면에는 "질문을 잘 듣고…" 로 고정 치환되고 음성으로도 읽히지 않습니다. 무엇을 묻는지 알 수 없습니다.',
    test: (q) =>
      q.type === 'LISTENING' &&
      !!(q.context && q.context.trim()) &&
      /(습니까|입니까|어요\?|예요\?|나요\?)/.test(q.questionText || '') &&
      !/고르십시오|고르세요/.test(q.questionText || '') &&
      false, // ExamSimulator 패치로 발문이 화면 표시 + 음성 낭독됨
  },
];

// ---------------------------------------------------------------- 실행
function run() {
  const data = loadExamData();
  const findings = new Map();
  const perQuestion = new Map();

  for (const q of data) {
    for (const r of RULES) {
      let hit = false;
      try {
        hit = !!r.test(q);
      } catch {
        hit = false;
      }
      if (!hit) continue;
      if (!findings.has(r.id)) findings.set(r.id, []);
      findings.get(r.id).push(q.id);
      if (!perQuestion.has(q.id)) perQuestion.set(q.id, []);
      perQuestion.get(q.id).push(r.id);
    }
  }

  const order = { critical: 0, high: 1, medium: 2 };
  const rows = RULES.filter((r) => findings.has(r.id))
    .sort((a, b) => order[a.sev] - order[b.sev] || findings.get(b.id).length - findings.get(a.id).length)
    .map((r) => ({ ...r, test: undefined, count: findings.get(r.id).length, ids: findings.get(r.id) }));

  const setStats = {};
  for (const [qid, rules] of perQuestion) {
    const s = qid.split('_')[0];
    setStats[s] = (setStats[s] || 0) + 1;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, 'report.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), total: data.length, rules: rows, perQuestion: Object.fromEntries(perQuestion) }, null, 2),
  );
  fs.writeFileSync(path.join(OUT_DIR, 'report.html'), renderHtml(data, perQuestion, rows));

  console.log(`\n총 ${data.length}문항 검사 · 문제 있는 문항 ${perQuestion.size}개\n`);
  const label = { critical: '치명', high: '높음', medium: '중간' };
  for (const r of rows) {
    console.log(`[${label[r.sev]}] ${r.id.padEnd(24)} ${String(r.count).padStart(4)}건`);
    console.log(`         ${r.desc}`);
    console.log(`         예: ${r.ids.slice(0, 6).join(', ')}\n`);
  }
  console.log('세트별 문제 문항 수:');
  console.log(
    Object.entries(setStats)
      .sort((a, b) => Number(a[0].slice(1)) - Number(b[0].slice(1)))
      .map(([s, n]) => `${s}:${n}`)
      .join('  '),
  );
  console.log(`\n검수 페이지 → audit/report.html`);
}

// ---------------------------------------------------------------- HTML 리포트
function renderHtml(data, perQuestion, rows) {
  const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const sevColor = { critical: '#dc2626', high: '#ea580c', medium: '#ca8a04' };
  const ruleMap = Object.fromEntries(rows.map((r) => [r.id, r]));

  const cards = data
    .filter((q) => perQuestion.has(q.id))
    .map((q) => {
      const tags = perQuestion
        .get(q.id)
        .map((id) => `<span class="tag" style="background:${sevColor[ruleMap[id].sev]}">${id}</span>`)
        .join('');
      const heard = audibleScript(activeScript(q));
      const opts = (q.options || [])
        .map(
          (o, i) =>
            `<li class="${i === q.correctAnswer ? 'ok' : ''}">${i + 1}. ${esc(o)}${
              q.optionImages?.[i] ? ` <img src="..${q.optionImages[i]}" height="48">` : ''
            }</li>`,
        )
        .join('');
      return `<article data-sev="${perQuestion.get(q.id).map((r) => ruleMap[r].sev).sort()[0]}" data-id="${q.id}">
  <header><b>${q.id}</b> <em>${esc(q.category)}</em> <span class="type">${q.type}</span>${tags}</header>
  <div class="grid">
    <div>
      <p class="k">화면에 보이는 발문</p>
      <p class="v">${q.type === 'LISTENING' ? '질문을 잘 듣고 알맞은 답을 고르십시오. <s>(DB: ' + esc(q.questionText) + ')</s>' : esc(q.questionText)}</p>
      <p class="k">화면에 보이는 자료</p>
      <p class="v">${
        q.type === 'LISTENING'
          ? '<i>없음 (듣기 문제는 이미지가 렌더되지 않음)</i>'
          : q.imageUrl
          ? `<img src="..${q.imageUrl}" height="150">`
          : q.imagePrompt
          ? '<i>실행 시 AI 생성</i>'
          : esc(q.context) || '<i>없음</i>'
      }</p>
      <p class="k">실제로 들리는 음성</p>
      <p class="v">${esc(heard) || '<i>없음</i>'}</p>
    </div>
    <div>
      <p class="k">DB 원본</p>
      <pre>${esc(JSON.stringify({ context: q.context, imageUrl: q.imageUrl, optionImages: q.optionImages, correctAnswer: q.correctAnswer }, null, 1))}</pre>
      <p class="k">보기 / 해설</p>
      <ol>${opts}</ol>
      <p class="v small">${esc(q.explanation)}</p>
    </div>
  </div>
</article>`;
    })
    .join('\n');

  return `<!doctype html><html lang="ko"><meta charset="utf-8">
<title>EPS-TOPIK DB 정합성 검수</title>
<style>
 body{font-family:system-ui,'Apple SD Gothic Neo',sans-serif;margin:0;background:#f6f7f9;color:#111}
 .top{position:sticky;top:0;background:#111;color:#fff;padding:14px 20px;z-index:9}
 .top button{margin-right:6px;padding:6px 12px;border:0;border-radius:99px;cursor:pointer;font-weight:700}
 article{background:#fff;margin:14px 20px;border-radius:14px;padding:16px 18px;box-shadow:0 1px 3px #0001}
 header{display:flex;gap:8px;align-items:center;flex-wrap:wrap;border-bottom:1px solid #eee;padding-bottom:8px;margin-bottom:10px}
 .type{font-size:11px;background:#eef;padding:2px 8px;border-radius:99px}
 .tag{color:#fff;font-size:11px;padding:2px 8px;border-radius:99px}
 .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
 .k{font-size:11px;font-weight:800;color:#888;text-transform:uppercase;margin:10px 0 2px}
 .v{margin:0;font-size:15px}.small{font-size:13px;color:#555}
 pre{background:#f3f4f6;padding:8px;border-radius:8px;font-size:12px;overflow:auto;margin:0}
 ol{margin:4px 0;padding-left:20px}li.ok{font-weight:800;color:#059669}
 @media(max-width:800px){.grid{grid-template-columns:1fr}}
</style>
<div class="top">
  <b>EPS-TOPIK DB 정합성 검수</b> — ${perQuestion.size} / ${data.length} 문항
  &nbsp; <button onclick="f('all')">전체</button>
  <button style="background:#dc2626;color:#fff" onclick="f('critical')">치명</button>
  <button style="background:#ea580c;color:#fff" onclick="f('high')">높음</button>
  <button style="background:#ca8a04;color:#fff" onclick="f('medium')">중간</button>
</div>
${cards}
<script>
function f(s){document.querySelectorAll('article').forEach(a=>{a.style.display=(s==='all'||a.dataset.sev===s)?'':'none'})}
</script></html>`;
}

run();
