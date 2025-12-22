import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Trophy,
  FileX,
  Star,
  Target,
  ChevronRight,
  Crown,
  Briefcase,
  Users,
  FileText,
  StickyNote,
  Sparkles,
  Flame,
  Check,
  Gift,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import confetti from "canvas-confetti";
import { PremiumPreviewBanner } from "@/components/PremiumPreviewBanner";
import { useSubscription } from "@/hooks/useSubscription";

interface Profile {
  id: string;
  username: string;
  hp: number;
  money: number;
  missions_completed: number;
  total_missions: number;
  points: number;
  last_daily_bonus: string | null;
  current_streak: number;
  longest_streak: number;
}

const Dashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayChecked, setTodayChecked] = useState(false);
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
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      } else {
        setProfile(data);
        // Check if user has checked in today
        if (data.last_daily_bonus) {
          const lastBonus = new Date(data.last_daily_bonus);
          const today = new Date();
          if (lastBonus.toDateString() === today.toDateString()) {
            setTodayChecked(true);
          }
        }
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

  const handleDailyCheckIn = async () => {
    if (todayChecked || !profile) return;
    
    const now = new Date();
    const lastBonus = profile.last_daily_bonus ? new Date(profile.last_daily_bonus) : null;
    
    // Calculate new streak
    let newStreak = 1;
    if (lastBonus) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // If last check-in was yesterday, continue streak
      if (lastBonus.toDateString() === yesterday.toDateString()) {
        newStreak = (profile.current_streak || 0) + 1;
      }
    }
    
    // Calculate points: 50 base + 500 bonus for 7-day streak
    let pointsToAdd = 50;
    let bonusMessage = "";
    if (newStreak === 7) {
      pointsToAdd += 500;
      bonusMessage = " 🎉 +500 điểm bonus 7 ngày liên tiếp!";
    }
    
    const newLongestStreak = Math.max(profile.longest_streak || 0, newStreak);
    
    const { error } = await supabase
      .from("profiles")
      .update({ 
        last_daily_bonus: now.toISOString(),
        points: (profile.points || 0) + pointsToAdd,
        current_streak: newStreak,
        longest_streak: newLongestStreak
      })
      .eq("id", profile.id);

    if (!error) {
      setTodayChecked(true);
      setProfile(prev => prev ? { 
        ...prev, 
        points: (prev.points || 0) + pointsToAdd,
        current_streak: newStreak,
        longest_streak: newLongestStreak
      } : null);
      
      // Celebration confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181']
      });
      
      // Extra confetti for 7-day streak bonus
      if (newStreak === 7) {
        setTimeout(() => {
          confetti({
            particleCount: 200,
            spread: 100,
            origin: { y: 0.5 },
            colors: ['#FFD700', '#FFA500', '#FF4500']
          });
        }, 300);
      }
      
      toast({
        title: `🎉 +${pointsToAdd} điểm!`,
        description: `Điểm danh ngày ${newStreak} thành công!${bonusMessage}`,
      });
    }
  };

  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

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

        {/* Daily Missions Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5 rounded-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-destructive" />
              <span className="font-semibold text-foreground">Nhiệm vụ hàng ngày</span>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-secondary/20 text-secondary font-medium flex items-center gap-1">
              🔥 Duy trì streak!
            </span>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Nhiệm vụ hàng ngày</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Daily Check-in Card */}
            <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-korean-green/20 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-korean-green" />
                  </div>
                  <span className="font-medium text-foreground text-sm">Điểm danh hàng ngày</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-korean-green/20 text-korean-green">
                  🔥 {profile?.current_streak || 0} ngày!
                </span>
              </div>

              {/* Week days */}
              <div className="flex gap-1 mb-3">
                {weekDays.map((day, idx) => (
                  <div 
                    key={day}
                    className={`flex-1 py-1.5 rounded text-center text-xs font-medium transition-colors ${
                      idx < ((profile?.current_streak || 0) % 7 || (todayChecked ? 7 : 0))
                        ? 'bg-korean-green text-white' 
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <span>Mỗi ngày <span className="text-secondary font-medium">+50 điểm</span></span>
                <span>🎁 7 ngày liên tiếp: <span className="text-secondary font-medium">+500</span></span>
              </div>

              <Button 
                onClick={handleDailyCheckIn}
                disabled={todayChecked}
                className={`w-full ${todayChecked 
                  ? 'bg-muted text-muted-foreground' 
                  : 'bg-korean-green hover:bg-korean-green/90 text-white'}`}
              >
                <Check className="w-4 h-4 mr-2" />
                {todayChecked ? 'Đã điểm danh hôm nay!' : 'Điểm danh hôm nay!'}
              </Button>

              {(profile?.current_streak || 0) > 0 && (
                <p className="text-center text-xs text-korean-orange mt-2">
                  🔥 Đang có {profile?.current_streak} ngày liên tiếp! (Kỷ lục: {profile?.longest_streak || 0} ngày)
                </p>
              )}
            </div>

            {/* Quiz Reward Card */}
            <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded bg-korean-yellow/20 flex items-center justify-center">
                  <Star className="w-3.5 h-3.5 text-korean-yellow" />
                </div>
                <span className="font-medium text-foreground text-sm">Thưởng quiz hoàn hảo</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-korean-yellow/20 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-korean-yellow" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Đúng cả 5 câu</p>
                      <p className="text-xs text-muted-foreground">Khi hoàn thành quiz hoàn hảo</p>
                    </div>
                  </div>
                  <span className="text-korean-orange font-bold">+200<br/><span className="text-xs font-normal">điểm</span></span>
                </div>

                <div className="h-px bg-border" />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tổng quiz hoàn hảo</span>
                  <span className="text-secondary font-bold">0 lần</span>
                </div>
              </div>

              <p className="text-xs text-korean-yellow mt-3 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Nhận thêm 200 điểm ngoài điểm cơ bản. Hãy tập trung làm bài nhé!
              </p>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions - Korean Learning CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
          transition={{ delay: 0.22 }}
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
          transition={{ delay: 0.25 }}
          className="grid grid-cols-3 gap-3"
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
            onClick={() => navigate("/mistakes")}
            className="glass-card p-4 rounded-xl cursor-pointer hover:border-primary/50 transition-colors text-center"
          >
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
              <FileX className="w-5 h-5 text-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Sổ lỗi sai</p>
            <p className="text-xs text-muted-foreground">AI phân tích</p>
          </div>

          <div 
            onClick={() => navigate("/profile")}
            className="glass-card p-4 rounded-xl cursor-pointer hover:border-primary/50 transition-colors text-center"
          >
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
              <Star className="w-5 h-5 text-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Điểm của tôi</p>
            <p className="text-xs text-muted-foreground">Xem hồ sơ</p>
          </div>
        </motion.div>

        {/* Weekly Goals */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4 rounded-2xl"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-korean-orange" />
              <span className="font-semibold text-foreground">Mục tiêu tuần</span>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-korean-green/20 text-korean-green font-medium">
              +500đ bonus
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">Đặt mục tiêu cá nhân, hoàn thành = nhận thưởng!</p>
          <Button variant="outline" size="sm" className="gap-2">
            <Target className="w-4 h-4" />
            Đặt mục tiêu
          </Button>
        </motion.div>

        {/* Korean Learning Features */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
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

        {/* Invite Friends */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={() => navigate("/profile#invite")}
          className="glass-card p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-korean-blue/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-korean-blue" />
            </div>
            <div>
              <p className="font-medium text-foreground flex items-center gap-2">
                🎉 Mời bạn bè
              </p>
              <p className="text-xs text-muted-foreground">+500 điểm cho bạn, +200 điểm cho bạn bè</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </motion.div>

        {/* Premium Upgrade */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
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
