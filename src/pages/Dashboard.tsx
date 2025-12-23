import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  ChevronRight,
  Crown,
  Briefcase,
  BookOpen,
  Gamepad2,
} from "lucide-react";
import { motion } from "framer-motion";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";

interface Profile {
  id: string;
  username: string;
}

const Dashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      } else {
        setProfile(data);
      }
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src="/favicon.png" alt="LUKATO" className="w-16 h-16 rounded-full animate-pulse" />
          <div className="text-muted-foreground text-sm">로딩중... / Đang tải...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />
      <main className="flex-1 pt-8 pb-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          {/* Welcome Message */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">👋</span>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Xin chào, {profile?.username || 'User'}!
                </h1>
                <p className="text-muted-foreground">Hôm nay bạn muốn học gì?</p>
              </div>
            </div>
          </motion.div>

          {/* Main CTA - Korean Learning */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid sm:grid-cols-2 gap-4"
          >
            <div
              onClick={() => navigate("/topik-1")}
              className="relative overflow-hidden rounded-2xl cursor-pointer group p-5 bg-gradient-to-br from-korean-blue/20 to-korean-cyan/10 border border-korean-blue/20 hover:border-korean-blue/40 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-korean-blue/20 flex items-center justify-center shrink-0">
                  <BookOpen className="w-7 h-7 text-korean-blue" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground text-lg">TOPIK I (1-2급)</h3>
                  <p className="text-sm text-muted-foreground">Ngữ pháp • Từ vựng • Đọc hiểu</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-korean-blue group-hover:translate-x-1 transition-all" />
              </div>
            </div>

            <div
              onClick={() => navigate("/topik-2")}
              className="relative overflow-hidden rounded-2xl cursor-pointer group p-5 bg-gradient-to-br from-korean-purple/20 to-korean-pink/10 border border-korean-purple/20 hover:border-korean-purple/40 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-korean-purple/20 flex items-center justify-center shrink-0">
                  <BookOpen className="w-7 h-7 text-korean-purple" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground text-lg">TOPIK II (3-6급)</h3>
                  <p className="text-sm text-muted-foreground">Ngữ pháp • Từ vựng • Viết</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-korean-purple group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </motion.div>

          {/* Korea Career Hub Banner */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={() => navigate("/korea-career")}
            className="relative overflow-hidden rounded-2xl cursor-pointer group"
          >
            {/* Premium gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.15),transparent_40%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(147,51,234,0.3),transparent_40%)]" />
            
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            
            <div className="relative z-10 p-6 flex items-center justify-between">
              <div className="flex items-center gap-5">
                {/* Icon cluster */}
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-lg">
                    <Briefcase className="w-7 h-7 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-korean-green flex items-center justify-center border-2 border-white/50">
                    <span className="text-[10px]">🇰🇷</span>
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold shadow-md">
                      ⭐ All-in-One
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-medium backdrop-blur-sm">
                      한국 취업
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-lg tracking-tight">Korea Career Hub</h3>
                  <p className="text-white/80 text-sm">
                    Headhunting • Báo cáo DN • Phỏng vấn AI - Tất cả trong một!
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col items-end mr-2">
                  <span className="text-[10px] text-white/60">1,000+ 취업 성공</span>
                  <span className="text-[10px] text-white/60">98% 만족도</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <ChevronRight className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* AI Chat Banner */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17 }}
            onClick={() => navigate("/ai-chat")}
            className="relative overflow-hidden rounded-2xl cursor-pointer group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent)]" />
            <div className="relative z-10 p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-bold">RAG AI</span>
                  </div>
                  <h3 className="font-bold text-white">LUKATO Q&A Agent</h3>
                  <p className="text-white/70 text-sm">Hỏi trực tiếp các mô hình Premium với Q&A Agent hiệu suất cao nhất!</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Game Section */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Gamepad2 className="w-5 h-5 text-korean-orange" />
              <h2 className="font-semibold text-foreground">Game học tiếng Hàn</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: "🎮", label: "AI Sinh tồn", desc: "Seoul", path: "/chat" },
                { icon: "💕", label: "Hẹn hò", desc: "Korean Dating", path: "/dating" },
                { icon: "👑", label: "Manager", desc: "K-POP Idol", path: "/manager" },
                { icon: "🎵", label: "K-POP Quiz", desc: "Music", path: "/kpop" },
              ].map((game, idx) => (
                <div 
                  key={idx}
                  onClick={() => navigate(game.path)}
                  className="glass-card p-4 rounded-xl text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all group"
                >
                  <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">{game.icon}</span>
                  <p className="text-sm font-medium text-foreground">{game.label}</p>
                  <p className="text-xs text-muted-foreground">{game.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* More Games */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="grid grid-cols-3 gap-3"
          >
            {[
              { icon: "🎬", label: "K-Drama", path: "/kdrama" },
              { icon: "🔗", label: "Nối từ", path: "/wordchain" },
              { icon: "💼", label: "Làm thêm", path: "/parttime" },
            ].map((game, idx) => (
              <div 
                key={idx}
                onClick={() => navigate(game.path)}
                className="glass-card p-3 rounded-xl text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all group"
              >
                <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">{game.icon}</span>
                <p className="text-sm font-medium text-foreground">{game.label}</p>
              </div>
            ))}
          </motion.div>

        </div>

        {/* AI Floating Button */}
        <a
          href="https://chat-topikbot.kr"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-24 right-4 z-50"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              boxShadow: [
                "0 0 0 0 rgba(251, 191, 36, 0.4)",
                "0 0 0 15px rgba(251, 191, 36, 0)",
                "0 0 0 0 rgba(251, 191, 36, 0)"
              ]
            }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/30 cursor-pointer hover:from-yellow-300 hover:to-amber-400 transition-colors"
          >
            <MessageCircle className="w-6 h-6 text-white" />
          </motion.div>
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-white text-amber-600 shadow-sm">
            AI
          </span>
        </a>
      </main>
      <AppFooter />
    </div>
  );
};

export default Dashboard;