const fs = require('fs');

// Read standard module for examData if possible, but it's typescript. 
// A fast regex extraction
const content = fs.readFileSync('src/data/examData.ts', 'utf8');

const regex = /id:\s*"(.*?)",\s*type:\s*(.*?),[\s\S]*?category:\s*"(.*?)",\s*questionText:\s*"(.*?)",([\s\S]*?)correctAnswer:\s*(\d+)/g;

let matches;
const questions = [];

while ((matches = regex.exec(content)) !== null) {
    const id = matches[1];
    const type = matches[2];
    const cat = matches[3];
    const qt = matches[4];
    const chunk = matches[5];
    const answerIndex = parseInt(matches[6], 10);
    
    let imageUrl = '';
    const imgMatch = chunk.match(/imageUrl:\s*"(.*?)"/);
    if (imgMatch) imageUrl = imgMatch[1];
    
    let options = [];
    const optMatch = chunk.match(/options:\s*\[(.*?)\]/);
    if (optMatch) {
       options = optMatch[1].split(',').map(s => s.replace(/"/g, '').trim());
    }

    if (imageUrl) {
        questions.push({ id, type, cat, qt, imageUrl, options, answerIndex });
    }
}

let html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>EPS-TOPIK 이미지 오류 검수 페이지</title>
    <style>
        body { font-family: 'Malgun Gothic', sans-serif; background: #f0f2f5; padding: 20px; }
        .card { background: white; margin-bottom: 20px; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); display: flex; gap: 20px; }
        .img-box { flex: 0 0 300px; }
        .img-box img { max-width: 100%; border: 1px solid #ddd; border-radius: 4px; }
        .content-box { flex: 1; }
        .id-badge { display: inline-block; background: #2d60d3; color: white; padding: 3px 8px; border-radius: 4px; font-size: 12px; margin-bottom: 10px; }
        h3 { margin: 0 0 10px 0; font-size: 18px; }
        .options { list-style-type: none; padding: 0; }
        .options li { margin-bottom: 5px; padding: 5px; background: #f8f9fa; border-radius: 4px; }
        .correct { color: white; background: #28a745 !important; font-weight: bold; }
        .note { color: #666; font-size: 14px; margin-top: 10px; }
    </style>
</head>
<body>
    <h1>🖼 전체 문제 이미지 자가 진단(Audit) 센터</h1>
    <p>아래 목록은 <strong>이미지가 포함된 전체 문제</strong>를 한곳에 모아놓은 것입니다. 앱에서 일일이 풀면서 찾지 마시고, 아래로 스크롤하며 이미지가 정답이나 문제와 맞지 않는 것을 메모해주시면 됩니다.</p>
`;

questions.forEach(q => {
    html += `
    <div class="card">
        <div class="img-box">
            <img src="${q.imageUrl}" alt="이미지 로드 실패">
            <div class="note"><strong>경로:</strong> ${q.imageUrl}</div>
        </div>
        <div class="content-box">
            <span class="id-badge">${q.id} (${q.type === 'QuestionType.READING' ? '읽기' : '듣기'} - ${q.cat})</span>
            <h3>${q.qt}</h3>
            <ul class="options">
                ${q.options.map((opt, i) => `<li class="${i === q.answerIndex ? 'correct' : ''}">${i + 1}번: ${opt} ${i === q.answerIndex ? '(정답)' : ''}</li>`).join('')}
            </ul>
        </div>
    </div>
    `;
});

html += `</body></html>`;

fs.writeFileSync('public/audit.html', html, 'utf8');
console.log("Audit page generated at public/audit.html");
