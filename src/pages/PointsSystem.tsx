import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ChevronLeft, 
  Gift, 
  Calendar, 
  Trophy,
  Users,
  Gamepad2,
  Target,
  Star,
  Crown,
  Zap,
  CheckCircle2,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { POINTS_CONFIG, LEVEL_THRESHOLDS, FREE_LIMITS, PREMIUM_FEATURES } from "@/lib/pointsPolicy";

const PointsSystem = () => {
  const navigate = useNavigate();

  const earnMethods = [
    {
      icon: Calendar,
      title: "Điểm danh hàng ngày",
      points: `+${POINTS_CONFIG.DAILY_CHECKIN} điểm`,
      description: "Đăng nhập mỗi ngày để nhận điểm thưởng",
      color: "from-korean-blue to-korean-cyan"
    },
    {
      icon: Zap,
      title: "7 ngày liên tiếp",
      points: `+${POINTS_CONFIG.WEEKLY_STREAK_BONUS} điểm`,
      description: "Điểm danh 7 ngày liên tiếp để nhận thưởng lớn",
      color: "from-korean-orange to-korean-pink"
    },
    {
      icon: CheckCircle2,
      title: "Hoàn thành Quiz",
      points: `+${POINTS_CONFIG.QUIZ_PERFECT_SCORE} điểm`,
      description: "Trả lời đúng cả 5 câu để nhận điểm tối đa",
      color: "from-korean-green to-korean-cyan"
    },
    {
      icon: Gamepad2,
      title: "Hoàn thành Game",
      points: `+${POINTS_CONFIG.GAME_COMPLETE_MIN}~${POINTS_CONFIG.GAME_COMPLETE_MAX} điểm`,
      description: "Chơi và hoàn thành các game học tiếng Hàn",
      color: "from-korean-purple to-korean-pink"
    },
    {
      icon: Users,
      title: "Mời bạn bè",
      points: `+${POINTS_CONFIG.REFERRAL_INVITER} điểm`,
      description: "Mời bạn bè tham gia và nhận thưởng khi họ đăng ký",
      color: "from-korean-cyan to-korean-blue"
    },
    {
      icon: Target,
      title: "Mục tiêu tuần",
      points: `+${POINTS_CONFIG.WEEKLY_GOAL_COMPLETE} điểm`,
      description: "Hoàn thành mục tiêu học tập hàng tuần",
      color: "from-korean-pink to-korean-orange"
    },
  ];

  const levels = [
    { ...LEVEL_THRESHOLDS.TOPIK_1, level: 1, range: "0 - 499" },
    { ...LEVEL_THRESHOLDS.TOPIK_2, level: 2, range: "500 - 1.499" },
    { ...LEVEL_THRESHOLDS.TOPIK_3, level: 3, range: "1.500 - 2.999" },
    { ...LEVEL_THRESHOLDS.TOPIK_4, level: 4, range: "3.000 - 4.999" },
    { ...LEVEL_THRESHOLDS.TOPIK_5, level: 5, range: "5.000 - 7.999" },
    { ...LEVEL_THRESHOLDS.TOPIK_6, level: 6, range: "8.000+" },
  ];

  const levelColors = [
    "bg-gray-500",
    "bg-green-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-red-500",
  ];

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1 pb-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-primary hover:text-primary/80 mb-6"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Quay lại</span>
          </motion.button>

          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-korean-orange to-korean-pink flex items-center justify-center">
              <Gift className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-title font-heading font-bold text-foreground mb-2">
              Hệ thống điểm thưởng
            </h1>
            <p className="text-body text-muted-foreground">
              Học tiếng Hàn, kiếm điểm, nâng cấp level!
            </p>
          </motion.div>

          {/* How to Earn Points */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-10"
          >
            <h2 className="text-headline font-bold text-foreground mb-6 flex items-center gap-2">
              <Star className="w-5 h-5 text-korean-orange" />
              Cách kiếm điểm
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {earnMethods.map((method, index) => (
                <motion.div
                  key={method.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="glass-card rounded-xl p-5 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${method.color} flex items-center justify-center shrink-0`}>
                      <method.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-foreground text-card-body">{method.title}</h3>
                        <span className="text-korean-green font-bold text-card-caption shrink-0">{method.points}</span>
                      </div>
                      <p className="text-card-caption text-muted-foreground">{method.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Level System */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-10"
          >
            <h2 className="text-headline font-bold text-foreground mb-6 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-korean-orange" />
              Hệ thống cấp bậc TOPIK
            </h2>

            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="divide-y divide-border">
                {levels.map((level, index) => (
                  <div 
                    key={level.name}
                    className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-lg ${levelColors[index]} flex items-center justify-center`}>
                      <span className="text-white font-bold text-lg">{level.level}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-card-body">{level.name}</h3>
                      <p className="text-card-caption text-muted-foreground">{level.range} điểm</p>
                    </div>
                    {index === 5 && (
                      <span className="px-3 py-1 bg-korean-orange/20 text-korean-orange text-badge font-bold rounded-full">
                        MAX
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* Free vs Premium */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-10"
          >
            <h2 className="text-headline font-bold text-foreground mb-6 flex items-center gap-2">
              <Crown className="w-5 h-5 text-korean-orange" />
              Tính năng miễn phí vs Premium
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Free */}
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Zap className="w-5 h-5 text-foreground" />
                  </div>
                  <h3 className="font-bold text-foreground text-card-title-lg">Miễn phí</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-card-body">
                    <CheckCircle2 className="w-5 h-5 text-korean-green shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Hỏi AI {FREE_LIMITS.AI_QUESTIONS_PER_DAY} lần/ngày</span>
                  </li>
                  <li className="flex items-start gap-2 text-card-body">
                    <CheckCircle2 className="w-5 h-5 text-korean-green shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Học TOPIK I & II</span>
                  </li>
                  <li className="flex items-start gap-2 text-card-body">
                    <CheckCircle2 className="w-5 h-5 text-korean-green shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Tất cả Game học tiếng Hàn</span>
                  </li>
                  <li className="flex items-start gap-2 text-card-body">
                    <CheckCircle2 className="w-5 h-5 text-korean-green shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Lưu tối đa {FREE_LIMITS.SAVED_VOCABULARY} từ vựng</span>
                  </li>
                  <li className="flex items-start gap-2 text-card-body">
                    <CheckCircle2 className="w-5 h-5 text-korean-green shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Xem bảng xếp hạng</span>
                  </li>
                </ul>
              </div>

              {/* Premium */}
              <div className="rounded-2xl p-6 bg-gradient-to-b from-korean-green/10 to-background border border-korean-green/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-korean-green/20 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-korean-green" />
                  </div>
                  <h3 className="font-bold text-foreground text-card-title-lg">Premium</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-card-body">
                    <CheckCircle2 className="w-5 h-5 text-korean-green shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Tất cả tính năng miễn phí</span>
                  </li>
                  {PREMIUM_FEATURES.map((feature) => (
                    <li key={feature.id} className="flex items-start gap-2 text-card-body">
                      <CheckCircle2 className="w-5 h-5 text-korean-green shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature.name}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => navigate("/pricing")}
                  className="w-full mt-6 bg-korean-green hover:bg-korean-green/90 text-white"
                >
                  Xem bảng giá
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </motion.section>

          {/* Tips */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl p-6"
          >
            <h2 className="text-headline font-bold text-foreground mb-4 flex items-center gap-2">
              💡 Mẹo kiếm điểm nhanh
            </h2>
            <ul className="space-y-3 text-card-body text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-korean-orange">•</span>
                Điểm danh mỗi ngày để duy trì streak và nhận điểm thưởng
              </li>
              <li className="flex items-start gap-2">
                <span className="text-korean-orange">•</span>
                Hoàn thành quiz với điểm tuyệt đối để nhận +{POINTS_CONFIG.QUIZ_PERFECT_SCORE} điểm
              </li>
              <li className="flex items-start gap-2">
                <span className="text-korean-orange">•</span>
                Mời bạn bè tham gia để cả hai cùng nhận thưởng
              </li>
              <li className="flex items-start gap-2">
                <span className="text-korean-orange">•</span>
                Đặt và hoàn thành mục tiêu học tập hàng tuần
              </li>
            </ul>
          </motion.section>
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default PointsSystem;
