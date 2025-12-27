import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Volume2, 
  VolumeX, 
  Loader2, 
  Check, 
  X, 
  RotateCcw,
  Mic,
  MicOff,
  Play,
  Pause
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface ListeningQuestion {
  id: number;
  korean: string;
  english: string;
  hint?: string;
}

interface ListeningExerciseProps {
  questions: ListeningQuestion[];
  onComplete: (score: number, correctCount: number, totalCount: number) => void;
}

const ListeningExercise = ({ questions, onComplete }: ListeningExerciseProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [playCount, setPlayCount] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const currentQuestion = questions[currentIndex];
  const isComplete = currentIndex >= questions.length;
  
  const playAudio = useCallback(async () => {
    if (isLoading || !currentQuestion) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/korean-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            text: currentQuestion.korean,
            voice: "nova", // OpenAI TTS HD - most natural Korean voice
            speed: playCount === 0 ? 1.0 : 0.85 // Normal speed first, slower on repeat
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error("TTS 요청 실패");
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        setPlayCount(prev => prev + 1);
      };
      audio.onerror = () => {
        setIsPlaying(false);
        toast({
          title: "재생 오류",
          description: "오디오를 재생할 수 없습니다.",
          variant: "destructive",
        });
      };
      
      await audio.play();
    } catch (error) {
      console.error("TTS error:", error);
      toast({
        title: "오류 발생",
        description: "음성을 생성할 수 없습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentQuestion, playCount, toast, isLoading]);
  
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);
  
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          
          try {
            setIsLoading(true);
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/korean-stt`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({ audio: base64, language: 'ko' }),
              }
            );
            
            if (!response.ok) {
              throw new Error("STT 요청 실패");
            }
            
            const result = await response.json();
            if (result.text) {
              setUserAnswer(result.text);
            }
          } catch (error) {
            console.error("STT error:", error);
            toast({
              title: "인식 오류",
              description: "음성을 인식할 수 없습니다.",
              variant: "destructive",
            });
          } finally {
            setIsLoading(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      
      // Auto stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 10000);
      
    } catch (error) {
      console.error("Recording error:", error);
      toast({
        title: "마이크 오류",
        description: "마이크를 사용할 수 없습니다.",
        variant: "destructive",
      });
    }
  }, [toast]);
  
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);
  
  const checkAnswer = useCallback(() => {
    if (!userAnswer.trim() || !currentQuestion) return;
    
    // Normalize and compare
    const normalize = (s: string) => s.replace(/\s+/g, '').replace(/[.,!?]/g, '').toLowerCase();
    const correct = normalize(currentQuestion.korean) === normalize(userAnswer);
    
    setIsCorrect(correct);
    setShowResult(true);
    
    if (correct) {
      setCorrectCount(prev => prev + 1);
    }
  }, [userAnswer, currentQuestion]);
  
  const nextQuestion = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      // Complete
      const finalScore = Math.round((correctCount + (isCorrect ? 1 : 0)) / questions.length * 100);
      onComplete(finalScore, correctCount + (isCorrect ? 1 : 0), questions.length);
    } else {
      setCurrentIndex(prev => prev + 1);
      setUserAnswer("");
      setShowResult(false);
      setIsCorrect(false);
      setPlayCount(0);
      stopAudio();
    }
  }, [currentIndex, questions.length, correctCount, isCorrect, onComplete, stopAudio]);
  
  if (isComplete) {
    return null;
  }
  
  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>문제 {currentIndex + 1} / {questions.length}</span>
        <span>정답 {correctCount}개</span>
      </div>
      
      {/* Audio Player */}
      <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
        <div className="text-center mb-2">
          <p className="text-sm text-muted-foreground mb-1">듣고 받아쓰기</p>
          <p className="text-xs text-muted-foreground">{currentQuestion.english}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            size="lg"
            variant={isPlaying ? "secondary" : "default"}
            className="w-16 h-16 rounded-full"
            onClick={isPlaying ? stopAudio : playAudio}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-1" />
            )}
          </Button>
          
          <Button
            size="lg"
            variant={isRecording ? "destructive" : "outline"}
            className="w-16 h-16 rounded-full"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
          >
            {isRecording ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </Button>
        </div>
        
        {playCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {playCount}회 재생됨 {playCount > 1 && "(느린 속도)"}
          </p>
        )}
      </div>
      
      {/* Answer Input */}
      <div className="space-y-3">
        <Input
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          placeholder="들은 내용을 한국어로 입력하세요"
          className="text-lg py-6"
          disabled={showResult}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !showResult) {
              checkAnswer();
            }
          }}
        />
        
        {currentQuestion.hint && !showResult && (
          <p className="text-xs text-muted-foreground text-center">
            힌트: {currentQuestion.hint}
          </p>
        )}
      </div>
      
      {/* Result */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "p-4 rounded-xl",
              isCorrect ? "bg-korean-green/10 border border-korean-green/30" : "bg-korean-red/10 border border-korean-red/30"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <Check className="w-5 h-5 text-korean-green" />
              ) : (
                <X className="w-5 h-5 text-korean-red" />
              )}
              <span className={cn(
                "font-medium",
                isCorrect ? "text-korean-green" : "text-korean-red"
              )}>
                {isCorrect ? t("listening.correct") : t("listening.incorrect")}
              </span>
            </div>
            
            {!isCorrect && (
              <div className="text-sm">
                <p className="text-muted-foreground">{t("listening.correctAnswer")}:</p>
                <p className="font-medium text-foreground">{currentQuestion.korean}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Actions */}
      <div className="flex gap-3">
        {!showResult ? (
          <Button
            className="flex-1"
            onClick={checkAnswer}
            disabled={!userAnswer.trim() || isLoading}
          >
            정답 확인
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowResult(false);
                setUserAnswer("");
              }}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              다시 듣기
            </Button>
            <Button
              className="flex-1"
              onClick={nextQuestion}
            >
              {currentIndex + 1 >= questions.length ? "결과 보기" : "다음 문제"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default ListeningExercise;
