import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Link2, 
  Brain, 
  Users, 
  Loader2, 
  RefreshCw, 
  Crown,
  Swords,
  Clock,
  Zap,
  X,
  Trophy,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getGameStats, type GameStats } from "@/lib/gameRecords";

interface WaitingRoom {
  id: string;
  room_code: string;
  host_id: string;
  host_name: string;
  connection_mode: string;
  created_at: string;
}

interface WaitingRoomsListProps {
  onJoinRoom: (roomCode: string, gameType: string, guestName?: string) => void;
  isLoggedIn: boolean;
}

// 1시간 = 3,600,000ms (오래된 방 빠르게 정리)
const MAX_ROOM_AGE_MS = 1 * 60 * 60 * 1000;

export default function WaitingRoomsList({ onJoinRoom, isLoggedIn }: WaitingRoomsListProps) {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<WaitingRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<WaitingRoom | null>(null);
  const [guestNickname, setGuestNickname] = useState("");
  const [myStats, setMyStats] = useState<GameStats | null>(null);

  // Fetch user's battle stats
  useEffect(() => {
    const fetchMyStats = async () => {
      if (!isLoggedIn) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const stats = await getGameStats(session.user.id);
          setMyStats(stats);
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    };
    fetchMyStats();
  }, [isLoggedIn]);

  // Clean up old rooms (24시간 이상 된 waiting 방 삭제)
  const cleanupOldRooms = async () => {
    try {
      const maxAgeAgo = new Date(Date.now() - MAX_ROOM_AGE_MS).toISOString();

      // Delete old waiting rooms that have no guest
      await supabase
        .from("chain_reaction_rooms")
        .delete()
        .eq("status", "waiting")
        .is("guest_id", null)
        .lt("created_at", maxAgeAgo);

      console.log("[WaitingRooms] Cleaned up old rooms");
    } catch (err) {
      console.error("Failed to cleanup old rooms:", err);
    }
  };

  // Fetch waiting rooms (최근 24시간 이내만)
  const fetchRooms = async () => {
    setLoading(true);
    try {
      // First cleanup old rooms
      await cleanupOldRooms();

      const maxAgeAgo = new Date(Date.now() - MAX_ROOM_AGE_MS).toISOString();

      const { data, error } = await supabase
        .from("chain_reaction_rooms")
        .select("id, room_code, host_id, host_name, connection_mode, created_at")
        .eq("status", "waiting")
        .is("guest_id", null)
        .gte("created_at", maxAgeAgo)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setRooms(data || []);
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchRooms();
    
    // Refresh every 30 seconds to keep list fresh
    const interval = setInterval(fetchRooms, 30000);
    return () => clearInterval(interval);
  }, []);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("waiting-rooms-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chain_reaction_rooms",
        },
        (payload) => {
          console.log("[WaitingRooms] change:", payload.eventType);
          // Refetch on any change
          fetchRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Generate random nickname
  const generateRandomNickname = () => {
    const adjectives = ["빠른", "용감한", "똑똒한", "귀여운", "멋진", "신나는", "활발한", "재미있는"];
    const nouns = ["호랑이", "토끼", "용", "펭귄", "고양이", "강아지", "여우", "곰"];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj}${noun}${num}`;
  };

  const openNicknameDialog = (room: WaitingRoom) => {
    if (!isLoggedIn) {
      toast.error(t('battle.loginRequired'), {
        description: t('battle.loginDesc'),
      });
      return;
    }
    setSelectedRoom(room);
    setGuestNickname(generateRandomNickname());
  };

  const confirmJoin = () => {
    if (!selectedRoom || !guestNickname.trim()) {
      toast.error(t('battle.semanticGame.enterName'));
      return;
    }
    setJoining(selectedRoom.id);
    let gameType = "word-chain";
    if (selectedRoom.connection_mode === "semantic") {
      gameType = "semantic";
    } else if (selectedRoom.connection_mode === "speed_quiz") {
      gameType = "speed-quiz";
    }
    onJoinRoom(selectedRoom.room_code, gameType, guestNickname.trim());
    setSelectedRoom(null);
    setGuestNickname("");
  };

  const cancelJoin = () => {
    setSelectedRoom(null);
    setGuestNickname("");
  };

  const getGameIcon = (mode: string) => {
    if (mode === "semantic") return Brain;
    if (mode === "speed_quiz") return Zap;
    return Link2;
  };

  const getGameGradient = (mode: string) => {
    if (mode === "semantic") return "from-purple-500 to-pink-500";
    if (mode === "speed_quiz") return "from-emerald-500 to-cyan-500";
    return "from-yellow-400 to-orange-500";
  };

  const getGameKey = (mode: string) => {
    if (mode === "semantic") return "battle.semantic";
    if (mode === "speed_quiz") return "battle.speedQuiz";
    return "battle.wordChain";
  };

  const getTimeSince = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t('battle.justNow');
    if (minutes < 60) return `${minutes}${t('battle.minutesAgo')}`;
    return `${Math.floor(minutes / 60)}${t('battle.hoursAgo')}`;
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">{t('battle.loadingRooms')}</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      {/* Nickname Dialog */}
      <AnimatePresence>
        {selectedRoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={cancelJoin}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm"
            >
              <Card className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{t('battle.enterGuestNickname')}</h3>
                  <Button variant="ghost" size="icon" onClick={cancelJoin}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">vs</p>
                      <p className="font-bold">{selectedRoom.host_name}</p>
                    </div>
                  </div>

                  <Input
                    value={guestNickname}
                    onChange={(e) => setGuestNickname(e.target.value)}
                    placeholder={t('battle.enterNicknamePlaceholder')}
                    className="text-lg h-12"
                    maxLength={20}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && confirmJoin()}
                  />
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={cancelJoin} className="flex-1">
                    {t('battle.semanticGame.cancel')}
                  </Button>
                  <Button
                    onClick={confirmJoin}
                    disabled={!guestNickname.trim()}
                    className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    {t('battle.joinWithNickname')}
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* My Stats Card */}
      {isLoggedIn && myStats && myStats.totalGames > 0 && (
        <Card className="p-4 mb-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">{t('battle.myBattleStats')}</h4>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="text-green-500 font-medium">{myStats.wins}{t('battle.winsShort')}</span>
                  <span className="text-red-500 font-medium">{myStats.losses}{t('battle.lossesShort')}</span>
                  <span className="text-yellow-500 font-medium">{myStats.draws}{t('battle.drawsShort')}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-lg font-bold text-primary">{myStats.winRate}%</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{t('battle.winRateLabel')}</p>
            </div>
          </div>
          
          {/* Current Win Streak Display */}
          {myStats.currentStreak >= 2 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20">
                <span className="text-lg">🔥</span>
                <span className="font-bold text-orange-500">{t('battle.currentStreak', { count: myStats.currentStreak })}</span>
                {myStats.currentStreak >= 3 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-600 font-medium">
                    +{myStats.currentStreak >= 5 ? '1,000' : myStats.currentStreak >= 4 ? '750' : '500'}P
                  </span>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-muted/50 to-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{t('battle.waitingRooms')}</h3>
            <p className="text-sm text-muted-foreground">
              {rooms.length > 0 
                ? t('battle.roomsAvailable', { count: rooms.length })
                : t('battle.noRoomsAvailable')
              }
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={fetchRooms}
          className="hover:bg-muted"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Room List */}
      <div className="p-4 sm:p-6">
        {rooms.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Swords className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">{t('battle.noRoomsYet')}</p>
            <p className="text-sm text-muted-foreground">{t('battle.createRoomHint')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {rooms.map((room, index) => {
                const GameIcon = getGameIcon(room.connection_mode);
                const gradient = getGameGradient(room.connection_mode);
                const gameKey = getGameKey(room.connection_mode);

                return (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div 
                      className={`group relative p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer ${
                        joining === room.id ? "opacity-50 pointer-events-none" : ""
                      }`}
                      onClick={() => openNicknameDialog(room)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Game Icon */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
                          <GameIcon className="w-6 h-6 text-white" />
                        </div>

                        {/* Room Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
                              {t(gameKey)}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-medium">
                              {t('battle.waiting')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Crown className="w-3.5 h-3.5 text-yellow-500" />
                            <span className="font-medium truncate">{room.host_name}</span>
                            <span className="text-xs">•</span>
                            <Clock className="w-3 h-3" />
                            <span className="text-xs">{getTimeSince(room.created_at)}</span>
                          </div>
                        </div>

                        {/* Join Button */}
                        <div className="flex-shrink-0">
                          {joining === room.id ? (
                            <div className="w-10 h-10 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 animate-spin" />
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              className={`bg-gradient-to-r ${gradient} hover:opacity-90 text-white shadow-lg gap-1.5`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openNicknameDialog(room);
                              }}
                            >
                              <Zap className="w-4 h-4" />
                              {t('battle.quickJoin')}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Hover Effect */}
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-5 transition-opacity -z-10`} />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Card>
    </>
  );
}
