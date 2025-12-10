import { Question, QuestionType } from '../types';

export const STATIC_EXAM_DATA: Question[] = [
  // --- [READING SET] ---
  
  // Q1 (Image: Sofa)
  {
    id: "read_sample_1",
    type: QuestionType.READING,
    category: "Vocabulary",
    questionText: "다음 그림을 보고 맞는 단어나 문장을 고르십시오.",
    context: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80", 
    options: ["침대입니다.", "옷장입니다.", "소파입니다.", "식탁입니다."],
    correctAnswer: 2, 
    explanation: "The image shows a sofa. In Korean, 'Sofa' is '소파'.",
    sourceRef: "Sample Q1"
  },
  
  // Q2 (Image: Student reading)
  {
    id: "read_sample_2",
    type: QuestionType.READING,
    category: "Action Verbs",
    questionText: "다음 그림을 보고 맞는 단어나 문장을 고르십시오.",
    context: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80", // Updated to show reading clearly
    options: ["밥을 먹고 있습니다.", "책을 읽고 있습니다.", "물을 마시고 있습니다.", "신문을 보고 있습니다."],
    correctAnswer: 1, 
    explanation: "The person is reading a book. 'Reading a book' is '책을 읽고 있습니다'.",
    sourceRef: "Sample Q2"
  },

  // Q3 (Fill in blank: Used Goods)
  {
    id: "read_sample_3",
    type: QuestionType.READING,
    category: "Daily Life",
    questionText: "빈칸에 들어갈 가장 알맞은 것을 고르십시오.",
    context: "쓰지 않는 물건은 (       )를 통해서 사고팔 수 있습니다.",
    options: ["할인 행사", "대형 마트", "중고 거래", "주말 특가"],
    correctAnswer: 2, 
    explanation: "Buying and selling items you don't use is called 'Second-hand trading' (중고 거래).",
    sourceRef: "Sample Q3"
  },

  // Q4 (Fill in blank: Real Estate)
  {
    id: "read_sample_4",
    type: QuestionType.READING,
    category: "Places",
    questionText: "빈칸에 들어갈 가장 알맞은 것을 고르십시오.",
    context: "이사할 집을 구하려고 (       )에 갔습니다.",
    options: ["경기장", "관광지", "부동산", "백화점"],
    correctAnswer: 2, 
    explanation: "To find a house to move into, you go to a 'Real Estate Agency' (부동산).",
    sourceRef: "Sample Q4"
  },

  // Q5 (Fill in blank: Bus Operation)
  {
    id: "read_sample_5",
    type: QuestionType.READING,
    category: "Transportation",
    questionText: "빈칸에 들어갈 가장 알맞은 것을 고르십시오.",
    context: "고속버스의 주요 노선들은 심야 시간에도 (       ).",
    options: ["운행합니다.", "운전합니다.", "운동합니다.", "운반합니다."],
    correctAnswer: 0, 
    explanation: "Buses running on a route is expressed as 'Operating' (운행합니다).",
    sourceRef: "Sample Q5"
  },

  // Q6 (Fill in blank: Adverb)
  {
    id: "read_sample_6",
    type: QuestionType.READING,
    category: "Grammar/Adverbs",
    questionText: "빈칸에 들어갈 가장 알맞은 것을 고르십시오.",
    context: "인터넷으로 은행 업무를 보는 사람들이 (       ) 늘어나고 있습니다.",
    options: ["점차", "얼른", "항상", "멀리"],
    correctAnswer: 0, 
    explanation: "The number of people is increasing 'gradually' (점차).",
    sourceRef: "Sample Q6"
  },

  // Q7 (Reading Comprehension: Apartment Etiquette)
  {
    id: "read_sample_7",
    type: QuestionType.READING,
    category: "Reading Comprehension",
    questionText: "다음 글을 읽고 내용과 같은 것을 고르십시오.",
    context: "아파트나 원룸과 같은 공동 주택에서는 이웃에게 피해를 주지 않도록 주의해야 합니다. 집 안에서 뛰지 말고 늦은 밤이나 이른 아침에는 세탁기를 사용해서는 안 됩니다. 큰 소리로 음악을 틀어서도 안 됩니다. 화장실에서 담배를 피우면 연기가 이웃집으로 들어갈 수 있으니 특히 조심해야 합니다.",
    options: [
      "집 안 화장실에서는 자유롭게 담배를 피울 수 있습니다.",
      "아파트는 일반 주택보다 소음에 신경 쓸 일이 적습니다.",
      "집 안에서 어린아이들이 뛰는 것은 문제가 되지 않습니다.",
      "다른 사람이 자는 시간에는 세탁기 사용을 피해야 합니다."
    ],
    correctAnswer: 3, 
    explanation: "The text says 'Do not use washing machines late at night or early morning'.",
    sourceRef: "Sample Q7"
  },

  // --- [LISTENING SET] ---

  // Q8 (Listening: Word Recognition - Chair)
  {
    id: "listen_sample_1",
    type: QuestionType.LISTENING,
    category: "Vocabulary",
    questionText: "들은 것을 고르십시오.",
    context: "의자", 
    options: ["여자", "어제", "이사", "의자"],
    correctAnswer: 3, 
    explanation: "The audio says 'Uija' (Chair).",
    sourceRef: "Sample Q8"
  },

  // Q9 (Listening: Word Recognition - Walk)
  {
    id: "listen_sample_2",
    type: QuestionType.LISTENING,
    category: "Vocabulary",
    questionText: "들은 것을 고르십시오.",
    context: "산책", 
    options: ["상처", "산책", "신체", "삼촌"],
    correctAnswer: 1, 
    explanation: "The audio says 'San-chaek' (Stroll/Walk).",
    sourceRef: "Sample Q9"
  },

  // Q10 (Listening: Conversation Response)
  {
    id: "listen_sample_3",
    type: QuestionType.LISTENING,
    category: "Conversation",
    questionText: "다음을 듣고 질문에 알맞은 대답을 고르십시오.",
    context: "여자: 현금 인출기가 어디에 있어요?", 
    options: [
      "예금을 하려고 왔는데요.",
      "은행에 가지 않아도 돼요.",
      "직원 휴게실 옆에 있어요.", 
      "오전에 은행에 다녀왔어요."
    ],
    correctAnswer: 2, 
    explanation: "The woman asks where the ATM is. The correct response gives a location: 'It is next to the staff lounge.'",
    sourceRef: "Sample Q10"
  },

  // Q11 (Listening: Reason for Call)
  {
    id: "listen_sample_4",
    type: QuestionType.LISTENING,
    category: "Reasoning",
    questionText: "남자가 전화한 이유는 무엇입니까?",
    context: `여자: 여보세요 외국인력상담센터입니다 무엇을 도와드릴까요?
남자: 통역 서비스를 신청하고 싶은데 어떻게 해야 돼요?
여자: 무슨 일 때문에 통역이 필요하신 거예요?
남자: 공장장님과 상의해서 근무 시간을 바꾸고 싶은데 한국어를 잘 못해서요.`,
    options: [
      "한국어를 배우고 싶어서",
      "통역 서비스를 이용하려고",
      "상담센터에서 일하고 싶어서",
      "근무 시간에 대해 문의하려고"
    ],
    correctAnswer: 1, 
    explanation: "The man clearly states: 'I want to apply for translation services' (통역 서비스를 신청하고 싶은데).",
    sourceRef: "Sample Q11"
  },

  // Q12 (Listening: Topic)
  {
    id: "listen_sample_5",
    type: QuestionType.LISTENING,
    category: "Topic Inference",
    questionText: "두 사람은 무엇에 대해 말하고 있습니까?",
    context: `여자: 아궁 씨 여기에서는 담배를 피울 수 없어요. 공원이나 버스 정류장처럼 사람이 많은 곳에서는 담배를 피우면 안 돼요.
남자: 몰랐어요. 그럼 담배는 어디에서 피울 수 있어요?`,
    options: [
      "흡연 구역",
      "주차 구역",
      "휴게 공간",
      "취사 공간"
    ],
    correctAnswer: 0, 
    explanation: "They are talking about where one can smoke (Smoking Area/Zone).",
    sourceRef: "Sample Q12"
  }
];