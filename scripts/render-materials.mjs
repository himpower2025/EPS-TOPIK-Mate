#!/usr/bin/env node
/**
 * EPS-TOPIK Mate — 문자 포함 자료 자동 생성기 (SVG)
 *
 *   node scripts/render-materials.mjs             # 전체 생성
 *   node scripts/render-materials.mjs s8_r_11     # 하나만
 *   node scripts/render-materials.mjs --link      # 생성 후 examData.ts 에 연결까지
 *
 * 출력: public/images/exam/generated/<id>.svg
 *       보기가 그림인 문항은 <id>_1.svg ~ <id>_4.svg
 *
 * ── 왜 코드로 그리는가 ───────────────────────────────────────────
 * 이미지 생성 모델은 글자를 "그림처럼" 그립니다. 한글은 특히 심해서
 * "4월 17일"을 요청해도 매번 다른 글자가 나옵니다. 날짜·금액·요일을
 * 묻는 문제에서는 그림이 곧 정답이라, 글자가 틀리면 문제가 틀립니다.
 * 사진을 구해도 마찬가지입니다 — 실제 영수증에 우리 문제의 정답 금액이
 * 찍혀 있을 리 없으니까요.
 *
 * 그래서 이런 자료는 "찾는" 게 아니라 "정답에 맞춰 그리는" 것입니다.
 * 아래 SPECS 의 값은 전부 해당 문항의 correctAnswer / explanation 에서
 * 역산했습니다. 정답을 바꾸면 여기 값도 같이 바꾸세요.
 * ─────────────────────────────────────────────────────────────
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public/images/exam/generated');
const DATA_TS = path.join(ROOT, 'src/data/examData.ts');

const F = "'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif";
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">` +
  `<rect width="${w}" height="${h}" fill="#fff"/>${body}</svg>`;
const txt = (x, y, s, o = {}) =>
  `<text x="${x}" y="${y}" font-family="${F}" font-size="${o.size ?? 22}"` +
  (o.weight ? ` font-weight="${o.weight}"` : '') +
  (o.anchor ? ` text-anchor="${o.anchor}"` : '') +
  ` fill="${o.fill ?? '#111'}">${esc(s)}</text>`;
const won = (n) => n.toLocaleString('ko-KR') + '원';

/* ══════════════════════════════════════════════════ 달력 */
function calendar({ year = 2025, month, mark }) {
  const W = 620, H = 560;
  const startDow = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const names = ['일', '월', '화', '수', '목', '금', '토'];
  const x0 = 40, y0 = 110, cw = 77, ch = 66;
  let b = txt(W / 2, 62, `${month}월`, { size: 46, weight: 700, anchor: 'middle' });
  names.forEach((n, i) => {
    b += txt(x0 + cw * i + cw / 2, y0, n, {
      size: 24, weight: 700, anchor: 'middle',
      fill: i === 0 ? '#dc2626' : i === 6 ? '#2563eb' : '#444',
    });
  });
  b += `<line x1="${x0}" y1="${y0 + 16}" x2="${x0 + cw * 7}" y2="${y0 + 16}" stroke="#111" stroke-width="2"/>`;
  for (let d = 1; d <= days; d++) {
    const idx = startDow + d - 1, col = idx % 7, row = (idx / 7) | 0;
    const cx = x0 + cw * col + cw / 2, cy = y0 + 60 + row * ch;
    if (d === mark) b += `<circle cx="${cx}" cy="${cy - 9}" r="26" fill="none" stroke="#dc2626" stroke-width="4"/>`;
    b += txt(cx, cy, d, { size: 27, anchor: 'middle', fill: col === 0 ? '#dc2626' : col === 6 ? '#2563eb' : '#111' });
  }
  return svg(W, H, b);
}

/* ══════════════════════════════════════════════════ 시계 */
function clock({ hour, minute }) {
  const cx = 210, cy = 210, r = 175;
  let b = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="#111" stroke-width="6"/>`;
  for (let i = 1; i <= 12; i++) {
    const a = ((i * 30 - 90) * Math.PI) / 180;
    b += txt(cx + Math.cos(a) * (r - 34), cy + Math.sin(a) * (r - 34) + 12, i, { size: 34, weight: 700, anchor: 'middle' });
  }
  for (let i = 0; i < 60; i++) {
    const a = ((i * 6 - 90) * Math.PI) / 180, L = i % 5 === 0 ? 14 : 7;
    b += `<line x1="${cx + Math.cos(a) * (r - 6)}" y1="${cy + Math.sin(a) * (r - 6)}" x2="${cx + Math.cos(a) * (r - 6 - L)}" y2="${cy + Math.sin(a) * (r - 6 - L)}" stroke="#111" stroke-width="${i % 5 === 0 ? 3 : 1.5}"/>`;
  }
  const ha = (((hour % 12) * 30 + minute * 0.5 - 90) * Math.PI) / 180;
  const ma = ((minute * 6 - 90) * Math.PI) / 180;
  b += `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(ha) * 95}" y2="${cy + Math.sin(ha) * 95}" stroke="#111" stroke-width="11" stroke-linecap="round"/>`;
  b += `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(ma) * 140}" y2="${cy + Math.sin(ma) * 140}" stroke="#111" stroke-width="7" stroke-linecap="round"/>`;
  b += `<circle cx="${cx}" cy="${cy}" r="10" fill="#111"/>`;
  return svg(420, 420, b);
}

