const fs = require('fs');
const path = require('path');

const examDataPath = path.join(__dirname, '../src/data/examData.ts');
let content = fs.readFileSync(examDataPath, 'utf8');

// The 16 IDs found by the deep audit script
const badResponseIds = [
    "s21_l_34", "s24_l_31", "s24_l_32", "s24_l_33", 
    "s25_l_31", "s25_l_32", "s25_l_33", "s26_l_31", 
    "s26_l_33", "s27_l_33", "s1_l_36", "s1_l_37", "s22_l_31", "s22_l_32", "s23_l_31", "s23_l_32" 
]; // Note: adding a few extra generic patterns to be safe, but using regex to catch the 16 exact ones.

// Read from the JSON report to be precise
const auditResultsPath = path.join(__dirname, 'deep_audit_results.json');
const auditData = JSON.parse(fs.readFileSync(auditResultsPath, 'utf8'));
const targetIds = auditData.notAQuestion.map(item => item.id);

let fixCount = 0;
targetIds.forEach(id => {
    // Replace the context string with empty string for these specific IDs
    const regex = new RegExp(`(id:\\s*"${id}"[\\s\\S]*?context:\\s*)"(.*?)"`);
    if (regex.test(content)) {
        content = content.replace(regex, `$1""`);
        fixCount++;
    }
});

if (fixCount > 0) {
    fs.writeFileSync(examDataPath, content);
    console.log(`Successfully cleared invalid contexts for ${fixCount} question-response items.`);
} else {
    console.log("No items replaced.");
}
