import { ExternalLink } from "lucide-react";

const AppFooter = () => {
  return (
    <footer className="py-5 bg-[#1a1f2e] border-t border-white/5 shrink-0">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <img 
              src="/favicon.png" 
              alt="LUKATO" 
              className="w-9 h-9 rounded-full"
            />
            <span className="text-white/50 text-card-caption">
              Your Korean Mentor
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-8">
            <a 
              href="https://hanoi.topikbot.kr" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-card-caption text-white/60 hover:text-white/90 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Hanoi Official
            </a>
            <a 
              href="https://chat-topikbot.kr" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-card-caption text-white/60 hover:text-white/90 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Q&A Agent
            </a>
            <a 
              href="/admin-login" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-card-caption text-white/60 hover:text-white/90 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              ADMIN
            </a>
          </div>

          {/* Copyright */}
          <p className="text-white/40 text-card-caption">
            © 2025 Powered by{" "}
            <span className="text-white/60 font-medium">LUKAS Edutainment</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
