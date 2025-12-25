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

type Bilingual = { vi: string; ko: string };

function BilingualText({
  vi,
  ko,
  className,
}: {
  vi: string;
  ko: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="font-medium">{vi}</div>
      <div className="text-xs text-muted-foreground">{ko}</div>
    </div>
  );
}

// Custom Level Selector for Grammar
function GrammarLevelSelector({ value, onChange }: { value: TopikLevel; onChange: (v: TopikLevel) => void }) {
  const levels: { id: TopikLevel; label_vi: string; label_ko: string; color: string }[] = [
    { id: "1-2", label_vi: "Cấp 1–2 (Sơ cấp)", label_ko: "1-2급 (초급)", color: "from-green-400 to-emerald-500" },
    { id: "3-4", label_vi: "Cấp 3–4 (Trung cấp)", label_ko: "3-4급 (중급)", color: "from-blue-400 to-cyan-500" },
    { id: "5-6", label_vi: "Cấp 5–6 (Cao cấp)", label_ko: "5-6급 (고급)", color: "from-purple-400 to-pink-500" },
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
          <span className="mr-2">{level.label_vi}</span>
          <span className="text-xs opacity-80">{level.label_ko}</span>
        </Button>
      ))}
    </div>
  );
}

interface GrammarQuestion {
  id: string;
  type: "assembly" | "correction" | "battle";
  prompt: Bilingual; // question/instruction
  sentence?: Bilingual; // for correction
  parts?: string[];
  errorPart?: string;
  correctPart?: string;
  options?: string[];
  answer: string;
  explanation: Bilingual;
  grammarPoint: Bilingual;
}

type ApiGrammarQuestion = any;

