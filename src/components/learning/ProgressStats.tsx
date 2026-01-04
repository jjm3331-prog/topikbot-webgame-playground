import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Trophy, Target, Clock, Star, TrendingUp } from "lucide-react";

interface ProgressStatsProps {
  totalLessons: number;
  completedLessons: number;
  totalScore: number;
  averageScore: number;
  totalTimeSpent: number;
  className?: string;
}

const ProgressStats = ({
  totalLessons,
  completedLessons,
  totalScore,
  averageScore,
  totalTimeSpent,
  className,
}: ProgressStatsProps) => {
  const { t } = useTranslation();
  const completionRate = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return t("stats.hoursMinutes", "{{hours}}시간 {{minutes}}분", { hours, minutes });
    return t("stats.minutes", "{{minutes}}분", { minutes });
  };

  const stats = [
    {
      icon: Target,
      label: t("stats.progress", "진도율"),
      value: `${completionRate}%`,
      subtext: t("stats.completed", "{{completed}}/{{total}} 완료", { completed: completedLessons, total: totalLessons }),
      color: "from-korean-blue to-korean-cyan",
    },
    {
      icon: Trophy,
      label: t("stats.totalScore", "총 점수"),
      value: totalScore.toLocaleString(),
      subtext: t("stats.points", "포인트"),
      color: "from-korean-yellow to-korean-orange",
    },
    {
      icon: Star,
      label: t("stats.averageScore", "평균 점수"),
      value: `${averageScore}${t("stats.scoreUnit", "점")}`,
      subtext: t("stats.outOf100", "100점 만점"),
      color: "from-korean-pink to-korean-purple",
    },
    {
      icon: Clock,
      label: t("stats.studyTime", "학습 시간"),
      value: formatTime(totalTimeSpent),
      subtext: t("stats.totalStudy", "총 학습량"),
      color: "from-korean-green to-korean-teal",
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="glass-card p-4"
        >
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br",
              stat.color
            )}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-bold text-foreground truncate">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.subtext}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ProgressStats;
