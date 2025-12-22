import { useState, useEffect } from "react";
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
  Users,
  FileText,
  StickyNote,
  Sparkles,
  Flame,
  Check,
  Gift,
  LogOut,
  Settings
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import MegaMenu from "@/components/MegaMenu";
import Footer from "@/components/Footer";

interface Profile {
  id: string;
  username: string;
  hp: number;
  money: number;
  missions_completed: number;
  total_missions: number;
  points: number;
  last_daily_bonus: string | null;
}

const Dashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStreak, setCurrentStreak] = useState(7);
  const [todayChecked, setTodayChecked] = useState(false);
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
    
    const { error } = await supabase
      .from("profiles")
      .update({ 
        last_daily_bonus: new Date().toISOString(),
        points: (profile.points || 0) + 50
      })
      .eq("id", profile.id);

    if (!error) {
      setTodayChecked(true);
      setProfile(prev => prev ? { ...prev, points: (prev.points || 0) + 50 } : null);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Đăng xuất thành công",
        description: "Hẹn gặp lại bạn!",
      });
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể đăng xuất. Vui lòng thử lại.",
        variant: "destructive",
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
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <MegaMenu />

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 pt-20 max-w-4xl mx-auto w-full space-y-6 overflow-y-auto">
        {/* Welcome Message + Logout */}
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
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/settings")}
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </Button>
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
                  🔥 {currentStreak} ngày!
                </span>
              </div>

              {/* Week days */}
              <div className="flex gap-1 mb-3">
                {weekDays.map((day, idx) => (
                  <div 
                    key={day}
                    className={`flex-1 py-1.5 rounded text-center text-xs font-medium transition-colors ${
                      idx < currentStreak 
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

              {currentStreak > 0 && (
                <p className="text-center text-xs text-korean-orange mt-2">
                  🔥 Đang có {currentStreak} ngày liên tiếp!
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

        {/* Quick Actions - Quiz CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => navigate("/quiz")}
          className="glass-card p-4 rounded-2xl cursor-pointer hover:border-primary/50 transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-korean-pink/20 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-korean-pink" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Làm quiz ngay!</h3>
              <p className="text-sm text-muted-foreground">Toán • Lý • Hóa • Sinh • Anh</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </motion.div>

        {/* Quick Action Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="grid grid-cols-4 gap-3"
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
            onClick={() => navigate("/ranking")}
            className="glass-card p-4 rounded-xl cursor-pointer hover:border-primary/50 transition-colors text-center"
          >
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
              <Trophy className="w-5 h-5 text-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Xếp hạng</p>
            <p className="text-xs text-muted-foreground">Tuần/Tháng</p>
          </div>

          <div 
            className="glass-card p-4 rounded-xl cursor-pointer hover:border-primary/50 transition-colors text-center"
          >
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
              <FileX className="w-5 h-5 text-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Số lỗi sai</p>
            <p className="text-xs text-muted-foreground">AI phân tích</p>
          </div>

          <div 
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

        {/* Additional Features */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="space-y-3"
        >
          <p className="text-sm text-muted-foreground">Thêm tính năng</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card p-4 rounded-xl text-center cursor-pointer hover:border-primary/50 transition-colors">
              <StickyNote className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-foreground">Ghi chú</p>
            </div>
            <div className="glass-card p-4 rounded-xl text-center cursor-pointer hover:border-primary/50 transition-colors">
              <FileText className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-foreground">Tài liệu</p>
            </div>
            <div className="glass-card p-4 rounded-xl text-center cursor-pointer hover:border-primary/50 transition-colors">
              <Users className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-foreground">Cộng đồng</p>
            </div>
          </div>
        </motion.div>

        {/* Invite Friends */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
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
              <p className="text-xs text-muted-foreground">+500đ cho bạn, +200đ cho bạn bè</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </motion.div>

        {/* Premium Upgrade */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card p-4 rounded-2xl flex items-center justify-between border-korean-yellow/30"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-korean-yellow/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-korean-yellow" />
            </div>
            <div>
              <p className="font-medium text-foreground">Nâng cấp Premium</p>
              <p className="text-xs text-muted-foreground">AI không giới hạn • HSA/TSA/APT</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            Xem gói <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>

        {/* LUKATO AI CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="py-8"
        >
          <Button 
            onClick={() => navigate("/ai-tutor")}
            className="w-full max-w-md mx-auto flex bg-muted hover:bg-muted/80 text-foreground border border-border h-14 rounded-full"
          >
            <Sparkles className="w-5 h-5 mr-2 text-primary" />
            Khám phá LUKATO AI
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </main>

      {/* Footer */}
      <Footer />

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
    </div>
  );
};

export default Dashboard;
