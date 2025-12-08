import { cn } from "@/lib/utils";
import { useState } from "react";
import { Check, Lock, Star } from "lucide-react";

interface Level {
  id: string;
  name: string;
  nameKo: string;
  description: string;
  unlocked: boolean;
  stars: number;
  color: string;
}

const levels: Level[] = [
  {
    id: "topik1",
    name: "TOPIK I - Level 1",
    nameKo: "토픽 1급",
    description: "기초 한국어 / Basic Korean",
    unlocked: true,
    stars: 3,
    color: "from-green-400 to-emerald-500",
  },
  {
    id: "topik2",
    name: "TOPIK I - Level 2",
    nameKo: "토픽 2급",
    description: "초급 한국어 / Elementary Korean",
    unlocked: true,
    stars: 2,
    color: "from-cyan-400 to-blue-500",
  },
  {
    id: "topik3",
    name: "TOPIK II - Level 3",
    nameKo: "토픽 3급",
    description: "중급 한국어 / Intermediate Korean",
    unlocked: true,
    stars: 1,
    color: "from-purple-400 to-violet-500",
  },
  {
    id: "topik4",
    name: "TOPIK II - Level 4",
    nameKo: "토픽 4급",
    description: "중고급 한국어 / Upper Intermediate",
    unlocked: false,
    stars: 0,
    color: "from-pink-400 to-rose-500",
  },
  {
    id: "topik5",
    name: "TOPIK II - Level 5",
    nameKo: "토픽 5급",
    description: "고급 한국어 / Advanced Korean",
    unlocked: false,
    stars: 0,
    color: "from-orange-400 to-amber-500",
  },
  {
    id: "topik6",
    name: "TOPIK II - Level 6",
    nameKo: "토픽 6급",
    description: "최고급 한국어 / Expert Korean",
    unlocked: false,
    stars: 0,
    color: "from-red-400 to-pink-500",
  },
];

const LevelSelector = () => {
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {levels.map((level, index) => (
        <button
          key={level.id}
          onClick={() => level.unlocked && setSelectedLevel(level.id)}
          disabled={!level.unlocked}
          className={cn(
            "relative p-4 rounded-2xl border transition-all duration-500 text-left group",
            "opacity-0 animate-scale-in",
            level.unlocked
              ? "glass-card cursor-pointer hover:scale-105"
              : "bg-muted/30 border-border/30 cursor-not-allowed opacity-60",
            selectedLevel === level.id && "ring-2 ring-primary shadow-neon"
          )}
          style={{
            animationDelay: `${index * 100}ms`,
            animationFillMode: "forwards",
          }}
        >
          {/* Gradient overlay on hover */}
          {level.unlocked && (
            <div
              className={cn(
                "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br",
                level.color
              )}
            />
          )}

          <div className="relative z-10 space-y-2">
            {/* Level badge */}
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "px-2 py-1 rounded-lg text-xs font-tech tracking-wider",
                  level.unlocked
                    ? `bg-gradient-to-r ${level.color} text-white`
                    : "bg-muted text-muted-foreground"
                )}
              >
                {level.name.split(" - ")[0]}
              </span>
              {!level.unlocked && <Lock className="w-4 h-4 text-muted-foreground" />}
              {selectedLevel === level.id && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </div>

            {/* Level name */}
            <h4 className="font-display text-lg text-foreground">{level.nameKo}</h4>
            <p className="text-xs text-muted-foreground">{level.description}</p>

            {/* Stars */}
            {level.unlocked && (
              <div className="flex gap-1 pt-1">
                {[1, 2, 3].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "w-4 h-4 transition-colors",
                      star <= level.stars
                        ? "text-accent fill-accent"
                        : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};

export default LevelSelector;
