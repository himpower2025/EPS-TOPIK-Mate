const fs = require('fs');
const path = require('path');

const examDataPath = path.join(__dirname, '../src/data/examData.ts');
let content = fs.readFileSync(examDataPath, 'utf8');

// 정답을 미리 말해버리는 듣기 문제 교정 로직
// 1. 대화 응답, 이어지는 말 카테고리 대상
// 2. context가 options 중 하나와 일치하면 context를 비움 (그러면 questionText가 재생됨)

const responseCategories = ["대화 응답", "이어지는 말"];

// 정규식으로 문제 블록 추출
const qBlockRegex = /\{[\s\S]*?id:\s*"(s[0-9]+_l_[0-9]+)"[\s\S]*?\}(?=\s*,|\s*\])/g;

let fixCount = 0;
const newContent = content.replace(qBlockRegex, (block) => {
    try {
        // 대략적인 객체 파싱 (eval 사용하지 않고 필드만 추출)
        const categoryMatch = block.match(/category:\s*"(.*?)"/);
        const contextMatch = block.match(/context:\s*"(.*?)"/);
        const optionsMatch = block.match(/options:\s*\[([\s\S]*?)\]/);
        
        if (categoryMatch && contextMatch && optionsMatch) {
            const category = categoryMatch[1];
            const context = contextMatch[1].trim();
            const options = optionsMatch[1].split(',').map(s => s.replace(/"/g, '').trim());

            if (responseCategories.includes(category)) {
                // 지문이 보기 중 하나와 정확히 일치하는지 확인
                if (options.includes(context) || options.includes(context.replace(/\.$/, ''))) {
                    console.log(`Fixing ${block.match(/id:\s*"(.*?)"/)[1]}: Removing answer from context.`);
                    fixCount++;
                    // context 필드를 빈 문자열로 변경
                    return block.replace(/context:\s*".*?"/, 'context: ""');
                }
            }
        }
    } catch (e) {}
    return block;
});

if (fixCount > 0) {
    fs.writeFileSync(examDataPath, newContent);
    console.log(`Successfully fixed ${fixCount} listening questions.`);
} else {
    console.log("No issues found to fix.");
}
