import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface SplashScreenProps {
  progress?: number;
}

const SplashScreen = ({ progress = 0 }: SplashScreenProps) => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
    >
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-primary/60 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, 20],
              opacity: [0.4, 1, 0.4],
              scale: [1, 1.5, 1],
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
        <div className="absolute inset-0 blur-3xl bg-primary/40 rounded-full scale-150" />
        
        {/* Logo */}
        <motion.div
          className="w-32 h-32 md:w-40 md:h-40 rounded-full shadow-2xl relative z-10 flex items-center justify-center overflow-hidden"
          animate={{
            boxShadow: [
              "0 0 30px rgba(59, 130, 246, 0.4)",
              "0 0 60px rgba(59, 130, 246, 0.6)",
              "0 0 30px rgba(59, 130, 246, 0.4)",
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <img 
            src="/favicon.png" 
            alt="LUKATO" 
            className="w-full h-full object-cover"
          />
        </motion.div>
      </motion.div>

      {/* App Name */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mt-8 text-center"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-wide">
          LUKATO{" "}
          <span className="bg-gradient-to-r from-primary via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            AI
          </span>
        </h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-3 text-white/80 text-base md:text-lg font-medium"
        >
          {t("splash.tagline")}
        </motion.p>
      </motion.div>

      {/* Progress Bar */}
      <motion.div
        initial={{ opacity: 0, width: 0 }}
        animate={{ opacity: 1, width: "240px" }}
        transition={{ delay: 0.6, duration: 0.3 }}
        className="mt-12"
      >
        <div className="w-[240px] h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
          <motion.div
            className="h-full bg-gradient-to-r from-primary via-blue-400 to-cyan-400 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        
        {/* Loading Text */}
        <motion.p
          className="mt-4 text-white/70 text-sm text-center font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {t("splash.loading")} {progress}%
        </motion.p>
      </motion.div>

      {/* Bottom Branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="absolute bottom-8 text-center"
      >
        <p className="text-white/50 text-sm font-medium">
          {t("splash.branding")}
        </p>
      </motion.div>
    </motion.div>
  );
};

export default SplashScreen;
