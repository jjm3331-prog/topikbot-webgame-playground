import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ChevronLeft, 
  User, 
  Mail, 
  Calendar, 
  Edit3, 
  Save, 
  Users, 
  Copy, 
  Share2,
  Target,
  Zap,
  CalendarDays,
  Percent,
  Flame,
  Crown,
  GraduationCap,
  Check,
  Lock,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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
  created_at: string;
}

interface UserData {
  email: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [referralCode, setReferralCode] = useState("");
  
  // Password change states
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      setUserData({ email: session.user.email || "" });

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      } else {
        setProfile(data);
        setNewUsername(data.username);
        // Generate referral code from user id
        setReferralCode(session.user.id.substring(0, 8).toUpperCase());
      }
      setLoading(false);
    };

    fetchProfile();
  }, [navigate]);

  const handleSaveUsername = async () => {
    if (!profile || !newUsername.trim()) return;
    
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: newUsername.trim() })
      .eq("id", profile.id);

    if (error) {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật biệt danh. Vui lòng thử lại.",
        variant: "destructive",
      });
    } else {
      setProfile(prev => prev ? { ...prev, username: newUsername.trim() } : null);
      toast({
        title: "Thành công",
        description: "Đã cập nhật biệt danh!",
      });
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập mật khẩu mới.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu mới không khớp.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu phải có ít nhất 6 ký tự.",
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
        title: "Lỗi",
        description: error.message || "Không thể đổi mật khẩu. Vui lòng thử lại.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Thành công",
        description: "Đã đổi mật khẩu thành công!",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
    }
    setChangingPassword(false);
  };

  const handleCopyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast({
      title: "Đã sao chép",
      description: "Mã giới thiệu đã được sao chép!",
    });
  };

  const handleShareReferralLink = () => {
    const shareUrl = `${window.location.origin}?ref=${referralCode}`;
    if (navigator.share) {
      navigator.share({
        title: "LUKATO AI - Học tiếng Hàn",
        text: "Cùng học tiếng Hàn với tôi trên LUKATO AI!",
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Đã sao chép link",
        description: "Link giới thiệu đã được sao chép!",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "numeric",
      month: "numeric",
      year: "numeric"
    });
  };

  // Calculate level based on points - aligned with pointsPolicy.ts
  const getLevel = (points: number) => {
    if (points >= 10000) return { name: "Đại học Quốc gia", nameKo: "국립대학", color: "text-korean-purple" };
    if (points >= 5000) return { name: "Đại học Địa phương", nameKo: "지역대학", color: "text-korean-orange" };
    if (points >= 2000) return { name: "Cao đẳng", nameKo: "고급", color: "text-korean-cyan" };
    if (points >= 500) return { name: "Trung cấp", nameKo: "중급", color: "text-korean-green" };
    return { name: "Sơ cấp", nameKo: "초급", color: "text-muted-foreground" };
  };

  const getNextLevelPoints = (points: number) => {
    if (points >= 10000) return 10000;
    if (points >= 5000) return 10000;
    if (points >= 2000) return 5000;
    if (points >= 500) return 2000;
    return 500;
  };

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

  const level = getLevel(profile?.points || 0);
  const nextLevelPoints = getNextLevelPoints(profile?.points || 0);
  const progressPercent = ((profile?.points || 0) / nextLevelPoints) * 100;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <MegaMenu />

      <main className="flex-1 pt-20 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-primary hover:text-primary/80 mb-6"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Quay lại</span>
          </motion.button>

          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-2xl font-bold text-foreground">Hồ sơ của tôi</h1>
            <p className="text-muted-foreground text-sm">Quản lý thông tin cá nhân</p>
          </motion.div>

          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-6 mb-6"
          >
            {/* User Info */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-korean-orange flex items-center justify-center text-primary-foreground font-bold text-xl">
                {profile?.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{profile?.username}</h2>
                <p className={`text-sm font-medium ${level.color}`}>
                  <GraduationCap className="w-4 h-4 inline mr-1" />
                  {level.name}
                </p>
              </div>
            </div>

            {/* Points Display */}
            <div className="bg-gradient-to-r from-korean-blue/20 to-korean-cyan/20 rounded-xl p-4 mb-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Tổng điểm</p>
              <p className="text-4xl font-bold text-korean-orange">
                {(profile?.points || 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">điểm</p>
            </div>

            {/* Level Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  Tiến độ lên cấp
                </span>
                <span className={`font-medium ${level.color}`}>
                  <GraduationCap className="w-4 h-4 inline mr-1" />
                  {level.name}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2 mb-2" />
              <p className="text-xs text-center text-muted-foreground">
                Còn {(nextLevelPoints - (profile?.points || 0)).toLocaleString()} điểm nữa để lên cấp
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { icon: Zap, value: profile?.points || 0, label: "Tuần này", color: "text-korean-orange" },
                { icon: CalendarDays, value: profile?.points || 0, label: "Tháng này", color: "text-muted-foreground" },
                { icon: Percent, value: "22%", label: "Độ chính xác", color: "text-korean-green" },
                { icon: Flame, value: 4, label: "Streak cao nhất", color: "text-korean-orange" },
              ].map((stat, idx) => (
                <div key={idx} className="text-center">
                  <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
                  <p className="text-lg font-bold text-foreground">
                    {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Quiz Stats */}
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tổng câu hỏi đã làm:</span>
                <span className="font-medium text-foreground">250 câu</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Câu trả lời đúng:</span>
                <span className="font-medium text-korean-green">55 câu</span>
              </div>
            </div>
          </motion.div>

          {/* Edit Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-2xl p-6 mb-6"
          >
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <Edit3 className="w-4 h-4" />
              Chỉnh sửa hồ sơ
            </h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-sm text-muted-foreground">
                  Biệt danh
                </Label>
                <Input
                  id="username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="mt-1"
                  placeholder="Nhập biệt danh..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tên này sẽ hiển thị trên bảng xếp hạng
                </p>
              </div>

              <Button
                onClick={handleSaveUsername}
                disabled={saving || newUsername === profile?.username}
                className="w-full bg-korean-blue hover:bg-korean-blue/90 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
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
              Thông tin tài khoản
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Email:</span>
                <span className="text-sm font-medium text-foreground">{userData?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ngày tạo:</span>
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
                  Đổi mật khẩu
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
                    <Label className="text-sm text-muted-foreground">Mật khẩu mới</Label>
                    <div className="relative mt-1">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nhập mật khẩu mới..."
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
                    <Label className="text-sm text-muted-foreground">Xác nhận mật khẩu mới</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới..."
                      className="mt-1"
                    />
                  </div>

                  <Button
                    onClick={handleChangePassword}
                    disabled={changingPassword || !newPassword || !confirmPassword}
                    className="w-full"
                  >
                    {changingPassword ? "Đang xử lý..." : "Xác nhận đổi mật khẩu"}
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Invite Friends Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl p-6 mb-6 border-korean-orange/30"
          >
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-korean-orange" />
              Mời bạn bè
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Mời bạn bè tham gia và nhận <span className="text-korean-orange font-bold">500 điểm</span> cho mỗi người! 
              Bạn bè của bạn cũng nhận <span className="text-korean-green font-bold">200 điểm</span>.
            </p>

            <div className="mb-4">
              <Label className="text-xs text-muted-foreground">Mã giới thiệu của bạn</Label>
              <div className="flex gap-2 mt-1">
                <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-lg font-bold text-korean-orange">
                  {referralCode}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyReferralCode}
                  className="shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Button
              onClick={handleShareReferralLink}
              className="w-full bg-korean-orange hover:bg-korean-orange/90 text-white"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Chia sẻ link mời
            </Button>

            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
              <div className="text-center">
                <Users className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xl font-bold text-foreground">0</p>
                <p className="text-xs text-muted-foreground">Tổng mời</p>
              </div>
              <div className="text-center">
                <Crown className="w-5 h-5 mx-auto mb-1 text-korean-orange" />
                <p className="text-xl font-bold text-foreground">30</p>
                <p className="text-xs text-muted-foreground">Còn lại tháng này</p>
              </div>
            </div>
          </motion.div>

          {/* Weekly Goals Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card rounded-2xl p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-korean-orange" />
                <div>
                  <h3 className="font-semibold text-foreground">Mục tiêu tuần này</h3>
                  <p className="text-xs text-muted-foreground">21/12 - 27/12 • 7 ngày còn lại</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Edit3 className="w-3 h-3 mr-1" />
                Đặt mục tiêu
              </Button>
            </div>

            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-muted-foreground" />
              </div>
              <h4 className="font-medium text-foreground mb-2">Chưa có mục tiêu tuần này</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Đặt mục tiêu học tập để theo dõi tiến độ và nhận{" "}
                <span className="text-korean-green font-bold">+500 điểm</span> khi hoàn thành!
              </p>
              <Button className="bg-korean-orange hover:bg-korean-orange/90 text-white">
                <Target className="w-4 h-4 mr-2" />
                Đặt mục tiêu ngay
              </Button>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;