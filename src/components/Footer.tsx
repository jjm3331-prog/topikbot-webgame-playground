import NeonText from "./NeonText";
import { ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

const Footer = () => {
  return (
    <footer className="relative py-8 sm:py-10 border-t border-white/10 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/3 w-80 h-40 bg-neon-pink/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 right-1/3 w-80 h-40 bg-primary/10 blur-[100px] rounded-full" />
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
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full shadow-lg shadow-neon-pink/20 ring-2 ring-white/10"
            />
            <div>
              <h3 className="text-xl font-display">
                <NeonText variant="gradient">LUKATO</NeonText>
              </h3>
              <p className="text-xs text-white/50">
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
              className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10 text-sm text-white/70 hover:text-white hover:border-white/20 hover:from-white/10 hover:to-white/5 transition-all duration-300 backdrop-blur-sm"
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
              className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10 text-sm text-white/70 hover:text-white hover:border-white/20 hover:from-white/10 hover:to-white/5 transition-all duration-300 backdrop-blur-sm"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <ExternalLink className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform duration-300" />
              <span className="font-semibold tracking-wide">ADMIN</span>
            </motion.a>
          </motion.div>

          {/* Copyright */}
          <motion.p 
            className="text-sm text-white/40"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            © 2025 Powered by{" "}
            <span className="bg-gradient-to-r from-neon-pink via-primary to-neon-pink bg-[length:200%_auto] animate-[gradient_3s_linear_infinite] bg-clip-text text-transparent font-semibold">
              LUKATO AI
            </span>
          </motion.p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
