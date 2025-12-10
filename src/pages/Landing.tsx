import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, MessageCircle, Heart, Gamepad2, Music, Film, Briefcase, Brain, Trophy, ChevronDown } from "lucide-react";
import { motion, useInView } from "framer-motion";

const games = [
  {
    icon: MessageCircle,
    title: "AI 채팅 서바이벌",
    titleVi: "Chat Sinh Tồn AI",
    desc: "AI와 10턴 대화하며 위기 상황을 탈출하세요",
    descVi: "Trò chuyện 10 lượt với AI để thoát khỏi tình huống nguy hiểm",
    gradient: "from-emerald-500 to-teal-600",
    bgGradient: "from-emerald-50 to-teal-50"
  },
  {
    icon: Heart,
    title: "서울 러브 시그널",
    titleVi: "Seoul Love Signal",
    desc: "한국인 이성과 로맨틱한 대화를 나눠보세요",
    descVi: "Trò chuyện lãng mạn với người Hàn Quốc",
    gradient: "from-pink-500 to-rose-600",
    bgGradient: "from-pink-50 to-rose-50"
  },
  {
    icon: Gamepad2,
    title: "끝말잇기",
    titleVi: "Nối Từ",
    desc: "AI와 한국어 끝말잇기 대결",
    descVi: "Đấu nối từ tiếng Hàn với AI",
    gradient: "from-blue-500 to-indigo-600",
    bgGradient: "from-blue-50 to-indigo-50"
  },
  {
    icon: Brain,
    title: "관용어 퀴즈",
    titleVi: "Quiz Thành Ngữ",
    desc: "한국 관용어와 MZ 슬랭 마스터",
    descVi: "Làm chủ thành ngữ và tiếng lóng MZ Hàn Quốc",
    gradient: "from-violet-500 to-purple-600",
    bgGradient: "from-violet-50 to-purple-50"
  },
  {
    icon: Music,
    title: "K-POP 가사 맞추기",
    titleVi: "Đoán Lời K-POP",
    desc: "좋아하는 K-POP 가사로 학습",
    descVi: "Học qua lời bài hát K-POP yêu thích",
    gradient: "from-fuchsia-500 to-pink-600",
    bgGradient: "from-fuchsia-50 to-pink-50"
  },
  {
    icon: Film,
    title: "K-Drama 더빙",
    titleVi: "Lồng Tiếng K-Drama",
    desc: "드라마 명대사를 따라 말해보세요",
    descVi: "Luyện phát âm qua câu thoại drama nổi tiếng",
    gradient: "from-amber-500 to-orange-600",
    bgGradient: "from-amber-50 to-orange-50"
  },
  {
    icon: Briefcase,
    title: "알바 시뮬레이터",
    titleVi: "Mô Phỏng Part-time",
    desc: "한국 알바 현장을 체험하세요",
    descVi: "Trải nghiệm làm thêm tại Hàn Quốc",
    gradient: "from-cyan-500 to-blue-600",
    bgGradient: "from-cyan-50 to-blue-50"
  },
  {
    icon: Trophy,
    title: "글로벌 랭킹",
    titleVi: "Bảng Xếp Hạng",
    desc: "전 세계 학습자와 경쟁하세요",
    descVi: "Cạnh tranh với người học toàn cầu",
    gradient: "from-yellow-500 to-amber-600",
    bgGradient: "from-yellow-50 to-amber-50"
  }
];