/* ══════════════════════════════════════════════════ 영수증 */
function receipt({ shop, date, items, paid }) {
  const W = 430, total = items.reduce((s, i) => s + i.price * (i.qty ?? 1), 0);
  const H = 250 + items.length * 38 + (paid !== undefined ? 84 : 0);
  let y = 66;
  let b = `<rect x="20" y="20" width="${W - 40}" height="${H - 40}" fill="#fff" stroke="#111" stroke-width="2"/>`;
  b += txt(W / 2, y, '영 수 증', { size: 30, weight: 700, anchor: 'middle' }); y += 36;
  b += txt(W / 2, y, shop, { size: 19, anchor: 'middle', fill: '#555' }); y += 26;
  b += txt(W / 2, y, date, { size: 17, anchor: 'middle', fill: '#777' }); y += 20;
  b += `<line x1="45" y1="${y}" x2="${W - 45}" y2="${y}" stroke="#111" stroke-dasharray="5 4"/>`; y += 36;
  for (const it of items) {
    b += txt(50, y, it.qty > 1 ? `${it.name} × ${it.qty}` : it.name, { size: 21 });
    b += txt(W - 50, y, won(it.price * (it.qty ?? 1)), { size: 21, anchor: 'end' });
    y += 38;
  }
  b += `<line x1="45" y1="${y - 16}" x2="${W - 45}" y2="${y - 16}" stroke="#111" stroke-dasharray="5 4"/>`; y += 18;
  b += txt(50, y, '합계', { size: 23, weight: 700 });
  b += txt(W - 50, y, won(total), { size: 23, weight: 700, anchor: 'end' });
  if (paid !== undefined) {
    y += 38; b += txt(50, y, '받은 돈', { size: 21 }); b += txt(W - 50, y, won(paid), { size: 21, anchor: 'end' });
    y += 36; b += txt(50, y, '거스름돈', { size: 21, weight: 700 });
    b += txt(W - 50, y, won(paid - total), { size: 21, weight: 700, anchor: 'end' });
  }
  return svg(W, H, b);
}

/* ══════════════════════════════════════════════════ 메뉴판 */
function menu({ title, rows }) {
  const W = 450, H = 130 + rows.length * 52;
  let b = `<rect x="16" y="16" width="${W - 32}" height="${H - 32}" rx="14" fill="#fff" stroke="#111" stroke-width="3"/>`;
  b += txt(W / 2, 72, title, { size: 32, weight: 700, anchor: 'middle' });
  b += `<line x1="45" y1="92" x2="${W - 45}" y2="92" stroke="#111" stroke-width="2"/>`;
  rows.forEach((r, i) => {
    b += txt(55, 140 + i * 52, r.name, { size: 26 });
    b += txt(W - 55, 140 + i * 52, r.price, { size: 26, weight: 700, anchor: 'end' });
  });
  return svg(W, H, b);
}

/* ══════════════════════════════════════════════════ 막대그래프 */
function barChart({ title, unit, bars }) {
  const W = 640, H = 470, max = Math.max(...bars.map((b) => b.value));
  const bw = Math.min(74, 380 / bars.length), gap = 40, x0 = 90, y0 = 380;
  let b = txt(W / 2, 52, title, { size: 28, weight: 700, anchor: 'middle' });
  if (unit) b += txt(W - 30, 84, `(단위: ${unit})`, { size: 18, anchor: 'end', fill: '#666' });
  b += `<line x1="${x0 - 20}" y1="${y0}" x2="${W - 30}" y2="${y0}" stroke="#111" stroke-width="2"/>`;
  b += `<line x1="${x0 - 20}" y1="${y0}" x2="${x0 - 20}" y2="100" stroke="#111" stroke-width="2"/>`;
  bars.forEach((bar, i) => {
    const h = ((y0 - 120) * bar.value) / max, x = x0 + i * (bw + gap);
    b += `<rect x="${x}" y="${y0 - h}" width="${bw}" height="${h}" fill="#4f6bed"/>`;
    b += txt(x + bw / 2, y0 - h - 12, bar.value, { size: 21, weight: 700, anchor: 'middle' });
    b += txt(x + bw / 2, y0 + 32, bar.label, { size: 21, anchor: 'middle' });
  });
  return svg(W, H, b);
}

