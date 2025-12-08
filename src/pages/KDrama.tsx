import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mic, MicOff, RotateCcw, ChevronRight, ChevronLeft, Volume2, RefreshCw, Loader2, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

// Import scene images
import romanticScene from "@/assets/drama/romantic-scene.jpg";
import actionScene from "@/assets/drama/action-scene.jpg";
import fantasyScene from "@/assets/drama/fantasy-scene.jpg";
import thrillerScene from "@/assets/drama/thriller-scene.jpg";

interface DramaScene {
  id: string;
  drama: string;
  character: string;
  korean: string;
  vietnamese: string;
  context: string;
  difficulty: string;
  audioTip: string;
  genre: string;
}

// Genre to image mapping
const genreImages: Record<string, string> = {
  romantic: romanticScene,
  action: actionScene,
  fantasy: fantasyScene,
  thriller: thrillerScene,
};

// Initial fallback scenes
const initialScenes: DramaScene[] = [
  {
    id: "init_1",
    drama: "도깨비 (Goblin)",
    character: "김신",
    korean: "내가 너의 신부다.",
    vietnamese: "Anh là chú rể của em.",
    context: "도깨비가 은탁에게 처음 말하는 장면",
    difficulty: "쉬움",
    audioTip: "천천히, 감정을 담아서",
    genre: "fantasy"
  },
  {
    id: "init_2",
    drama: "사랑의 불시착 (Crash Landing on You)",
    character: "리정혁",
    korean: "당신은 나의 운명입니다.",
    vietnamese: "Em là định mệnh của anh.",
    context: "리정혁이 세리에게 하는 대사",
    difficulty: "보통",
    audioTip: "깊은 감정을 담아서",
    genre: "romantic"
  },
  {
    id: "init_3",
    drama: "오징어 게임 (Squid Game)",
    character: "성기훈",
    korean: "나는 깐부잖아.",
    vietnamese: "Tao là Gganbu mà.",
    context: "일남 할아버지와의 게임 중",
    difficulty: "쉬움",
    audioTip: "친근하게, 약간 슬프게",
    genre: "thriller"
  }
];

