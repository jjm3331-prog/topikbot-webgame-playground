import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  ChevronRight,
  Crown,
  Briefcase,
  PenTool,
  Headphones,
  Gamepad2,
  BookOpen,
  FileText,
  Sparkles,
  GraduationCap,
  Trophy,
  Flame,
  Gift,
  Star,
  Calendar,
  CheckCircle,
  Zap,
} from "lucide-react";
import { Swords } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { toast } from "@/hooks/use-toast";
import { getLevelFromPoints, POINTS_CONFIG } from "@/lib/pointsPolicy";
import { Progress } from "@/components/ui/progress";

interface Profile {
  id: string;
  username: string;
  points: number;
  current_streak: number;
  longest_streak: number;
  last_daily_bonus: string | null;
}

const Dashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [showCheckInSuccess, setShowCheckInSuccess] = useState(false);
  const [bonusPoints, setBonusPoints] = useState(0);
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
        .select("id, username, points, current_streak, longest_streak, last_daily_bonus")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      } else {
        setProfile(data);
        // Check if user can check in today
        const canCheck = checkCanCheckIn(data.last_daily_bonus);
        setCanCheckIn(canCheck);
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

  const checkCanCheckIn = (lastBonus: string | null): boolean => {
    if (!lastBonus) return true;
    
    const lastDate = new Date(lastBonus);
    const today = new Date();
    
    // Reset time to compare dates only
    lastDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    return lastDate.getTime() < today.getTime();
  };

  const handleDailyCheckIn = async () => {
    if (!profile || checkingIn || !canCheckIn) return;
    
    setCheckingIn(true);
    
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      let newStreak = 1;
      let bonusAmount = POINTS_CONFIG.DAILY_CHECKIN;
      
      // Check if streak continues
      if (profile.last_daily_bonus) {
        const lastDate = new Date(profile.last_daily_bonus);
        lastDate.setHours(0, 0, 0, 0);
        
        if (lastDate.getTime() === yesterday.getTime()) {
          newStreak = profile.current_streak + 1;
        }
      }
      
      // 7-day streak bonus
      if (newStreak % 7 === 0) {
        bonusAmount += POINTS_CONFIG.WEEKLY_STREAK_BONUS;
      }
      
      const newPoints = profile.points + bonusAmount;
      const newLongestStreak = Math.max(profile.longest_streak, newStreak);
      
      const { error } = await supabase
        .from("profiles")
        .update({
          points: newPoints,
          current_streak: newStreak,
          longest_streak: newLongestStreak,
          last_daily_bonus: today.toISOString(),
        })
        .eq("id", profile.id);
      
      if (error) throw error;
      
      // Update local state
      setProfile({
        ...profile,
        points: newPoints,
        current_streak: newStreak,
        longest_streak: newLongestStreak,
        last_daily_bonus: today.toISOString(),
      });
      
      setBonusPoints(bonusAmount);
      setShowCheckInSuccess(true);
      setCanCheckIn(false);
      
      // Hide success animation after 3 seconds
      setTimeout(() => setShowCheckInSuccess(false), 3000);
      
      toast({
        title: "Điểm danh thành công! 🎉",
        description: `+${bonusAmount} điểm! Streak: ${newStreak} ngày`,
      });
      
    } catch (error) {
      console.error("Error checking in:", error);
      toast({
        title: "Lỗi",
        description: "Không thể điểm danh. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setCheckingIn(false);
    }
  };

  const levelInfo = profile ? getLevelFromPoints(profile.points) : null;

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src="/favicon.png" alt="LUKATO" className="w-16 h-16 rounded-full animate-pulse" />
          <div className="text-muted-foreground text-sm">Đang tải...</div>
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
            <div className="flex items-start gap-4">
              <span className="text-4xl sm:text-5xl">👋</span>
              <div>
                <h1 className="text-title font-bold text-foreground">
                  Xin chào, {profile?.username || 'User'}!
                </h1>
                <p className="text-body text-muted-foreground mt-1">Hôm nay bạn muốn học gì?</p>
              </div>
            </div>
          </motion.div>

          {/* Points & Level Widget + Daily Check-in */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid gap-4 sm:grid-cols-2"
          >
            {/* Points & Level Card */}
            <div 
              onClick={() => navigate("/points-system")}
              className="glass-card rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-korean-orange to-korean-pink flex items-center justify-center">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-card-caption text-muted-foreground">Điểm tích lũy</p>
                    <p className="text-2xl font-bold text-foreground">{profile?.points?.toLocaleString() || 0}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
              
              {levelInfo && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-card-body font-semibold ${levelInfo.color}`}>
                      {levelInfo.name}
                    </span>
                    {levelInfo.level < 6 && (
                      <span className="text-card-caption text-muted-foreground">
                        {profile?.points?.toLocaleString()}/{levelInfo.nextLevelPoints.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <Progress 
                    value={levelInfo.progress} 
                    className="h-2"
                  />
                  {levelInfo.level < 6 && (
                    <p className="text-badge text-muted-foreground">
                      Còn {(levelInfo.nextLevelPoints - (profile?.points || 0)).toLocaleString()} điểm để lên level tiếp
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Daily Check-in Card */}
            <div className="relative overflow-hidden rounded-2xl">
              {/* Success Animation Overlay */}
              <AnimatePresence>
                {showCheckInSuccess && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 bg-gradient-to-br from-korean-green/90 to-korean-cyan/90 flex flex-col items-center justify-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{ duration: 0.5 }}
                    >
                      <CheckCircle className="w-16 h-16 text-white mb-3" />
                    </motion.div>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-2xl font-bold text-white"
                    >
                      +{bonusPoints} điểm!
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={`glass-card p-5 h-full ${canCheckIn ? 'bg-gradient-to-br from-korean-green/10 to-korean-cyan/10 border-korean-green/30' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      canCheckIn 
                        ? 'bg-gradient-to-br from-korean-green to-korean-cyan' 
                        : 'bg-muted'
                    }`}>
                      <Calendar className={`w-6 h-6 ${canCheckIn ? 'text-white' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <p className="text-card-caption text-muted-foreground">Điểm danh hàng ngày</p>
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-korean-orange" />
                        <span className="text-lg font-bold text-foreground">{profile?.current_streak || 0} ngày</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-korean-orange" />
                    <span className="text-card-caption text-muted-foreground">
                      Kỷ lục: {profile?.longest_streak || 0} ngày
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Gift className="w-4 h-4 text-korean-purple" />
                    <span className="text-card-caption text-muted-foreground">
                      +{POINTS_CONFIG.DAILY_CHECKIN}/ngày
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleDailyCheckIn}
                  disabled={!canCheckIn || checkingIn}
                  className={`w-full ${
                    canCheckIn 
                      ? 'bg-gradient-to-r from-korean-green to-korean-cyan hover:from-korean-green/90 hover:to-korean-cyan/90 text-white' 
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {checkingIn ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang xử lý...
                    </div>
                  ) : canCheckIn ? (
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Điểm danh ngay!
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Đã điểm danh hôm nay
                    </div>
                  )}
                </Button>

                {/* 7-day streak bonus hint */}
                {canCheckIn && profile && (profile.current_streak + 1) % 7 === 0 && (
                  <p className="text-center text-badge text-korean-green mt-2">
                    🎁 Điểm danh hôm nay để nhận thưởng 7 ngày liên tiếp!
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Battle Arena Banner - HOT */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            onClick={() => navigate("/battle")}
            className="relative overflow-hidden rounded-2xl cursor-pointer group"
          >
            {/* Dark intense gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 via-orange-500 to-red-600" />
            <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-transparent to-black/40" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,0,0.3),transparent_40%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(255,50,50,0.3),transparent_40%)]" />
            
            {/* Fire particles */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-1/4 left-1/5 w-2 h-2 bg-yellow-400/50 rounded-full animate-pulse" />
              <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-orange-400/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-red-400/50 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              <div className="absolute top-1/2 right-1/5 w-2 h-2 bg-yellow-300/40 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
            </div>
            
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            
            <div className="relative z-10 p-5 sm:p-6 flex items-center justify-between">
              <div className="flex items-center gap-4 sm:gap-5">
                {/* Icon with heartbeat */}
                <div className="relative">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-lg animate-heartbeat">
                    <Swords className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center border-2 border-white/50 shadow-md animate-heartbeat" style={{ animationDelay: '0.15s' }}>
                    <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5 sm:mb-2 flex-wrap">
                    <span className="text-badge px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/25 text-white font-bold backdrop-blur-sm">
                      ⚔️ 1:1 Real-time
                    </span>
                    <span className="text-badge px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold shadow-sm animate-pulse">
                      HOT
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-lg sm:text-xl lg:text-2xl tracking-tight">Đấu trường 1:1</h3>
                  <p className="text-white/85 text-sm sm:text-base mt-0.5 sm:mt-1">
                    Nối từ • Đấu nghĩa • Thắng = +1,000đ!
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:flex flex-col items-end mr-2">
                  <span className="text-card-caption text-white/80 font-medium">2 trò chơi</span>
                  <span className="text-badge text-yellow-300 font-semibold">Thắng lấy điểm!</span>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/35 transition-colors shadow-lg">
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* TOPIK Learning Hub Banner - NEW */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            onClick={() => navigate("/learning-hub")}
            className="relative overflow-hidden rounded-2xl cursor-pointer group"
          >
            {/* Elegant gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-korean-purple via-korean-pink to-korean-orange" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/20" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(255,255,255,0.2),transparent_30%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_80%,rgba(255,107,107,0.2),transparent_30%)]" />
            
            {/* Animated particles */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/30 rounded-full animate-pulse" />
              <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
              <div className="absolute bottom-1/3 left-1/2 w-1 h-1 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
            
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            
            <div className="relative z-10 p-6 flex items-center justify-between">
              <div className="flex items-center gap-5">
                {/* Icon cluster */}
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-lg group-hover:scale-105 transition-transform">
                    <GraduationCap className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center border-2 border-white/50 shadow-md">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-badge px-3 py-1 rounded-full bg-white/25 text-white font-bold backdrop-blur-sm">
                      🎯 All-in-One
                    </span>
                    <span className="text-badge px-2.5 py-1 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold shadow-sm">
                      NEW
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-card-title-lg sm:text-2xl tracking-tight">Trung tâm học TOPIK</h3>
                  <p className="text-white/85 text-card-body sm:text-lg mt-1">
                    Từ vựng • Ngữ pháp • Nghe • Đọc • Viết
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end mr-2">
                  <span className="text-card-caption text-white/80 font-medium">6 bài học</span>
                  <span className="text-badge text-white/60">Học cùng AI</span>
                </div>
                <div className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/35 transition-colors shadow-lg">
                  <ChevronRight className="w-6 h-6 text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Game Hub Banner - NEW */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            onClick={() => navigate("/game-hub")}
            className="relative overflow-hidden rounded-2xl cursor-pointer group"
          >
            {/* Elegant gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-korean-orange via-pink-500 to-purple-600" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/20" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(255,255,255,0.2),transparent_30%)]" />
            
            {/* Animated particles */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/30 rounded-full animate-pulse" />
              <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
            </div>
            
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            
            <div className="relative z-10 p-6 flex items-center justify-between">
              <div className="flex items-center gap-5">
                {/* Icon cluster */}
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-lg group-hover:scale-105 transition-transform">
                    <Gamepad2 className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center border-2 border-white/50 shadow-md">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-badge px-3 py-1 rounded-full bg-white/25 text-white font-bold backdrop-blur-sm">
                      🎮 Game
                    </span>
                    <span className="text-badge px-2.5 py-1 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold shadow-sm">
                      HOT
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-card-title-lg sm:text-2xl tracking-tight">Trung tâm Game</h3>
                  <p className="text-white/85 text-card-body sm:text-lg mt-1">
                    7 trò chơi học tiếng Hàn thú vị
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end mr-2">
                  <span className="text-card-caption text-white/80 font-medium">7 games</span>
                  <span className="text-badge text-white/60">Học mà chơi</span>
                </div>
                <div className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/35 transition-colors shadow-lg">
                  <ChevronRight className="w-6 h-6 text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Korea Career Hub Banner */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
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
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-badge px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold shadow-md">
                      ⭐ All-in-One
                    </span>
                    <span className="text-badge px-2.5 py-1 rounded-full bg-white/20 text-white font-medium backdrop-blur-sm">
                      한국 취업
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-card-title-lg sm:text-xl tracking-tight">Korea Career Hub</h3>
                  <p className="text-white/80 text-card-body sm:text-base mt-1">
                    Headhunting • Báo cáo DN • Phỏng vấn AI - Tất cả trong một!
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col items-end mr-2">
                  <span className="text-badge text-white/60">1,000+ 취업 성공</span>
                  <span className="text-badge text-white/60">98% 만족도</span>
                </div>
                <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <ChevronRight className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* AI Chat Banner */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            onClick={() => navigate("/ai-chat")}
            className="relative overflow-hidden rounded-2xl cursor-pointer group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent)]" />
            <div className="relative z-10 p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                  <MessageCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-badge px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold">RAG AI</span>
                  </div>
                  <h3 className="font-bold text-white text-card-title-lg">LUKATO Q&A Agent</h3>
                  <p className="text-white/70 text-card-body mt-0.5">Hỏi trực tiếp các mô hình Premium với Q&A Agent hiệu suất cao nhất!</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-white/70 group-hover:translate-x-1 transition-transform" />
            </div>
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
