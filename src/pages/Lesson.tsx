import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  RotateCcw, 
  ChevronRight,
  Clock,
  Target,
  Loader2,
  Headphones
} from "lucide-react";
import { cn } from "@/lib/utils";
import ListeningExercise from "@/components/learning/ListeningExercise";

interface Question {
  id: number;
  question: string;
  questionKo: string;
  options: { label: string; value: string }[];
  correctAnswer: string;
  explanation: string;
  explanationKo: string;
}

// Sample questions for different lessons
const lessonQuestions: Record<string, Question[]> = {
  // Level 1 Vocabulary - Basic Greetings
  "v1-1": [
    { id: 1, question: "What is 'Hello' in Korean?", questionKo: "'안녕하세요'의 뜻은?", options: [{ label: "안녕하세요", value: "a" }, { label: "감사합니다", value: "b" }, { label: "죄송합니다", value: "c" }, { label: "괜찮아요", value: "d" }], correctAnswer: "a", explanation: "'안녕하세요' means 'Hello' in Korean polite form.", explanationKo: "'안녕하세요'는 한국어의 공손한 인사말입니다." },
    { id: 2, question: "What does '감사합니다' mean?", questionKo: "'감사합니다'는 무슨 뜻인가요?", options: [{ label: "Sorry", value: "a" }, { label: "Thank you", value: "b" }, { label: "Hello", value: "c" }, { label: "Goodbye", value: "d" }], correctAnswer: "b", explanation: "'감사합니다' means 'Thank you' in formal Korean.", explanationKo: "'감사합니다'는 격식체의 '고맙습니다'입니다." },
    { id: 3, question: "Which is the correct way to say 'Goodbye' when leaving?", questionKo: "떠날 때 하는 인사는?", options: [{ label: "안녕히 가세요", value: "a" }, { label: "안녕히 계세요", value: "b" }, { label: "안녕하세요", value: "c" }, { label: "잘 먹겠습니다", value: "d" }], correctAnswer: "b", explanation: "'안녕히 계세요' is said by the person leaving.", explanationKo: "'안녕히 계세요'는 떠나는 사람이 남는 사람에게 하는 인사입니다." },
    { id: 4, question: "What is '죄송합니다' in English?", questionKo: "'죄송합니다'를 영어로?", options: [{ label: "Excuse me", value: "a" }, { label: "I'm sorry", value: "b" }, { label: "Thank you", value: "c" }, { label: "Please", value: "d" }], correctAnswer: "b", explanation: "'죄송합니다' is a formal way to say 'I'm sorry'.", explanationKo: "'죄송합니다'는 사과할 때 사용하는 격식체입니다." },
    { id: 5, question: "Which phrase do you use before a meal?", questionKo: "식사 전 인사말은?", options: [{ label: "잘 먹었습니다", value: "a" }, { label: "잘 먹겠습니다", value: "b" }, { label: "맛있어요", value: "c" }, { label: "배불러요", value: "d" }], correctAnswer: "b", explanation: "'잘 먹겠습니다' is said before eating.", explanationKo: "'잘 먹겠습니다'는 식사 전에 하는 인사입니다." },
  ],
  // Level 1 Vocabulary - Numbers
  "v1-2": [
    { id: 1, question: "What is '하나' in Sino-Korean numbers?", questionKo: "'하나'를 한자어 숫자로?", options: [{ label: "일", value: "a" }, { label: "이", value: "b" }, { label: "삼", value: "c" }, { label: "사", value: "d" }], correctAnswer: "a", explanation: "'일(一)' is 1 in Sino-Korean.", explanationKo: "'일'은 한자어로 1입니다." },
    { id: 2, question: "Which is '다섯' in English?", questionKo: "'다섯'은 영어로?", options: [{ label: "Three", value: "a" }, { label: "Four", value: "b" }, { label: "Five", value: "c" }, { label: "Six", value: "d" }], correctAnswer: "c", explanation: "'다섯' means five in native Korean.", explanationKo: "'다섯'은 고유어 숫자 5입니다." },
    { id: 3, question: "How do you say 10 in native Korean?", questionKo: "고유어로 10은?", options: [{ label: "십", value: "a" }, { label: "열", value: "b" }, { label: "스물", value: "c" }, { label: "백", value: "d" }], correctAnswer: "b", explanation: "'열' is 10 in native Korean.", explanationKo: "'열'은 고유어 숫자 10입니다." },
    { id: 4, question: "What is 100 in Sino-Korean?", questionKo: "한자어로 100은?", options: [{ label: "십", value: "a" }, { label: "백", value: "b" }, { label: "천", value: "c" }, { label: "만", value: "d" }], correctAnswer: "b", explanation: "'백(百)' means 100.", explanationKo: "'백'은 100입니다." },
    { id: 5, question: "Which is correct for 20 in native Korean?", questionKo: "고유어로 20은?", options: [{ label: "열", value: "a" }, { label: "스물", value: "b" }, { label: "서른", value: "c" }, { label: "마흔", value: "d" }], correctAnswer: "b", explanation: "'스물' is 20 in native Korean.", explanationKo: "'스물'은 고유어 숫자 20입니다." },
  ],
  // Level 1 Grammar - Topic Marker
  "g1-1": [
    { id: 1, question: "Which particle marks the topic?", questionKo: "주제를 나타내는 조사는?", options: [{ label: "이/가", value: "a" }, { label: "을/를", value: "b" }, { label: "은/는", value: "c" }, { label: "에서", value: "d" }], correctAnswer: "c", explanation: "'은/는' marks the topic of a sentence.", explanationKo: "'은/는'은 문장의 주제를 나타냅니다." },
    { id: 2, question: "Choose the correct form: '저___ 학생이에요'", questionKo: "올바른 형태를 고르세요", options: [{ label: "는", value: "a" }, { label: "가", value: "b" }, { label: "을", value: "c" }, { label: "에", value: "d" }], correctAnswer: "a", explanation: "'저는' - 'I am' with topic marker.", explanationKo: "'저는'은 '나'의 겸손한 표현 + 주제 조사입니다." },
    { id: 3, question: "'책은' uses 은 because...", questionKo: "'책은'에서 '은'을 쓴 이유는?", options: [{ label: "책 ends in vowel", value: "a" }, { label: "책 ends in consonant", value: "b" }, { label: "책 is long", value: "c" }, { label: "No reason", value: "d" }], correctAnswer: "b", explanation: "'은' follows consonants, '는' follows vowels.", explanationKo: "받침이 있으면 '은', 없으면 '는'을 씁니다." },
    { id: 4, question: "Complete: '날씨___ 좋아요'", questionKo: "빈칸을 채우세요", options: [{ label: "은", value: "a" }, { label: "가", value: "b" }, { label: "는", value: "c" }, { label: "를", value: "d" }], correctAnswer: "c", explanation: "'날씨' ends in a vowel, so use '는'.", explanationKo: "'날씨'는 받침이 없어서 '는'을 씁니다." },
    { id: 5, question: "What's the difference between 은/는 and 이/가?", questionKo: "은/는과 이/가의 차이는?", options: [{ label: "Topic vs Subject", value: "a" }, { label: "Object vs Subject", value: "b" }, { label: "Same meaning", value: "c" }, { label: "Past vs Present", value: "d" }], correctAnswer: "a", explanation: "'은/는' for topic, '이/가' for subject.", explanationKo: "'은/는'은 주제, '이/가'는 주어를 나타냅니다." },
  ],
};