const KDrama = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scenes, setScenes] = useState<DramaScene[]>(initialScenes);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingScenes, setIsLoadingScenes] = useState(false);
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
  const [totalScore, setTotalScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>('nova');
  
  const voiceOptions = [
    { id: 'nova', label: '👩 민희', description: '여성 (부드러운)', gender: 'female' },
    { id: 'shimmer', label: '👩 수아', description: '여성 (밝은)', gender: 'female' },
    { id: 'alloy', label: '🧑 하늘', description: '중성', gender: 'neutral' },
    { id: 'echo', label: '👨 현준', description: '남성 (자연스러운)', gender: 'male' },
    { id: 'fable', label: '👨 지훈', description: '남성 (표현력)', gender: 'male' },
    { id: 'onyx', label: '👨 태호', description: '남성 (깊은)', gender: 'male' },
  ];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const currentScene = scenes[currentIndex];

  // Load new scenes from AI
  const loadNewScenes = async (genre?: string, difficulty?: string) => {
    setIsLoadingScenes(true);
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
            genre: genre || selectedGenre,
            difficulty: difficulty || selectedDifficulty,
            excludeIds: usedIds
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load scenes');
      }

      const data = await response.json();
      
      if (data.scenes && data.scenes.length > 0) {
        setScenes(data.scenes);
        setCurrentIndex(0);
        setUsedIds(prev => [...prev, ...data.scenes.map((s: DramaScene) => s.id)]);
        setResult(null);
        
        toast({
          title: "🎬 새로운 명대사 로드!",
          description: `${data.scenes.length}개의 새 대사가 준비되었어요`,
        });
      }
    } catch (error) {
      console.error('Load scenes error:', error);
      toast({
        title: "로드 실패",
        description: "기본 대사를 사용합니다",
        variant: "destructive",
      });
    } finally {
      setIsLoadingScenes(false);
    }
  };

  // Load scenes on mount
  useEffect(() => {
    loadNewScenes();
  }, []);

  const getSceneImage = (genre: string) => {
    return genreImages[genre] || romanticScene;
  };

  // Play TTS audio
  const playTTS = async () => {
    if (isPlayingTTS) {
      // Stop current playback
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

      if (!response.ok) {
        throw new Error('TTS failed');
      }

      const data = await response.json();
      
      if (data.audioContent) {
        const audioSrc = `data:audio/mp3;base64,${data.audioContent}`;
        const audio = new Audio(audioSrc);
        audioRef.current = audio;
        
        audio.onended = () => {
          setIsPlayingTTS(false);
          audioRef.current = null;
        };
        
        audio.onerror = () => {
          setIsPlayingTTS(false);
          audioRef.current = null;
          toast({
            title: "재생 오류",
            description: "오디오 재생에 실패했습니다",
            variant: "destructive",
          });
        };
        
        await audio.play();
        
        toast({
          title: "🔊 원어민 발음 예시",
          description: "잘 듣고 따라해보세요!",
        });
      }
    } catch (error) {
      console.error('TTS error:', error);
      setIsPlayingTTS(false);
      toast({
        title: "TTS 오류",
        description: "발음 예시를 불러올 수 없습니다",
        variant: "destructive",
      });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        await processAudio();
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      setResult(null);
      
      toast({
        title: "🎙️ 녹음 시작!",
        description: "대사를 읽어주세요 / Hãy đọc lời thoại",
      });
    } catch (error) {
      console.error('Microphone error:', error);
      toast({
        title: "마이크 오류 / Lỗi mic",
        description: "마이크 권한을 허용해주세요",
        variant: "destructive",
      });
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
      toast({
        title: "오류 / Lỗi",
        description: "녹음된 음성이 없습니다",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
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
          body: JSON.stringify({
            audio: base64Audio,
            originalText: currentScene.korean
          }),
        }
      );

      if (!response.ok) {
        throw new Error('API 오류');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setResult({
        recognizedText: data.recognizedText,
        accuracy: data.accuracy,
        feedback: data.feedback
      });
      
      setTotalScore(prev => prev + data.accuracy);
      setAttempts(prev => prev + 1);

      toast({
        title: `${data.feedback.emoji} ${data.feedback.grade}등급!`,
        description: `정확도: ${data.accuracy}%`,
      });

    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "처리 오류 / Lỗi xử lý",
        description: "다시 시도해주세요",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const nextScene = () => {
    if (currentIndex >= scenes.length - 1) {
      // Load more scenes when reaching the end
      loadNewScenes();
    } else {
      setCurrentIndex(prev => prev + 1);
      setResult(null);
    }
  };

  const prevScene = () => {
    setCurrentIndex((prev) => (prev - 1 + scenes.length) % scenes.length);
    setResult(null);
  };

  const resetResult = () => {
    setResult(null);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case '쉬움': return 'text-green-400';
      case '보통': return 'text-yellow-400';
      case '어려움': return 'text-red-400';
      default: return 'text-gray-400';
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

  const difficulties = [
    { id: '쉬움', label: '쉬움 / Dễ', color: 'text-green-400' },
    { id: '보통', label: '보통 / TB', color: 'text-yellow-400' },
    { id: '어려움', label: '어려움 / Khó', color: 'text-red-400' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/50 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/game")}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            🎬 K-Drama 더빙 / Lồng tiếng
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadNewScenes()}
            disabled={isLoadingScenes}
            className="text-white hover:bg-white/10"
          >
            {isLoadingScenes ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="bg-black/30 py-3 px-4 border-b border-white/5">
        <div className="container mx-auto">
          {/* Genre Filter */}
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
            <Button
              size="sm"
              variant={selectedGenre === null ? "default" : "outline"}
              onClick={() => {
                setSelectedGenre(null);
                loadNewScenes(undefined, selectedDifficulty || undefined);
              }}
              className="text-xs shrink-0"
            >
              전체
            </Button>
            {genres.map(genre => (
              <Button
                key={genre.id}
                size="sm"
                variant={selectedGenre === genre.id ? "default" : "outline"}
                onClick={() => {
                  setSelectedGenre(genre.id);
                  loadNewScenes(genre.id, selectedDifficulty || undefined);
                }}
                className="text-xs shrink-0"
              >
                {genre.emoji} {genre.label}
              </Button>
            ))}
          </div>
          
          {/* Difficulty Filter */}
          <div className="flex gap-2 overflow-x-auto">
            <Button
              size="sm"
              variant={selectedDifficulty === null ? "default" : "outline"}
              onClick={() => {
                setSelectedDifficulty(null);
                loadNewScenes(selectedGenre || undefined, undefined);
              }}
              className="text-xs shrink-0"
            >
              모든 난이도
            </Button>
            {difficulties.map(diff => (
              <Button
                key={diff.id}
                size="sm"
                variant={selectedDifficulty === diff.id ? "default" : "outline"}
                onClick={() => {
                  setSelectedDifficulty(diff.id);
                  loadNewScenes(selectedGenre || undefined, diff.id);
                }}
                className={`text-xs shrink-0 ${selectedDifficulty === diff.id ? '' : diff.color}`}
              >
                {diff.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Score Bar */}
      <div className="bg-black/20 py-2 px-4">
        <div className="container mx-auto flex justify-between items-center text-sm">
          <span className="text-gray-400">
            씬 / Scene: <span className="text-white font-bold">{currentIndex + 1}/{scenes.length}</span>
          </span>
          <span className="text-gray-400">
            평균 / TB: <span className="text-cyan-400 font-bold">
              {attempts > 0 ? Math.round(totalScore / attempts) : 0}%
            </span>
          </span>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Loading State */}
        {isLoadingScenes && scenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-pink-500 mb-4" />
            <p className="text-gray-400">명대사 로딩중...</p>
          </div>
        ) : currentScene ? (
          <>
            {/* Drama Info Card */}
            <motion.div
              key={currentScene.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-2xl border border-white/10"
            >
              {/* Scene Image Background */}
              <div className="absolute inset-0">
                <img 
                  src={getSceneImage(currentScene.genre)} 
                  alt={currentScene.drama}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
              </div>

              {/* Content Overlay */}
              <div className="relative z-10 p-6">
                {/* Drama Title */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-pink-300 drop-shadow-lg">{currentScene.drama}</h2>
                    <p className="text-sm text-gray-300 drop-shadow">캐릭터: {currentScene.character}</p>
                  </div>
                  <span className={`text-sm font-medium px-3 py-1 rounded-full bg-black/50 backdrop-blur ${getDifficultyColor(currentScene.difficulty)}`}>
                    {currentScene.difficulty}
                  </span>
                </div>

                {/* Line to Read */}
                <div className="bg-black/60 backdrop-blur-sm rounded-xl p-5 mb-4 border border-white/10">
                  <div className="flex items-start gap-3 mb-3">
                    <button
                      onClick={playTTS}
                      disabled={isPlayingTTS && !audioRef.current}
                      className={`flex-shrink-0 p-2 rounded-full transition-all ${
                        isPlayingTTS 
                          ? 'bg-pink-500 animate-pulse' 
                          : 'bg-pink-500/20 hover:bg-pink-500/40'
                      }`}
                    >
                      {isPlayingTTS ? (
                        <Volume2 className="w-5 h-5 text-white animate-pulse" />
                      ) : (
                        <PlayCircle className="w-5 h-5 text-pink-400" />
                      )}
                    </button>
                    <div className="flex-1">
                      <p className="text-2xl font-bold text-white mb-2 leading-relaxed drop-shadow-lg">
                        "{currentScene.korean}"
                      </p>
                      <p className="text-gray-300 text-sm">
                        {currentScene.vietnamese}
                      </p>
                    </div>
                  </div>
                  
                  {/* Voice Selector */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 mb-2">🎙️ 목소리 선택 / Chọn giọng nói:</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {voiceOptions.map((voice) => (
                        <button
                          key={voice.id}
                          onClick={() => setSelectedVoice(voice.id)}
                          className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                            selectedVoice === voice.id
                              ? voice.gender === 'female' 
                                ? 'bg-pink-500 text-white'
                                : voice.gender === 'male'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-purple-500 text-white'
                              : 'bg-white/10 text-gray-300 hover:bg-white/20'
                          }`}
                        >
                          <span className="block">{voice.label}</span>
                          <span className="block text-[10px] opacity-70">{voice.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Listen Button */}
                  <Button
                    onClick={playTTS}
                    disabled={isPlayingTTS && !audioRef.current}
                    size="sm"
                    className={`w-full ${
                      isPlayingTTS 
                        ? 'bg-pink-500 hover:bg-pink-600' 
                        : voiceOptions.find(v => v.id === selectedVoice)?.gender === 'male'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'
                          : voiceOptions.find(v => v.id === selectedVoice)?.gender === 'neutral'
                            ? 'bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600'
                            : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600'
                    }`}
                  >
                    {isPlayingTTS ? (
                      <>
                        <Volume2 className="w-4 h-4 mr-2 animate-pulse" />
                        재생 중... / Đang phát...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        🎧 발음 듣기 / Nghe phát âm
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-gray-400 mt-3 italic">
                    💡 {currentScene.audioTip}
                  </p>
                </div>

                {/* Context */}
                <p className="text-xs text-gray-400 text-center drop-shadow">
                  📺 {currentScene.context}
                </p>
              </div>
            </motion.div>

            {/* Recording Button */}
            <div className="flex flex-col items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isRecording 
                    ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/50' 
                    : isProcessing
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:shadow-lg hover:shadow-pink-500/50'
                }`}
              >
                {isProcessing ? (
                  <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isRecording ? (
                  <MicOff className="w-10 h-10 text-white" />
                ) : (
                  <Mic className="w-10 h-10 text-white" />
                )}
              </motion.button>
              <p className="text-sm text-gray-400">
                {isProcessing 
                  ? "분석 중... / Đang phân tích..." 
                  : isRecording 
                    ? "녹음 중... 버튼을 눌러 중지 / Đang ghi... Nhấn để dừng" 
                    : "버튼을 눌러 녹음 시작 / Nhấn để bắt đầu ghi âm"
                }
              </p>
            </div>

            {/* Result */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-6 border border-white/10"
                >
                  {/* Grade Badge */}
                  <div className="flex justify-center mb-4">
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-r ${getGradeColor(result.feedback.grade)} flex items-center justify-center`}>
                      <span className="text-4xl font-black text-white">{result.feedback.grade}</span>
                    </div>
                  </div>

                  {/* Accuracy */}
                  <div className="text-center mb-4">
                    <p className="text-4xl font-bold text-white">{result.accuracy}%</p>
                    <p className="text-gray-400 text-sm">정확도 / Độ chính xác</p>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-4">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${result.accuracy}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-full rounded-full bg-gradient-to-r ${getGradeColor(result.feedback.grade)}`}
                    />
                  </div>

                  {/* Recognized Text */}
                  <div className="bg-black/40 rounded-xl p-4 mb-4">
                    <p className="text-xs text-gray-500 mb-1">인식된 음성 / Giọng nói được nhận dạng:</p>
                    <p className="text-white font-medium">
                      "{result.recognizedText || "(인식 실패 / Không nhận dạng được)"}"
                    </p>
                  </div>

                  {/* Feedback */}
                  <div className="text-center">
                    <p className="text-xl mb-1">{result.feedback.emoji}</p>
                    <p className="text-white font-medium">{result.feedback.korean}</p>
                    <p className="text-gray-400 text-sm">{result.feedback.vietnamese}</p>
                  </div>

                  {/* Retry Button */}
                  <Button
                    onClick={resetResult}
                    className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    다시 도전 / Thử lại
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={prevScene}
                disabled={currentIndex === 0}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                이전 / Trước
              </Button>
              <div className="flex gap-1">
                {scenes.slice(0, Math.min(scenes.length, 10)).map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === currentIndex ? 'bg-pink-500' : 'bg-gray-600'
                    }`}
                  />
                ))}
                {scenes.length > 10 && (
                  <span className="text-gray-500 text-xs ml-1">+{scenes.length - 10}</span>
                )}
              </div>
              <Button
                variant="outline"
                onClick={nextScene}
                className="border-white/20 text-white hover:bg-white/10"
              >
                {currentIndex >= scenes.length - 1 ? (
                  <>
                    새로고침 <RefreshCw className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  <>
                    다음 / Tiếp <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
};

export default KDrama;