/* ══════════════════════════════════════════════════ 원그래프 */
function pieChart({ title, slices }) {
  const W = 640, H = 470, cx = 215, cy = 270, r = 145;
  const COL = ['#4f6bed', '#f59e0b', '#10b981', '#ef4444', '#94a3b8'];
  const total = slices.reduce((s, x) => s + x.value, 0);
  let a0 = -Math.PI / 2;
  let b = txt(W / 2, 52, title, { size: 28, weight: 700, anchor: 'middle' });
  slices.forEach((s, i) => {
    const a1 = a0 + (s.value / total) * Math.PI * 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    b += `<path d="M ${cx} ${cy} L ${cx + Math.cos(a0) * r} ${cy + Math.sin(a0) * r} A ${r} ${r} 0 ${large} 1 ${cx + Math.cos(a1) * r} ${cy + Math.sin(a1) * r} Z" fill="${COL[i % 5]}" stroke="#fff" stroke-width="3"/>`;
    const am = (a0 + a1) / 2;
    b += txt(cx + Math.cos(am) * r * 0.62, cy + Math.sin(am) * r * 0.62 + 7, `${s.value}%`, { size: 19, weight: 700, anchor: 'middle', fill: '#fff' });
    b += `<rect x="440" y="${140 + i * 46}" width="26" height="26" fill="${COL[i % 5]}"/>`;
    b += txt(478, 161 + i * 46, s.label, { size: 22 });
    a0 = a1;
  });
  return svg(W, H, b);
}

/* ══════════════════════════════════════════════════ 안내문 / 광고 */
function notice({ title, lines, footer, accent = '#111' }) {
  const W = 580, H = 150 + lines.length * 46 + (footer ? 54 : 0);
  let b = `<rect x="18" y="18" width="${W - 36}" height="${H - 36}" rx="10" fill="#fff" stroke="${accent}" stroke-width="3"/>`;
  b += txt(W / 2, 78, title, { size: 32, weight: 700, anchor: 'middle', fill: accent });
  b += `<line x1="50" y1="100" x2="${W - 50}" y2="100" stroke="#111" stroke-width="2"/>`;
  lines.forEach((l, i) => (b += txt(60, 146 + i * 46, l, { size: 24 })));
  if (footer) b += txt(W - 60, H - 44, footer, { size: 21, anchor: 'end', fill: '#555' });
  return svg(W, H, b);
}

