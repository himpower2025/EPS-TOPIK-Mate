const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/data/examData.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Regex to find each question block
// This regex tries to capture from { id: to the closing },
const questionRegex = /\{[\s\S]*?id:\s*"(.*?)"[\s\S]*?\}/g;

let totalCount = 0;
let fixedBrackets = 0;
let fixedBlanks = 0;
let issues = [];

const updatedContent = content.replace(questionRegex, (block) => {
    totalCount++;
    let originalBlock = block;
    
    // Extract fields
    const idMatch = block.match(/id:\s*"(.*?)"/);
    const id = idMatch ? idMatch[1] : 'unknown';
    
    const catMatch = block.match(/category:\s*"(.*?)"/);
    const category = catMatch ? catMatch[1] : '';
    
    const qtMatch = block.match(/questionText:\s*"(.*?)"/);
    let qt = qtMatch ? qtMatch[1] : '';
    
    const ctxMatch = block.match(/context:\s*"(.*?)"/);
    let ctx = ctxMatch ? ctxMatch[1] : null;

    const typeMatch = block.match(/type:\s*QuestionType\.(READING|LISTENING)/);
    const qType = typeMatch ? typeMatch[1] : '';

    // --- FIX 1: Extract words from brackets in title ---
    // Pattern: "Question text? [Word]" or "Question text? [Word1, Word2]"
    const bracketRegex = /^(.*?) ?\[(.*?)\]$/;
    const bMatch = qt.match(bracketRegex);
    if (bMatch) {
        const newQt = bMatch[1].trim();
        const extractedWord = bMatch[2].trim();
        
        // Only move if context is empty or null
        if (!ctx || ctx.trim() === '') {
            qt = newQt;
            ctx = extractedWord;
            fixedBrackets++;
            
            // Update the block string
            block = block.replace(/questionText:\s*"(.*?)"/, `questionText: "${qt}"`);
            if (block.includes('context:')) {
                block = block.replace(/context:\s*"(.*?)"/, `context: "${ctx}"`);
            } else {
                // Insert context after category or questionText
                block = block.replace(/(category:\s*".*?",)/, `$1\n    context: "${ctx}",`);
            }
        }
    }

    // --- FIX 2: Standardize Blanks ---
    if (category === "빈칸 채우기" || qt.includes("빈칸") || (ctx && ctx.includes("___"))) {
        if (ctx && ctx.includes("_")) {
            const newCtx = ctx.replace(/_{2,}/g, "________");
            if (newCtx !== ctx) {
                ctx = newCtx;
                block = block.replace(/context:\s*"(.*?)"/, `context: "${ctx}"`);
                fixedBlanks++;
            }
        }
    }

    // --- AUDIT: Find remaining issues ---
    let issueReason = [];
    
    // Category implies context but it's missing
    const needsContext = ["비슷한 말", "반대말", "반대 말", "관계 있는 단어", "단어 관계", "내용 관계", "어휘 선택", "빈칸 채우기"];
    if (qType === 'READING' && needsContext.includes(category)) {
        if (!ctx || ctx.trim() === '') {
            issueReason.push("제시문(context) 누락");
        } else if (category === "빈칸 채우기" && !ctx.includes("________")) {
            issueReason.push("빈칸(________) 표시 없음");
        }
    }

    // Image based questions missing image
    const needsImage = ["표지판", "그래프 해석", "도구 파악", "안내문", "시각 정보", "표 해석", "그림 고르기"];
    if (needsImage.includes(category) || qt.includes("표지") || qt.includes("그래프")) {
        if (!block.includes('imageUrl') && !block.includes('optionImages')) {
            issueReason.push("이미지(imageUrl/optionImages) 누락");
        }
    }

    if (issueReason.length > 0) {
        issues.push({ id, category, qt, ctx: ctx || '', reasons: issueReason });
    }

    return block;
});

// Write updated content
fs.writeFileSync(filePath, updatedContent, 'utf8');

// Generate Audit Report HTML
let reportHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>EPS-TOPIK 데이터 품질 검수 보고서</title>
    <style>
        body { font-family: sans-serif; padding: 20px; line-height: 1.6; background: #f4f7f6; }
        .summary { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .issue-card { background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 5px solid #e74c3c; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-right: 10px; }
        .badge-id { background: #3498db; color: white; }
        .badge-cat { background: #95a5a6; color: white; }
        .reason { color: #e74c3c; font-weight: bold; margin-bottom: 10px; }
        .content { background: #f9f9f9; padding: 10px; border-radius: 4px; border: 1px solid #eee; }
        h1 { color: #2c3e50; }
        .fixed { color: #27ae60; font-weight: bold; }
    </style>
</head>
<body>
    <h1>📊 EPS-TOPIK 데이터 품질 검수 보고서</h1>
    <div class="summary">
        <p>전체 문제 수: <strong>${totalCount}</strong></p>
        <p class="fixed">✅ 제목에서 제시어 자동 추출: <strong>${fixedBrackets} 건</strong></p>
        <p class="fixed">✅ 빈칸 기호 표준화: <strong>${fixedBlanks} 건</strong></p>
        <p>⚠️ 추가 확인이 필요한 문제: <strong>${issues.length} 건</strong></p>
    </div>

    <h2>⚠️ 수동 확인이 필요한 리스트</h2>
    <p>아래 문제들은 자동 교정 후에도 데이터가 부족하거나 형식이 의심스러운 것들입니다. 하나씩 확인하시고 저에게 번호와 수정 내용을 말씀해 주세요.</p>
    
    ${issues.map(iss => `
    <div class="issue-card">
        <div class="reason">사유: ${iss.reasons.join(', ')}</div>
        <div>
            <span class="badge badge-id">${iss.id}</span>
            <span class="badge badge-cat">${iss.category}</span>
        </div>
        <div class="content">
            <strong>질문:</strong> ${iss.qt}<br>
            <strong>제시문:</strong> ${iss.ctx || '<span style="color:#ccc">없음</span>'}
        </div>
    </div>
    `).join('')}
</body>
</html>
`;

fs.writeFileSync('public/audit_quality.html', reportHtml, 'utf8');

console.log('--- 작업 완료 ---');
console.log(`- 전체 검사: ${totalCount}개`);
console.log(`- 자동 교정(제시어 추출): ${fixedBrackets}개`);
console.log(`- 자동 교정(빈칸 표준화): ${fixedBlanks}개`);
console.log(`- 수동 확인 필요: ${issues.length}개`);
console.log('보고서 위치: public/audit_quality.html');
