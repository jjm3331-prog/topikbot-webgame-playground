import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Puzzle, 
  PenTool, 
  Zap, 
  RefreshCw, 
  Check, 
  X, 
  Trophy,
  Flame,
  Timer,
  ArrowLeft,
  Sparkles,
  GripVertical,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";

type TopikLevel = "1-2" | "3-4" | "5-6";

// Custom Level Selector for Grammar
function GrammarLevelSelector({ value, onChange }: { value: TopikLevel; onChange: (v: TopikLevel) => void }) {
  const levels: { id: TopikLevel; label: string; color: string }[] = [
    { id: "1-2", label: "1-2급 (초급)", color: "from-green-400 to-emerald-500" },
    { id: "3-4", label: "3-4급 (중급)", color: "from-blue-400 to-cyan-500" },
    { id: "5-6", label: "5-6급 (고급)", color: "from-purple-400 to-pink-500" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {levels.map((level) => (
        <Button
          key={level.id}
          variant={value === level.id ? "default" : "outline"}
          onClick={() => onChange(level.id)}
          className={value === level.id ? `bg-gradient-to-r ${level.color} text-white border-0` : ""}
        >
          {level.label}
        </Button>
      ))}
    </div>
  );
}

interface GrammarQuestion {
  id: string;
  type: "assembly" | "correction" | "battle";
  question: string;
  parts?: string[];
  correctOrder?: number[];
  errorPart?: string;
  correctPart?: string;
  options?: string[];
  answer: string;
  explanation: string;
  grammarPoint: string;
}

// ==================== 문장 조립 퍼즐 ====================
function AssemblyGame({ level }: { level: TopikLevel }) {
  const [questions, setQuestions] = useState<GrammarQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [availableParts, setAvailableParts] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('grammar-content', {
        body: { level, type: 'assembly', count: 10 }
      });
      
      if (error) throw error;
      
      if (data?.questions?.length > 0) {
        setQuestions(data.questions);
        resetGame(data.questions[0]);
      }
    } catch (error) {
      console.error('Error fetching grammar questions:', error);
      // Fallback questions
      const fallback = getFallbackQuestions(level, 'assembly');
      setQuestions(fallback);
      resetGame(fallback[0]);
    } finally {
      setIsLoading(false);
    }
  }, [level]);

  useEffect(() => {
    fetchQuestions();
  }, [level]);

  const resetGame = (question: GrammarQuestion) => {
    setSelectedParts([]);
    setAvailableParts(question.parts ? [...question.parts].sort(() => Math.random() - 0.5) : []);
    setIsCorrect(null);
  };

  const handleSelectPart = (part: string, index: number) => {
    setSelectedParts([...selectedParts, part]);
    setAvailableParts(availableParts.filter((_, i) => i !== index));
  };

  const handleRemovePart = (part: string, index: number) => {
    setAvailableParts([...availableParts, part]);
    setSelectedParts(selectedParts.filter((_, i) => i !== index));
  };

  const handleCheck = () => {
    const current = questions[currentIndex];
    const userAnswer = selectedParts.join(' ');
    const correct = userAnswer === current.answer;
    
    setIsCorrect(correct);
    
    if (correct) {
      const comboBonus = Math.min(combo, 5) * 5;
      setScore(prev => prev + 10 + comboBonus);
      setCombo(prev => prev + 1);
      toast.success(`정답! +${10 + comboBonus}점`);
    } else {
      setCombo(0);
      toast.error("다시 시도해보세요!");
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      resetGame(questions[currentIndex + 1]);
    } else {
      toast.success(`게임 완료! 총 ${score}점`);
      setCurrentIndex(0);
      fetchQuestions();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const current = questions[currentIndex];
  if (!current) return null;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Trophy className="w-4 h-4 mr-2" />
            {score}점
          </Badge>
          {combo > 0 && (
            <Badge className="bg-orange-500 text-lg px-4 py-2">
              <Flame className="w-4 h-4 mr-2" />
              {combo} 콤보!
            </Badge>
          )}
        </div>
        <Badge variant="secondary">
          {currentIndex + 1} / {questions.length}
        </Badge>
      </div>

      {/* Grammar Point */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-medium">문법 포인트:</span>
          <span className="text-muted-foreground">{current.grammarPoint}</span>
        </div>
      </Card>

      {/* Question */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-2">다음 어절들을 올바른 순서로 조립하세요:</h3>
        <p className="text-muted-foreground text-sm mb-4">{current.question}</p>

        {/* Selected Parts (Answer Area) */}
        <div className="min-h-16 p-4 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/30 mb-4">
          <div className="flex flex-wrap gap-2">
            {selectedParts.length === 0 ? (
              <span className="text-muted-foreground">여기에 어절을 순서대로 배치하세요</span>
            ) : (
              selectedParts.map((part, index) => (
                <motion.button
                  key={`selected-${index}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/80 transition-colors flex items-center gap-2"
                  onClick={() => handleRemovePart(part, index)}
                  disabled={isCorrect !== null}
                >
                  <GripVertical className="w-4 h-4" />
                  {part}
                </motion.button>
              ))
            )}
          </div>
        </div>

        {/* Available Parts */}
        <div className="flex flex-wrap gap-2 mb-6">
          {availableParts.map((part, index) => (
            <motion.button
              key={`available-${index}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
              onClick={() => handleSelectPart(part, index)}
              disabled={isCorrect !== null}
            >
              {part}
            </motion.button>
          ))}
        </div>

        {/* Result */}
        <AnimatePresence>
          {isCorrect !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-lg mb-4 ${
                isCorrect ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <X className="w-5 h-5 text-red-500" />
                )}
                <span className="font-medium">{isCorrect ? '정답입니다!' : '틀렸습니다'}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>정답:</strong> {current.answer}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                <strong>설명:</strong> {current.explanation}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buttons */}
        <div className="flex gap-3">
          {isCorrect === null ? (
            <Button 
              onClick={handleCheck} 
              disabled={selectedParts.length === 0}
              className="flex-1"
            >
              <Check className="w-4 h-4 mr-2" />
              확인하기
            </Button>
          ) : (
            <Button onClick={handleNext} className="flex-1">
              {currentIndex < questions.length - 1 ? '다음 문제' : '다시 시작'}
            </Button>
          )}
          <Button variant="outline" onClick={() => resetGame(current)} disabled={isCorrect !== null}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ==================== 틀린 문장 고치기 ====================
function CorrectionGame({ level }: { level: TopikLevel }) {
  const [questions, setQuestions] = useState<GrammarQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('grammar-content', {
        body: { level, type: 'correction', count: 10 }
      });
      
      if (error) throw error;
      
      if (data?.questions?.length > 0) {
        setQuestions(data.questions);
      }
    } catch (error) {
      console.error('Error fetching grammar questions:', error);
      const fallback = getFallbackQuestions(level, 'correction');
      setQuestions(fallback);
    } finally {
      setIsLoading(false);
    }
  }, [level]);

  useEffect(() => {
    fetchQuestions();
  }, [level]);

  const handleSelectError = (word: string) => {
    const current = questions[currentIndex];
    if (word === current.errorPart) {
      setSelectedError(word);
      setShowOptions(true);
    } else {
      toast.error("틀린 부분을 다시 찾아보세요!");
    }
  };

  const handleSelectCorrection = (option: string) => {
    const current = questions[currentIndex];
    const correct = option === current.correctPart;
    
    setIsCorrect(correct);
    
    if (correct) {
      setScore(prev => prev + 10);
      toast.success("정답! +10점");
    } else {
      toast.error("다시 생각해보세요!");
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedError(null);
      setShowOptions(false);
      setIsCorrect(null);
    } else {
      toast.success(`게임 완료! 총 ${score}점`);
      setCurrentIndex(0);
      setSelectedError(null);
      setShowOptions(false);
      setIsCorrect(null);
      fetchQuestions();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const current = questions[currentIndex];
  if (!current) return null;

  const words = current.question.split(' ');

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Trophy className="w-4 h-4 mr-2" />
          {score}점
        </Badge>
        <Badge variant="secondary">
          {currentIndex + 1} / {questions.length}
        </Badge>
      </div>

      {/* Grammar Point */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-primary" />
          <span className="font-medium">오류 유형:</span>
          <span className="text-muted-foreground">{current.grammarPoint}</span>
        </div>
      </Card>

      {/* Sentence */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">문장에서 틀린 부분을 찾아 터치하세요:</h3>
        
        <div className="flex flex-wrap gap-2 mb-6">
          {words.map((word, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedError === word
                  ? 'bg-red-500 text-white'
                  : 'bg-muted hover:bg-muted/80'
              }`}
              onClick={() => handleSelectError(word)}
              disabled={showOptions}
            >
              {word}
            </motion.button>
          ))}
        </div>

        {/* Correction Options */}
        <AnimatePresence>
          {showOptions && !isCorrect && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 mb-6"
            >
              <p className="text-sm font-medium">올바른 표현을 선택하세요:</p>
              <div className="flex flex-wrap gap-2">
                {current.options?.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => handleSelectCorrection(option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result */}
        <AnimatePresence>
          {isCorrect !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-lg mb-4 ${
                isCorrect ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <X className="w-5 h-5 text-red-500" />
                )}
                <span className="font-medium">{isCorrect ? '정답입니다!' : '틀렸습니다'}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>정답:</strong> {current.errorPart} → {current.correctPart}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                <strong>설명:</strong> {current.explanation}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next Button */}
        {isCorrect !== null && (
          <Button onClick={handleNext} className="w-full">
            {currentIndex < questions.length - 1 ? '다음 문제' : '다시 시작'}
          </Button>
        )}
      </Card>
    </div>
  );
}

// ==================== 문법 배틀 (60초) ====================
function BattleGame({ level }: { level: TopikLevel }) {
  const [questions, setQuestions] = useState<GrammarQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'finished'>('ready');
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('grammar-content', {
        body: { level, type: 'battle', count: 30 }
      });
      
      if (error) throw error;
      
      if (data?.questions?.length > 0) {
        setQuestions(data.questions);
      }
    } catch (error) {
      console.error('Error fetching grammar questions:', error);
      const fallback = getFallbackQuestions(level, 'battle');
      setQuestions(fallback);
    } finally {
      setIsLoading(false);
    }
  }, [level]);

  useEffect(() => {
    fetchQuestions();
  }, [level]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('finished');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  const startGame = () => {
    setScore(0);
    setCombo(0);
    setTimeLeft(60);
    setCurrentIndex(0);
    setGameState('playing');
  };

  const handleAnswer = (option: string) => {
    const current = questions[currentIndex];
    const correct = option === current.answer;

    if (correct) {
      const comboBonus = Math.min(combo, 10) * 2;
      setScore(prev => prev + 10 + comboBonus);
      setCombo(prev => prev + 1);
    } else {
      setCombo(0);
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setGameState('finished');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Ready State
  if (gameState === 'ready') {
    return (
      <Card className="p-8 text-center">
        <Zap className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
        <h2 className="text-2xl font-bold mb-2">문법 배틀</h2>
        <p className="text-muted-foreground mb-6">
          60초 안에 최대한 많은 문법 문제를 풀어보세요!<br />
          연속 정답 시 콤보 보너스!
        </p>
        <Button onClick={startGame} size="lg" className="gap-2">
          <Timer className="w-5 h-5" />
          시작하기
        </Button>
      </Card>
    );
  }

  // Finished State
  if (gameState === 'finished') {
    return (
      <Card className="p-8 text-center">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
        <h2 className="text-2xl font-bold mb-2">게임 종료!</h2>
        <p className="text-4xl font-bold text-primary mb-2">{score}점</p>
        <p className="text-muted-foreground mb-6">
          {currentIndex}문제 도전
        </p>
        <Button onClick={() => { fetchQuestions(); startGame(); }} size="lg" className="gap-2">
          <RefreshCw className="w-5 h-5" />
          다시 도전
        </Button>
      </Card>
    );
  }

  // Playing State
  const current = questions[currentIndex];
  if (!current) return null;

  return (
    <div className="space-y-6">
      {/* Timer & Score */}
      <div className="flex items-center justify-between">
        <Badge variant={timeLeft <= 10 ? "destructive" : "outline"} className="text-lg px-4 py-2">
          <Timer className="w-4 h-4 mr-2" />
          {timeLeft}초
        </Badge>
        <div className="flex items-center gap-3">
          {combo > 0 && (
            <Badge className="bg-orange-500 text-lg px-4 py-2">
              <Flame className="w-4 h-4 mr-2" />
              {combo}x
            </Badge>
          )}
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Trophy className="w-4 h-4 mr-2" />
            {score}
          </Badge>
        </div>
      </div>

      {/* Progress */}
      <Progress value={(60 - timeLeft) / 60 * 100} className="h-2" />

      {/* Question */}
      <Card className="p-6">
        <div className="text-sm text-muted-foreground mb-2">
          {current.grammarPoint}
        </div>
        <h3 className="text-xl font-medium mb-6">{current.question}</h3>
        
        <div className="grid grid-cols-2 gap-3">
          {current.options?.map((option, index) => (
            <motion.div key={index} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                className="w-full h-14 text-lg"
                onClick={() => handleAnswer(option)}
              >
                {option}
              </Button>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ==================== Fallback Questions ====================
function getFallbackQuestions(level: TopikLevel, type: string): GrammarQuestion[] {
  const questions: Record<TopikLevel, Record<string, GrammarQuestion[]>> = {
    "1-2": {
      assembly: [
        { id: "1", type: "assembly", question: "주어 + 목적어 + 동사 순서로 배열하세요", parts: ["저는", "밥을", "먹어요"], correctOrder: [0, 1, 2], answer: "저는 밥을 먹어요", explanation: "한국어는 주어-목적어-동사 순서입니다", grammarPoint: "기본 어순 (SOV)" },
        { id: "2", type: "assembly", question: "장소와 동사를 연결하세요", parts: ["학교에", "가요", "저는"], correctOrder: [2, 0, 1], answer: "저는 학교에 가요", explanation: "장소를 나타낼 때 '에'를 사용합니다", grammarPoint: "조사 -에 (장소)" },
      ],
      correction: [
        { id: "1", type: "correction", question: "저는 학교를 가요", errorPart: "학교를", correctPart: "학교에", options: ["학교에", "학교가", "학교는"], answer: "학교에", explanation: "이동의 목적지는 '-에'를 사용합니다", grammarPoint: "조사 -에/-를" },
        { id: "2", type: "correction", question: "어제 영화를 봤다", errorPart: "봤다", correctPart: "봤어요", options: ["봤어요", "봐요", "볼 거예요"], answer: "봤어요", explanation: "존댓말로 '-았/었어요'를 사용합니다", grammarPoint: "과거 시제" },
      ],
      battle: [
        { id: "1", type: "battle", question: "저는 밥___ 먹어요", options: ["을", "를", "이", "가"], answer: "을", explanation: "받침 있는 명사 뒤에는 '을'", grammarPoint: "목적격 조사" },
        { id: "2", type: "battle", question: "친구___ 만나요", options: ["를", "을", "에", "가"], answer: "를", explanation: "받침 없는 명사 뒤에는 '를'", grammarPoint: "목적격 조사" },
      ]
    },
    "3-4": {
      assembly: [
        { id: "1", type: "assembly", question: "조건문을 완성하세요", parts: ["비가", "오면", "우산을", "가져가세요"], correctOrder: [0, 1, 2, 3], answer: "비가 오면 우산을 가져가세요", explanation: "'-으면'은 조건을 나타냅니다", grammarPoint: "조건 -으면" },
        { id: "2", type: "assembly", question: "이유를 나타내는 문장을 만드세요", parts: ["피곤해서", "일찍", "잤어요", "어제"], correctOrder: [3, 0, 1, 2], answer: "어제 피곤해서 일찍 잤어요", explanation: "'-아서/어서'는 이유를 나타냅니다", grammarPoint: "이유 -아서/어서" },
      ],
      correction: [
        { id: "1", type: "correction", question: "공부를 열심히 하면서 성적이 좋아졌어요", errorPart: "하면서", correctPart: "해서", options: ["해서", "하니까", "하면"], answer: "해서", explanation: "결과의 이유를 나타낼 때 '-아서/어서' 사용", grammarPoint: "-면서 vs -아서" },
        { id: "2", type: "correction", question: "내일 비가 와서 우산을 가져가세요", errorPart: "와서", correctPart: "오면", options: ["오면", "오니까", "왔으니까"], answer: "오면", explanation: "미래 조건은 '-으면' 사용", grammarPoint: "시제와 조건" },
      ],
      battle: [
        { id: "1", type: "battle", question: "시간이 없___ 택시를 탔어요", options: ["어서", "으면", "지만", "고"], answer: "어서", explanation: "이유를 나타내는 연결어미", grammarPoint: "이유 -아서/어서" },
        { id: "2", type: "battle", question: "열심히 공부하___ 시험에 떨어졌어요", options: ["지만", "아서", "면", "고"], answer: "지만", explanation: "대조를 나타내는 연결어미", grammarPoint: "대조 -지만" },
      ]
    },
    "5-6": {
      assembly: [
        { id: "1", type: "assembly", question: "피동문을 완성하세요", parts: ["그", "소식이", "전국에", "알려졌다"], correctOrder: [0, 1, 2, 3], answer: "그 소식이 전국에 알려졌다", explanation: "피동 표현은 주어가 영향을 받음을 나타냅니다", grammarPoint: "피동 표현" },
        { id: "2", type: "assembly", question: "사동문을 완성하세요", parts: ["선생님이", "학생들에게", "책을", "읽혔다"], correctOrder: [0, 1, 2, 3], answer: "선생님이 학생들에게 책을 읽혔다", explanation: "사동 표현은 다른 사람에게 행동을 시킴", grammarPoint: "사동 표현" },
      ],
      correction: [
        { id: "1", type: "correction", question: "그 정책은 경제에 영향을 끼치는 바가 크다", errorPart: "끼치는 바가", correctPart: "끼치는 바", options: ["끼치는 바", "끼친 바", "끼칠 바가"], answer: "끼치는 바", explanation: "'-는 바'는 사실/상황을 나타내며 조사 없이 사용", grammarPoint: "-는 바" },
        { id: "2", type: "correction", question: "연구 결과에 의하면 효과가 있는 것 같다", errorPart: "것 같다", correctPart: "것으로 나타났다", options: ["것으로 나타났다", "것이다", "것 같았다"], answer: "것으로 나타났다", explanation: "학술적 문체에서는 객관적 표현 사용", grammarPoint: "학술적 문체" },
      ],
      battle: [
        { id: "1", type: "battle", question: "이 연구는 기존 이론___ 달리 새로운 관점을 제시한다", options: ["과", "에", "와", "으로"], answer: "과", explanation: "'~와/과 달리'는 대조 표현", grammarPoint: "-와/과 달리" },
        { id: "2", type: "battle", question: "정부의 정책 변화___ 인해 시장이 요동쳤다", options: ["로", "에", "으로", "에게"], answer: "로", explanation: "'~(으)로 인해'는 원인 표현", grammarPoint: "-(으)로 인해" },
      ]
    }
  };

  return questions[level][type] || questions["1-2"][type];
}

// ==================== Main Component ====================
export default function Grammar() {
  const [level, setLevel] = useState<TopikLevel>("1-2");
  const [activeTab, setActiveTab] = useState("assembly");

  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">문법 학습</h1>
            <p className="text-muted-foreground">재미있는 게임으로 한국어 문법 마스터!</p>
          </div>
        </div>

        {/* Level Selector */}
        <GrammarLevelSelector value={level} onChange={setLevel} />

        {/* Game Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="assembly" className="gap-2">
              <Puzzle className="w-4 h-4" />
              <span className="hidden sm:inline">문장 조립</span>
              <span className="sm:hidden">조립</span>
            </TabsTrigger>
            <TabsTrigger value="correction" className="gap-2">
              <PenTool className="w-4 h-4" />
              <span className="hidden sm:inline">오류 수정</span>
              <span className="sm:hidden">수정</span>
            </TabsTrigger>
            <TabsTrigger value="battle" className="gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">문법 배틀</span>
              <span className="sm:hidden">배틀</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assembly">
            <AssemblyGame level={level} />
          </TabsContent>
          
          <TabsContent value="correction">
            <CorrectionGame level={level} />
          </TabsContent>
          
          <TabsContent value="battle">
            <BattleGame level={level} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