// Generate default questions for lessons without specific questions
const generateDefaultQuestions = (lessonId: string, category: string): Question[] => {
  const categoryQuestions: Record<string, Question[]> = {
    vocabulary: [
      { id: 1, question: "What is the Korean word for 'water'?", questionKo: "'물'의 의미는?", options: [{ label: "물", value: "a" }, { label: "불", value: "b" }, { label: "술", value: "c" }, { label: "굴", value: "d" }], correctAnswer: "a", explanation: "'물' means water.", explanationKo: "'물'은 water입니다." },
      { id: 2, question: "Which word means 'friend'?", questionKo: "'친구'는 무슨 뜻인가요?", options: [{ label: "가족", value: "a" }, { label: "친구", value: "b" }, { label: "선생님", value: "c" }, { label: "학생", value: "d" }], correctAnswer: "b", explanation: "'친구' means friend.", explanationKo: "'친구'는 friend입니다." },
      { id: 3, question: "What does '학교' mean?", questionKo: "'학교'의 뜻은?", options: [{ label: "Hospital", value: "a" }, { label: "School", value: "b" }, { label: "House", value: "c" }, { label: "Office", value: "d" }], correctAnswer: "b", explanation: "'학교' means school.", explanationKo: "'학교'는 school입니다." },
      { id: 4, question: "Which is 'book' in Korean?", questionKo: "'책'은 영어로?", options: [{ label: "공책", value: "a" }, { label: "책상", value: "b" }, { label: "책", value: "c" }, { label: "가방", value: "d" }], correctAnswer: "c", explanation: "'책' means book.", explanationKo: "'책'은 book입니다." },
      { id: 5, question: "What is '사랑' in English?", questionKo: "'사랑'을 영어로?", options: [{ label: "Life", value: "a" }, { label: "Love", value: "b" }, { label: "Hope", value: "c" }, { label: "Dream", value: "d" }], correctAnswer: "b", explanation: "'사랑' means love.", explanationKo: "'사랑'은 love입니다." },
    ],
    grammar: [
      { id: 1, question: "Which is a subject particle?", questionKo: "주격 조사는?", options: [{ label: "을/를", value: "a" }, { label: "이/가", value: "b" }, { label: "에서", value: "c" }, { label: "으로", value: "d" }], correctAnswer: "b", explanation: "'이/가' marks the subject.", explanationKo: "'이/가'는 주어를 나타냅니다." },
      { id: 2, question: "What form is '-아요/어요'?", questionKo: "'-아요/어요'는 어떤 형태?", options: [{ label: "Formal", value: "a" }, { label: "Informal polite", value: "b" }, { label: "Casual", value: "c" }, { label: "Written", value: "d" }], correctAnswer: "b", explanation: "Informal polite ending.", explanationKo: "비격식 존댓말 어미입니다." },
      { id: 3, question: "Complete: '밥___ 먹어요'", questionKo: "빈칸을 채우세요", options: [{ label: "이", value: "a" }, { label: "을", value: "b" }, { label: "는", value: "c" }, { label: "에", value: "d" }], correctAnswer: "b", explanation: "'을' marks the object.", explanationKo: "'을'은 목적어를 나타냅니다." },
      { id: 4, question: "Which shows past tense?", questionKo: "과거 시제는?", options: [{ label: "-아요", value: "a" }, { label: "-았어요", value: "b" }, { label: "-ㄹ 거예요", value: "c" }, { label: "-고 싶어요", value: "d" }], correctAnswer: "b", explanation: "'-았/었어요' is past tense.", explanationKo: "'-았/었어요'는 과거 시제입니다." },
      { id: 5, question: "What does '-고 싶다' express?", questionKo: "'-고 싶다'는 무엇을 표현?", options: [{ label: "Ability", value: "a" }, { label: "Want/Desire", value: "b" }, { label: "Must", value: "c" }, { label: "Can", value: "d" }], correctAnswer: "b", explanation: "Expresses wanting to do something.", explanationKo: "하고 싶은 것을 표현합니다." },
    ],
    reading: [
      { id: 1, question: "What type of text is an '안내문'?", questionKo: "'안내문'은 어떤 글?", options: [{ label: "Novel", value: "a" }, { label: "Announcement", value: "b" }, { label: "Letter", value: "c" }, { label: "Recipe", value: "d" }], correctAnswer: "b", explanation: "'안내문' is an announcement or notice.", explanationKo: "'안내문'은 알림글입니다." },
      { id: 2, question: "What is '이메일'?", questionKo: "'이메일'이란?", options: [{ label: "Letter", value: "a" }, { label: "Email", value: "b" }, { label: "Message", value: "c" }, { label: "Notice", value: "d" }], correctAnswer: "b", explanation: "'이메일' is email.", explanationKo: "'이메일'은 전자우편입니다." },
      { id: 3, question: "Where would you see a '간판'?", questionKo: "'간판'은 어디서 볼 수 있나요?", options: [{ label: "Book", value: "a" }, { label: "Store front", value: "b" }, { label: "TV", value: "c" }, { label: "Phone", value: "d" }], correctAnswer: "b", explanation: "'간판' is a store sign.", explanationKo: "'간판'은 가게 앞에 있습니다." },
      { id: 4, question: "What is a '메뉴'?", questionKo: "'메뉴'란?", options: [{ label: "Recipe", value: "a" }, { label: "Menu", value: "b" }, { label: "Bill", value: "c" }, { label: "Order", value: "d" }], correctAnswer: "b", explanation: "'메뉴' is a menu.", explanationKo: "'메뉴'는 음식 목록입니다." },
      { id: 5, question: "What type is a '일기'?", questionKo: "'일기'는 어떤 글?", options: [{ label: "News", value: "a" }, { label: "Diary", value: "b" }, { label: "Essay", value: "c" }, { label: "Report", value: "d" }], correctAnswer: "b", explanation: "'일기' is a diary entry.", explanationKo: "'일기'는 일상을 기록한 글입니다." },
    ],
    listening: [
      { id: 1, question: "What skill does listening practice develop?", questionKo: "듣기 연습의 목적은?", options: [{ label: "Writing", value: "a" }, { label: "Comprehension", value: "b" }, { label: "Speaking", value: "c" }, { label: "Reading", value: "d" }], correctAnswer: "b", explanation: "Listening improves comprehension.", explanationKo: "듣기는 이해력을 키웁니다." },
      { id: 2, question: "What is '듣기'?", questionKo: "'듣기'란?", options: [{ label: "Reading", value: "a" }, { label: "Listening", value: "b" }, { label: "Speaking", value: "c" }, { label: "Writing", value: "d" }], correctAnswer: "b", explanation: "'듣기' means listening.", explanationKo: "'듣기'는 listening입니다." },
      { id: 3, question: "What helps with pronunciation?", questionKo: "발음에 도움이 되는 것은?", options: [{ label: "Reading", value: "a" }, { label: "Listening", value: "b" }, { label: "Writing", value: "c" }, { label: "Memorizing", value: "d" }], correctAnswer: "b", explanation: "Listening helps pronunciation.", explanationKo: "듣기가 발음에 도움됩니다." },
      { id: 4, question: "What is an '안내 방송'?", questionKo: "'안내 방송'이란?", options: [{ label: "Song", value: "a" }, { label: "Announcement", value: "b" }, { label: "News", value: "c" }, { label: "Drama", value: "d" }], correctAnswer: "b", explanation: "Public announcement broadcast.", explanationKo: "공공장소의 알림 방송입니다." },
      { id: 5, question: "What is '대화'?", questionKo: "'대화'란?", options: [{ label: "Monologue", value: "a" }, { label: "Conversation", value: "b" }, { label: "Speech", value: "c" }, { label: "Lecture", value: "d" }], correctAnswer: "b", explanation: "'대화' is a conversation.", explanationKo: "'대화'는 두 사람 이상의 말주고받기입니다." },
    ],
    mock_test: [
      { id: 1, question: "What is TOPIK?", questionKo: "TOPIK이란?", options: [{ label: "Korean food", value: "a" }, { label: "Korean test", value: "b" }, { label: "Korean city", value: "c" }, { label: "Korean name", value: "d" }], correctAnswer: "b", explanation: "TOPIK is Korean language test.", explanationKo: "TOPIK은 한국어능력시험입니다." },
      { id: 2, question: "How many levels in TOPIK I?", questionKo: "TOPIK I의 급수는?", options: [{ label: "1", value: "a" }, { label: "2", value: "b" }, { label: "4", value: "c" }, { label: "6", value: "d" }], correctAnswer: "b", explanation: "TOPIK I has levels 1-2.", explanationKo: "TOPIK I은 1~2급입니다." },
      { id: 3, question: "What sections are in TOPIK I?", questionKo: "TOPIK I의 영역은?", options: [{ label: "Writing only", value: "a" }, { label: "Reading & Listening", value: "b" }, { label: "Speaking only", value: "c" }, { label: "All four", value: "d" }], correctAnswer: "b", explanation: "TOPIK I has reading and listening.", explanationKo: "TOPIK I은 읽기와 듣기입니다." },
      { id: 4, question: "Total time for TOPIK I?", questionKo: "TOPIK I 시험 시간은?", options: [{ label: "60 minutes", value: "a" }, { label: "100 minutes", value: "b" }, { label: "120 minutes", value: "c" }, { label: "180 minutes", value: "d" }], correctAnswer: "b", explanation: "TOPIK I is 100 minutes.", explanationKo: "TOPIK I은 100분입니다." },
      { id: 5, question: "Maximum score for TOPIK I?", questionKo: "TOPIK I 만점은?", options: [{ label: "100", value: "a" }, { label: "200", value: "b" }, { label: "300", value: "c" }, { label: "400", value: "d" }], correctAnswer: "b", explanation: "TOPIK I max is 200 points.", explanationKo: "TOPIK I 만점은 200점입니다." },
    ],
  };
  
  return categoryQuestions[category] || categoryQuestions.vocabulary;
};

