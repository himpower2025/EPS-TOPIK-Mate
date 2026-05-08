const fs = require('fs');
const path = require('path');

const examDataPath = path.join(__dirname, '../src/data/examData.ts');
const content = fs.readFileSync(examDataPath, 'utf8');

const qBlockRegex = /\{[\s\S]*?id:\s*"(s[0-9]+_l_[0-9]+)"[\s\S]*?\}(?=\s*,|\s*\])/g;

let totalListening = 0;
const issues = {
    missingScript: [],
    shortDialogue: [],
    notAQuestion: [],
    answerLeaked: []
};

let match;
while ((match = qBlockRegex.exec(content)) !== null) {
    const block = match[0];
    try {
        const typeMatch = block.match(/type:\s*QuestionType\.(.*?)(?:,|\s)/);
        if (!typeMatch || typeMatch[1] !== 'LISTENING') continue;
        
        totalListening++;
        
        const id = match[1];
        const category = (block.match(/category:\s*"(.*?)"/) || [])[1] || "";
        const questionText = (block.match(/questionText:\s*"(.*?)"/) || [])[1] || "";
        let context = (block.match(/context:\s*"(.*?)"/) || [])[1] || "";
        
        const optionsRaw = block.match(/options:\s*\[([\s\S]*?)\]/);
        const options = optionsRaw ? optionsRaw[1].split(',').map(s => s.replace(/"/g, '').trim()).filter(s => s) : [];

        // 실제 재생될 스크립트 판별 (ExamSimulator.tsx 로직과 동일)
        const activeScript = context || questionText;

        // 1. 대본 자체가 없는 경우 (지시문만 있는 최악의 경우)
        if (activeScript.includes("고르십시오") && activeScript.length < 20 && !context) {
            issues.missingScript.push({ id, category, activeScript });
            continue;
        }

        // 2. 대화 응답 / 이어지는 말 (질문이 나와야 하는 유형)
        if (category.includes("응답") || category.includes("이어지는")) {
            // 스크립트가 질문 형태가 아닌 경우 (단, 평서문으로 끝나는 상황 제시형도 일부 있으나 보수적으로 접근)
            const isQuestion = activeScript.includes("?") || activeScript.endsWith("요.") || activeScript.endsWith("까.") || activeScript.endsWith("요") || activeScript.endsWith("까") || activeScript.endsWith("죠.");
            
            if (!isQuestion && activeScript.length > 0) {
                // 하지만 보기와 일치하는 경우는 이미 answerLeaked로 잡아야 함
                if (options.includes(activeScript)) {
                    issues.answerLeaked.push({ id, category, activeScript });
                } else if (!activeScript.includes("대본:") && activeScript.length > 5) {
                    // 그냥 평서문인 경우 (오류일 확률 높음)
                    issues.notAQuestion.push({ id, category, activeScript });
                }
            }
        }

        // 3. 이야기 / 대화 이해 (스크립트가 길어야 하는 유형)
        if (category.includes("이야기") || category.includes("대화 이해") || category.includes("내용 파악") || category.includes("상황 파악")) {
            // 대본이 너무 짧은 경우 (10자 미만)
            if (activeScript.length < 10) {
                issues.shortDialogue.push({ id, category, activeScript, options });
            }
        }

    } catch(e) {}
}

console.log(`\n=== 듣기 문제 정밀 진단 결과 ===`);
console.log(`총 듣기 문제 수: ${totalListening}`);
console.log(`\n1. [치명적 오류] 들을 내용이 아예 없는 문제 (지시문만 있음): ${issues.missingScript.length}건`);
if (issues.missingScript.length > 0) console.log(issues.missingScript.map(i => i.id).join(', '));

console.log(`\n2. [대화형 오류] 대화/이야기 문제인데 대본이 너무 짧은 문제 (단어 수준): ${issues.shortDialogue.length}건`);
issues.shortDialogue.slice(0, 10).forEach(i => console.log(` - ${i.id}: "${i.activeScript}"`));

console.log(`\n3. [응답형 오류] 질문을 던져야 하는데 평서문(또는 엉뚱한 문장)인 문제: ${issues.notAQuestion.length}건`);
issues.notAQuestion.slice(0, 10).forEach(i => console.log(` - ${i.id}: "${i.activeScript}"`));

console.log(`\n4. [정답 유출] 정답(보기)을 그대로 읽어버리는 문제: ${issues.answerLeaked.length}건`);

// JSON 형태로 저장하여 이후 자동 교정에 활용
fs.writeFileSync(path.join(__dirname, 'deep_audit_results.json'), JSON.stringify(issues, null, 2));
