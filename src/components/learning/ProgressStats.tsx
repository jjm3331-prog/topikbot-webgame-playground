import { motion } from "framer-motion";
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
  const completionRate = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}시간 ${minutes}분`;
    return `${minutes}분`;
  };

  const stats = [
    {
      icon: Target,
      label: "진도율",
      value: `${completionRate}%`,
      subtext: `${completedLessons}/${totalLessons} 완료`,
      color: "from-korean-blue to-korean-cyan",
    },
    {
      icon: Trophy,
      label: "총 점수",
      value: totalScore.toLocaleString(),
      subtext: "포인트",
      color: "from-korean-yellow to-korean-orange",
    },
    {
      icon: Star,
      label: "평균 점수",
      value: `${averageScore}점`,
      subtext: "100점 만점",
      color: "from-korean-pink to-korean-purple",
    },
    {
      icon: Clock,
      label: "학습 시간",
      value: formatTime(totalTimeSpent),
      subtext: "총 학습량",
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
