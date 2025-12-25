import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Crown, Medal, Flame, Star, TrendingUp, Zap, Target, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLevelFromPoints, LEVEL_THRESHOLDS } from "@/lib/pointsPolicy";
import { Progress } from "@/components/ui/progress";

interface RankingUser {
  id: string;
  username: string;
  points: number;
  current_streak: number;
}

// TOPIK 기반 레벨 시스템
const topikLevels = [
  { level: 1, name: "TOPIK 1급", min: 0, max: 499, color: "from-slate-400 to-slate-500", textColor: "text-slate-400", bgColor: "bg-slate-500/20", icon: "🌱" },
  { level: 2, name: "TOPIK 2급", min: 500, max: 1499, color: "from-emerald-400 to-emerald-600", textColor: "text-emerald-400", bgColor: "bg-emerald-500/20", icon: "📚" },
  { level: 3, name: "TOPIK 3급", min: 1500, max: 2999, color: "from-blue-400 to-blue-600", textColor: "text-blue-400", bgColor: "bg-blue-500/20", icon: "✨" },
  { level: 4, name: "TOPIK 4급", min: 3000, max: 4999, color: "from-purple-400 to-purple-600", textColor: "text-purple-400", bgColor: "bg-purple-500/20", icon: "🎯" },
  { level: 5, name: "TOPIK 5급", min: 5000, max: 7999, color: "from-orange-400 to-orange-600", textColor: "text-orange-400", bgColor: "bg-orange-500/20", icon: "🔥" },
  { level: 6, name: "TOPIK 6급", min: 8000, max: Infinity, color: "from-red-400 to-rose-600", textColor: "text-red-400", bgColor: "bg-red-500/20", icon: "👑" },
];

