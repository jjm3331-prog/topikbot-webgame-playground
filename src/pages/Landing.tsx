import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const Landing = () => {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/game");
      }
    });
    setTimeout(() => setIsLoaded(true), 100);
  }, [navigate]);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 via-white to-blue-50/30 flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden">
      {/* Animated gradient orbs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.4, 0.6, 0.4]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-br from-blue-200/50 via-violet-200/40 to-pink-200/30 rounded-full blur-3xl pointer-events-none" 
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          x: [0, 20, 0]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-cyan-200/40 via-blue-200/30 to-transparent rounded-full blur-3xl pointer-events-none" 
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.15, 1],
          y: [0, -20, 0]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-0 w-[400px] h-[400px] bg-gradient-to-r from-violet-200/40 to-transparent rounded-full blur-3xl pointer-events-none" 
      />
      
      {/* Content */}
      <div className="relative z-10 max-w-lg mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : -20, scale: isLoaded ? 1 : 0.9 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          whileHover={{ scale: 1.02, boxShadow: "0 20px 40px -10px rgba(100, 100, 255, 0.15)" }}
          className="inline-flex items-center gap-3 px-6 py-3 bg-white/90 backdrop-blur-md rounded-full shadow-xl shadow-slate-200/60 border border-slate-100/80 mb-14 cursor-default"
        >
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="w-5 h-5 text-blue-600" />
          </motion.div>
          <span className="text-slate-700 font-semibold text-sm tracking-wide">
            Game học tiếng Hàn đầu tiên tại Việt Nam
          </span>
          <motion.span 
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50" 
          />
        </motion.div>

        {/* Main Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 30 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="mb-12"
        >
          <h1 className="font-black text-[3.2rem] sm:text-6xl md:text-7xl leading-[1.1] tracking-tight space-y-3">
            <motion.span 
              className="text-slate-900 block"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              CHINH PHỤC
            </motion.span>
            <motion.span 
              className="bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent block py-1"
              animate={{ backgroundPosition: ["0%", "100%", "0%"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              style={{ backgroundSize: "200% 100%" }}
            >
              TIẾNG HÀN
            </motion.span>
            <motion.span 
              className="text-slate-400 block text-4xl sm:text-5xl font-bold"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              &
            </motion.span>
            <motion.span 
              className="bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-transparent block py-1"
              animate={{ backgroundPosition: ["0%", "100%", "0%"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: 0.5 }}
              style={{ backgroundSize: "200% 100%" }}
            >
              VĂN HÓA
            </motion.span>
          </h1>
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          className="text-slate-600 text-lg sm:text-xl leading-[1.8] mb-14 max-w-md mx-auto font-medium"
        >
          Nhanh hơn, thông minh hơn.
          <br />
          AI siêu cá nhân hóa phân tích chính xác điểm yếu
          <br />
          và xây dựng{" "}
          <motion.span 
            className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 font-bold"
            whileHover={{ scale: 1.05 }}
          >
            lộ trình chiến thắng
          </motion.span>{" "}
          dành riêng cho bạn.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
          transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
        >
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={() => navigate("/auth")}
              className="group relative w-full max-w-sm h-16 bg-gradient-to-r from-blue-600 via-blue-500 to-violet-600 hover:from-blue-700 hover:via-blue-600 hover:to-violet-700 text-white text-xl font-bold rounded-2xl shadow-2xl shadow-blue-500/40 hover:shadow-blue-600/50 transition-all duration-300 overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
              />
              <span className="relative flex items-center gap-3">
                Bắt đầu miễn phí
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="w-6 h-6" />
                </motion.div>
              </span>
            </Button>
          </motion.div>
        </motion.div>

        {/* Sub text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-slate-500 text-sm mt-8 font-medium tracking-wide"
        >
          Không cần thẻ tín dụng • Bắt đầu ngay trong 30 giây
        </motion.p>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: isLoaded ? 1 : 0, scale: isLoaded ? 1 : 0.8 }}
          transition={{ duration: 0.6, delay: 1 }}
          whileHover={{ scale: 1.05 }}
          className="mt-16 flex items-center justify-center gap-4 cursor-pointer"
        >
          <motion.div 
            className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-slate-200/80 shadow-lg"
            whileHover={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.5 }}
          >
            <img src="/favicon.png" alt="LUKATO" className="w-full h-full object-cover" />
          </motion.div>
          <div className="flex flex-col items-start">
            <span className="font-extrabold text-slate-800 text-xl tracking-wide">LUKATO</span>
            <span className="text-xs text-blue-600 tracking-[0.2em] uppercase font-semibold">Your Korean Mentor</span>
          </div>
        </motion.div>
      </div>

      {/* Bottom decorative line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isLoaded ? 1 : 0 }}
        transition={{ duration: 1, delay: 1.2, ease: "easeOut" }}
        className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-blue-500/60 to-transparent"
      />
      
      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-blue-400/30"
          style={{
            left: `${15 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4 + i * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.3,
          }}
        />
      ))}
    </div>
  );
};

export default Landing;
