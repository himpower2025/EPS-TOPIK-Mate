import re

file_path = 'src/data/examData.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find all READING questions
def replacer(match):
    block = match.group(0)
    # Check if context already exists
    if 'context:' in block:
        return block
    
    cat_match = re.search(r'category:\s*"(.*?)"', block)
    qt_match = re.search(r'questionText:\s*"(.*?)"', block)
    
    if not cat_match or not qt_match:
        return block
        
    cat = cat_match.group(1)
    qt = qt_match.group(1)
    
    # If the questionText doesn't look like a standard question prompt, but rather a long passage or fill-in-the-line
    standard_prompt = ""
    is_passage = False
    
    if "________" in qt or "_____" in qt:
        standard_prompt = "빈칸에 들어갈 가장 알맞은 것을 고르십시오."
        is_passage = True
    elif cat == "그림 보고 맞히기" and qt != "다음 그림을 보고 맞는 단어나 문장을 고르십시오.":
        standard_prompt = "다음 그림을 보고 맞는 단어나 문장을 고르십시오."
        if len(qt) > 10: is_passage = True
        
    if is_passage and standard_prompt:
        return block.replace(f'questionText: "{qt}"', f'questionText: "{standard_prompt}",\n    context: "{qt}"')
        
    return block

pattern = re.compile(r'\{\s*id:\s*"(s\d+_r_\d+)",\s*type:\s*QuestionType\.READING,[\s\S]*?(options:|\})')
new_content = pattern.sub(replacer, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

