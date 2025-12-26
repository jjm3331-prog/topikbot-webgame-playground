import { ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

const Footer = () => {
  return (
    <footer className="relative py-8 sm:py-10 border-t border-border/50 overflow-hidden bg-gradient-to-t from-muted/30 to-background">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/3 w-80 h-40 bg-primary/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 right-1/3 w-80 h-40 bg-accent/5 blur-[100px] rounded-full" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between md:gap-6">
          {/* Logo & Copyright */}
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <img 
              src="/favicon.png" 
              alt="LUKATO" 
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full shadow-lg shadow-primary/10 ring-2 ring-border/50"
            />
            <div>
              <h3 className="text-xl font-bold text-gradient-primary">
                LUKATO
              </h3>
              <p className="text-xs text-muted-foreground">
                Your Korean Mentor
              </p>
            </div>
          </motion.div>

          {/* External Links */}
          <motion.div 
            className="flex items-center gap-3 sm:gap-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <motion.a
              href="https://hq.topikbot.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/20 text-sm text-primary hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 backdrop-blur-sm"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <ExternalLink className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform duration-300" />
              <span className="font-semibold tracking-wide">HQ.KOREA</span>
            </motion.a>
            <motion.a
              href="/admin-login"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/80 hover:border-border/80 transition-all duration-300 backdrop-blur-sm"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <ExternalLink className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform duration-300" />
              <span className="font-semibold tracking-wide">ADMIN</span>
            </motion.a>
          </motion.div>

          {/* Copyright */}
          <motion.p 
            className="text-sm text-muted-foreground"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
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

export default Footer;
