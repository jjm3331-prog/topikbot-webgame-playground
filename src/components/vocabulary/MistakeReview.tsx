import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  RotateCcw, 
  Check, 
  X, 
  Trophy, 
  Target,
  Flame,
  Brain,
  Sparkles,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVocabulary } from '@/hooks/useVocabulary';
import confetti from 'canvas-confetti';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface MistakeItem {
  id: string;
  item_id: string;
  item_type: string;
  item_data: {
    word: string;
    pos?: string;
    level?: number;
    meaning_vi?: string;
    meaning_en?: string;
    meaning_ja?: string;
    meaning_zh?: string;
    meaning_ru?: string;
    meaning_uz?: string;
    example_sentence?: string;
  };
  mistake_count: number;
  mastered: boolean;
  last_reviewed: string | null;
}

interface RelatedWord {
  word: string;
  meaning?: string;
}

interface RelatedWordsData {
  word: string;
  synonyms: RelatedWord[];
  antonyms: RelatedWord[];
  similar: RelatedWord[];
  sourceUrl?: string;
}

interface QuizQuestion {
  word: string;
  meaning: string;
  questionType: 'synonym' | 'antonym' | 'similar';
  correctAnswer: string;
  correctMeaning?: string;
  options: { word: string; meaning?: string }[];
  sourceUrl?: string;
}

interface MistakeReviewProps {
  level: number;
  onMistake?: (itemId: string, itemData: any) => void;
}

type ViewMode = 'review' | 'stats';
type QuizType = 'synonym' | 'antonym' | 'similar';

const QUIZ_TYPE_LABELS: Record<QuizType, { ko: string; color: string }> = {
  synonym: { ko: '동의어', color: 'text-green-600' },
  antonym: { ko: '반의어', color: 'text-red-600' },
  similar: { ko: '유사어', color: 'text-blue-600' }
};

