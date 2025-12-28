import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, 
  Globe, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Languages,
  Sparkles,
  AlertTriangle,
  Zap
} from "lucide-react";
import { motion } from "framer-motion";

interface VocabStats {
  total: number;
  withViMeaning: number;
  withEnMeaning: number;
  withJaMeaning: number;
  withZhMeaning: number;
  withRuMeaning: number;
  withUzMeaning: number;
  withoutAnyMeaning: number;
}

interface LevelStats {
  level: number;
  total: number;
  translated: number;
  percentage: number;
}

interface GenerationResult {
  generated: number;
  errors: number;
  model: string;
  fallbacks?: number;
}

interface StreamProgress {
  word: string;
  level: number;
  index: number;
  total: number;
  generated: number;
  errors: number;
  usedModel: string;
  fallbacks: number;
}

const VocabTranslationManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generatingGemini, setGeneratingGemini] = useState(false);
  const [generatingGrok, setGeneratingGrok] = useState(false);
  const [stats, setStats] = useState<VocabStats | null>(null);
  const [levelStats, setLevelStats] = useState<LevelStats[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [batchSize, setBatchSize] = useState<string>("10");
  const [geminiResult, setGeminiResult] = useState<GenerationResult | null>(null);
  const [grokResult, setGrokResult] = useState<GenerationResult | null>(null);
  
  // Streaming state
  const [geminiProgress, setGeminiProgress] = useState<StreamProgress | null>(null);
  const [grokProgress, setGrokProgress] = useState<StreamProgress | null>(null);
  const [streamingModel, setStreamingModel] = useState<'gemini' | 'grok' | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Get total counts
      const { count: total } = await supabase
        .from('topik_vocabulary')
        .select('*', { count: 'exact', head: true });

      // Get counts for each language
      const { count: withVi } = await supabase
        .from('topik_vocabulary')
        .select('*', { count: 'exact', head: true })
        .not('meaning_vi', 'is', null);

      const { count: withEn } = await supabase
        .from('topik_vocabulary')
        .select('*', { count: 'exact', head: true })
        .not('meaning_en', 'is', null);

      const { count: withJa } = await supabase
        .from('topik_vocabulary')
        .select('*', { count: 'exact', head: true })
        .not('meaning_ja', 'is', null);

      const { count: withZh } = await supabase
        .from('topik_vocabulary')
        .select('*', { count: 'exact', head: true })
        .not('meaning_zh', 'is', null);

      const { count: withRu } = await supabase
        .from('topik_vocabulary')
        .select('*', { count: 'exact', head: true })
        .not('meaning_ru', 'is', null);

      const { count: withUz } = await supabase
        .from('topik_vocabulary')
        .select('*', { count: 'exact', head: true })
        .not('meaning_uz', 'is', null);

      // Get count without any meaning
      const { count: withoutAny } = await supabase
        .from('topik_vocabulary')
        .select('*', { count: 'exact', head: true })
        .is('meaning_vi', null);

      setStats({
        total: total || 0,
        withViMeaning: withVi || 0,
        withEnMeaning: withEn || 0,
        withJaMeaning: withJa || 0,
        withZhMeaning: withZh || 0,
        withRuMeaning: withRu || 0,
        withUzMeaning: withUz || 0,
        withoutAnyMeaning: withoutAny || 0,
      });

      // Get per-level stats
      const levelData: LevelStats[] = [];
      for (let level = 1; level <= 6; level++) {
        const { count: levelTotal } = await supabase
          .from('topik_vocabulary')
          .select('*', { count: 'exact', head: true })
          .eq('level', level);

        const { count: levelTranslated } = await supabase
          .from('topik_vocabulary')
          .select('*', { count: 'exact', head: true })
          .eq('level', level)
          .not('meaning_vi', 'is', null);

        const total = levelTotal || 0;
        const translated = levelTranslated || 0;

        levelData.push({
          level,
          total,
          translated,
          percentage: total > 0 ? Math.round((translated / total) * 100) : 0,
        });
      }
      setLevelStats(levelData);
    } catch (error) {
      console.error('Error loading stats:', error);
      toast({
        title: "통계 로드 실패",
        description: "데이터를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTranslations = async (model: 'gemini' | 'grok') => {
    const setGenerating = model === 'gemini' ? setGeneratingGemini : setGeneratingGrok;
    const setResult = model === 'gemini' ? setGeminiResult : setGrokResult;
    const setProgress = model === 'gemini' ? setGeminiProgress : setGrokProgress;
    
    setGenerating(true);
    setResult(null);
    setProgress(null);
    setStreamingModel(model);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // 스트리밍 요청
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vocab-batch-generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            type: "translate",
            level: selectedLevel === "all" ? null : parseInt(selectedLevel),
            batchSize: parseInt(batchSize),
            model: model,
            stream: true,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '번역 생성 실패');
      }

      // SSE 스트림 파싱
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'start') {
                  console.log(`[Stream] Started: ${data.total} items, model: ${data.model}`);
                } else if (data.type === 'progress') {
                  setProgress({
                    word: data.word,
                    level: data.level,
                    index: data.index,
                    total: data.total,
                    generated: data.generated,
                    errors: data.errors,
                    usedModel: data.usedModel,
                    fallbacks: data.fallbacks,
                  });
                } else if (data.type === 'error') {
                  console.error(`[Stream] Error on ${data.word}:`, data.message);
                } else if (data.type === 'complete') {
                  setResult({ 
                    generated: data.generated, 
                    errors: data.errors, 
                    model: data.model,
                    fallbacks: data.fallbacks 
                  });
                  toast({
                    title: `${model === 'gemini' ? 'Gemini' : 'Grok'} 번역 완료`,
                    description: `${data.generated}개 생성, ${data.errors}개 오류${data.fallbacks > 0 ? `, ${data.fallbacks}개 fallback` : ''}`,
                  });
                } else if (data.type === 'fatal') {
                  throw new Error(data.error);
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', line, e);
              }
            }
          }
        }
      }

      // Reload stats
      await loadStats();
    } catch (error: any) {
      console.error('Translation generation error:', error);
      toast({
        title: "번역 생성 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
      setProgress(null);
      setStreamingModel(null);
    }
  };

  const getLevelColor = (level: number) => {
    if (level <= 2) return "from-green-400 to-emerald-500";
    if (level <= 4) return "from-blue-400 to-cyan-500";
    return "from-purple-500 to-pink-500";
  };

  const getLanguageFlag = (lang: string) => {
    switch (lang) {
      case 'vi': return '🇻🇳';
      case 'en': return '🇺🇸';
      case 'ja': return '🇯🇵';
      case 'zh': return '🇨🇳';
      case 'ru': return '🇷🇺';
      case 'uz': return '🇺🇿';
      default: return '🌐';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Languages className="w-5 h-5 text-violet-500" />
                <span className="text-sm text-muted-foreground">총 어휘</span>
              </div>
              <p className="text-3xl font-bold">{stats?.total.toLocaleString()}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-sm text-muted-foreground">번역 완료</span>
              </div>
              <p className="text-3xl font-bold">{(stats?.total || 0) - (stats?.withoutAnyMeaning || 0)}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span className="text-sm text-muted-foreground">번역 필요</span>
              </div>
              <p className="text-3xl font-bold">{stats?.withoutAnyMeaning?.toLocaleString()}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-cyan-500" />
                <span className="text-sm text-muted-foreground">진행률</span>
              </div>
              <p className="text-3xl font-bold">
                {stats && stats.total > 0 
                  ? Math.round(((stats.total - stats.withoutAnyMeaning) / stats.total) * 100) 
                  : 0}%
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Language Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            7개국 언어별 번역 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { lang: 'vi', label: 'Tiếng Việt', count: stats?.withViMeaning || 0 },
              { lang: 'en', label: 'English', count: stats?.withEnMeaning || 0 },
              { lang: 'ja', label: '日本語', count: stats?.withJaMeaning || 0 },
              { lang: 'zh', label: '中文', count: stats?.withZhMeaning || 0 },
              { lang: 'ru', label: 'Русский', count: stats?.withRuMeaning || 0 },
              { lang: 'uz', label: "O'zbek", count: stats?.withUzMeaning || 0 },
            ].map((item) => {
              const percentage = stats && stats.total > 0 
                ? Math.round((item.count / stats.total) * 100) 
                : 0;
              
              return (
                <div key={item.lang} className="p-4 rounded-xl bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{getLanguageFlag(item.lang)}</span>
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  </div>
                  <p className="text-2xl font-bold mb-2">{item.count.toLocaleString()}</p>
                  <Progress value={percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{percentage}%</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Level-wise Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-primary" />
            TOPIK 급수별 번역 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {levelStats.map((level) => (
              <div
                key={level.level}
                className="p-4 rounded-xl border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge className={`bg-gradient-to-r ${getLevelColor(level.level)} text-white`}>
                    {level.level}급
                  </Badge>
                  <span className="text-sm font-bold">{level.percentage}%</span>
                </div>
                <p className="text-lg font-bold">{level.translated.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">/ {level.total.toLocaleString()}</p>
                <Progress value={level.percentage} className="h-2 mt-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generation Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI 번역 생성 (병렬 실행 가능)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">대상 급수</label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="급수 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 급수</SelectItem>
                  <SelectItem value="1">1급 (초급)</SelectItem>
                  <SelectItem value="2">2급 (초급)</SelectItem>
                  <SelectItem value="3">3급 (중급)</SelectItem>
                  <SelectItem value="4">4급 (중급)</SelectItem>
                  <SelectItem value="5">5급 (고급)</SelectItem>
                  <SelectItem value="6">6급 (고급)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-32">
              <label className="text-sm font-medium mb-2 block">배치 크기</label>
              <Select value={batchSize} onValueChange={setBatchSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5개</SelectItem>
                  <SelectItem value="10">10개</SelectItem>
                  <SelectItem value="20">20개</SelectItem>
                  <SelectItem value="50">50개</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 flex-wrap">
              {/* Gemini Button */}
              <Button
                onClick={() => handleGenerateTranslations('gemini')}
                disabled={generatingGemini}
                className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
              >
                {generatingGemini ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gemini 생성 중...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Gemini 생성
                  </>
                )}
              </Button>
              
              {/* Grok Button */}
              <Button
                onClick={() => handleGenerateTranslations('grok')}
                disabled={generatingGrok}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                {generatingGrok ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Grok 생성 중...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Grok 생성
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={loadStats}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Real-time Progress UI */}
          {(geminiProgress || grokProgress) && (
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {geminiProgress && generatingGemini && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/40"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="relative">
                      <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
                      <div className="absolute inset-0 animate-ping opacity-30">
                        <Sparkles className="w-5 h-5 text-violet-500" />
                      </div>
                    </div>
                    <span className="font-medium text-violet-600 dark:text-violet-400">Gemini 실시간 진행</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">현재 단어</span>
                      <span className="font-bold text-lg">{geminiProgress.word}</span>
                    </div>
                    
                    <Progress 
                      value={(geminiProgress.index / geminiProgress.total) * 100} 
                      className="h-3"
                    />
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{geminiProgress.index} / {geminiProgress.total}</span>
                      <span className="font-medium">{Math.round((geminiProgress.index / geminiProgress.total) * 100)}%</span>
                    </div>
                    
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>{geminiProgress.generated}</span>
                      </div>
                      {geminiProgress.errors > 0 && (
                        <div className="flex items-center gap-1">
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span>{geminiProgress.errors}</span>
                        </div>
                      )}
                      {geminiProgress.fallbacks > 0 && (
                        <div className="flex items-center gap-1">
                          <Zap className="w-4 h-4 text-orange-500" />
                          <span>Fallback: {geminiProgress.fallbacks}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      모델: {geminiProgress.usedModel === 'grok-fallback' ? 'Grok (Fallback)' : 'Gemini'}
                    </div>
                  </div>
                </motion.div>
              )}
              
              {grokProgress && generatingGrok && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/40"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="relative">
                      <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                      <div className="absolute inset-0 animate-ping opacity-30">
                        <Zap className="w-5 h-5 text-orange-500" />
                      </div>
                    </div>
                    <span className="font-medium text-orange-600 dark:text-orange-400">Grok 실시간 진행</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">현재 단어</span>
                      <span className="font-bold text-lg">{grokProgress.word}</span>
                    </div>
                    
                    <Progress 
                      value={(grokProgress.index / grokProgress.total) * 100} 
                      className="h-3"
                    />
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{grokProgress.index} / {grokProgress.total}</span>
                      <span className="font-medium">{Math.round((grokProgress.index / grokProgress.total) * 100)}%</span>
                    </div>
                    
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>{grokProgress.generated}</span>
                      </div>
                      {grokProgress.errors > 0 && (
                        <div className="flex items-center gap-1">
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span>{grokProgress.errors}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Results */}
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            {geminiResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/30"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  <span className="font-medium text-violet-600 dark:text-violet-400">Gemini 결과</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="font-medium">{geminiResult.generated}개 생성</span>
                  </div>
                  {geminiResult.errors > 0 && (
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="text-muted-foreground">{geminiResult.errors}개 오류</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {grokResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  <span className="font-medium text-orange-600 dark:text-orange-400">Grok 결과</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="font-medium">{grokResult.generated}개 생성</span>
                  </div>
                  {grokResult.errors > 0 && (
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="text-muted-foreground">{grokResult.errors}개 오류</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          <div className="mt-4 p-4 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-xl border border-emerald-500/30">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-emerald-600 dark:text-emerald-400 mb-1">듀얼 AI 번역 시스템</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• <strong className="text-violet-500">Gemini 2.5 Flash</strong> - Google API 직접 호출</li>
                  <li>• <strong className="text-orange-500">Grok 4.1 Fast Reasoning</strong> - xAI API 직접 호출</li>
                  <li>• 두 버튼을 동시에 클릭하면 <strong>병렬로 실행</strong>됩니다</li>
                  <li>• 이미 번역된 단어는 건너뜁니다 (meaning_vi가 NULL인 경우만 처리)</li>
                  <li>• 7개국 언어 (vi, en, ja, zh, ru, uz)가 한 번에 생성됩니다</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VocabTranslationManager;
