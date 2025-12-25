import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Swords, Link2, Brain, Users, Trophy, Zap, Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import CleanHeader from "@/components/CleanHeader";
import CommonFooter from "@/components/CommonFooter";
import ChainReactionMultiplayer from "@/components/vocabulary/ChainReactionMultiplayer";
import SemanticBattle from "@/components/battle/SemanticBattle";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BattleGame {
  id: string;
  name: string;
  nameKo: string;
  description: string;
  icon: React.ElementType;
  available: boolean;
  comingSoon?: boolean;
  gradient?: string;
}

const battleGames: BattleGame[] = [
  {
    id: "word-chain",
    name: "Nối từ 1:1",
    nameKo: "끝말잇기 대결",
    description: "Nối từ theo âm tiết cuối! 12 giây mỗi lượt.",
    icon: Link2,
    available: true,
    gradient: "from-yellow-400 to-orange-500",
  },
  {
    id: "semantic",
    name: "Đấu Nghĩa 1:1",
    nameKo: "의미 연결 대결",
    description: "Nối từ theo ý nghĩa! AI chấm điểm liên quan.",
    icon: Brain,
    available: true,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    id: "speed-quiz",
    name: "Quiz tốc độ",
    nameKo: "스피드 퀴즈",
    description: "Ai trả lời nhanh và đúng hơn sẽ thắng!",
    icon: Zap,
    available: false,
    comingSoon: true,
  },
  {
    id: "dictation",
    name: "Nghe viết",
    nameKo: "받아쓰기 대결",
    description: "Nghe và viết lại tiếng Hàn chính xác nhất!",
    icon: Crown,
    available: false,
    comingSoon: true,
  },
];

export default function Battle() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [initialRoomCode, setInitialRoomCode] = useState<string | undefined>();

  // Check URL params for room code
  useEffect(() => {
    const roomCode = searchParams.get("room");
    const game = searchParams.get("game");

    if (!roomCode) return;

    setInitialRoomCode(roomCode);

    // If a room code is present but "game" is missing (or invalid), default to Word Chain.
    // This makes shared links work without requiring users to manually type the code.
    if (game === "semantic") {
      setSelectedGame("semantic");
      return;
    }

    setSelectedGame("word-chain");
  }, [searchParams]);

  // Check auth
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSelectGame = (game: BattleGame) => {
    if (!game.available) {
      toast.info("Sắp ra mắt!", { description: "Tính năng này đang được phát triển." });
      return;
    }

    if (!isLoggedIn) {
      toast.error("Vui lòng đăng nhập", {
        description: "Bạn cần đăng nhập để chơi 1:1 với người khác.",
        action: {
          label: "Đăng nhập",
          onClick: () => navigate("/auth"),
        },
      });
      return;
    }

    setSelectedGame(game.id);
  };

  // Selected game view
  if (selectedGame === "word-chain") {
    return (
      <div className="min-h-screen bg-background">
        <CleanHeader />
        <main className="container mx-auto px-4 py-6 pt-20">
          <ChainReactionMultiplayer
            words={[]}
            onBack={() => {
              setSelectedGame(null);
              setInitialRoomCode(undefined);
            }}
            initialRoomCode={initialRoomCode}
          />
        </main>
      </div>
    );
  }

  if (selectedGame === "semantic") {
    return (
      <div className="min-h-screen bg-background">
        <CleanHeader />
        <main className="container mx-auto px-4 py-6 pt-20">
          <SemanticBattle
            onBack={() => {
              setSelectedGame(null);
              setInitialRoomCode(undefined);
            }}
            initialRoomCode={initialRoomCode}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CleanHeader />
      
      <main className="container mx-auto px-4 py-6 pt-20 pb-24">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Swords className="w-12 h-12 text-yellow-500" />
            </motion.div>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-black mb-2">
            <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              Đấu trường 1:1
            </span>
          </h1>
          <p className="text-lg text-muted-foreground">
            1:1 실시간 대결 / Đối đầu thời gian thực
          </p>
          
          {/* Points info */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full"
          >
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
              Thắng = +1,000 điểm!
            </span>
          </motion.div>
        </motion.div>

        {/* Login CTA if not logged in */}
        {!isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="text-sm">
                    Đăng nhập để đối đầu 1:1 với người chơi khác!
                  </span>
                </div>
                <Button onClick={() => navigate("/auth")} size="sm">
                  Đăng nhập
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Game Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {battleGames.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={`relative overflow-hidden p-6 cursor-pointer transition-all duration-300 ${
                  game.available
                    ? "hover:scale-[1.02] hover:shadow-xl hover:border-primary/50"
                    : "opacity-60"
                }`}
                onClick={() => handleSelectGame(game)}
              >
                {/* Glow effect for available games */}
                {game.available && (
                  <div className="absolute inset-0 -z-10">
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${game.gradient || "from-yellow-500/20 to-orange-500/20"} rounded-full blur-3xl opacity-50`} />
                  </div>
                )}

                {/* Coming Soon Badge */}
                {game.comingSoon && (
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-1 text-xs font-bold bg-muted text-muted-foreground rounded-full">
                      Sắp ra mắt
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${
                    game.available
                      ? `bg-gradient-to-br ${game.gradient || "from-yellow-400 to-orange-500"}`
                      : "bg-muted"
                  }`}>
                    {game.available ? (
                      <game.icon className="w-8 h-8 text-white" />
                    ) : (
                      <Lock className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">{game.name}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{game.nameKo}</p>
                    <p className="text-sm text-muted-foreground">{game.description}</p>
                  </div>
                </div>

                {game.available && (
                  <motion.div
                    className="mt-4"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button className={`w-full gap-2 bg-gradient-to-r ${game.gradient || "from-yellow-500 to-orange-500"} hover:opacity-90`}>
                      <Swords className="w-4 h-4" />
                      Đấu ngay
                    </Button>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Rules Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <Card className="p-6 bg-card/50">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Quy tắc đấu trường
            </h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">•</span>
                Chỉ dành cho thành viên đã đăng nhập
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">•</span>
                Mỗi lượt có 12 giây để trả lời
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">•</span>
                2 lần cảnh báo = thua (1 lần được phép)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">•</span>
                <span className="text-yellow-600 dark:text-yellow-400 font-semibold">
                  Thắng = +1,000 điểm!
                </span>
              </li>
            </ul>
          </Card>
        </motion.div>
      </main>

      <CommonFooter />
    </div>
  );
}
