import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  RotateCcw, 
  Check, 
  X, 
  Volume2, 
  Trophy, 
  Target,
  Flame,
  Brain,
  Lightbulb,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVocabulary } from '@/hooks/useVocabulary';
import confetti from 'canvas-confetti';

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

interface MistakeReviewProps {
  level: number;
  onMistake?: (itemId: string, itemData: any) => void;
}

const MASTERY_THRESHOLD = 3; // 연속 3회 정답 시 마스터

const MistakeReview: React.FC<MistakeReviewProps> = ({ level, onMistake }) => {
  const { t } = useTranslation();
  const { getMeaning } = useVocabulary();
  
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState<Record<string, number>>({});
  const [sessionComplete, setSessionComplete] = useState(false);
  const [masteredInSession, setMasteredInSession] = useState<string[]>([]);

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
        .eq('item_type', 'vocabulary')
        .eq('mastered', false)
        .order('mistake_count', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Cast and filter by level if item_data has level info
      const items = (data || []).map(item => ({
        ...item,
        item_data: item.item_data as MistakeItem['item_data']
      })) as MistakeItem[];
      
      const filtered = items.filter((item) => {
        const itemLevel = item.item_data?.level;
        return !itemLevel || itemLevel === level;
      });

      // Shuffle for variety
      const shuffled = filtered.sort(() => Math.random() - 0.5);
      setMistakes(shuffled);
      setCurrentIndex(0);
      setConsecutiveCorrect({});
    } catch (error) {
      console.error('Error fetching mistakes:', error);
    } finally {
      setLoading(false);
    }
  }, [level]);

  useEffect(() => {
    fetchMistakes();
  }, [fetchMistakes]);

  const currentMistake = mistakes[currentIndex];

  const getMeaningForItem = (item: MistakeItem): string => {
    const data = item.item_data;
    // Create a mock VocabWord to use getMeaning
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

  const playTTS = async (text: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('korean-tts', {
        body: { text, speed: 0.9 }
      });
      if (data?.audio) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
        audio.play();
      }
    } catch (error) {
      console.error('TTS error:', error);
    }
  };

  const normalizeKorean = (str: string): string => {
    return str.trim().toLowerCase().replace(/\s+/g, '');
  };

  const handleCheck = async () => {
    if (!currentMistake || showResult) return;

    const correct = normalizeKorean(userInput) === normalizeKorean(currentMistake.item_data.word);
    setIsCorrect(correct);
    setShowResult(true);

    const itemId = currentMistake.id;

    if (correct) {
      setStreak(prev => prev + 1);
      setCorrectCount(prev => prev + 1);
      
      // Track consecutive correct answers
      const newConsecutive = (consecutiveCorrect[itemId] || 0) + 1;
      setConsecutiveCorrect(prev => ({ ...prev, [itemId]: newConsecutive }));

      // Update database
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (newConsecutive >= MASTERY_THRESHOLD) {
            // Mark as mastered
            await supabase
              .from('user_mistakes')
              .update({ 
                mastered: true, 
                last_reviewed: new Date().toISOString() 
              })
              .eq('id', itemId);
            
            setMasteredInSession(prev => [...prev, currentMistake.item_data.word]);
            
            // Celebration
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });
          } else {
            // Just update last_reviewed
            await supabase
              .from('user_mistakes')
              .update({ 
                last_reviewed: new Date().toISOString(),
                mistake_count: Math.max(1, currentMistake.mistake_count - 1)
              })
              .eq('id', itemId);
          }
        }
      } catch (error) {
        console.error('Error updating mistake:', error);
      }

      // Play correct sound
      playTTS(currentMistake.item_data.word);
    } else {
      setStreak(0);
      // Reset consecutive count
      setConsecutiveCorrect(prev => ({ ...prev, [itemId]: 0 }));

      // Increase mistake count
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('user_mistakes')
            .update({ 
              mistake_count: currentMistake.mistake_count + 1,
              last_reviewed: new Date().toISOString()
            })
            .eq('id', itemId);
        }
      } catch (error) {
        console.error('Error updating mistake:', error);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < mistakes.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserInput('');
      setShowResult(false);
      setShowHint(false);
    } else {
      setSessionComplete(true);
    }
  };

  const handleRestart = () => {
    setSessionComplete(false);
    setCorrectCount(0);
    setStreak(0);
    setMasteredInSession([]);
    fetchMistakes();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (showResult) {
        handleNext();
      } else {
        handleCheck();
      }
    }
  };

  const getHint = (): string => {
    if (!currentMistake) return '';
    const word = currentMistake.item_data.word;
    if (word.length <= 2) return word[0] + '...';
    return word[0] + '...' + word[word.length - 1];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (mistakes.length === 0) {
    return (
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
          복습할 오답이 없습니다. 다른 학습 모듈에서 더 연습해보세요!
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          <RotateCcw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </Card>
    );
  }

  if (sessionComplete) {
    const accuracy = mistakes.length > 0 ? Math.round((correctCount / mistakes.length) * 100) : 0;
    
    return (
      <Card className="p-8 text-center bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
        >
          <Sparkles className="w-16 h-16 mx-auto text-primary mb-4" />
        </motion.div>
        <h3 className="text-2xl font-bold text-foreground mb-4">복습 완료!</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-background/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-primary">{correctCount}</div>
            <div className="text-sm text-muted-foreground">정답</div>
          </div>
          <div className="bg-background/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-500">{accuracy}%</div>
            <div className="text-sm text-muted-foreground">정확도</div>
          </div>
        </div>

        {masteredInSession.length > 0 && (
          <div className="mb-6 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
            <h4 className="font-semibold text-green-600 mb-2 flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4" />
              마스터한 단어 ({masteredInSession.length}개)
            </h4>
            <div className="flex flex-wrap gap-2 justify-center">
              {masteredInSession.map((word, idx) => (
                <Badge key={idx} variant="secondary" className="bg-green-500/20 text-green-700">
                  {word}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Button onClick={handleRestart} className="w-full">
          <RotateCcw className="w-4 h-4 mr-2" />
          다시 복습하기
        </Button>
      </Card>
    );
  }

  const meaning = getMeaningForItem(currentMistake);
  const progress = ((currentIndex + 1) / mistakes.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress and Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            {currentIndex + 1}/{mistakes.length}
          </Badge>
          {streak > 0 && (
            <Badge className="bg-orange-500/20 text-orange-600 flex items-center gap-1">
              <Flame className="w-3 h-3" />
              {streak} 연속
            </Badge>
          )}
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Brain className="w-3 h-3" />
          틀린 횟수: {currentMistake.mistake_count}
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-gradient-to-r from-primary to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Main Card */}
      <Card className="p-6 bg-gradient-to-br from-background to-muted/30">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Question: Show meaning */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">이 뜻에 해당하는 한국어 단어를 입력하세요</p>
              <h2 className="text-2xl font-bold text-foreground">{meaning}</h2>
              {currentMistake.item_data.pos && (
                <Badge variant="outline" className="text-xs">
                  {currentMistake.item_data.pos}
                </Badge>
              )}
            </div>

            {/* Example sentence hint */}
            {currentMistake.item_data.example_sentence && (
              <div className="text-center text-sm text-muted-foreground italic">
                예문: {currentMistake.item_data.example_sentence.replace(
                  currentMistake.item_data.word, 
                  '_____'
                )}
              </div>
            )}

            {/* Hint */}
            {showHint && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <Badge className="bg-yellow-500/20 text-yellow-700">
                  <Lightbulb className="w-3 h-3 mr-1" />
                  힌트: {getHint()}
                </Badge>
              </motion.div>
            )}

            {/* Input */}
            <div className="relative">
              <Input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="한국어 단어 입력..."
                className={`text-center text-xl py-6 ${
                  showResult
                    ? isCorrect
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-red-500 bg-red-500/10'
                    : ''
                }`}
                disabled={showResult}
                autoFocus
              />
            </div>

            {/* Result */}
            <AnimatePresence>
              {showResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {isCorrect ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <Check className="w-6 h-6" />
                      <span className="font-bold text-lg">정답!</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 text-red-500">
                        <X className="w-6 h-6" />
                        <span className="font-bold text-lg">오답</span>
                      </div>
                      <div className="text-center">
                        <span className="text-muted-foreground">정답: </span>
                        <span className="font-bold text-foreground text-xl">
                          {currentMistake.item_data.word}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => playTTS(currentMistake.item_data.word)}
                          className="ml-2"
                        >
                          <Volume2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Consecutive correct tracker */}
                  {isCorrect && (
                    <div className="text-center text-sm text-muted-foreground">
                      연속 정답: {consecutiveCorrect[currentMistake.id] || 0}/{MASTERY_THRESHOLD}
                      {(consecutiveCorrect[currentMistake.id] || 0) >= MASTERY_THRESHOLD && (
                        <Badge className="ml-2 bg-green-500">마스터!</Badge>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex gap-3">
              {!showResult ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowHint(true)}
                    disabled={showHint}
                    className="flex-1"
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    힌트
                  </Button>
                  <Button
                    onClick={handleCheck}
                    disabled={!userInput.trim()}
                    className="flex-1"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    확인
                  </Button>
                </>
              ) : (
                <Button onClick={handleNext} className="w-full">
                  {currentIndex < mistakes.length - 1 ? (
                    <>
                      다음 <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    <>
                      완료 <Trophy className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </Card>
    </div>
  );
};

export default MistakeReview;