// Listening exercise questions for TTS-based dictation
interface ListeningQuestion {
  id: number;
  korean: string;
  english: string;
  hint?: string;
}

const listeningExercises: Record<string, ListeningQuestion[]> = {
  // Level 1 Listening
  "l1-1": [
    { id: 1, korean: "안녕하세요.", english: "Hello.", hint: "인사말" },
    { id: 2, korean: "감사합니다.", english: "Thank you.", hint: "감사 표현" },
    { id: 3, korean: "네, 알겠습니다.", english: "Yes, I understand.", hint: "긍정 대답" },
    { id: 4, korean: "만나서 반갑습니다.", english: "Nice to meet you.", hint: "첫 만남 인사" },
    { id: 5, korean: "안녕히 가세요.", english: "Goodbye. (to person leaving)", hint: "작별 인사" },
  ],
  "l1-2": [
    { id: 1, korean: "하나, 둘, 셋.", english: "One, two, three.", hint: "숫자" },
    { id: 2, korean: "열 개 주세요.", english: "Please give me ten.", hint: "수량 표현" },
    { id: 3, korean: "몇 시예요?", english: "What time is it?", hint: "시간 질문" },
    { id: 4, korean: "세 시 삼십 분이에요.", english: "It's 3:30.", hint: "시간 대답" },
    { id: 5, korean: "오늘은 월요일이에요.", english: "Today is Monday.", hint: "요일 표현" },
  ],
  "l1-3": [
    { id: 1, korean: "저는 학생이에요.", english: "I am a student.", hint: "자기소개" },
    { id: 2, korean: "한국어를 공부해요.", english: "I study Korean.", hint: "학습 표현" },
    { id: 3, korean: "어디에서 왔어요?", english: "Where are you from?", hint: "출신 질문" },
    { id: 4, korean: "커피 한 잔 주세요.", english: "Please give me a cup of coffee.", hint: "주문 표현" },
    { id: 5, korean: "지하철역이 어디예요?", english: "Where is the subway station?", hint: "길 묻기" },
  ],
  // Level 2 Listening
  "l2-1": [
    { id: 1, korean: "똑바로 가세요.", english: "Go straight.", hint: "방향 안내" },
    { id: 2, korean: "왼쪽으로 도세요.", english: "Turn left.", hint: "방향 안내" },
    { id: 3, korean: "두 번째 신호등에서 우회전하세요.", english: "Turn right at the second traffic light.", hint: "길 안내" },
    { id: 4, korean: "여기서 가까워요.", english: "It's close from here.", hint: "거리 표현" },
    { id: 5, korean: "약 10분 정도 걸려요.", english: "It takes about 10 minutes.", hint: "시간 표현" },
  ],
  "l2-2": [
    { id: 1, korean: "여보세요, 김 선생님 계세요?", english: "Hello, is Mr. Kim there?", hint: "전화 시작" },
    { id: 2, korean: "죄송한데요, 지금 안 계세요.", english: "Sorry, he's not here right now.", hint: "부재 알림" },
    { id: 3, korean: "메시지 남겨 드릴까요?", english: "Would you like to leave a message?", hint: "메시지 제안" },
    { id: 4, korean: "나중에 다시 전화할게요.", english: "I'll call back later.", hint: "재통화 약속" },
    { id: 5, korean: "전화번호가 어떻게 되세요?", english: "What is your phone number?", hint: "번호 질문" },
  ],
  "l2-3": [
    { id: 1, korean: "다음 역은 서울역입니다.", english: "The next station is Seoul Station.", hint: "지하철 안내" },
    { id: 2, korean: "내리실 문은 오른쪽입니다.", english: "The doors will open on the right.", hint: "하차 안내" },
    { id: 3, korean: "이번 버스는 종점행입니다.", english: "This bus goes to the terminal.", hint: "버스 안내" },
    { id: 4, korean: "정차역은 세 정거장 후입니다.", english: "The stop is in three stations.", hint: "정차 안내" },
    { id: 5, korean: "환승은 이 역에서 하세요.", english: "Transfer at this station.", hint: "환승 안내" },
  ],
  // Level 3-6 Listening
  "l3-1": [
    { id: 1, korean: "그 일에 대해 어떻게 생각하세요?", english: "What do you think about that?", hint: "의견 질문" },
    { id: 2, korean: "저는 조금 다르게 생각해요.", english: "I think a little differently.", hint: "의견 표현" },
    { id: 3, korean: "그 점에 대해서는 동의합니다.", english: "I agree on that point.", hint: "동의 표현" },
    { id: 4, korean: "자세히 설명해 주시겠어요?", english: "Could you explain in detail?", hint: "설명 요청" },
    { id: 5, korean: "다음 질문으로 넘어가겠습니다.", english: "Let's move on to the next question.", hint: "진행 표현" },
  ],
  "l3-2": [
    { id: 1, korean: "오늘 강의 주제는 한국의 역사입니다.", english: "Today's lecture topic is Korean history.", hint: "강의 소개" },
    { id: 2, korean: "이 부분이 시험에 나올 가능성이 높습니다.", english: "This part is likely to be on the exam.", hint: "시험 안내" },
    { id: 3, korean: "다음 슬라이드를 보시겠습니다.", english: "Let's look at the next slide.", hint: "발표 진행" },
    { id: 4, korean: "질문이 있으시면 손을 들어 주세요.", english: "Please raise your hand if you have questions.", hint: "질문 안내" },
    { id: 5, korean: "오늘 수업은 여기까지입니다.", english: "That's all for today's class.", hint: "수업 종료" },
  ],
};