/* ══════════════════════════════════════════════════ 표지판 픽토그램 */
const ICONS = {
  식수대:
    `<path d="M150 250 q0 60 60 60 q60 0 60 -60 z" fill="none" stroke="#111" stroke-width="9"/>` +
    `<path d="M210 240 v-60 q0 -50 50 -50" fill="none" stroke="#111" stroke-width="9"/>` +
    `<circle cx="210" cy="152" r="9" fill="#111"/><circle cx="210" cy="188" r="7" fill="#111"/>`,
  쓰레기통:
    `<rect x="150" y="170" width="120" height="150" rx="10" fill="none" stroke="#111" stroke-width="9"/>` +
    `<rect x="136" y="143" width="148" height="22" rx="8" fill="#111"/><rect x="192" y="120" width="36" height="20" fill="#111"/>` +
    `<line x1="186" y1="200" x2="186" y2="292" stroke="#111" stroke-width="8"/>` +
    `<line x1="234" y1="200" x2="234" y2="292" stroke="#111" stroke-width="8"/>`,
  종이타월:
    `<rect x="140" y="115" width="140" height="88" rx="8" fill="none" stroke="#111" stroke-width="9"/>` +
    `<path d="M178 203 l0 74 l32 -22 l32 22 l0 -74" fill="none" stroke="#111" stroke-width="9"/>` +
    `<path d="M150 322 q60 -32 120 0" fill="none" stroke="#111" stroke-width="9"/>`,
  화장실:
    `<circle cx="158" cy="138" r="24" fill="#111"/><path d="M134 178 h48 l14 92 h-26 l0 60 h-24 l0 -60 h-26 z" fill="#111"/>` +
    `<circle cx="264" cy="138" r="24" fill="#111"/><path d="M264 176 l-40 94 h26 l0 60 h28 l0 -60 h26 z" fill="#111"/>`,
  안내소:
    `<circle cx="210" cy="215" r="105" fill="none" stroke="#111" stroke-width="12"/>` +
    `<text x="210" y="264" font-family="${F}" font-size="130" font-weight="900" text-anchor="middle" fill="#111">?</text>`,
  물품보관소:
    `<rect x="130" y="152" width="160" height="130" rx="10" fill="none" stroke="#111" stroke-width="9"/>` +
    `<path d="M175 152 v-26 q35 -30 70 0 v26" fill="none" stroke="#111" stroke-width="9"/>` +
    `<circle cx="210" cy="205" r="15" fill="#111"/><rect x="203" y="216" width="14" height="36" fill="#111"/>`,
  엘리베이터:
    `<rect x="140" y="105" width="140" height="180" fill="none" stroke="#111" stroke-width="9"/>` +
    `<line x1="210" y1="105" x2="210" y2="285" stroke="#111" stroke-width="7"/>` +
    `<path d="M300 148 l19 -32 l19 32 z" fill="#111"/><path d="M300 244 l19 32 l19 -32 z" fill="#111"/>` +
    `<text x="210" y="344" font-family="${F}" font-size="30" font-weight="700" text-anchor="middle" fill="#111">승강기</text>`,
  에스컬레이터:
    `<path d="M120 300 l90 -92 h80 v-40" fill="none" stroke="#111" stroke-width="9"/>` +
    `<path d="M120 300 h58 l92 -92 h48" fill="none" stroke="#111" stroke-width="9"/>` +
    `<circle cx="252" cy="148" r="18" fill="#111"/><path d="M234 176 h36 l8 44 h-52 z" fill="#111"/>`,
  수도꼭지:
    `<path d="M120 158 h72 v40 h58" fill="none" stroke="#111" stroke-width="12"/>` +
    `<rect x="238" y="194" width="26" height="34" fill="#111"/>` +
    `<path d="M251 250 q-17 27 0 42 q17 -15 0 -42 z" fill="#111"/>` +
    `<path d="M150 305 q52 -28 112 0" fill="none" stroke="#111" stroke-width="9"/>`,
  비상구:
    `<rect x="55" y="70" width="310" height="235" rx="12" fill="#0f9d58"/>` +
    `<rect x="238" y="105" width="92" height="165" fill="none" stroke="#fff" stroke-width="11"/>` +
    `<circle cx="140" cy="128" r="18" fill="#fff"/>` +
    `<path d="M122 156 l36 -8 l42 46 l-22 14 l-26 -28 l-6 34 l32 34 l-8 46 h-28 l6 -38 l-42 -42 z" fill="#fff"/>` +
    `<path d="M336 188 h26" stroke="#fff" stroke-width="11"/>`,
  진입금지: `<circle cx="210" cy="200" r="130" fill="#dc2626"/><rect x="108" y="182" width="204" height="36" fill="#fff"/>`,
  응급처치:
    `<rect x="78" y="70" width="264" height="264" rx="14" fill="#0f9d58"/>` +
    `<rect x="192" y="118" width="36" height="168" fill="#fff"/><rect x="126" y="184" width="168" height="36" fill="#fff"/>`,
  폭발물주의:
    `<polygon points="210,55 385,335 35,335" fill="#facc15" stroke="#111" stroke-width="9" stroke-linejoin="round"/>` +
    `<path d="M210 138 l25 56 l54 -23 l-35 48 l41 35 l-58 -4 l-6 54 l-29 -48 l-48 27 l23 -54 l-50 -23 l56 -15 z" fill="#111"/>`,
  금연:
    `<circle cx="210" cy="200" r="122" fill="#fff" stroke="#dc2626" stroke-width="22"/>` +
    `<rect x="128" y="186" width="152" height="28" fill="#111"/><rect x="286" y="186" width="22" height="28" fill="#a3a3a3"/>` +
    `<line x1="124" y1="286" x2="296" y2="114" stroke="#dc2626" stroke-width="22"/>`,
  흡연구역:
    `<circle cx="210" cy="200" r="122" fill="#fff" stroke="#2563eb" stroke-width="14"/>` +
    `<rect x="138" y="196" width="152" height="28" fill="#111"/><rect x="296" y="196" width="20" height="28" fill="#a3a3a3"/>` +
    `<path d="M252 156 q20 -20 0 -40" fill="none" stroke="#9ca3af" stroke-width="8"/>`,
  식사구역:
    `<circle cx="210" cy="200" r="122" fill="#fff" stroke="#2563eb" stroke-width="14"/>` +
    `<path d="M162 124 v72 q0 20 16 20 v76 M178 124 v62 M194 124 v62" fill="none" stroke="#111" stroke-width="9"/>` +
    `<path d="M258 124 q28 20 28 62 q0 20 -14 20 v86" fill="none" stroke="#111" stroke-width="9"/>`,
  휴식구역:
    `<circle cx="210" cy="200" r="122" fill="#fff" stroke="#2563eb" stroke-width="14"/>` +
    `<rect x="148" y="204" width="124" height="24" rx="8" fill="#111"/>` +
    `<path d="M158 204 v-52 q52 -22 104 0 v52" fill="none" stroke="#111" stroke-width="9"/>` +
    `<rect x="156" y="228" width="16" height="58" fill="#111"/><rect x="248" y="228" width="16" height="58" fill="#111"/>`,
  분리수거:
    `<path d="M210 88 l46 80 h-92 z" fill="#0f9d58"/><path d="M292 302 l-46 -80 h80 z" fill="#0f9d58"/><path d="M128 302 l46 -80 h-80 z" fill="#0f9d58"/>` +
    `<path d="M256 168 l40 52 M164 168 l-40 52 M170 302 h84" fill="none" stroke="#0f9d58" stroke-width="12"/>`,
  예약석:
    `<rect x="58" y="128" width="304" height="142" rx="10" fill="#111"/>` +
    `<text x="210" y="202" font-family="${F}" font-size="46" font-weight="700" text-anchor="middle" fill="#fff">예약석</text>` +
    `<text x="210" y="246" font-family="${F}" font-size="24" text-anchor="middle" fill="#d4d4d4">RESERVED</text>`,
  운전중통화:
    `<circle cx="210" cy="200" r="122" fill="#fff" stroke="#dc2626" stroke-width="22"/>` +
    `<rect x="172" y="126" width="60" height="106" rx="10" fill="#111"/><circle cx="202" cy="256" r="26" fill="#111"/>` +
    `<path d="M148 302 h132" stroke="#111" stroke-width="12"/>` +
    `<line x1="124" y1="286" x2="296" y2="114" stroke="#dc2626" stroke-width="22"/>`,
  카트금지:
    `<circle cx="210" cy="200" r="122" fill="#fff" stroke="#dc2626" stroke-width="22"/>` +
    `<path d="M136 148 h32 l28 104 h92 l22 -72 h-124" fill="none" stroke="#111" stroke-width="10"/>` +
    `<circle cx="206" cy="274" r="12" fill="#111"/><circle cx="264" cy="274" r="12" fill="#111"/>` +
    `<line x1="124" y1="286" x2="296" y2="114" stroke="#dc2626" stroke-width="22"/>`,
};

