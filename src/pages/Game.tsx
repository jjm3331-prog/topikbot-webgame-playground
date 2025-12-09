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
  Star,
  HelpCircle,
  Play,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
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

interface GameItem {
  icon: React.ReactNode;
  title: string;
  titleVi: string;
  tag?: string;
  tagColor?: string;
  route: string;
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

  const survivalGames: GameItem[] = [
    { icon: <Dice6 className="w-5 h-5" />, title: "서울 생존", titleVi: "Sinh tồn Seoul", tag: "AI", route: "/chat" },
    { icon: <Zap className="w-5 h-5" />, title: "파산 복구", titleVi: "Phục hồi phá sản", tag: "도전", tagColor: "bg-neon-green/20 text-neon-green", route: "/bankruptcy" },
    { icon: <Briefcase className="w-5 h-5" />, title: "아르바이트", titleVi: "Làm thêm", tag: "돈벌기", tagColor: "bg-accent/20 text-accent", route: "/parttime" },
  ];

  const studyGames: GameItem[] = [
    { icon: <Link2 className="w-5 h-5" />, title: "끝말잇기", titleVi: "Nối từ", tag: "어휘", route: "/wordchain" },
    { icon: <MessageSquare className="w-5 h-5" />, title: "관용어 퀴즈", titleVi: "Quiz thành ngữ", tag: "문법", route: "/quiz" },
  ];

  const mediaGames: GameItem[] = [
    { icon: <Film className="w-5 h-5" />, title: "K-Drama 더빙", titleVi: "Lồng tiếng K-Drama", tag: "YouTube", tagColor: "bg-destructive/20 text-destructive", route: "/kdrama" },
    { icon: <Music className="w-5 h-5" />, title: "K-POP 가사", titleVi: "Lời K-POP", tag: "YouTube", tagColor: "bg-destructive/20 text-destructive", route: "/kpop" },
  ];

  const socialGames: GameItem[] = [
    { icon: <Heart className="w-5 h-5" />, title: "Love Signal", titleVi: "Tín hiệu tình yêu", tag: "연애", tagColor: "bg-neon-pink/20 text-neon-pink", route: "/dating" },
    { icon: <Trophy className="w-5 h-5" />, title: "랭킹", titleVi: "Xếp hạng", tag: "경쟁", tagColor: "bg-accent/20 text-accent", route: "/ranking" },
  ];

