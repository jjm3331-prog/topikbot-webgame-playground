import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Puzzle, 
  Gamepad2, 
  Shield, 
  RefreshCw, 
  Check, 
  X, 
  Trophy,
  Flame,
  ArrowLeft,
  Sparkles,
  GripVertical,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import GrammarTetris from "@/components/grammar/GrammarTetris";
import TowerDefenseGame from "@/components/grammar/TowerDefenseGame";

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
  prompt: Bilingual;
  sentence?: Bilingual;
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

// Fisher-Yates 셔플 알고리즘
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
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
    const shuffled = shuffleArray(question.parts ?? []);
    setAvailableParts(shuffled);
    setIsCorrect(null);
  };

  const assembleKorean = (parts: string[]) => {
    const raw = parts.join(" ").trim();
    const boundEndings = ["입니다", "예요", "이에요", "였어요", "이었어요"] as const;
    const re = new RegExp(`([\\p{Script=Hangul}0-9])\\s+(${boundEndings.join("|")})(?=\\s|$)`, "gu");
    return raw.replace(re, "$1$2");
  };

  const normalizeForCompare = (s: string) =>
    assembleKorean([s])
      .normalize("NFKC")
      .replace(/[\u200B\u200C\u200D\uFEFF]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[.?!]+$/g, "");

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
    const userAnswer = assembleKorean(selectedParts);
    const correct = normalizeForCompare(userAnswer) === normalizeForCompare(current.answer);

    setIsCorrect(correct);

    if (correct) {
      const comboBonus = Math.min(combo, 5) * 5;
      setScore((prev) => prev + 10 + comboBonus);
      setCombo((prev) => prev + 1);
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
    },
    "3-4": {
      assembly: [],
    },
    "5-6": {
      assembly: [],
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
              <span className="hidden sm:inline">Ghép / 조립</span>
              <span className="sm:hidden">Ghép</span>
            </TabsTrigger>
            <TabsTrigger value="tetris" className="gap-2">
              <Gamepad2 className="w-4 h-4" />
              <span>Tetris</span>
            </TabsTrigger>
            <TabsTrigger value="tower" className="gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Tower / 타워</span>
              <span className="sm:hidden">Tower</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assembly">
            <AssemblyGame level={level} />
          </TabsContent>
          
          <TabsContent value="tetris">
            <GrammarTetris level={level} />
          </TabsContent>
          
          <TabsContent value="tower">
            <TowerDefenseGame level={level} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
