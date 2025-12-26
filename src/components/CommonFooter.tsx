import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

const CommonFooter = () => {
  return (
    <footer className="relative py-6 sm:py-8 px-4 sm:px-6 border-t border-border bg-gradient-to-t from-muted/50 to-background overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/4 w-48 h-24 bg-primary/5 blur-3xl rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-48 h-24 bg-accent/5 blur-3xl rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex flex-col items-center gap-5 md:flex-row md:justify-between md:gap-6">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-3 shrink-0"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <img
              src="/favicon.png"
              alt="LUKATO"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-border/50"
            />
            <div className="flex flex-col">
              <span className="font-heading font-bold text-lg sm:text-xl text-foreground leading-tight">
                LUKATO
              </span>
              <span className="text-xs text-muted-foreground leading-tight">Your Korean Mentor</span>
            </div>
          </motion.div>

          {/* Links */}
          <motion.div 
            className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-sm text-muted-foreground"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <motion.a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg hover:bg-muted hover:text-foreground transition-all duration-200 font-medium"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Terms
            </motion.a>
            <motion.a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg hover:bg-muted hover:text-foreground transition-all duration-200 font-medium"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Privacy
            </motion.a>
            <motion.a
              href="https://hq.topikbot.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 hover:border-primary/30 text-primary transition-all duration-200 font-semibold"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ExternalLink className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform duration-300" />
              HQ.KOREA
            </motion.a>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link 
                to="/admin-login" 
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border hover:bg-muted hover:border-border/80 hover:text-foreground transition-all duration-200 font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform duration-300" />
                ADMIN
              </Link>
            </motion.div>
          </motion.div>

          {/* Copyright */}
          <motion.p 
            className="text-muted-foreground text-xs sm:text-sm shrink-0"
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

export default CommonFooter;
