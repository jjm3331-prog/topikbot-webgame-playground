import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Heart, 
  Coins, 
  Target, 
  Star,
  Send,
  Crown,
  Sparkles,
  MessageCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";

interface Profile {
  id: string;
  username: string;
  hp: number;
  money: number;
  missions_completed: number;
  total_missions: number;
  points: number;
}

const Game = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [newReview, setNewReview] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmitReview = async () => {
    if (!newReview.trim()) {
      toast({ title: "후기 내용을 입력해주세요", description: "Vui lòng nhập nội dung đánh giá", variant: "destructive" });
      return;
    }
    if (newReview.trim().length > 200) {
      toast({ title: "200자 이내로 작성해주세요", description: "Tối đa 200 ký tự", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      user_id: isAnonymous ? null : profile?.id,
      content: newReview.trim(),
      rating: newRating
    });

    if (error) {
      toast({ title: "후기 등록 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "후기가 등록되었습니다!", description: "감사합니다 / Cảm ơn bạn!" });
      setNewReview("");
      setNewRating(5);
      setIsAnonymous(false);
    }
    setIsSubmitting(false);
  };

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
    <div className="min-h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <AppHeader 
        username={profile?.username}
        title="메인 메뉴"
        titleVi="Menu chính"
        userStats={profile ? {
          hp: profile.hp,
          money: profile.money,
          points: profile.points,
          missions_completed: profile.missions_completed
        } : null}
      />

      {/* Stats Bar - Premium Design */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-4 py-3 shrink-0"
      >
        <div className="glass-card p-4 rounded-2xl border border-border/50 shadow-lg">
          <div className="grid grid-cols-4 gap-3">
            {/* HP */}
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-6 h-6 rounded-lg bg-destructive/20 flex items-center justify-center">
                  <Heart className="w-3.5 h-3.5 text-destructive" />
                </div>
                <span className="text-base font-bold text-foreground">{profile?.hp}</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${profile?.hp}%` }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="h-full bg-gradient-to-r from-destructive via-destructive/80 to-red-400 rounded-full"
                  style={{ boxShadow: '0 0 10px hsl(var(--destructive) / 0.5)' }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">HP</p>
            </div>
            
            {/* Money */}
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-6 h-6 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Coins className="w-3.5 h-3.5 text-accent" />
                </div>
              </div>
              <p className="text-sm font-bold text-foreground">₩{profile?.money?.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">소지금 / Tiền</p>
            </div>
            
            {/* Missions */}
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-6 h-6 rounded-lg bg-neon-green/20 flex items-center justify-center">
                  <Target className="w-3.5 h-3.5 text-neon-green" />
                </div>
              </div>
              <p className="text-sm font-bold text-foreground">{profile?.missions_completed}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">미션 / Nhiệm vụ</p>
            </div>
            
            {/* Points */}
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-6 h-6 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <Star className="w-3.5 h-3.5 text-secondary" />
                </div>
              </div>
              <p className="text-sm font-bold text-foreground">{profile?.points?.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">포인트 / Điểm</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 px-4 pb-4 space-y-4 overflow-y-auto">

        {/* NEW Game Featured Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-indigo-500/20 border border-primary/30 p-5"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-500/30 to-purple-500/30 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-500/30 to-pink-500/30 blur-2xl" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-pink-500 to-purple-500 text-white animate-pulse">
                🔥 NEW RELEASE
              </span>
            </div>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500/30 to-purple-500/30 flex items-center justify-center border border-primary/30">
                <Crown className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">LUKATO 매니저</h3>
                <p className="text-xs text-muted-foreground">LUKATO Manager Simulation</p>
              </div>
            </div>
            
            <p className="text-sm text-foreground/80 mb-4 leading-relaxed">
              🎤 K-POP 아이돌 그룹의 매니저가 되어 스타로 키워보세요!
              <br />
              <span className="text-muted-foreground text-xs">Trở thành quản lý và đào tạo nhóm nhạc K-POP!</span>
            </p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2 py-1 rounded-full text-[10px] bg-muted/50 text-foreground">🎭 스토리 RPG / Story RPG</span>
              <span className="px-2 py-1 rounded-full text-[10px] bg-muted/50 text-foreground">🎙️ 음성 대화 / Hội thoại</span>
              <span className="px-2 py-1 rounded-full text-[10px] bg-muted/50 text-foreground">📈 성장 시뮬 / Mô phỏng</span>
            </div>
            
            <Button 
              onClick={() => navigate("/manager")}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              지금 시작하기 / Bắt đầu ngay
            </Button>
          </div>
        </motion.div>

        {/* Info Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <h2 className="font-bold text-foreground text-sm flex items-center gap-2">
            📢 공지사항
            <span className="text-[10px] text-muted-foreground font-normal">Thông báo</span>
          </h2>
          
          <div className="glass-card p-4 rounded-xl space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">시즌 1 업데이트 완료! / Cập nhật Mùa 1!</p>
                <p className="text-xs text-muted-foreground mt-1">LUKATO 매니저 챕터 1~12 추가! / Đã thêm Chapter 1~12 LUKATO Manager!</p>
              </div>
            </div>
            
            <div className="h-px bg-border" />
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">신규 유저 환영 보너스 / Thưởng chào mừng</p>
                <p className="text-xs text-muted-foreground mt-1">매일 첫 접속시 보너스 포인트! / Nhận điểm thưởng hàng ngày!</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Review Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <h2 className="font-bold text-foreground text-sm flex items-center gap-2">
            💬 후기 남기기
            <span className="text-[10px] text-muted-foreground font-normal">Để lại đánh giá</span>
          </h2>
          
          <div className="glass-card p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">평점 / Đánh giá:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setNewRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star 
                      className={`w-5 h-5 ${star <= newRating ? "text-accent fill-accent" : "text-muted-foreground"}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            
            <Textarea
              placeholder="게임 후기를 작성해주세요 (200자 이내) / Viết đánh giá game (tối đa 200 ký tự)"
              value={newReview}
              onChange={(e) => setNewReview(e.target.value)}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground text-sm resize-none h-20"
            />
            
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-border"
                />
                익명 / Ẩn danh
              </label>
              
              <Button 
                size="sm"
                onClick={handleSubmitReview}
                disabled={isSubmitting || !newReview.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                등록 / Gửi
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <Footer />

      {/* LUKATO AI Floating Button */}
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

export default Game;
