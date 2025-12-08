import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Heart, 
  Coins, 
  Target, 
  MapPin, 
  Dice6, 
  Trophy, 
  Briefcase, 
  Link2, 
  MessageSquare,
  Zap,
  ExternalLink,
  Film,
  Music,
  Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";

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
  const [customLocation, setCustomLocation] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Fetch profile
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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleStartSurvival = () => {
    toast({
      title: "서울 생존 시작!",
      description: "AI가 시나리오를 생성중입니다... / AI đang tạo kịch bản...",
    });
    navigate("/chat");
  };

  const handleCustomLocation = () => {
    if (customLocation.trim()) {
      toast({
        title: `${customLocation}에서 시작합니다!`,
        description: `Bắt đầu tại ${customLocation}`,
      });
      navigate("/chat", { state: { location: customLocation } });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-[#1a1a2e] to-[#0f0f23] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src="/favicon.png" alt="LUKATO" className="w-16 h-16 rounded-full animate-pulse" />
          <div className="text-white/60 text-sm">로딩중... / Đang tải...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f23] flex flex-col overflow-hidden">
      {/* Header */}
      <AppHeader 
        username={profile?.username}
        title="메인 메뉴"
        titleVi="Menu chính"
      />

      {/* Stats Bar */}
      <div className="px-3 py-2 shrink-0">
        <div className="glass-card p-3 rounded-xl grid grid-cols-4 gap-2">
          <div className="flex flex-col items-center gap-0.5">
            <Heart className="w-4 h-4 text-red-500" />
            <div className="flex items-center gap-1">
              <span className="text-white font-bold text-xs">{profile?.hp}</span>
              <div className="w-8 h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all"
                  style={{ width: `${profile?.hp}%` }}
                />
              </div>
            </div>
            <p className="text-[9px] text-white/40">HP / Máu</p>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="text-white font-bold text-xs">₩{profile?.money?.toLocaleString()}</span>
            <p className="text-[9px] text-white/40">소지금 / Tiền</p>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Target className="w-4 h-4 text-green-500" />
            <span className="text-white font-bold text-xs">{profile?.missions_completed}</span>
            <p className="text-[9px] text-white/40">미션 / NV</p>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Star className="w-4 h-4 text-neon-cyan" />
            <span className="text-white font-bold text-xs">{profile?.points?.toLocaleString()}</span>
            <p className="text-[9px] text-white/40">포인트 / Điểm</p>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 px-3 pb-2 space-y-3 overflow-y-auto">
        {/* Location Selection */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-3 rounded-xl">
            <div className="flex items-center gap-1.5 mb-2">
              <MapPin className="w-4 h-4 text-red-400" />
              <h3 className="text-white font-bold text-xs">장소 선택</h3>
            </div>
            <p className="text-white/50 text-[10px] mb-2 leading-tight">
              원하는 장소 입력<br/>
              <span className="text-white/30">Nhập địa điểm</span>
            </p>
            <Input
              placeholder="예: 강남역..."
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 mb-2 h-8 text-xs"
            />
            <Button 
              variant="outline" 
              size="sm"
              className="w-full h-8 border-white/20 text-white hover:bg-white/10 text-[10px]"
              onClick={handleCustomLocation}
            >
              시작 / Bắt đầu
            </Button>
          </div>

          <div className="glass-card p-3 rounded-xl flex flex-col items-center justify-center text-center">
            <Dice6 className="w-8 h-8 text-neon-cyan mb-1" />
            <h3 className="text-white font-bold text-xs">서울에서 생존</h3>
            <p className="text-white/50 text-[10px]">Sinh tồn tại Seoul</p>
            <Button 
              size="sm"
              className="mt-2 h-8 bg-gradient-to-r from-neon-pink to-neon-purple hover:opacity-90 text-[10px] px-3"
              onClick={handleStartSurvival}
            >
              10턴 도전! / Thử thách!
            </Button>
          </div>
        </div>

        {/* External Links */}
        <div className="grid grid-cols-2 gap-2">
          <a href="https://hanoi.topikbot.kr" target="_blank" rel="noopener noreferrer" className="block">
            <Button className="w-full h-10 bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 text-[10px] font-bold flex flex-col gap-0 py-1">
              <div className="flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                <span>Hanoi 공식</span>
              </div>
              <span className="text-[8px] opacity-70">Trang chính thức</span>
            </Button>
          </a>
          <a href="https://chat-topikbot.kr" target="_blank" rel="noopener noreferrer" className="block">
            <Button className="w-full h-10 bg-gradient-to-r from-violet-500 to-purple-500 hover:opacity-90 text-[10px] font-bold flex flex-col gap-0 py-1">
              <div className="flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                <span>LUKATO AI</span>
              </div>
              <span className="text-[8px] opacity-70">Dịch vụ AI</span>
            </Button>
          </a>
        </div>

        {/* Game Buttons Grid */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            className="h-11 bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-[11px] font-bold flex flex-col gap-0 py-1"
            onClick={() => navigate("/ranking")}
          >
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4" />
              <span>랭킹</span>
            </div>
            <span className="text-[9px] opacity-70">Xếp hạng</span>
          </Button>
          <Button 
            className="h-11 bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90 text-[11px] font-bold flex flex-col gap-0 py-1"
            onClick={() => navigate("/dating")}
          >
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span>Love Signal</span>
            </div>
            <span className="text-[9px] opacity-70">Tín hiệu tình yêu</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button 
            className="h-11 bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 text-[11px] font-bold flex flex-col gap-0 py-1"
            onClick={() => navigate("/bankruptcy")}
          >
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4" />
              <span>파산 복구</span>
            </div>
            <span className="text-[9px] opacity-70">Phục hồi phá sản</span>
          </Button>
          <Button 
            className="h-11 bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:opacity-90 text-[11px] font-bold flex flex-col gap-0 py-1"
            onClick={() => navigate("/parttime")}
          >
            <div className="flex items-center gap-1">
              <Briefcase className="w-4 h-4" />
              <span>아르바이트</span>
            </div>
            <span className="text-[9px] opacity-70">Làm thêm</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button 
            className="h-11 bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 text-[11px] font-bold flex flex-col gap-0 py-1"
            onClick={() => navigate("/wordchain")}
          >
            <div className="flex items-center gap-1">
              <Link2 className="w-4 h-4" />
              <span>끝말잇기</span>
            </div>
            <span className="text-[9px] opacity-70">Nối từ</span>
          </Button>
          <Button 
            className="h-11 bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-90 text-[11px] font-bold flex flex-col gap-0 py-1"
            onClick={() => navigate("/quiz")}
          >
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span>관용어 퀴즈</span>
            </div>
            <span className="text-[9px] opacity-70">Quiz thành ngữ</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button 
            className="h-11 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-[11px] font-bold flex flex-col gap-0 py-1"
            onClick={() => navigate("/kdrama")}
          >
            <div className="flex items-center gap-1">
              <Film className="w-4 h-4" />
              <span>K-Drama 더빙</span>
            </div>
            <span className="text-[9px] opacity-70">Lồng tiếng</span>
          </Button>
          <Button 
            className="h-11 bg-gradient-to-r from-rose-500 to-red-500 hover:opacity-90 text-[11px] font-bold flex flex-col gap-0 py-1"
            onClick={() => navigate("/kpop")}
          >
            <div className="flex items-center gap-1">
              <Music className="w-4 h-4" />
              <span>K-POP 가사</span>
            </div>
            <span className="text-[9px] opacity-70">Lời bài hát</span>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <AppFooter compact />
    </div>
  );
};

export default Game;
