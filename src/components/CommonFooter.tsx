import { Link } from "react-router-dom";

const CommonFooter = () => {
  return (
    <footer className="py-12 px-6 border-t border-border bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo - 이모지 잘림 방지를 위해 overflow-visible 추가 */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-2xl sm:text-3xl leading-none" style={{ lineHeight: 1.2 }}>🇰🇷</span>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-lg sm:text-xl text-foreground leading-tight">LUKATO AI</span>
              <span className="text-xs text-muted-foreground leading-tight">Học tiếng Hàn #1 VN</span>
            </div>
          </div>
          
          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a 
              href="/terms" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors font-medium"
            >
              TERMS
            </a>
            <a 
              href="/privacy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors font-medium"
            >
              PRIVACY
            </a>
            <Link 
              to="/admin-login" 
              className="hover:text-foreground transition-colors font-medium"
            >
              ADMIN
            </Link>
          </div>
          
          {/* Copyright */}
          <p className="text-muted-foreground text-sm shrink-0">
            © 2025 LUKATO Vietnam. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default CommonFooter;