const getListeningQuestions = (lessonId: string): ListeningQuestion[] => {
  return listeningExercises[lessonId] || [
    { id: 1, korean: "안녕하세요.", english: "Hello.", hint: "인사말" },
    { id: 2, korean: "감사합니다.", english: "Thank you.", hint: "감사 표현" },
    { id: 3, korean: "괜찮아요.", english: "It's okay.", hint: "긍정 표현" },
    { id: 4, korean: "잠시만요.", english: "Just a moment.", hint: "기다림 표현" },
    { id: 5, korean: "다시 한번 말씀해 주세요.", english: "Please say that again.", hint: "반복 요청" },
  ];
};

const Lesson = () => {
  const navigate = useNavigate();
  const { lessonId } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const level = parseInt(searchParams.get("level") || "1");
  const category = searchParams.get("category") || "vocabulary";
  const topikLevel = searchParams.get("topik") || "1";
  
  const [user, setUser] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<Record<number, { selected: string; correct: boolean }>>({});
  const [quizComplete, setQuizComplete] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [ragGenerated, setRagGenerated] = useState(false);
  
  // Fetch RAG-powered questions from edge function
  const fetchRagQuestions = async (lessonIdParam: string, categoryParam: string, levelParam: number) => {
    try {
      setLoadingQuestions(true);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lesson-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonId: lessonIdParam,
          category: categoryParam,
          level: levelParam,
          title: lessonIdParam, // Use lessonId as title hint
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to fetch RAG questions:', response.status);
        return null;
      }
      
      const data = await response.json();
      
      if (data.success && data.questions && Array.isArray(data.questions)) {
        console.log(`RAG questions loaded (hasContext: ${data.hasRagContext}, results: ${data.ragResultCount})`);
        setRagGenerated(data.hasRagContext);
        return data.questions;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching RAG questions:', error);
      return null;
    } finally {
      setLoadingQuestions(false);
    }
  };
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      setStartTime(new Date());
      
      // First try to get RAG-generated questions
      const ragQuestions = await fetchRagQuestions(lessonId || "", category, level);
      
      if (ragQuestions && ragQuestions.length > 0) {
        setQuestions(ragQuestions);
      } else {
        // Fallback to static questions
        const lessonQuestionData = lessonQuestions[lessonId || ""] || generateDefaultQuestions(lessonId || "", category);
        setQuestions(lessonQuestionData);
      }
    };
    
    checkAuth();
  }, [lessonId, category, level, navigate]);
  
  const currentQuestion = questions[currentQuestionIndex];
  const correctCount = Object.values(answers).filter(a => a.correct).length;
  const totalQuestions = questions.length;
  const progressPercent = ((currentQuestionIndex + 1) / totalQuestions) * 100;
  
  const handleAnswerSelect = (value: string) => {
    if (showResult) return;
    setSelectedAnswer(value);
  };
  
  const handleCheckAnswer = () => {
    if (!selectedAnswer || !currentQuestion) return;
    
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: { selected: selectedAnswer, correct: isCorrect }
    }));
    setShowResult(true);
  };
  
  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setQuizComplete(true);
    }
  };
  
  const saveProgress = useCallback(async () => {
    if (!user || !lessonId || saving) return;
    
    setSaving(true);
    const endTime = new Date();
    const timeSpentSeconds = startTime ? Math.round((endTime.getTime() - startTime.getTime()) / 1000) : 0;
    const score = Math.round((correctCount / totalQuestions) * 100);
    
    try {
      // Check if progress exists
      const { data: existing } = await supabase
        .from("learning_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .maybeSingle();
      
      if (existing) {
        // Update existing
        await supabase
          .from("learning_progress")
          .update({
            score: Math.max(existing.score || 0, score),
            correct_count: correctCount,
            total_count: totalQuestions,
            time_spent_seconds: (existing.time_spent_seconds || 0) + timeSpentSeconds,
            completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        // Insert new
        await supabase
          .from("learning_progress")
          .insert({
            user_id: user.id,
            lesson_id: lessonId,
            level,
            category,
            score,
            correct_count: correctCount,
            total_count: totalQuestions,
            time_spent_seconds: timeSpentSeconds,
            completed: true,
            completed_at: new Date().toISOString(),
          });
      }
      
      toast({
        title: "학습 완료!",
        description: `점수가 저장되었습니다: ${score}점`,
      });
    } catch (error) {
      console.error("Error saving progress:", error);
      toast({
        title: "저장 실패",
        description: "진도 저장에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [user, lessonId, level, category, correctCount, totalQuestions, startTime, saving, toast]);
  
  useEffect(() => {
    if (quizComplete && !saving) {
      saveProgress();
    }
  }, [quizComplete, saveProgress, saving]);
  
  const handleRetry = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setAnswers({});
    setQuizComplete(false);
    setStartTime(new Date());
  };
  
  const handleBack = () => {
    navigate(topikLevel === "1" || topikLevel === "2" ? "/topik-1" : "/topik-2");
  };
  
  const score = Math.round((correctCount / totalQuestions) * 100);
  
  // For listening category, use ListeningExercise component
  const isListeningCategory = category === "listening";
  const listeningQuestions = isListeningCategory ? getListeningQuestions(lessonId || "") : [];
  
  const handleListeningComplete = useCallback(async (finalScore: number, correct: number, total: number) => {
    if (!user || !lessonId || saving) return;
    
    setSaving(true);
    const endTime = new Date();
    const timeSpentSeconds = startTime ? Math.round((endTime.getTime() - startTime.getTime()) / 1000) : 0;
    
    try {
      const { data: existing } = await supabase
        .from("learning_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .maybeSingle();
      
      if (existing) {
        await supabase
          .from("learning_progress")
          .update({
            score: Math.max(existing.score || 0, finalScore),
            correct_count: correct,
            total_count: total,
            time_spent_seconds: (existing.time_spent_seconds || 0) + timeSpentSeconds,
            completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("learning_progress")
          .insert({
            user_id: user.id,
            lesson_id: lessonId,
            level,
            category,
            score: finalScore,
            correct_count: correct,
            total_count: total,
            time_spent_seconds: timeSpentSeconds,
            completed: true,
            completed_at: new Date().toISOString(),
          });
      }
      
      toast({
        title: "학습 완료!",
        description: `점수가 저장되었습니다: ${finalScore}점`,
      });
      
      setQuizComplete(true);
    } catch (error) {
      console.error("Error saving progress:", error);
      toast({
        title: "저장 실패",
        description: "진도 저장에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [user, lessonId, level, category, startTime, saving, toast]);
  
  // Loading state for RAG questions
  if (loadingQuestions) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">AI가 학습 콘텐츠를 생성하고 있습니다...</p>
      </div>
    );
  }
  
  if (!isListeningCategory && !currentQuestion && !quizComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1 pt-8 pb-24">

        <div className="container mx-auto px-4 max-w-3xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              돌아가기
            </Button>
            
            {!quizComplete && !isListeningCategory && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    문제 {currentQuestionIndex + 1} / {totalQuestions}
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    정답 {correctCount}개
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}
            
            {isListeningCategory && !quizComplete && (
              <div className="flex items-center gap-2 text-primary">
                <Headphones className="w-5 h-5" />
                <span className="font-medium">듣기 연습</span>
              </div>
            )}
          </motion.div>
          
          {/* Listening Exercise */}
          {isListeningCategory && !quizComplete ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <ListeningExercise
                questions={listeningQuestions}
                onComplete={handleListeningComplete}
              />
            </motion.div>
          ) : (
          <AnimatePresence mode="wait">
            {quizComplete ? (
              /* Results Screen */
              <motion.div
                key="results"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card p-8 text-center"
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-korean-gold to-korean-yellow flex items-center justify-center">
                  <Trophy className="w-10 h-10 text-white" />
                </div>
                
                <h2 className="text-2xl font-bold text-foreground mb-2">학습 완료!</h2>
                <p className="text-muted-foreground mb-6">수고하셨습니다</p>
                
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="p-4 rounded-xl bg-muted">
                    <div className="text-3xl font-bold text-foreground">{score}점</div>
                    <div className="text-sm text-muted-foreground">점수</div>
                  </div>
                  <div className="p-4 rounded-xl bg-muted">
                    <div className="text-3xl font-bold text-korean-green">{correctCount}</div>
                    <div className="text-sm text-muted-foreground">정답</div>
                  </div>
                  <div className="p-4 rounded-xl bg-muted">
                    <div className="text-3xl font-bold text-korean-red">{totalQuestions - correctCount}</div>
                    <div className="text-sm text-muted-foreground">오답</div>
                  </div>
                </div>
                
                {/* Answer Review */}
                <div className="text-left mb-8">
                  <h3 className="font-semibold mb-4">문제 리뷰</h3>
                  <div className="space-y-2">
                    {questions.map((q, idx) => {
                      const answer = answers[q.id];
                      return (
                        <div
                          key={q.id}
                          className={cn(
                            "p-3 rounded-lg flex items-center gap-3",
                            answer?.correct ? "bg-korean-green/10" : "bg-korean-red/10"
                          )}
                        >
                          {answer?.correct ? (
                            <CheckCircle2 className="w-5 h-5 text-korean-green shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-korean-red shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{q.questionKo}</p>
                            {!answer?.correct && (
                              <p className="text-xs text-muted-foreground">
                                정답: {q.options.find(o => o.value === q.correctAnswer)?.label}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={handleRetry}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    다시 풀기
                  </Button>
                  <Button className="flex-1" onClick={handleBack}>
                    목록으로
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            ) : (
              /* Question Screen */
              <motion.div
                key={`question-${currentQuestionIndex}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="glass-card p-6"
              >
                {/* Question */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    {currentQuestion.questionKo}
                  </h2>
                  <p className="text-muted-foreground">{currentQuestion.question}</p>
                </div>
                
                {/* Options */}
                <div className="space-y-3 mb-6">
                  {currentQuestion.options.map((option) => {
                    const isSelected = selectedAnswer === option.value;
                    const isCorrect = option.value === currentQuestion.correctAnswer;
                    const showCorrect = showResult && isCorrect;
                    const showWrong = showResult && isSelected && !isCorrect;
                    
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleAnswerSelect(option.value)}
                        disabled={showResult}
                        className={cn(
                          "w-full p-4 rounded-xl border-2 text-left transition-all",
                          "hover:border-primary/50",
                          isSelected && !showResult && "border-primary bg-primary/10",
                          !isSelected && !showResult && "border-border",
                          showCorrect && "border-korean-green bg-korean-green/10",
                          showWrong && "border-korean-red bg-korean-red/10",
                          showResult && !showCorrect && !showWrong && "opacity-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full border-2 flex items-center justify-center font-medium",
                            isSelected && !showResult && "border-primary bg-primary text-primary-foreground",
                            showCorrect && "border-korean-green bg-korean-green text-white",
                            showWrong && "border-korean-red bg-korean-red text-white",
                            !isSelected && !showResult && "border-muted-foreground"
                          )}>
                            {showCorrect ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : showWrong ? (
                              <XCircle className="w-5 h-5" />
                            ) : (
                              option.value.toUpperCase()
                            )}
                          </div>
                          <span className="font-medium">{option.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                
                {/* Explanation */}
                <AnimatePresence>
                  {showResult && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-6 p-4 rounded-xl bg-muted"
                    >
                      <p className="font-medium text-foreground mb-1">
                        {answers[currentQuestion.id]?.correct ? "정답입니다! 👏" : "오답입니다 😅"}
                      </p>
                      <p className="text-sm text-foreground">{currentQuestion.explanationKo}</p>
                      <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Action Buttons */}
                <div className="flex gap-3">
                  {!showResult ? (
                    <Button
                      className="flex-1"
                      onClick={handleCheckAnswer}
                      disabled={!selectedAnswer}
                    >
                      정답 확인
                    </Button>
                  ) : (
                    <Button className="flex-1" onClick={handleNextQuestion}>
                      {currentQuestionIndex < totalQuestions - 1 ? (
                        <>
                          다음 문제
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </>
                      ) : (
                        <>
                          결과 보기
                          <Trophy className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          )}
        </div>
      </main>
      
      <AppFooter />
    </div>
  );
};

export default Lesson;
