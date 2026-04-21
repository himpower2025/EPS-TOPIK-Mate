import re

file_path = 'src/data/examData.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Match reading questions without a context field
questions = re.findall(r'id:\s*"(s\d+_r_\d+)",\s*type:\s*QuestionType\.READING,[\s\S]*?questionText:\s*"(.*?)"(,(?![\s\S]*?context:)|\s*\})', content)

# questions is a list of tuples: (id, questionText, etc)
for q_id, qt, _ in questions:
    qt_stripped = qt.strip()
    if not (qt_stripped.endswith('?') or qt_stripped.endswith('고르십시오.') or qt_stripped.endswith('답 하십시오.') or qt_stripped.endswith('고르시오.')):
        print(f"Suspicious Reading: {q_id} | QT: {qt}")

