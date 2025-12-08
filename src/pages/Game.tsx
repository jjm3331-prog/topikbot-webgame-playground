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
  ChevronLeft,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

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
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-white text-xl">로딩중... / Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/")} className="text-white/70 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-white font-medium">메인 메뉴 / Menu chính</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white">{profile?.username}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="border-red-500/50 text-red-400 hover:bg-red-500/20"
          >
            로그아웃
          </Button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="p-4">
        <div className="glass-card p-4 rounded-xl grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-xs text-white/60">체력 / Máu</p>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">{profile?.hp}/100</span>
                <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all"
                    style={{ width: `${profile?.hp}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="text-xs text-white/60">소지금 / Tiền</p>
              <span className="text-white font-bold">₩{profile?.money?.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-xs text-white/60">미션 / Nhiệm vụ</p>
              <span className="text-white font-bold">{profile?.missions_completed}/{profile?.total_missions}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Location Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-red-400" />
              <h3 className="text-white font-bold">장소 선택 / Chọn địa điểm</h3>
            </div>
            <p className="text-white/60 text-sm mb-3">
              원하는 장소를 입력하거나 비워두면 AI가 랜덤 선택
              <br />
              <span className="text-white/40">Nhập địa điểm hoặc để trống để AI chọn ngẫu nhiên</span>
            </p>
            <Input
              placeholder="예: 강남역, 한강공원, PC방..."
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 mb-2"
            />
            <Button 
              variant="outline" 
              className="w-full border-white/20 text-white hover:bg-white/10"
              onClick={handleCustomLocation}
            >
              이 장소로 시작 / Bắt đầu tại đây
            </Button>
          </div>

          <div className="glass-card p-4 rounded-xl flex flex-col items-center justify-center text-center">
            <Dice6 className="w-12 h-12 text-neon-cyan mb-2" />
            <h3 className="text-white font-bold text-lg">서울에서 생존하기</h3>
            <p className="text-white/60 text-sm">Sinh tồn tại Seoul</p>
            <Button 
              className="mt-3 bg-purple-600 hover:bg-purple-700"
              onClick={handleStartSurvival}
            >
              목표: 10턴 생존
            </Button>
          </div>
        </div>

        {/* Game Modes */}
        <Button 
          className="w-full h-14 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-lg font-bold"
          onClick={() => navigate("/ranking")}
        >
          <Trophy className="w-6 h-6 mr-2" />
          랭킹 보기 / Bảng xếp hạng
        </Button>

        <div className="grid grid-cols-2 gap-4">
          <Button 
            className="h-14 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            onClick={() => navigate("/bankruptcy")}
          >
            <Zap className="w-5 h-5 mr-2" />
            파산 복구 / Phục hồi phá sản
          </Button>
          <Button 
            className="h-14 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            onClick={() => navigate("/parttime")}
          >
            <Briefcase className="w-5 h-5 mr-2" />
            아르바이트 / Làm thêm
          </Button>
        </div>

        <Button 
          className="w-full h-14 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-lg"
          onClick={() => navigate("/wordchain")}
        >
          <Link2 className="w-6 h-6 mr-2" />
          끝말잇기 / Nối từ tiếng Hàn
        </Button>

        <Button 
          className="w-full h-14 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-lg"
          onClick={() => navigate("/quiz")}
        >
          <MessageSquare className="w-6 h-6 mr-2" />
          관용어 & 슬랭 퀴즈 / Thành ngữ & Tiếng lóng
        </Button>

        {/* Footer Stats */}
        <div className="flex items-center justify-center gap-4 text-white/40 text-sm pt-4">
          <span>❤️ {profile?.hp}</span>
          <span>턴 0/10 | Lượt 0/10</span>
        </div>
      </div>
    </div>
  );
};

export default Game;
