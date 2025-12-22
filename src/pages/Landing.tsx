import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MegaMenu } from "@/components/MegaMenu";
import CommonFooter from "@/components/CommonFooter";
import { 
  ArrowRight, 
  Sparkles, 
  BookOpen, 
  Headphones, 
  PenTool, 
  Trophy,
  Gamepad2,
  MessageCircle,
  Heart,
  Music,
  Film,
  Briefcase,
  ChevronDown,
  Star,
  Zap,
  Target,
  Users,
  Check,
  Play,
  Mic,
  Brain,
  GraduationCap,
  TrendingUp,
  Shield,
  Award
} from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";

// TOPIK Levels for Vietnamese learners
const topikLevels = [
  { level: "TOPIK I", grades: "Cấp 1-2", desc: "Giao tiếp cơ bản", color: "from-korean-green to-korean-teal" },
  { level: "TOPIK II", grades: "Cấp 3-4", desc: "Trung cấp nâng cao", color: "from-korean-blue to-korean-indigo" },
  { level: "TOPIK II", grades: "Cấp 5-6", desc: "Thành thạo chuyên nghiệp", color: "from-korean-purple to-korean-pink" },
];

// Core features
const coreFeatures = [
  {
    icon: Headphones,
    title: "Luyện Nghe TOPIK",
    desc: "Hệ thống bài thi nghe chuẩn TOPIK với AI phân tích phát âm và ngữ điệu chuẩn bản xứ",
    color: "from-korean-blue to-korean-cyan",
    stat: "500+",
    statLabel: "bài nghe"
  },
  {
    icon: BookOpen,
    title: "Đọc Hiểu Chuyên Sâu",
    desc: "Luyện đọc văn bản từ cơ bản đến nâng cao với giải thích ngữ pháp chi tiết bằng tiếng Việt",
    color: "from-korean-teal to-korean-green",
    stat: "1,000+",
    statLabel: "bài đọc"
  },
  {
    icon: PenTool,
    title: "AI Chấm Viết 24/7",
    desc: "Nộp bài viết và nhận phản hồi chi tiết từ AI trong vài giây. Sửa lỗi ngữ pháp, từ vựng, cấu trúc câu",
    color: "from-korean-purple to-korean-indigo",
    stat: "Tức thì",
    statLabel: "phản hồi"
  },
  {
    icon: Mic,
    title: "Luyện Phát Âm AI",
    desc: "Công nghệ nhận dạng giọng nói giúp bạn phát âm chuẩn như người Hàn Quốc bản xứ",
    color: "from-korean-pink to-korean-red",
    stat: "99%",
    statLabel: "chính xác"
  },
];

// Game modes - Vietnamese native
const gameModes = [
  { 
    icon: MessageCircle, 
    name: "Sinh Tồn AI", 
    desc: "10 lượt hội thoại quyết định số phận. Bạn có thoát được?",
    color: "from-korean-red to-korean-orange",
    badge: "Hot"
  },
  { 
    icon: Heart, 
    name: "Tình Yêu Seoul", 
    desc: "Hẹn hò với người Hàn Quốc qua chat. Luyện ngôn ngữ yêu đương",
    color: "from-korean-pink to-korean-red",
    badge: "Mới"
  },
  { 
    icon: Gamepad2, 
    name: "Nối Từ Tiếng Hàn", 
    desc: "Đấu trí với AI trong trò chơi nối đuôi từ vựng kinh điển",
    color: "from-korean-blue to-korean-purple",
    badge: null
  },
  { 
    icon: Music, 
    name: "K-POP Quiz", 
    desc: "Học từ lời bài hát BTS, BLACKPINK, NewJeans và hơn thế nữa",
    color: "from-korean-purple to-korean-pink",
    badge: "⭐"
  },
  { 
    icon: Film, 
    name: "Lồng Tiếng K-Drama", 
    desc: "Nhập vai diễn viên, lồng tiếng những cảnh phim huyền thoại",
    color: "from-korean-orange to-korean-yellow",
    badge: null
  },
  { 
    icon: Briefcase, 
    name: "Làm Thêm Hàn Quốc", 
    desc: "Mô phỏng thực tế làm việc part-time tại các cửa hàng Hàn Quốc",
    color: "from-korean-teal to-korean-green",
    badge: "Thực tế"
  },
];

