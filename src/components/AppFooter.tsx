import { ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

const AppFooter = () => {
  return (
    <footer className="relative py-6 sm:py-8 bg-gradient-to-t from-[#0d1117] via-[#1a1f2e] to-[#1a1f2e] border-t border-white/5 shrink-0 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/4 w-64 h-32 bg-primary/5 blur-3xl rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-64 h-32 bg-neon-pink/5 blur-3xl rounded-full" />
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
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full ring-2 ring-white/10"
            />
            <span className="text-white/60 text-sm font-medium bg-gradient-to-r from-white/60 to-white/40 bg-clip-text text-transparent">
              Your Korean Mentor
            </span>
          </motion.div>

          {/* Links */}
          <motion.div 
            className="flex items-center gap-4 sm:gap-8"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <motion.a 
              href="https://hq.topikbot.kr" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300"
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
              className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ExternalLink className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform duration-300" />
              <span className="font-semibold tracking-wide">ADMIN</span>
            </motion.a>
          </motion.div>

          {/* Copyright */}
          <motion.p 
            className="text-white/40 text-xs sm:text-sm"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            © 2025 Powered by{" "}
            <span className="bg-gradient-to-r from-primary to-neon-pink bg-clip-text text-transparent font-semibold">
              LUKATO AI
            </span>
          </motion.p>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
