import NeonText from "./NeonText";
import { Github, Twitter, Instagram, Youtube } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-12 border-t border-border/30 relative">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Copyright */}
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-display">
              <NeonText variant="gradient">K-Life</NeonText>
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              © 2025 Powered by{" "}
              <span className="text-accent font-tech">LUKATO AI</span>
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            {[
              { icon: Github, href: "#" },
              { icon: Twitter, href: "#" },
              { icon: Instagram, href: "#" },
              { icon: Youtube, href: "#" },
            ].map(({ icon: Icon, href }, index) => (
              <a
                key={index}
                href={href}
                className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 hover:shadow-neon transition-all duration-300"
              >
                <Icon className="w-5 h-5" />
              </a>
            ))}
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm">
            {["이용약관", "개인정보처리방침", "문의하기"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
