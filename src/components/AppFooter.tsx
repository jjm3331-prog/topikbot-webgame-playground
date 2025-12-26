import { ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

const AppFooter = () => {
  return (
    <footer className="relative py-6 sm:py-8 bg-gradient-to-t from-muted/50 via-background to-background border-t border-border/50 shrink-0 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/4 w-64 h-32 bg-primary/5 blur-3xl rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-64 h-32 bg-accent/5 blur-3xl rounded-full" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between md:gap-5">
          {/* Logo & Tagline */}
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <img 
              src="/favicon.png" 
              alt="LUKATO" 
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full ring-2 ring-border/50"
            />
            <span className="text-muted-foreground text-sm font-medium">
              Your Korean Mentor
            </span>
          </motion.div>

          {/* Links */}
          <motion.div 
            className="flex items-center gap-4 sm:gap-6"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <motion.a 
              href="https://hq.topikbot.kr" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/20 text-sm text-primary hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ExternalLink className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform duration-300" />
              <span className="font-semibold tracking-wide">HQ.KOREA</span>
            </motion.a>
            <motion.a 
              href="/admin-login" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/80 hover:border-border/80 transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ExternalLink className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform duration-300" />
              <span className="font-semibold tracking-wide">ADMIN</span>
            </motion.a>
          </motion.div>

          {/* Copyright */}
          <motion.p 
            className="text-muted-foreground text-xs sm:text-sm"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            © 2025 Powered by{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-semibold">
              LUKATO AI
            </span>
          </motion.p>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