function signCard(kind, { number } = {}) {
  const W = 420, H = 400;
  let b = `<rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="16" fill="#fff" stroke="#d4d4d8" stroke-width="3"/>`;
  b += ICONS[kind];
  if (number) b += txt(38, 54, String(number), { size: 30, weight: 900, fill: '#6b7280' });
  return svg(W, H, b);
}

/* ══════════════════════════════════════════════════ 메모지 */
function memo({ lines }) {
  const W = 420, H = 400;
  let b = `<rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="6" fill="#fef9c3" stroke="#ca8a04" stroke-width="3"/>`;
  b += `<rect x="150" y="26" width="120" height="30" rx="6" fill="#d4d4d8"/>`;
  lines.forEach((l, i) => (b += txt(W / 2, 150 + i * 58, l, { size: l.length > 8 ? 28 : 38, weight: 700, anchor: 'middle' })));
  return svg(W, H, b);
}

/* ══════════════════════════════════════════════════ 찻잔 개수 */
function cups({ count }) {
  const W = 420, H = 400;
  let b = '';
  const pos = [[130, 170], [290, 170], [130, 300], [290, 300]];
  for (let i = 0; i < count; i++) {
    const [x, y] = pos[i];
    b += `<path d="M${x - 46} ${y - 34} h92 l-12 74 q-2 16 -18 16 h-32 q-16 0 -18 -16 z" fill="#7c2d12"/>`;
    b += `<path d="M${x - 46} ${y - 34} h92" stroke="#111" stroke-width="5" fill="none"/>`;
    b += `<path d="M${x + 48} ${y - 14} q28 8 0 34" fill="none" stroke="#111" stroke-width="7"/>`;
    b += `<ellipse cx="${x}" cy="${y - 34}" rx="46" ry="11" fill="#b91c1c"/>`;
    b += `<rect x="${x - 60}" y="${y + 56}" width="120" height="9" rx="4" fill="#111"/>`;
  }
  return svg(W, H, b);
}

/* ══════════════════════════════════════════════════ 카드류 */
function idCard({ kind, title, photo = true, rows, footer, color = '#1d4ed8' }) {
  const W = 580, H = 340;
  let b = `<rect x="16" y="16" width="${W - 32}" height="${H - 32}" rx="18" fill="#fff" stroke="#111" stroke-width="3"/>`;
  b += `<path d="M34 16 h${W - 68} a18 18 0 0 1 18 18 v42 h-${W - 32} v-42 a18 18 0 0 1 18 -18 z" fill="${color}"/>`;
  b += txt(W / 2, 58, title, { size: 27, weight: 700, anchor: 'middle', fill: '#fff' });
  if (photo) {
    b += `<rect x="46" y="104" width="120" height="150" rx="8" fill="#e5e7eb" stroke="#9ca3af" stroke-width="2"/>`;
    b += `<circle cx="106" cy="152" r="28" fill="#9ca3af"/><path d="M62 246 q44 -62 88 0 z" fill="#9ca3af"/>`;
  }
  rows.forEach((r, i) => {
    const y = 132 + i * 42;
    b += txt(photo ? 200 : 62, y, r[0], { size: 20, fill: '#6b7280' });
    b += txt(photo ? 330 : 250, y, r[1], { size: 23, weight: 700 });
  });
  if (footer) b += txt(W / 2, H - 42, footer, { size: 24, weight: 700, anchor: 'middle' });
  if (kind === 'transit') {
    b += `<rect x="452" y="240" width="86" height="60" rx="8" fill="#fbbf24"/>`;
    b += `<path d="M468 256 h54 M468 272 h54 M468 288 h54" stroke="#a16207" stroke-width="4"/>`;
  }
  return svg(W, H, b);
}

/* ══════════════════════════════════════════════════ 층별 안내판 */
function directory({ title, rows }) {
  const W = 540, H = 130 + rows.length * 56;
  let b = `<rect x="16" y="16" width="${W - 32}" height="${H - 32}" rx="10" fill="#1e293b"/>`;
  b += txt(W / 2, 66, title, { size: 28, weight: 700, anchor: 'middle', fill: '#fff' });
  b += `<line x1="45" y1="86" x2="${W - 45}" y2="86" stroke="#64748b" stroke-width="2"/>`;
  rows.forEach((r, i) => {
    const y = 134 + i * 56;
    b += txt(56, y, r[0], { size: 25, weight: 700, fill: '#fbbf24' });
    b += txt(190, y, r[1], { size: 25, fill: '#fff' });
  });
  return svg(W, H, b);
}

