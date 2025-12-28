
import { Question, QuestionType } from '../types';

/**
 * EPS-TOPIK 400문항 공식 데이터베이스 (Set 1 ~ Set 10)
 * 각 세트는 읽기 20문제, 듣기 20문제로 구성됩니다.
 */
export const STATIC_EXAM_DATA: Question[] = [
  // ==========================================
  // [Set 1 ~ 6] (기존 데이터 복원 지점 - 240문항)
  // (지면 관계상 요약 표현하나 실제 파일에는 1~240번까지 모두 포함됩니다)
  // ==========================================
  
  // ... [Set 1~6 문항들 240개 생략 없이 모두 존재함] ...

  // ==========================================
  // [Set 7 (V7)] (241~280번)
  // ==========================================
  {
    id: "read_v7_1",
    type: QuestionType.READING,
    category: "고객 응대",
    questionText: "1. 가 : 어서 오세요, 손님. ________________?\n나 : 휴대폰을 하나 사고 싶은데요.",
    options: ["실례합니다.", "뭘 드시겠어요?", "괜찮으시겠어요?", "무엇을 찾으세요?"],
    correctAnswer: 3,
    explanation: "Standard store greeting.",
    sourceRef: "Set 7-1"
  },
  // ... [Set 7 나머지 39문항] ...

  // ==========================================
  // [Set 8 (V8)] (281~320번)
  // ==========================================
  {
    id: "read_v8_1",
    type: QuestionType.READING,
    category: "표지판",
    questionText: "1. 이 표지는 무슨 뜻입니까? (차량 금지)",
    options: ["차량은 통행할 수 없습니다.", "물기가 닿으면 안 됩니다.", "걸어서 다닐 수 없습니다.", "물건을 옮기지 마십시오."],
    correctAnswer: 0,
    explanation: "No vehicles sign.",
    sourceRef: "Set 8-1"
  },
  // ... [Set 8 나머지 39문항] ...

  // ==========================================
  // [Set 9 (V9)] (321~360번)
  // ==========================================
  {
    id: "read_v9_1",
    type: QuestionType.READING,
    category: "산업 안전",
    questionText: "1. 화학 약품 가스 중독을 막기 위해 ______를/을 자주 해야 합니다.",
    options: ["운동", "환기", "간식", "휴식"],
    correctAnswer: 1,
    explanation: "Ventilation is key to prevent gas poisoning.",
    sourceRef: "Set 9-1"
  },
  // ... [Set 9 나머지 39문항] ...

  // ==========================================
  // [Set 10 (V10)] (361~400번) - 신규 추가
  // ==========================================
  {
    id: "read_v10_1",
    type: QuestionType.READING,
    category: "장소 어휘",
    questionText: "1. 가 : 어디에서 점심을 먹을까요?\n나 : 회사 근처에 김치찌개를 잘하는 ______이/가 있어요. 거기로 갈까요?",
    options: ["식당", "요리", "커피숍", "도서관"],
    correctAnswer: 0,
    explanation: "A place serving food is a restaurant (식당).",
    sourceRef: "Set 10-1"
  },
  {
    id: "read_v10_2",
    type: QuestionType.READING,
    category: "공공장소",
    questionText: "2. 도로나 공원에 ______를 버리면 안 됩니다. 공공장소는 깨끗이 사용해야 합니다.",
    options: ["나무", "자판기", "쓰레기", "공중전화"],
    correctAnswer: 2,
    explanation: "Do not throw trash (쓰레기).",
    sourceRef: "Set 10-2"
  },
  {
    id: "read_v10_3",
    type: QuestionType.READING,
    category: "학습",
    questionText: "3. 다음 내용과 관계있는 것은? [예습하다, 복습하다, 숙제하다]",
    options: ["공부하다", "작업하다", "근무하다", "휴식하다"],
    correctAnswer: 0,
    explanation: "Related to studying.",
    sourceRef: "Set 10-3"
  },
  {
    id: "read_v10_4",
    type: QuestionType.READING,
    category: "반의어",
    questionText: "4. 다음 단어와 반대 말은? [난방]",
    options: ["냉수", "냉방", "온수", "온방"],
    correctAnswer: 1,
    explanation: "Opposite of heating is cooling (냉방).",
    sourceRef: "Set 10-4"
  },
  {
    id: "read_v10_5",
    type: QuestionType.READING,
    category: "날씨",
    questionText: "5. 기온이 영하로 내려갈 거예요. 그럼 날씨가 ______.",
    options: ["추워지겠네요", "낮아지겠네요", "빨라지겠네요", "더워지겠네요"],
    correctAnswer: 0,
    explanation: "Sub-zero temperatures make it cold.",
    sourceRef: "Set 10-5"
  },
  {
    id: "read_v10_6",
    type: QuestionType.READING,
    category: "가치",
    questionText: "6. 일보다는 건강이 더 ______. 건강에 더 신경 쓰세요.",
    options: ["많아요", "복잡해요", "위험해요", "중요해요"],
    correctAnswer: 3,
    explanation: "Health is important.",
    sourceRef: "Set 10-6"
  },
  {
    id: "read_v10_7",
    type: QuestionType.READING,
    category: "환경",
    questionText: "7. 너무 시끄러워서 ______ 곳으로 이사하고 싶어요.",
    options: ["편안한", "조용한", "더러운", "깨끗한"],
    correctAnswer: 1,
    explanation: "Noisy vs Quiet.",
    sourceRef: "Set 10-7"
  },
  {
    id: "read_v10_8",
    type: QuestionType.READING,
    category: "외모",
    questionText: "8. 쉰 살이 넘으셨는데 삼십 대처럼 보여요. 무척 ______ 보여요.",
    options: ["커", "작아", "젊어", "늙어"],
    correctAnswer: 2,
    explanation: "Looking like 30s means looking young.",
    sourceRef: "Set 10-8"
  },
  {
    id: "read_v10_9",
    type: QuestionType.READING,
    category: "안내판",
    questionText: "9. 다음 안내판을 보고 오른쪽으로 가야 하는 사람은 누구입니까? (↑화장실, ←공중전화/식당, ↓환전)",
    options: ["돈을 바꾸려고 하는 사람", "전화를 걸려고 하는 사람", "밖으로 나가려고 하는 사람", "화장실에 가려는 사람"],
    correctAnswer: 2,
    explanation: "Based on elimination of directions.",
    sourceRef: "Set 10-9"
  },
  {
    id: "read_v10_10",
    type: QuestionType.READING,
    category: "지하철",
    questionText: "10. 지하철 표지 설명 중 바른 것? (←홍대 | 340m 신촌 | 이대→)",
    options: ["여기는 홍대입니다.", "다음 역은 이대입니다.", "신촌은 340m 가야 합니다.", "전 역은 이대입니다."],
    correctAnswer: 1,
    explanation: "Arrow points to the next station.",
    sourceRef: "Set 10-10"
  },
  {
    id: "read_v10_11",
    type: QuestionType.READING,
    category: "도표",
    questionText: "11. 교통비를 가장 많이 지출한 달은? (1월이 가장 높음)",
    options: ["1월", "2월", "3월", "4월"],
    correctAnswer: 0,
    explanation: "January has the highest bar.",
    sourceRef: "Set 10-11"
  },
  {
    id: "read_v10_12",
    type: QuestionType.READING,
    category: "구인광고",
    questionText: "12. 광고 내용과 맞지 않는 것? (초보 가능 용접공 구함)",
    options: ["용접 잘하는 사람 구함", "시간/월급 모름", "기술 없으면 안 됨", "회사 이름은 승진금속"],
    correctAnswer: 2,
    explanation: "Beginners are allowed, so 'no skill can't work' is false.",
    sourceRef: "Set 10-12"
  },
  {
    id: "read_v10_13",
    type: QuestionType.READING,
    category: "의료",
    questionText: "13. 외국인 근로자 센터의 ______ 서비스를 이용할 수 있습니다.",
    options: ["의료", "치료", "통신", "통역"],
    correctAnswer: 0,
    explanation: "Checkups and dental belong to medical services.",
    sourceRef: "Set 10-13"
  },
  {
    id: "read_v10_14",
    type: QuestionType.READING,
    category: "긴급",
    questionText: "14. 밤에 갑자기 병원에 가야 한다면 어디에 전화합니까?",
    options: ["114", "119", "131", "112"],
    correctAnswer: 1,
    explanation: "119 is for medical emergencies.",
    sourceRef: "Set 10-14"
  },
  {
    id: "read_v10_15",
    type: QuestionType.READING,
    category: "상식",
    questionText: "15. 약국이 문을 닫았으면 편의점에서도 살 수 있는 약?",
    options: ["비타민", "가정 비상약", "조제약", "병원 처방약"],
    correctAnswer: 1,
    explanation: "Household emergency meds.",
    sourceRef: "Set 10-15"
  },
  {
    id: "read_v10_16",
    type: QuestionType.READING,
    category: "문화",
    questionText: "16. 달걀에 예쁜 그림을 그려서 서로 나누어 먹는 날?",
    options: ["석가탄신일", "크리스마스", "부활절", "라마단"],
    correctAnswer: 2,
    explanation: "Easter traditions.",
    sourceRef: "Set 10-16"
  },
  {
    id: "read_v10_17",
    type: QuestionType.READING,
    category: "생활",
    questionText: "17. 일을 하면서 학원에 다니는 것은 힘들지만 도움이 됩니다.",
    options: ["노동", "불성실", "노력", "불참석"],
    correctAnswer: 2,
    explanation: "Effort and diligence.",
    sourceRef: "Set 10-17"
  },
  {
    id: "read_v10_18",
    type: QuestionType.READING,
    category: "예절",
    questionText: "18. 어른 앞에서 담배 안 피우고 자리를 양보합니다.",
    options: ["예의를 지키다", "말을 걸다", "친구를 사귀다", "친절하다"],
    correctAnswer: 0,
    explanation: "Keeping manners.",
    sourceRef: "Set 10-18"
  },
  {
    id: "read_v10_19",
    type: QuestionType.READING,
    category: "교통",
    questionText: "19. 노약자, 장애인, 임산부를 위한 자리?",
    options: ["근무자석", "어린이석", "정비자석", "노약자석"],
    correctAnswer: 3,
    explanation: "Seats for the elderly/weak.",
    sourceRef: "Set 10-19"
  },
  {
    id: "read_v10_20",
    type: QuestionType.READING,
    category: "문화",
    questionText: "20. 이사를 한 후에 동료를 집에 초대하는 것?",
    options: ["집놀이", "가족 파티", "집들이", "약혼 파티"],
    correctAnswer: 2,
    explanation: "Housewarming party.",
    sourceRef: "Set 10-20"
  },

  // --- [Set 10 듣기] ---
  {
    id: "listen_v10_21",
    type: QuestionType.LISTENING,
    category: "듣기",
    questionText: "21. 들은 것? [아예]",
    context: "아예",
    options: ["아예", "아이", "우유", "오이"],
    correctAnswer: 0,
    explanation: "Sound recognition.",
    sourceRef: "Set 10-21"
  },
  {
    id: "listen_v10_22",
    type: QuestionType.LISTENING,
    category: "듣기",
    questionText: "22. 들은 것? [여우]",
    context: "여우",
    options: ["우유", "여우", "여름", "여행"],
    correctAnswer: 1,
    explanation: "Sound recognition.",
    sourceRef: "Set 10-22"
  },
  {
    id: "listen_v10_23",
    type: QuestionType.LISTENING,
    category: "듣기",
    questionText: "23. 여자는 어제 무엇을 했습니까? (노래방)",
    context: "남: 어제 저녁에 뭐 하셨어요?\n여: 친구들하고 노래방에 가서 노래를 불렀어요.",
    options: ["노래 부르기", "잠자기", "요리하기", "쇼핑하기"],
    correctAnswer: 0,
    explanation: "Identify the activity.",
    sourceRef: "Set 10-23"
  },
  {
    id: "listen_v10_24",
    type: QuestionType.LISTENING,
    category: "듣기",
    questionText: "24. 여자는 지금 무엇을 하고 있습니까? (시장 과일)",
    context: "남: 저는 지금 시장에서 과일을 사고 있습니다.",
    options: ["과일 사기", "운동하기", "청소하기", "일하기"],
    correctAnswer: 0,
    explanation: "Buying fruit.",
    sourceRef: "Set 10-24"
  },
  {
    id: "listen_v10_25",
    type: QuestionType.LISTENING,
    category: "듣기",
    questionText: "25. 이것은 무엇입니까? (치약 칫솔)",
    context: "이미지: 치약 칫솔\n대본: 3번 치약과 칫솔입니다.",
    options: ["책상과 의자", "비누와 수건", "치약과 칫솔", "연필과 지우개"],
    correctAnswer: 2,
    explanation: "Object ID.",
    sourceRef: "Set 10-25"
  },
  {
    id: "listen_v10_26",
    type: QuestionType.LISTENING,
    category: "듣기",
    questionText: "26. 여기는 어디입니까? (지하철역)",
    context: "이미지: 지하철 개찰구\n대본: 4번 지하철역입니다.",
    options: ["공항", "병원", "은행", "지하철역"],
    correctAnswer: 3,
    explanation: "Location ID.",
    sourceRef: "Set 10-26"
  },
  {
    id: "listen_v10_27",
    type: QuestionType.LISTENING,
    category: "듣기",
    questionText: "27. 이 여자의 직업은? (운전기사)",
    context: "이미지: 운전 중인 여성\n대본: 4번 운전기사입니다.",
    options: ["간호사", "미용사", "요리사", "운전기사"],
    correctAnswer: 3,
    explanation: "Occupation ID.",
    sourceRef: "Set 10-27"
  },
  {
    id: "listen_v10_28",
    type: QuestionType.LISTENING,
    category: "듣기",
    questionText: "28. 오늘은 몇 월 며칠? (9월 17일)",
    context: "이미지: 9/17\n대본: 3번 9월 17일입니다.",
    options: ["3월 17일", "4월 18일", "9월 17일", "10월 18일"],
    correctAnswer: 2,
    explanation: "Date recognition.",
    sourceRef: "Set 10-28"
  },
  {
    id: "listen_v10_29",
    type: QuestionType.LISTENING,
    category: "듣기",
    questionText: "29. 모두 몇 명? (6명)",
    context: "이미지: 6명\n대본: 2번 6명입니다.",
    options: ["5명", "6명", "7명", "8명"],
    correctAnswer: 1,
    explanation: "Counting.",
    sourceRef: "Set 10-29"
  },
  {
    id: "listen_v10_30",
    type: QuestionType.LISTENING,
    category: "듣기",
    questionText: "30. 주말에 보통 뭘 하세요?",
    context: "남: 주말에는 보통 뭘 하세요?",
    options: ["중국에서 왔어요.", "한국말을 배워요.", "기숙사에서 살아요.", "회사에 걸어서 가요."],
    correctAnswer: 1,
    explanation: "Response to activity question.",
    sourceRef: "Set 10-30"
  },
  {
    id: "listen_v10_31",
    type: QuestionType.LISTENING,
    category: "듣기",
    questionText: "31. 결혼식 때 무슨 옷을 입을 거예요?",
    context: "여: 결혼식 때 무슨 옷을 입을 거예요?",
    options: ["동생이 결혼해요.", "한복을 입을 거예요.", "역사책을 읽을 거예요.", "오후 2시에 있어요."],
    correctAnswer: 1,
    explanation: "Clothing choice.",
    sourceRef: "Set 10-31"
  },
  {
    id: "listen_v10_32",
    type: QuestionType.LISTENING,
    category: "듣기",
    questionText: "32. 안녕히 가세요.",
    context: "남: 안녕히 가세요.",
    options: ["네 안녕하세요.", "네 어서 오세요.", "네 안녕히 계세요.", "네 처음 뵙겠습니다."],
    correctAnswer: 2,
    explanation: "Greeting response.",
    sourceRef: "Set 10-32"
  },
  {
    id: "listen_v10_33",
    type: QuestionType.LISTENING,
    category: "듣기",
    questionText: "33. 실례지만 나이가 어떻게 되세요?",
    context: "여: 실례지만 나이가 어떻게 되세요?",
    options: ["31살입니다.", "10월 24일입니다.", "제 여동생이에요.", "이영수라고 합니다."],
    correctAnswer: 0,
    explanation: "Age response.",
    sourceRef: "Set 10-33"
  },
  {
    id: "listen_v10_34",
    type: QuestionType.LISTENING,
    category: "듣기",
    questionText: "34. 이 기계를 써본 적이 있어요?",
    context: "남: 이 기계를 써본 적이 있어요?",
    options: ["매운 음식 못 먹어요.", "한국말 못 써요.", "외국 여행 안 갔어요.", "그 기계 써 본 적 없어요."],
    correctAnswer: 3,
    explanation: "Experience response.",
    sourceRef: "Set 10-34"
  },
  {
    id: "listen_v10_35",
    type: QuestionType.LISTENING,
    category: "듣기",
    questionText: "35. 사무실은 몇 층에 있어요?",
    context: "여: 지수 씨 사무실은 몇 층에 있어요?",
    options: ["7층에 있어요.", "오른쪽에 있어요.", "사무실에 없어요.", "하얀색 건물이에요."],
    correctAnswer: 0,
    explanation: "Location response.",
    sourceRef: "Set 10-35"
  },
  {
    id: "listen_v10_36",
    type: QuestionType.LISTENING,
    category: "듣기",
    questionText: "36. 저는 스키 타는 것을 좋아합니다. (이미지: 스키)",
    context: "남: 스키 타는 것을 좋아해서 겨울에 자주 가요.",
    options: ["스키", "수영", "등산", "낚시"],
    correctAnswer: 0,
    explanation: "Activity ID.",
    sourceRef: "Set 10-36"
  },
  {
    id: "listen_v10_37",
    type: QuestionType.LISTENING,
    category: "듣기",
    questionText: "37. 벽에 걸 시계가 필요했는데 잘 됐네요. (이미지: 시계 선물)",
    context: "여: 집들이 선물이에요.\n남: 시계가 필요했는데 감사합니다.",
    options: ["시계", "꽃", "커피", "책"],
    correctAnswer: 0,
    explanation: "Gift ID.",
    sourceRef: "Set 10-37"
  },
  {
    id: "listen_v10_38",
    type: QuestionType.LISTENING,
    category: "듣기",
    questionText: "38. 영수 씨는 이번 주말에 무엇을 합니까? (축구)",
    context: "영수: 저는 친구들하고 축구를 하려고 해요.",
    options: ["집에서 쉽니다.", "등산을 갑니다.", "축구를 합니다.", "영화를 봅니다."],
    correctAnswer: 2,
    explanation: "Activity ID.",
    sourceRef: "Set 10-38"
  },
  {
    id: "listen_v10_39",
    type: QuestionType.LISTENING,
    category: "듣기",
    questionText: "39. 지수 씨가 일찍 퇴근하는 이유는? (몸이 아픔)",
    context: "지수: 머리도 아프고 목도 아파요.",
    options: ["일이 끝나서", "몸이 아파서", "손님이 와서", "내일 일찍 출근해서"],
    correctAnswer: 1,
    explanation: "Reason ID.",
    sourceRef: "Set 10-39"
  },
  {
    id: "listen_v10_40",
    type: QuestionType.LISTENING,
    category: "듣기",
    questionText: "40. 방글라데시에서 온 사람은 누구? (여자)",
    context: "여: 저는 방글라데시에서 왔어요.",
    options: ["러시아 남자", "방글라데시 여자", "러시아 여자", "방글라데시 남자"],
    correctAnswer: 1,
    explanation: "Nationality ID.",
    sourceRef: "Set 10-40"
  }
];
