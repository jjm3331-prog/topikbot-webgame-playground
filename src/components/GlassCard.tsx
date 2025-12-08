import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "pink" | "cyan" | "gold" | "none";
}

const GlassCard = ({ children, className, hover = true, glow = "none" }: GlassCardProps) => {
  const glowClasses = {
    pink: "hover:shadow-neon hover:border-primary/50",
    cyan: "hover:shadow-neon-cyan hover:border-secondary/50",
    gold: "hover:shadow-neon-gold hover:border-accent/50",
    none: "",
  };

  return (
    <div
      className={cn(
        "glass-card p-6 transition-all duration-500",
        hover && "hover:scale-[1.02] hover:-translate-y-1",
        glowClasses[glow],
        className
      )}
    >
      {children}
    </div>
  );
};

export default GlassCard;
