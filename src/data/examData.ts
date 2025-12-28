
import { Question, QuestionType } from '../types';

/**
 * EPS-TOPIK 400문항 공식 데이터베이스 (Set 1 ~ Set 10)
 * 각 세트는 읽기 20문제, 듣기 20문제로 구성됩니다.
 */
export const STATIC_EXAM_DATA: Question[] = [
  // --- [Set 1] ---
  { id: "read_v1_1", type: QuestionType.READING, category: "Vocabulary", questionText: "1. 다음 그림을 보고 맞는 단어를 고르십시오. (사과)", options: ["포도", "사과", "바나나", "수박"], correctAnswer: 1, explanation: "Apple in Korean is 'Sagwa'.", sourceRef: "Set 1-1" },
  // ... (생략된 1~6세트 문항들) ...

  // --- [Set 7 (V7)] ---
  { id: "read_v7_1", type: QuestionType.READING, category: "고객 응대", questionText: "1. 가 : 어서 오세요, 손님. ________________?\n나 : 휴대폰을 하나 사고 싶은데요.", options: ["실례합니다.", "뭘 드시겠어요?", "괜찮으시겠어요?", "무엇을 찾으세요?"], correctAnswer: 3, explanation: "Standard store greeting.", sourceRef: "Set 7-1" },
  { id: "read_v7_2", type: QuestionType.READING, category: "물건 구매", questionText: "2. 가 : 사과 다섯 개하고 바나나 한 송이 주세요.\n나 : ________________ 모두 10,000원입니다.", options: ["얼마예요?", "뭘 찾으세요?", "여기 있습니다.", "어떻게 오셨어요?"], correctAnswer: 2, explanation: "Handing items over.", sourceRef: "Set 7-2" },
  { id: "read_v7_3", type: QuestionType.READING, category: "기계 작동", questionText: "3. 다음 내용과 관계있는 것은? [누르다, 올리다, 내리다, 돌리다]", options: ["기계교체", "기계청소", "기계작동", "기계운반"], correctAnswer: 2, explanation: "Machine operation verbs.", sourceRef: "Set 7-3" },
  { id: "read_v7_4", type: QuestionType.READING, category: "반의어", questionText: "4. 다음 단어와 반대말은? [증가하다]", options: ["늘어나다", "많아지다", "감소하다", "없어지다"], correctAnswer: 2, explanation: "Increase vs Decrease.", sourceRef: "Set 7-4" },
  { id: "read_v7_5", type: QuestionType.READING, category: "빈도", questionText: "5. 가 : 고향 집에 ________________?\n나 : 일주일에 한 번 정도 해요.", options: ["언제 가요?", "누가 살아요?", "얼마나 있었어요?", "얼마나 자주 전화해요?"], correctAnswer: 3, explanation: "Frequency question.", sourceRef: "Set 7-5" },
  { id: "read_v7_6", type: QuestionType.READING, category: "대상", questionText: "6. 가 : 요리를 정말 잘하네요! ________________?\n나 : 회사 동료가 가르쳐 줬어요.", options: ["어디서 살아요?", "누구한테 배웠어요?", "재료가 뭐예요?", "언제부터 했어요?"], correctAnswer: 1, explanation: "Asking about the teacher.", sourceRef: "Set 7-6" },
  { id: "read_v7_7", type: QuestionType.READING, category: "이름", questionText: "7. 가 : 방을 예약하고 싶은데요.\n나 : ________________?\n가 : 김영수예요.", options: ["댁이 어디세요?", "연세가 어떠세요?", "성함이 어떠세요?", "연락처가 어떠세요?"], correctAnswer: 2, explanation: "Asking for name politely.", sourceRef: "Set 7-7" },
  { id: "read_v7_8", type: QuestionType.READING, category: "교통", questionText: "8. 가 : 어디로 모실까요?\n나 : 광화문으로 가 주세요.\n가 : ________________?\n나 : 광화문 지하철역 근처에 세워 주세요.", options: ["지하철로 가요?", "어디서 기다릴까요?", "지하철역이 어디예요?", "어디쯤에서 내려 드릴까요?"], correctAnswer: 3, explanation: "Asking for drop-off point.", sourceRef: "Set 7-8" },
  { id: "read_v7_9", type: QuestionType.READING, category: "표지판", questionText: "9. 다음 표지를 맞게 설명한 것은? (공사중/우회하세요)", options: ["우회전하십시오.", "주차 마십시오.", "돌아가십시오.", "안전모 착용하십시오."], correctAnswer: 2, explanation: "Detour sign.", sourceRef: "Set 7-9" },
  { id: "read_v7_10", type: QuestionType.READING, category: "캠페인", questionText: "10. 다음 표지를 맞게 설명한 것은? (매월 4일 안전점검)", options: ["매달 4일에 점검합니다.", "한 달에 네 번 합니다.", "4일마다 한 번 합니다.", "네 번째 일요일에 합니다."], correctAnswer: 0, explanation: "Safety check on the 4th.", sourceRef: "Set 7-10" },
  { id: "read_v7_11", type: QuestionType.READING, category: "안내판", questionText: "11. 어린이 옷을 사려면 몇 층에 가야 합니까? (3층 아동)", options: ["1층", "2층", "3층", "4층"], correctAnswer: 2, explanation: "Children's wear on 3F.", sourceRef: "Set 7-11" },
  { id: "read_v7_12", type: QuestionType.READING, category: "도표", questionText: "12. 가장 많은 관광객이 온 나라는? (미국 8.2)", options: ["미국", "아시아", "중동", "기타"], correctAnswer: 0, explanation: "USA is highest.", sourceRef: "Set 7-12" },
  { id: "read_v7_13", type: QuestionType.READING, category: "대명사", questionText: "13. 시장에 갔어요. ______에서 과일을 샀어요.", options: ["저기", "어디", "거기", "여기"], correctAnswer: 2, explanation: "Referring back to market.", sourceRef: "Set 7-13" },
  { id: "read_v7_14", type: QuestionType.READING, category: "신분", questionText: "14. 네팔에서 왔습니다. 제 ______은 네팔입니다.", options: ["취미", "가족", "이름", "고향"], correctAnswer: 3, explanation: "Hometown is Nepal.", sourceRef: "Set 7-14" },
  { id: "read_v7_15", type: QuestionType.READING, category: "도구", questionText: "15. 가구 공장에서 일해요. 오늘은 전기드릴로 구멍을 뚫었습니다.", options: ["철공소 도구", "용접 도구", "가구 공장 도구", "핵심 장비"], correctAnswer: 2, explanation: "Furniture factory tools.", sourceRef: "Set 7-15" },
  { id: "read_v7_16", type: QuestionType.READING, category: "작업", questionText: "16. 안전 스위치를 누르고 전원을 올리면 작동해요.", options: ["작동법", "수리법", "손질법", "청소법"], correctAnswer: 0, explanation: "Operating manual.", sourceRef: "Set 7-16" },
  { id: "read_v7_17", type: QuestionType.READING, category: "내용", questionText: "17. 민수 씨는 기계 작동을 몰라서 물건을 옮기고 있어요.", options: ["냄비 만듦", "물건 옮김", "작동법 암", "작동 배움"], correctAnswer: 1, explanation: "Current task is moving items.", sourceRef: "Set 7-17" },
  { id: "read_v7_18", type: QuestionType.READING, category: "지시", questionText: "18. 오늘은 거푸집을 설치하고 철근을 조립할 겁니다.", options: ["작업 지시", "작업 확인", "안전작업", "안전근무"], correctAnswer: 0, explanation: "Work instruction.", sourceRef: "Set 7-18" },
  { id: "read_v7_19", type: QuestionType.READING, category: "전원", questionText: "19. 사용 후에는 반드시 전원 스위치를 ______ 합니다.", options: ["넣어야", "내려야", "꽂아야", "작동해야"], correctAnswer: 1, explanation: "Turn off after use.", sourceRef: "Set 7-19" },
  { id: "read_v7_20", type: QuestionType.READING, category: "동사", questionText: "20. 칼로 종이를 ______ 때는 손 조심해야 합니다.", options: ["잴", "붙일", "자를", "접을"], correctAnswer: 2, explanation: "Cutting paper.", sourceRef: "Set 7-20" },

  // --- [Set 10 (V10)] ---
  {
    id: "read_v10_1",
    type: QuestionType.READING,
    category: "장소",
    questionText: "1. 가 : 어디에서 점심을 먹을까요?\n나 : 회사 근처에 김치찌개를 잘하는 ______이/가 있어요. 거기로 갈까요?",
    options: ["식당", "요리", "커피숍", "도서관"],
    correctAnswer: 0,
    explanation: "Eating place is a restaurant.",
    sourceRef: "Set 10-1"
  },
  {
    id: "read_v10_2",
    type: QuestionType.READING,
    category: "공공",
    questionText: "2. 도로나 공원에 ______를 버리면 안 됩니다. 공공장소는 깨끗이 사용해야 합니다.",
    options: ["나무", "자판기", "쓰레기", "공중전화"],
    correctAnswer: 2,
    explanation: "Do not throw trash.",
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
    explanation: "Heating vs Cooling.",
    sourceRef: "Set 10-4"
  },
  {
    id: "read_v10_5",
    type: QuestionType.READING,
    category: "날씨",
    questionText: "5. 가 : 눈이 많이 오네요. 눈이 그친 후에는 기온이 영하로 내려갈 거예요.\n나 : 그럼 날씨가 ______.",
    options: ["추워지겠네요", "낮아지겠네요", "빨라지겠네요", "더워지겠네요"],
    correctAnswer: 0,
    explanation: "Temperature drop leads to cold weather.",
    sourceRef: "Set 10-5"
  },
  {
    id: "read_v10_6",
    type: QuestionType.READING,
    category: "가치",
    questionText: "6. 가 : 일을 너무 많이 하는 거 아니에요? 일보다는 건강이 더 ______. 건강에 더 신경 쓰세요.",
    options: ["많아요", "복잡해요", "위험해요", "중요해요"],
    correctAnswer: 3,
    explanation: "Health is important.",
    sourceRef: "Set 10-6"
  },
  {
    id: "read_v10_7",
    type: QuestionType.READING,
    category: "환경",
    questionText: "7. 우리 집은 큰길에서 가깝고 교통도 편리해요. 그렇지만 너무 시끄러워서 ______ 곳으로 이사하고 싶어요.",
    options: ["편안한", "조용한", "더러운", "깨끗한"],
    correctAnswer: 1,
    explanation: "Seeking a quiet place.",
    sourceRef: "Set 10-7"
  },
  {
    id: "read_v10_8",
    type: QuestionType.READING,
    category: "외모",
    questionText: "8. 가 : 과장님은 무척 ______ 보여요. 안 그래요?\n나 : 맞아요. 쉰 살이 넘으셨는데 삼십 대처럼 보여요.",
    options: ["커", "작아", "젊어", "늙어"],
    correctAnswer: 2,
    explanation: "Looking young.",
    sourceRef: "Set 10-8"
  },
  {
    id: "read_v10_9",
    type: QuestionType.READING,
    category: "안내",
    questionText: "9. 다음 안내판을 보고 오른쪽으로 가야 하는 사람은 누구입니까? (↑화장실, ←공중전화/식사, ↓환전)",
    options: ["돈을 바꿀 사람", "전화를 걸 사람", "밖으로 나갈 사람", "화장실에 갈 사람"],
    correctAnswer: 2,
    explanation: "Elimination of other directions.",
    sourceRef: "Set 10-9"
  },
  {
    id: "read_v10_10",
    type: QuestionType.READING,
    category: "지하철",
    questionText: "10. 지하철 표지 설명 중 바른 것? (←홍대 | 340m 신촌 | 이대→)",
    options: ["여기는 홍대입니다.", "다음 역은 이대입니다.", "신촌은 340m 가야 합니다.", "전 역은 이대입니다."],
    correctAnswer: 1,
    explanation: "Direction indicator.",
    sourceRef: "Set 10-10"
  },
  {
    id: "read_v10_11",
    type: QuestionType.READING,
    category: "도표",
    questionText: "11. 교통비를 가장 많이 지출한 달은? (1월 막대 최고)",
    options: ["1월", "2월", "3월", "4월"],
    correctAnswer: 0,
    explanation: "Data analysis.",
    sourceRef: "Set 10-11"
  },
  {
    id: "read_v10_12",
    type: QuestionType.READING,
    category: "구인",
    questionText: "12. 구인 광고 내용과 맞지 않는 것? (용접공, 초보가능, 시흥시)",
    options: ["용접 잘하는 사람 구함", "시간/월급 모름", "기술 없으면 안 됨", "회사 이름 승진금속"],
    correctAnswer: 2,
    explanation: "Beginners allowed.",
    sourceRef: "Set 10-12"
  },
  {
    id: "read_v10_13",
    type: QuestionType.READING,
    category: "의료",
    questionText: "13. 근로자 센터에서는 내과, 치과뿐만 아니라 종합검진까지 ______ 서비스가 가능합니다.",
    options: ["의료", "치료", "통신", "통역"],
    correctAnswer: 0,
    explanation: "Medical services.",
    sourceRef: "Set 10-13"
  },
  {
    id: "read_v10_14",
    type: QuestionType.READING,
    category: "긴급",
    questionText: "14. 밤에 갑자기 병원에 가야 한다면 어디에 도움을 요청해야 할까요? 바로 ______ 입니다.",
    options: ["114", "119", "131", "112"],
    correctAnswer: 1,
    explanation: "Emergency call 119.",
    sourceRef: "Set 10-14"
  },
  {
    id: "read_v10_15",
    type: QuestionType.READING,
    category: "약품",
    questionText: "15. 편의점에서 감기약, 소화제, 파스와 같은 약을 살 수 있습니다.",
    options: ["비타민", "가정 비상약", "조제약", "병원 처방약"],
    correctAnswer: 1,
    explanation: "Household emergency medicine.",
    sourceRef: "Set 10-15"
  },
  {
    id: "read_v10_16",
    type: QuestionType.READING,
    category: "명절",
    questionText: "16. 달걀에 예쁜 그림을 그려서 서로 나누어 먹는 날?",
    options: ["석가탄신일", "크리스마스", "부활절", "라마단"],
    correctAnswer: 2,
    explanation: "Easter.",
    sourceRef: "Set 10-16"
  },
  {
    id: "read_v10_17",
    type: QuestionType.READING,
    category: "태도",
    questionText: "17. 일을 하면서 한국어를 배우러 학원에 다닙니다. 힘들지만 보람차요.",
    options: ["노동", "불성실", "노력", "불참석"],
    correctAnswer: 2,
    explanation: "Making an effort.",
    sourceRef: "Set 10-17"
  },
  {
    id: "read_v10_18",
    type: QuestionType.READING,
    category: "예절",
    questionText: "18. 어른 앞에서는 담배 안 피우고 자리를 양보합니다.",
    options: ["예의를 지키다", "말을 걸다", "친구를 사귀다", "친절하다"],
    correctAnswer: 0,
    explanation: "Etiquette.",
    sourceRef: "Set 10-18"
  },
  {
    id: "read_v10_19",
    type: QuestionType.READING,
    category: "시설",
    questionText: "19. 노약자, 장애인, 임산부, 어린이를 데리고 있는 사람을 위한 자리?",
    options: ["근무자석", "어린이석", "정비자석", "노약자석"],
    correctAnswer: 3,
    explanation: "Special seats.",
    sourceRef: "Set 10-19"
  },
  {
    id: "read_v10_20",
    type: QuestionType.READING,
    category: "문화",
    questionText: "20. 이사를 한 후에 동료를 초대하여 음식을 장만합니다.",
    options: ["집놀이", "가족 파티", "집들이", "약혼 파티"],
    correctAnswer: 2,
    explanation: "Housewarming.",
    sourceRef: "Set 10-20"
  },

  // --- [Set 10 Listening] ---
  { id: "listen_v10_21", type: QuestionType.LISTENING, category: "청취", questionText: "21. 들은 것? [아예]", context: "아예", options: ["아예", "아이", "우유", "오이"], correctAnswer: 0, explanation: "Sound match.", sourceRef: "Set 10-21" },
  { id: "listen_v10_22", type: QuestionType.LISTENING, category: "청취", questionText: "22. 들은 것? [여우]", context: "여우", options: ["우유", "여우", "여름", "여행"], correctAnswer: 1, explanation: "Sound match.", sourceRef: "Set 10-22" },
  { id: "listen_v10_23", type: QuestionType.LISTENING, category: "청취", questionText: "23. 무엇을 했습니까?", context: "여: 노래방에 가서 노래를 불렀어요.", options: ["노래 부르기", "잠자기", "요리하기", "쇼핑하기"], correctAnswer: 0, explanation: "Activity.", sourceRef: "Set 10-23" },
  { id: "listen_v10_24", type: QuestionType.LISTENING, category: "청취", questionText: "24. 무엇을 합니까?", context: "남: 시장에서 과일을 사고 있습니다.", options: ["과일 사기", "운동하기", "청소하기", "일하기"], correctAnswer: 0, explanation: "Buying fruit.", sourceRef: "Set 10-24" },
  { id: "listen_v10_25", type: QuestionType.LISTENING, category: "청취", questionText: "25. 무엇입니까? (치약 칫솔)", context: "대본: 3번 치약과 칫솔입니다.", options: ["책상과 의자", "비누와 수건", "치약과 칫솔", "연필과 지우개"], correctAnswer: 2, explanation: "Object ID.", sourceRef: "Set 10-25" },
  { id: "listen_v10_26", type: QuestionType.LISTENING, category: "청취", questionText: "26. 어디입니까? (지하철역)", context: "대본: 4번 지하철역입니다.", options: ["공항", "병원", "은행", "지하철역"], correctAnswer: 3, explanation: "Location ID.", sourceRef: "Set 10-26" },
  { id: "listen_v10_27", type: QuestionType.LISTENING, category: "청취", questionText: "27. 직업은 무엇입니까?", context: "대본: 4번 운전기사입니다.", options: ["간호사", "미용사", "요리사", "운전기사"], correctAnswer: 3, explanation: "Occupation.", sourceRef: "Set 10-27" },
  { id: "listen_v10_28", type: QuestionType.LISTENING, category: "청취", questionText: "28. 몇 월 며칠입니까?", context: "대본: 3번 9월 17일입니다.", options: ["3월 17일", "4월 18일", "9월 17일", "10월 18일"], correctAnswer: 2, explanation: "Date.", sourceRef: "Set 10-28" },
  { id: "listen_v10_29", type: QuestionType.LISTENING, category: "청취", questionText: "29. 모두 몇 명입니까?", context: "대본: 2번 6명입니다.", options: ["5명", "6명", "7명", "8명"], correctAnswer: 1, explanation: "Counting.", sourceRef: "Set 10-29" },
  { id: "listen_v10_30", type: QuestionType.LISTENING, category: "청취", questionText: "30. 주말에는 뭘 하세요?", context: "남: 주말에는 보통 뭘 하세요?", options: ["중국서 왔어요.", "한국말 배워요.", "기숙사 살아요.", "걸어서 가요."], correctAnswer: 1, explanation: "Conversation.", sourceRef: "Set 10-30" },
  { id: "listen_v10_31", type: QuestionType.LISTENING, category: "청취", questionText: "31. 무슨 옷을 입을 거예요?", context: "여: 무슨 옷을 입을 거예요?", options: ["동생 결혼해요.", "한복 입을 거예요.", "책 읽을 거예요.", "2시에 있어요."], correctAnswer: 1, explanation: "Clothing.", sourceRef: "Set 10-31" },
  { id: "listen_v10_32", type: QuestionType.LISTENING, category: "청취", questionText: "32. 안녕히 가세요.", context: "남: 안녕히 가세요.", options: ["네 안녕하세요.", "네 어서 오세요.", "네 안녕히 계세요.", "네 처음 봽죠."], correctAnswer: 2, explanation: "Greeting.", sourceRef: "Set 10-32" },
  { id: "listen_v10_33", type: QuestionType.LISTENING, category: "청취", questionText: "33. 나이가 어떻게 되세요?", context: "여: 나이가 어떻게 되세요?", options: ["31살입니다.", "10월 24일입니다.", "제 여동생예요.", "이영수입니다."], correctAnswer: 0, explanation: "Age.", sourceRef: "Set 10-33" },
  { id: "listen_v10_34", type: QuestionType.LISTENING, category: "청취", questionText: "34. 기계를 써본 적 있어요?", context: "남: 기계를 써본 적 있어요?", options: ["음식 못 먹어요.", "한국말 못 써요.", "여행 안 갔어요.", "써 본 적 없어요."], correctAnswer: 3, explanation: "Experience.", sourceRef: "Set 10-34" },
  { id: "listen_v10_35", type: QuestionType.LISTENING, category: "청취", questionText: "35. 사무실은 몇 층에 있어요?", context: "여: 사무실은 몇 층에 있어요?", options: ["7층에 있어요.", "오른쪽에 있어요.", "사무실 없어요.", "하얀 건물예요."], correctAnswer: 0, explanation: "Location.", sourceRef: "Set 10-35" },
  { id: "listen_v10_36", type: QuestionType.LISTENING, category: "청취", questionText: "36. 들은 그림을 고르십시오. (스키)", context: "남: 겨울에 자주 스키를 타요.", options: ["스키", "수영", "등산", "낚시"], correctAnswer: 0, explanation: "Activity.", sourceRef: "Set 10-36" },
  { id: "listen_v10_37", type: QuestionType.LISTENING, category: "청취", questionText: "37. 들은 그림을 고르십시오. (시계)", context: "남: 벽시계가 필요했는데 감사합니다.", options: ["시계", "꽃", "커피", "책"], correctAnswer: 0, explanation: "Gift.", sourceRef: "Set 10-37" },
  { id: "listen_v10_38", type: QuestionType.LISTENING, category: "청취", questionText: "38. 무엇을 하려고 합니까?", context: "영수: 축구를 하려고 해요.", options: ["집에서 쉼", "등산", "축구", "영화"], correctAnswer: 2, explanation: "Goal.", sourceRef: "Set 10-38" },
  { id: "listen_v10_39", type: QuestionType.LISTENING, category: "청취", questionText: "39. 퇴근하는 이유는?", context: "지수: 머리도 아프고 목도 아파요.", options: ["일 끝나서", "몸 아파서", "손님 와서", "내일 일찍"], correctAnswer: 1, explanation: "Reason.", sourceRef: "Set 10-39" },
  { id: "listen_v10_40", type: QuestionType.LISTENING, category: "청취", questionText: "40. 방글라데시 사람?", context: "여: 저는 방글라데시에서 왔어요.", options: ["러시아 남", "방글라데시 여", "러시아 여", "방글라데시 남"], correctAnswer: 1, explanation: "Nationality.", sourceRef: "Set 10-40" }
];
