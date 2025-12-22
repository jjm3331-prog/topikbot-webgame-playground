import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { useSubscription } from "@/hooks/useSubscription";

interface Profile {
  id: string;
  username: string;
  created_at: string;
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
        .select("id, username, created_at")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      } else {
        setProfile(data);
        setNewUsername(data.username);
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
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
    }
    setChangingPassword(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn file hình ảnh.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Lỗi",
        description: "File quá lớn. Vui lòng chọn file dưới 5MB.",
        variant: "destructive",
      });
      return;
    }
    
    setUploadingAvatar(true);
    
    try {
      // Create a local URL for the image
      const imageUrl = URL.createObjectURL(file);
      setAvatarUrl(imageUrl);
      
      toast({
        title: "Thành công",
        description: "Đã cập nhật ảnh đại diện!",
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải ảnh lên. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "numeric",
      month: "numeric",
      year: "numeric"
    });
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
            <span>Quay lại</span>
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
                  <h3 className="font-bold text-white text-sm sm:text-base">📲 Cài đặt ứng dụng LUKATO</h3>
                  <p className="text-white/80 text-xs sm:text-sm">Thêm vào màn hình chính để sử dụng như app thực thụ!</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <Download className="w-4 h-4 text-white" />
                  <span className="text-white text-xs font-medium">Miễn phí</span>
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
                        <h3 className="font-bold text-white text-base sm:text-lg">👑 PREMIUM MEMBER</h3>
                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold text-white uppercase">Active</span>
                      </div>
                      <p className="text-white/90 text-xs sm:text-sm">
                        {subscription?.expiresAt 
                          ? `Hết hạn: ${new Date(subscription.expiresAt).toLocaleDateString("vi-VN")}`
                          : "Vĩnh viễn - Cảm ơn bạn đã hỗ trợ!"}
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
                        <h3 className="font-bold text-white text-base sm:text-lg">⭐ PLUS MEMBER</h3>
                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold text-white uppercase">Active</span>
                      </div>
                      <p className="text-white/90 text-xs sm:text-sm">
                        {subscription?.expiresAt 
                          ? `Hết hạn: ${new Date(subscription.expiresAt).toLocaleDateString("vi-VN")}`
                          : "Đang hoạt động"}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate("/pricing")}
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                  >
                    Nâng cấp
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
                      <h3 className="font-bold text-white text-base sm:text-lg">🆓 Gói Miễn phí</h3>
                      <p className="text-white/70 text-xs sm:text-sm">Nâng cấp Premium để mở khóa tất cả tính năng!</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:block text-xs text-yellow-400 font-medium">Nâng cấp ngay</span>
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
              <div>
                <h2 className="text-xl font-bold text-foreground">{profile?.username}</h2>
                <p className="text-sm text-muted-foreground">
                  {isPremium ? "👑 Premium Member" : isPlus ? "⭐ Plus Member" : "Thành viên"}
                </p>
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
                  Tên này sẽ hiển thị trong ứng dụng
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
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default Profile;