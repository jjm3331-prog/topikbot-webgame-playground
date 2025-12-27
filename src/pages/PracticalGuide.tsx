import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BookOpen, MessageSquare, Mail, Briefcase, Clock, Construction } from "lucide-react";
import { Card } from "@/components/ui/card";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { PremiumPreviewBanner } from "@/components/PremiumPreviewBanner";
import { useSubscription } from "@/hooks/useSubscription";

const PracticalGuide = () => {
  const { t } = useTranslation();
  const { isPremium } = useSubscription();

  const features = [
    {
      icon: BookOpen,
      title: "IT 용어 학습",
      titleVi: "Thuật ngữ IT",
      description: "SI / Game / AI / Web / ERP 직무별 IT 한국어 용어",
      descriptionVi: "Thuật ngữ IT tiếng Hàn theo lĩnh vực: SI / Game / AI / Web / ERP",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: MessageSquare,
      title: "미팅 시뮬레이션",
      titleVi: "Mô phỏng cuộc họp",
      description: "Kickoff, Demo, 주간/월간/회고 미팅 연습",
      descriptionVi: "Luyện tập Kickoff, Demo, họp tuần/tháng/retro",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: Mail,
      title: "메일/메신저 표현",
      titleVi: "Mẫu Email/Tin nhắn",
      description: "일정 지연, 이슈 보고, 확인 요청 등 상황별 표현",
      descriptionVi: "Mẫu câu theo tình huống: delay, báo cáo issue, xác nhận...",
      gradient: "from-orange-500 to-red-500",
    },
    {
      icon: Briefcase,
      title: "비즈니스 한국어",
      titleVi: "Tiếng Hàn công sở",
      description: "IT COMTOR에게 필요한 비즈니스 한국어 표현",
      descriptionVi: "Tiếng Hàn doanh nghiệp cần thiết cho IT COMTOR",
      gradient: "from-emerald-500 to-teal-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1 pt-8 pb-12 px-4 max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Premium Preview Banner */}
          {!isPremium && (
            <PremiumPreviewBanner featureName="실무 가이드" />
          )}

          {/* Header */}
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30"
            >
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-foreground">
                📖 실무 가이드 / Hướng dẫn Thực tế
              </span>
            </motion.div>

            <h1 className="text-headline">
              <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
                Practical Guide
              </span>
            </h1>

            <p className="text-body text-muted-foreground max-w-2xl mx-auto">
              IT 업무 현장에서 바로 활용할 수 있는 실무 한국어
            </p>
            <p className="text-card-caption text-muted-foreground">
              Tiếng Hàn thực tế có thể sử dụng ngay trong môi trường làm việc IT
            </p>
          </div>

          {/* Coming Soon Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-8 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
              <div className="flex flex-col items-center text-center gap-4">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center"
                >
                  <Construction className="w-8 h-8 text-white" />
                </motion.div>
                <div>
                  <h2 className="text-title font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-500" />
                    준비 중 / Đang phát triển
                  </h2>
                  <p className="text-card-body text-muted-foreground">
                    IT COMTOR를 위한 실무 한국어 콘텐츠를 준비하고 있습니다.
                    <br />
                    Đang chuẩn bị nội dung tiếng Hàn thực tế cho IT COMTOR.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Feature Preview Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
              >
                <Card className="p-5 h-full bg-muted/30 hover:bg-muted/50 transition-colors border-dashed">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shrink-0 opacity-70`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-card-title-lg text-foreground mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        {feature.titleVi}
                      </p>
                      <p className="text-card-body text-muted-foreground">
                        {feature.description}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {feature.descriptionVi}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Target Audience */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="p-6 bg-gradient-to-r from-primary/5 to-emerald-500/5 border-primary/20">
              <h3 className="text-card-title-lg text-foreground mb-4 text-center">
                🎯 대상 / Đối tượng
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-2xl">💻</div>
                  <div className="text-sm font-medium text-foreground">IT COMTOR</div>
                  <div className="text-xs text-muted-foreground">통번역사</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl">🎮</div>
                  <div className="text-sm font-medium text-foreground">Game QA</div>
                  <div className="text-xs text-muted-foreground">게임 QA</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl">🌐</div>
                  <div className="text-sm font-medium text-foreground">BrSE</div>
                  <div className="text-xs text-muted-foreground">브릿지 SE</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl">📊</div>
                  <div className="text-sm font-medium text-foreground">PM/PL</div>
                  <div className="text-xs text-muted-foreground">프로젝트 관리</div>
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

export default PracticalGuide;