const GameCard = ({ game, index }: { game: typeof games[0]; index: number }) => {
  const Icon = game.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className={`relative p-6 rounded-3xl bg-gradient-to-br ${game.bgGradient} border border-white/60 shadow-xl shadow-slate-200/50 backdrop-blur-sm overflow-hidden group cursor-pointer`}
    >
      {/* Glow effect on hover */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
      />
      
      {/* Icon */}
      <motion.div
        whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
        transition={{ duration: 0.5 }}
        className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${game.gradient} flex items-center justify-center mb-5 shadow-lg`}
      >
        <Icon className="w-7 h-7 text-white" />
      </motion.div>
      
      {/* Title */}
      <h3 className="text-slate-800 font-bold text-lg mb-1">{game.title}</h3>
      <p className="text-slate-500 font-medium text-sm mb-3">{game.titleVi}</p>
      
      {/* Description */}
      <p className="text-slate-600 text-sm leading-relaxed mb-1">{game.desc}</p>
      <p className="text-slate-400 text-xs">{game.descVi}</p>
      
      {/* Decorative corner */}
      <div className={`absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br ${game.gradient} opacity-10 rounded-full blur-2xl`} />
    </motion.div>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const gamesRef = useRef<HTMLDivElement>(null);
  const isGamesInView = useInView(gamesRef, { once: true, margin: "-100px" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/game");
      }
    });
    setTimeout(() => setIsLoaded(true), 100);
  }, [navigate]);

  const scrollToGames = () => {
    gamesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 via-white to-blue-50/30 relative overflow-x-hidden">
      {/* Hero Section */}
      <section className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-16 relative">
        {/* Animated gradient orbs */}
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.4, 0.6, 0.4]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-br from-blue-200/50 via-violet-200/40 to-pink-200/30 rounded-full blur-3xl pointer-events-none" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 20, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-cyan-200/40 via-blue-200/30 to-transparent rounded-full blur-3xl pointer-events-none" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.15, 1],
            y: [0, -20, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-0 w-[400px] h-[400px] bg-gradient-to-r from-violet-200/40 to-transparent rounded-full blur-3xl pointer-events-none" 
        />
        
        {/* Content */}
        <div className="relative z-10 max-w-lg mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : -20, scale: isLoaded ? 1 : 0.9 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            whileHover={{ scale: 1.02, boxShadow: "0 20px 40px -10px rgba(100, 100, 255, 0.15)" }}
            className="inline-flex items-center gap-3 px-6 py-3 bg-white/90 backdrop-blur-md rounded-full shadow-xl shadow-slate-200/60 border border-slate-100/80 mb-14 cursor-default"
          >
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="w-5 h-5 text-blue-600" />
            </motion.div>
            <span className="text-slate-700 font-semibold text-sm tracking-wide">
              Game học tiếng Hàn đầu tiên tại Việt Nam
            </span>
            <motion.span 
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50" 
            />
          </motion.div>

          {/* Main Title */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 30 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="mb-12"
          >
            <h1 className="font-black text-[3.2rem] sm:text-6xl md:text-7xl leading-[1.1] tracking-tight space-y-3">
              <motion.span 
                className="text-slate-900 block"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                CHINH PHỤC
              </motion.span>
              <motion.span 
                className="bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent block py-1"
                animate={{ backgroundPosition: ["0%", "100%", "0%"] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                style={{ backgroundSize: "200% 100%" }}
              >
                TIẾNG HÀN
              </motion.span>
              <motion.span 
                className="text-slate-400 block text-4xl sm:text-5xl font-bold"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                &
              </motion.span>
              <motion.span 
                className="bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-transparent block py-1"
                animate={{ backgroundPosition: ["0%", "100%", "0%"] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: 0.5 }}
                style={{ backgroundSize: "200% 100%" }}
              >
                VĂN HÓA
              </motion.span>
            </h1>
          </motion.div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="text-slate-600 text-lg sm:text-xl leading-[2] mb-14 max-w-md mx-auto font-medium"
          >
            Biến việc học nhàm chán
            <br />
            thành{" "}
            <motion.span 
              className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 font-bold"
              whileHover={{ scale: 1.05 }}
            >
              trò chơi thú vị
            </motion.span>
            <br />
            <br />
            Chỉ 10 phút mỗi ngày, xây dựng thói quen
            <br />
            và sự kiên trì trong học tiếng Hàn.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
          >
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={() => navigate("/auth")}
                className="group relative w-full max-w-sm h-16 bg-gradient-to-r from-blue-600 via-blue-500 to-violet-600 hover:from-blue-700 hover:via-blue-600 hover:to-violet-700 text-white text-xl font-bold rounded-2xl shadow-2xl shadow-blue-500/40 hover:shadow-blue-600/50 transition-all duration-300 overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                />
                <span className="relative flex items-center gap-3">
                  Bắt đầu miễn phí
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="w-6 h-6" />
                  </motion.div>
                </span>
              </Button>
            </motion.div>
          </motion.div>

          {/* Sub text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: isLoaded ? 1 : 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-slate-500 text-sm mt-8 font-medium tracking-wide"
          >
            8 game đa dạng • Hỗ trợ AI thông minh • Miễn phí 100%
          </motion.p>

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: isLoaded ? 1 : 0, scale: isLoaded ? 1 : 0.8 }}
            transition={{ duration: 0.6, delay: 1 }}
            whileHover={{ scale: 1.05 }}
            className="mt-16 flex items-center justify-center gap-4 cursor-pointer"
          >
            <motion.div 
              className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-slate-200/80 shadow-lg"
              whileHover={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 0.5 }}
            >
              <img src="/favicon.png" alt="LUKATO" className="w-full h-full object-cover" />
            </motion.div>
            <div className="flex flex-col items-start">
              <span className="font-extrabold text-slate-800 text-xl tracking-wide">LUKATO</span>
              <span className="text-xs text-blue-600 tracking-[0.2em] uppercase font-semibold">Your Korean Mentor</span>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ delay: 1.5 }}
          onClick={scrollToGames}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <span className="text-sm font-medium">Xem thêm</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronDown className="w-6 h-6" />
          </motion.div>
        </motion.button>

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-blue-400/30"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 4 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
          />
        ))}
      </section>

      {/* Games Section */}
      <section 
        ref={gamesRef}
        className="px-6 py-24 relative"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/0 via-violet-50/50 to-blue-50/0 pointer-events-none" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-block px-5 py-2 bg-gradient-to-r from-blue-100 to-violet-100 text-blue-700 font-semibold text-sm rounded-full mb-6"
            >
              8가지 게임 모드 • 8 Chế Độ Game
            </motion.span>
            
            <h2 className="text-4xl sm:text-5xl font-black text-slate-800 mb-6">
              <span className="block">재미있게 배우는</span>
              <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                한국어 마스터
              </span>
            </h2>
            
            <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
              Học tiếng Hàn một cách thú vị qua 8 game tương tác.
              <br />
              AI đồng hành cùng bạn trong mọi bước tiến.
            </p>
          </motion.div>

          {/* Games Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {games.map((game, index) => (
              <GameCard key={game.title} game={game} index={index} />
            ))}
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mt-16"
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={() => navigate("/auth")}
                className="h-14 px-10 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-lg font-bold rounded-xl shadow-xl shadow-violet-500/30"
              >
                지금 시작하기 • Bắt đầu ngay
                <ArrowRight className="w-5 h-5 ml-3" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/favicon.png" alt="LUKATO" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-slate-700">LUKATO</span>
          </div>
          <p className="text-slate-400 text-sm">
            © 2025 LUKATO. Your Korean Mentor.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
