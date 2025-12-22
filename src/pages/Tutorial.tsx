import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, 
  Heart, 
  Coins, 
  Target, 
  Star,
  Dice6,
  Trophy,
  Briefcase,
  Link2,
  MessageSquare,
  Film,
  Music,
  Zap,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Lightbulb,
  Clock,
  Mic,
  Keyboard,
  MousePointer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";

const Tutorial = () => {
  const navigate = useNavigate();
  const [expandedGame, setExpandedGame] = useState<string | null>(null);

  const gameGuides = [
    {
      id: "survival",
      icon: Dice6,
      title: "서울에서 생존",
      titleVi: "Sinh tồn tại Seoul",
      color: "from-neon-pink to-neon-purple",
      summary: {
        ko: "AI와 한국어로 대화하며 서울에서 10턴 동안 생존하세요!",
        vi: "Trò chuyện bằng tiếng Hàn với AI và sống sót 10 lượt tại Seoul!"
      },
      howToStart: {
        ko: "메인 메뉴 → '서울에서 생존' 또는 장소 입력 후 '시작' 클릭",
        vi: "Menu chính → 'Sinh tồn tại Seoul' hoặc nhập địa điểm rồi nhấn 'Bắt đầu'"
      },
      detailedSteps: [
        { 
          ko: "게임 시작하기", 
          vi: "Bắt đầu game",
          detail_ko: "메인 메뉴에서 '서울에서 생존' 버튼을 누르거나, 원하는 장소(예: 강남역, 홍대)를 입력하고 시작하세요.",
          detail_vi: "Từ menu chính, nhấn nút 'Sinh tồn tại Seoul', hoặc nhập địa điểm bạn muốn (ví dụ: Gangnam, Hongdae) rồi bắt đầu."
        },
        { 
          ko: "AI의 상황 읽기", 
          vi: "Đọc tình huống của AI",
          detail_ko: "AI가 한국어로 상황을 설명합니다. 베트남어 번역도 함께 제공되니 이해하기 쉬워요!",
          detail_vi: "AI sẽ mô tả tình huống bằng tiếng Hàn. Có kèm bản dịch tiếng Việt nên dễ hiểu!"
        },
        { 
          ko: "한국어로 대답하기", 
          vi: "Trả lời bằng tiếng Hàn",
          detail_ko: "입력창에 한국어로 대답을 입력하세요. 완벽하지 않아도 괜찮아요! AI가 이해합니다.",
          detail_vi: "Nhập câu trả lời bằng tiếng Hàn vào ô nhập liệu. Không cần hoàn hảo! AI sẽ hiểu."
        },
        { 
          ko: "점수 확인하기", 
          vi: "Kiểm tra điểm",
          detail_ko: "각 턴마다 AI가 당신의 한국어를 평가합니다. 자연스러우면 높은 점수, 어색하면 HP가 줄어들어요.",
          detail_vi: "Mỗi lượt AI sẽ đánh giá tiếng Hàn của bạn. Tự nhiên thì điểm cao, không tự nhiên thì HP giảm."
        },
        { 
          ko: "10턴 생존 성공!", 
          vi: "Sống sót 10 lượt!",
          detail_ko: "10턴을 모두 완료하면 성공! 포인트와 돈을 획득하고 랭킹에 반영됩니다.",
          detail_vi: "Hoàn thành 10 lượt là thành công! Nhận điểm và tiền, được ghi vào bảng xếp hạng."
        },
      ],
      tips: [
        { ko: "짧고 간단한 문장으로 시작하세요", vi: "Bắt đầu bằng những câu ngắn và đơn giản" },
        { ko: "존댓말(요/습니다)을 사용하면 점수가 높아요", vi: "Dùng kính ngữ (요/습니다) sẽ được điểm cao" },
        { ko: "모르는 단어는 번역기를 사용해도 OK", vi: "Không biết từ thì dùng dịch cũng OK" },
      ],
      warnings: [
        { ko: "HP가 0이 되면 게임 오버!", vi: "HP về 0 là thua game!" },
        { ko: "욕설이나 이상한 말은 감점", vi: "Nói bậy hoặc kỳ lạ sẽ bị trừ điểm" },
      ]
    },
    {
      id: "dating",
      icon: Heart,
      title: "Love Signal (연애 시뮬)",
      titleVi: "Tín hiệu tình yêu",
      color: "from-pink-500 to-rose-500",
      summary: {
        ko: "매력적인 한국인 캐릭터와 대화하며 호감도 100%를 달성하세요!",
        vi: "Trò chuyện với nhân vật Hàn Quốc hấp dẫn và đạt 100% độ thân mật!"
      },
      howToStart: {
        ko: "메인 메뉴 → 'Love Signal' 클릭 → 캐릭터 선택",
        vi: "Menu chính → Nhấn 'Love Signal' → Chọn nhân vật"
      },
      detailedSteps: [
        { 
          ko: "캐릭터 선택하기", 
          vi: "Chọn nhân vật",
          detail_ko: "여러 한국인 캐릭터 중 마음에 드는 사람을 선택하세요. 각 캐릭터마다 성격과 MBTI가 달라요!",
          detail_vi: "Chọn người bạn thích trong số nhiều nhân vật Hàn Quốc. Mỗi người có tính cách và MBTI khác nhau!"
        },
        { 
          ko: "대화 시작하기", 
          vi: "Bắt đầu trò chuyện",
          detail_ko: "캐릭터가 먼저 말을 걸어요. 한국어로 자연스럽게 대화하세요!",
          detail_vi: "Nhân vật sẽ nói trước. Hãy trò chuyện tự nhiên bằng tiếng Hàn!"
        },
        { 
          ko: "호감도 올리기", 
          vi: "Tăng độ thân mật",
          detail_ko: "자연스럽고 예쁜 한국어를 사용하면 호감도가 올라가요! 재미있는 대화, 칭찬, 관심 표현이 효과적이에요.",
          detail_vi: "Dùng tiếng Hàn tự nhiên và đẹp sẽ tăng độ thân mật! Nói chuyện vui, khen ngợi, thể hiện quan tâm rất hiệu quả."
        },
        { 
          ko: "미니게임 플레이", 
          vi: "Chơi mini game",
          detail_ko: "대화 중 미니게임이 등장해요! 텔레파시 게임, 취향 맞추기 등으로 보너스 호감도를 얻으세요.",
          detail_vi: "Mini game sẽ xuất hiện trong khi trò chuyện! Chơi game telepathy, đoán sở thích để nhận thêm điểm thân mật."
        },
        { 
          ko: "100% 달성 → 특별 엔딩!", 
          vi: "Đạt 100% → Kết thúc đặc biệt!",
          detail_ko: "호감도 100%를 달성하면 특별한 엔딩과 커플 사진이 생성됩니다!",
          detail_vi: "Đạt 100% độ thân mật sẽ được xem kết thúc đặc biệt và tạo ảnh cặp đôi!"
        },
      ],
      tips: [
        { ko: "MZ 슬랭(ㅋㅋ, 갓생, 존맛)을 사용하면 친근해 보여요", vi: "Dùng slang MZ (ㅋㅋ, 갓생, 존맛) sẽ thân thiện hơn" },
        { ko: "이모지를 적절히 사용하세요 😊", vi: "Dùng emoji phù hợp 😊" },
        { ko: "상대방의 MBTI에 맞는 대화를 해보세요", vi: "Thử nói chuyện phù hợp với MBTI của đối phương" },
      ],
      warnings: [
        { ko: "무례하거나 지루한 대화는 호감도가 떨어져요", vi: "Nói chuyện thô lỗ hoặc nhàm chán sẽ giảm độ thân mật" },
        { ko: "너무 빠르게 고백하면 어색해요", vi: "Tỏ tình quá nhanh sẽ bị ngại" },
      ]
    },
    {
      id: "wordchain",
      icon: Link2,
      title: "끝말잇기",
      titleVi: "Nối từ (Word Chain)",
      color: "from-cyan-500 to-blue-500",
      summary: {
        ko: "AI가 말한 단어의 마지막 글자로 시작하는 새 단어를 말하세요!",
        vi: "Nói từ mới bắt đầu bằng chữ cái cuối của từ AI nói!"
      },
      howToStart: {
        ko: "메인 메뉴 → '끝말잇기' 클릭",
        vi: "Menu chính → Nhấn 'Nối từ'"
      },
      detailedSteps: [
        { 
          ko: "게임 규칙 이해하기", 
          vi: "Hiểu luật chơi",
          detail_ko: "예시: AI가 '사과'라고 하면 → 마지막 글자 '과'로 시작하는 단어 '과일'을 말하면 됩니다!",
          detail_vi: "Ví dụ: AI nói '사과(táo)' → Bạn nói từ bắt đầu bằng '과' như '과일(trái cây)'!"
        },
        { 
          ko: "AI의 단어 확인", 
          vi: "Xác nhận từ của AI",
          detail_ko: "AI가 한국어 단어를 말합니다. 베트남어 뜻도 함께 보여줘요!",
          detail_vi: "AI sẽ nói một từ tiếng Hàn. Nghĩa tiếng Việt cũng được hiển thị!"
        },
        { 
          ko: "15초 안에 답하기", 
          vi: "Trả lời trong 15 giây",
          detail_ko: "시간 제한이 있어요! 타이머가 빨간색이 되기 전에 답하세요.",
          detail_vi: "Có giới hạn thời gian! Trả lời trước khi đồng hồ chuyển đỏ."
        },
        { 
          ko: "단어 입력하고 전송", 
          vi: "Nhập từ và gửi",
          detail_ko: "한국어 단어를 입력하고 전송 버튼을 누르세요. 올바른 단어면 점수 획득!",
          detail_vi: "Nhập từ tiếng Hàn và nhấn gửi. Từ đúng thì được điểm!"
        },
        { 
          ko: "연속 성공으로 고득점!", 
          vi: "Thành công liên tiếp để đạt điểm cao!",
          detail_ko: "계속 성공하면 연속 보너스가 붙어서 점수가 더 많이 올라가요!",
          detail_vi: "Thành công liên tiếp sẽ được cộng thêm điểm thưởng combo!"
        },
      ],
      tips: [
        { ko: "두음법칙: '녀→여', '률→율' 등 변환 적용됨", vi: "Quy tắc đầu âm: '녀→여', '률→율' được áp dụng" },
        { ko: "고유명사(사람 이름, 지명)도 사용 가능!", vi: "Danh từ riêng (tên người, địa danh) cũng được dùng!" },
        { ko: "흔한 단어부터 시작하세요", vi: "Bắt đầu từ những từ thông dụng" },
      ],
      warnings: [
        { ko: "시간 초과 = 즉시 패배!", vi: "Hết giờ = Thua ngay!" },
        { ko: "이미 사용한 단어는 다시 사용 불가", vi: "Từ đã dùng không được dùng lại" },
      ]
    },
    {
      id: "quiz",
      icon: MessageSquare,
      title: "관용어/슬랭 퀴즈",
      titleVi: "Quiz thành ngữ/Slang",
      color: "from-amber-500 to-yellow-500",
      summary: {
        ko: "한국 관용어와 MZ세대 슬랭의 뜻을 맞추는 퀴즈!",
        vi: "Quiz đoán nghĩa thành ngữ Hàn và slang thế hệ MZ!"
      },
      howToStart: {
        ko: "메인 메뉴 → '관용어 퀴즈' 클릭 → 난이도 선택",
        vi: "Menu chính → Nhấn 'Quiz thành ngữ' → Chọn độ khó"
      },
      detailedSteps: [
        { 
          ko: "난이도 선택하기", 
          vi: "Chọn độ khó",
          detail_ko: "쉬움(MZ슬랭 위주), 보통(관용어+슬랭), 어려움(어려운 관용어) 중 선택하세요.",
          detail_vi: "Chọn: Dễ (chủ yếu slang MZ), Trung bình (thành ngữ + slang), Khó (thành ngữ khó)."
        },
        { 
          ko: "문제 읽기", 
          vi: "Đọc câu hỏi",
          detail_ko: "한국어 관용어나 슬랭이 나옵니다. 그 뜻이 무엇인지 생각해보세요!",
          detail_vi: "Thành ngữ hoặc slang tiếng Hàn sẽ xuất hiện. Nghĩ xem nghĩa là gì!"
        },
        { 
          ko: "4개 보기 중 정답 선택", 
          vi: "Chọn đáp án trong 4 lựa chọn",
          detail_ko: "4개의 보기가 한국어와 베트남어로 제공됩니다. 정답을 터치하세요!",
          detail_vi: "4 đáp án bằng tiếng Hàn và tiếng Việt. Chạm vào đáp án đúng!"
        },
        { 
          ko: "힌트 사용 (선택)", 
          vi: "Dùng gợi ý (tùy chọn)",
          detail_ko: "모르겠으면 힌트 버튼을 눌러보세요. 단, 점수가 절반으로 줄어들어요!",
          detail_vi: "Không biết thì nhấn nút gợi ý. Nhưng điểm sẽ giảm một nửa!"
        },
        { 
          ko: "정답 후 상세 설명 읽기", 
          vi: "Đọc giải thích chi tiết sau khi trả lời",
          detail_ko: "정답/오답 후에 자세한 설명과 예문이 베트남어로 제공됩니다. 이걸 읽으면 진짜 배워요!",
          detail_vi: "Sau khi trả lời sẽ có giải thích chi tiết và ví dụ bằng tiếng Việt. Đọc cái này mới thực sự học được!"
        },
      ],
      tips: [
        { ko: "설명을 꼭 읽으세요! 학습 효과 UP", vi: "Nhớ đọc giải thích! Hiệu quả học tập tăng" },
        { ko: "연속 정답 = 스트릭 보너스!", vi: "Trả lời đúng liên tiếp = Thưởng streak!" },
        { ko: "쉬운 난이도부터 시작하세요", vi: "Bắt đầu từ độ khó dễ" },
      ],
      warnings: [
        { ko: "힌트 사용 시 점수 50% 감소", vi: "Dùng gợi ý giảm 50% điểm" },
        { ko: "오답도 학습! 설명을 꼭 읽으세요", vi: "Sai cũng là học! Nhớ đọc giải thích" },
      ]
    },
    {
      id: "kdrama",
      icon: Film,
      title: "K-Drama 더빙",
      titleVi: "Lồng tiếng K-Drama",
      color: "from-purple-500 to-pink-500",
      summary: {
        ko: "유명 드라마 대사를 듣고 따라 읽으며 발음 연습!",
        vi: "Nghe lời thoại phim nổi tiếng và đọc theo để luyện phát âm!"
      },
      howToStart: {
        ko: "메인 메뉴 → 'K-Drama 더빙' 클릭",
        vi: "Menu chính → Nhấn 'Lồng tiếng K-Drama'"
      },
      detailedSteps: [
        { 
          ko: "드라마 대사 확인", 
          vi: "Xem lời thoại phim",
          detail_ko: "유명 한국 드라마의 대사가 화면에 나타납니다. 베트남어 번역도 함께!",
          detail_vi: "Lời thoại từ phim Hàn nổi tiếng sẽ xuất hiện. Có kèm bản dịch tiếng Việt!"
        },
        { 
          ko: "원어민 음성 듣기", 
          vi: "Nghe giọng người bản xứ",
          detail_ko: "재생 버튼을 눌러 원어민 발음을 들어보세요. 여러 번 들어도 OK!",
          detail_vi: "Nhấn nút phát để nghe phát âm người bản xứ. Nghe nhiều lần cũng OK!"
        },
        { 
          ko: "마이크로 녹음하기", 
          vi: "Thu âm bằng mic",
          detail_ko: "마이크 버튼을 누르고 대사를 따라 읽으세요. 천천히 또박또박!",
          detail_vi: "Nhấn nút mic và đọc theo lời thoại. Chậm và rõ ràng!"
        },
        { 
          ko: "정확도 점수 확인", 
          vi: "Kiểm tra điểm chính xác",
          detail_ko: "AI가 당신의 발음을 분석해서 점수를 줍니다. 몇 % 맞았는지 확인하세요!",
          detail_vi: "AI sẽ phân tích phát âm của bạn và cho điểm. Xem bạn đúng bao nhiêu %!"
        },
        { 
          ko: "다른 대사로 계속 연습", 
          vi: "Tiếp tục luyện với lời thoại khác",
          detail_ko: "다음 버튼을 눌러 새로운 대사에 도전하세요!",
          detail_vi: "Nhấn nút tiếp theo để thử lời thoại mới!"
        },
      ],
      tips: [
        { ko: "조용한 곳에서 녹음하세요", vi: "Thu âm ở nơi yên tĩnh" },
        { ko: "마이크 권한을 허용해야 해요", vi: "Phải cho phép quyền truy cập mic" },
        { ko: "천천히 또박또박 읽으면 점수가 높아요", vi: "Đọc chậm và rõ ràng sẽ được điểm cao" },
      ],
      warnings: [
        { ko: "주변 소음이 있으면 인식이 어려워요", vi: "Tiếng ồn xung quanh sẽ làm nhận dạng khó hơn" },
        { ko: "마이크가 없으면 플레이 불가", vi: "Không có mic thì không chơi được" },
      ]
    },
    {
      id: "kpop",
      icon: Music,
      title: "K-POP 가사 퀴즈",
      titleVi: "Quiz lời bài hát K-POP",
      color: "from-rose-500 to-red-500",
      summary: {
        ko: "K-POP 노래를 듣고 빈칸에 들어갈 가사를 맞추세요!",
        vi: "Nghe nhạc K-POP và điền lời bài hát còn thiếu!"
      },
      howToStart: {
        ko: "메인 메뉴 → 'K-POP 가사' 클릭",
        vi: "Menu chính → Nhấn 'K-POP 가사'"
      },
      detailedSteps: [
        { 
          ko: "뮤직비디오 시청", 
          vi: "Xem Music Video",
          detail_ko: "YouTube에서 K-POP 뮤직비디오가 자동 재생됩니다. 노래를 잘 들어보세요!",
          detail_vi: "MV K-POP từ YouTube sẽ tự động phát. Lắng nghe bài hát kỹ nhé!"
        },
        { 
          ko: "빈칸 가사 확인", 
          vi: "Xem lời bài hát có chỗ trống",
          detail_ko: "가사 중 일부가 _____로 가려져 있습니다. 무슨 단어인지 생각해보세요!",
          detail_vi: "Một phần lời bài hát bị che bằng _____. Nghĩ xem đó là từ gì!"
        },
        { 
          ko: "4개 보기 중 정답 선택", 
          vi: "Chọn đáp án trong 4 lựa chọn",
          detail_ko: "4개의 보기가 나옵니다. 노래에서 들은 가사를 선택하세요!",
          detail_vi: "4 đáp án sẽ xuất hiện. Chọn lời bài hát bạn nghe được!"
        },
        { 
          ko: "20초 안에 빠르게!", 
          vi: "Nhanh lên trong 20 giây!",
          detail_ko: "빨리 맞추면 보너스 점수! 시간이 지날수록 점수가 줄어들어요.",
          detail_vi: "Trả lời nhanh được thêm điểm thưởng! Càng chậm điểm càng giảm."
        },
        { 
          ko: "정답 시 하이라이트 재생", 
          vi: "Khi đúng sẽ phát lại đoạn highlight",
          detail_ko: "정답을 맞추면 해당 부분이 다시 재생됩니다. 한 번 더 들으며 학습!",
          detail_vi: "Trả lời đúng sẽ phát lại đoạn đó. Nghe lại một lần nữa để học!"
        },
      ],
      tips: [
        { ko: "좋아하는 아이돌 노래가 나올 수도!", vi: "Có thể sẽ có bài hát của idol bạn thích!" },
        { ko: "가사를 여러 번 들어보세요", vi: "Nghe lời bài hát nhiều lần" },
        { ko: "빠르게 답하면 보너스 점수!", vi: "Trả lời nhanh được điểm thưởng!" },
      ],
      warnings: [
        { ko: "소리를 켜고 플레이하세요!", vi: "Bật âm thanh để chơi!" },
        { ko: "인터넷 연결 필요 (YouTube)", vi: "Cần kết nối internet (YouTube)" },
      ]
    },
    {
      id: "parttime",
      icon: Briefcase,
      title: "아르바이트",
      titleVi: "Làm thêm (Part-time)",
      color: "from-fuchsia-500 to-pink-500",
      summary: {
        ko: "다양한 알바 상황에서 한국어로 손님을 응대하며 돈을 벌어요!",
        vi: "Kiếm tiền bằng cách phục vụ khách hàng bằng tiếng Hàn trong các tình huống làm thêm!"
      },
      howToStart: {
        ko: "메인 메뉴 → '아르바이트' 클릭",
        vi: "Menu chính → Nhấn 'Làm thêm'"
      },
      detailedSteps: [
        { 
          ko: "알바 시나리오 시작", 
          vi: "Bắt đầu tình huống làm thêm",
          detail_ko: "카페, 편의점, 음식점 등 다양한 알바 상황이 랜덤으로 시작됩니다.",
          detail_vi: "Các tình huống làm thêm khác nhau (quán cafe, cửa hàng tiện lợi, nhà hàng) sẽ bắt đầu ngẫu nhiên."
        },
        { 
          ko: "AI 손님 응대하기", 
          vi: "Phục vụ khách hàng AI",
          detail_ko: "AI 손님이 한국어로 주문하거나 질문합니다. 직원처럼 한국어로 응대하세요!",
          detail_vi: "Khách hàng AI sẽ đặt hàng hoặc hỏi bằng tiếng Hàn. Phục vụ như nhân viên bằng tiếng Hàn!"
        },
        { 
          ko: "서비스 품질 평가", 
          vi: "Đánh giá chất lượng phục vụ",
          detail_ko: "AI가 당신의 서비스와 한국어 실력을 평가합니다. 친절하고 정확하게!",
          detail_vi: "AI sẽ đánh giá dịch vụ và trình độ tiếng Hàn của bạn. Thân thiện và chính xác!"
        },
        { 
          ko: "팁/월급 받기", 
          vi: "Nhận tiền tip/lương",
          detail_ko: "잘하면 팁을 받아요! 서비스가 좋을수록 더 많은 돈을 벌 수 있습니다.",
          detail_vi: "Làm tốt sẽ được tip! Phục vụ càng tốt thì kiếm được càng nhiều tiền."
        },
      ],
      tips: [
        { ko: "존댓말 필수! 손님에게 예의 바르게", vi: "Phải dùng kính ngữ! Lịch sự với khách" },
        { ko: "'감사합니다', '안녕히 가세요' 필수 표현", vi: "'감사합니다', '안녕히 가세요' là những câu cần thiết" },
        { ko: "메뉴 이름을 정확하게 말하세요", vi: "Nói tên món chính xác" },
      ],
      warnings: [
        { ko: "무례하면 돈을 못 벌어요!", vi: "Thô lỗ thì không kiếm được tiền!" },
        { ko: "주문을 잘못 받으면 감점", vi: "Nhận order sai sẽ bị trừ điểm" },
      ]
    },
    {
      id: "bankruptcy",
      icon: Zap,
      title: "파산 복구",
      titleVi: "Phục hồi phá sản",
      color: "from-green-500 to-emerald-500",
      summary: {
        ko: "빚진 상태에서 시작! 한국어로 돈을 벌어 빚을 갚으세요!",
        vi: "Bắt đầu trong tình trạng nợ! Kiếm tiền bằng tiếng Hàn để trả nợ!"
      },
      howToStart: {
        ko: "메인 메뉴 → '파산 복구' 클릭",
        vi: "Menu chính → Nhấn 'Phục hồi phá sản'"
      },
      detailedSteps: [
        { 
          ko: "빚 현황 확인", 
          vi: "Xem tình trạng nợ",
          detail_ko: "게임 시작 시 현재 빚이 얼마인지 확인하세요. 이걸 0으로 만들어야 해요!",
          detail_vi: "Khi bắt đầu game, xem bạn đang nợ bao nhiêu. Phải đưa nó về 0!"
        },
        { 
          ko: "미션 수행하기", 
          vi: "Thực hiện nhiệm vụ",
          detail_ko: "다양한 미션이 주어집니다. 한국어로 미션을 성공적으로 수행하세요!",
          detail_vi: "Nhiều nhiệm vụ sẽ được giao. Hoàn thành nhiệm vụ thành công bằng tiếng Hàn!"
        },
        { 
          ko: "돈 벌어 빚 갚기", 
          vi: "Kiếm tiền trả nợ",
          detail_ko: "미션 성공하면 돈을 벌어요. 번 돈으로 빚을 갚으세요!",
          detail_vi: "Hoàn thành nhiệm vụ sẽ kiếm được tiền. Dùng tiền đó để trả nợ!"
        },
        { 
          ko: "빚 완전 상환 = 성공!", 
          vi: "Trả hết nợ = Thành công!",
          detail_ko: "빚을 모두 갚으면 파산 복구 성공! 큰 보너스 포인트를 획득합니다.",
          detail_vi: "Trả hết nợ là phục hồi phá sản thành công! Nhận thưởng lớn."
        },
      ],
      tips: [
        { ko: "한국어를 잘하면 더 많이 벌어요", vi: "Nói tiếng Hàn tốt sẽ kiếm được nhiều hơn" },
        { ko: "효율적으로 미션을 선택하세요", vi: "Chọn nhiệm vụ hiệu quả" },
        { ko: "포기하지 마세요! 천천히 갚으면 됩니다", vi: "Đừng bỏ cuộc! Trả từ từ cũng được" },
      ],
      warnings: [
        { ko: "HP가 0이 되면 게임 오버!", vi: "HP về 0 là thua game!" },
        { ko: "실수하면 빚이 늘어날 수도", vi: "Sai lầm có thể làm nợ tăng thêm" },
      ]
    },
  ];

  const toggleGame = (gameId: string) => {
    setExpandedGame(expandedGame === gameId ? null : gameId);
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f23] flex flex-col overflow-hidden">
      {/* Header */}
      <AppHeader 
        title="게임 사용법"
        titleVi="Hướng dẫn sử dụng"
        showBack
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {/* Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 rounded-xl mb-4 text-center"
        >
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-neon-pink to-neon-cyan flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">
            환영합니다! <span className="text-neon-cyan">Game LUKATO</span>
          </h2>
          <p className="text-white/60 text-sm mb-2">
            Chào mừng bạn! <span className="text-neon-cyan">Game LUKATO</span>
          </p>
          <p className="text-white/80 text-xs leading-relaxed">
            AI와 함께 재미있게 한국어를 배우세요!<br/>
            <span className="text-white/50">Học tiếng Hàn vui vẻ cùng AI!</span>
          </p>
        </motion.div>

        {/* How to Use - Quick Start */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-4 rounded-xl mb-4 border border-neon-pink/30"
        >
          <h3 className="text-neon-pink font-bold text-sm mb-3 flex items-center gap-2">
            <MousePointer className="w-4 h-4" />
            빠른 시작 / Bắt đầu nhanh
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
              <span className="w-6 h-6 rounded-full bg-neon-pink/20 text-neon-pink text-xs font-bold flex items-center justify-center">1</span>
              <div className="flex-1">
                <p className="text-white text-xs">게임 선택하기</p>
                <p className="text-white/40 text-[10px]">Chọn game</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
              <span className="w-6 h-6 rounded-full bg-neon-pink/20 text-neon-pink text-xs font-bold flex items-center justify-center">2</span>
              <div className="flex-1">
                <p className="text-white text-xs">한국어로 대화/입력하기</p>
                <p className="text-white/40 text-[10px]">Trò chuyện/nhập bằng tiếng Hàn</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
              <span className="w-6 h-6 rounded-full bg-neon-pink/20 text-neon-pink text-xs font-bold flex items-center justify-center">3</span>
              <div className="flex-1">
                <p className="text-white text-xs">점수/돈 획득하고 랭킹 올리기!</p>
                <p className="text-white/40 text-[10px]">Nhận điểm/tiền và leo hạng!</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Explanation */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 rounded-xl mb-4"
        >
          <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-neon-pink" />
            상태창 이해하기 / Hiểu thanh trạng thái
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-2 bg-white/5 rounded-lg">
              <Heart className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-xs font-bold">HP (체력 / Máu)</p>
                <p className="text-white/60 text-[10px]">
                  게임에서 실수하면 줄어들어요. 0이 되면 게임 오버!<br/>
                  <span className="text-white/40">Giảm khi mắc lỗi trong game. Về 0 là thua!</span>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-2 bg-white/5 rounded-lg">
              <Coins className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-xs font-bold">소지금 (돈 / Tiền)</p>
                <p className="text-white/60 text-[10px]">
                  미션 성공하면 돈을 벌어요. 랭킹에 반영됩니다!<br/>
                  <span className="text-white/40">Kiếm tiền khi hoàn thành nhiệm vụ. Ảnh hưởng xếp hạng!</span>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-2 bg-white/5 rounded-lg">
              <Target className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-xs font-bold">미션 (nhiệm vụ / NV)</p>
                <p className="text-white/60 text-[10px]">
                  완료한 미션 수. 많이 할수록 포인트 증가!<br/>
                  <span className="text-white/40">Số nhiệm vụ hoàn thành. Làm nhiều = Nhiều điểm!</span>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-2 bg-white/5 rounded-lg">
              <Star className="w-5 h-5 text-neon-cyan shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-xs font-bold">포인트 (điểm / Điểm)</p>
                <p className="text-white/60 text-[10px]">
                  모든 게임에서 얻는 총 점수. 랭킹 순위 기준!<br/>
                  <span className="text-white/40">Tổng điểm từ tất cả game. Tiêu chí xếp hạng!</span>
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Important Tips */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-4 rounded-xl mb-4 border border-neon-cyan/30"
        >
          <h3 className="text-neon-cyan font-bold text-sm mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            중요한 팁! / Mẹo quan trọng!
          </h3>
          <div className="space-y-2">
            <div className="flex items-start gap-2 p-2 bg-white/5 rounded-lg">
              <Keyboard className="w-4 h-4 text-neon-pink shrink-0 mt-0.5" />
              <p className="text-white/80 text-[11px]">
                <span className="text-white font-bold">한국어로 대화하세요!</span><br/>
                <span className="text-white/50">Hãy trò chuyện bằng tiếng Hàn!</span>
              </p>
            </div>
            <div className="flex items-start gap-2 p-2 bg-white/5 rounded-lg">
              <Star className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-white/80 text-[11px]">
                <span className="text-white font-bold">자연스럽게 말할수록 점수가 높아요</span><br/>
                <span className="text-white/50">Nói càng tự nhiên, điểm càng cao</span>
              </p>
            </div>
            <div className="flex items-start gap-2 p-2 bg-white/5 rounded-lg">
              <Lightbulb className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <p className="text-white/80 text-[11px]">
                <span className="text-white font-bold">틀려도 괜찮아요! 배우는 과정이에요</span><br/>
                <span className="text-white/50">Sai cũng không sao! Đây là quá trình học</span>
              </p>
            </div>
            <div className="flex items-start gap-2 p-2 bg-white/5 rounded-lg">
              <BookOpen className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-white/80 text-[11px]">
                <span className="text-white font-bold">설명은 베트남어로 제공됩니다</span><br/>
                <span className="text-white/50">Giải thích sẽ bằng tiếng Việt</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Game Guides - Expandable */}
        <div className="space-y-3 mb-4">
          <h3 className="text-white font-bold text-sm px-1 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            게임별 상세 사용법 / Hướng dẫn chi tiết từng game
          </h3>
          <p className="text-white/50 text-[10px] px-1">
            각 게임을 터치하면 상세 설명이 나타납니다<br/>
            <span className="text-white/30">Chạm vào mỗi game để xem hướng dẫn chi tiết</span>
          </p>
          
          {gameGuides.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.03 }}
              className="glass-card rounded-xl overflow-hidden"
            >
              {/* Game Header - Clickable */}
              <button
                onClick={() => toggleGame(game.id)}
                className="w-full p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${game.color} flex items-center justify-center shrink-0`}>
                    <game.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-white font-bold text-sm">{game.title}</h4>
                    <p className="text-white/50 text-[10px]">{game.titleVi}</p>
                  </div>
                </div>
                {expandedGame === game.id ? (
                  <ChevronUp className="w-5 h-5 text-white/50" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white/50" />
                )}
              </button>

              {/* Expanded Content */}
              <AnimatePresence>
                {expandedGame === game.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-4">
                      {/* Summary */}
                      <div className="p-3 bg-gradient-to-r from-white/5 to-white/10 rounded-lg border-l-2 border-neon-cyan">
                        <p className="text-white text-xs">{game.summary.ko}</p>
                        <p className="text-white/50 text-[10px] mt-1">{game.summary.vi}</p>
                      </div>

                      {/* How to Start */}
                      <div className="p-3 bg-neon-pink/10 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <MousePointer className="w-4 h-4 text-neon-pink" />
                          <span className="text-neon-pink font-bold text-xs">시작 방법 / Cách bắt đầu</span>
                        </div>
                        <p className="text-white text-[11px]">{game.howToStart.ko}</p>
                        <p className="text-white/50 text-[10px]">{game.howToStart.vi}</p>
                      </div>

                      {/* Detailed Steps */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <ArrowRight className="w-4 h-4 text-neon-cyan" />
                          <span className="text-neon-cyan font-bold text-xs">단계별 설명 / Hướng dẫn từng bước</span>
                        </div>
                        <div className="space-y-3">
                          {game.detailedSteps.map((step, stepIndex) => (
                            <div key={stepIndex} className="p-3 bg-white/5 rounded-lg">
                              <div className="flex items-start gap-2 mb-2">
                                <span className="w-5 h-5 rounded-full bg-neon-cyan/20 text-neon-cyan text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {stepIndex + 1}
                                </span>
                                <div>
                                  <p className="text-white font-bold text-xs">{step.ko}</p>
                                  <p className="text-white/40 text-[10px]">{step.vi}</p>
                                </div>
                              </div>
                              <div className="ml-7">
                                <p className="text-white/80 text-[11px] leading-relaxed">{step.detail_ko}</p>
                                <p className="text-white/40 text-[10px] leading-relaxed mt-1">{step.detail_vi}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tips */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="w-4 h-4 text-yellow-500" />
                          <span className="text-yellow-500 font-bold text-xs">팁 / Mẹo</span>
                        </div>
                        <div className="space-y-2">
                          {game.tips.map((tip, tipIndex) => (
                            <div key={tipIndex} className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded-lg">
                              <CheckCircle2 className="w-3 h-3 text-yellow-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-white/90 text-[10px]">{tip.ko}</p>
                                <p className="text-white/40 text-[9px]">{tip.vi}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Warnings */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span className="text-red-500 font-bold text-xs">주의! / Lưu ý!</span>
                        </div>
                        <div className="space-y-2">
                          {game.warnings.map((warning, warnIndex) => (
                            <div key={warnIndex} className="flex items-start gap-2 p-2 bg-red-500/10 rounded-lg">
                              <AlertCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-white/90 text-[10px]">{warning.ko}</p>
                                <p className="text-white/40 text-[9px]">{warning.vi}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Start Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-4"
        >
          <Button 
            className="w-full h-14 bg-gradient-to-r from-neon-pink to-neon-purple hover:opacity-90 text-white font-bold text-base"
            onClick={() => navigate("/dashboard")}
          >
            <div className="flex flex-col items-center">
              <span>지금 시작하기!</span>
              <span className="text-xs opacity-70">Bắt đầu ngay!</span>
            </div>
          </Button>
        </motion.div>
      </div>

      {/* Footer */}
      <AppFooter compact />
    </div>
  );
};

export default Tutorial;
