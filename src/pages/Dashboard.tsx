import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  ChevronRight,
  Crown,
  Briefcase,
  Users,
  User,
} from "lucide-react";
import { motion } from "framer-motion";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { PremiumPreviewBanner } from "@/components/PremiumPreviewBanner";
import { useSubscription } from "@/hooks/useSubscription";

interface Profile {
  id: string;
  username: string;
}

const Dashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isPremium } = useSubscription();

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
      <main className="flex-1 pb-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Premium Preview Banner */}
        {!isPremium && <PremiumPreviewBanner featureName="theo dõi tiến độ học" />}
        
        {/* Welcome Message */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">👋</span>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Xin chào, {profile?.username || 'User'}!
              </h1>
              <p className="text-muted-foreground text-sm">Hôm nay bạn muốn học gì?</p>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions - Korean Learning CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => navigate("/topik-1")}
          className="glass-card p-4 rounded-2xl cursor-pointer hover:border-primary/50 transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-korean-pink/20 flex items-center justify-center">
              <span className="text-2xl">🇰🇷</span>
            </div>
            <div>
              <h3 className="font-bold text-foreground">Học TOPIK ngay!</h3>
              <p className="text-sm text-muted-foreground">Ngữ pháp • Từ vựng • Đọc • Nghe • Viết</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </motion.div>

        {/* Headhunting Promo Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={() => navigate("/headhunting")}
          className="relative overflow-hidden rounded-2xl cursor-pointer group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-korean-purple via-korean-blue to-korean-cyan" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.1),transparent)]" />
          <div className="relative z-10 p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-korean-yellow/20 text-korean-yellow font-bold">Premium</span>
                </div>
                <h3 className="font-bold text-white text-sm sm:text-base">Headhunting doanh nghiệp Hàn Quốc</h3>
                <p className="text-white/70 text-xs">Đội ngũ headhunter hỗ trợ xin việc MIỄN PHÍ!</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

        {/* Quick Action Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-3"
        >
          <div 
            onClick={() => navigate("/ai-tutor")}
            className="glass-card p-4 rounded-xl cursor-pointer hover:border-primary/50 transition-colors text-center"
          >
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Hỏi AI</p>
            <p className="text-xs text-muted-foreground">24/7</p>
          </div>

          <div 
            onClick={() => navigate("/profile")}
            className="glass-card p-4 rounded-xl cursor-pointer hover:border-primary/50 transition-colors text-center"
          >
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
              <User className="w-5 h-5 text-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Hồ sơ của tôi</p>
            <p className="text-xs text-muted-foreground">Tài khoản</p>
          </div>
        </motion.div>

        {/* Korean Learning Features */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-3"
        >
          <p className="text-sm text-muted-foreground">Game học tiếng Hàn</p>
          <div className="grid grid-cols-3 gap-3">
            <div 
              onClick={() => navigate("/chat")}
              className="glass-card p-4 rounded-xl text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <span className="text-2xl block mb-2">🎮</span>
              <p className="text-sm text-foreground">AI Sinh tồn</p>
            </div>
            <div 
              onClick={() => navigate("/dating")}
              className="glass-card p-4 rounded-xl text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <span className="text-2xl block mb-2">💕</span>
              <p className="text-sm text-foreground">Hẹn hò</p>
            </div>
            <div 
              onClick={() => navigate("/kpop")}
              className="glass-card p-4 rounded-xl text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <span className="text-2xl block mb-2">🎵</span>
              <p className="text-sm text-foreground">K-POP Quiz</p>
            </div>
          </div>
        </motion.div>

        {/* More Games */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-3"
        >
          <div 
            onClick={() => navigate("/manager")}
            className="glass-card p-4 rounded-xl text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            <span className="text-2xl block mb-2">👑</span>
            <p className="text-sm text-foreground">Manager</p>
          </div>
          <div 
            onClick={() => navigate("/kdrama")}
            className="glass-card p-4 rounded-xl text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            <span className="text-2xl block mb-2">🎬</span>
            <p className="text-sm text-foreground">K-Drama</p>
          </div>
          <div 
            onClick={() => navigate("/wordchain")}
            className="glass-card p-4 rounded-xl text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            <span className="text-2xl block mb-2">🔗</span>
            <p className="text-sm text-foreground">Nối từ</p>
          </div>
        </motion.div>

        {/* Premium Upgrade */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          onClick={() => navigate("/pricing")}
          className="glass-card p-4 rounded-2xl flex items-center justify-between border-korean-yellow/30 cursor-pointer hover:border-korean-yellow/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-korean-yellow/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-korean-yellow" />
            </div>
            <div>
              <p className="font-medium text-foreground">Nâng cấp Premium</p>
              <p className="text-xs text-muted-foreground">AI không giới hạn • Chấm bài viết • Phân tích lỗi sai</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            Xem gói <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
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