/* ══════════════════════════════════════════════════ 도로 편의시설 표지 */
function serviceSign({ items }) {
  const W = 580, H = 200;
  let b = `<rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="10" fill="#1d4ed8"/>`;
  const cw = (W - 60) / items.length;
  const GLYPH = {
    식당: `<path d="M-16 -22 v26 q0 8 7 8 v26 M-9 -22 v22 M-2 -22 v22" fill="none" stroke="#1d4ed8" stroke-width="5"/>` +
          `<path d="M12 -22 q11 8 11 24 q0 8 -6 8 v28" fill="none" stroke="#1d4ed8" stroke-width="5"/>`,
    주유소: `<rect x="-20" y="-24" width="26" height="48" fill="none" stroke="#1d4ed8" stroke-width="5"/>` +
            `<path d="M6 -14 h10 v30 q0 8 8 8 t8 -8 v-22" fill="none" stroke="#1d4ed8" stroke-width="5"/>`,
    정비소: `<path d="M-18 18 l24 -24 a14 14 0 1 1 12 12 l-24 24 z" fill="none" stroke="#1d4ed8" stroke-width="5"/>` +
            `<circle cx="-16" cy="16" r="5" fill="#1d4ed8"/>`,
  };
  items.forEach((it, i) => {
    const cx = 30 + cw * i + cw / 2;
    b += `<circle cx="${cx}" cy="82" r="36" fill="#fff"/>`;
    b += `<g transform="translate(${cx},82)">${GLYPH[it] ?? ''}</g>`;
    b += txt(cx, 158, it, { size: 24, weight: 700, anchor: 'middle', fill: '#fff' });
  });
  return svg(W, H, b);
}

/* ══════════════════════════════════════════════════════════════════
 * 자료 명세 — 값은 전부 해당 문항의 정답 / 해설에서 역산했습니다.
 * ════════════════════════════════════════════════════════════════ */
