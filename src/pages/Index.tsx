import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

const Index = () => {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();
    setTimeout(() => setIsLoaded(true), 100);
  }, [navigate]);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 via-white to-blue-50/30 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Subtle gradient orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-br from-blue-100/40 via-purple-100/30 to-pink-100/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tl from-cyan-100/30 via-blue-100/20 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 left-0 w-[300px] h-[300px] bg-gradient-to-r from-violet-100/30 to-transparent rounded-full blur-3xl pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10 max-w-lg mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : -20 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/80 backdrop-blur-sm rounded-full shadow-lg shadow-slate-200/50 border border-slate-100 mb-10"
        >
          <Sparkles className="w-5 h-5 text-blue-600" />
          <span className="text-slate-700 font-medium text-sm tracking-wide">
            Game học tiếng Hàn đầu tiên tại Việt Nam
          </span>
          <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
        </motion.div>

        {/* Main Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 30 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="mb-8"
        >
          <h1 className="font-black text-5xl sm:text-6xl md:text-7xl leading-[0.95] tracking-tight">
            <span className="text-slate-900 block">CHINH PHỤC</span>
            <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent block">
              TIẾNG HÀN
            </span>
            <span className="text-slate-900 block">&</span>
            <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-transparent block">
              VĂN HÓA
            </span>
          </h1>
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          className="text-slate-600 text-lg sm:text-xl leading-relaxed mb-12 max-w-md mx-auto"
        >
          Nhanh hơn, thông minh hơn. AI siêu cá nhân hóa phân tích chính xác điểm yếu và xây dựng{" "}
          <span className="text-blue-600 font-semibold italic">lộ trình chiến thắng</span>{" "}
          dành riêng cho bạn.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
          transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
        >
          <Button
            onClick={() => navigate("/auth")}
            className="group relative w-full max-w-sm h-16 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 hover:from-blue-700 hover:via-blue-600 hover:to-blue-700 text-white text-xl font-bold rounded-2xl shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02]"
          >
            <span className="flex items-center gap-3">
              Bắt đầu miễn phí
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
            </span>
          </Button>
        </motion.div>

        {/* Sub text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-slate-400 text-sm mt-6"
        >
          Không cần thẻ tín dụng • Bắt đầu ngay trong 30 giây
        </motion.p>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: isLoaded ? 1 : 0, scale: isLoaded ? 1 : 0.8 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-12 flex items-center justify-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shadow-md">
            <img src="/favicon.png" alt="LUKATO" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col items-start">
            <span className="font-bold text-slate-800 text-lg tracking-wide">LUKATO</span>
            <span className="text-[10px] text-blue-600/80 tracking-widest uppercase">Your Korean Mentor</span>
          </div>
        </motion.div>
      </div>

      {/* Bottom decorative line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isLoaded ? 1 : 0 }}
        transition={{ duration: 1, delay: 1.2, ease: "easeOut" }}
        className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"
      />
    </div>
  );
};

export default Index;