const MistakeReview: React.FC<MistakeReviewProps> = ({ level, onMistake }) => {
  const { t, i18n } = useTranslation();
  const { getMeaning } = useVocabulary();
  
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [allMistakes, setAllMistakes] = useState<MistakeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllLevels, setShowAllLevels] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('review');
  
  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);

  // Fetch user's mistakes
  const fetchMistakes = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_mistakes')
        .select('*')
        .eq('user_id', user.id)
        .in('item_type', ['vocabulary', 'cloze', 'flashcard', 'match'])
        .eq('mastered', false)
        .order('mistake_count', { ascending: false })
        .limit(50);

      if (error) throw error;

      const items = (data || []).map(item => ({
        ...item,
        item_data: item.item_data as MistakeItem['item_data']
      })) as MistakeItem[];
      
      setAllMistakes(items);
      
      const filtered = showAllLevels 
        ? items 
        : items.filter((item) => {
            const itemLevel = item.item_data?.level;
            return !itemLevel || itemLevel === level;
          });

      const shuffled = filtered.sort(() => Math.random() - 0.5);
      setMistakes(shuffled.slice(0, 20));
    } catch (error) {
      console.error('Error fetching mistakes:', error);
    } finally {
      setLoading(false);
    }
  }, [level, showAllLevels]);

  useEffect(() => {
    fetchMistakes();
  }, [fetchMistakes]);

  const getMeaningForItem = (item: MistakeItem): string => {
    const data = item.item_data;
    const mockWord = {
      id: item.item_id,
      word: data.word,
      pos: data.pos || null,
      level: data.level || level,
      meaning_vi: data.meaning_vi || null,
      meaning_en: data.meaning_en || null,
      meaning_ja: data.meaning_ja || null,
      meaning_zh: data.meaning_zh || null,
      meaning_ru: data.meaning_ru || null,
      meaning_uz: data.meaning_uz || null,
    };
    return getMeaning(mockWord as any);
  };

  // Get current language code for API
  const getTargetLang = (): string => {
    const lang = i18n.language;
    if (lang.startsWith('vi')) return 'vi';
    if (lang.startsWith('ja')) return 'ja';
    if (lang.startsWith('zh')) return 'zh';
    if (lang.startsWith('ru')) return 'ru';
    if (lang.startsWith('uz')) return 'uz';
    if (lang.startsWith('ko')) return 'ko';
    return 'en';
  };

  // Fetch related words from API
  const fetchRelatedWords = async (word: string): Promise<RelatedWordsData | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('related-words', {
        body: { word, targetLang: getTargetLang() }
      });

      if (error) {
        console.error('Related words API error:', error);
        return null;
      }

      return data?.data || null;
    } catch (error) {
      console.error('Failed to fetch related words:', error);
      return null;
    }
  };

  // Generate quiz questions
  const generateQuiz = async () => {
    setGeneratingQuiz(true);
    const questions: QuizQuestion[] = [];
    
    // Take first 10 words
    const wordsToQuiz = mistakes.slice(0, 10);
    
    for (const mistake of wordsToQuiz) {
      const relatedData = await fetchRelatedWords(mistake.item_data.word);
      
      if (!relatedData) continue;
      
      // Determine question type based on available data
      const availableTypes: { type: QuizType; data: RelatedWord[] }[] = [];
      if (relatedData.synonyms.length > 0) {
        availableTypes.push({ type: 'synonym', data: relatedData.synonyms });
      }
      if (relatedData.antonyms.length > 0) {
        availableTypes.push({ type: 'antonym', data: relatedData.antonyms });
      }
      if (relatedData.similar.length > 0) {
        availableTypes.push({ type: 'similar', data: relatedData.similar });
      }
      
      if (availableTypes.length === 0) continue;
      
      // Pick random type
      const selected = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      const correctAnswer = selected.data[0];
      
      // Generate wrong options from other words or other related words
      const wrongOptions: RelatedWord[] = [];
      
      // Get wrong options from other mistakes
      const otherMistakes = mistakes.filter(m => m.item_data.word !== mistake.item_data.word);
      for (let i = 0; i < 2 && i < otherMistakes.length; i++) {
        const randomIdx = Math.floor(Math.random() * otherMistakes.length);
        const wrongWord = otherMistakes[randomIdx];
        if (!wrongOptions.find(w => w.word === wrongWord.item_data.word)) {
          wrongOptions.push({ 
            word: wrongWord.item_data.word,
            meaning: getMeaningForItem(wrongWord)
          });
        }
      }
      
      // Add from other categories if needed
      if (wrongOptions.length < 2) {
        for (const otherType of availableTypes) {
          if (otherType.type !== selected.type && otherType.data[0]) {
            wrongOptions.push(otherType.data[0]);
            if (wrongOptions.length >= 2) break;
          }
        }
      }
      
      if (wrongOptions.length < 2) continue;
      
      // Shuffle options
      const options = [correctAnswer, ...wrongOptions.slice(0, 2)].sort(() => Math.random() - 0.5);
      
      questions.push({
        word: mistake.item_data.word,
        meaning: getMeaningForItem(mistake),
        questionType: selected.type,
        correctAnswer: correctAnswer.word,
        correctMeaning: correctAnswer.meaning,
        options,
        sourceUrl: relatedData.sourceUrl
      });
    }
    
    setQuizQuestions(questions);
    setCurrentIndex(0);
    setCorrectCount(0);
    setStreak(0);
    setSessionComplete(false);
    setQuizStarted(true);
    setGeneratingQuiz(false);
  };

  const handleAnswer = (answer: string) => {
    if (showResult) return;
    
    setSelectedAnswer(answer);
    setShowResult(true);
    
    const isCorrect = answer === quizQuestions[currentIndex].correctAnswer;
    
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      setStreak(prev => prev + 1);
      
      if (streak >= 2) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      }
    } else {
      setStreak(0);
    }
  };

  const handleNext = () => {
    if (currentIndex < quizQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setSessionComplete(true);
      if (correctCount >= quizQuestions.length * 0.8) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }
  };

  const handleRestart = () => {
    setQuizStarted(false);
    setQuizQuestions([]);
    setCurrentIndex(0);
    setCorrectCount(0);
    setStreak(0);
    setSessionComplete(false);
    setSelectedAnswer(null);
    setShowResult(false);
    fetchMistakes();
  };

  // Stats calculation
  const getStats = () => {
    const levelCounts: Record<number, number> = {};
    const wordCounts: { word: string; count: number; level: number }[] = [];
    
    allMistakes.forEach(item => {
      const lvl = item.item_data?.level || 0;
      levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;
      wordCounts.push({
        word: item.item_data.word,
        count: item.mistake_count,
        level: lvl
      });
    });
    
    const topMistakes = wordCounts.sort((a, b) => b.count - a.count).slice(0, 10);
    
    return { levelCounts, topMistakes, total: allMistakes.length };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const CHART_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

  // Stats view
  if (viewMode === 'stats') {
    const stats = getStats();
    
    const pieData = Object.entries(stats.levelCounts)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([lvl, count], idx) => ({
        name: `${lvl}급`,
        value: count,
        color: CHART_COLORS[idx % CHART_COLORS.length]
      }));
    
    const barData = stats.topMistakes.slice(0, 5).map(item => ({
      word: item.word,
      count: item.count
    }));
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            오답 통계
          </h3>
          <Button variant="outline" size="sm" onClick={() => setViewMode('review')}>
            퀴즈 모드
          </Button>
        </div>

        {stats.total === 0 ? (
          <Card className="p-8 text-center bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <Trophy className="w-12 h-12 mx-auto text-yellow-500 mb-3" />
            <p className="text-muted-foreground">아직 오답 기록이 없습니다!</p>
          </Card>
        ) : (
          <>
            <Card className="p-4 bg-gradient-to-br from-primary/5 to-purple-500/5">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">전체 오답</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-500">
                    {Object.keys(stats.levelCounts).length}
                  </div>
                  <div className="text-xs text-muted-foreground">레벨</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-500">
                    {stats.topMistakes[0]?.count || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">최다 오답</div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                레벨별 오답 분포
              </h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value}개`, '오답 수']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4 text-red-500" />
                가장 많이 틀린 단어 TOP 5
              </h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis 
                      type="category" 
                      dataKey="word" 
                      width={60}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value}회`, '틀린 횟수']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="#ef4444"
                      radius={[0, 4, 4, 0]}
                      label={{ position: 'right', fontSize: 11 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </>
        )}
      </div>
    );
  }

  // No mistakes state
  if (mistakes.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant={showAllLevels ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAllLevels(!showAllLevels)}
          >
            {showAllLevels ? "전체 레벨" : `${level}급만`}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewMode('stats')}>
            <Target className="w-4 h-4 mr-1" />
            통계
          </Button>
        </div>

        <Card className="p-8 text-center bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
          >
            <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
          </motion.div>
          <h3 className="text-xl font-bold text-foreground mb-2">완벽해요! 🎉</h3>
          <p className="text-muted-foreground mb-4">
            {showAllLevels 
              ? "복습할 오답이 없습니다. 다른 학습 모듈에서 더 연습해보세요!"
              : `${level}급 복습할 오답이 없습니다. 전체 레벨을 확인해보세요!`
            }
          </p>
          {!showAllLevels && allMistakes.length > 0 && (
            <Button onClick={() => setShowAllLevels(true)} className="mb-2">
              전체 레벨 보기 ({allMistakes.length}개)
            </Button>
          )}
        </Card>
      </div>
    );
  }

  // Session complete
  if (sessionComplete) {
    const accuracy = quizQuestions.length > 0 
      ? Math.round((correctCount / quizQuestions.length) * 100) 
      : 0;
    
    return (
      <div className="space-y-6">
        <Card className="p-6 text-center bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
          >
            <Sparkles className="w-12 h-12 mx-auto text-primary mb-3" />
          </motion.div>
          <h3 className="text-xl font-bold text-foreground mb-4">관련어 퀴즈 완료!</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-background/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-primary">{correctCount}/{quizQuestions.length}</div>
              <div className="text-xs text-muted-foreground">정답</div>
            </div>
            <div className="bg-background/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-500">{accuracy}%</div>
              <div className="text-xs text-muted-foreground">정확도</div>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            {accuracy >= 80 
              ? '훌륭해요! 관련어를 잘 이해하고 있습니다!' 
              : accuracy >= 50 
                ? '좋아요! 조금 더 연습하면 완벽해질 거예요.' 
                : '더 연습이 필요해요. 다시 도전해보세요!'}
          </p>
        </Card>

        <Button onClick={handleRestart} className="w-full">
          <RotateCcw className="w-4 h-4 mr-2" />
          다시 시작하기
        </Button>
      </div>
    );
  }

  // Quiz not started - show start screen
  if (!quizStarted) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant={showAllLevels ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAllLevels(!showAllLevels)}
          >
            {showAllLevels ? "전체 레벨" : `${level}급만`}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewMode('stats')}>
            <Target className="w-4 h-4 mr-1" />
            통계
          </Button>
        </div>

        <Card className="p-6 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
          <div className="text-center space-y-4">
            <Brain className="w-12 h-12 mx-auto text-primary" />
            <h3 className="text-xl font-bold">관련어 퀴즈</h3>
            <p className="text-sm text-muted-foreground">
              오답 단어의 동의어, 반의어, 유사어를 맞히는 퀴즈입니다.
              <br />
              AI 검색 기반으로 정확한 관련어를 찾아드립니다.
            </p>
            
            <div className="flex flex-wrap justify-center gap-2">
              <Badge className="bg-green-500/20 text-green-600">동의어</Badge>
              <Badge className="bg-red-500/20 text-red-600">반의어</Badge>
              <Badge className="bg-blue-500/20 text-blue-600">유사어</Badge>
            </div>
            
            <div className="text-sm text-muted-foreground">
              복습할 단어: <span className="font-bold text-foreground">{mistakes.length}개</span>
            </div>

            <Button 
              onClick={generateQuiz} 
              disabled={generatingQuiz}
              className="w-full"
              size="lg"
            >
              {generatingQuiz ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  퀴즈 생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  퀴즈 시작하기
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Quiz in progress
  const currentQuestion = quizQuestions[currentIndex];
  
  if (!currentQuestion) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">퀴즈를 생성할 수 없습니다. 다시 시도해주세요.</p>
        <Button onClick={handleRestart} className="mt-4">
          <RotateCcw className="w-4 h-4 mr-2" />
          다시 시작
        </Button>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / quizQuestions.length) * 100;
  const quizTypeInfo = QUIZ_TYPE_LABELS[currentQuestion.questionType];

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            {currentIndex + 1}/{quizQuestions.length}
          </Badge>
          {streak > 0 && (
            <Badge className="bg-orange-500/20 text-orange-600 flex items-center gap-1">
              <Flame className="w-3 h-3" />
              {streak} 연속
            </Badge>
          )}
        </div>
        <Badge variant="secondary">
          정답: {correctCount}
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-gradient-to-r from-primary to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Question card */}
      <Card className="p-6 bg-gradient-to-br from-background to-muted/30">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Question type badge */}
            <div className="text-center">
              <Badge className={`${quizTypeInfo.color} bg-opacity-20`}>
                {quizTypeInfo.ko} 찾기
              </Badge>
            </div>

            {/* Word and meaning */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-foreground">{currentQuestion.word}</h2>
              <p className="text-muted-foreground">{currentQuestion.meaning}</p>
            </div>

            {/* Question prompt */}
            <p className="text-center text-sm text-muted-foreground">
              위 단어의 <span className={`font-bold ${quizTypeInfo.color}`}>{quizTypeInfo.ko}</span>를 고르세요
            </p>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedAnswer === option.word;
                const isCorrect = option.word === currentQuestion.correctAnswer;
                
                let buttonClass = "w-full p-4 text-left justify-start h-auto";
                if (showResult) {
                  if (isCorrect) {
                    buttonClass += " bg-green-500/20 border-green-500 text-green-700";
                  } else if (isSelected && !isCorrect) {
                    buttonClass += " bg-red-500/20 border-red-500 text-red-700";
                  }
                }
                
                return (
                  <Button
                    key={idx}
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => handleAnswer(option.word)}
                    disabled={showResult}
                    className={buttonClass}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <span className="font-medium text-lg">{option.word}</span>
                        {option.meaning && (
                          <span className="ml-2 text-sm opacity-70">({option.meaning})</span>
                        )}
                      </div>
                      {showResult && isCorrect && <Check className="w-5 h-5 text-green-600" />}
                      {showResult && isSelected && !isCorrect && <X className="w-5 h-5 text-red-600" />}
                    </div>
                  </Button>
                );
              })}
            </div>

            {/* Result feedback */}
            {showResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className={`text-center p-3 rounded-lg ${
                  selectedAnswer === currentQuestion.correctAnswer 
                    ? 'bg-green-500/20 text-green-700' 
                    : 'bg-red-500/20 text-red-700'
                }`}>
                  {selectedAnswer === currentQuestion.correctAnswer ? (
                    <span className="font-bold">정답입니다! ✓</span>
                  ) : (
                    <div>
                      <span className="font-bold">오답입니다 ✗</span>
                      <div className="text-sm mt-1">
                        정답: <span className="font-bold">{currentQuestion.correctAnswer}</span>
                        {currentQuestion.correctMeaning && (
                          <span className="opacity-70"> ({currentQuestion.correctMeaning})</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {currentQuestion.sourceUrl && (
                  <a 
                    href={currentQuestion.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary"
                  >
                    <ExternalLink className="w-3 h-3" />
                    출처 확인
                  </a>
                )}

                <Button onClick={handleNext} className="w-full">
                  {currentIndex < quizQuestions.length - 1 ? '다음' : '결과 보기'}
                </Button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </Card>
    </div>
  );
};

export default MistakeReview;