  const GameCard = ({ game, index }: { game: GameItem; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index }}
      className="glass-card p-3 flex items-center gap-3 cursor-pointer hover:border-primary/40 transition-all active:scale-[0.98]"
      onClick={() => navigate(game.route)}
    >
      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary shrink-0">
        {game.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-bold text-foreground text-sm">{game.title}</h3>
          {game.tag && (
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${game.tagColor || "bg-primary/20 text-primary"}`}>
              {game.tag}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">{game.titleVi}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </motion.div>
  );

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
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">소지금</p>
            </div>
            
            {/* Missions */}
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-6 h-6 rounded-lg bg-neon-green/20 flex items-center justify-center">
                  <Target className="w-3.5 h-3.5 text-neon-green" />
                </div>
              </div>
              <p className="text-sm font-bold text-foreground">{profile?.missions_completed}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">미션</p>
            </div>
            
            {/* Points */}
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-6 h-6 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <Star className="w-3.5 h-3.5 text-secondary" />
                </div>
              </div>
              <p className="text-sm font-bold text-foreground">{profile?.points?.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">포인트</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 px-4 pb-4 space-y-4 overflow-y-auto">
        {/* Quick Start Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 rounded-xl"
        >
          <div className="flex items-center gap-2 mb-3">
            <Play className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-foreground text-sm">빠른 시작</h2>
            <span className="text-[10px] text-muted-foreground">Quick Start</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <MapPin className="w-3.5 h-3.5 text-destructive" />
                <span className="text-xs text-muted-foreground">장소 선택</span>
              </div>
              <Input
                placeholder="예: 강남역..."
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground mb-2 h-9 text-xs"
              />
              <Button 
                variant="outline" 
                size="sm"
                className="w-full h-8 border-border text-foreground hover:bg-muted text-xs"
                onClick={handleCustomLocation}
              >
                시작
              </Button>
            </div>
            <div className="flex flex-col items-center justify-center glass-card p-3 rounded-lg">
              <Dice6 className="w-8 h-8 text-primary mb-2" />
              <span className="text-xs font-bold text-foreground mb-1">랜덤 서울</span>
              <Button 
                size="sm"
                className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-4"
                onClick={handleStartSurvival}
              >
                10턴 도전!
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Survival Games */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-foreground text-sm flex items-center gap-2">
              🎮 서바이벌 게임
              <span className="text-[10px] text-muted-foreground font-normal">Survival Games</span>
            </h2>
          </div>
          <div className="space-y-2">
            {survivalGames.map((game, index) => (
              <GameCard key={game.title} game={game} index={index} />
            ))}
          </div>
        </div>

        {/* Study Games */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-foreground text-sm flex items-center gap-2">
              📚 학습 게임
              <span className="text-[10px] text-muted-foreground font-normal">Study Games</span>
            </h2>
          </div>
          <div className="space-y-2">
            {studyGames.map((game, index) => (
              <GameCard key={game.title} game={game} index={index} />
            ))}
          </div>
        </div>

        {/* Media Games */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-foreground text-sm flex items-center gap-2">
              🎬 미디어 게임
              <span className="text-[10px] text-muted-foreground font-normal">Media Games</span>
            </h2>
          </div>
          <div className="space-y-2">
            {mediaGames.map((game, index) => (
              <GameCard key={game.title} game={game} index={index} />
            ))}
          </div>
        </div>

        {/* Social Games */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-foreground text-sm flex items-center gap-2">
              💬 소셜 게임
              <span className="text-[10px] text-muted-foreground font-normal">Social Games</span>
            </h2>
          </div>
          <div className="space-y-2">
            {socialGames.map((game, index) => (
              <GameCard key={game.title} game={game} index={index} />
            ))}
          </div>
        </div>

        {/* External Links */}
        <div className="space-y-2">
          <h2 className="font-bold text-foreground text-sm flex items-center gap-2">
            🔗 외부 링크
            <span className="text-[10px] text-muted-foreground font-normal">External Links</span>
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <a href="https://hanoi.topikbot.kr" target="_blank" rel="noopener noreferrer" className="block">
              <div className="glass-card p-3 flex items-center gap-2 hover:border-primary/40 transition-all">
                <ExternalLink className="w-4 h-4 text-secondary" />
                <div>
                  <p className="text-xs font-bold text-foreground">Hanoi 공식</p>
                  <p className="text-[9px] text-muted-foreground">Trang chính thức</p>
                </div>
              </div>
            </a>
            <a href="https://chat-topikbot.kr" target="_blank" rel="noopener noreferrer" className="block">
              <div className="glass-card p-3 flex items-center gap-2 hover:border-primary/40 transition-all">
                <ExternalLink className="w-4 h-4 text-neon-purple" />
                <div>
                  <p className="text-xs font-bold text-foreground">LUKATO AI</p>
                  <p className="text-[9px] text-muted-foreground">Dịch vụ AI</p>
                </div>
              </div>
            </a>
          </div>
        </div>

        {/* Tutorial Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-4 flex items-center gap-3 cursor-pointer hover:border-primary/40 transition-all"
          onClick={() => navigate("/tutorial")}
        >
          <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-secondary" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground text-sm">사용법 안내</h3>
            <p className="text-[11px] text-muted-foreground">Hướng dẫn sử dụng chi tiết</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </div>

      {/* Footer */}
      <AppFooter compact />
    </div>
  );
};

export default Game;
