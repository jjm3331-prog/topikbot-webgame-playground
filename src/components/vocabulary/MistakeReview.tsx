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
  Trophy, 
  Target,
  Flame,
  Brain,
  Lightbulb,
  ArrowRight,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronUp
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

interface MistakeReviewProps {
  level: number;
  onMistake?: (itemId: string, itemData: any) => void;
}

type ViewMode = 'review' | 'stats';

const MASTERY_THRESHOLD = 3; // 연속 3회 정답 시 마스터

const MistakeReview: React.FC<MistakeReviewProps> = ({ level, onMistake }) => {
  const { t } = useTranslation();
  const { getMeaning } = useVocabulary();
  
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [allMistakes, setAllMistakes] = useState<MistakeItem[]>([]); // 통계용 전체 데이터
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
  const [wrongInSession, setWrongInSession] = useState<MistakeItem[]>([]); // 세션 중 틀린 단어들
  const [showAllLevels, setShowAllLevels] = useState(false); // 전체 레벨 보기
  const [viewMode, setViewMode] = useState<ViewMode>('review'); // 모드 전환
  const [expandedWords, setExpandedWords] = useState<Set<string>>(new Set()); // 확장된 단어 (관련어 보기)
  const [relatedWords, setRelatedWords] = useState<Record<string, { synonyms: string[]; antonyms: string[]; similar: string[] }>>({}); // 관련어 캐시
  const [loadingRelated, setLoadingRelated] = useState<string | null>(null);

  // Fetch user's mistakes
  const fetchMistakes = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // 'vocabulary', 'cloze', 'flashcard' 등 모든 타입의 오답을 가져옴
      const { data, error } = await supabase
        .from('user_mistakes')
        .select('*')
        .eq('user_id', user.id)
        .in('item_type', ['vocabulary', 'cloze', 'flashcard', 'match'])
        .eq('mastered', false)
        .order('mistake_count', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Cast and filter by level if item_data has level info
      const items = (data || []).map(item => ({
        ...item,
        item_data: item.item_data as MistakeItem['item_data']
      })) as MistakeItem[];
      
      // 전체 데이터 저장 (통계용)
      setAllMistakes(items);
      
      // 레벨 필터 적용
      const filtered = showAllLevels 
        ? items 
        : items.filter((item) => {
            const itemLevel = item.item_data?.level;
            return !itemLevel || itemLevel === level;
          });

      // Shuffle for variety
      const shuffled = filtered.sort(() => Math.random() - 0.5);
      setMistakes(shuffled.slice(0, 20));
      setCurrentIndex(0);
      setConsecutiveCorrect({});
    } catch (error) {
      console.error('Error fetching mistakes:', error);
    } finally {
      setLoading(false);
    }
  }, [level, showAllLevels]);

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

  // 관련어 (동의어, 반의어, 유사어) 조회
  const fetchRelatedWords = async (word: string) => {
    if (relatedWords[word]) return; // 캐시된 경우 스킵
    
    setLoadingRelated(word);
    try {
      // topik_vocabulary에서 유사한 단어 찾기
      const { data: vocabData } = await supabase
        .from('topik_vocabulary')
        .select('word, meaning_vi, meaning_en, pos')
        .neq('word', word)
        .limit(100);
      
      // 간단한 관련어 매칭 로직 (같은 품사, 비슷한 의미)
      const currentItem = allMistakes.find(m => m.item_data.word === word);
      const currentMeaning = currentItem?.item_data?.meaning_vi || currentItem?.item_data?.meaning_en || '';
      const currentPos = currentItem?.item_data?.pos || '';
      
      const synonyms: string[] = [];
      const antonyms: string[] = [];
      const similar: string[] = [];
      
      if (vocabData) {
        vocabData.forEach(v => {
          const vMeaning = v.meaning_vi || v.meaning_en || '';
          // 같은 품사면 유사어
          if (v.pos === currentPos && similar.length < 5) {
            similar.push(v.word);
          }
          // 의미에 공통 단어가 있으면 동의어 후보
          const commonWords = currentMeaning.split(/[,;/ ]+/).filter(w => w.length > 2 && vMeaning.includes(w));
          if (commonWords.length > 0 && synonyms.length < 3) {
            synonyms.push(v.word);
          }
        });
        
        // 반의어 예시 (부정어)
        const negativePatterns = ['không', 'chưa', 'un', 'im', 'dis', 'in', 'non'];
        vocabData.forEach(v => {
          const vMeaning = v.meaning_vi || v.meaning_en || '';
          if (antonyms.length < 3) {
            const hasNegative = negativePatterns.some(p => vMeaning.toLowerCase().includes(p) !== currentMeaning.toLowerCase().includes(p));
            if (hasNegative && v.pos === currentPos) {
              antonyms.push(v.word);
            }
          }
        });
      }
      
      setRelatedWords(prev => ({
        ...prev,
        [word]: { synonyms, antonyms, similar }
      }));
    } catch (error) {
      console.error('Error fetching related words:', error);
    } finally {
      setLoadingRelated(null);
    }
  };

  const toggleWordExpand = (word: string) => {
    const newExpanded = new Set(expandedWords);
    if (newExpanded.has(word)) {
      newExpanded.delete(word);
    } else {
      newExpanded.add(word);
      fetchRelatedWords(word);
    }
    setExpandedWords(newExpanded);
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
    } else {
      setStreak(0);
      // Reset consecutive count
      setConsecutiveCorrect(prev => ({ ...prev, [itemId]: 0 }));
      
      // 세션 중 틀린 단어 기록
      setWrongInSession(prev => {
        if (!prev.find(m => m.id === currentMistake.id)) {
          return [...prev, currentMistake];
        }
        return prev;
      });

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
    setWrongInSession([]);
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

  // 통계 계산
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
    
    // 가장 많이 틀린 단어 순으로 정렬
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

  // 차트 색상
  const CHART_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

  // 통계 대시보드 뷰
  if (viewMode === 'stats') {
    const stats = getStats();
    
    // 파이 차트 데이터
    const pieData = Object.entries(stats.levelCounts)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([lvl, count], idx) => ({
        name: `${lvl}급`,
        value: count,
        color: CHART_COLORS[idx % CHART_COLORS.length]
      }));
    
    // 바 차트 데이터 (TOP 5)
    const barData = stats.topMistakes.slice(0, 5).map(item => ({
      word: item.word,
      count: item.count
    }));
    
    return (
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            오답 통계
          </h3>
          <Button variant="outline" size="sm" onClick={() => setViewMode('review')}>
            복습 모드
          </Button>
        </div>

        {stats.total === 0 ? (
          <Card className="p-8 text-center bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <Trophy className="w-12 h-12 mx-auto text-yellow-500 mb-3" />
            <p className="text-muted-foreground">아직 오답 기록이 없습니다!</p>
          </Card>
        ) : (
          <>
            {/* 전체 통계 */}
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

            {/* 레벨별 파이 차트 */}
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
              {/* 레전드 */}
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {pieData.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-1 text-xs">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span>{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* 가장 많이 틀린 단어 바 차트 */}
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

            {/* 관련어 학습 (동의어/반의어/유사어) */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                관련어 학습
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                단어를 클릭하여 동의어, 반의어, 유사어를 확인하세요
              </p>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {stats.topMistakes.map((item, idx) => (
                  <div key={idx} className="border border-border rounded-lg overflow-hidden">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleWordExpand(item.word)}
                      className="w-full justify-between text-left h-auto py-2"
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{item.word}</span>
                        <Badge variant="outline" className="text-xs">{item.count}회</Badge>
                      </span>
                      {expandedWords.has(item.word) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                    
                    {expandedWords.has(item.word) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-3 pb-3"
                      >
                        {loadingRelated === item.word ? (
                          <div className="text-center py-2 text-sm text-muted-foreground">
                            관련어 검색 중...
                          </div>
                        ) : relatedWords[item.word] ? (
                          <div className="space-y-2 text-sm">
                            {relatedWords[item.word].synonyms.length > 0 && (
                              <div>
                                <span className="text-green-600 font-medium">동의어: </span>
                                {relatedWords[item.word].synonyms.join(', ')}
                              </div>
                            )}
                            {relatedWords[item.word].antonyms.length > 0 && (
                              <div>
                                <span className="text-red-600 font-medium">반의어: </span>
                                {relatedWords[item.word].antonyms.join(', ')}
                              </div>
                            )}
                            {relatedWords[item.word].similar.length > 0 && (
                              <div>
                                <span className="text-blue-600 font-medium">유사어: </span>
                                {relatedWords[item.word].similar.join(', ')}
                              </div>
                            )}
                            {relatedWords[item.word].synonyms.length === 0 && 
                             relatedWords[item.word].antonyms.length === 0 && 
                             relatedWords[item.word].similar.length === 0 && (
                              <div className="text-muted-foreground">
                                관련어가 없습니다
                              </div>
                            )}
                          </div>
                        ) : null}
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    );
  }

  if (mistakes.length === 0) {
    return (
      <div className="space-y-4">
        {/* 레벨 필터 & 통계 버튼 */}
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
          <Button onClick={() => window.location.reload()} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </Card>
      </div>
    );
  }

  if (sessionComplete) {
    const accuracy = mistakes.length > 0 ? Math.round((correctCount / mistakes.length) * 100) : 0;
    const wrongCount = mistakes.length - correctCount;
    
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
          <h3 className="text-xl font-bold text-foreground mb-4">복습 완료!</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-background/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-primary">{correctCount}</div>
              <div className="text-xs text-muted-foreground">정답</div>
            </div>
            <div className="bg-background/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-500">{accuracy}%</div>
              <div className="text-xs text-muted-foreground">정확도</div>
            </div>
          </div>
        </Card>

        {/* 마스터한 단어 */}
        {masteredInSession.length > 0 && (
          <Card className="p-4 bg-green-500/10 border-green-500/20">
            <h4 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              마스터한 단어 ({masteredInSession.length}개)
            </h4>
            <div className="flex flex-wrap gap-2">
              {masteredInSession.map((word, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="bg-green-500/20 text-green-700 px-3 py-1"
                >
                  {word}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* 이번 세션에서 틀린 단어 */}
        {wrongInSession.length > 0 && (
          <Card className="p-4 bg-red-500/10 border-red-500/20">
            <h4 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
              <X className="w-4 h-4" />
              다시 복습할 단어 ({wrongInSession.length}개)
            </h4>
            <div className="space-y-2">
              {wrongInSession.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                  <span className="font-medium">{item.item_data.word}</span>
                  <div className="text-sm text-muted-foreground">
                    {getMeaningForItem(item)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Button onClick={handleRestart} className="w-full">
          <RotateCcw className="w-4 h-4 mr-2" />
          다시 복습하기
        </Button>
      </div>
    );
  }

  const meaning = getMeaningForItem(currentMistake);
  const progress = ((currentIndex + 1) / mistakes.length) * 100;

  return (
    <div className="space-y-6">
      {/* 레벨 필터 & 통계 버튼 */}
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
