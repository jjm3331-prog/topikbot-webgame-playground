import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Mic, MicOff, Play, Pause, SkipForward, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface Subtitle {
  start: number;
  end: number;
  text: string;
}

interface ShadowingModeProps {
  subtitles: Subtitle[];
  currentTime: number;
  onSeekTo: (time: number) => void;
  onPause: () => void;
  onPlay: () => void;
  isPlaying: boolean;
}

type ShadowingStep = 'listen' | 'ready' | 'record' | 'result';

export default function ShadowingMode({
  subtitles,
  currentTime,
  onSeekTo,
  onPause,
  onPlay,
  isPlaying,
}: ShadowingModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [step, setStep] = useState<ShadowingStep>('listen');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [completedCount, setCompletedCount] = useState(0);

  const recognitionRef = useRef<any>(null);
  const currentSub = subtitles[currentIndex];

  // 현재 자막 위치 추적
  useEffect(() => {
    if (step === 'listen' && currentSub) {
      if (currentTime >= currentSub.end - 0.1) {
        // 자막 끝에 도달하면 멈추고 따라하기 준비
        onPause();
        setStep('ready');
      }
    }
  }, [currentTime, currentSub, step]);

  const startShadowing = () => {
    if (!currentSub) return;
    onSeekTo(currentSub.start);
    onPlay();
    setStep('listen');
    setTranscript('');
    setScore(null);
  };

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('이 브라우저는 음성인식을 지원하지 않습니다');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = 'ko-KR';
    recognitionRef.current.interimResults = false;
    recognitionRef.current.maxAlternatives = 1;

    recognitionRef.current.onresult = (event: any) => {
      const result = event.results[0][0].transcript;
      setTranscript(result);
      calculateScore(result);
      setStep('result');
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      setStep('ready');
    };

    recognitionRef.current.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current.start();
    setIsRecording(true);
    setStep('record');
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const calculateScore = (userText: string) => {
    if (!currentSub) return;
    
    const original = currentSub.text.replace(/[^\w가-힣]/g, '').toLowerCase();
    const spoken = userText.replace(/[^\w가-힣]/g, '').toLowerCase();
    
    // 간단한 유사도 계산 (Levenshtein distance 기반)
    const maxLen = Math.max(original.length, spoken.length);
    if (maxLen === 0) {
      setScore(100);
      return;
    }

    let matches = 0;
    const minLen = Math.min(original.length, spoken.length);
    for (let i = 0; i < minLen; i++) {
      if (original[i] === spoken[i]) matches++;
    }

    const similarity = Math.round((matches / maxLen) * 100);
    setScore(similarity);

    if (similarity >= 70) {
      setCompletedCount(prev => prev + 1);
    }
  };

  const nextSentence = () => {
    if (currentIndex < subtitles.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setStep('listen');
      setTranscript('');
      setScore(null);
      
      const nextSub = subtitles[currentIndex + 1];
      if (nextSub) {
        onSeekTo(nextSub.start);
        onPlay();
      }
    }
  };


  if (subtitles.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          자막이 없어서 섀도잉을 시작할 수 없습니다
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/30">
      <CardContent className="p-4 space-y-4">
        {/* Progress */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {currentIndex + 1} / {subtitles.length}
          </span>
          <Badge variant="outline">
            ✅ 완료: {completedCount}개
          </Badge>
        </div>
        <Progress value={(currentIndex / subtitles.length) * 100} className="h-2" />

        {/* Current Sentence */}
        <div className="p-4 bg-muted/50 rounded-xl text-center">
          <p className="text-lg font-medium">
            {currentSub?.text || '자막 없음'}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center gap-2">
          {['listen', 'ready', 'record', 'result'].map((s) => (
            <div
              key={s}
              className={`w-3 h-3 rounded-full transition-all ${
                step === s ? 'bg-primary scale-125' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Controls based on step */}
        <AnimatePresence mode="wait">
          {step === 'listen' && (
            <motion.div
              key="listen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-4"
            >
              <Badge className="bg-blue-500/20 text-blue-600">
                🎧 듣는 중...
              </Badge>
            </motion.div>
          )}

          {step === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <p className="text-sm text-muted-foreground">들은 문장을 따라 말해보세요</p>
              <Button size="lg" onClick={startRecording} className="gap-2">
                <Mic className="w-5 h-5" />
                녹음 시작
              </Button>
              <Button size="sm" variant="ghost" onClick={startShadowing}>
                <Play className="w-4 h-4 mr-1" /> 다시 듣기
              </Button>
            </motion.div>
          )}

          {step === 'record' && (
            <motion.div
              key="record"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                  <Mic className="w-10 h-10 text-red-500" />
                </div>
              </div>
              <p className="text-sm font-medium text-red-500">녹음 중...</p>
              <Button size="sm" variant="destructive" onClick={stopRecording}>
                <MicOff className="w-4 h-4 mr-1" /> 녹음 중지
              </Button>
            </motion.div>
          )}

          {step === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Your speech */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">내 발음:</p>
                <p className="font-medium">{transcript || '(인식 실패)'}</p>
              </div>

              {/* Score */}
              {score !== null && (
                <div className="flex items-center justify-center gap-3">
                  {score >= 80 ? (
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  ) : score >= 50 ? (
                    <CheckCircle2 className="w-8 h-8 text-yellow-500" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-500" />
                  )}
                  <div>
                    <p className="text-3xl font-bold">{score}%</p>
                    <p className="text-sm text-muted-foreground">
                      {score >= 80 ? '훌륭해요!' : score >= 50 ? '좋아요!' : '다시 도전!'}
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={startShadowing}>
                  <Play className="w-4 h-4 mr-1" /> 다시 연습
                </Button>
                <Button onClick={nextSentence} disabled={currentIndex >= subtitles.length - 1}>
                  <SkipForward className="w-4 h-4 mr-1" /> 다음 문장
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start button when not started */}
        {step !== 'listen' && step !== 'record' && currentIndex === 0 && score === null && (
          <div className="text-center pt-2">
            <Button onClick={startShadowing} className="gap-2">
              <Play className="w-4 h-4" /> 섀도잉 시작
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
