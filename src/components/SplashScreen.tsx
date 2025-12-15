import { motion } from "framer-motion";

interface SplashScreenProps {
  progress?: number;
}

const SplashScreen = ({ progress = 0 }: SplashScreenProps) => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f23]"
    >
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-neon-pink/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, 20],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Logo Container */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 15,
          delay: 0.1,
        }}
        className="relative"
      >
        {/* Glow Effect */}
        <div className="absolute inset-0 blur-3xl bg-neon-pink/20 rounded-full scale-150" />
        
        {/* Logo */}
        <motion.img
          src="/favicon.png"
          alt="LUKATO"
          className="w-28 h-28 md:w-36 md:h-36 rounded-full shadow-2xl relative z-10"
          animate={{
            boxShadow: [
              "0 0 20px rgba(255, 45, 117, 0.3)",
              "0 0 40px rgba(255, 45, 117, 0.5)",
              "0 0 20px rgba(255, 45, 117, 0.3)",
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      {/* App Name */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mt-6 text-center"
      >
        <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-wider">
          Game{" "}
          <span className="bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan bg-clip-text text-transparent">
            LUKATO
          </span>
        </h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-2 text-white/60 text-sm md:text-base font-body"
        >
          당신의 한국어 멘토 / Người hướng dẫn tiếng Hàn của bạn
        </motion.p>
      </motion.div>

      {/* Progress Bar */}
      <motion.div
        initial={{ opacity: 0, width: 0 }}
        animate={{ opacity: 1, width: "200px" }}
        transition={{ delay: 0.6, duration: 0.3 }}
        className="mt-10"
      >
        <div className="w-[200px] h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-neon-pink to-neon-cyan rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        
        {/* Loading Text */}
        <motion.p
          className="mt-3 text-white/40 text-xs text-center"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          로딩 중... / Đang tải...
        </motion.p>
      </motion.div>

      {/* Bottom Branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="absolute bottom-6 text-center"
      >
        <p className="text-white/20 text-xs">
          AI 기반 한국어 학습 RPG / RPG học tiếng Hàn AI
        </p>
      </motion.div>
    </motion.div>
  );
};

export default SplashScreen;
