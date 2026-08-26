#!/usr/bin/env node
/**
 * EPS-TOPIK Mate — 듣기 대본 정답 유출(H1) 교정
 *
 *   node scripts/fix-listening-scripts.mjs          # 미리보기
 *   node scripts/fix-listening-scripts.mjs --write  # 실제 반영
 *
 * ── 78건을 네 갈래로 나눠 처리합니다 ──────────────────────────────
 *
 * [A] 17건 · 21~22번 "들은 것 고르기"
 *     정답을 그대로 읽어주는 게 이 유형의 원래 형식입니다(받아쓰기 변별 문제).
 *     손대지 않고 intendedLeak 플래그만 달아 감사에서 제외합니다.
 *
 * [B] 44건 · 25~29번 그림 문제
 *     원본 시험은 "그림을 보여주고 → 질문만 읽어주고 → 보기 4개는 인쇄"입니다.
 *     그런데 DB의 대본에 정답이 들어가 있습니다("선풍기입니다").
 *     → 대본을 질문만으로 바꾸고 그림을 stimulus 로 승격합니다.
 *       창작이 아니라 원래 형식으로 되돌리는 작업입니다.
 *
 * [C]  4건 · 36~40번 이야기/대화 문제
 *     대본이 "콧물이 났다입니다" 처럼 보기 라벨에 '입니다'만 붙인 상태입니다.
 *     → 실제 대화로 새로 씁니다. (아래 REWRITE 표)
 *
 * [D] 12건 · 25~29번인데 그림 자체가 없음
 *     B와 같은 형식으로 바꾸되 그림이 없어서 풀 수 없습니다.
 *     → 대본은 질문만으로 바꾸고, 필요한 그림의 imagePrompt 를 지정합니다.
 *       실제 이미지 파일로 교체할 목록은 audit/materials.csv 를 보세요.
 * ─────────────────────────────────────────────────────────────
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_TS = path.join(ROOT, 'src/data/examData.ts');
const WRITE = process.argv.includes('--write');

// ================================================================
// [A] 유형상 정답을 읽어주는 게 정상인 문항
// ================================================================
const INTENDED_LEAK = [
  's1_l_21', 's1_l_22', 's7_l_22', 's10_l_22', 's11_l_21', 's12_l_21', 's12_l_22',
  's13_l_21', 's15_l_21', 's16_l_21', 's18_l_21', 's20_l_21', 's24_l_21',
  's27_l_21', 's29_l_21', 's29_l_22', 's30_l_21',
];

// ================================================================
// [B] 그림 문제 — 대본을 질문만으로 되돌림
//     (questionText 를 그대로 대본으로 씁니다. 별도 표가 필요 없습니다)
// ================================================================
const PICTURE_QUESTIONS = [
  's1_l_25', 's1_l_26', 's1_l_29', 's3_l_27', 's3_l_28', 's4_l_27', 's4_l_28',
  's4_l_29', 's6_l_26', 's7_l_25', 's7_l_26', 's8_l_29', 's10_l_28', 's11_l_29',
  's16_l_25', 's16_l_26', 's16_l_27', 's17_l_25', 's17_l_28', 's17_l_29',
  's18_l_26', 's18_l_28', 's18_l_29', 's19_l_29', 's20_l_25', 's21_l_24',
  's21_l_26', 's23_l_25', 's23_l_26', 's23_l_27', 's23_l_28', 's23_l_29',
  's24_l_24', 's24_l_26', 's24_l_29', 's25_l_27', 's25_l_29', 's26_l_25',
  's26_l_28', 's27_l_28', 's27_l_29', 's30_l_27',
];

// ================================================================
// [C] 실제 대화로 새로 쓴 대본
// ================================================================
const REWRITE = {
  s14_l_39: {
    context:
      '여: 리아 씨한테서 청첩장 받으셨어요? 결혼식이 언제예요?\n남: 다음 달 오월이에요. 셋째 주 토요일 열두 시요.\n여: 그럼 저도 그날 시간을 비워 놔야겠네요.',
    explanation:
      "남자가 '오월 셋째 주 토요일'이라고 말했으므로 정답은 '5월 셋째 주'입니다.",
  },
  s17_l_39: {
    context:
      '여: 아저씨, 수박 한 통에 얼마예요?\n남: 삼만 원입니다.\n여: 네? 지난주에는 이만 원이었는데 왜 이렇게 올랐어요?\n남: 올여름에 비가 너무 많이 와서 수박이 잘 자라지 못했어요. 그래서 값이 많이 올랐습니다.',
    explanation:
      "남자가 비가 많이 와서 수박이 잘 자라지 못했다고 설명했으므로 정답은 '비가 많이 와서'입니다.",
  },
  s17_l_40: {
    context:
      '여: 이 약은 하루에 한 번만 드시면 됩니다.\n남: 언제 먹는 게 좋을까요?\n여: 약을 드시면 졸릴 수 있으니까 낮에는 드시지 마세요. 주무시기 전에 드시는 게 좋습니다.',
    explanation:
      "여자가 졸릴 수 있으니 잠자기 전에 먹으라고 했으므로 정답은 '밤 취침 전'입니다.",
  },
  s18_l_39: {
    context:
      '여: 어디가 어떻게 아프세요?\n남: 그저께부터 열이 많이 나고 기침도 자주 합니다. 몸살이 났는지 온몸이 다 아픕니다.\n여: 콧물은 안 나세요?\n남: 네, 콧물은 안 납니다.',
    explanation:
      "열, 기침, 온몸이 아픈 증상은 있었지만 콧물은 나지 않았다고 했으므로 정답은 '콧물이 났다'입니다.",
  },
  s18_l_40: {
    context:
      '남: 여보세요, 거기 한국무역이지요? 김영수 씨 좀 부탁합니다.\n여: 김영수 씨는 지금 다른 전화를 받고 있습니다. 잠시 후에 다시 걸어 주시겠어요?\n남: 네, 알겠습니다. 이따가 다시 걸겠습니다.',
    explanation:
      "김영수 씨가 다른 전화를 받고 있다고 했으므로 정답은 '통화 중이라서'입니다.",
  },
  // 상황 파악형: 발화를 듣고 상황을 추론. 그림은 정답이라 계속 숨김.
  s24_l_23: {
    questionText: '이 대화는 어떤 상황입니까?',
    context:
      '여: 저기요, 이 가방이 너무 무거운데 좀 도와주시겠어요?\n남: 네, 제가 들어 드릴게요. 어디까지 가세요?',
    imageRole: 'hint',
    explanation:
      "무거운 가방을 대신 들어 주는 상황이므로 정답은 '짐 들어주기'입니다.",
  },
  // 대화 자체가 정보를 주는 내용 일치형 — 유형상 정상
  s15_l_28: { intendedLeak: true },
};

// ================================================================
// [D] 그림이 없어 풀 수 없는 25~29번 — 필요한 그림을 지정
// ================================================================
const NEEDS_PICTURE = {
  s1_l_27: 'A man in work clothes walking along a sidewalk on his way to work, no vehicle in sight.',
  s3_l_29: 'A calendar page for June with the 12th circled in red, a small birthday cake drawn beside it.',
  s4_l_25: 'A white ceramic bowl filled with coarse sea salt on a wooden table.',
  s4_l_26: 'A poultry farm shed with many white chickens on the ground.',
  s5_l_25: 'A bowl of dark brown Korean herbal medicine next to a few white pills.',
  s5_l_29: 'The inside of a cinema, rows of red seats facing a large bright screen.',
  s6_l_27: 'A blazing summer sun over a city street, a person wiping sweat from their forehead.',
  s6_l_28: 'Fresh yellow lemons cut in half on a white plate.',
  s7_l_27: 'A man in work clothes riding a bicycle to work along a city street.',
  s8_l_25: 'A small paper cup of dark herbal medicine beside a strip of white tablets.',
  s10_l_27: 'A red fire extinguisher mounted on a wall in an office corridor.',
  s15_l_27: 'A simple cafe menu board. Only these lines, large and legible: 커피 400원 / 녹차 500원 / 주스 700원.',
};

// ================================================================
const q2 = (s) => JSON.stringify(String(s));
function serialize(q) {
  const p = [];
  p.push(`id: ${q2(q.id)}`);
  p.push(`type: QuestionType.${q.type}`);
  p.push(`category: ${q2(q.category)}`);
  p.push(`questionText: ${q2(q.questionText)}`);
  if (q.context) p.push(`context: ${q2(q.context)}`);
  p.push(`options: [${q.options.map(q2).join(', ')}]`);
  if (q.optionImages) p.push(`optionImages: [${q.optionImages.map(q2).join(', ')}]`);
  p.push(`correctAnswer: ${q.correctAnswer}`);
  p.push(`explanation: ${q2(q.explanation ?? '')}`);
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
  let js = fs
    .readFileSync(DATA_TS, 'utf8')
    .replace(/^import[\s\S]*?from\s+['"].*?['"];?\s*$/m, '')
    .replace(/export const STATIC_EXAM_DATA\s*:\s*Question\[\]\s*=/, 'const DATA =')
    .replace(/QuestionType\.READING/g, '"READING"')
    .replace(/QuestionType\.LISTENING/g, '"LISTENING"');
  js += '\nmodule.exports = DATA;\n';
  const tmp = path.join(ROOT, '.__fixls.cjs');
  fs.writeFileSync(tmp, js, 'utf8');
  const require = createRequire(pathToFileURL(tmp));
  const data = require(tmp);
  fs.unlinkSync(tmp);
  return data;
}

const src0 = fs.readFileSync(DATA_TS, 'utf8');
const data = load();
const byId = new Map(data.map((q) => [q.id, q]));
const changed = [];
const tally = {};
const bump = (k) => (tally[k] = (tally[k] || 0) + 1);

// [A]
for (const id of INTENDED_LEAK) {
  const q = byId.get(id);
  if (!q || q.intendedLeak) continue;
  q.intendedLeak = true;
  changed.push(id);
  bump('[A] 유형상 정상 — 표시만');
}

// [B]
for (const id of PICTURE_QUESTIONS) {
  const q = byId.get(id);
  if (!q) continue;
  q.context = q.questionText;
  q.imageRole = 'stimulus';
  changed.push(id);
  bump('[B] 대본을 질문만으로 복원 + 그림 표시');
}

// [C]
for (const [id, patch] of Object.entries(REWRITE)) {
  const q = byId.get(id);
  if (!q) continue;
  Object.assign(q, patch);
  changed.push(id);
  bump('[C] 대본 재작성');
}

// [D]
for (const [id, prompt] of Object.entries(NEEDS_PICTURE)) {
  const q = byId.get(id);
  if (!q) continue;
  q.context = q.questionText;
  q.imagePrompt = prompt;
  q.imageRole = 'stimulus';
  changed.push(id);
  bump('[D] 대본 복원 + 필요한 그림 지정');
}

// 반영
let out = src0;
let ok = 0;
for (const id of [...new Set(changed)]) {
  const re = new RegExp(`\\{[^\\n]*?id:\\s*"${id}"[\\s\\S]*?\\}(?=\\s*,?\\s*(?:\\n|\\]))`);
  if (!re.test(out)) {
    console.warn(`  ! ${id} 블록 미발견`);
    continue;
  }
  out = out.replace(re, serialize(byId.get(id)));
  ok++;
}

console.log(`\n대상 ${new Set(changed).size}문항 / 치환 ${ok}건\n`);
Object.entries(tally).forEach(([k, v]) => console.log(`  ${String(v).padStart(3)}건  ${k}`));

if (WRITE) {
  fs.copyFileSync(DATA_TS, DATA_TS + '.bak2');
  fs.writeFileSync(DATA_TS, out, 'utf8');
  console.log(`\n적용 완료 (백업: examData.ts.bak2)`);
} else {
  console.log(`\n미리보기입니다. --write 를 붙이면 반영됩니다.`);
}
