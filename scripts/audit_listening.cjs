const fs = require('fs');
const path = require('path');

// Mocking QuestionType for the script
const QuestionType = {
  READING: 'READING',
  LISTENING: 'LISTENING'
};

const examDataPath = path.join(__dirname, '../src/data/examData.ts');
const fileContent = fs.readFileSync(examDataPath, 'utf8');

// Extract the array content using a regex
const match = fileContent.match(/export const STATIC_EXAM_DATA: Question\[\] = (\[[\s\S]*?\]);/);
if (!match) {
  console.error("Could not find STATIC_EXAM_DATA in examData.ts");
  process.exit(1);
}

// Simple parser to avoid complex TS issues in CJS
// We'll use a more robust way to extract individual objects
const objectsRaw = match[1].trim().slice(1, -1); // Remove [ and ]
const questions = [];

// Split by objects - this is a bit naive but works for the current format
const objectMatches = match[1].match(/\{[\s\S]*?\}(?=\s*,|\s*\])/g);

const suspiciousQuestions = [];

if (objectMatches) {
  objectMatches.forEach(objStr => {
    try {
      // Basic evaluation to get a JS object
      // Caution: eval can be dangerous, but here it's on local source file
      const q = eval(`(${objStr})`);
      
      if (q.type === QuestionType.LISTENING) {
        let issue = null;
        
        const context = (q.context || "").trim();
        const options = q.options || [];
        const category = q.category || "";
        
        // Case 1: Empty context
        if (!context) {
          issue = "지문(context)이 비어 있음";
        }
        // Case 2: Context is identical to one of the options (suspicious for dialogue types)
        else if (options.some(opt => opt.trim() === context)) {
            // "들은 것 고르기" 카테고리는 단어 하나인 것이 정상이지만, 대화형 카테고리는 문제임
            if (category.includes("대화") || category.includes("이야기") || category.includes("이해")) {
                issue = `대화형 문제인데 지문이 보기(${context})와 일치함`;
            }
        }
        // Case 3: Too short for dialogue
        else if ((category.includes("대화") || category.includes("이야기")) && context.length < 5) {
            issue = `대화형 문제인데 지문이 너무 짧음: "${context}"`;
        }

        if (issue) {
          suspiciousQuestions.push({
            id: q.id,
            category: q.category,
            issue: issue,
            currentContext: context,
            options: options
          });
        }
      }
    } catch (e) {
      // skip errors
    }
  });
}

const reportPath = path.join(__dirname, '../public/listening_audit_report.html');
let html = `
<!DOCTYPE html>
<html>
<head>
    <title>듣기 문제 스크립트 오류 검수</title>
    <style>
        body { font-family: sans-serif; padding: 20px; background: #f5f5f5; }
        .card { background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 5px solid #ff4444; }
        .id { font-weight: bold; color: #333; }
        .issue { color: #d32f2f; font-weight: bold; margin: 5px 0; }
        .options { color: #666; font-size: 0.9em; }
        .tag { display: inline-block; padding: 2px 8px; background: #eee; border-radius: 4px; font-size: 0.8em; }
    </style>
</head>
<body>
    <h1>듣기 문제 스크립트 오류 검수 보고서</h1>
    <p>총 <b>${suspiciousQuestions.length}</b>개의 의심스러운 문제가 발견되었습니다.</p>
    ${suspiciousQuestions.map(q => `
        <div class="card">
            <span class="tag">${q.category}</span>
            <div class="id">ID: ${q.id}</div>
            <div class="issue">오류 유형: ${q.issue}</div>
            <div>현재 지문: "${q.currentContext}"</div>
            <div class="options">보기: ${q.options.join(", ")}</div>
        </div>
    `).join('')}
</body>
</html>
`;

fs.writeFileSync(reportPath, html);
console.log(`Audit complete. ${suspiciousQuestions.length} issues found. Report saved to: public/listening_audit_report.html`);
