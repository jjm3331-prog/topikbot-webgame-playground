import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";

const Tutorial = () => {
  const navigate = useNavigate();

  const gameGuides = [
    {
      icon: Dice6,
      title: "서울에서 생존",
      titleVi: "Sinh tồn tại Seoul",
      color: "from-neon-pink to-neon-purple",
      steps: [
        { ko: "장소를 선택하거나 '서울에서 생존' 클릭", vi: "Chọn địa điểm hoặc nhấn 'Sinh tồn tại Seoul'" },
        { ko: "AI와 한국어로 대화하세요", vi: "Trò chuyện bằng tiếng Hàn với AI" },
        { ko: "10턴 동안 생존하면 성공!", vi: "Sống sót 10 lượt là thành công!" },
        { ko: "자연스러운 한국어 = 높은 점수", vi: "Tiếng Hàn tự nhiên = Điểm cao" },
      ]
    },
    {
      icon: Heart,
      title: "Love Signal (연애 시뮬)",
      titleVi: "Tín hiệu tình yêu",
      color: "from-pink-500 to-rose-500",
      steps: [
        { ko: "마음에 드는 캐릭터 선택", vi: "Chọn nhân vật yêu thích" },
        { ko: "한국어로 대화하며 호감도 올리기", vi: "Trò chuyện bằng tiếng Hàn để tăng độ thân mật" },
        { ko: "호감도 100% 달성 = 특별 엔딩!", vi: "Đạt 100% thân mật = Kết thúc đặc biệt!" },
        { ko: "미니게임으로 보너스 호감도 획득", vi: "Chơi mini game để nhận thêm điểm thân mật" },
      ]
    },
    {
      icon: Link2,
      title: "끝말잇기",
      titleVi: "Nối từ",
      color: "from-cyan-500 to-blue-500",
      steps: [
        { ko: "AI가 한국어 단어를 말합니다", vi: "AI sẽ nói một từ tiếng Hàn" },
        { ko: "마지막 글자로 시작하는 단어 입력", vi: "Nhập từ bắt đầu bằng chữ cuối" },
        { ko: "15초 안에 답하세요!", vi: "Trả lời trong 15 giây!" },
        { ko: "연속 성공 = 높은 점수", vi: "Thành công liên tiếp = Điểm cao" },
      ]
    },
    {
      icon: MessageSquare,
      title: "관용어/슬랭 퀴즈",
      titleVi: "Quiz thành ngữ/Slang",
      color: "from-amber-500 to-yellow-500",
      steps: [
        { ko: "난이도 선택 (쉬움/보통/어려움)", vi: "Chọn độ khó (Dễ/Trung bình/Khó)" },
        { ko: "한국 관용어와 MZ슬랭 문제 풀기", vi: "Giải các câu hỏi về thành ngữ và slang MZ" },
        { ko: "힌트 사용 가능 (점수 절반)", vi: "Có thể dùng gợi ý (điểm giảm một nửa)" },
        { ko: "정답 후 상세 설명 제공", vi: "Sau khi trả lời sẽ có giải thích chi tiết" },
      ]
    },
    {
      icon: Film,
      title: "K-Drama 더빙",
      titleVi: "Lồng tiếng K-Drama",
      color: "from-purple-500 to-pink-500",
      steps: [
        { ko: "유명 드라마 대사가 나옵니다", vi: "Lời thoại từ phim nổi tiếng sẽ xuất hiện" },
        { ko: "원어민 음성 듣기 (TTS)", vi: "Nghe giọng nói người bản xứ (TTS)" },
        { ko: "마이크로 따라 읽기", vi: "Đọc theo bằng microphone" },
        { ko: "발음 정확도 점수 확인", vi: "Kiểm tra điểm phát âm chính xác" },
      ]
    },
    {
      icon: Music,
      title: "K-POP 가사 퀴즈",
      titleVi: "Quiz lời bài hát K-POP",
      color: "from-rose-500 to-red-500",
      steps: [
        { ko: "YouTube에서 K-POP 뮤직비디오 재생", vi: "Phát MV K-POP từ YouTube" },
        { ko: "빈칸에 들어갈 가사 맞추기", vi: "Điền lời bài hát còn thiếu" },
        { ko: "20초 안에 빠르게 답하면 보너스!", vi: "Trả lời nhanh trong 20 giây được thưởng!" },
        { ko: "정답 시 하이라이트 구간 다시 재생", vi: "Khi trả lời đúng sẽ phát lại đoạn highlight" },
      ]
    },
    {
      icon: Briefcase,
      title: "아르바이트",
      titleVi: "Làm thêm",
      color: "from-fuchsia-500 to-pink-500",
      steps: [
        { ko: "다양한 알바 시나리오 체험", vi: "Trải nghiệm các tình huống làm thêm" },
        { ko: "AI 손님과 한국어로 대화", vi: "Trò chuyện với khách hàng AI bằng tiếng Hàn" },
        { ko: "서비스 잘 하면 돈 획득!", vi: "Phục vụ tốt thì kiếm được tiền!" },
        { ko: "실수하면 돈 감소", vi: "Sai lầm sẽ bị trừ tiền" },
      ]
    },
    {
      icon: Zap,
      title: "파산 복구",
      titleVi: "Phục hồi phá sản",
      color: "from-green-500 to-emerald-500",
      steps: [
        { ko: "빚진 상태에서 시작", vi: "Bắt đầu trong tình trạng nợ nần" },
        { ko: "돈을 벌어 빚 갚기", vi: "Kiếm tiền để trả nợ" },
        { ko: "한국어 잘 하면 더 많이 벌어요", vi: "Nói tiếng Hàn tốt sẽ kiếm được nhiều hơn" },
        { ko: "빚 다 갚으면 성공!", vi: "Trả hết nợ là thành công!" },
      ]
    },
  ];

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
            <div className="flex items-start gap-3">
              <Heart className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-xs font-bold">HP (체력 / Máu)</p>
                <p className="text-white/60 text-[10px]">
                  게임에서 실수하면 줄어들어요. 0이 되면 게임 오버!<br/>
                  <span className="text-white/40">Giảm khi mắc lỗi trong game. Về 0 là thua!</span>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Coins className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-xs font-bold">소지금 (돈 / Tiền)</p>
                <p className="text-white/60 text-[10px]">
                  미션 성공하면 돈을 벌어요. 랭킹에 반영됩니다!<br/>
                  <span className="text-white/40">Kiếm tiền khi hoàn thành nhiệm vụ. Ảnh hưởng xếp hạng!</span>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-xs font-bold">미션 (nhiệm vụ / NV)</p>
                <p className="text-white/60 text-[10px]">
                  완료한 미션 수. 많이 할수록 포인트 증가!<br/>
                  <span className="text-white/40">Số nhiệm vụ hoàn thành. Làm nhiều = Nhiều điểm!</span>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
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
            <div className="flex items-start gap-2">
              <ArrowRight className="w-3 h-3 text-neon-pink shrink-0 mt-1" />
              <p className="text-white/80 text-[11px]">
                <span className="text-white font-bold">한국어로 대화하세요!</span><br/>
                <span className="text-white/50">Hãy trò chuyện bằng tiếng Hàn!</span>
              </p>
            </div>
            <div className="flex items-start gap-2">
              <ArrowRight className="w-3 h-3 text-neon-pink shrink-0 mt-1" />
              <p className="text-white/80 text-[11px]">
                <span className="text-white font-bold">자연스럽게 말할수록 점수가 높아요</span><br/>
                <span className="text-white/50">Nói càng tự nhiên, điểm càng cao</span>
              </p>
            </div>
            <div className="flex items-start gap-2">
              <ArrowRight className="w-3 h-3 text-neon-pink shrink-0 mt-1" />
              <p className="text-white/80 text-[11px]">
                <span className="text-white font-bold">틀려도 괜찮아요! 배우는 과정이에요</span><br/>
                <span className="text-white/50">Sai cũng không sao! Đây là quá trình học</span>
              </p>
            </div>
            <div className="flex items-start gap-2">
              <ArrowRight className="w-3 h-3 text-neon-pink shrink-0 mt-1" />
              <p className="text-white/80 text-[11px]">
                <span className="text-white font-bold">설명은 베트남어로 제공됩니다</span><br/>
                <span className="text-white/50">Giải thích sẽ bằng tiếng Việt</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Game Guides */}
        <div className="space-y-3">
          <h3 className="text-white font-bold text-sm px-1 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            게임별 사용법 / Hướng dẫn từng game
          </h3>
          
          {gameGuides.map((game, index) => (
            <motion.div
              key={game.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              className="glass-card p-4 rounded-xl"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${game.color} flex items-center justify-center shrink-0`}>
                  <game.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">{game.title}</h4>
                  <p className="text-white/50 text-[10px]">{game.titleVi}</p>
                </div>
              </div>
              <div className="space-y-2 pl-2">
                {game.steps.map((step, stepIndex) => (
                  <div key={stepIndex} className="flex items-start gap-2">
                    <span className="text-neon-cyan font-bold text-[10px] w-4 shrink-0">{stepIndex + 1}.</span>
                    <div>
                      <p className="text-white/90 text-[11px]">{step.ko}</p>
                      <p className="text-white/40 text-[10px]">{step.vi}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Start Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 mb-4"
        >
          <Button 
            className="w-full h-14 bg-gradient-to-r from-neon-pink to-neon-purple hover:opacity-90 text-white font-bold text-base"
            onClick={() => navigate("/game")}
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