// Stats
const stats = [
  { value: "50,000+", label: "Học viên Việt Nam", icon: Users },
  { value: "98%", label: "Hài lòng", icon: Star },
  { value: "TOPIK 6", label: "Cấp cao nhất đạt được", icon: Trophy },
  { value: "10 phút", label: "Mỗi ngày là đủ", icon: Zap },
];

// Testimonials
const testimonials = [
  {
    name: "Nguyễn Thị Mai",
    role: "Sinh viên ĐH Ngoại Ngữ Hà Nội",
    content: "Mình đã đạt TOPIK 4 chỉ sau 6 tháng học với LUKATO. Phương pháp học qua game thực sự hiệu quả!",
    avatar: "M",
    rating: 5
  },
  {
    name: "Trần Văn Hùng", 
    role: "Nhân viên Samsung Việt Nam",
    content: "Công cụ luyện phát âm AI giúp mình tự tin giao tiếp với đồng nghiệp Hàn Quốc mỗi ngày.",
    avatar: "H",
    rating: 5
  },
  {
    name: "Lê Hoàng Yến",
    role: "Du học sinh tại Seoul",
    content: "Trước khi sang Hàn, mình đã học với LUKATO. Giờ mình có thể theo kịp bài giảng đại học!",
    avatar: "Y",
    rating: 5
  }
];

