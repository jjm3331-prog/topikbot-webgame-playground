import { cn } from "@/lib/utils";
import GlassCard from "./GlassCard";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  titleKo: string;
  description: string;
  descriptionKo: string;
  color: "pink" | "cyan" | "gold";
  delay?: number;
}

const FeatureCard = ({
  icon: Icon,
  title,
  titleKo,
  description,
  descriptionKo,
  color,
  delay = 0,
}: FeatureCardProps) => {
  const colorClasses = {
    pink: {
      icon: "text-primary",
      glow: "shadow-neon",
      border: "border-primary/30",
      bg: "bg-primary/10",
    },
    cyan: {
      icon: "text-secondary",
      glow: "shadow-neon-cyan",
      border: "border-secondary/30",
      bg: "bg-secondary/10",
    },
    gold: {
      icon: "text-accent",
      glow: "shadow-neon-gold",
      border: "border-accent/30",
      bg: "bg-accent/10",
    },
  };

  return (
    <div
      className="opacity-0 animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      <GlassCard glow={color} className="h-full group">
        <div className="flex flex-col items-center text-center space-y-4">
          <div
            className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500",
              colorClasses[color].bg,
              colorClasses[color].border,
              "border",
              "group-hover:scale-110",
              `group-hover:${colorClasses[color].glow}`
            )}
          >
            <Icon className={cn("w-8 h-8", colorClasses[color].icon)} />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-display text-foreground">{titleKo}</h3>
            <p className="text-sm font-tech text-muted-foreground tracking-wider uppercase">
              {title}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-muted-foreground text-sm leading-relaxed">
              {descriptionKo}
            </p>
            <p className="text-muted-foreground/60 text-xs">
              {description}
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default FeatureCard;
