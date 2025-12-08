import NeonText from "./NeonText";
import { ExternalLink } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-8 border-t border-white/10 relative">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Copyright */}
          <div className="flex items-center gap-3">
            <img 
              src="/favicon.png" 
              alt="LUKATO" 
              className="w-10 h-10 rounded-full shadow-lg shadow-neon-pink/20"
            />
            <div>
              <h3 className="text-xl font-display">
                <NeonText variant="gradient">Game LUKATO</NeonText>
              </h3>
              <p className="text-xs text-white/50">
                Your Korean Mentor
              </p>
            </div>
          </div>

          {/* External Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://hanoi.topikbot.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card text-xs text-white/70 hover:text-white transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Hanoi Official
            </a>
            <a
              href="https://chat-topikbot.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card text-xs text-white/70 hover:text-white transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              LUKATO AI
            </a>
          </div>

          {/* Copyright */}
          <p className="text-sm text-white/40">
            © 2025 Powered by{" "}
            <span className="text-neon-pink font-medium">LUKATO AI</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
