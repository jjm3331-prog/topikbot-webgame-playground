import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { 
  Play, 
  Users, 
  Link2, 
  Brain,
  Crown,
  Swords,
  X,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WaitingRoom {
  id: string;
  room_code: string;
  host_id: string;
  host_name: string;
  guest_id: string | null;
  guest_name: string | null;
  connection_mode: string;
  status: string;
}

interface GuestJoinedNotificationProps {
  onStartGame: (roomCode: string, gameType: string) => void;
}

export default function GuestJoinedNotification({ onStartGame }: GuestJoinedNotificationProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [myHostedRoom, setMyHostedRoom] = useState<WaitingRoom | null>(null);
  const [guestJoined, setGuestJoined] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);

  // Get current user's player ID from localStorage or session
  useEffect(() => {
    // Check if there's a hosted room in localStorage
    const storedRoom = localStorage.getItem("my_hosted_battle_room");
    if (storedRoom) {
      try {
        const parsed = JSON.parse(storedRoom);
        setPlayerId(parsed.playerId);
        fetchMyRoom(parsed.roomId);
      } catch (e) {
        localStorage.removeItem("my_hosted_battle_room");
      }
    }
  }, []);

  const fetchMyRoom = async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from("chain_reaction_rooms")
        .select("*")
        .eq("id", roomId)
        .maybeSingle();

      if (error || !data) {
        localStorage.removeItem("my_hosted_battle_room");
        return;
      }

      // Room exists and is still waiting
      if (data.status === "waiting") {
        setMyHostedRoom(data as WaitingRoom);
        
        // If guest already joined, show notification
        if (data.guest_id && data.guest_name) {
          setGuestJoined(true);
          setShowPopup(true);
        }
        
        // Subscribe to room changes
        subscribeToRoom(roomId);
      } else {
        // Room is no longer waiting (playing/finished), clear it
        localStorage.removeItem("my_hosted_battle_room");
      }
    } catch (err) {
      console.error("Error fetching room:", err);
    }
  };

  const subscribeToRoom = (roomId: string) => {
    const channel = supabase
      .channel(`host-room-notification-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chain_reaction_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const newRoom = payload.new as WaitingRoom;
          setMyHostedRoom(newRoom);

          // Check if guest just joined
          if (newRoom.guest_id && newRoom.guest_name && !guestJoined) {
            setGuestJoined(true);
            setShowPopup(true);
            
            // Play notification sound
            playNotificationSound();
            
            // Show toast notification too
            toast.success(t("battle.guestJoinedTitle"), {
              description: t("battle.guestJoinedDesc", { name: newRoom.guest_name }),
              duration: 10000,
              action: {
                label: t("battle.startNow"),
                onClick: () => handleStartGame(newRoom),
              },
            });
          }

          // If room is no longer waiting, clean up
          if (newRoom.status !== "waiting") {
            localStorage.removeItem("my_hosted_battle_room");
            setShowPopup(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Play a pleasant notification melody
      const playNote = (freq: number, startTime: number, duration: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + startTime);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + duration);
        oscillator.start(audioContext.currentTime + startTime);
        oscillator.stop(audioContext.currentTime + startTime + duration);
      };

      playNote(523, 0, 0.15);    // C5
      playNote(659, 0.15, 0.15); // E5
      playNote(784, 0.3, 0.3);   // G5
      
      // Vibrate if supported
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 200]);
      }
    } catch (e) {
      console.log("Audio not supported");
    }
  };

  const handleStartGame = (room: WaitingRoom) => {
    setShowPopup(false);
    localStorage.removeItem("my_hosted_battle_room");
    const gameType = room.connection_mode === "semantic" ? "semantic" : "word-chain";
    onStartGame(room.room_code, gameType);
  };

  const handleDismiss = () => {
    setShowPopup(false);
  };

  const getGameIcon = (mode: string) => {
    return mode === "semantic" ? Brain : Link2;
  };

  const getGameGradient = (mode: string) => {
    return mode === "semantic" 
      ? "from-purple-500 to-pink-500" 
      : "from-yellow-400 to-orange-500";
  };

  if (!showPopup || !myHostedRoom) return null;

  const GameIcon = getGameIcon(myHostedRoom.connection_mode);
  const gradient = getGameGradient(myHostedRoom.connection_mode);

  return (
    <AnimatePresence>
      {showPopup && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={handleDismiss}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[101] max-w-md mx-auto"
          >
            <div className="relative bg-card/95 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl overflow-hidden">
              {/* Background Effects */}
              <div className="absolute inset-0 -z-10">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl bg-gradient-to-br ${gradient}`}
                />
              </div>

              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors z-10"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>

              {/* Content */}
              <div className="p-6 pt-8 text-center">
                {/* Animated Bell Icon */}
                <motion.div
                  animate={{ 
                    rotate: [0, -10, 10, -10, 0],
                  }}
                  transition={{ duration: 0.5, repeat: 3 }}
                  className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mx-auto mb-5 shadow-xl`}
                >
                  <Bell className="w-10 h-10 text-white" />
                </motion.div>

                <h2 className="text-2xl font-black mb-2">
                  {t("battle.opponentReady")} 🎮
                </h2>
                
                <p className="text-muted-foreground mb-6">
                  {t("battle.guestJoinedDesc", { name: myHostedRoom.guest_name })}
                </p>

                {/* Guest info */}
                <div className="p-4 bg-muted/50 rounded-2xl mb-6">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground">{t("battle.challenger")}</p>
                      <p className="font-bold text-lg">{myHostedRoom.guest_name}</p>
                    </div>
                  </div>
                </div>

                {/* Start Game Button */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={() => handleStartGame(myHostedRoom)}
                    className={`w-full h-16 text-xl font-black rounded-2xl bg-gradient-to-r ${gradient} hover:opacity-90 text-white shadow-xl`}
                  >
                    <Play className="w-7 h-7 mr-3" />
                    {t("battle.startGame")}
                  </Button>
                </motion.div>

                {/* Game type indicator */}
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <GameIcon className="w-4 h-4" />
                  <span>
                    {t(myHostedRoom.connection_mode === "semantic" ? "battle.semantic" : "battle.wordChain")}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Utility function to save hosted room info
export function saveHostedRoom(roomId: string, playerId: string) {
  localStorage.setItem("my_hosted_battle_room", JSON.stringify({
    roomId,
    playerId,
    createdAt: Date.now()
  }));
}

// Utility function to clear hosted room
export function clearHostedRoom() {
  localStorage.removeItem("my_hosted_battle_room");
}
