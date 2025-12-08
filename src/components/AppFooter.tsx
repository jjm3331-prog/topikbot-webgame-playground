import { ExternalLink } from "lucide-react";

interface AppFooterProps {
  compact?: boolean;
}

const AppFooter = ({ compact = false }: AppFooterProps) => {
  if (compact) {
    return (
      <footer className="py-3 text-center shrink-0">
        <p className="text-white/30 text-xs">
          © 2025 Powered by{" "}
          <span className="text-neon-pink font-medium">LUKATO AI</span>
        </p>
      </footer>
    );
  }

  return (
    <footer className="py-6 border-t border-white/10 bg-background/50 backdrop-blur-sm shrink-0">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Copyright */}
          <div className="flex items-center gap-3">
            <img 
              src="/favicon.png" 
              alt="LUKATO" 
              className="w-8 h-8 rounded-full"
            />
            <div>
              <span className="font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-cyan">
                Game LUKATO
              </span>
              <p className="text-xs text-white/40">
                Your Korean Mentor
              </p>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4">
            <a 
              href="https://hanoi.topikbot.kr" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Hanoi Official
            </a>
            <a 
              href="https://chat-topikbot.kr" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              LUKATO AI
            </a>
          </div>

          {/* Copyright */}
          <p className="text-white/30 text-xs">
            © 2025 Powered by{" "}
            <span className="text-neon-pink font-medium">LUKATO AI</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