function normalizeGrammarQuestions(input: ApiGrammarQuestion[]): GrammarQuestion[] {
  return (input ?? []).map((q: any) => {
    // New API shape (grammar-content)
    const promptVi = q.question_vi ?? q.sentence_vi ?? q.question ?? "";
    const promptKo = q.question_ko ?? q.sentence_ko ?? q.question ?? "";

    const sentenceVi = q.sentence_vi ?? "";
    const sentenceKo = q.sentence_ko ?? q.question ?? "";

    const explanationVi = q.explanation_vi ?? "";
    const explanationKo = q.explanation_ko ?? q.explanation ?? "";

    const grammarPointVi = q.grammarPoint_vi ?? "";
    const grammarPointKo = q.grammarPoint_ko ?? q.grammarPoint ?? "";

    return {
      id: String(q.id ?? crypto.randomUUID()),
      type: q.type,
      prompt: { vi: promptVi, ko: promptKo },
      sentence: q.type === "correction" ? { vi: sentenceVi, ko: sentenceKo } : undefined,
      parts: q.parts,
      errorPart: q.errorPart,
      correctPart: q.correctPart,
      options: q.options,
      answer: q.answer,
      explanation: { vi: explanationVi, ko: explanationKo },
      grammarPoint: { vi: grammarPointVi, ko: grammarPointKo },
    } satisfies GrammarQuestion;
  });
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
        const normalized = normalizeGrammarQuestions(data.questions);
        setQuestions(normalized);
        resetGame(normalized[0]);
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
      toast.success(`Đúng! +${10 + comboBonus} / 정답! +${10 + comboBonus}`);
    } else {
      setCombo(0);
      toast.error("Sai rồi, thử lại nhé! / 다시 시도해보세요!");
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      resetGame(questions[currentIndex + 1]);
    } else {
      toast.success(`Hoàn thành! Tổng ${score} điểm / 게임 완료! 총 ${score}점`);
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
          <span className="font-medium">Điểm ngữ pháp</span>
          <BilingualText vi={current.grammarPoint.vi} ko={current.grammarPoint.ko} />
        </div>
      </Card>

      {/* Question */}
      <Card className="p-6">
        <BilingualText
          className="mb-4"
          vi="Hãy sắp xếp các từ theo đúng thứ tự:"
          ko="다음 어절들을 올바른 순서로 조립하세요:"
        />
        <BilingualText vi={current.prompt.vi} ko={current.prompt.ko} />

        {/* Selected Parts (Answer Area) */}
        <div className="min-h-16 p-4 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/30 mb-4">
          <div className="flex flex-wrap gap-2">
            {selectedParts.length === 0 ? (
              <BilingualText
                vi="Kéo/nhấn để đặt các từ vào đây theo thứ tự"
                ko="여기에 어절을 순서대로 배치하세요"
              />
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
                <span className="font-medium">
                  {isCorrect ? "Đúng! / 정답입니다!" : "Sai rồi / 틀렸습니다"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>Đáp án / 정답:</strong> {current.answer}
              </p>
              <div className="mt-2 space-y-2">
                <div className="text-sm font-medium">💡 Giải thích / 해설</div>
                <BilingualText vi={current.explanation.vi} ko={current.explanation.ko} />
              </div>
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
              <BilingualText vi="Kiểm tra" ko="확인하기" />
            </Button>
          ) : (
            <Button onClick={handleNext} className="flex-1">
              {currentIndex < questions.length - 1 ? "Tiếp theo / 다음 문제" : "Chơi lại / 다시 시작"}
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
        setQuestions(normalizeGrammarQuestions(data.questions));
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
      toast.error("Chọn đúng phần sai nhé! / 틀린 부분을 다시 찾아보세요!");
    }
  };

  const handleSelectCorrection = (option: string) => {
    const current = questions[currentIndex];
    const correct = option === current.correctPart;
    
    setIsCorrect(correct);
    
    if (correct) {
      setScore(prev => prev + 10);
      toast.success("Đúng! +10 / 정답! +10");
    } else {
      toast.error("Sai rồi, nghĩ lại nhé! / 다시 생각해보세요!");
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedError(null);
      setShowOptions(false);
      setIsCorrect(null);
    } else {
      toast.success(`Hoàn thành! Tổng ${score} điểm / 게임 완료! 총 ${score}점`);
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

  const words = (current.sentence?.ko || current.prompt.ko).split(' ');

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
          <span className="font-medium">Loại lỗi</span>
          <BilingualText vi={current.grammarPoint.vi} ko={current.grammarPoint.ko} />
        </div>
      </Card>

      {/* Sentence */}
      <Card className="p-6">
        <BilingualText
          className="mb-4"
          vi="Chạm vào phần sai trong câu:"
          ko="문장에서 틀린 부분을 찾아 터치하세요:"
        />

        <div className="flex flex-wrap gap-2 mb-6">
          {words.map((word, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedError === word
                  ? "bg-red-500 text-white"
                  : "bg-muted hover:bg-muted/80"
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
          {showOptions && isCorrect === null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 mb-6"
            >
              <p className="text-sm font-medium">Chọn cách đúng / 올바른 표현을 선택하세요:</p>
              <div className="flex flex-wrap gap-2">
                {current.options?.map((option, index) => (
                  <Button key={index} variant="outline" onClick={() => handleSelectCorrection(option)}>
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
                isCorrect ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <X className="w-5 h-5 text-red-500" />
                )}
                <span className="font-medium">{isCorrect ? "Đúng! / 정답입니다!" : "Sai rồi / 틀렸습니다"}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>Đáp án / 정답:</strong> {current.errorPart} → {current.correctPart}
              </p>
              <div className="mt-2 space-y-2">
                <div className="text-sm font-medium">💡 Giải thích / 해설</div>
                <BilingualText vi={current.explanation.vi} ko={current.explanation.ko} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next Button */}
        {isCorrect !== null && (
          <Button onClick={handleNext} className="w-full">
            {currentIndex < questions.length - 1 ? "Tiếp theo / 다음 문제" : "Chơi lại / 다시 시작"}
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
        setQuestions(normalizeGrammarQuestions(data.questions));
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
        <h2 className="text-2xl font-bold mb-2">Grammar Battle</h2>
        <BilingualText
          className="mb-6"
          vi="Trong 60 giây, hãy giải càng nhiều câu hỏi ngữ pháp càng tốt!\nĐúng liên tiếp sẽ có thưởng combo."
          ko="60초 안에 최대한 많은 문법 문제를 풀어보세요!\n연속 정답 시 콤보 보너스!"
        />
        <Button onClick={startGame} size="lg" className="gap-2">
          <Timer className="w-5 h-5" />
          Bắt đầu / 시작하기
        </Button>
      </Card>
    );
  }

  // Finished State
  if (gameState === 'finished') {
    return (
      <Card className="p-8 text-center">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
        <h2 className="text-2xl font-bold mb-2">Hết giờ! / 게임 종료!</h2>
        <p className="text-4xl font-bold text-primary mb-2">{score}점</p>
        <p className="text-muted-foreground mb-6">{currentIndex} câu / {currentIndex}문제</p>
        <Button onClick={() => { fetchQuestions(); startGame(); }} size="lg" className="gap-2">
          <RefreshCw className="w-5 h-5" />
          Thử lại / 다시 도전
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
        <BilingualText vi={current.grammarPoint.vi} ko={current.grammarPoint.ko} className="mb-2" />
        <BilingualText vi={current.prompt.vi} ko={current.prompt.ko} className="mb-6" />
        
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
        {
          id: "1",
          type: "assembly",
          prompt: {
            vi: "Sắp xếp theo thứ tự: Chủ ngữ + Tân ngữ + Động từ",
            ko: "주어 + 목적어 + 동사 순서로 배열하세요",
          },
          parts: ["저는", "밥을", "먹어요"],
          answer: "저는 밥을 먹어요",
          explanation: { vi: "Tiếng Hàn thường theo trật tự S-O-V.", ko: "한국어는 주어-목적어-동사 순서입니다" },
          grammarPoint: { vi: "Trật tự câu cơ bản (SOV)", ko: "기본 어순 (SOV)" },
        },
      ],
      correction: [
        {
          id: "1",
          type: "correction",
          prompt: { vi: "Chạm vào phần sai trong câu", ko: "문장에서 틀린 부분을 찾아 터치하세요" },
          sentence: { vi: "Tôi đi đến trường", ko: "저는 학교를 가요" },
          errorPart: "학교를",
          correctPart: "학교에",
          options: ["학교에", "학교가", "학교는"],
          answer: "학교에",
          explanation: {
            vi: "Đích đến khi di chuyển dùng '-에'.",
            ko: "이동의 목적지는 '-에'를 사용합니다",
          },
          grammarPoint: { vi: "-에 vs -을/를", ko: "조사 -에/-를" },
        },
      ],
      battle: [
        {
          id: "1",
          type: "battle",
          prompt: { vi: "저는 밥___ 먹어요", ko: "저는 밥___ 먹어요" },
          options: ["을", "를", "이", "가"],
          answer: "을",
          explanation: {
            vi: "Danh từ có 받침 dùng '을'.",
            ko: "받침 있는 명사 뒤에는 '을'",
          },
          grammarPoint: { vi: "Trợ từ tân ngữ", ko: "목적격 조사" },
        },
      ],
    },
    "3-4": {
      assembly: [],
      correction: [],
      battle: [],
    },
    "5-6": {
      assembly: [],
      correction: [],
      battle: [],
    },
  };

  return questions[level][type] || questions["1-2"][type] || [];
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
            <h1 className="text-2xl font-bold">Ngữ pháp / 문법</h1>
            <p className="text-muted-foreground">Học ngữ pháp tiếng Hàn qua mini-game (VN ưu tiên) / 재미있는 게임으로 한국어 문법 마스터!</p>
          </div>
        </div>

        {/* Level Selector */}
        <GrammarLevelSelector value={level} onChange={setLevel} />

        {/* Game Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="assembly" className="gap-2">
              <Puzzle className="w-4 h-4" />
              <span className="hidden sm:inline">Ghép câu / 문장 조립</span>
              <span className="sm:hidden">Ghép / 조립</span>
            </TabsTrigger>
            <TabsTrigger value="correction" className="gap-2">
              <PenTool className="w-4 h-4" />
              <span className="hidden sm:inline">Sửa lỗi / 오류 수정</span>
              <span className="sm:hidden">Sửa / 수정</span>
            </TabsTrigger>
            <TabsTrigger value="battle" className="gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Battle / 문법 배틀</span>
              <span className="sm:hidden">Battle / 배틀</span>
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