const Landing = () => {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.98]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
    setTimeout(() => setIsLoaded(true), 100);
  }, [navigate]);

  return (
    <div className="min-h-[100dvh] bg-background relative overflow-x-hidden">
      {/* Mega Menu Header */}
      <MegaMenu />

      {/* ========== HERO SECTION ========== */}
      <motion.section 
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="min-h-[100dvh] flex flex-col items-center justify-center px-6 pt-28 pb-20 relative overflow-hidden"
      >
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Primary blob */}
          <div className="blob-primary w-[800px] h-[800px] -top-60 -right-40" />
          {/* Secondary blob */}
          <div className="blob-secondary w-[600px] h-[600px] -bottom-40 -left-40" />
          {/* Accent blob */}
          <motion.div 
            animate={{ y: [0, -30, 0], x: [0, 20, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-korean-purple/10 rounded-full blur-3xl" 
          />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : -20 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="badge-premium mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span>🇻🇳 Nền tảng học tiếng Hàn #1 dành cho người Việt</span>
          </motion.div>

          {/* Main headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 30 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mb-8"
          >
            <h1 className="font-heading font-black text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.05] tracking-tight mb-8">
              <span className="text-foreground block">Chinh phục TOPIK</span>
              <span className="text-gradient-primary block py-2">Chỉ 10 phút mỗi ngày</span>
            </h1>
            <p className="text-muted-foreground text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed">
              Học tiếng Hàn như <span className="text-primary font-semibold">chơi game</span>. 
              Công nghệ AI tiên tiến giúp bạn nói chuẩn, viết đẹp, 
              <br className="hidden md:block" />
              và đạt chứng chỉ TOPIK nhanh nhất.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              className="group w-full sm:w-auto h-14 px-8 btn-primary text-primary-foreground text-lg font-bold rounded-2xl transition-all duration-300"
            >
              <Play className="w-5 h-5 mr-2" />
              Học thử miễn phí
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/tutorial")}
              className="w-full sm:w-auto h-14 px-8 border-2 border-border hover:border-primary/50 text-foreground text-lg font-semibold rounded-2xl transition-all duration-300 bg-card/50 backdrop-blur-sm"
            >
              Xem hướng dẫn
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex flex-wrap items-center justify-center gap-6 text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-korean-green" />
              <span className="text-sm font-medium">Miễn phí trọn đời</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-korean-blue" />
              <span className="text-sm font-medium">50,000+ học viên</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-korean-purple" />
              <span className="text-sm font-medium">Tỷ lệ đỗ TOPIK 95%</span>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ delay: 1.2 }}
          onClick={() => document.getElementById('stats')?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="text-xs font-medium">Khám phá thêm</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </motion.button>
      </motion.section>

      {/* ========== STATS SECTION ========== */}
      <section id="stats" className="py-20 px-6 relative bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="floating-card p-6 text-center"
              >
                <stat.icon className="w-8 h-8 mx-auto mb-4 text-primary" />
                <div className="stat-number text-4xl sm:text-5xl mb-2">{stat.value}</div>
                <div className="text-muted-foreground font-medium text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FEATURES SECTION ========== */}
      <section id="features" className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="badge-secondary mb-6">
              <Brain className="w-4 h-4" />
              Công nghệ AI tiên tiến
            </span>
            <h2 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-foreground mb-6">
              Học toàn diện <span className="text-gradient-secondary">4 kỹ năng</span>
            </h2>
            <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto">
              Hệ thống luyện thi TOPIK hoàn chỉnh với AI hỗ trợ 24/7, 
              được thiết kế đặc biệt cho người Việt Nam
            </p>
          </motion.div>

          {/* Feature cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {coreFeatures.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -6 }}
                className="premium-card p-8 group cursor-pointer"
              >
                <div className="flex items-start gap-6">
                  <div className={`icon-wrapper w-16 h-16 shrink-0 bg-gradient-to-br ${feature.color}`}>
                    <feature.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading font-bold text-xl text-foreground mb-2 group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      {feature.desc}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gradient-primary">{feature.stat}</span>
                      <span className="text-muted-foreground text-sm">{feature.statLabel}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== TOPIK LEVELS ========== */}
      <section className="py-20 px-6 bg-muted/30 relative">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-foreground mb-4">
              Lộ trình học theo <span className="text-gradient-primary">cấp độ TOPIK</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Chương trình được cá nhân hóa theo mục tiêu của bạn
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {topikLevels.map((level, i) => (
              <motion.div
                key={level.grades}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.03 }}
                className="floating-card p-6 text-center cursor-pointer"
              >
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${level.color} flex items-center justify-center`}>
                  <GraduationCap className="w-8 h-8 text-primary-foreground" />
                </div>
                <div className="text-sm font-semibold text-primary mb-1">{level.level}</div>
                <div className="font-heading font-bold text-2xl text-foreground mb-2">{level.grades}</div>
                <p className="text-muted-foreground text-sm">{level.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== GAMES SECTION ========== */}
      <section id="games" className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="badge-premium mb-6">
              <Gamepad2 className="w-4 h-4" />
              6 chế độ game độc quyền
            </span>
            <h2 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-foreground mb-6">
              Học mà như <span className="text-gradient-primary">chơi game</span>
            </h2>
            <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto">
              Quên đi những bài tập nhàm chán! Tiến bộ mỗi ngày với các 
              mini-game thú vị, nghiện và hiệu quả
            </p>
          </motion.div>

          {/* Game cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gameModes.map((game, i) => (
              <motion.div
                key={game.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="premium-card p-6 cursor-pointer group relative overflow-hidden"
              >
                {game.badge && (
                  <div className="absolute top-4 right-4 px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                    {game.badge}
                  </div>
                )}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                  <game.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="font-heading font-bold text-xl text-foreground mb-2 group-hover:text-primary transition-colors">
                  {game.name}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{game.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS ========== */}
      <section id="testimonials" className="py-24 px-6 bg-muted/30 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="badge-secondary mb-6">
              <Star className="w-4 h-4" />
              Đánh giá từ học viên
            </span>
            <h2 className="font-heading font-bold text-4xl sm:text-5xl text-foreground mb-6">
              Hơn <span className="text-gradient-secondary">50,000 học viên</span> tin dùng
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="premium-card p-6"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-korean-yellow text-korean-yellow" />
                  ))}
                </div>
                <p className="text-foreground mb-6 leading-relaxed">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-korean-orange flex items-center justify-center">
                    <span className="text-primary-foreground font-bold">{testimonial.avatar}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== PRICING SECTION ========== */}
      <section id="pricing" className="py-24 px-6 relative">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="badge-premium mb-6">
              <Zap className="w-4 h-4" />
              Bảng giá đơn giản
            </span>
            <h2 className="font-heading font-bold text-4xl sm:text-5xl text-foreground mb-6">
              Bắt đầu <span className="text-gradient-primary">miễn phí</span> ngay hôm nay
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Tất cả tính năng cơ bản đều miễn phí. Nâng cấp khi bạn cần thêm
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-10">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="premium-card p-6 text-center"
            >
              <h3 className="font-heading font-bold text-xl text-foreground mb-2">Miễn phí</h3>
              <div className="text-4xl font-black text-foreground mb-2">0₫</div>
              <p className="text-muted-foreground text-sm mb-4">Miễn phí mãi mãi</p>
              <ul className="space-y-2 text-sm text-left mb-6">
                {["5 bài học AI/ngày", "Tất cả game học", "Bảng xếp hạng"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-muted-foreground">
                    <Check className="w-4 h-4 text-korean-green shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button 
                variant="outline" 
                className="w-full rounded-xl font-semibold"
                onClick={() => navigate("/auth")}
              >
                Bắt đầu
              </Button>
            </motion.div>

            {/* Plus Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="premium-card p-6 text-center"
            >
              <h3 className="font-heading font-bold text-xl text-foreground mb-2">Plus</h3>
              <div className="text-4xl font-black text-foreground mb-2">200K₫</div>
              <p className="text-muted-foreground text-sm mb-4">/tháng</p>
              <ul className="space-y-2 text-sm text-left mb-6">
                {["AI Chat 20 lần/ngày", "Game nâng cao", "Hỗ trợ ưu tiên"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-muted-foreground">
                    <Check className="w-4 h-4 text-korean-cyan shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button 
                variant="secondary" 
                className="w-full rounded-xl font-semibold"
                onClick={() => navigate("/pricing")}
              >
                Xem chi tiết
              </Button>
            </motion.div>

            {/* Premium Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="premium-card p-6 text-center border-2 border-primary/50 relative"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                Phổ biến
              </div>
              <h3 className="font-heading font-bold text-xl text-foreground mb-2 mt-2">Premium</h3>
              <div className="text-4xl font-black text-foreground mb-2">500K₫</div>
              <p className="text-muted-foreground text-sm mb-4">/tháng</p>
              <ul className="space-y-2 text-sm text-left mb-6">
                {["AI không giới hạn", "Chấm Writing AI", "Báo cáo học tập"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-muted-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full rounded-xl font-semibold btn-primary text-primary-foreground"
                onClick={() => navigate("/pricing")}
              >
                Nâng cấp
              </Button>
            </motion.div>
          </div>

          {/* View Full Pricing Link */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <Button
              variant="ghost"
              onClick={() => navigate("/pricing")}
              className="text-primary hover:text-primary/80 font-medium"
            >
              Xem bảng giá đầy đủ
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section className="py-24 px-6 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-3xl mx-auto text-center"
        >
          <h2 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-foreground mb-6">
            Sẵn sàng chinh phục <span className="text-gradient-primary">tiếng Hàn</span>?
          </h2>
          <p className="text-muted-foreground text-lg sm:text-xl mb-10 max-w-2xl mx-auto">
            Tham gia cùng hơn 50,000 học viên Việt Nam. Chỉ cần 10 phút mỗi ngày, 
            bạn sẽ ngạc nhiên với sự tiến bộ của mình!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              className="group h-14 px-10 btn-primary text-primary-foreground text-lg font-bold rounded-2xl"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Bắt đầu học ngay
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* ========== FOOTER ========== */}
      <CommonFooter />
    </div>
  );
};

export default Landing;