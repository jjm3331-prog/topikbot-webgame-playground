import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Swords, Link2, Brain, Users, Trophy, Zap, Crown, Lock, X, Loader2, Play, Timer, AlertTriangle } from "lucide-react";
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
  nameKey: string;
  nameKoKey: string;
  descriptionKey: string;
  icon: React.ElementType;
  available: boolean;
  comingSoon?: boolean;
  gradient?: string;
}

const battleGames: BattleGame[] = [
  {
    id: "word-chain",
    nameKey: "battle.wordChain",
    nameKoKey: "battle.wordChainKo",
    descriptionKey: "battle.wordChainDesc",
    icon: Link2,
    available: true,
    gradient: "from-yellow-400 to-orange-500",
  },
  {
    id: "semantic",
    nameKey: "battle.semantic",
    nameKoKey: "battle.semanticKo",
    descriptionKey: "battle.semanticDesc",
    icon: Brain,
    available: true,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    id: "speed-quiz",
    nameKey: "battle.speedQuiz",
    nameKoKey: "battle.speedQuizKo",
    descriptionKey: "battle.speedQuizDesc",
    icon: Zap,
    available: false,
    comingSoon: true,
  },
  {
    id: "dictation",
    nameKey: "battle.dictation",
    nameKoKey: "battle.dictationKo",
    descriptionKey: "battle.dictationDesc",
    icon: Crown,
    available: false,
    comingSoon: true,
  },
];

interface RoomInfo {
  host_name: string;
  status: string;
  guest_id: string | null;
}

