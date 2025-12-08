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
  ChevronLeft,
  Crown,
  Flame
} from "lucide-react";
import { motion } from "framer-motion";

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
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-300" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center text-white/60 font-bold">{rank}</span>;
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
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-white text-xl flex items-center gap-3">
          <Flame className="w-6 h-6 animate-bounce text-orange-500" />
          랭킹 로딩중...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/game")} className="text-white/70 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-white font-medium">Back to Game</span>
        </div>
        <Trophy className="w-6 h-6 text-yellow-500" />
      </header>

      {/* Title */}
      <div className="p-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500">
            🏆 리더보드
          </h1>
          <p className="text-white/60 mt-1">Bảng xếp hạng người chơi</p>
        </motion.div>
      </div>

      {/* Sort Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
          <Button
            variant={sortBy === "points" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSortBy("points")}
            className={sortBy === "points" 
              ? "flex-1 bg-purple-600 hover:bg-purple-700" 
              : "flex-1 text-white/60 hover:text-white hover:bg-white/10"
            }
          >
            <Star className="w-4 h-4 mr-1" />
            포인트
          </Button>
          <Button
            variant={sortBy === "missions_completed" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSortBy("missions_completed")}
            className={sortBy === "missions_completed" 
              ? "flex-1 bg-green-600 hover:bg-green-700" 
              : "flex-1 text-white/60 hover:text-white hover:bg-white/10"
            }
          >
            <Target className="w-4 h-4 mr-1" />
            미션
          </Button>
          <Button
            variant={sortBy === "money" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSortBy("money")}
            className={sortBy === "money" 
              ? "flex-1 bg-yellow-600 hover:bg-yellow-700" 
              : "flex-1 text-white/60 hover:text-white hover:bg-white/10"
            }
          >
            <Coins className="w-4 h-4 mr-1" />
            자산
          </Button>
        </div>
      </div>

      {/* Rankings List */}
      <div className="px-4 pb-8 space-y-3">
        {rankings.length === 0 ? (
          <div className="text-center text-white/60 py-12">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>아직 플레이어가 없습니다</p>
            <p className="text-sm">Chưa có người chơi nào</p>
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
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`p-4 rounded-xl border ${getRankBg(rank, isCurrentUser)} ${
                  isCurrentUser ? "ring-2 ring-purple-400" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="w-10 h-10 flex items-center justify-center">
                    {getRankIcon(rank)}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold truncate ${isCurrentUser ? "text-purple-300" : "text-white"}`}>
                        {player.username}
                      </span>
                      {isCurrentUser && (
                        <span className="text-xs bg-purple-500 px-2 py-0.5 rounded-full text-white">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-white/60">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-red-400" />
                        {player.hp}
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3 text-green-400" />
                        {player.missions_completed}
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    {sortBy === "points" && (
                      <div className="flex items-center gap-1 text-yellow-400 font-bold">
                        <Star className="w-4 h-4" />
                        {player.points.toLocaleString()}
                      </div>
                    )}
                    {sortBy === "missions_completed" && (
                      <div className="flex items-center gap-1 text-green-400 font-bold">
                        <Target className="w-4 h-4" />
                        {player.missions_completed}
                      </div>
                    )}
                    {sortBy === "money" && (
                      <div className="flex items-center gap-1 text-yellow-400 font-bold">
                        <Coins className="w-4 h-4" />
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

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-900 to-transparent">
        <Button
          onClick={() => navigate("/game")}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          게임으로 돌아가기
        </Button>
      </div>
    </div>
  );
};

export default Ranking;
