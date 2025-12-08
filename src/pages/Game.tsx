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
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#0f0f23] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src="/favicon.png" alt="LUKATO" className="w-16 h-16 rounded-full animate-pulse" />
          <div className="text-white/60 text-sm">로딩중... / Đang tải...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f23] flex flex-col">
      {/* Header */}
      <AppHeader 
        username={profile?.username}
        title="메인 메뉴"
        titleVi="Menu chính"
      />

      {/* Stats Bar */}
      <div className="p-4">
        <div className="glass-card p-4 rounded-xl grid grid-cols-4 gap-3">
          <div className="flex flex-col items-center gap-1">
            <Heart className="w-5 h-5 text-red-500" />
            <div className="flex items-center gap-1">
              <span className="text-white font-bold text-sm">{profile?.hp}</span>
              <div className="w-10 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all"
                  style={{ width: `${profile?.hp}%` }}
                />
              </div>
            </div>
            <p className="text-[10px] text-white/40">HP</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Coins className="w-5 h-5 text-yellow-500" />
            <span className="text-white font-bold text-sm">₩{profile?.money?.toLocaleString()}</span>
            <p className="text-[10px] text-white/40">소지금</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Target className="w-5 h-5 text-green-500" />
            <span className="text-white font-bold text-sm">{profile?.missions_completed}</span>
            <p className="text-[10px] text-white/40">미션</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Star className="w-5 h-5 text-neon-cyan" />
            <span className="text-white font-bold text-sm">{profile?.points?.toLocaleString()}</span>
            <p className="text-[10px] text-white/40">포인트</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 space-y-4 overflow-auto">
        {/* Location Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-red-400" />
              <h3 className="text-white font-bold text-sm">장소 선택</h3>
            </div>
            <p className="text-white/50 text-xs mb-3">
              원하는 장소 입력 또는 AI 랜덤 선택
            </p>
            <Input
              placeholder="예: 강남역..."
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 mb-2 h-9 text-sm"
            />
            <Button 
              variant="outline" 
              size="sm"
              className="w-full border-white/20 text-white hover:bg-white/10 text-xs"
              onClick={handleCustomLocation}
            >
              이 장소로 시작
            </Button>
          </div>

          <div className="glass-card p-4 rounded-xl flex flex-col items-center justify-center text-center">
            <Dice6 className="w-10 h-10 text-neon-cyan mb-2" />
            <h3 className="text-white font-bold text-sm">서울에서 생존</h3>
            <p className="text-white/50 text-xs">Sinh tồn tại Seoul</p>
            <Button 
              size="sm"
              className="mt-3 bg-gradient-to-r from-neon-pink to-neon-purple hover:opacity-90 text-xs"
              onClick={handleStartSurvival}
            >
              10턴 생존 도전!
            </Button>
          </div>
        </div>

        {/* External Links */}
        <div className="grid grid-cols-2 gap-3">
          <a href="https://hanoi.topikbot.kr" target="_blank" rel="noopener noreferrer" className="block">
            <Button className="w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 text-xs font-bold">
              <ExternalLink className="w-4 h-4 mr-1" />
              Hanoi 공식사이트
            </Button>
          </a>
          <a href="https://chat-topikbot.kr" target="_blank" rel="noopener noreferrer" className="block">
            <Button className="w-full h-12 bg-gradient-to-r from-violet-500 to-purple-500 hover:opacity-90 text-xs font-bold">
              <ExternalLink className="w-4 h-4 mr-1" />
              LUKATO AI
            </Button>
          </a>
        </div>

        {/* Game Buttons Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            className="h-12 bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-xs font-bold"
            onClick={() => navigate("/ranking")}
          >
            <Trophy className="w-4 h-4 mr-1" />
            랭킹 / Xếp hạng
          </Button>
          <Button 
            className="h-12 bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90 text-xs font-bold"
            onClick={() => navigate("/dating")}
          >
            <Heart className="w-4 h-4 mr-1" />
            Seoul Love Signal
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button 
            className="h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 text-xs font-bold"
            onClick={() => navigate("/bankruptcy")}
          >
            <Zap className="w-4 h-4 mr-1" />
            파산 복구
          </Button>
          <Button 
            className="h-12 bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:opacity-90 text-xs font-bold"
            onClick={() => navigate("/parttime")}
          >
            <Briefcase className="w-4 h-4 mr-1" />
            아르바이트
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button 
            className="h-12 bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 text-xs font-bold"
            onClick={() => navigate("/wordchain")}
          >
            <Link2 className="w-4 h-4 mr-1" />
            끝말잇기
          </Button>
          <Button 
            className="h-12 bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-90 text-xs font-bold"
            onClick={() => navigate("/quiz")}
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            관용어 퀴즈
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button 
            className="h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-xs font-bold"
            onClick={() => navigate("/kdrama")}
          >
            <Film className="w-4 h-4 mr-1" />
            K-Drama 더빙
          </Button>
          <Button 
            className="h-12 bg-gradient-to-r from-rose-500 to-red-500 hover:opacity-90 text-xs font-bold"
            onClick={() => navigate("/kpop")}
          >
            <Music className="w-4 h-4 mr-1" />
            K-POP 가사
          </Button>
        </div>
      </div>

      {/* Footer */}
      <AppFooter compact />
    </div>
  );
};

export default Game;
