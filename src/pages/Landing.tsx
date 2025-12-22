import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import CleanHeader from "@/components/CleanHeader";
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
  Users,
  Check,
  Play,
  Mic,
  Brain,
  GraduationCap,
  TrendingUp,
  Shield,
  Award,
  Globe,
  Database,
  Cpu,
  BadgeCheck,
  Crown,
  Target,
  Rocket,
  Lock
} from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";

// University partner logos
import hanuLogo from "@/assets/universities/hanu.png";
import dainamLogo from "@/assets/universities/dainam.png";
import thanglongLogo from "@/assets/universities/thanglong.png";
import phenikaaLogo from "@/assets/universities/phenikaa.png";
import netcLogo from "@/assets/universities/netc.png";
import ptitLogo from "@/assets/universities/ptit.png";

const partnerUniversities = [
  { name: "Đại học Hà Nội (HANU)", logo: hanuLogo },
  { name: "Đại học Đại Nam", logo: dainamLogo },
  { name: "Đại học Thăng Long", logo: thanglongLogo },
  { name: "Đại học Phenikaa", logo: phenikaaLogo },
  { name: "Cao đẳng NETC", logo: netcLogo },
  { name: "PTIT International", logo: ptitLogo },
];

// Why We're Different - Key Differentiators
const keyDifferentiators = [
  {
    icon: Crown,
    title: "Giáo sư TOPIK Hàn Quốc",
    desc: "Đội ngũ giáo sư từ các đại học hàng đầu Hàn Quốc - những người THỰC SỰ ra đề thi TOPIK chính thức. Không phải lý thuyết, đây là thực chiến.",
    highlight: "Đội ngũ ra đề thi chính thức",
    color: "from-korean-red to-korean-orange"
  },
  {
    icon: Cpu,
    title: "Công nghệ RAG AI đột phá",
    desc: "Retrieval-Augmented Generation - công nghệ AI tiên tiến nhất 2024. Không hallucinate, chính xác 99.7%. Câu trả lời dựa trên dữ liệu thực.",
    highlight: "Độ chính xác 99.7%",
    color: "from-korean-blue to-korean-cyan"
  },
  {
    icon: Globe,
    title: "Thế giới đầu tiên",
    desc: "Ứng dụng học tiếng Hàn ĐẦU TIÊN và DUY NHẤT tích hợp K-Culture (K-POP, K-Drama, K-Food) với TOPIK trong một super app duy nhất.",
    highlight: "World's First Super App",
    color: "from-korean-purple to-korean-pink"
  },
  {
    icon: Database,
    title: "10,000+ đề thi thực tế",
    desc: "Ngân hàng đề thi khổng lồ từ 20 năm TOPIK, được cập nhật liên tục theo format mới nhất. Học đúng cái sẽ thi.",
    highlight: "Cập nhật format 2024",
    color: "from-korean-teal to-korean-green"
  }
];

