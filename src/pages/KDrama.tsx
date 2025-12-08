import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mic, MicOff, RotateCcw, Play, Pause, ChevronRight, ChevronLeft, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

// Import scene images
import romanticScene from "@/assets/drama/romantic-scene.jpg";
import actionScene from "@/assets/drama/action-scene.jpg";
import fantasyScene from "@/assets/drama/fantasy-scene.jpg";
import thrillerScene from "@/assets/drama/thriller-scene.jpg";

// Drama scenes with famous lines
const dramaScenes = [
  {
    id: 1,
    drama: "도깨비 (Goblin)",
    character: "김신",
    korean: "내가 너의 신부다.",
    vietnamese: "Anh là chú rể của em.",
    context: "도깨비가 은탁에게 처음 말하는 장면",
    difficulty: "쉬움",
    audioTip: "천천히, 감정을 담아서",
    image: fantasyScene,
    genre: "fantasy"
  },
  {
    id: 2,
    drama: "별에서 온 그대 (My Love from the Star)",
    character: "도민준",
    korean: "나는 외계인이야.",
    vietnamese: "Tôi là người ngoài hành tinh.",
    context: "도민준이 정체를 밝히는 장면",
    difficulty: "쉬움",
    audioTip: "진지하게",
    image: fantasyScene,
    genre: "fantasy"
  },
  {
    id: 3,
    drama: "태양의 후예 (Descendants of the Sun)",
    character: "유시진",
    korean: "지금 내 눈에는 당신밖에 안 보여요.",
    vietnamese: "Bây giờ trong mắt tôi chỉ có bạn.",
    context: "유시진이 강모연에게 고백하는 장면",
    difficulty: "보통",
    audioTip: "로맨틱하게, 눈을 맞추며",
    image: actionScene,
    genre: "action"
  },
  {
    id: 4,
    drama: "사랑의 불시착 (Crash Landing on You)",
    character: "리정혁",
    korean: "당신은 나의 운명입니다.",
    vietnamese: "Em là định mệnh của anh.",
    context: "리정혁이 세리에게 하는 대사",
    difficulty: "보통",
    audioTip: "깊은 감정을 담아서",
    image: romanticScene,
    genre: "romantic"
  },
  {
    id: 5,
    drama: "이태원 클라쓰 (Itaewon Class)",
    character: "박새로이",
    korean: "나는 절대 포기하지 않아.",
    vietnamese: "Tôi tuyệt đối không bỏ cuộc.",
    context: "박새로이의 각오를 다지는 대사",
    difficulty: "쉬움",
    audioTip: "강하고 단호하게",
    image: thrillerScene,
    genre: "thriller"
  },
  {
    id: 6,
    drama: "응답하라 1988 (Reply 1988)",
    character: "최택",
    korean: "덕선아, 나 너 좋아해.",
    vietnamese: "Deok Sun à, tao thích mày.",
    context: "택이가 덕선이에게 고백하는 장면",
    difficulty: "쉬움",
    audioTip: "수줍게, 떨리는 목소리로",
    image: romanticScene,
    genre: "romantic"
  },
  {
    id: 7,
    drama: "킹덤 (Kingdom)",
    character: "이창",
    korean: "백성을 살려야 합니다.",
    vietnamese: "Phải cứu dân chúng.",
    context: "세자가 결단을 내리는 장면",
    difficulty: "보통",
    audioTip: "비장하게, 왕의 품격으로",
    image: thrillerScene,
    genre: "thriller"
  },
  {
    id: 8,
    drama: "오징어 게임 (Squid Game)",
    character: "성기훈",
    korean: "나는 깐부잖아.",
    vietnamese: "Tao là Gganbu mà.",
    context: "일남 할아버지와의 게임 중",
    difficulty: "쉬움",
    audioTip: "친근하게, 약간 슬프게",
    image: thrillerScene,
    genre: "thriller"
  },
  {
    id: 9,
    drama: "미스터 션샤인 (Mr. Sunshine)",
    character: "유진 초이",
    korean: "조선이 내 나라입니다.",
    vietnamese: "Joseon là đất nước của tôi.",
    context: "유진이 정체성을 선언하는 장면",
    difficulty: "보통",
    audioTip: "결연하게, 자부심을 담아",
    image: actionScene,
    genre: "action"
  },
  {
    id: 10,
    drama: "스카이 캐슬 (SKY Castle)",
    character: "한서진",
    korean: "내 아이는 반드시 성공해야 해.",
    vietnamese: "Con tôi nhất định phải thành công.",
    context: "한서진의 집착을 보여주는 대사",
    difficulty: "어려움",
    audioTip: "집요하게, 약간 광기를 담아",
    image: thrillerScene,
    genre: "thriller"
  }
];

const KDrama = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
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
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const currentScene = dramaScenes[currentIndex];

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
      
      // Convert to base64
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
    setCurrentIndex((prev) => (prev + 1) % dramaScenes.length);
    setResult(null);
  };

  const prevScene = () => {
    setCurrentIndex((prev) => (prev - 1 + dramaScenes.length) % dramaScenes.length);
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
          <div className="w-10" />
        </div>
      </header>

      {/* Score Bar */}
      <div className="bg-black/30 py-2 px-4">
        <div className="container mx-auto flex justify-between items-center text-sm">
          <span className="text-gray-400">
            씬 / Scene: <span className="text-white font-bold">{currentIndex + 1}/{dramaScenes.length}</span>
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
        {/* Drama Info Card */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-white/10"
        >
          {/* Scene Image Background */}
          <div className="absolute inset-0">
            <img 
              src={currentScene.image} 
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
                <Volume2 className="w-5 h-5 text-pink-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-white mb-2 leading-relaxed drop-shadow-lg">
                    "{currentScene.korean}"
                  </p>
                  <p className="text-gray-300 text-sm">
                    {currentScene.vietnamese}
                  </p>
                </div>
              </div>
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
            className="border-white/20 text-white hover:bg-white/10"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            이전 / Trước
          </Button>
          <div className="flex gap-1">
            {dramaScenes.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentIndex ? 'bg-pink-500' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
          <Button
            variant="outline"
            onClick={nextScene}
            className="border-white/20 text-white hover:bg-white/10"
          >
            다음 / Tiếp
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </main>
    </div>
  );
};

export default KDrama;
