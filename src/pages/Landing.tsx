import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, MessageCircle, Heart, Gamepad2, Music, Film, Briefcase, Brain, Trophy, ChevronDown, Star, Quote, ExternalLink } from "lucide-react";
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
    title: "베트남 랭킹",
    titleVi: "Bảng Xếp Hạng VN",
    desc: "베트남 학습자들과 경쟁하세요",
    descVi: "Cạnh tranh với người học tại Việt Nam",
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

interface Review {
  id: string;
  content: string;
  rating: number;
  created_at: string;
  user_id: string;
  profiles?: {
    username: string;
    points: number;
  };
}

const Landing = () => {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const gamesRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/game");
      }
    });
    setTimeout(() => setIsLoaded(true), 100);
    fetchReviews();

    // Realtime subscription for reviews
    const channel = supabase
      .channel('reviews-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews'
        },
        () => {
          fetchReviews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from("reviews")
      .select(`
        id,
        content,
        rating,
        created_at,
        user_id,
        profiles:user_id (
          username,
          points
        )
      `)
      .order("created_at", { ascending: false })
      .limit(6);
    
    if (!error && data) {
      setReviews(data as unknown as Review[]);
    }
  };


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
            className="text-slate-600 text-lg sm:text-xl leading-[1.9] mb-12 max-w-sm mx-auto font-medium"
          >
            Biến việc học nhàm chán thành{" "}
            <motion.span 
              className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 font-bold"
              whileHover={{ scale: 1.05 }}
            >
              trò chơi thú vị
            </motion.span>
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
            className="text-slate-500 text-base sm:text-lg leading-[1.8] mb-12 max-w-sm mx-auto"
          >
            Chỉ 10 phút mỗi ngày để xây dựng
            <br />
            thói quen học tiếng Hàn bền vững
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
            className="w-full flex justify-center"
          >
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="w-full max-w-xs"
            >
              <Button
                onClick={() => navigate("/auth")}
                className="group relative w-full h-14 bg-gradient-to-r from-blue-600 via-blue-500 to-violet-600 hover:from-blue-700 hover:via-blue-600 hover:to-violet-700 text-white text-lg font-bold rounded-2xl shadow-2xl shadow-blue-500/40 hover:shadow-blue-600/50 transition-all duration-300 overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                />
                <span className="relative flex items-center justify-center gap-2">
                  Bắt đầu ngay
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="w-5 h-5" />
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
            className="text-slate-400 text-xs mt-6 font-medium"
          >
            Miễn phí 100% • AI hỗ trợ • 8 game đa dạng
          </motion.p>

        </div>

        {/* Scroll indicator - moved outside content div, positioned at bottom */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ delay: 1.5 }}
          onClick={scrollToGames}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer z-10"
        >
          <span className="text-xs font-medium">Xem thêm</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronDown className="w-5 h-5" />
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
                className="h-14 px-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-base font-bold rounded-xl shadow-xl shadow-violet-500/30"
              >
                <span>지금 시작하기 • Bắt đầu ngay</span>
                <ArrowRight className="w-5 h-5 ml-2 shrink-0" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Reviews Section */}
      <section ref={reviewsRef} className="px-6 py-24 bg-gradient-to-b from-white via-slate-50/50 to-white relative">
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
              className="inline-block px-5 py-2 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 font-semibold text-sm rounded-full mb-6"
            >
              💬 사용자 후기 • Đánh giá người dùng
            </motion.span>
            
            <h2 className="text-4xl sm:text-5xl font-black text-slate-800 mb-6">
              <span className="block">학습자들의</span>
              <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                생생한 후기
              </span>
            </h2>
            
            <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
              Đánh giá thực tế từ người học tiếng Hàn
            </p>
          </motion.div>

          {/* Reviews Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {reviews.length > 0 ? reviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative p-6 rounded-3xl bg-white border border-slate-200/80 shadow-lg shadow-slate-200/50 overflow-hidden group"
              >
                {/* Quote icon */}
                <Quote className="absolute top-4 right-4 w-8 h-8 text-slate-100" />
                
                {/* Rating stars */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-4 h-4 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} 
                    />
                  ))}
                </div>
                
                {/* Review content */}
                <p className="text-slate-600 leading-relaxed mb-4 line-clamp-3">
                  "{review.content}"
                </p>
                
                {/* User info */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {review.profiles?.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span className="font-medium text-slate-700 text-sm">
                      {review.profiles?.username || '익명'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-full">
                    <Trophy className="w-3 h-3 text-amber-500" />
                    <span className="text-xs font-semibold text-amber-600">
                      {review.profiles?.points?.toLocaleString() || 0}점
                    </span>
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="col-span-full text-center py-12">
                <p className="text-slate-400">아직 후기가 없습니다. 첫 번째 후기를 남겨주세요!</p>
                <p className="text-slate-300 text-sm mt-1">Chưa có đánh giá. Hãy là người đầu tiên!</p>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* Premium Footer */}
      <footer className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
          {/* Top Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img src="/favicon.png" alt="LUKATO" className="w-12 h-12 rounded-xl shadow-lg shadow-violet-500/30" />
                <div>
                  <h3 className="font-bold text-xl bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">LUKATO</h3>
                  <p className="text-slate-400 text-xs">Your Korean Mentor</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                AI와 함께하는 즐거운 한국어 학습 게임
                <br />
                <span className="text-slate-500">Học tiếng Hàn vui vẻ cùng AI</span>
              </p>
            </div>

            {/* Quick Links */}
            <div className="md:col-span-1">
              <h4 className="font-semibold text-white mb-4">바로가기 • Liên kết</h4>
              <div className="space-y-2">
                <a href="https://hanoi.topikbot.kr" target="_blank" rel="noopener noreferrer" 
                   className="flex items-center gap-2 text-slate-400 hover:text-violet-400 transition-colors text-sm group">
                  <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Hanoi Official Site
                </a>
                <a href="https://chat-topikbot.kr" target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 text-slate-400 hover:text-violet-400 transition-colors text-sm group">
                  <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  LUKATO AI Chat
                </a>
              </div>
            </div>

            {/* Stats */}
            <div className="md:col-span-1">
              <h4 className="font-semibold text-white mb-4">게임 정보 • Thông tin</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">8</div>
                  <div className="text-xs text-slate-400">게임 모드</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">AI</div>
                  <div className="text-xs text-slate-400">멘토링</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">100%</div>
                  <div className="text-xs text-slate-400">무료</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold">
                    <span role="img" aria-label="Vietnam flag">🇻🇳</span>
                  </div>
                  <div className="text-xs text-slate-400">Việt Nam</div>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent mb-8" />

          {/* Bottom Section */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">
              © 2025 LUKATO. Powered by{" "}
              <span className="text-violet-400 font-medium">LUKATO AI</span>
            </p>
            <div className="flex items-center gap-4">
              <span className="text-slate-500 text-xs">Made with ❤️ for Vietnamese learners</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
