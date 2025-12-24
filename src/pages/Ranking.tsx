import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Crown, Medal, Flame, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLevelFromPoints } from "@/lib/pointsPolicy";

interface RankingUser {
  id: string;
  username: string;
  points: number;
  current_streak: number;
}

const levelTiers = [
  { name: "Sinh viên mới", min: 0, color: "text-muted-foreground", icon: "⭐" },
  { name: "Trường Cao đẳng", min: 500, color: "text-green-500", icon: "🎓" },
  { name: "Đại học Địa phương", min: 1500, color: "text-blue-500", icon: "🏫" },
  { name: "Đại học Quốc gia", min: 3500, color: "text-purple-500", icon: "🏛️" },
  { name: "Đại học TOP 10", min: 7000, color: "text-orange-500", icon: "🎖️" },
  { name: "Đại học Bách Khoa", min: 12000, color: "text-yellow-500", icon: "👑" },
  { name: "Đại học Y Hà Nội", min: 20000, color: "text-red-500", icon: "🏆" },
];

const getUserTier = (points: number) => {
  for (let i = levelTiers.length - 1; i >= 0; i--) {
    if (points >= levelTiers[i].min) {
      return levelTiers[i];
    }
  }
  return levelTiers[0];
};

const Ranking = () => {
  const navigate = useNavigate();
  const [rankings, setRankings] = useState<RankingUser[]>([]);
  const [topThree, setTopThree] = useState<RankingUser[]>([]);
  const [currentUser, setCurrentUser] = useState<RankingUser | null>(null);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("total");

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      
      // Fetch all users ordered by points
      const { data: allUsers, error } = await supabase
        .from("profiles")
        .select("id, username, points, current_streak")
        .order("points", { ascending: false })
        .limit(100);

      if (error) throw error;

      if (allUsers) {
        setTopThree(allUsers.slice(0, 3));
        setRankings(allUsers.slice(3, 20));

        // Find current user rank
        if (session?.user) {
          const userIndex = allUsers.findIndex(u => u.id === session.user.id);
          if (userIndex !== -1) {
            setCurrentUser(allUsers[userIndex]);
            setCurrentUserRank(userIndex + 1);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching rankings:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const getInitial = (username: string) => {
    return username.charAt(0).toUpperCase();
  };

  const getRandomColor = (id: string) => {
    const colors = [
      "bg-pink-500", "bg-purple-500", "bg-blue-500", "bg-green-500",
      "bg-yellow-500", "bg-orange-500", "bg-red-500", "bg-indigo-500"
    ];
    const index = id.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-heading font-bold text-lg">Bảng xếp hạng</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              TOP RANKINGS
            </h2>
            <Trophy className="w-8 h-8 text-yellow-500" />
          </div>
          <p className="text-sm text-muted-foreground">🏆 Bảng xếp hạng 🏆</p>
        </motion.div>

        {/* Current User Card */}
        {currentUser && currentUserRank && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full ${getRandomColor(currentUser.id)} flex items-center justify-center text-white font-bold text-lg`}>
                {getInitial(currentUser.username)}
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground">{getUserTier(currentUser.points).name}</p>
                <p className="text-sm text-muted-foreground">Đang trên đường thành công</p>
                <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-accent"
                    style={{ width: `${Math.min((currentUser.points / 7000) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tiến bộ đến Đại học TOP 10: {currentUser.points.toLocaleString()} / 7,000
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{currentUser.points.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">điểm</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{currentUserRank}</p>
                <p className="text-xs text-muted-foreground">Xếp hạng</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{currentUser.current_streak}</p>
                <p className="text-xs text-muted-foreground">Đăng</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground flex items-center justify-center gap-1">
                  <Flame className="w-4 h-4 text-orange-500" />
                  {currentUser.current_streak}
                </p>
                <p className="text-xs text-muted-foreground">Max Streak</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">Lv.{getLevelFromPoints(currentUser.points).level}</p>
                <p className="text-xs text-muted-foreground">Level</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50">
            <TabsTrigger value="total" className="flex items-center gap-1">
              <Trophy className="w-4 h-4" />
              Tổng điểm
            </TabsTrigger>
            <TabsTrigger value="week" className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              Tuần này
            </TabsTrigger>
            <TabsTrigger value="month" className="flex items-center gap-1">
              <Star className="w-4 h-4" />
              Tháng này
            </TabsTrigger>
          </TabsList>

          <TabsContent value="total" className="mt-4 space-y-4">
            {/* Top 3 Podium */}
            {topThree.length >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-end justify-center gap-2 py-6"
              >
                {/* 2nd Place */}
                <div className="text-center">
                  <div className={`w-16 h-16 mx-auto rounded-full ${getRandomColor(topThree[1].id)} flex items-center justify-center text-white font-bold text-xl border-4 border-gray-400`}>
                    {getInitial(topThree[1].username)}
                  </div>
                  <Medal className="w-5 h-5 mx-auto mt-2 text-gray-400" />
                  <p className="text-xs font-medium text-foreground mt-1 truncate max-w-[70px]">{topThree[1].username}</p>
                  <div className="bg-gray-400/20 rounded-t-lg px-3 py-2 mt-2">
                    <p className="text-sm font-bold text-foreground">{topThree[1].points.toLocaleString()}</p>
                  </div>
                </div>

                {/* 1st Place */}
                <div className="text-center -mt-4">
                  <Crown className="w-8 h-8 mx-auto text-yellow-400 mb-1" />
                  <div className={`w-20 h-20 mx-auto rounded-full ${getRandomColor(topThree[0].id)} flex items-center justify-center text-white font-bold text-2xl border-4 border-yellow-400 shadow-lg shadow-yellow-400/30`}>
                    {getInitial(topThree[0].username)}
                  </div>
                  <p className="text-sm font-bold text-foreground mt-2 truncate max-w-[80px]">👑 {topThree[0].username}</p>
                  <div className="bg-yellow-400/20 rounded-t-lg px-4 py-3 mt-2">
                    <p className="text-lg font-bold text-foreground">{topThree[0].points.toLocaleString()}</p>
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="text-center">
                  <div className={`w-14 h-14 mx-auto rounded-full ${getRandomColor(topThree[2].id)} flex items-center justify-center text-white font-bold text-lg border-4 border-amber-600`}>
                    {getInitial(topThree[2].username)}
                  </div>
                  <Medal className="w-5 h-5 mx-auto mt-2 text-amber-600" />
                  <p className="text-xs font-medium text-foreground mt-1 truncate max-w-[60px]">{topThree[2].username}</p>
                  <div className="bg-amber-600/20 rounded-t-lg px-2 py-1.5 mt-2">
                    <p className="text-xs font-bold text-foreground">{topThree[2].points.toLocaleString()}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Rankings List */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 bg-muted/50 border-b border-border">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Bảng xếp hạng đầy đủ
                </h3>
              </div>
              <div className="divide-y divide-border">
                {rankings.map((user, index) => {
                  const rank = index + 4;
                  const tier = getUserTier(user.points);
                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-8 flex items-center justify-center">
                        {getRankIcon(rank)}
                      </div>
                      <div className={`w-10 h-10 rounded-full ${getRandomColor(user.id)} flex items-center justify-center text-white font-bold`}>
                        {getInitial(user.username)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{user.username}</p>
                        <p className={`text-xs ${tier.color}`}>{tier.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">{user.points.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">điểm</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Level Tiers */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                Cấp độ đại học
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {levelTiers.map((tier) => (
                  <div
                    key={tier.name}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <span className="text-lg">{tier.icon}</span>
                    <div>
                      <p className={`text-sm font-medium ${tier.color}`}>{tier.name}</p>
                      <p className="text-xs text-muted-foreground">{tier.min.toLocaleString()}+ điểm</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="week" className="mt-4">
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Bảng xếp hạng tuần này</p>
              <p className="text-sm">Cập nhật vào thứ 2 hàng tuần</p>
            </div>
          </TabsContent>

          <TabsContent value="month" className="mt-4">
            <div className="text-center py-12 text-muted-foreground">
              <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Bảng xếp hạng tháng này</p>
              <p className="text-sm">Cập nhật vào ngày 1 hàng tháng</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Ranking;
