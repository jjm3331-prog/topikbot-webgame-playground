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
  Heart
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
  { id: 'convenience_store' as JobType, icon: Store, name_ko: '편의점', name_vi: 'Cửa hàng tiện lợi', color: 'from-orange-500 to-red-500' },
  { id: 'cafe' as JobType, icon: Coffee, name_ko: '카페', name_vi: 'Quán cà phê', color: 'from-amber-500 to-yellow-500' },
  { id: 'restaurant' as JobType, icon: UtensilsCrossed, name_ko: '식당', name_vi: 'Nhà hàng', color: 'from-green-500 to-emerald-500' },
  { id: 'pc_bang' as JobType, icon: Monitor, name_ko: 'PC방', name_vi: 'Quán net', color: 'from-blue-500 to-cyan-500' },
  { id: 'bookstore' as JobType, icon: BookOpen, name_ko: '서점', name_vi: 'Hiệu sách', color: 'from-purple-500 to-pink-500' },
];

const DIFFICULTIES = [
  { id: 'easy' as Difficulty, name_ko: '쉬움', name_vi: 'Dễ', description: '천천히, 기본 상황', color: 'from-green-500 to-emerald-500' },
  { id: 'medium' as Difficulty, name_ko: '보통', name_vi: 'Trung bình', description: '일반 속도, 다양한 요청', color: 'from-yellow-500 to-orange-500' },
  { id: 'hard' as Difficulty, name_ko: '어려움', name_vi: 'Khó', description: '까다로운 손님, 클레임', color: 'from-red-500 to-pink-500' },
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
        title: "오류 발생",
        description: "시나리오를 불러오는데 실패했습니다.",
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
        title: "평가 오류",
        description: "응답 평가에 실패했습니다.",
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
      // Update money in profile
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
      case 'S': return 'text-yellow-400';
      case 'A': return 'text-green-400';
      case 'B': return 'text-blue-400';
      case 'C': return 'text-orange-400';
      default: return 'text-red-400';
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-purple-900 via-purple-800 to-[#0f0f23] flex flex-col overflow-hidden">
      <CleanHeader />
      
      {/* Stats Bar */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <span className="text-white font-medium">아르바이트 / Làm thêm</span>
        {gameState !== 'select_job' && gameState !== 'select_difficulty' && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-yellow-400">
              <Coins className="w-5 h-5" />
              <span className="font-bold">₩{totalEarned.toLocaleString()}</span>
            </div>
            <div className="text-white/70">
              턴 / Lượt {turn}/{MAX_TURNS}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {/* Job Selection */}
          {gameState === 'select_job' && (
            <motion.div
              key="select_job"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">어디서 일할까요?</h1>
                <p className="text-white/60">Bạn muốn làm việc ở đâu?</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {JOBS.map((job) => (
                  <motion.button
                    key={job.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectJob(job.id)}
                    className={`glass-card p-6 rounded-xl flex items-center gap-4 bg-gradient-to-r ${job.color} bg-opacity-20 hover:bg-opacity-30 transition-all`}
                  >
                    <div className={`p-3 rounded-full bg-gradient-to-r ${job.color}`}>
                      <job.icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-xl font-bold text-white">{job.name_ko}</h3>
                      <p className="text-white/70">{job.name_vi}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Difficulty Selection */}
          {gameState === 'select_difficulty' && (
            <motion.div
              key="select_difficulty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">난이도 선택</h1>
                <p className="text-white/60">Chọn độ khó</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {DIFFICULTIES.map((diff) => (
                  <motion.button
                    key={diff.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectDifficulty(diff.id)}
                    className={`glass-card p-6 rounded-xl bg-gradient-to-r ${diff.color} bg-opacity-20 hover:bg-opacity-30 transition-all`}
                  >
                    <h3 className="text-xl font-bold text-white">{diff.name_ko} / {diff.name_vi}</h3>
                    <p className="text-white/70 mt-1">{diff.description}</p>
                  </motion.button>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={() => setGameState('select_job')}
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                뒤로 / Quay lại
              </Button>
            </motion.div>
          )}

          {/* Playing State */}
          {(gameState === 'playing' || gameState === 'evaluating') && scenario && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Job & Turn Info */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-neon-cyan font-bold">{scenario.job_name_ko}</span>
                    <span className="text-white/50 ml-2">/ {scenario.job_name_vi}</span>
                  </div>
                  <div className="text-white/70">
                    손님 유형: <span className="text-white">{scenario.customer_type}</span>
                  </div>
                </div>
              </div>

              {/* Situation */}
              <div className="glass-card p-4 rounded-xl bg-blue-500/10">
                <p className="text-white/60 text-sm mb-1">📍 상황 / Tình huống</p>
                <p className="text-white">{scenario.situation_hint_ko}</p>
                <p className="text-white/70 text-sm mt-1">{scenario.situation_hint_vi}</p>
              </div>

              {/* Customer Line */}
              <div className="glass-card p-6 rounded-xl bg-gradient-to-r from-pink-500/20 to-purple-500/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-pink-500/30">
                    <MessageCircle className="w-6 h-6 text-pink-400" />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm mb-2">손님 / Khách hàng:</p>
                    <p className="text-xl text-white font-medium">"{scenario.customer_line_ko}"</p>
                    <p className="text-white/60 mt-2">"{scenario.customer_line_vi}"</p>
                  </div>
                </div>
              </div>

              {/* Hint Button */}
              <Button
                variant="outline"
                onClick={() => setShowHint(!showHint)}
                className="w-full border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                {showHint ? '힌트 숨기기' : '힌트 보기'} / {showHint ? 'Ẩn gợi ý' : 'Xem gợi ý'}
              </Button>

              {/* Hint Display */}
              <AnimatePresence>
                {showHint && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="glass-card p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30"
                  >
                    <p className="text-yellow-400 text-sm mb-1">💡 힌트 / Gợi ý</p>
                    <p className="text-white">{scenario.expected_response_hint_ko}</p>
                    <p className="text-white/70 text-sm mt-1">{scenario.expected_response_hint_vi}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Area */}
              <div className="glass-card p-4 rounded-xl">
                <p className="text-white/60 text-sm mb-2">✍️ 응대하기 / Phản hồi:</p>
                <div className="flex gap-2">
                  <Input
                    value={playerInput}
                    onChange={(e) => setPlayerInput(e.target.value)}
                    placeholder="손님에게 응대해보세요..."
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    disabled={loading}
                    onKeyDown={(e) => e.key === 'Enter' && !loading && handleSubmitResponse()}
                  />
                  <Button
                    onClick={handleSubmitResponse}
                    disabled={loading || !playerInput.trim()}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Result State */}
          {gameState === 'result' && evaluation && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-4"
            >
              {/* Grade Display */}
              <div className="glass-card p-8 rounded-xl text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className={`text-8xl font-bold ${getGradeColor(evaluation.grade)} mb-4`}
                >
                  {evaluation.grade}
                </motion.div>
                <p className="text-white text-2xl">{evaluation.score}점</p>
                <div className="flex items-center justify-center gap-2 mt-4 text-yellow-400">
                  <Coins className="w-6 h-6" />
                  <span className="text-xl font-bold">+₩{evaluation.earned_money.toLocaleString()}</span>
                </div>
              </div>

              {/* Customer Reaction */}
              <div className="glass-card p-4 rounded-xl bg-purple-500/10">
                <p className="text-white/60 text-sm mb-1">😊 손님 반응 / Phản ứng khách hàng</p>
                <p className="text-white">{evaluation.customer_reaction_ko}</p>
                <p className="text-white/70 text-sm mt-1">{evaluation.customer_reaction_vi}</p>
              </div>

              {/* Feedback */}
              <div className="glass-card p-4 rounded-xl">
                <p className="text-white/60 text-sm mb-2">📝 피드백 / Phản hồi</p>
                <p className="text-white">{evaluation.feedback_ko}</p>
                <p className="text-white/70 text-sm mt-1">{evaluation.feedback_vi}</p>
              </div>

              {/* Better Response */}
              <div className="glass-card p-4 rounded-xl bg-green-500/10">
                <p className="text-white/60 text-sm mb-2">✨ 더 나은 응대 / Phản hồi tốt hơn</p>
                <p className="text-white">"{evaluation.better_response_ko}"</p>
                <p className="text-white/70 text-sm mt-1">"{evaluation.better_response_vi}"</p>
              </div>

              {/* Language Tips */}
              {evaluation.language_tips && evaluation.language_tips.length > 0 && (
                <div className="glass-card p-4 rounded-xl bg-red-500/10">
                  <p className="text-white/60 text-sm mb-2">🔤 언어 교정 / Sửa lỗi ngôn ngữ</p>
                  {evaluation.language_tips.map((tip, idx) => (
                    <div key={idx} className="mb-3 last:mb-0">
                      <div className="flex gap-2 items-center mb-1">
                        <span className="text-red-400 line-through">{tip.wrong}</span>
                        <span className="text-white/50">→</span>
                        <span className="text-green-400">{tip.correct}</span>
                      </div>
                      <p className="text-white/70 text-sm">{tip.explanation_ko}</p>
                      <p className="text-white/50 text-xs">{tip.explanation_vi}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Next Button */}
              <Button
                onClick={handleNextTurn}
                className="w-full h-14 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-lg font-bold"
              >
                {turn >= MAX_TURNS ? '결과 보기 / Xem kết quả' : '다음 손님 / Khách tiếp theo'}
              </Button>
            </motion.div>
          )}

          {/* Game Over State */}
          {gameState === 'game_over' && (
            <motion.div
              key="game_over"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-6"
            >
              <div className="glass-card p-8 rounded-xl text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.2 }}
                >
                  <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
                </motion.div>
                <h1 className="text-3xl font-bold text-white mb-2">퇴근 완료!</h1>
                <p className="text-white/60 mb-6">Hoàn thành ca làm việc!</p>
                
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-6">
                  <p className="text-white/70 mb-2">오늘의 수입 / Thu nhập hôm nay</p>
                  <div className="flex items-center justify-center gap-2 text-yellow-400">
                    <Coins className="w-8 h-8" />
                    <span className="text-4xl font-bold">₩{totalEarned.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={handleRestart}
                  className="h-14 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  다시 하기 / Chơi lại
                </Button>
                <Button
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  className="h-14 border-white/20 text-white hover:bg-white/10"
                >
                  대시보드로 / Về Dashboard
                </Button>
              </div>
            </motion.div>
          )}

          {/* Loading State */}
          {loading && gameState !== 'evaluating' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            >
              <div className="glass-card p-8 rounded-xl text-center">
                <Loader2 className="w-12 h-12 text-neon-cyan animate-spin mx-auto mb-4" />
                <p className="text-white">손님이 오고 있습니다...</p>
                <p className="text-white/60 text-sm">Khách hàng đang đến...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AppFooter />
    </div>
  );
};

export default PartTime;
