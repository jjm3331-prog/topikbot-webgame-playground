import { cn } from "@/lib/utils";

interface NeonTextProps {
  children: React.ReactNode;
  variant?: "pink" | "cyan" | "gold" | "gradient";
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  animate?: boolean;
}

const NeonText = ({ 
  children, 
  variant = "pink", 
  className, 
  as: Component = "span",
  animate = false 
}: NeonTextProps) => {
  const variantClasses = {
    pink: "neon-text-pink",
    cyan: "neon-text-cyan",
    gold: "neon-text-gold",
    gradient: "text-gradient-neon",
  };

  return (
    <Component
      className={cn(
        variantClasses[variant],
        animate && "animate-neon-flicker",
        className
      )}
    >
      {children}
    </Component>
  );
};

export default NeonText;
