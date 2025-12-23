import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Briefcase, 
  Search, 
  Mic,
  ChevronRight,
  Building2,
  Users,
  Crown,
  Sparkles
} from "lucide-react";
import { Card } from "@/components/ui/card";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { PremiumPreviewBanner } from "@/components/PremiumPreviewBanner";
import { useSubscription } from "@/hooks/useSubscription";

const KoreaCareer = () => {
  const navigate = useNavigate();
  const { isPremium } = useSubscription();

  const services = [
    {
      id: "headhunting",
      icon: Briefcase,
      title: "헤드헌팅 신청",
      titleVi: "Đăng ký Headhunting",
      description: "전문 헤드헌터가 한국 기업 취업을 지원합니다",
      descriptionVi: "Headhunter chuyên nghiệp hỗ trợ xin việc tại công ty Hàn Quốc",
      features: ["1:1 맞춤 컨설팅", "이력서 검토", "면접 코칭", "연봉 협상"],
      featuresVi: ["Tư vấn 1:1", "Kiểm tra CV", "Coaching phỏng vấn", "Đàm phán lương"],
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-500/10 to-cyan-500/10",
      path: "/headhunting",
      status: "active"
    },
    {
      id: "company-report",
      icon: Search,
      title: "기업 심층 리포트",
      titleVi: "Báo cáo Doanh nghiệp",
      description: "AI 웹검색으로 한국 기업 정보를 심층 분석합니다",
      descriptionVi: "Phân tích sâu thông tin công ty Hàn Quốc bằng AI",
      features: ["연봉 정보", "기업 문화", "면접 후기", "최신 뉴스"],
      featuresVi: ["Thông tin lương", "Văn hóa công ty", "Review phỏng vấn", "Tin tức mới"],
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-500/10 to-pink-500/10",
      path: "/company-report",
      status: "coming"
    },
    {
      id: "interview-sim",
      icon: Mic,
      title: "면접 시뮬레이션",
      titleVi: "Phỏng vấn Mô phỏng",
      description: "AI 면접관과 실전 같은 면접 연습을 합니다",
      descriptionVi: "Luyện phỏng vấn thực tế với AI Interviewer",
      features: ["음성 대화", "실시간 피드백", "점수 분석", "맞춤 질문"],
      featuresVi: ["Đàm thoại", "Feedback real-time", "Phân tích điểm", "Câu hỏi tùy chỉnh"],
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-500/10 to-red-500/10",
      path: "/interview-simulation",
      status: "active"
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
          {!isPremium && <PremiumPreviewBanner featureName="한국 취업 서비스" />}

          {/* Header */}
          <div className="text-center space-y-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30"
            >
              <Building2 className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-foreground">한국 취업 올인원 서비스</span>
            </motion.div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold">
              <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Korea Career
              </span>
              <span className="text-foreground"> Hub</span>
            </h1>
            
            <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
              베트남인을 위한 한국 기업 취업 올인원 플랫폼<br />
              <span className="text-sm">Nền tảng All-in-One cho người Việt tìm việc tại Hàn Quốc</span>
            </p>
          </div>

          {/* Service Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            {services.map((service, idx) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
              >
                <Card
                  onClick={() => handleServiceClick(service)}
                  className={`relative overflow-hidden p-6 h-full transition-all duration-300 ${
                    service.status === "coming" 
                      ? "opacity-70 cursor-not-allowed" 
                      : "cursor-pointer hover:scale-[1.02] hover:shadow-xl"
                  } bg-gradient-to-br ${service.bgGradient} border-2 border-transparent hover:border-primary/30`}
                >
                  {/* Status Badge */}
                  {service.status === "coming" && (
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/50">
                      <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">Coming Soon</span>
                    </div>
                  )}
                  
                  {service.status === "active" && (
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/50">
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">Available</span>
                    </div>
                  )}

                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                    <service.icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-foreground mb-1">{service.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{service.titleVi}</p>

                  {/* Description */}
                  <p className="text-sm text-foreground/80 mb-1">{service.description}</p>
                  <p className="text-xs text-muted-foreground mb-4">{service.descriptionVi}</p>

                  {/* Features */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {service.features.map((feature, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs rounded-full bg-background/50 text-foreground/70 border border-border/50"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  {service.status === "active" && (
                    <div className="mt-4 flex items-center gap-2 text-primary font-medium text-sm">
                      <span>시작하기</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  )}
                </Card>
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
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-primary">500+</div>
                  <div className="text-sm text-muted-foreground">파트너 기업</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-purple-500">1,000+</div>
                  <div className="text-sm text-muted-foreground">취업 성공</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-pink-500">98%</div>
                  <div className="text-sm text-muted-foreground">만족도</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-orange-500">24/7</div>
                  <div className="text-sm text-muted-foreground">AI 지원</div>
                </div>
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
                className="p-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30 cursor-pointer hover:shadow-lg transition-all"
                onClick={() => navigate("/pricing")}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                      <Crown className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground flex items-center gap-2">
                        Premium으로 업그레이드
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                      </h3>
                      <p className="text-sm text-muted-foreground">모든 취업 서비스를 무제한으로 이용하세요</p>
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
            <Card className="p-4 bg-muted/30">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-foreground">전문 헤드헌터 팀</h4>
                  <p className="text-sm text-muted-foreground">
                    삼성, LG, 현대 등 대기업부터 유망 스타트업까지 폭넓은 네트워크
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-muted/30">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-foreground">AI 기반 맞춤 서비스</h4>
                  <p className="text-sm text-muted-foreground">
                    최신 AI 기술로 기업 분석, 면접 연습, 이력서 최적화 지원
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
