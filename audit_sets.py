import re

file_path = 'src/data/examData.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

IMAGE_REQUIRED_CATEGORIES = [
    "그림 보고 맞히기", "표지판", "그래프 분석", "상태 묘사", "사물 개수", 
    "장소 파악", "위치 파악", "시간 파악", "수량 파악", "사물 파악", 
    "직업 파악", "활동 파악", "상황 파악", "날씨 파악", "그림 고르기",
    "사물 기능", "사물 수량", "동작 파악", "도구 파악", "식각 정보",
    "표 해석", "위치/방향", "날짜 파악", "시간/날짜", "수량 단위",
    "상황 판단", "그림 보고 맞추기", "그림 선택"
]

blocks = re.findall(r'\{[\s\S]*?id:[\s\S]*?\}', content)
set_status = {}

for block in blocks:
    id_match = re.search(r'id:\s*"(.*?)"', block)
    if not id_match: continue
    q_id = id_match.group(1)
    set_num = int(q_id.split('_')[0].replace('s', ''))
    
    if set_num not in set_status:
        set_status[set_num] = {"total": 0, "must_have": 0, "has_image": 0}
    
    set_status[set_num]["total"] += 1
    cat_match = re.search(r'category:\s*"(.*?)"', block)
    qt_match = re.search(r'questionText:\s*"(.*?)"', block)
    cat = cat_match.group(1) if cat_match else ""
    qt = qt_match.group(1) if qt_match else ""
    
    is_image_question = any(c in cat for c in IMAGE_REQUIRED_CATEGORIES) or "그림" in qt
    if is_image_question:
        set_status[set_num]["must_have"] += 1
        if 'imageUrl:' in block:
            set_status[set_num]["has_image"] += 1

print("| 세트 | 전체 문항 | 이미지 필수 | 누락됨 |")
print("| :--- | :--- | :--- | :--- |")
for s in sorted(set_status.keys()):
    res = set_status[s]
    missing = res["must_have"] - res["has_image"]
    print(f"| Set {s} | {res['total']} | {res['must_have']} | **{missing}** |")
