import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Swords, Link2, Brain, Users, Trophy, Zap, Crown, Lock, X, Loader2, Play, Timer, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import CleanHeader from "@/components/CleanHeader";
import CommonFooter from "@/components/CommonFooter";
import ChainReactionMultiplayer from "@/components/vocabulary/ChainReactionMultiplayer";
import SpeedQuizBattle from "@/components/battle/SpeedQuizBattle";
import WaitingRoomsList from "@/components/battle/WaitingRoomsList";
import GuestJoinedNotification from "@/components/battle/GuestJoinedNotification";
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
    id: "speed-quiz",
    nameKey: "battle.speedQuiz",
    nameKoKey: "battle.speedQuizKo",
    descriptionKey: "battle.speedQuizDesc",
    icon: Zap,
    available: true,
    gradient: "from-emerald-500 to-cyan-500",
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
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null = loading
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [initialRoomCode, setInitialRoomCode] = useState<string | undefined>();
  const [initialGuestName, setInitialGuestName] = useState<string | undefined>();

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
      toast.info(t("battle.comingSoon"), { description: t("battle.developing") });
      return;
    }

    if (!isLoggedIn) {
      toast.error(t("battle.loginRequired"), {
        description: t("battle.loginDesc"),
        action: {
          label: t("common.login"),
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
              setInitialGuestName(undefined);
            }}
            initialRoomCode={initialRoomCode}
            initialGuestName={initialGuestName}
          />
        </main>
      </div>
    );
  }

  if (selectedGame === "speed-quiz") {
    return (
      <div className="min-h-screen bg-background">
        <CleanHeader />
        <main className="container mx-auto px-4 py-6 pt-20">
          <SpeedQuizBattle
            onBack={() => {
              setSelectedGame(null);
              setInitialRoomCode(undefined);
              setInitialGuestName(undefined);
            }}
            initialRoomCode={initialRoomCode}
            initialGuestName={initialGuestName}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CleanHeader />

      {/* Guest Joined Notification for Hosts */}
      <GuestJoinedNotification 
        onStartGame={(roomCode, gameType) => {
          setInitialRoomCode(roomCode);
          setSelectedGame(gameType);
        }}
      />

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

        {/* Waiting Rooms List - Real-time Room Lobby */}
        {isLoggedIn && (
          <section className="container mx-auto px-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <WaitingRoomsList 
                isLoggedIn={!!isLoggedIn}
                onJoinRoom={(roomCode, gameType, guestName) => {
                  setInitialRoomCode(roomCode);
                  setInitialGuestName(guestName);
                  setSelectedGame(gameType);
                }}
              />
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
                    {/* Icon & Title */}
                    <div className="flex items-start gap-5 mb-6">
                      <div className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br ${game.gradient || "from-yellow-400 to-orange-500"} shadow-lg shadow-orange-500/20`}>
                        <game.icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
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

        {/* ===== DETAILED GAME GUIDE SECTION ===== */}
        <section className="container mx-auto px-4 mt-16 sm:mt-24">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="max-w-6xl mx-auto"
          >
            {/* Section Header */}
            <div className="text-center mb-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.5 }}
                className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-2xl shadow-purple-500/30"
              >
                <Trophy className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4">
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {t('battle.guide.title')}
                </span>
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                {t('battle.guide.subtitle')}
              </p>
            </div>

            {/* ===== GAME 1: Word Chain ===== */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-12"
            >
              <Card className="relative overflow-hidden border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 via-orange-500/5 to-transparent">
                {/* Glow effects */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-yellow-500/20 to-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-orange-500/15 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                
                <div className="relative p-6 sm:p-8 lg:p-12">
                  {/* Game Header */}
                  <div className="flex flex-wrap items-center gap-4 mb-8">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-xl shadow-orange-500/30">
                      <Link2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                        {t('battle.wordChain')}
                      </h3>
                      <p className="text-muted-foreground font-medium">{t('battle.wordChainKo')}</p>
                    </div>
                    <span className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm font-bold rounded-full shadow-lg">
                      🎮 LIVE
                    </span>
                  </div>

                  {/* Rules Grid */}
                  <div className="grid gap-6 lg:grid-cols-2 mb-8">
                    {/* How to Play */}
                    <div className="space-y-4">
                      <h4 className="text-xl font-bold flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-500">📖</span>
                        {t('battle.guide.howToPlay')}
                      </h4>
                      <div className="space-y-3 pl-10">
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                          <span className="w-6 h-6 rounded-full bg-yellow-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                          <p className="text-sm sm:text-base">{t('battle.guide.wordChain.step1')}</p>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                          <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                          <p className="text-sm sm:text-base">{t('battle.guide.wordChain.step2')}</p>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                          <span className="w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                          <p className="text-sm sm:text-base">{t('battle.guide.wordChain.step3')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Example */}
                    <div className="space-y-4">
                      <h4 className="text-xl font-bold flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-500">💡</span>
                        {t('battle.guide.example')}
                      </h4>
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border border-yellow-500/20">
                        <div className="flex items-center justify-center gap-2 flex-wrap text-lg sm:text-xl font-bold">
                          <span className="px-4 py-2 bg-card rounded-xl border border-border shadow-sm">사랑</span>
                          <span className="text-yellow-500">→</span>
                          <span className="px-4 py-2 bg-card rounded-xl border border-border shadow-sm">랑<span className="text-yellow-500">데</span>부</span>
                          <span className="text-yellow-500">→</span>
                          <span className="px-4 py-2 bg-card rounded-xl border border-border shadow-sm">부자</span>
                        </div>
                        <p className="text-center text-sm text-muted-foreground mt-3">
                          {t('battle.guide.wordChain.exampleDesc')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Rules Cards */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="p-4 rounded-xl bg-card/50 border border-border/50 text-center">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                        <Timer className="w-6 h-6 text-blue-500" />
                      </div>
                      <p className="font-bold text-lg">20{t('battle.guide.seconds')}</p>
                      <p className="text-xs text-muted-foreground">{t('battle.guide.perTurn')}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-card/50 border border-border/50 text-center">
                      <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                      </div>
                      <p className="font-bold text-lg">2{t('battle.guide.warnings')}</p>
                      <p className="text-xs text-muted-foreground">{t('battle.guide.warningLose')}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-card/50 border border-border/50 text-center">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">ㄴ→ㅇ</span>
                      </div>
                      <p className="font-bold text-lg">{t('battle.guide.dueumRule')}</p>
                      <p className="text-xs text-muted-foreground">{t('battle.guide.dueumDesc')}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/30 text-center">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-500/30">
                        <Crown className="w-6 h-6 text-white" />
                      </div>
                      <p className="font-bold text-lg text-yellow-600 dark:text-yellow-400">+1,000P</p>
                      <p className="text-xs text-muted-foreground">{t('battle.guide.winReward')}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* ===== GAME 2: Speed Quiz Battle ===== */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mb-12"
            >
              <Card className="relative overflow-hidden border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-cyan-500/5 to-transparent">
                {/* Glow effects */}
                <div className="absolute top-0 left-0 w-80 h-80 bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-cyan-500/15 to-transparent rounded-full blur-3xl translate-y-1/2 translate-x-1/2" />
                
                <div className="relative p-6 sm:p-8 lg:p-12">
                  {/* Game Header */}
                  <div className="flex flex-wrap items-center gap-4 mb-8">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-emerald-500/30">
                      <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        {t('battle.speedQuiz')}
                      </h3>
                      <p className="text-muted-foreground font-medium">{t('battle.speedQuizKo')}</p>
                    </div>
                    <span className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-bold rounded-full shadow-lg">
                      ⚡ SPEED
                    </span>
                  </div>

                  {/* Rules Grid */}
                  <div className="grid gap-6 lg:grid-cols-2 mb-8">
                    {/* How to Play */}
                    <div className="space-y-4">
                      <h4 className="text-xl font-bold flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500">📖</span>
                        {t('battle.guide.howToPlay')}
                      </h4>
                      <div className="space-y-3 pl-10">
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                          <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                          <p className="text-sm sm:text-base">{t('battle.guide.speedQuiz.step1')}</p>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                          <span className="w-6 h-6 rounded-full bg-cyan-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                          <p className="text-sm sm:text-base">{t('battle.guide.speedQuiz.step2')}</p>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                          <span className="w-6 h-6 rounded-full bg-teal-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                          <p className="text-sm sm:text-base">{t('battle.guide.speedQuiz.step3')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Example */}
                    <div className="space-y-4">
                      <h4 className="text-xl font-bold flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-500">💡</span>
                        {t('battle.guide.example')}
                      </h4>
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 border border-emerald-500/20">
                        <div className="space-y-3">
                          <div className="p-3 rounded-xl bg-card border border-border">
                            <p className="text-sm text-muted-foreground mb-2">Q. "감사하다"의 뜻은?</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <span className="px-3 py-2 bg-muted/50 rounded-lg">① 슬프다</span>
                              <span className="px-3 py-2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-500/30">② 고맙다 ✓</span>
                              <span className="px-3 py-2 bg-muted/50 rounded-lg">③ 화나다</span>
                              <span className="px-3 py-2 bg-muted/50 rounded-lg">④ 기쁘다</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-center text-sm text-muted-foreground mt-3">
                          {t('battle.guide.speedQuiz.exampleDesc')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Scoring Explanation */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/5 to-emerald-500/10 border border-emerald-500/20 mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h5 className="font-bold text-lg">{t('battle.guide.speedQuiz.scoring')}</h5>
                        <p className="text-sm text-muted-foreground">{t('battle.guide.speedQuiz.scoringDesc')}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-2xl">✅</span>
                        <div>
                          <p className="font-semibold text-emerald-600 dark:text-emerald-400">+10점</p>
                          <p className="text-xs text-muted-foreground">{t('battle.guide.speedQuiz.correctPoint')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                        <span className="text-2xl">⚡</span>
                        <div>
                          <p className="font-semibold text-cyan-600 dark:text-cyan-400">+5점 보너스</p>
                          <p className="text-xs text-muted-foreground">{t('battle.guide.speedQuiz.fastBonus')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rules Cards */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="p-4 rounded-xl bg-card/50 border border-border/50 text-center">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                        <span className="text-xl font-bold text-blue-500">10</span>
                      </div>
                      <p className="font-bold text-lg">{t('battle.guide.speedQuiz.totalQuestions')}</p>
                      <p className="text-xs text-muted-foreground">{t('battle.guide.speedQuiz.questionsDesc')}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-card/50 border border-border/50 text-center">
                      <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                        <Timer className="w-6 h-6 text-red-500" />
                      </div>
                      <p className="font-bold text-lg">10{t('battle.guide.seconds')}</p>
                      <p className="text-xs text-muted-foreground">{t('battle.guide.speedQuiz.timeLimit')}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-card/50 border border-border/50 text-center">
                      <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mx-auto mb-3">
                        <span className="text-xl">📚</span>
                      </div>
                      <p className="font-bold text-lg">{t('battle.guide.speedQuiz.quizTypes')}</p>
                      <p className="text-xs text-muted-foreground">{t('battle.guide.speedQuiz.quizTypesDesc')}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/30 text-center">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/30">
                        <Crown className="w-6 h-6 text-white" />
                      </div>
                      <p className="font-bold text-lg text-emerald-600 dark:text-emerald-400">+1,000P</p>
                      <p className="text-xs text-muted-foreground">{t('battle.guide.winReward')}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* ===== WIN STREAK BONUS SECTION ===== */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card className="relative overflow-hidden border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-orange-500/10">
                {/* Fire animation background */}
                <div className="absolute inset-0 -z-10">
                  <div className="absolute bottom-0 left-1/4 w-32 h-48 bg-gradient-to-t from-orange-500/30 via-yellow-500/20 to-transparent rounded-full blur-2xl animate-pulse" />
                  <div className="absolute bottom-0 right-1/4 w-32 h-48 bg-gradient-to-t from-red-500/30 via-orange-500/20 to-transparent rounded-full blur-2xl animate-pulse delay-300" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gradient-to-b from-amber-500/20 to-transparent rounded-full blur-3xl" />
                </div>

                <div className="relative p-6 sm:p-8 lg:p-12">
                  {/* Header */}
                  <div className="text-center mb-10">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 mb-6 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 shadow-2xl shadow-orange-500/40"
                    >
                      <span className="text-4xl sm:text-5xl">🔥</span>
                    </motion.div>
                    <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-3">
                      <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                        {t('battle.guide.streakTitle')}
                      </span>
                    </h3>
                    <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                      {t('battle.guide.streakDesc')}
                    </p>
                  </div>

                  {/* Streak Tiers */}
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
                    {/* 3 Wins */}
                    <motion.div
                      whileHover={{ scale: 1.03, y: -5 }}
                      className="relative p-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border-2 border-amber-500/40 text-center group"
                    >
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-sm font-bold rounded-full shadow-lg">
                        3{t('battle.guide.consecutiveWins')}
                      </div>
                      <div className="mt-4 mb-4">
                        <span className="text-5xl sm:text-6xl">🔥</span>
                      </div>
                      <p className="text-3xl sm:text-4xl font-black text-amber-500 mb-2">+500P</p>
                      <p className="text-sm text-muted-foreground">{t('battle.guide.bonusPoints')}</p>
                    </motion.div>

                    {/* 4 Wins */}
                    <motion.div
                      whileHover={{ scale: 1.03, y: -5 }}
                      className="relative p-6 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border-2 border-orange-500/40 text-center group"
                    >
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-orange-400 to-amber-500 text-white text-sm font-bold rounded-full shadow-lg">
                        4{t('battle.guide.consecutiveWins')}
                      </div>
                      <div className="mt-4 mb-4">
                        <span className="text-5xl sm:text-6xl">🔥🔥</span>
                      </div>
                      <p className="text-3xl sm:text-4xl font-black text-orange-500 mb-2">+750P</p>
                      <p className="text-sm text-muted-foreground">{t('battle.guide.bonusPoints')}</p>
                    </motion.div>

                    {/* 5+ Wins */}
                    <motion.div
                      whileHover={{ scale: 1.03, y: -5 }}
                      className="relative p-6 rounded-2xl bg-gradient-to-br from-red-500/20 via-orange-500/15 to-amber-500/10 border-2 border-red-500/40 text-center sm:col-span-2 lg:col-span-1 group"
                    >
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-bold rounded-full shadow-lg animate-pulse">
                        5+{t('battle.guide.consecutiveWins')}
                      </div>
                      <div className="mt-4 mb-4">
                        <span className="text-5xl sm:text-6xl">🔥🔥🔥</span>
                      </div>
                      <p className="text-3xl sm:text-4xl font-black text-red-500 mb-2">+1,000P</p>
                      <p className="text-sm text-muted-foreground">{t('battle.guide.maxBonus')}</p>
                    </motion.div>
                  </div>

                  {/* Note */}
                  <div className="mt-8 text-center">
                    <p className="text-sm text-muted-foreground inline-flex items-center gap-2 px-4 py-2 bg-muted/30 rounded-full">
                      <span>💡</span>
                      {t('battle.guide.streakNote')}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* ===== QUICK RULES SUMMARY ===== */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-12"
            >
              <Card className="relative overflow-hidden bg-gradient-to-br from-card via-card to-muted/30 border-border/50">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />
                
                <div className="p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-black">{t('battle.guide.quickRules')}</h3>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-semibold">{t('battle.guide.players')}</p>
                        <p className="text-xs text-muted-foreground">{t('battle.guide.playersDesc')}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                      <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                        <Timer className="w-5 h-5 text-yellow-500" />
                      </div>
                      <div>
                        <p className="font-semibold">{t('battle.guide.timeLimit')}</p>
                        <p className="text-xs text-muted-foreground">{t('battle.guide.timeLimitDesc')}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                      <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <p className="font-semibold">{t('battle.guide.warningSystem')}</p>
                        <p className="text-xs text-muted-foreground">{t('battle.guide.warningSystemDesc')}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Trophy className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-yellow-600 dark:text-yellow-400">{t('battle.guide.rewards')}</p>
                        <p className="text-xs text-muted-foreground">{t('battle.guide.rewardsDesc')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <CommonFooter />
    </div>
  );
}
