import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Store,
  Coffee,
  UtensilsCrossed,
  Monitor,
  BookOpen,
  Send,
  Loader2,
  Coins,
  Star,
  MessageCircle,
  Lightbulb,
  Trophy,
  Heart,
  Briefcase,
  Sparkles,
  ArrowRight,
  Zap,
  Target,
  TrendingUp,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";

type JobType = 'convenience_store' | 'cafe' | 'restaurant' | 'pc_bang' | 'bookstore';
type Difficulty = 'easy' | 'medium' | 'hard';
type GameState = 'select_job' | 'select_difficulty' | 'playing' | 'evaluating' | 'result' | 'game_over';

interface Scenario {
  customer_type: string;
  customer_line_ko: string;
  customer_line_vi: string;
  situation_hint_ko: string;
  situation_hint_vi: string;
  expected_response_hint_ko: string;
  expected_response_hint_vi: string;
  job_name_ko: string;
  job_name_vi: string;
}

interface Evaluation {
  score: number;
  grade: string;
  earned_money: number;
  feedback_ko: string;
  feedback_vi: string;
  better_response_ko: string;
  better_response_vi: string;
  language_tips: Array<{
    wrong: string;
    correct: string;
    explanation_ko: string;
    explanation_vi: string;
  }>;
  customer_reaction_ko: string;
  customer_reaction_vi: string;
}