export const SPECS = {
  /* ── 달력 (정답 = 동그라미 친 날짜) ─────────────────── */
  s3_l_29:  { single: () => calendar({ month: 6, mark: 12 }) },
  s4_l_29:  { single: () => calendar({ month: 4, mark: 17 }) },
  s6_l_26:  { single: () => calendar({ month: 2, mark: 16 }) },
  s10_l_28: { single: () => calendar({ month: 8, mark: 9 }) },
  // s12_l_27 정답 = 토요일. 2025-06 은 10일이 화요일이라 2022-06 사용(10일=금)… → 2020-06(10일=수)
  // 10일이 토요일인 6월: 2023-06-10
  s12_l_27: { single: () => calendar({ year: 2023, month: 6, mark: 10 }) },
  // 정답 = 9월 셋째 토요일 16일. 표시는 하지 않고 학습자가 세도록 함.
  s11_l_24: { single: () => calendar({ year: 2023, month: 9 }) },

  /* ── 시계: 보기 4개가 전부 시각이라 시계 그림 4장으로 만듭니다 ── */
  s12_l_36: { optionsRaw: [clock({ hour: 4, minute: 45 }), clock({ hour: 3, minute: 45 }),
                           clock({ hour: 5, minute: 45 }), clock({ hour: 4, minute: 15 })] },
  s20_l_36: { optionsRaw: [clock({ hour: 12, minute: 10 }), clock({ hour: 12, minute: 20 }),
                           clock({ hour: 11, minute: 20 }), clock({ hour: 12, minute: 0 })] },

  /* ── 메모지 / 찻잔 ─────────────────────────────────── */
  s27_l_36: { optionsRaw: [memo({ lines: ['4월 27일', '오후 3시', '회의'] }),
                           memo({ lines: ['4월 29일', '오후 5시', '회의'] }),
                           memo({ lines: ['4월 29일', '오후 3시', '회의'] }),
                           memo({ lines: ['5월 29일', '오후 3시', '회의'] })] },
  s15_l_26: { optionsRaw: [cups({ count: 1 }), cups({ count: 2 }), cups({ count: 3 }), cups({ count: 4 })] },

  /* ── 영수증 / 메뉴판 ───────────────────────────────── */
  // 정답: 거스름돈 3,000원
  s8_r_11: { single: () => receipt({
      shop: '한마음 슈퍼', date: '2025. 5. 12.',
      items: [{ name: '라면', price: 4000, qty: 3 }, { name: '우유', price: 2500, qty: 2 }, { name: '휴지', price: 20000 }],
      paid: 40000 }) },
  // 정답: '4,500원어치를 샀다'가 틀림 (실제 합계 5,500 / 거스름돈 4,500)
  s15_r_11: { single: () => receipt({
      shop: '행복 마트', date: '2025. 10. 1.',
      items: [{ name: '치약', price: 2000 }, { name: '비누', price: 1500 }, { name: '라면', price: 2000 }],
      paid: 10000 }) },
  // 정답: 비빔밥이 가장 비쌈
  s7_r_12: { single: () => menu({ title: '차림표', rows: [
      { name: '라면', price: '3,000원' }, { name: '칼국수', price: '4,000원' },
      { name: '비빔밥', price: '5,000원' }, { name: '순두부', price: '4,500원' }] }) },
  // 정답: 커피 400원
  s15_l_27: { single: () => menu({ title: '메뉴', rows: [
      { name: '커피', price: '400원' }, { name: '녹차', price: '500원' },
      { name: '주스', price: '700원' }, { name: '우유', price: '600원' }] }) },

  /* ── 그래프 ────────────────────────────────────────── */
  s8_r_12:  { single: () => barChart({ title: '새해 소망', unit: '%',        // 정답 가정의 행복 41%
      bars: [{ label: '자기계발', value: 12 }, { label: '건강', value: 26 },
             { label: '돈', value: 21 }, { label: '가정의 행복', value: 41 }] }) },
  s7_r_11:  { single: () => barChart({ title: '월별 생활비', unit: '만 원',  // 정답 1월 (30만 원)
      bars: [{ label: '1월', value: 30 }, { label: '2월', value: 55 },
             { label: '3월', value: 70 }, { label: '6월', value: 85 }] }) },
  s11_r_12: { single: () => barChart({ title: '지역별 관광객 수', unit: '만 명', // 정답 미국 8.2
      bars: [{ label: '미국', value: 8.2 }, { label: '아시아', value: 6.4 },
             { label: '중동', value: 3.1 }, { label: '기타지역', value: 1.7 }] }) },
  s19_r_9:  { single: () => barChart({ title: '지역별 관광객 수', unit: '만 명',
      bars: [{ label: '미국', value: 8.2 }, { label: '아시아', value: 6.4 },
             { label: '중동', value: 3.1 }, { label: '기타지역', value: 1.7 }] }) },
  s18_r_12: { single: () => barChart({ title: '지역별 자동차 수출', unit: '만 대', // 정답 미국 240
      bars: [{ label: '미국', value: 240 }, { label: '유럽', value: 180 },
             { label: '아시아', value: 155 }, { label: '기타', value: 60 }] }) },
  s27_r_4:  { single: () => barChart({ title: '계절별 책 판매량', unit: '권',      // 정답 겨울 400
      bars: [{ label: '봄', value: 900 }, { label: '여름', value: 750 },
             { label: '가을', value: 1100 }, { label: '겨울', value: 400 }] }) },
  s24_r_4:  { single: () => barChart({ title: '자기 일을 좋아하는 사람', unit: '%', // 정답 A 60
      bars: [{ label: 'A 회사', value: 60 }, { label: 'B 회사', value: 45 },
             { label: 'C 회사', value: 38 }, { label: 'D 회사', value: 22 }] }) },
  s29_r_4:  { single: () => pieChart({ title: '한국 사람들이 많이 먹는 과일',       // 정답 사과 30.8%
      slices: [{ label: '사과', value: 30.8 }, { label: '귤', value: 24.5 },
               { label: '배', value: 18.2 }, { label: '감', value: 14.0 },
               { label: '기타', value: 12.5 }] }) },
  s30_r_6:  { single: () => pieChart({ title: '외국인이 좋아하는 한국 음식',        // 정답 불고기 21%
      slices: [{ label: '불고기', value: 21 }, { label: '삼겹살', value: 18 },
               { label: '김치찌개', value: 16 }, { label: '만두와 빈대떡', value: 12 },
               { label: '기타', value: 33 }] }) },

  /* ── 안내문 / 광고 ─────────────────────────────────── */
  s16_r_12: { single: () => notice({ title: '용접공 모집',
      lines: ['· 초보 가능 (기술 교육 지원)', '· 근무 시간 협의', '· 월급 면접 후 결정', '· 근무지: 경기도 시흥시'],
      footer: '대한기계' }) },
  s14_r_12: { single: () => notice({ title: '용접공 모집',
      lines: ['· 초보 가능 (기술 교육 지원)', '· 근무 시간 협의', '· 월급 면접 후 결정', '· 근무지: 경기도 시흥시'],
      footer: '대한기계' }) },
  s17_r_11: { single: () => notice({ title: '서울여행사', accent: '#1d4ed8',
      lines: ['제주도 2박 3일   29만 원', '부산 1박 2일   15만 원', '', '지금 예약하시면 여행 가방을 선물로!'],
      footer: '문의 02-123-4567' }) },

  /* ── 층별 안내 / 카드 / 도로 표지 ──────────────────── */
  s9_r_12:  { single: () => directory({ title: '시청역 안내', rows: [   // 정답: 표 사는 곳 = 지하 2층
      ['1층', '출구 · 버스 정류장'], ['지하 1층', '화장실 · 물품 보관함'],
      ['지하 2층', '표 사는 곳 · 안내소'], ['지하 3층', '승강장']] }) },
  s10_r_10: { single: () => idCard({ kind: 'transit', title: '교통카드', photo: false, color: '#0f766e',
      rows: [['버스', '이용 가능'], ['지하철', '이용 가능'], ['환승 할인', '이용 가능'], ['음식점 결제', '이용 불가']] }) },
  s20_r_10: { single: () => idCard({ kind: 'transit', title: '교통카드', photo: false, color: '#0f766e',
      rows: [['버스', '이용 가능'], ['지하철', '이용 가능'], ['환승 할인', '이용 가능'], ['음식점 결제', '이용 불가']] }) },
  s26_r_3:  { single: () => idCard({ title: '자동차운전면허증',          // 정답: 발급처 서울특별시 경찰청
      rows: [['성명', '홍길순'], ['주소', '서울시 서대문구'], ['종별', '제2종 보통'], ['발급일', '2025. 3. 10.']],
      footer: '서울특별시 경찰청' }) },
  s27_r_3:  { single: () => idCard({ title: '사 원 증', color: '#7c3aed', // 정답: 부서 디자인팀
      rows: [['성명', '김나라'], ['부서', '디자인팀'], ['직급', '사원'], ['사번', '2025-0417']],
      footer: '한국산업(주)' }) },
  s28_r_3:  { single: () => serviceSign({ items: ['식당', '주유소', '정비소'] }) }, // 정답: 영화관 없음

  /* ── 단일 표지판 ───────────────────────────────────── */
  s6_r_10:  { single: () => signCard('진입금지') },
  s9_r_11:  { single: () => signCard('금연') },
  s13_r_12: { single: () => signCard('폭발물주의') },

  /* ── 보기가 그림인 문항 (optionImages 4장) ─────────── */
  s3_r_11:  { options: ['쓰레기통', '식수대', '종이타월', '화장실'] },          // 정답 idx 1
  s15_r_12: { options: ['화장실', '비상구', '안내소', '식수대'] },              // 정답 idx 2
  s19_r_12: { options: ['화장실', '물품보관소', '안내소', '비상구'] },          // 정답 idx 1
  s29_r_2:  { options: ['엘리베이터', '에스컬레이터', '수도꼭지', '비상구'] },  // 정답 idx 0
  s30_r_5:  { options: ['진입금지', '응급처치', '비상구', '폭발물주의'] },      // 정답 idx 2
  s12_l_37: { options: ['흡연구역', '금연', '식사구역', '휴식구역'] },          // 정답 idx 1
  s19_l_36: { options: ['분리수거', '예약석', '운전중통화', '카트금지'] },      // 정답 idx 1
};

