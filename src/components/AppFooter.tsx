import { ExternalLink } from "lucide-react";

const AppFooter = () => {
  return (
    <footer className="py-4 bg-[#1a1f2e] border-t border-white/5 shrink-0">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <img 
              src="/favicon.png" 
              alt="LUKATO" 
              className="w-8 h-8 rounded-full"
            />
            <span className="text-white/50 text-sm">
              Your Korean Mentor
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a 
              href="https://hanoi.topikbot.kr" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Hanoi Official
            </a>
            <a 
              href="https://chat-topikbot.kr" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Q&A Agent
            </a>
          </div>

          {/* Copyright */}
          <p className="text-white/40 text-sm">
            © 2025 Powered by{" "}
            <span className="text-white/60 font-medium">LUKAS Edutainment</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