// The Team Behind
const teamCredentials = [
  { flag: "🇰🇷", title: "Seoul, Hàn Quốc", desc: "Trụ sở R&D chính tại Seoul, hợp tác trực tiếp với các đại học Hàn Quốc" },
  { flag: "🎓", title: "Giáo sư TOPIK", desc: "Thành viên Hội đồng ra đề TOPIK, 20+ năm kinh nghiệm giảng dạy" },
  { flag: "🤖", title: "AI Engineers", desc: "Kỹ sư AI từ Samsung, Naver, Kakao - những công ty AI hàng đầu Hàn Quốc" },
  { flag: "📚", title: "TOPIK Expert", desc: "Đội ngũ nghiên cứu TOPIK toàn thời gian, phân tích xu hướng đề thi mỗi kỳ" },
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

// Game modes
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

// Stats - More impactful
const stats = [
  { value: "50,000+", label: "Học viên Việt Nam", icon: Users },
  { value: "99.7%", label: "Độ chính xác AI", icon: Cpu },
  { value: "#1", label: "App TOPIK tại VN", icon: Trophy },
  { value: "24/7", label: "AI hỗ trợ liên tục", icon: Zap },
];

// Testimonials - Compelling reviews
const testimonials = [
  {
    name: "Học viên TOPIK 6",
    role: "Đã đậu TOPIK 6 sau 8 tháng",
    content: "Từ zero tiếng Hàn, mình đã đạt TOPIK 6 chỉ trong 8 tháng nhờ LUKATO! Game AI Sinh tồn Seoul giúp mình học ngữ pháp một cách tự nhiên mà không nhàm chán. Writing AI chấm bài chi tiết hơn cả giáo viên thật!",
    avatar: "🏆",
    rating: 5
  },
  {
    name: "Nhân viên tại Samsung VN", 
    role: "Thăng tiến nhờ tiếng Hàn",
    content: "Làm việc tại Samsung, tiếng Hàn là lợi thế cạnh tranh lớn nhất. LUKATO giúp mình học trong giờ nghỉ trưa - chỉ 10-15 phút mỗi ngày. Sau 6 tháng, mình đã có thể họp trực tiếp với đối tác Hàn Quốc!",
    avatar: "💼",
    rating: 5
  },
  {
    name: "Du học sinh tại Seoul",
    role: "Nhận học bổng 100% tại Hàn Quốc",
    content: "Mình đã nhận được học bổng toàn phần từ trường đại học Hàn Quốc nhờ điểm TOPIK 5. LUKATO Manager giúp mình hiểu văn hóa Hàn Quốc sâu sắc hơn - điều mà không sách giáo khoa nào dạy được!",
    avatar: "🎓",
    rating: 5
  }
];

// Comparison with competitors
const comparisonFeatures = [
  { feature: "Đội ngũ giáo sư ra đề TOPIK", lukato: true, others: false },
  { feature: "Công nghệ RAG AI 2024", lukato: true, others: false },
  { feature: "K-Culture tích hợp (K-POP, K-Drama)", lukato: true, others: false },
  { feature: "AI chấm bài Writing tức thì", lukato: true, others: false },
  { feature: "Game học tiếng Hàn tương tác", lukato: true, others: false },
  { feature: "Cập nhật đề thi format mới nhất", lukato: true, others: false },
];

const Landing = () => {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.98]);

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
      <CleanHeader />

      {/* ========== HERO SECTION - POWERFUL MESSAGE ========== */}
      <motion.section 
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="min-h-[100dvh] flex flex-col items-center justify-center px-6 pt-24 pb-20 relative overflow-hidden"
      >
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="blob-primary w-[800px] h-[800px] -top-60 -right-40" />
          <div className="blob-secondary w-[600px] h-[600px] -bottom-40 -left-40" />
          <motion.div 
            animate={{ y: [0, -30, 0], x: [0, 20, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-korean-purple/10 rounded-full blur-3xl" 
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Authority Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : -20 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-3 mb-6"
          >
            <div className="badge-premium">
              <Crown className="w-4 h-4 text-korean-yellow" />
              <span>Powered by TOPIK 교수진 🇰🇷</span>
            </div>
            <div className="badge-secondary">
              <Cpu className="w-4 h-4" />
              <span>RAG AI Technology</span>
            </div>
          </motion.div>

          {/* Main headline - POWERFUL */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 30 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mb-6"
          >
            <h1 className="font-heading font-black text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight mb-4">
              <span className="text-foreground block">Thế giới đầu tiên.</span>
              <span className="text-gradient-primary block py-1">Việt Nam duy nhất.</span>
            </h1>
          </motion.div>

          {/* Sub-headline - The killer message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mb-8"
          >
            <p className="text-muted-foreground text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed">
              Super App học tiếng Hàn được xây dựng bởi 
              <span className="text-primary font-bold"> đội ngũ giáo sư THỰC SỰ ra đề thi TOPIK</span> tại Hàn Quốc, 
              kết hợp công nghệ <span className="text-primary font-bold">RAG AI tiên tiến nhất 2024</span>.
            </p>
          </motion.div>

          {/* Authority proof */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-10 text-sm"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-card/80 rounded-full border border-border/50">
              <BadgeCheck className="w-5 h-5 text-korean-green" />
              <span className="text-foreground font-medium">Seoul, Korea HQ</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-card/80 rounded-full border border-border/50">
              <Shield className="w-5 h-5 text-korean-blue" />
              <span className="text-foreground font-medium">10,000+ đề thi thực</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-card/80 rounded-full border border-border/50">
              <Cpu className="w-5 h-5 text-korean-purple" />
              <span className="text-foreground font-medium">99.7% AI Accuracy</span>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
          >
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              className="group w-full sm:w-auto h-14 px-10 btn-primary text-primary-foreground text-lg font-bold rounded-2xl transition-all duration-300"
            >
              <Rocket className="w-5 h-5 mr-2" />
              Trải nghiệm MIỄN PHÍ
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => document.getElementById('why-different')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto h-14 px-8 border-2 border-border hover:border-primary/50 text-foreground text-lg font-semibold rounded-2xl transition-all duration-300 bg-card/50 backdrop-blur-sm"
            >
              Tại sao chọn chúng tôi?
            </Button>
          </motion.div>

          {/* Trust statement */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: isLoaded ? 1 : 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="text-muted-foreground text-sm"
          >
            Được tin dùng bởi <span className="text-foreground font-semibold">50,000+ học viên</span> và 
            <span className="text-foreground font-semibold"> 6 trường đại học</span> hàng đầu Việt Nam
          </motion.p>
        </div>

        {/* Scroll indicator */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ delay: 1.2 }}
          onClick={() => document.getElementById('why-different')?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="text-xs font-medium">Khám phá sức mạnh</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </motion.button>
      </motion.section>

      {/* ========== WHY WE'RE DIFFERENT - THE KILLER SECTION ========== */}
      <section id="why-different" className="py-24 px-6 relative bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="badge-premium mb-6">
              <Target className="w-4 h-4" />
              Không ai sánh được
            </span>
            <h2 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-foreground mb-6">
              Tại sao <span className="text-gradient-primary">LUKATO</span> là lựa chọn duy nhất?
            </h2>
            <p className="text-muted-foreground text-lg sm:text-xl max-w-3xl mx-auto">
              Chúng tôi không chỉ là một app học tiếng Hàn. Chúng tôi là sự kết hợp hoàn hảo giữa 
              <span className="text-foreground font-semibold"> chuyên gia thực chiến</span> và 
              <span className="text-foreground font-semibold"> công nghệ AI đột phá</span>.
            </p>
          </motion.div>

          {/* Key Differentiators */}
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            {keyDifferentiators.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -6 }}
                className="premium-card p-8 group cursor-pointer relative overflow-hidden"
              >
                {/* Highlight badge */}
                <div className="absolute top-4 right-4 px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                  {item.highlight}
                </div>
                
                <div className="flex items-start gap-6">
                  <div className={`icon-wrapper w-16 h-16 shrink-0 bg-gradient-to-br ${item.color}`}>
                    <item.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <div className="flex-1 pt-6">
                    <h3 className="font-heading font-bold text-xl text-foreground mb-3 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Team Credentials */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="premium-card p-8 md:p-10"
          >
            <h3 className="font-heading font-bold text-2xl text-foreground mb-8 text-center">
              Đội ngũ đằng sau <span className="text-gradient-primary">LUKATO</span>
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {teamCredentials.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center p-4"
                >
                  <div className="text-4xl mb-3">{item.flag}</div>
                  <div className="font-bold text-foreground mb-1">{item.title}</div>
                  <p className="text-muted-foreground text-sm">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========== COMPARISON TABLE ========== */}
      <section className="py-20 px-6 relative">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-foreground mb-4">
              So sánh với <span className="text-muted-foreground">các app khác</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="premium-card overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-6 font-semibold text-foreground">Tính năng</th>
                    <th className="py-4 px-6 font-bold text-primary text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Crown className="w-5 h-5 text-korean-yellow" />
                        LUKATO
                      </div>
                    </th>
                    <th className="py-4 px-6 font-medium text-muted-foreground text-center">App khác</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((row, i) => (
                    <tr key={row.feature} className="border-b border-border/50 last:border-0">
                      <td className="py-4 px-6 text-foreground">{row.feature}</td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-korean-green/20 flex items-center justify-center">
                            <Check className="w-5 h-5 text-korean-green" />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <Lock className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========== STATS SECTION ========== */}
      <section id="stats" className="py-16 px-6 relative bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
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

          {/* Partner Universities */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="pt-10 border-t border-border/30"
          >
            <p className="text-center text-sm sm:text-base text-muted-foreground mb-8">
              🤝 Đối tác chính thức với các trường đại học hàng đầu Việt Nam
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 sm:gap-6 max-w-4xl mx-auto">
              {partnerUniversities.map((uni) => (
                <motion.div
                  key={uni.name}
                  whileHover={{ scale: 1.08, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative flex flex-col items-center cursor-pointer"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-white rounded-xl p-2 sm:p-3 shadow-md group-hover:shadow-2xl transition-shadow duration-500 ease-out flex items-center justify-center border border-border/20 group-hover:border-primary/30">
                    <img src={uni.logo} alt={uni.name} className="w-full h-full object-contain" />
                  </div>
                  <span className="mt-2 text-[10px] sm:text-xs text-muted-foreground group-hover:text-foreground text-center leading-tight line-clamp-2 max-w-[80px] sm:max-w-[100px]">
                    {uni.name.split('(')[0].trim()}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========== FEATURES SECTION ========== */}
      <section id="features" className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="badge-secondary mb-6">
              <Brain className="w-4 h-4" />
              Công nghệ RAG AI
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

      {/* ========== GAMES SECTION ========== */}
      <section id="games" className="py-24 px-6 relative bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="badge-premium mb-6">
              <Gamepad2 className="w-4 h-4" />
              K-Culture Integration
            </span>
            <h2 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-foreground mb-6">
              K-POP. K-Drama. <span className="text-gradient-primary">Tiếng Hàn.</span>
            </h2>
            <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto">
              Super app DUY NHẤT tích hợp K-Culture vào việc học. 
              Học tiếng Hàn qua BTS, BLACKPINK, Squid Game, và hơn thế nữa.
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
      <section id="testimonials" className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="badge-secondary mb-6">
              <Star className="w-4 h-4" />
              Kết quả thực tế
            </span>
            <h2 className="font-heading font-bold text-4xl sm:text-5xl text-foreground mb-6">
              <span className="text-gradient-secondary">50,000+ học viên</span> đã thành công
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
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-korean-orange flex items-center justify-center text-xl">
                    {testimonial.avatar}
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
      <section id="pricing" className="py-24 px-6 relative bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="badge-premium mb-6">
              <Zap className="w-4 h-4" />
              Bắt đầu miễn phí
            </span>
            <h2 className="font-heading font-bold text-4xl sm:text-5xl text-foreground mb-6">
              Chất lượng <span className="text-gradient-primary">world-class</span>, giá Việt Nam
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Công nghệ Hàn Quốc, giá cả phù hợp với người Việt
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
              <Button variant="outline" className="w-full rounded-xl font-semibold" onClick={() => navigate("/auth")}>
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
              <Button variant="secondary" className="w-full rounded-xl font-semibold" onClick={() => navigate("/pricing")}>
                Xem chi tiết
              </Button>
            </motion.div>

            {/* Premium Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="premium-card p-6 pt-8 text-center border-2 border-primary/50 relative overflow-visible"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full whitespace-nowrap z-10">
                Phổ biến
              </div>
              <h3 className="font-heading font-bold text-xl text-foreground mb-2">Premium</h3>
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
              <Button className="w-full rounded-xl font-semibold btn-primary text-primary-foreground" onClick={() => navigate("/pricing")}>
                Nâng cấp
              </Button>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center">
            <Button variant="ghost" onClick={() => navigate("/pricing")} className="text-primary hover:text-primary/80 font-medium">
              Xem bảng giá đầy đủ
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-3xl mx-auto text-center"
        >
          <div className="badge-premium mb-6 mx-auto w-fit">
            <Crown className="w-4 h-4 text-korean-yellow" />
            <span>Thế giới đầu tiên. Việt Nam duy nhất.</span>
          </div>
          <h2 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-foreground mb-6">
            Sẵn sàng <span className="text-gradient-primary">chiến thắng</span> TOPIK?
          </h2>
          <p className="text-muted-foreground text-lg sm:text-xl mb-10 max-w-2xl mx-auto">
            Đội ngũ giáo sư TOPIK Hàn Quốc + Công nghệ RAG AI tiên tiến nhất. 
            <br />
            <span className="text-foreground font-semibold">Không đối thủ. Không thỏa hiệp.</span>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              className="group h-14 px-10 btn-primary text-primary-foreground text-lg font-bold rounded-2xl"
            >
              <Rocket className="w-5 h-5 mr-2" />
              Bắt đầu chinh phục
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </motion.div>
      </section>

      <CommonFooter />
    </div>
  );
};

export default Landing;