/* ══════════════════════════════════════════════════ 실행 */
const args = process.argv.slice(2);
const LINK = args.includes('--link');
const only = args.find((a) => !a.startsWith('--'));

fs.mkdirSync(OUT, { recursive: true });
const made = {};
let n = 0;

for (const [id, spec] of Object.entries(SPECS)) {
  if (only && id !== only) continue;
  if (spec.single) {
    fs.writeFileSync(path.join(OUT, `${id}.svg`), spec.single(), 'utf8');
    made[id] = { imageUrl: `/images/exam/generated/${id}.svg` };
    n++;
  } else if (spec.optionsRaw) {
    const urls = spec.optionsRaw.map((content, i) => {
      fs.writeFileSync(path.join(OUT, `${id}_${i + 1}.svg`), content, 'utf8');
      return `/images/exam/generated/${id}_${i + 1}.svg`;
    });
    made[id] = { optionImages: urls };
    n += 4;
  } else {
    const urls = spec.options.map((kind, i) => {
      fs.writeFileSync(path.join(OUT, `${id}_${i + 1}.svg`), signCard(kind, { number: i + 1 }), 'utf8');
      return `/images/exam/generated/${id}_${i + 1}.svg`;
    });
    made[id] = { optionImages: urls };
    n += 4;
  }
  console.log(`  ✓ ${id}`);
}

console.log(`\n${n}개 파일 생성 → public/images/exam/generated/`);

if (LINK) {
  let src = fs.readFileSync(DATA_TS, 'utf8');
  let linked = 0;
  for (const [id, patch] of Object.entries(made)) {
    const re = new RegExp(`(\\{[^\\n]*?id: "${id}"[\\s\\S]*?)(\\s*\\}(?=\\s*,?\\s*(?:\\n|\\])))`);
    if (!re.test(src)) continue;
    src = src.replace(re, (m, head, tail) => {
      const h = head
        .replace(/,\s*imageUrl: "[^"]*"/g, '')
        .replace(/,\s*optionImages: \[[^\]]*\]/g, '')
        .replace(/,\s*imagePrompt: "[^"]*"/g, '')
        .replace(/,\s*imageRole: "[^"]*"/g, '')
        .replace(/,\s*,/g, ',')
        .replace(/,\s*$/, '');
      const add = patch.imageUrl
        ? `, imageUrl: ${JSON.stringify(patch.imageUrl)}, imageRole: "stimulus"`
        : `, optionImages: [${patch.optionImages.map((u) => JSON.stringify(u)).join(', ')}]`;
      return h + add + tail;
    });
    linked++;
  }
  fs.copyFileSync(DATA_TS, DATA_TS + '.bak3');
  fs.writeFileSync(DATA_TS, src, 'utf8');
  console.log(`examData.ts 연결 ${linked}건 (백업: examData.ts.bak3)`);
}