const getUserTopikLevel = (points: number) => {
  for (let i = topikLevels.length - 1; i >= 0; i--) {
    if (points >= topikLevels[i].min) {
      return topikLevels[i];
    }
  }
  return topikLevels[0];
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
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: allUsers, error } = await supabase
        .from("profiles")
        .select("id, username, points, current_streak")
        .order("points", { ascending: false })
        .limit(100);

      if (error) throw error;

      if (allUsers) {
        setTopThree(allUsers.slice(0, 3));
        setRankings(allUsers.slice(3, 20));

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

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/30">
            <Crown className="w-4 h-4 text-white" />
          </div>
        );
      case 2:
        return (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-lg shadow-gray-400/30">
            <Medal className="w-4 h-4 text-white" />
          </div>
        );
      case 3:
        return (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Medal className="w-4 h-4 text-white" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <span className="text-sm font-bold text-muted-foreground">{rank}</span>
          </div>
        );
    }
  };

  const getInitial = (username: string) => username.charAt(0).toUpperCase();

  const getAvatarGradient = (id: string) => {
    const gradients = [
      "from-pink-500 to-rose-500",
      "from-violet-500 to-purple-500", 
      "from-blue-500 to-cyan-500",
      "from-emerald-500 to-teal-500",
      "from-orange-500 to-amber-500",
      "from-red-500 to-pink-500",
      "from-indigo-500 to-blue-500",
      "from-fuchsia-500 to-pink-500",
    ];
    const index = id.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground text-lg">Đang tải bảng xếp hạng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-heading font-bold text-xl text-foreground">Bảng Xếp Hạng TOPIK</h1>
            <p className="text-sm text-muted-foreground">Cạnh tranh và tiến bộ cùng nhau</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              BẢNG XẾP HẠNG
            </h2>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Trophy className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Học tiếng Hàn, kiếm điểm và leo hạng TOPIK cùng cộng đồng!
          </p>
        </motion.div>

        {/* Current User Card */}
        {currentUser && currentUserRank && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card via-card to-muted/30"
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative p-6">
              <div className="flex items-center gap-5">
                {/* Avatar */}
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getAvatarGradient(currentUser.id)} flex items-center justify-center text-white font-bold text-2xl shadow-lg`}>
                  {getInitial(currentUser.username)}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getUserTopikLevel(currentUser.points).bgColor} ${getUserTopikLevel(currentUser.points).textColor}`}>
                      {getUserTopikLevel(currentUser.points).icon} {getUserTopikLevel(currentUser.points).name}
                    </span>
                  </div>
                  <p className="font-bold text-xl text-foreground truncate">{currentUser.username}</p>
                  
                  {/* Progress to next level */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">Tiến độ lên cấp</span>
                      <span className="font-semibold text-foreground">
                        {currentUser.points.toLocaleString()} / {getLevelFromPoints(currentUser.points).nextLevelPoints.toLocaleString()} điểm
                      </span>
                    </div>
                    <Progress 
                      value={getLevelFromPoints(currentUser.points).progress} 
                      className="h-2.5"
                    />
                  </div>
                </div>

                {/* Points */}
                <div className="text-right">
                  <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {currentUser.points.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">điểm</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-border/50">
                <div className="text-center p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center justify-center mb-1">
                    <Award className="w-5 h-5 text-yellow-500" />
                  </div>
                  <p className="text-xl font-bold text-foreground">#{currentUserRank}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Xếp hạng</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center justify-center mb-1">
                    <Zap className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-xl font-bold text-foreground">Lv.{getLevelFromPoints(currentUser.points).level}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Cấp độ</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center justify-center mb-1">
                    <Flame className="w-5 h-5 text-orange-500" />
                  </div>
                  <p className="text-xl font-bold text-foreground">{currentUser.current_streak}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Streak</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center justify-center mb-1">
                    <Target className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-xl font-bold text-foreground">{getUserTopikLevel(currentUser.points).level}급</p>
                  <p className="text-xs text-muted-foreground mt-0.5">TOPIK</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-14 p-1.5 bg-muted/50 rounded-2xl">
            <TabsTrigger value="total" className="flex items-center gap-2 rounded-xl text-base data-[state=active]:shadow-md">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Tổng điểm</span>
              <span className="sm:hidden">Tổng</span>
            </TabsTrigger>
            <TabsTrigger value="week" className="flex items-center gap-2 rounded-xl text-base data-[state=active]:shadow-md">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Tuần này</span>
              <span className="sm:hidden">Tuần</span>
            </TabsTrigger>
            <TabsTrigger value="month" className="flex items-center gap-2 rounded-xl text-base data-[state=active]:shadow-md">
              <Star className="w-4 h-4" />
              <span className="hidden sm:inline">Tháng này</span>
              <span className="sm:hidden">Tháng</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="total" className="mt-6 space-y-6">
            {/* Top 3 Podium */}
            {topThree.length >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-end justify-center gap-3 py-8 px-4"
              >
                {/* 2nd Place */}
                <div className="flex flex-col items-center w-28">
                  <div className="relative">
                    <div className={`w-18 h-18 rounded-2xl bg-gradient-to-br ${getAvatarGradient(topThree[1].id)} flex items-center justify-center text-white font-bold text-xl ring-4 ring-gray-400/50 shadow-xl`}>
                      {getInitial(topThree[1].username)}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-sm">2</span>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-foreground mt-4 truncate max-w-full text-center">{topThree[1].username}</p>
                  <p className={`text-xs ${getUserTopikLevel(topThree[1].points).textColor} font-medium`}>{getUserTopikLevel(topThree[1].points).name}</p>
                  <div className="mt-2 px-4 py-2 rounded-xl bg-gray-400/10 border border-gray-400/30">
                    <p className="text-base font-bold text-foreground">{topThree[1].points.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground text-center">điểm</p>
                  </div>
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center w-32 -mt-8">
                  <div className="relative">
                    <Crown className="w-10 h-10 mx-auto text-yellow-400 mb-2 drop-shadow-lg" />
                    <div className={`w-22 h-22 rounded-2xl bg-gradient-to-br ${getAvatarGradient(topThree[0].id)} flex items-center justify-center text-white font-bold text-2xl ring-4 ring-yellow-400/50 shadow-2xl shadow-yellow-500/30`}>
                      {getInitial(topThree[0].username)}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/40">
                      <span className="text-white font-bold">1</span>
                    </div>
                  </div>
                  <p className="text-base font-bold text-foreground mt-4 truncate max-w-full text-center">{topThree[0].username}</p>
                  <p className={`text-xs ${getUserTopikLevel(topThree[0].points).textColor} font-medium`}>{getUserTopikLevel(topThree[0].points).name}</p>
                  <div className="mt-2 px-5 py-3 rounded-xl bg-yellow-400/10 border border-yellow-400/30">
                    <p className="text-xl font-bold text-foreground">{topThree[0].points.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground text-center">điểm</p>
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center w-28">
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getAvatarGradient(topThree[2].id)} flex items-center justify-center text-white font-bold text-lg ring-4 ring-amber-600/50 shadow-xl`}>
                      {getInitial(topThree[2].username)}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-xs">3</span>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-foreground mt-4 truncate max-w-full text-center">{topThree[2].username}</p>
                  <p className={`text-xs ${getUserTopikLevel(topThree[2].points).textColor} font-medium`}>{getUserTopikLevel(topThree[2].points).name}</p>
                  <div className="mt-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <p className="text-sm font-bold text-foreground">{topThree[2].points.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground text-center">điểm</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Rankings List */}
            <div className="rounded-3xl border border-border/50 bg-card overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-gradient-to-r from-muted/50 to-muted/30 border-b border-border/50">
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Bảng xếp hạng đầy đủ
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">Top người học tiếng Hàn xuất sắc nhất</p>
              </div>
              <div className="divide-y divide-border/50">
                {rankings.map((user, index) => {
                  const rank = index + 4;
                  const topikLevel = getUserTopikLevel(user.points);
                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-all duration-200"
                    >
                      {getRankBadge(rank)}
                      
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarGradient(user.id)} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                        {getInitial(user.username)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base text-foreground truncate">{user.username}</p>
                        <p className={`text-sm font-medium ${topikLevel.textColor}`}>
                          {topikLevel.icon} {topikLevel.name}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold text-lg text-foreground">{user.points.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">điểm</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* TOPIK Level Tiers */}
            <div className="rounded-3xl border border-border/50 bg-card overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-gradient-to-r from-muted/50 to-muted/30 border-b border-border/50">
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Hệ thống cấp độ TOPIK
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">Kiếm điểm để lên cấp TOPIK của bạn</p>
              </div>
              <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {topikLevels.map((level) => (
                  <div
                    key={level.level}
                    className={`relative overflow-hidden rounded-2xl ${level.bgColor} p-4 border border-border/30 transition-transform hover:scale-105`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{level.icon}</span>
                      <div>
                        <p className={`font-bold text-base ${level.textColor}`}>{level.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {level.min.toLocaleString()}+ điểm
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="week" className="mt-6">
            <div className="text-center py-16 px-4">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-muted/50 flex items-center justify-center mb-4">
                <TrendingUp className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Bảng xếp hạng tuần này</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Xếp hạng được cập nhật vào thứ 2 hàng tuần. Hãy tiếp tục học để đạt thứ hạng cao!
              </p>
            </div>
          </TabsContent>

          <TabsContent value="month" className="mt-6">
            <div className="text-center py-16 px-4">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-muted/50 flex items-center justify-center mb-4">
                <Star className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Bảng xếp hạng tháng này</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Xếp hạng được cập nhật vào ngày 1 hàng tháng. Tiếp tục nỗ lực để dẫn đầu!
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Ranking;
