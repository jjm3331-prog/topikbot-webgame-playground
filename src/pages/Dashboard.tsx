import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Auth check disabled for testing - allow access without login
      if (!session) {
        setLoading(false);
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
      // Auth check disabled for testing - no redirect on logout
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
        title: t('dashboard.checkInSuccess'),
        description: `+${bonusAmount} ${t('dashboard.points')}! ${t('dashboard.streak')}: ${newStreak} ${t('dashboard.days')}`,
      });
      
    } catch (error) {
      console.error("Error checking in:", error);
      toast({
        title: t('dashboard.error'),
        description: t('dashboard.checkInError'),
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
          <div className="text-muted-foreground text-sm">{t('dashboard.loading')}</div>
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
                  {t('dashboard.welcome', { name: profile?.username || 'User' })}
                </h1>
                <p className="text-body text-muted-foreground mt-1">{t('dashboard.whatToLearn')}</p>
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
                    <p className="text-card-caption text-muted-foreground">{t('dashboard.totalPoints')}</p>
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
                      {t('dashboard.pointsToNextLevel', { points: (levelInfo.nextLevelPoints - (profile?.points || 0)).toLocaleString() })}
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
                      +{bonusPoints} {t('dashboard.points')}!
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
                      <p className="text-card-caption text-muted-foreground">{t('dashboard.dailyCheckIn')}</p>
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-korean-orange" />
                        <span className="text-lg font-bold text-foreground">{profile?.current_streak || 0} {t('dashboard.days')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-korean-orange" />
                    <span className="text-card-caption text-muted-foreground">
                      {t('dashboard.record')}: {profile?.longest_streak || 0} {t('dashboard.days')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Gift className="w-4 h-4 text-korean-purple" />
                    <span className="text-card-caption text-muted-foreground">
                      +{POINTS_CONFIG.DAILY_CHECKIN}{t('dashboard.perDay')}
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
                      {t('dashboard.processing')}
                    </div>
                  ) : canCheckIn ? (
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      {t('dashboard.checkInNow')}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      {t('dashboard.alreadyCheckedIn')}
                    </div>
                  )}
                </Button>

                {/* 7-day streak bonus hint */}
                {canCheckIn && profile && (profile.current_streak + 1) % 7 === 0 && (
                  <p className="text-center text-badge text-korean-green mt-2">
                    🎁 {t('dashboard.weeklyBonusHint')}
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Feature Banners Grid - 2 columns */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.11 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
          >
            {/* Video Learning Banner */}
            <motion.div 
              onClick={() => navigate("/video-hub")}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="relative overflow-hidden rounded-2xl cursor-pointer group h-[110px] sm:h-[140px] shadow-lg hover:shadow-xl hover:shadow-cyan-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-blue-500 to-violet-600 group-hover:from-cyan-400 group-hover:via-blue-400 group-hover:to-violet-500 transition-all duration-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_60%)]" />
              
              <div className="relative z-10 p-3 sm:p-4 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 group-hover:scale-110 group-hover:bg-white/30 transition-all duration-300">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                        <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-white/25 text-white font-bold">7개국어 자막</span>
                        <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full bg-cyan-400 text-white font-bold">NEW</span>
                      </div>
                      <h3 className="font-bold text-white text-sm sm:text-lg">비디오 학습</h3>
                    </div>
                  </div>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/25 transition-all duration-300">
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                <p className="text-white/80 text-[11px] sm:text-sm line-clamp-1">YouTube 영상으로 자연스럽게 한국어 학습</p>
              </div>
            </motion.div>

            {/* Mock Exam Banner */}
            <motion.div 
              onClick={() => navigate("/mock-exam")}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="relative overflow-hidden rounded-2xl cursor-pointer group h-[110px] sm:h-[140px] shadow-lg hover:shadow-xl hover:shadow-emerald-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 group-hover:from-emerald-400 group-hover:via-teal-400 group-hover:to-cyan-500 transition-all duration-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_60%)]" />
              
              <div className="relative z-10 p-3 sm:p-4 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 group-hover:scale-110 group-hover:bg-white/30 transition-all duration-300">
                      <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                        <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-white/25 text-white font-bold">TOPIK I·II·EPS</span>
                        <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold">NEW</span>
                      </div>
                      <h3 className="font-bold text-white text-sm sm:text-lg">TOPIK 모의고사</h3>
                    </div>
                  </div>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/25 transition-all duration-300">
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                <p className="text-white/80 text-[11px] sm:text-sm line-clamp-1">실전과 100% 동일한 AI 생성 문제로 완벽 대비</p>
              </div>
            </motion.div>

            {/* Battle Arena Banner */}
            <motion.div 
              onClick={() => navigate("/battle")}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="relative overflow-hidden rounded-2xl cursor-pointer group h-[110px] sm:h-[140px] shadow-lg hover:shadow-xl hover:shadow-orange-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-600 via-orange-500 to-red-600 group-hover:from-yellow-500 group-hover:via-orange-400 group-hover:to-red-500 transition-all duration-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,0,0.15),transparent_60%)]" />
              
              <div className="relative z-10 p-3 sm:p-4 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 animate-heartbeat group-hover:scale-110 group-hover:bg-white/30 transition-all duration-300">
                      <Swords className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                        <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-white/25 text-white font-bold">{t('dashboard.battle.realtime')}</span>
                        <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold animate-pulse">{t('dashboard.battle.hot')}</span>
                      </div>
                      <h3 className="font-bold text-white text-sm sm:text-lg">{t('dashboard.battle.title')}</h3>
                    </div>
                  </div>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/25 transition-all duration-300">
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                <p className="text-white/80 text-[11px] sm:text-sm line-clamp-1">{t('dashboard.battle.description')}</p>
              </div>
            </motion.div>

            {/* TOPIK Learning Hub Banner */}
            <motion.div 
              onClick={() => navigate("/learning-hub")}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="relative overflow-hidden rounded-2xl cursor-pointer group h-[110px] sm:h-[140px] shadow-lg hover:shadow-xl hover:shadow-pink-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-korean-purple via-korean-pink to-korean-orange group-hover:brightness-110 transition-all duration-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_60%)]" />
              
              <div className="relative z-10 p-3 sm:p-4 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 group-hover:scale-110 group-hover:bg-white/30 transition-all duration-300">
                      <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                        <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-white/25 text-white font-bold">{t('dashboard.topik.allInOne')}</span>
                        <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full bg-green-500 text-white font-bold">{t('dashboard.topik.new')}</span>
                      </div>
                      <h3 className="font-bold text-white text-sm sm:text-lg">{t('dashboard.topik.title')}</h3>
                    </div>
                  </div>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/25 transition-all duration-300">
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                <p className="text-white/80 text-[11px] sm:text-sm line-clamp-1">{t('dashboard.topik.description')}</p>
              </div>
            </motion.div>

            {/* Game Hub Banner */}
            <motion.div 
              onClick={() => navigate("/game-hub")}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="relative overflow-hidden rounded-2xl cursor-pointer group h-[110px] sm:h-[140px] shadow-lg hover:shadow-xl hover:shadow-purple-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-korean-orange via-pink-500 to-purple-600 group-hover:brightness-110 transition-all duration-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_60%)]" />
              
              <div className="relative z-10 p-3 sm:p-4 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 group-hover:scale-110 group-hover:bg-white/30 group-hover:rotate-6 transition-all duration-300">
                      <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                        <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-white/25 text-white font-bold">{t('dashboard.game.badge')}</span>
                        <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold">{t('dashboard.game.hot')}</span>
                      </div>
                      <h3 className="font-bold text-white text-sm sm:text-lg">{t('dashboard.game.title')}</h3>
                    </div>
                  </div>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/25 transition-all duration-300">
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                <p className="text-white/80 text-[11px] sm:text-sm line-clamp-1">{t('dashboard.game.description')}</p>
              </div>
            </motion.div>

            {/* Korea Career Hub Banner */}
            <motion.div 
              onClick={() => navigate("/korea-career")}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="relative overflow-hidden rounded-2xl cursor-pointer group h-[110px] sm:h-[140px] shadow-lg hover:shadow-xl hover:shadow-indigo-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 group-hover:brightness-110 transition-all duration-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_60%)]" />
              
              <div className="relative z-10 p-3 sm:p-4 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 group-hover:scale-110 group-hover:bg-white/30 transition-all duration-300">
                      <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                        <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold">{t('dashboard.career.allInOne')}</span>
                        <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full bg-white/20 text-white font-medium">{t('dashboard.career.koreaJob')}</span>
                      </div>
                      <h3 className="font-bold text-white text-sm sm:text-lg">{t('dashboard.career.title')}</h3>
                    </div>
                  </div>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/25 transition-all duration-300">
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                <p className="text-white/80 text-[11px] sm:text-sm line-clamp-1">{t('dashboard.career.description')}</p>
              </div>
            </motion.div>

            {/* AI Chat Banner - spans full width */}
            <motion.div 
              onClick={() => navigate("/ai-chat")}
              whileHover={{ scale: 1.01, y: -3 }}
              whileTap={{ scale: 0.99 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="relative overflow-hidden rounded-2xl cursor-pointer group h-[100px] sm:h-[120px] sm:col-span-2 shadow-lg hover:shadow-xl hover:shadow-amber-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 group-hover:from-amber-400 group-hover:via-orange-400 group-hover:to-rose-400 transition-all duration-500" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.2),transparent)]" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.15),transparent_60%)]" />
              
              <div className="relative z-10 p-3 sm:p-4 h-full flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-white/30 transition-all duration-300">
                    <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
                      <span className="text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold">{t('dashboard.ai.badge')}</span>
                    </div>
                    <h3 className="font-bold text-white text-base sm:text-xl">{t('dashboard.ai.title')}</h3>
                    <p className="text-white/70 text-[11px] sm:text-sm mt-0.5">{t('dashboard.ai.description')}</p>
                  </div>
                </div>
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/15 flex items-center justify-center group-hover:bg-white/30 transition-all duration-300">
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.div>
          </motion.div>


        </div>

        {/* AI Floating Button */}
        <div
          onClick={() => navigate('/ai-chat')}
          className="fixed bottom-24 right-4 z-50 cursor-pointer"
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
        </div>
      </main>
      <AppFooter />
    </div>
  );
};

export default Dashboard;
