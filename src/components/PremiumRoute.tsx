import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/useSubscription";
import { motion } from "framer-motion";
import { Crown, Loader2, Lock, Zap, PenTool, Mic, Sparkles, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PremiumRouteProps {
  children: ReactNode;
}

const LoadingState = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const PremiumRequired = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const benefits = [
    { icon: Zap, text: "AI 기반 취업 지원 무제한", description: "헤드헌팅, 기업분석, 면접 시뮬레이션" },
    { icon: PenTool, text: "작문 첨삭 무제한", description: "TOPIK 쓰기 영역 실시간 피드백" },
    { icon: Mic, text: "롤플레이 스피킹", description: "AI와 실전 회화 연습" },
    { icon: Sparkles, text: "문제 변형 생성기", description: "무한한 TOPIK 문제 변형" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-korean-orange/5 flex items-center justify-center p-4">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-korean-orange/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-korean-pink/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-korean-purple/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl relative z-10"
      >
        {/* Premium Card */}
        <div className="bg-gradient-to-br from-korean-orange via-korean-pink to-korean-purple p-[2px] rounded-3xl shadow-2xl shadow-korean-pink/20">
          <div className="bg-background rounded-3xl p-8 md:p-12 relative overflow-hidden">
            {/* Sparkle Effects */}
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute top-6 right-6 w-3 h-3 bg-korean-yellow rounded-full"
            />
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.8, 0.3] }}
              transition={{ repeat: Infinity, duration: 2.5, delay: 0.5 }}
              className="absolute top-12 right-12 w-2 h-2 bg-korean-pink rounded-full"
            />
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.9, 0.4] }}
              transition={{ repeat: Infinity, duration: 3, delay: 1 }}
              className="absolute bottom-12 left-8 w-2 h-2 bg-korean-orange rounded-full"
            />

            {/* Crown Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="mx-auto mb-8"
            >
              <motion.div
                animate={{ y: [-4, 4, -4] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-korean-orange via-korean-pink to-korean-purple p-1"
              >
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center relative">
                  <Crown className="w-12 h-12 text-korean-orange" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-2 border-dashed border-korean-orange/30"
                  />
                </div>
              </motion.div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl md:text-4xl font-heading font-bold text-center mb-3"
            >
              <span className="bg-gradient-to-r from-korean-orange via-korean-pink to-korean-purple bg-clip-text text-transparent">
                Premium 전용 기능
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center text-muted-foreground mb-8 text-lg"
            >
              이 기능은 Premium 회원 전용입니다.<br />
              업그레이드하고 모든 기능을 자유롭게 이용하세요!
            </motion.p>

            {/* Benefits Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {benefits.map((benefit, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  className="group relative p-4 rounded-xl bg-gradient-to-r from-korean-orange/5 to-korean-pink/5 border border-korean-orange/20 hover:border-korean-orange/40 transition-all hover:shadow-lg hover:shadow-korean-orange/10"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-korean-orange to-korean-pink flex items-center justify-center shrink-0">
                      <benefit.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground mb-1">{benefit.text}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="space-y-4"
            >
              <Button
                onClick={() => navigate("/pricing")}
                className="w-full h-14 bg-gradient-to-r from-korean-orange via-korean-pink to-korean-purple hover:opacity-90 text-white font-bold text-lg shadow-xl shadow-korean-pink/30 rounded-xl"
              >
                <Crown className="w-6 h-6 mr-2" />
                Premium 업그레이드
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="w-full h-12 text-muted-foreground hover:text-foreground rounded-xl"
              >
                홈으로 돌아가기
              </Button>
            </motion.div>

            {/* Trust Badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-8 pt-6 border-t border-border flex items-center justify-center gap-6 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-korean-green" />
                <span>즉시 활성화</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-korean-yellow" />
                <span>언제든 해지 가능</span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export const PremiumRoute = ({ children }: PremiumRouteProps) => {
  const { isPremium, loading } = useSubscription();

  if (loading) {
    return <LoadingState />;
  }

  // Free 사용자는 Premium 기능 접근 차단
  if (!isPremium) {
    return <PremiumRequired />;
  }

  return <>{children}</>;
};

export default PremiumRoute;

