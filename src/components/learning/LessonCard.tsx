import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, Lock, Play, Star, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LessonCardProps {
  id: string;
  title: string;
  titleKo: string;
  description: string;
  duration: string;
  difficulty: "easy" | "medium" | "hard";
  completed: boolean;
  locked: boolean;
  score?: number;
  correctRate?: number;
  onClick: () => void;
  index?: number;
}

const difficultyConfig = {
  easy: { label: "쉬움", color: "bg-korean-green/20 text-korean-green" },
  medium: { label: "보통", color: "bg-korean-yellow/20 text-korean-yellow" },
  hard: { label: "어려움", color: "bg-korean-red/20 text-korean-red" },
};

const LessonCard = ({
  id,
  title,
  titleKo,
  description,
  duration,
  difficulty,
  completed,
  locked,
  score,
  correctRate,
  onClick,
  index = 0,
}: LessonCardProps) => {
  const diffConfig = difficultyConfig[difficulty];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "group relative glass-card overflow-hidden transition-all duration-300",
        locked ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:shadow-lg"
      )}
      onClick={() => !locked && onClick()}
    >
      {/* Completed indicator */}
      {completed && (
        <div className="absolute top-3 right-3 z-10">
          <div className="w-6 h-6 rounded-full bg-korean-green flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        </div>
      )}

      {/* Locked overlay */}
      {locked && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground truncate">{titleKo}</h4>
            <p className="text-sm text-muted-foreground truncate">{title}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {description}
        </p>

        {/* Meta info */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className={cn("text-xs px-2 py-1 rounded-full", diffConfig.color)}>
            {diffConfig.label}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {duration}
          </span>
        </div>

        {/* Score display (if completed) */}
        {completed && score !== undefined && (
          <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-korean-yellow fill-korean-yellow" />
              <span className="text-sm font-medium">{score}점</span>
            </div>
            {correctRate !== undefined && (
              <div className="text-sm text-muted-foreground">
                정답률 {correctRate}%
              </div>
            )}
          </div>
        )}

        {/* Action button */}
        <Button
          variant={completed ? "outline" : "default"}
          size="sm"
          className="w-full"
          disabled={locked}
        >
          {locked ? (
            <>
              <Lock className="w-4 h-4 mr-2" />
              잠김
            </>
          ) : completed ? (
            <>
              다시 학습
              <ChevronRight className="w-4 h-4 ml-2" />
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              시작하기
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
};

export default LessonCard;
