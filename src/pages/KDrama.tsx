import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mic, MicOff, RotateCcw, ChevronRight, Volume2, RefreshCw, Loader2, Trophy, Youtube, Timer, Zap } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";

interface DramaScene {
  id: string;
  drama: string;
  dramaEn: string;
  youtubeId: string;
  timestamp: number;
  character: string;
  korean: string;
  vietnamese: string;
  context: string;
  difficulty: string;
  audioTip: string;
  genre: string;
}

const TIMER_DURATION = 30;

const KDrama = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [scenes, setScenes] = useState<DramaScene[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const [result, setResult] = useState<{
    recognizedText: string;
    accuracy: number;
    feedback: {
      korean: string;
      vietnamese: string;
      grade: string;
      emoji: string;
    };
  } | null>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [timerMode, setTimerMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [videoKey, setVideoKey] = useState(0);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('nova');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentScene = scenes[currentIndex];

  const voiceOptions = [
    { id: 'nova', label: '👩 민희', gender: 'female' },
    { id: 'shimmer', label: '👩 수아', gender: 'female' },
    { id: 'echo', label: '👨 현준', gender: 'male' },
    { id: 'fable', label: '👨 지훈', gender: 'male' },
  ];

  // Save score to profile
  const saveScoreToProfile = async (finalScore: number) => {
    if (scoreSaved || finalScore <= 0) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('points, money')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      const avgScore = attempts > 0 ? Math.round(finalScore / attempts) : 0;
      const pointsEarned = Math.floor(avgScore * attempts);
      const moneyEarned = Math.floor(pointsEarned * 5);
      
      await supabase
        .from('profiles')
        .update({ 
          points: profile.points + pointsEarned,
          money: profile.money + moneyEarned
        })
        .eq('id', session.user.id);
      
      setScoreSaved(true);
      toast.success(`💰 +${pointsEarned}점, ₩${moneyEarned.toLocaleString()} 획득!`);
    }
  };

  // Save score when game ends
  useEffect(() => {
    if (gameComplete && !scoreSaved) {
      saveScoreToProfile(score);
    }
  }, [gameComplete, scoreSaved, score]);

  // Load scenes
  const loadScenes = async (genre?: string | null, difficulty?: string | null) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/drama-lines`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            genre: genre,
            difficulty: difficulty,
            excludeIds: usedIds,
            count: 10
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to load');
      const data = await response.json();
      
      if (data.scenes && data.scenes.length > 0) {
        setScenes(data.scenes);
        setCurrentIndex(0);
        setResult(null);
        setUsedIds(prev => [...prev, ...data.scenes.map((s: DramaScene) => s.id)]);
        setVideoKey(prev => prev + 1);
        setTimeLeft(TIMER_DURATION);
      }
    } catch (error) {
      console.error('Load error:', error);
      toast.error('로딩 실패');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadScenes(); }, []);

  // Timer effect
  useEffect(() => {
    if (timerMode && !result && !isLoading && !isRecording && !isProcessing && scenes.length > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerMode, result, isLoading, isRecording, isProcessing, currentIndex]);

  const handleTimeUp = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    toast.error('⏰ 시간 초과! / Hết giờ!');
    handleNext();
  }, [currentIndex, scenes.length]);

  // Play TTS
  const playTTS = async () => {
    if (isPlayingTTS) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlayingTTS(false);
      return;
    }

    setIsPlayingTTS(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/drama-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text: currentScene.korean,
            voice: selectedVoice
          }),
        }
      );

      if (!response.ok) throw new Error('TTS failed');
      const data = await response.json();
      
      if (data.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
        audioRef.current = audio;
        audio.onended = () => { setIsPlayingTTS(false); audioRef.current = null; };
        audio.onerror = () => { setIsPlayingTTS(false); audioRef.current = null; };
        await audio.play();
      }
    } catch (error) {
      console.error('TTS error:', error);
      setIsPlayingTTS(false);
      toast.error('TTS 오류');
    }
  };

  // Recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        await processAudio();
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      setResult(null);
      if (timerRef.current) clearInterval(timerRef.current);
      
      toast.success('🎙️ 녹음 시작!');
    } catch (error) {
      console.error('Mic error:', error);
      toast.error('마이크 오류');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      toast.error('녹음된 음성이 없습니다');
      return;
    }

    setIsProcessing(true);
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/drama-dubbing`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ audio: base64Audio, originalText: currentScene.korean }),
        }
      );

      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);

      setResult({
        recognizedText: data.recognizedText,
        accuracy: data.accuracy,
        feedback: data.feedback
      });
      
      setScore(prev => prev + data.accuracy);
      setAttempts(prev => prev + 1);

      // Replay video on success
      if (data.accuracy >= 70) {
        setVideoKey(prev => prev + 1);
      }

      toast.success(`${data.feedback.emoji} ${data.feedback.grade}등급! (${data.accuracy}%)`);
    } catch (error) {
      console.error('Process error:', error);
      toast.error('처리 오류');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNext = () => {
    if (currentIndex >= scenes.length - 1) {
      setGameComplete(true);
    } else {
      setCurrentIndex(prev => prev + 1);
      setResult(null);
      setTimeLeft(TIMER_DURATION);
      setVideoKey(prev => prev + 1);
    }
  };

  const handleBackToGame = async () => {
    await saveScoreToProfile(score);
    navigate('/dashboard');
  };

  const getDifficultyStyle = (d: string) => {
    switch (d) {
      case '쉬움': return 'bg-green-500/20 text-green-400';
      case '보통': return 'bg-yellow-500/20 text-yellow-400';
      case '어려움': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return 'from-yellow-400 to-amber-500';
      case 'A': return 'from-green-400 to-emerald-500';
      case 'B': return 'from-blue-400 to-cyan-500';
      case 'C': return 'from-orange-400 to-amber-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const genres = [
    { id: 'romantic', label: '로맨스', emoji: '💕' },
    { id: 'action', label: '액션', emoji: '💥' },
    { id: 'fantasy', label: '판타지', emoji: '✨' },
    { id: 'thriller', label: '스릴러', emoji: '😱' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-slate-900 via-purple-900 to-[#0f0f23] flex flex-col">
        <CleanHeader />
        <div className="flex-1 flex items-center justify-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-6xl">🎬</motion.div>
        </div>
        <AppFooter />
      </div>
    );
  }

  if (gameComplete) {
    const avgScore = attempts > 0 ? Math.round(score / attempts) : 0;
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-slate-900 via-purple-900 to-[#0f0f23] flex flex-col">
        <CleanHeader />
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-black/60 backdrop-blur-xl rounded-3xl p-8 text-center max-w-md w-full border border-purple-500/30">
            <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">더빙 완료! 🎬</h2>
            <p className="text-gray-400 mb-4">Hoàn thành lồng tiếng!</p>
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6 mb-6">
              <p className="text-gray-400 mb-2">{attempts}개 도전 / {attempts} thử thách</p>
              <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">평균 {avgScore}%</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => navigate('/dashboard')} variant="outline" className="flex-1 border-gray-600">
                <ArrowLeft className="w-4 h-4 mr-2" />대시보드로 / Về Dashboard
              </Button>
              <Button onClick={() => { setScore(0); setAttempts(0); setScoreSaved(false); setGameComplete(false); setUsedIds([]); loadScenes(selectedGenre, selectedDifficulty); }} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500">
                <RotateCcw className="w-4 h-4 mr-2" />다시하기 / Chơi lại
              </Button>
            </div>
          </motion.div>
        </div>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-900 via-purple-900 to-[#0f0f23] flex flex-col">
      <CleanHeader />
      
      {/* Stats Bar */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-purple-500/20 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎬</span>
          <span className="text-white font-bold">K-Drama 더빙</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-purple-400 font-bold">{attempts > 0 ? Math.round(score / attempts) : 0}%</span>
        </div>
      </div>
      
      <main className="flex-1 overflow-y-auto">

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Progress */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">{currentIndex + 1} / {scenes.length}</span>
          {attempts > 0 && <span className="text-purple-400 text-sm">🎤 {attempts}회</span>}
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
          <motion.div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" animate={{ width: `${((currentIndex + 1) / scenes.length) * 100}%` }} />
        </div>

        {/* Timer & Controls */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setTimerMode(!timerMode)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${timerMode ? 'bg-cyan-500 text-white' : 'bg-white/10 text-gray-300'}`}>
            <Zap className="w-3 h-3" /> 타이머 {timerMode ? 'ON' : 'OFF'}
          </button>
          {timerMode && !result && !isRecording && !isProcessing && (
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/50 ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : timeLeft <= 20 ? 'text-yellow-400' : 'text-green-400'}`}>
              <Timer className="w-3 h-3" /><span className="font-bold">{timeLeft}s</span>
            </div>
          )}
          <button onClick={() => loadScenes(selectedGenre, selectedDifficulty)} className="text-white/60 hover:text-white p-2">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Genre Filter */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          <button onClick={() => { setSelectedGenre(null); setScore(0); setAttempts(0); setUsedIds([]); loadScenes(null, selectedDifficulty); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${selectedGenre === null ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-300'}`}>
            전체
          </button>
          {genres.map((g) => (
            <button key={g.id} onClick={() => { setSelectedGenre(g.id); setScore(0); setAttempts(0); setUsedIds([]); loadScenes(g.id, selectedDifficulty); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${selectedGenre === g.id ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-300'}`}>
              {g.emoji} {g.label}
            </button>
          ))}
        </div>

        {/* Difficulty Filter */}
        <div className="flex gap-1.5 mb-4">
          {[null, '쉬움', '보통', '어려움'].map((d) => (
            <button key={d || 'all'} onClick={() => { setSelectedDifficulty(d); setScore(0); setAttempts(0); setUsedIds([]); loadScenes(selectedGenre, d); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${selectedDifficulty === d ? (d === '쉬움' ? 'bg-green-500 text-white' : d === '보통' ? 'bg-yellow-500 text-black' : d === '어려움' ? 'bg-red-500 text-white' : 'bg-purple-500 text-white') : 'bg-white/10 text-gray-300'}`}>
              {d || '전체'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      {currentScene && (
        <div className="max-w-lg mx-auto px-4 pb-8">
          <motion.div key={currentScene.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-black/40 backdrop-blur-xl rounded-3xl overflow-hidden border border-purple-500/30">
            {/* YouTube Player */}
            <div className="relative aspect-video bg-black">
              <iframe
                key={videoKey}
                src={`https://www.youtube.com/embed/${currentScene.youtubeId}?start=${currentScene.timestamp}&autoplay=1&mute=0&rel=0&modestbranding=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              {result && result.accuracy >= 80 && (
                <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  🎬 완벽! 다시 감상하세요!
                </motion.div>
              )}
              <button onClick={() => window.open(`https://youtube.com/watch?v=${currentScene.youtubeId}&t=${currentScene.timestamp}`, '_blank')} className="absolute bottom-3 right-3 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
                <Youtube className="w-4 h-4" /> YouTube
              </button>
            </div>

            {/* Content */}
            <div className="p-5">
              {/* Drama Info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-xl">🎭</div>
                <div className="flex-1">
                  <h3 className="text-white font-bold">{currentScene.drama}</h3>
                  <p className="text-purple-400 text-sm">{currentScene.character} · {currentScene.dramaEn}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyStyle(currentScene.difficulty)}`}>
                  {currentScene.difficulty}
                </span>
              </div>

              {/* Dialogue */}
              <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-4 mb-4">
                <p className="text-lg text-white font-medium mb-2">{currentScene.korean}</p>
                <p className="text-gray-400 text-sm">{currentScene.vietnamese}</p>
              </div>

              {/* Context & Tip */}
              <div className="bg-white/5 rounded-xl p-3 mb-4 space-y-2">
                <p className="text-gray-400 text-sm">📍 {currentScene.context}</p>
                <p className="text-purple-400 text-sm">🎭 {currentScene.audioTip}</p>
              </div>

              {/* Voice Selection */}
              <div className="flex gap-1.5 mb-4">
                {voiceOptions.map((v) => (
                  <button key={v.id} onClick={() => setSelectedVoice(v.id)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium ${selectedVoice === v.id ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-300'}`}>
                    {v.label}
                  </button>
                ))}
              </div>

              {/* Result */}
              <AnimatePresence>
                {result && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4">
                    <div className={`rounded-xl p-4 ${result.accuracy >= 70 ? 'bg-green-500/20 border border-green-500/30' : 'bg-orange-500/20 border border-orange-500/30'}`}>
                      <div className="flex items-center gap-4 mb-3">
                        <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getGradeColor(result.feedback.grade)} flex items-center justify-center`}>
                          <span className="text-2xl font-bold text-white">{result.feedback.grade}</span>
                        </div>
                        <div>
                          <p className="text-white font-bold text-lg">{result.feedback.emoji} {result.accuracy}% 정확도</p>
                          <p className="text-gray-400 text-sm">인식: {result.recognizedText || '(인식 실패)'}</p>
                        </div>
                      </div>
                      <div className="bg-black/30 rounded-lg p-3">
                        <p className="text-white text-sm mb-1">{result.feedback.korean}</p>
                        <p className="text-gray-400 text-xs">{result.feedback.vietnamese}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="space-y-3">
                {!result ? (
                  <>
                    <div className="flex gap-2">
                      <Button onClick={playTTS} variant="outline" className={`flex-1 border-purple-500/50 ${isPlayingTTS ? 'text-purple-400 bg-purple-500/20' : 'text-purple-400'}`}>
                        <Volume2 className={`w-4 h-4 mr-2 ${isPlayingTTS ? 'animate-pulse' : ''}`} />
                        {isPlayingTTS ? '재생중...' : '원어민 듣기'}
                      </Button>
                    </div>
                    <Button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isProcessing}
                      className={`w-full h-14 text-lg font-bold ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`}
                    >
                      {isProcessing ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" />분석중...</>
                      ) : isRecording ? (
                        <><MicOff className="w-5 h-5 mr-2" />녹음 중지</>
                      ) : (
                        <><Mic className="w-5 h-5 mr-2" />더빙 시작</>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={() => setResult(null)} variant="outline" className="flex-1 border-gray-600">
                      <RotateCcw className="w-4 h-4 mr-2" />다시 도전
                    </Button>
                    <Button onClick={handleNext} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500">
                      {currentIndex < scenes.length - 1 ? '다음 장면' : '결과 보기'} <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
      </main>
      <AppFooter />
    </div>
  );
};

export default KDrama;
