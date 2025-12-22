import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface LevelBadgeProps {
  level: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const levelConfig: Record<number, { name: string; color: string; gradient: string }> = {
  1: {
    name: "초급 1",
    color: "text-korean-green",
    gradient: "from-korean-green to-emerald-400",
  },
  2: {
    name: "초급 2",
    color: "text-korean-cyan",
    gradient: "from-korean-cyan to-korean-blue",
  },
  3: {
    name: "중급 1",
    color: "text-korean-blue",
    gradient: "from-korean-blue to-korean-indigo",
  },
  4: {
    name: "중급 2",
    color: "text-korean-purple",
    gradient: "from-korean-purple to-korean-pink",
  },
  5: {
    name: "고급 1",
    color: "text-korean-orange",
    gradient: "from-korean-orange to-korean-yellow",
  },
  6: {
    name: "고급 2",
    color: "text-korean-red",
    gradient: "from-korean-red to-korean-pink",
  },
};

const sizeConfig = {
  sm: "w-8 h-8 text-sm",
  md: "w-12 h-12 text-lg",
  lg: "w-16 h-16 text-2xl",
};

const LevelBadge = ({ level, size = "md", showLabel = false, className }: LevelBadgeProps) => {
  const config = levelConfig[level] || levelConfig[1];
  const sizeClass = sizeConfig[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className={cn(
          "rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br shadow-lg",
          sizeClass,
          config.gradient
        )}
      >
        {level}
      </motion.div>
      {showLabel && (
        <div className="flex flex-col">
          <span className={cn("font-semibold", config.color)}>
            {level <= 2 ? "TOPIK I" : "TOPIK II"} - {level}급
          </span>
          <span className="text-xs text-muted-foreground">{config.name}</span>
        </div>
      )}
    </div>
  );
};

export default LevelBadge;
