import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Medal, 
  Heart, 
  Coins, 
  Target, 
  Star,
  Crown,
  Flame
} from "lucide-react";
import { motion } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";

interface RankingProfile {
  id: string;
  username: string;
  hp: number;
  money: number;
  missions_completed: number;
  points: number;
}

const Ranking = () => {
  const [rankings, setRankings] = useState<RankingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"points" | "missions_completed" | "money">("points");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRankings = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, hp, money, missions_completed, points")
        .order(sortBy, { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching rankings:", error);
      } else {
        setRankings(data || []);
      }
      setLoading(false);
    };

    fetchRankings();
  }, [sortBy]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-white/60 font-bold text-sm">{rank}</span>;
  };

  const getRankBg = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return "bg-purple-600/30 border-purple-500";
    if (rank === 1) return "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/50";
    if (rank === 2) return "bg-gradient-to-r from-gray-400/20 to-gray-300/20 border-gray-400/50";
    if (rank === 3) return "bg-gradient-to-r from-amber-600/20 to-orange-500/20 border-amber-600/50";
    return "bg-white/5 border-white/10";
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-[#1a1a2e] to-[#0f0f23] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Flame className="w-8 h-8 animate-bounce text-orange-500" />
          <p className="text-white/60 text-sm">랭킹 로딩중... / Đang tải xếp hạng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f23] flex flex-col">
      <AppHeader title="랭킹" titleVi="Xếp hạng" />

      {/* Title */}
      <div className="px-4 py-3 text-center shrink-0">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500">
            🏆 리더보드 / Bảng xếp hạng
          </h1>
        </motion.div>
      </div>

      {/* Sort Tabs */}
      <div className="px-3 mb-3 shrink-0">
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
          <Button
            variant={sortBy === "points" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSortBy("points")}
            className={`flex-1 h-9 text-[10px] ${sortBy === "points" 
              ? "bg-purple-600 hover:bg-purple-700" 
              : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            <Star className="w-3 h-3 mr-1" />
            <div className="flex flex-col leading-tight">
              <span>포인트</span>
              <span className="opacity-70">Điểm</span>
            </div>
          </Button>
          <Button
            variant={sortBy === "missions_completed" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSortBy("missions_completed")}
            className={`flex-1 h-9 text-[10px] ${sortBy === "missions_completed" 
              ? "bg-green-600 hover:bg-green-700" 
              : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            <Target className="w-3 h-3 mr-1" />
            <div className="flex flex-col leading-tight">
              <span>미션</span>
              <span className="opacity-70">Nhiệm vụ</span>
            </div>
          </Button>
          <Button
            variant={sortBy === "money" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSortBy("money")}
            className={`flex-1 h-9 text-[10px] ${sortBy === "money" 
              ? "bg-yellow-600 hover:bg-yellow-700" 
              : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            <Coins className="w-3 h-3 mr-1" />
            <div className="flex flex-col leading-tight">
              <span>자산</span>
              <span className="opacity-70">Tài sản</span>
            </div>
          </Button>
        </div>
      </div>

      {/* Rankings List */}
      <div className="flex-1 px-3 pb-16 space-y-2 overflow-y-auto">
        {rankings.length === 0 ? (
          <div className="text-center text-white/60 py-12">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">아직 플레이어가 없습니다</p>
            <p className="text-xs">Chưa có người chơi nào</p>
          </div>
        ) : (
          rankings.map((player, index) => {
            const rank = index + 1;
            const isCurrentUser = player.id === currentUserId;
            
            return (
              <motion.div
                key={player.id}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                className={`p-3 rounded-xl border ${getRankBg(rank, isCurrentUser)} ${
                  isCurrentUser ? "ring-2 ring-purple-400" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    {getRankIcon(rank)}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm truncate ${isCurrentUser ? "text-purple-300" : "text-white"}`}>
                        {player.username}
                      </span>
                      {isCurrentUser && (
                        <span className="text-[9px] bg-purple-500 px-1.5 py-0.5 rounded-full text-white shrink-0">
                          나 / Tôi
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/60">
                      <span className="flex items-center gap-0.5">
                        <Heart className="w-3 h-3 text-red-400" />
                        {player.hp}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Target className="w-3 h-3 text-green-400" />
                        {player.missions_completed}
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    {sortBy === "points" && (
                      <div className="flex items-center gap-1 text-yellow-400 font-bold text-sm">
                        <Star className="w-3 h-3" />
                        {player.points.toLocaleString()}
                      </div>
                    )}
                    {sortBy === "missions_completed" && (
                      <div className="flex items-center gap-1 text-green-400 font-bold text-sm">
                        <Target className="w-3 h-3" />
                        {player.missions_completed}
                      </div>
                    )}
                    {sortBy === "money" && (
                      <div className="flex items-center gap-1 text-yellow-400 font-bold text-sm">
                        <Coins className="w-3 h-3" />
                        ₩{player.money.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Footer Button */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-[#0f0f23] to-transparent">
        <Button
          onClick={() => navigate("/game")}
          className="w-full bg-purple-600 hover:bg-purple-700 h-10 text-sm"
        >
          메인으로 돌아가기 / Quay lại menu
        </Button>
      </div>
    </div>
  );
};

export default Ranking;
