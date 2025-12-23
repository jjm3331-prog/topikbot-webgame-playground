import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { 
  Briefcase, 
  Search, 
  Mic,
  ChevronRight,
  Building2,
  Users,
  Crown,
  Sparkles,
  Star,
  TrendingUp,
  Clock,
  CheckCircle2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { PremiumPreviewBanner } from "@/components/PremiumPreviewBanner";
import { useSubscription } from "@/hooks/useSubscription";

const KoreaCareer = () => {
  const navigate = useNavigate();
  const { isPremium } = useSubscription();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const services = [
    {
      id: "headhunting",
      icon: Briefcase,
      title: "Đăng ký Headhunting",
      subtitle: "Tuyển dụng chuyên nghiệp",
      description: "Đội ngũ headhunter chuyên nghiệp hỗ trợ bạn tìm việc tại các công ty Hàn Quốc hàng đầu",
      features: ["Tư vấn 1:1 miễn phí", "Kiểm tra & chỉnh sửa CV", "Coaching phỏng vấn", "Đàm phán lương"],
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-500/10 to-cyan-500/10",
      shadowColor: "shadow-blue-500/20",
      path: "/headhunting",
      status: "active",
      emoji: "💼"
    },
    {
      id: "company-report",
      icon: Search,
      title: "Báo cáo Doanh nghiệp",
      subtitle: "Phân tích công ty bằng AI",
      description: "AI phân tích sâu thông tin công ty Hàn Quốc: lương, văn hóa, review, tin tức mới nhất",
      features: ["Thông tin lương thưởng", "Văn hóa công ty", "Review phỏng vấn", "Tin tức cập nhật"],
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-500/10 to-pink-500/10",
      shadowColor: "shadow-purple-500/20",
      path: "/company-report",
      status: "coming",
      emoji: "🔍"
    },
    {
      id: "interview-sim",
      icon: Mic,
      title: "Phỏng vấn Mô phỏng",
      subtitle: "Luyện tập với AI Interviewer",
      description: "Luyện phỏng vấn thực tế với AI: đàm thoại bằng giọng nói, nhận feedback real-time",
      features: ["Đàm thoại bằng giọng nói", "Feedback real-time", "Phân tích điểm số", "Câu hỏi tùy chỉnh"],
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-500/10 to-red-500/10",
      shadowColor: "shadow-orange-500/20",
      path: "/interview-simulation",
      status: "active",
      emoji: "🎤"
    }
  ];

  const handleServiceClick = (service: typeof services[0]) => {
    if (service.status === "coming") {
      return;
    }
    navigate(service.path);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1 pt-8 pb-12 px-4 max-w-6xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Premium Preview Banner */}
          {!isPremium && <PremiumPreviewBanner featureName="dịch vụ tuyển dụng Hàn Quốc" />}

          {/* Header */}
          <div className="text-center space-y-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30"
            >
              <Building2 className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-foreground">🇰🇷 Việc làm tại Hàn Quốc</span>
            </motion.div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold">
              <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Korea Career
              </span>
              <span className="text-foreground"> Hub</span>
            </h1>
            
            <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
              Nền tảng <span className="text-primary font-semibold">All-in-One</span> giúp người Việt tìm việc tại Hàn Quốc
            </p>
            <p className="text-sm text-muted-foreground">
              Headhunting • Báo cáo doanh nghiệp • Phỏng vấn mô phỏng AI
            </p>
          </div>

          {/* Service Cards with 3D Effect */}
          <div className="grid gap-6 md:grid-cols-3">
            {services.map((service, idx) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                onMouseEnter={() => setHoveredCard(service.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  perspective: "1000px",
                }}
              >
                <motion.div
                  animate={{
                    rotateX: hoveredCard === service.id ? -5 : 0,
                    rotateY: hoveredCard === service.id ? 5 : 0,
                    z: hoveredCard === service.id ? 50 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <Card
                    onClick={() => handleServiceClick(service)}
                    className={`relative overflow-hidden p-6 h-full transition-all duration-500 ${
                      service.status === "coming" 
                        ? "opacity-70 cursor-not-allowed" 
                        : `cursor-pointer hover:shadow-2xl ${service.shadowColor}`
                    } bg-gradient-to-br ${service.bgGradient} border-2 ${
                      hoveredCard === service.id ? "border-primary/50" : "border-transparent"
                    }`}
                  >
                    {/* Animated background glow */}
                    {hoveredCard === service.id && service.status === "active" && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-10`}
                      />
                    )}

                    {/* Status Badge */}
                    {service.status === "coming" && (
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-yellow-500" />
                        <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">Sắp ra mắt</span>
                      </div>
                    )}
                    
                    {service.status === "active" && (
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-green-500/20 border border-green-500/50 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <span className="text-xs font-medium text-green-600 dark:text-green-400">Hoạt động</span>
                      </div>
                    )}

                    {/* Icon with emoji */}
                    <div className="relative mb-4">
                      <motion.div 
                        className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.gradient} flex items-center justify-center shadow-lg`}
                        animate={{
                          scale: hoveredCard === service.id ? 1.1 : 1,
                          rotate: hoveredCard === service.id ? 5 : 0,
                        }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <service.icon className="w-7 h-7 text-white" />
                      </motion.div>
                      <span className="absolute -bottom-1 -right-1 text-xl">{service.emoji}</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-foreground mb-1">{service.title}</h3>
                    <p className="text-xs text-primary font-medium mb-3">{service.subtitle}</p>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{service.description}</p>

                    {/* Features */}
                    <div className="space-y-2 mb-4">
                      <div className="flex flex-wrap gap-1.5">
                        {service.features.map((feature, i) => (
                          <motion.span
                            key={i}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 + i * 0.05 }}
                            className="px-2.5 py-1 text-xs rounded-full bg-background/70 text-foreground/80 border border-border/50 backdrop-blur-sm"
                          >
                            {feature}
                          </motion.span>
                        ))}
                      </div>
                    </div>

                    {/* CTA */}
                    {service.status === "active" && (
                      <motion.div 
                        className="flex items-center gap-2 text-primary font-semibold text-sm"
                        animate={{
                          x: hoveredCard === service.id ? 5 : 0,
                        }}
                      >
                        <span>Bắt đầu ngay</span>
                        <ChevronRight className="w-4 h-4" />
                      </motion.div>
                    )}
                  </Card>
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/* Stats Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-6 bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="space-y-1"
                >
                  <div className="text-2xl sm:text-3xl font-bold text-primary flex items-center justify-center gap-1">
                    <Building2 className="w-5 h-5" />
                    500+
                  </div>
                  <div className="text-sm text-muted-foreground">Công ty đối tác</div>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="space-y-1"
                >
                  <div className="text-2xl sm:text-3xl font-bold text-purple-500 flex items-center justify-center gap-1">
                    <TrendingUp className="w-5 h-5" />
                    1,000+
                  </div>
                  <div className="text-sm text-muted-foreground">Tuyển dụng thành công</div>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="space-y-1"
                >
                  <div className="text-2xl sm:text-3xl font-bold text-pink-500 flex items-center justify-center gap-1">
                    <Star className="w-5 h-5" />
                    98%
                  </div>
                  <div className="text-sm text-muted-foreground">Mức độ hài lòng</div>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="space-y-1"
                >
                  <div className="text-2xl sm:text-3xl font-bold text-orange-500 flex items-center justify-center gap-1">
                    <Sparkles className="w-5 h-5" />
                    24/7
                  </div>
                  <div className="text-sm text-muted-foreground">Hỗ trợ AI</div>
                </motion.div>
              </div>
            </Card>
          </motion.div>

          {/* Premium CTA */}
          {!isPremium && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card 
                className="p-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all"
                onClick={() => navigate("/pricing")}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <motion.div 
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center"
                    >
                      <Crown className="w-6 h-6 text-white" />
                    </motion.div>
                    <div>
                      <h3 className="font-bold text-foreground flex items-center gap-2">
                        Nâng cấp lên Premium
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                      </h3>
                      <p className="text-sm text-muted-foreground">Sử dụng không giới hạn tất cả dịch vụ tuyển dụng</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Card>
            </motion.div>
          )}

          {/* Additional Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="grid sm:grid-cols-2 gap-4"
          >
            <Card className="p-4 bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Đội ngũ Headhunter chuyên nghiệp</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Kết nối với Samsung, LG, Hyundai và nhiều tập đoàn lớn, cùng các startup tiềm năng
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Dịch vụ tùy chỉnh bằng AI</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Công nghệ AI mới nhất hỗ trợ phân tích công ty, luyện phỏng vấn, tối ưu CV
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
};

export default KoreaCareer;