export default function Battle() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null = loading
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [initialRoomCode, setInitialRoomCode] = useState<string | undefined>();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteGame, setInviteGame] = useState<string | null>(null);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  // Check URL params for room code + sessionStorage fallback for OAuth callbacks
  useEffect(() => {
    let roomCode = searchParams.get("room");
    let game = searchParams.get("game");

    // If no URL params, try sessionStorage (OAuth callback may lose query string)
    if (!roomCode) {
      const storedInvite = sessionStorage.getItem("battle_invite");
      if (storedInvite) {
        try {
          const parsed = JSON.parse(storedInvite);
          roomCode = parsed.room;
          game = parsed.game;
        } catch {}
      }
    }

    if (!roomCode) return;

    // Store invite info for potential OAuth callback
    sessionStorage.setItem("battle_invite", JSON.stringify({ room: roomCode.toUpperCase(), game: game || "word-chain" }));

    setInitialRoomCode(roomCode.toUpperCase());
    setInviteGame(game === "semantic" ? "semantic" : "word-chain");
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

  // Fetch room info when we have a room code
  useEffect(() => {
    if (!initialRoomCode) return;

    const fetchRoomInfo = async () => {
      setLoadingRoom(true);
      setRoomError(null);

      try {
        const connectionMode = inviteGame === "semantic" ? "semantic" : "phonetic";
        const { data, error } = await supabase
          .from("chain_reaction_rooms")
          .select("host_name, status, guest_id")
          .eq("room_code", initialRoomCode)
          .eq("connection_mode", connectionMode)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setRoomError(t('battle.roomNotExists'));
        } else if (data.status === "playing" || data.status === "finished") {
          setRoomError(t('battle.roomStartedOrFinished'));
        } else if (data.guest_id) {
          setRoomError(t('battle.roomFull'));
        } else {
          setRoomInfo(data);
        }
      } catch (err) {
        setRoomError(t('battle.roomNotAvailable'));
      } finally {
        setLoadingRoom(false);
      }
    };

    fetchRoomInfo();
  }, [initialRoomCode, inviteGame, t]);

  // Handle invite flow: redirect to auth if not logged in, show modal if logged in
  useEffect(() => {
    if (isLoggedIn === null) return; // Still loading auth state
    if (!initialRoomCode) return; // No invite

    if (!isLoggedIn) {
      // Redirect to auth with return URL
      const currentPath = `/battle?game=${inviteGame || "word-chain"}&room=${initialRoomCode}`;
      navigate(`/auth?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    // Logged in with invite → show modal
    setShowInviteModal(true);
  }, [isLoggedIn, initialRoomCode, inviteGame, navigate]);

  const handleJoinFromInvite = () => {
    setJoiningRoom(true);
    setShowInviteModal(false);
    // Clear the stored invite after joining
    sessionStorage.removeItem("battle_invite");
    setSelectedGame(inviteGame || "word-chain");
  };

  const handleCloseInviteModal = () => {
    setShowInviteModal(false);
    setInitialRoomCode(undefined);
    setInviteGame(null);
    setRoomInfo(null);
    setRoomError(null);
    // Clear stored invite
    sessionStorage.removeItem("battle_invite");
    // Clear URL params
    navigate("/battle", { replace: true });
  };

  const handleSelectGame = (game: BattleGame) => {
    if (!game.available) {
      toast.info(t('battle.comingSoon'), { description: t('battle.developing') });
      return;
    }

    if (!isLoggedIn) {
      toast.error(t('battle.loginRequired'), {
        description: t('battle.loginDesc'),
        action: {
          label: t('common.login'),
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

      {/* Premium Invite Modal Popup */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={handleCloseInviteModal}
          >
            {/* Backdrop with blur */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md"
            >
              {/* Card with glass morphism */}
              <div className="relative bg-card/95 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 -z-10">
                  <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-30 ${inviteGame === "semantic" ? "bg-purple-500" : "bg-orange-500"}`} />
                  <div className={`absolute bottom-0 left-0 w-48 h-48 rounded-full blur-3xl opacity-20 ${inviteGame === "semantic" ? "bg-pink-500" : "bg-yellow-500"}`} />
                </div>
                
                {/* Close button */}
                <button
                  onClick={handleCloseInviteModal}
                  className="absolute top-4 right-4 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors z-10"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>

                {/* Header */}
                <div className="pt-8 pb-6 px-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.1 }}
                    className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${inviteGame === "semantic" ? "from-purple-500 to-pink-500" : "from-yellow-400 to-orange-500"} flex items-center justify-center mx-auto mb-5 shadow-xl ${inviteGame === "semantic" ? "shadow-purple-500/30" : "shadow-orange-500/30"}`}
                  >
                    {inviteGame === "semantic" ? (
                      <Brain className="w-10 h-10 text-white" />
                    ) : (
                      <Link2 className="w-10 h-10 text-white" />
                    )}
                  </motion.div>
                  
                  <h2 className={`text-2xl sm:text-3xl font-black mb-1 bg-gradient-to-r ${inviteGame === "semantic" ? "from-purple-400 to-pink-400" : "from-yellow-400 to-orange-400"} bg-clip-text text-transparent`}>
                    {t(inviteGame === "semantic" ? 'battle.semantic' : 'battle.wordChain')}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {t(inviteGame === "semantic" ? 'battle.semanticKo' : 'battle.wordChainKo')}
                  </p>
                </div>

                {/* Content */}
                <div className="px-6 pb-8">
                  {loadingRoom ? (
                    <div className="py-8 text-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className={`w-16 h-16 rounded-full border-4 border-muted ${inviteGame === "semantic" ? "border-t-purple-500" : "border-t-orange-500"} mx-auto mb-4`}
                      />
                      <p className="text-muted-foreground">{t('battle.loadingRoom')}</p>
                    </div>
                  ) : roomError ? (
                    <div className="py-6 text-center">
                      <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <X className="w-8 h-8 text-destructive" />
                      </div>
                      <p className="text-destructive font-bold text-lg mb-2">{roomError}</p>
                      <p className="text-sm text-muted-foreground mb-6">
                        {t('battle.roomNotAvailable')}
                      </p>
                      <Button
                        onClick={handleCloseInviteModal}
                        variant="outline"
                        className="w-full h-12"
                      >
                        {t('battle.close')}
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Host info card */}
                      {roomInfo && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="mb-6 p-5 bg-gradient-to-br from-muted/50 to-muted/30 rounded-2xl border border-border/50"
                        >
                          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">{t('battle.hostWaiting')}</p>
                          <div className="flex items-center justify-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                              <Crown className="w-6 h-6 text-white" />
                            </div>
                            <span className="font-black text-2xl">{roomInfo.host_name}</span>
                          </div>
                        </motion.div>
                      )}

                      {/* Room code display */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mb-6 text-center"
                      >
                        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">{t('battle.roomCode')}</p>
                        <p className={`text-4xl sm:text-5xl font-mono font-black tracking-[0.3em] bg-gradient-to-r ${inviteGame === "semantic" ? "from-purple-400 to-pink-400" : "from-yellow-400 to-orange-400"} bg-clip-text text-transparent`}>
                          {initialRoomCode}
                        </p>
                      </motion.div>

                      {/* Join button */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          onClick={handleJoinFromInvite}
                          disabled={joiningRoom || !roomInfo}
                          className={`w-full h-16 text-xl font-black rounded-2xl bg-gradient-to-r ${inviteGame === "semantic" ? "from-purple-500 to-pink-500 shadow-purple-500/30" : "from-yellow-400 to-orange-500 shadow-orange-500/30"} hover:opacity-90 text-white shadow-xl`}
                        >
                          {joiningRoom ? (
                            <Loader2 className="w-7 h-7 animate-spin" />
                          ) : (
                            <>
                              <Play className="w-7 h-7 mr-3" />
                              {t('battle.joinNow')}
                            </>
                          )}
                        </Button>
                      </motion.div>

                      {/* Rules reminder */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-6 flex items-center justify-center gap-4 text-sm text-muted-foreground"
                      >
                        <div className="flex items-center gap-1.5">
                          <Timer className="w-4 h-4" />
                          <span>{t('battle.secondsPerTurn')}</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" />
                          <span>{t('battle.warnings')}</span>
                        </div>
                      </motion.div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <main className="pt-20 pb-24">
        {/* Hero Section - Full Width Premium Gradient */}
        <section className="relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-gradient-to-br from-yellow-500/20 via-orange-500/15 to-red-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-tr from-purple-500/15 via-pink-500/10 to-transparent rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 py-16 sm:py-24">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-3xl mx-auto"
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 mb-6 rounded-2xl bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 shadow-2xl shadow-orange-500/30"
              >
                <Swords className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </motion.div>
              
              {/* Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-4">
                <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                  {t('battle.heroTitle')}
                </span>
              </h1>
              
              {/* Subtitle */}
              <p className="text-xl sm:text-2xl text-muted-foreground mb-8">
                {t('battle.heroSubtitle')}
              </p>
              
              {/* Points Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 border border-yellow-500/30 rounded-2xl backdrop-blur-sm"
              >
                <Trophy className="w-6 h-6 text-yellow-500" />
                <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  {t('battle.heroSubtitle')}
                </span>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Login CTA if not logged in */}
        {!isLoggedIn && (
          <section className="container mx-auto px-4 -mt-8 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-6 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{t('battle.loginRequired')}</p>
                      <p className="text-sm text-muted-foreground">{t('battle.loginToPlay')}</p>
                    </div>
                  </div>
                  <Button onClick={() => navigate("/auth")} size="lg" className="px-8">
                    {t('common.login')}
                  </Button>
                </div>
              </Card>
            </motion.div>
          </section>
        )}

        {/* Game Cards - Premium Grid */}
        <section className="container mx-auto px-4">
          <div className="grid gap-6 lg:gap-8 md:grid-cols-2 max-w-5xl mx-auto">
            {battleGames.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
              >
                <Card
                  className={`group relative overflow-hidden transition-all duration-500 ${
                    game.available
                      ? "cursor-pointer hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/10"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                  onClick={() => handleSelectGame(game)}
                >
                  {/* Premium Glow Effect */}
                  {game.available && (
                    <div className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className={`absolute inset-0 bg-gradient-to-br ${game.gradient || "from-yellow-500/10 to-orange-500/10"}`} />
                      <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${game.gradient || "from-yellow-500/30 to-orange-500/30"} rounded-full blur-3xl opacity-50 translate-x-1/2 -translate-y-1/2`} />
                    </div>
                  )}

                  {/* Border Gradient */}
                  {game.available && (
                    <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r ${game.gradient} p-[1px] -z-10`}>
                      <div className="absolute inset-[1px] bg-card rounded-xl" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-6 sm:p-8">
                    {/* Coming Soon Badge */}
                    {game.comingSoon && (
                      <div className="absolute top-4 right-4">
                        <span className="px-3 py-1.5 text-xs font-bold bg-muted text-muted-foreground rounded-full border border-border">
                          {t('battle.comingSoon')}
                        </span>
                      </div>
                    )}

                    {/* Icon & Title */}
                    <div className="flex items-start gap-5 mb-6">
                      <div className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center ${
                        game.available
                          ? `bg-gradient-to-br ${game.gradient || "from-yellow-400 to-orange-500"} shadow-lg shadow-orange-500/20`
                          : "bg-muted"
                      }`}>
                        {game.available ? (
                          <game.icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                        ) : (
                          <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-1 pt-1">
                        <h3 className="text-2xl sm:text-3xl font-black mb-1 group-hover:text-primary transition-colors">
                          {t(game.nameKey)}
                        </h3>
                        <p className="text-sm text-muted-foreground font-medium">{t(game.nameKoKey)}</p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                      {t(game.descriptionKey)}
                    </p>

                    {/* Play Button */}
                    {game.available && (
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          className={`w-full h-14 text-lg font-bold gap-3 bg-gradient-to-r ${game.gradient || "from-yellow-500 to-orange-500"} hover:opacity-90 shadow-lg transition-all duration-300`}
                        >
                          <Swords className="w-5 h-5" />
                          {t('common.playNow')}
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Rules Section - Premium Card */}
        <section className="container mx-auto px-4 mt-12 sm:mt-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="max-w-3xl mx-auto"
          >
            <Card className="relative overflow-hidden bg-gradient-to-br from-card via-card to-muted/30 border-border/50">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-yellow-500/10 to-orange-500/5 rounded-full blur-3xl" />
              
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black">{t('battle.rules')}</h2>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{t('battle.loginRequired')}</p>
                      <p className="text-sm text-muted-foreground">{t('battle.loginDesc')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{t('battle.secondsPerTurn')}</p>
                      <p className="text-sm text-muted-foreground">{t('battle.howToPlay')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                      <X className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{t('battle.warnings')}</p>
                      <p className="text-sm text-muted-foreground">{t('battle.developing')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20">
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-yellow-600 dark:text-yellow-400">{t('battle.winPoints')}</p>
                      <p className="text-sm text-muted-foreground">{t('battle.heroSubtitle')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </section>
      </main>

      <CommonFooter />
    </div>
  );
}
