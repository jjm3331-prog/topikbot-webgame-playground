import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { 
  ChevronLeft, 
  User, 
  Mail, 
  Edit3, 
  Save, 
  Crown,
  Lock,
  Eye,
  EyeOff,
  Download,
  Smartphone,
  ArrowRight,
  Star,
  Sparkles,
  Camera,
  Trophy,
  Headphones,
  Notebook,
  HelpCircle,
  Swords,
  Target,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { useSubscription } from "@/hooks/useSubscription";
import { getGameStats, getRecentGameRecords, type GameStats, type GameRecord } from "@/lib/gameRecords";

interface Profile {
  id: string;
  username: string;
  created_at: string;
  points?: number;
}

interface UserData {
  email: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { subscription, isPremium, isPlus, isFree, loading: subscriptionLoading } = useSubscription();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  
  // Password change states
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Avatar states
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Game stats states
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [recentGames, setRecentGames] = useState<GameRecord[]>([]);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Auth check disabled for testing - allow access without login
      if (!session) {
        setLoading(false);
        return;
      }

      setUserData({ email: session.user.email || "" });

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, created_at, avatar_url, points")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      } else {
        setProfile(data);
        setNewUsername(data.username);
        if (data.avatar_url) {
          setAvatarUrl(data.avatar_url);
        }
        
        // Fetch game stats
        const stats = await getGameStats(session.user.id);
        setGameStats(stats);
        
        const records = await getRecentGameRecords(session.user.id, 5);
        setRecentGames(records);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [navigate]);

  const { t, i18n } = useTranslation();

  const handleSaveUsername = async () => {
    if (!profile || !newUsername.trim()) return;
    
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: newUsername.trim() })
      .eq("id", profile.id);

    if (error) {
      toast({
        title: t('profile.errorTitle'),
        description: t('profile.nicknameUpdateFailed'),
        variant: "destructive",
      });
    } else {
      setProfile(prev => prev ? { ...prev, username: newUsername.trim() } : null);
      toast({
        title: t('profile.successTitle'),
        description: t('profile.nicknameUpdated'),
      });
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: t('profile.errorTitle'),
        description: t('profile.enterNewPasswordError'),
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: t('profile.errorTitle'),
        description: t('profile.passwordMismatch'),
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: t('profile.errorTitle'),
        description: t('profile.passwordMinLength'),
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      toast({
        title: t('profile.errorTitle'),
        description: t('profile.passwordChangeFailed'),
        variant: "destructive",
      });
    } else {
      toast({
        title: t('profile.successTitle'),
        description: t('profile.passwordChanged'),
      });
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
    }
    setChangingPassword(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('profile.errorTitle'),
        description: t('profile.selectImage'),
        variant: "destructive",
      });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('profile.errorTitle'),
        description: t('profile.fileTooLarge'),
        variant: "destructive",
      });
      return;
    }
    
    setUploadingAvatar(true);
    
    try {
      // Create unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/avatar.${fileExt}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type 
        });
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      // Add cache buster to URL
      const avatarUrlWithCache = `${publicUrl}?t=${Date.now()}`;
      
      // Update profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrlWithCache })
        .eq('id', profile.id);
      
      if (updateError) {
        throw updateError;
      }
      
      setAvatarUrl(avatarUrlWithCache);
      
      toast({
        title: t('profile.successTitle'),
        description: t('profile.avatarUpdated'),
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: t('profile.errorTitle'),
        description: t('profile.avatarUploadFailed'),
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const formatDate = (dateString: string) => {
    const lang = (i18n.language || 'ko').split('-')[0];
    const localeMap: Record<string, string> = {
      ko: 'ko-KR',
      vi: 'vi-VN',
      en: 'en-US',
      ja: 'ja-JP',
      zh: 'zh-CN',
      ru: 'ru-RU',
      uz: 'uz-UZ',
    };

    return new Date(dateString).toLocaleDateString(localeMap[lang] || 'en-US', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src="/favicon.png" alt="LUKATO" className="w-16 h-16 rounded-full animate-pulse" />
          <div className="text-muted-foreground text-sm">{t('profile.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-primary hover:text-primary/80 mb-6"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>{t('profile.backToDashboard')}</span>
          </motion.button>

          {/* PWA Install Banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onClick={() => navigate("/pwa-guide")}
            className="relative overflow-hidden rounded-2xl mb-6 cursor-pointer group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-korean-blue via-korean-purple to-korean-orange opacity-90" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent)]" />
            <div className="relative p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">{t('profile.installApp')}</h3>
                  <p className="text-white/80 text-xs sm:text-sm">{t('profile.installDesc')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <Download className="w-4 h-4 text-white" />
                  <span className="text-white text-xs font-medium">{t('profile.free')}</span>
                </div>
                <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.div>

          {/* Premium Subscription Status Banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="relative overflow-hidden rounded-2xl mb-6"
          >
            {isPremium ? (
              <div className="relative bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 p-4">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.2),transparent)]" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <Crown className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-base sm:text-lg">{t('profile.premiumMember')}</h3>
                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold text-white uppercase">{t('profile.active')}</span>
                      </div>
                      <p className="text-white/90 text-xs sm:text-sm">
                        {subscription?.expiresAt 
                          ? `${t('profile.expiresAt')}: ${new Date(subscription.expiresAt).toLocaleDateString()}`
                          : t('profile.forever')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-5 h-5 text-white animate-pulse" />
                    <Star className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            ) : isPlus ? (
              <div className="relative bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 p-4">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.2),transparent)]" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-base sm:text-lg">{t('profile.plusMember')}</h3>
                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold text-white uppercase">{t('profile.active')}</span>
                      </div>
                      <p className="text-white/90 text-xs sm:text-sm">
                        {subscription?.expiresAt 
                          ? `${t('profile.expiresAt')}: ${new Date(subscription.expiresAt).toLocaleDateString()}`
                          : t('profile.inUse')}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate("/pricing")}
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                  >
                    {t('profile.upgrade')}
                  </Button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => navigate("/pricing")}
                className="relative bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 p-4 cursor-pointer group hover:from-gray-600 hover:to-gray-600 transition-all"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <Crown className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base sm:text-lg">{t('profile.freePlan')}</h3>
                      <p className="text-white/70 text-xs sm:text-sm">{t('profile.upgradeDesc')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:block text-xs text-yellow-400 font-medium">{t('profile.upgradeNow')}</span>
                    <ArrowRight className="w-5 h-5 text-yellow-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            )}
          </motion.div>

        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-bold text-foreground">{t('profile.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('profile.manageInfo')}</p>
        </motion.div>

          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-6 mb-6"
          >
            {/* User Info with Avatar Upload */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Profile" 
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary/20"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-korean-orange flex items-center justify-center text-primary-foreground font-bold text-2xl">
                    {profile?.username?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
                <label 
                  htmlFor="avatar-upload"
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Camera className="w-6 h-6 text-white" />
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
                {uploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground">{profile?.username}</h2>
                <p className="text-sm text-muted-foreground">
                  {isPremium ? t('profile.premiumMember') : isPlus ? t('profile.plusMember') : t('profile.member')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-korean-orange">{profile?.points?.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground">{t('profile.points')}</p>
              </div>
            </div>
          </motion.div>

          {/* Battle Stats Section */}
          {gameStats && gameStats.totalGames > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="glass-card rounded-2xl p-6 mb-6"
            >
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                <Swords className="w-4 h-4" />
                {t('profile.battleStats')}
              </h3>

              {/* Stats Overview */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="text-center p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <p className="text-2xl font-bold text-green-500">{gameStats.wins}</p>
                  <p className="text-xs text-muted-foreground">{t('profile.wins')}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-2xl font-bold text-red-500">{gameStats.losses}</p>
                  <p className="text-xs text-muted-foreground">{t('profile.losses')}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-2xl font-bold text-yellow-500">{gameStats.draws}</p>
                  <p className="text-xs text-muted-foreground">{t('profile.draws')}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="text-2xl font-bold text-primary">{gameStats.winRate}%</p>
                  <p className="text-xs text-muted-foreground">{t('profile.winRate')}</p>
                </div>
              </div>

              {/* Streak Stats */}
              {(gameStats.currentStreak > 0 || gameStats.maxStreak > 0) && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {gameStats.currentStreak > 0 && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20">
                      <span className="text-2xl">🔥</span>
                      <div>
                        <p className="text-lg font-bold text-orange-500">{gameStats.currentStreak}{t('battle.guide.consecutiveWins')}</p>
                        <p className="text-xs text-muted-foreground">{t('profile.currentStreak')}</p>
                      </div>
                    </div>
                  )}
                  {gameStats.maxStreak > 0 && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                      <Trophy className="w-6 h-6 text-purple-500" />
                      <div>
                        <p className="text-lg font-bold text-purple-500">{gameStats.maxStreak}{t('battle.guide.consecutiveWins')}</p>
                        <p className="text-xs text-muted-foreground">{t('profile.maxStreak')}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Recent Games */}
              {recentGames.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {t('profile.recentGames')}
                  </h4>
                  <div className="space-y-2">
                    {recentGames.map((game) => (
                      <div 
                        key={game.id}
                        className={`flex items-center justify-between p-2 rounded-lg border ${
                          game.result === 'win' 
                            ? 'bg-green-500/5 border-green-500/20' 
                            : game.result === 'lose'
                              ? 'bg-red-500/5 border-red-500/20'
                              : 'bg-yellow-500/5 border-yellow-500/20'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            game.result === 'win' 
                              ? 'bg-green-500/20 text-green-500' 
                              : game.result === 'lose'
                                ? 'bg-red-500/20 text-red-500'
                                : 'bg-yellow-500/20 text-yellow-500'
                          }`}>
                            {game.result === 'win' ? t('profile.win') : game.result === 'lose' ? t('profile.lose') : t('profile.draw')}
                          </span>
                          <span className="text-sm text-foreground">
                            vs {game.opponentName || t('profile.unknownPlayer')}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-foreground">
                            {game.myScore} - {game.opponentScore}
                          </span>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(game.playedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Quick Menu (under profile) */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card rounded-2xl p-6 mb-6"
            aria-label={t('profile.menu')}
          >
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <User className="w-4 h-4" />
              {t('profile.menu')}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Button variant="secondary" className="justify-start" onClick={() => navigate("/ranking")}
              >
                <Trophy className="w-4 h-4 mr-2" />
                {t('profile.rankingMenu')}
              </Button>

              <Button variant="secondary" className="justify-start" onClick={() => navigate("/points-system")}
              >
                <Star className="w-4 h-4 mr-2" />
                {t('profile.pointsReward')}
              </Button>

              <Button variant="secondary" className="justify-start" onClick={() => navigate("/pricing")}
              >
                <Crown className="w-4 h-4 mr-2" />
                {t('profile.pricingMenu')}
              </Button>

              <Button variant="secondary" className="justify-start" onClick={() => navigate("/help-center")}
              >
                <Headphones className="w-4 h-4 mr-2" />
                {t('profile.support')}
              </Button>

              <Button variant="secondary" className="justify-start" onClick={() => navigate("/terms")}
              >
                <Notebook className="w-4 h-4 mr-2" />
                {t('profile.termsMenu')}
              </Button>

              <Button variant="secondary" className="justify-start" onClick={() => navigate("/dashboard")}
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                {t('profile.overview')}
              </Button>
            </div>
          </motion.section>

          {/* Edit Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-2xl p-6 mb-6"
          >
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <Edit3 className="w-4 h-4" />
              {t('profile.editProfile')}
            </h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-sm text-muted-foreground">
                  {t('profile.nickname')}
                </Label>
                <Input
                  id="username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="mt-1"
                  placeholder={t('profile.enterNickname')}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('profile.nicknameHint')}
                </p>
              </div>

              <Button
                onClick={handleSaveUsername}
                disabled={saving || newUsername === profile?.username}
                className="w-full bg-korean-blue hover:bg-korean-blue/90 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? t('profile.saving') : t('profile.saveChanges')}
              </Button>
            </div>
          </motion.div>

          {/* Account Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-2xl p-6 mb-6"
          >
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <Mail className="w-4 h-4" />
              {t('profile.accountInfo')}
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('profile.email')}:</span>
                <span className="text-sm font-medium text-foreground">{userData?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('profile.createdDate')}:</span>
                <span className="text-sm font-medium text-foreground">
                  {profile?.created_at ? formatDate(profile.created_at) : "-"}
                </span>
              </div>
            </div>

            {/* Password Change */}
            <div className="mt-4 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  {t('profile.changePassword')}
                </span>
                <ChevronLeft className={`w-4 h-4 transition-transform ${showPasswordSection ? "rotate-90" : "-rotate-90"}`} />
              </Button>

              {showPasswordSection && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 space-y-3"
                >
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('profile.newPassword')}</Label>
                    <div className="relative mt-1">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t('profile.enterNewPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground">{t('profile.confirmNewPassword')}</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('profile.reenterNewPassword')}
                      className="mt-1"
                    />
                  </div>

                  <Button
                    onClick={handleChangePassword}
                    disabled={changingPassword || !newPassword || !confirmPassword}
                    className="w-full"
                  >
                    {changingPassword ? t('profile.processing') : t('profile.confirmPasswordChange')}
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default Profile;