const JOBS = [
  { id: 'convenience_store' as JobType, icon: Store, emoji: '🏪', color: 'from-orange-500 to-amber-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', iconBg: 'bg-gradient-to-br from-orange-400 to-red-500' },
  { id: 'cafe' as JobType, icon: Coffee, emoji: '☕', color: 'from-amber-500 to-yellow-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', iconBg: 'bg-gradient-to-br from-amber-400 to-yellow-500' },
  { id: 'restaurant' as JobType, icon: UtensilsCrossed, emoji: '🍽️', color: 'from-emerald-500 to-green-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', iconBg: 'bg-gradient-to-br from-emerald-400 to-green-500' },
  { id: 'pc_bang' as JobType, icon: Monitor, emoji: '🖥️', color: 'from-blue-500 to-cyan-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', iconBg: 'bg-gradient-to-br from-blue-400 to-cyan-500' },
  { id: 'bookstore' as JobType, icon: BookOpen, emoji: '📚', color: 'from-violet-500 to-purple-400', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/30', iconBg: 'bg-gradient-to-br from-violet-400 to-purple-500' },
];

const DIFFICULTIES = [
  { id: 'easy' as Difficulty, icon: Target, emoji: '😊', color: 'from-emerald-500 to-green-400', stars: 1 },
  { id: 'medium' as Difficulty, icon: Zap, emoji: '😅', color: 'from-amber-500 to-yellow-400', stars: 2 },
  { id: 'hard' as Difficulty, icon: TrendingUp, emoji: '😤', color: 'from-rose-500 to-pink-400', stars: 3 },
];

const MAX_TURNS = 5;

const PartTime = () => {
  const { t } = useTranslation();
  const [gameState, setGameState] = useState<GameState>('select_job');
  const [selectedJob, setSelectedJob] = useState<JobType | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [turn, setTurn] = useState(1);
  const [totalEarned, setTotalEarned] = useState(0);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [playerInput, setPlayerInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchScenario = async () => {
    if (!selectedJob) return;
    
    setLoading(true);
    setShowHint(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('parttime-job', {
        body: { job_type: selectedJob, difficulty, turn }
      });

      if (error) throw error;
      
      setScenario(data);
      setGameState('playing');
    } catch (error) {
      console.error('Error fetching scenario:', error);
      toast({
        title: t('parttime.errorTitle'),
        description: t('parttime.errorDesc'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!playerInput.trim() || !scenario) return;
    
    setLoading(true);
    setGameState('evaluating');
    
    try {
      const { data, error } = await supabase.functions.invoke('parttime-evaluate', {
        body: {
          customer_line: scenario.customer_line_ko,
          player_response: playerInput,
          job_type: selectedJob,
          difficulty,
          situation_hint: scenario.situation_hint_ko
        }
      });

      if (error) throw error;
      
      setEvaluation(data);
      setTotalEarned(prev => prev + (data.earned_money || 0));
      setGameState('result');
    } catch (error) {
      console.error('Error evaluating response:', error);
      toast({
        title: t('parttime.evalError'),
        description: t('parttime.evalErrorDesc'),
        variant: "destructive"
      });
      setGameState('playing');
    } finally {
      setLoading(false);
    }
  };

  const handleNextTurn = () => {
    if (turn >= MAX_TURNS) {
      setGameState('game_over');
      updateProfile();
    } else {
      setTurn(prev => prev + 1);
      setPlayerInput("");
      setEvaluation(null);
      fetchScenario();
    }
  };

  const updateProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('money')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      await supabase
        .from('profiles')
        .update({ money: profile.money + totalEarned })
        .eq('id', session.user.id);
    }
  };

  const handleSelectJob = (job: JobType) => {
    setSelectedJob(job);
    setGameState('select_difficulty');
  };

  const handleSelectDifficulty = (diff: Difficulty) => {
    setDifficulty(diff);
    setTurn(1);
    setTotalEarned(0);
    fetchScenario();
  };

  const handleRestart = () => {
    setGameState('select_job');
    setSelectedJob(null);
    setTurn(1);
    setTotalEarned(0);
    setScenario(null);
    setEvaluation(null);
    setPlayerInput("");
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return 'from-yellow-400 via-amber-300 to-yellow-500';
      case 'A': return 'from-emerald-400 via-green-300 to-emerald-500';
      case 'B': return 'from-blue-400 via-cyan-300 to-blue-500';
      case 'C': return 'from-orange-400 via-amber-300 to-orange-500';
      default: return 'from-rose-400 via-pink-300 to-rose-500';
    }
  };

  const getGradeTextColor = (grade: string) => {
    switch (grade) {
      case 'S': return 'text-yellow-400';
      case 'A': return 'text-emerald-400';
      case 'B': return 'text-blue-400';
      case 'C': return 'text-orange-400';
      default: return 'text-rose-400';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring" as const, stiffness: 300, damping: 24 }
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-x-hidden">
      <CleanHeader />
      
      {/* Premium Stats Bar */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-slate-900/80 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">{t('parttime.statsTitle')}</h1>
              <p className="text-white/50 text-xs">Part-time Job Simulator</p>
            </div>
          </div>
          
          {gameState !== 'select_job' && gameState !== 'select_difficulty' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30">
                <Coins className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-amber-400">₩{totalEarned.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <span className="text-white/60 text-sm">{t('parttime.turn')}</span>
                <span className="font-bold text-white">{turn}/{MAX_TURNS}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {/* Job Selection - Premium 2-Column Grid */}
          {gameState === 'select_job' && (
            <motion.div
              key="select_job"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Hero Section */}
              <motion.div variants={itemVariants} className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span className="text-violet-300 text-sm font-medium">AI Role-play Simulation</span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/60">
                  {t('parttime.selectJob')}
                </h1>
                <p className="text-white/50 text-base sm:text-lg max-w-md mx-auto">
                  {t('parttime.selectJobDesc')}
                </p>
              </motion.div>

              {/* 2-Column Job Grid */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                {JOBS.map((job, index) => (
                  <motion.button
                    key={job.id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectJob(job.id)}
                    className={`group relative overflow-hidden rounded-2xl p-6 lg:p-8 border ${job.borderColor} ${job.bgColor} backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:shadow-${job.color.split('-')[1]}-500/20`}
                  >
                    {/* Background Gradient Glow */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${job.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                    
                    {/* Floating Particles */}
                    <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-gradient-to-br from-white/5 to-transparent blur-2xl group-hover:scale-150 transition-transform duration-700" />
                    
                    <div className="relative flex items-center gap-4 lg:gap-5">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-14 h-14 lg:w-16 lg:h-16 rounded-2xl ${job.iconBg} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                        <job.icon className="w-7 h-7 lg:w-8 lg:h-8 text-white" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{job.emoji}</span>
                          <h3 className="text-lg lg:text-xl font-bold text-white truncate">
                            {t(`parttime.jobs.${job.id}`)}
                          </h3>
                        </div>
                        <p className="text-white/60 text-sm lg:text-base line-clamp-2">
                          {t(`parttime.jobsDesc.${job.id}`)}
                        </p>
                      </div>
                      
                      {/* Arrow */}
                      <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* Difficulty Selection - Premium Design */}
          {gameState === 'select_difficulty' && (
            <motion.div
              key="select_difficulty"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Hero */}
              <motion.div variants={itemVariants} className="text-center space-y-4">
                <button
                  onClick={() => setGameState('select_job')}
                  className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>{t('parttime.back')}</span>
                </button>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/60">
                  {t('parttime.selectDifficulty')}
                </h1>
                <p className="text-white/50 text-base sm:text-lg max-w-md mx-auto">
                  {t('parttime.selectDifficultyDesc')}
                </p>
              </motion.div>

              {/* Difficulty Cards - Horizontal on Desktop */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
                {DIFFICULTIES.map((diff, index) => (
                  <motion.button
                    key={diff.id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSelectDifficulty(diff.id)}
                    className={`group relative overflow-hidden rounded-2xl p-6 lg:p-8 border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:border-white/20`}
                  >
                    {/* Gradient Overlay on Hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${diff.color} opacity-0 group-hover:opacity-15 transition-opacity duration-500`} />
                    
                    <div className="relative space-y-4 text-center">
                      {/* Emoji */}
                      <div className="text-5xl lg:text-6xl transform group-hover:scale-110 transition-transform duration-300">
                        {diff.emoji}
                      </div>
                      
                      {/* Title */}
                      <h3 className="text-xl lg:text-2xl font-bold text-white">
                        {t(`parttime.difficulty.${diff.id}`)}
                      </h3>
                      
                      {/* Stars */}
                      <div className="flex items-center justify-center gap-1">
                        {[...Array(3)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-5 h-5 ${i < diff.stars ? 'text-amber-400 fill-amber-400' : 'text-white/20'}`} 
                          />
                        ))}
                      </div>
                      
                      {/* Description */}
                      <p className="text-white/50 text-sm">
                        {t(`parttime.difficulty.${diff.id}Desc`)}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* Playing State - Immersive Chat UI */}
          {(gameState === 'playing' || gameState === 'evaluating') && scenario && (
            <motion.div
              key="playing"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col h-[calc(100vh-200px)] max-h-[700px]"
            >
              {/* Chat Header - Job & Customer Info */}
              <motion.div 
                variants={itemVariants}
                className="flex-shrink-0 rounded-t-3xl p-4 lg:p-5 bg-gradient-to-r from-slate-800/90 to-slate-700/90 border border-white/10 border-b-0 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Customer Avatar */}
                    <div className="relative">
                      <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-xl shadow-violet-500/30 ring-2 ring-violet-400/30">
                        <span className="text-2xl lg:text-3xl">
                          {scenario.customer_type.includes('여성') || scenario.customer_type.includes('할머니') || scenario.customer_type.includes('아줌마') 
                            ? '👩' 
                            : scenario.customer_type.includes('어린') || scenario.customer_type.includes('학생')
                            ? '🧒'
                            : scenario.customer_type.includes('할아버지')
                            ? '👴'
                            : '🧑'}
                        </span>
                      </div>
                      {/* Online Indicator */}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-3 border-slate-800 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-white font-bold text-lg lg:text-xl">{scenario.customer_type}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xl">{JOBS.find(j => j.id === selectedJob)?.emoji}</span>
                        <span className="text-white/50 text-sm">{t(`parttime.jobs.${selectedJob}`)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Hint Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowHint(!showHint)}
                    className={`w-12 h-12 rounded-xl transition-all duration-300 ${showHint ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white/50 hover:text-amber-400 hover:bg-amber-500/10'}`}
                  >
                    <Lightbulb className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>

              {/* Chat Messages Area */}
              <motion.div 
                variants={itemVariants}
                className="flex-1 overflow-y-auto px-4 lg:px-6 py-6 bg-gradient-to-b from-slate-800/50 via-slate-900/80 to-slate-900/90 border-x border-white/10 space-y-5"
                style={{ 
                  backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.08) 0%, transparent 50%)',
                }}
              >
                {/* Situation Context - System Message */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex justify-center"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-500/15 border border-blue-500/25 backdrop-blur-sm max-w-[90%] lg:max-w-[70%]">
                    <Target className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="text-blue-300 text-sm text-center">{scenario.situation_hint_ko}</span>
                  </div>
                </motion.div>

                {/* Customer Message Bubble */}
                <motion.div 
                  initial={{ opacity: 0, x: -30, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.2 }}
                  className="flex items-end gap-3"
                >
                  {/* Customer Avatar (Small) */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                    <span className="text-lg">
                      {scenario.customer_type.includes('여성') || scenario.customer_type.includes('할머니') || scenario.customer_type.includes('아줌마') 
                        ? '👩' 
                        : scenario.customer_type.includes('어린') || scenario.customer_type.includes('학생')
                        ? '🧒'
                        : scenario.customer_type.includes('할아버지')
                        ? '👴'
                        : '🧑'}
                    </span>
                  </div>
                  
                  {/* Message Bubble */}
                  <div className="max-w-[85%] lg:max-w-[75%]">
                    <div className="relative">
                      {/* Bubble Tail */}
                      <div className="absolute bottom-3 -left-2 w-4 h-4 bg-gradient-to-br from-violet-500/30 to-purple-500/20 rotate-45 rounded-sm" />
                      
                      <div className="relative rounded-2xl rounded-bl-md p-5 lg:p-6 bg-gradient-to-br from-violet-500/25 to-purple-500/15 border border-violet-400/30 backdrop-blur-sm shadow-xl shadow-violet-500/10">
                        <p className="text-white text-lg lg:text-xl font-medium leading-relaxed">
                          {scenario.customer_line_ko}
                        </p>
                        
                        {/* Typing indicator style timestamp */}
                        <div className="flex items-center gap-1.5 mt-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-400/60" />
                          <span className="text-violet-300/60 text-xs">{t('parttime.customer')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Hint Display - System Message Style */}
                <AnimatePresence>
                  {showHint && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="flex justify-center"
                    >
                      <div className="inline-flex items-start gap-3 px-5 py-4 rounded-2xl bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border border-amber-500/30 backdrop-blur-sm max-w-[90%] lg:max-w-[75%]">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <Lightbulb className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-amber-400 text-xs font-semibold mb-1">{t('parttime.hint')}</p>
                          <p className="text-amber-100 text-sm leading-relaxed">{scenario.expected_response_hint_ko}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Player Response Preview (if typing) */}
                {playerInput && (
                  <motion.div 
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 0.6, x: 0 }}
                    className="flex items-end gap-3 justify-end"
                  >
                    <div className="max-w-[85%] lg:max-w-[75%]">
                      <div className="relative">
                        <div className="absolute bottom-3 -right-2 w-4 h-4 bg-gradient-to-bl from-emerald-500/30 to-teal-500/20 rotate-45 rounded-sm" />
                        <div className="relative rounded-2xl rounded-br-md p-4 lg:p-5 bg-gradient-to-bl from-emerald-500/20 to-teal-500/15 border border-emerald-400/20 border-dashed">
                          <p className="text-white/60 text-base lg:text-lg">{playerInput}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                      <span className="text-lg">🧑‍💼</span>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Input Area - Fixed at Bottom */}
              <motion.div 
                variants={itemVariants}
                className="flex-shrink-0 rounded-b-3xl p-4 lg:p-5 bg-gradient-to-t from-slate-900 via-slate-800/95 to-slate-800/90 border border-white/10 border-t-0 backdrop-blur-xl"
              >
                <div className="flex items-center gap-3">
                  {/* Player Avatar */}
                  <div className="hidden sm:flex flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 items-center justify-center shadow-lg shadow-emerald-500/25">
                    <span className="text-xl">🧑‍💼</span>
                  </div>
                  
                  {/* Input Field */}
                  <div className="flex-1 relative">
                    <Input
                      value={playerInput}
                      onChange={(e) => setPlayerInput(e.target.value)}
                      placeholder={t('parttime.placeholder')}
                      className="w-full h-13 lg:h-14 pl-5 pr-14 rounded-2xl bg-white/5 border-white/15 text-white text-base lg:text-lg placeholder:text-white/30 focus:border-emerald-500/50 focus:ring-emerald-500/20 focus:bg-white/10 transition-all"
                      disabled={loading}
                      onKeyDown={(e) => e.key === 'Enter' && !loading && handleSubmitResponse()}
                    />
                    
                    {/* Character Count */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <span className={`text-xs ${playerInput.length > 0 ? 'text-emerald-400' : 'text-white/30'}`}>
                        {playerInput.length > 0 && `${playerInput.length}자`}
                      </span>
                    </div>
                  </div>
                  
                  {/* Send Button */}
                  <Button
                    onClick={handleSubmitResponse}
                    disabled={loading || !playerInput.trim()}
                    className="h-13 lg:h-14 w-13 lg:w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-xl shadow-emerald-500/30 disabled:opacity-40 disabled:shadow-none transition-all duration-300"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 lg:w-6 lg:h-6 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5 lg:w-6 lg:h-6" />
                    )}
                  </Button>
                </div>
                
                {/* Quick Tips */}
                <div className="flex items-center justify-center gap-4 mt-3 text-white/40 text-xs">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10">Enter</kbd>
                    {t('parttime.respond')}
                  </span>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Result State - Premium Design */}
          {gameState === 'result' && evaluation && (
            <motion.div
              key="result"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4 lg:space-y-6"
            >
              {/* Grade Display */}
              <motion.div 
                variants={itemVariants}
                className="rounded-3xl p-8 lg:p-12 text-center bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-xl relative overflow-hidden"
              >
                {/* Decorative Elements */}
                <div className={`absolute inset-0 bg-gradient-to-br ${getGradeColor(evaluation.grade)} opacity-10`} />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-b from-white/10 to-transparent rounded-full blur-3xl" />
                
                <div className="relative">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                    className={`text-8xl lg:text-9xl font-black bg-gradient-to-br ${getGradeColor(evaluation.grade)} bg-clip-text text-transparent mb-4`}
                  >
                    {evaluation.grade}
                  </motion.div>
                  <p className="text-2xl lg:text-3xl text-white font-bold">{evaluation.score}{t('parttime.score')}</p>
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center justify-center gap-3 mt-6 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 inline-flex mx-auto"
                  >
                    <Coins className="w-7 h-7 text-amber-400" />
                    <span className="text-2xl font-bold text-amber-400">+₩{evaluation.earned_money.toLocaleString()}</span>
                  </motion.div>
                </div>
              </motion.div>

              {/* Customer Reaction */}
              <motion.div 
                variants={itemVariants}
                className="rounded-2xl p-5 bg-violet-500/10 border border-violet-500/20"
              >
                <p className="text-violet-400 text-sm font-medium mb-2">😊 {t('parttime.customerReaction')}</p>
                <p className="text-white text-base lg:text-lg">{evaluation.customer_reaction_ko}</p>
              </motion.div>

              {/* Feedback */}
              <motion.div 
                variants={itemVariants}
                className="rounded-2xl p-5 bg-white/5 border border-white/10"
              >
                <p className="text-white/60 text-sm font-medium mb-2">📝 {t('parttime.feedback')}</p>
                <p className="text-white">{evaluation.feedback_ko}</p>
              </motion.div>

              {/* Better Response */}
              <motion.div 
                variants={itemVariants}
                className="rounded-2xl p-5 bg-emerald-500/10 border border-emerald-500/20"
              >
                <p className="text-emerald-400 text-sm font-medium mb-2">✨ {t('parttime.betterResponse')}</p>
                <p className="text-white text-base lg:text-lg">"{evaluation.better_response_ko}"</p>
              </motion.div>

              {/* Language Tips */}
              {evaluation.language_tips && evaluation.language_tips.length > 0 && (
                <motion.div 
                  variants={itemVariants}
                  className="rounded-2xl p-5 bg-rose-500/10 border border-rose-500/20"
                >
                  <p className="text-rose-400 text-sm font-medium mb-3">🔤 {t('parttime.languageCorrection')}</p>
                  <div className="space-y-4">
                    {evaluation.language_tips.map((tip, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-rose-400 line-through">{tip.wrong}</span>
                            <ArrowRight className="w-4 h-4 text-white/30" />
                            <span className="text-emerald-400 font-medium">{tip.correct}</span>
                          </div>
                          <p className="text-white/70 text-sm">{tip.explanation_ko}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Next Button */}
              <motion.div variants={itemVariants}>
                <Button
                  onClick={handleNextTurn}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-lg font-bold shadow-xl shadow-violet-500/25"
                >
                  {turn >= MAX_TURNS ? t('parttime.viewResult') : t('parttime.nextCustomer')}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* Game Over State - Premium Design */}
          {gameState === 'game_over' && (
            <motion.div
              key="game_over"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6 lg:space-y-8"
            >
              {/* Trophy Card */}
              <motion.div 
                variants={itemVariants}
                className="rounded-3xl p-8 lg:p-12 text-center bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-orange-500/20 border border-amber-500/30 backdrop-blur-xl relative overflow-hidden"
              >
                {/* Decorative Elements */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent" />
                
                <div className="relative">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                  >
                    <Trophy className="w-24 h-24 lg:w-32 lg:h-32 text-amber-400 mx-auto mb-6 drop-shadow-[0_0_30px_rgba(251,191,36,0.5)]" />
                  </motion.div>
                  
                  <h1 className="text-3xl lg:text-4xl font-black text-white mb-6">{t('parttime.workDone')}</h1>
                  
                  <div className="inline-block rounded-2xl p-6 lg:p-8 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/40">
                    <p className="text-amber-300/70 text-sm mb-2">{t('parttime.todayIncome')}</p>
                    <div className="flex items-center justify-center gap-3 text-amber-400">
                      <Coins className="w-10 h-10" />
                      <span className="text-4xl lg:text-5xl font-black">₩{totalEarned.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
                <Button
                  onClick={handleRestart}
                  className="h-14 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-lg font-bold shadow-lg shadow-violet-500/25"
                >
                  {t('parttime.restart')}
                </Button>
                <Button
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  className="h-14 rounded-2xl border-white/20 text-white hover:bg-white/10"
                >
                  {t('parttime.backToDashboard')}
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* Loading State */}
          {loading && gameState !== 'evaluating' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="rounded-3xl p-8 lg:p-12 text-center bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-xl"
              >
                <Loader2 className="w-16 h-16 text-violet-400 animate-spin mx-auto mb-4" />
                <p className="text-white text-lg font-medium">{t('parttime.loading')}</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AppFooter />
    </div>
  );
};

export default PartTime;
