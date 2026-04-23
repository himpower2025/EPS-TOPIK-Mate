const fs = require('fs');
const filePath = 'src/data/examData.ts';
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
let fixed = 0;
for (let i = 0; i < lines.length - 1; i++) {
    const currentLine = lines[i].trimEnd();
    const nextLine = lines[i+1].trimStart();

    if ((currentLine.endsWith('"') || currentLine.endsWith(']') || currentLine.endsWith('}')) && !currentLine.endsWith(';') && !currentLine.endsWith(',')) {
        if (nextLine.startsWith('imagePrompt:') || 
            nextLine.startsWith('imageUrl:') || 
            nextLine.startsWith('optionImages:') ||
            nextLine.startsWith('optionImagePrompts:') ||
            nextLine.startsWith('explanation:') ||
            nextLine.startsWith('correctAnswer:')) {
            lines[i] = currentLine + ',';
            fixed++;
        }
    }
}

fs.writeFileSync(filePath, lines.join('\n'));
console.log(`Fixed ${fixed} missing commas.`);
