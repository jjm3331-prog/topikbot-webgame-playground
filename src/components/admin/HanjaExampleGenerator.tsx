import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Play, 
  Pause, 
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Zap
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DayStatus {
  dayNumber: number;
  status: "pending" | "processing" | "completed" | "error";
  totalWords: number;
  processedWords: number;
  successWords: number;
  failedWords: number;
}

interface GenerationStats {
  totalWords: number;
  wordsWithExamples: number;
  wordsWithoutExamples: number;
}

export default function HanjaExampleGenerator() {
  const [generating, setGenerating] = useState(false);
  const [paused, setPaused] = useState(false);
  const [dayStatuses, setDayStatuses] = useState<DayStatus[]>([]);
  const [currentDay, setCurrentDay] = useState(0);
  const [stats, setStats] = useState<GenerationStats>({ totalWords: 0, wordsWithExamples: 0, wordsWithoutExamples: 0 });
  const [showDetails, setShowDetails] = useState(false);
  const [startDay, setStartDay] = useState(1);
  const [endDay, setEndDay] = useState(82);
  const [batchSize, setBatchSize] = useState(5);
  const [pauseRef, setPauseRef] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [
      { count: totalCount },
      { count: withExamplesCount },
    ] = await Promise.all([
      supabase.from("hanja_words").select("*", { count: "exact", head: true }),
      supabase.from("hanja_words").select("*", { count: "exact", head: true }).not("example_sentence", "is", null),
    ]);

    setStats({
      totalWords: totalCount || 0,
      wordsWithExamples: withExamplesCount || 0,
      wordsWithoutExamples: (totalCount || 0) - (withExamplesCount || 0),
    });
  };

  const generateForDay = async (dayNumber: number): Promise<{ success: boolean; processed: number; successCount: number; failedCount: number }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hanja-generate-examples`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ 
            dayNumber, 
            batchSize,
            skipExisting: true 
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unknown error");
      }

      return {
        success: true,
        processed: result.processed || 0,
        successCount: result.success || 0,
        failedCount: result.failed || 0,
      };
    } catch (error) {
      console.error(`Day ${dayNumber} generation error:`, error);
      return {
        success: false,
        processed: 0,
        successCount: 0,
        failedCount: 0,
      };
    }
  };

  const startGeneration = async () => {
    setGenerating(true);
    setPaused(false);
    setPauseRef(false);

    // Initialize day statuses
    const initialStatuses: DayStatus[] = [];
    for (let i = startDay; i <= endDay; i++) {
      initialStatuses.push({
        dayNumber: i,
        status: "pending",
        totalWords: 0,
        processedWords: 0,
        successWords: 0,
        failedWords: 0,
      });
    }
    setDayStatuses(initialStatuses);

    // Process each day
    for (let i = startDay; i <= endDay; i++) {
      // Check if paused
      if (pauseRef) {
        setPaused(true);
        break;
      }

      setCurrentDay(i);

      // Update status to processing
      setDayStatuses(prev => 
        prev.map(s => s.dayNumber === i ? { ...s, status: "processing" } : s)
      );

      // Keep processing until all words in this day are done
      let totalProcessed = 0;
      let totalSuccess = 0;
      let totalFailed = 0;
      let hasMore = true;

      while (hasMore && !pauseRef) {
        const result = await generateForDay(i);

        if (!result.success) {
          setDayStatuses(prev => 
            prev.map(s => s.dayNumber === i ? { 
              ...s, 
              status: "error",
              processedWords: totalProcessed,
              successWords: totalSuccess,
              failedWords: totalFailed,
            } : s)
          );
          break;
        }

        totalProcessed += result.processed;
        totalSuccess += result.successCount;
        totalFailed += result.failedCount;

        // Update progress
        setDayStatuses(prev => 
          prev.map(s => s.dayNumber === i ? { 
            ...s, 
            processedWords: totalProcessed,
            successWords: totalSuccess,
            failedWords: totalFailed,
          } : s)
        );

        // If no words were processed, we're done with this day
        if (result.processed === 0) {
          hasMore = false;
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Mark day as completed
      if (!pauseRef) {
        setDayStatuses(prev => 
          prev.map(s => s.dayNumber === i ? { 
            ...s, 
            status: totalFailed > 0 ? "error" : "completed",
          } : s)
        );
      }

      // Delay between days
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setGenerating(false);
    setCurrentDay(0);
    await loadStats();

    if (!pauseRef) {
      toast({
        title: "예문 생성 완료",
        description: "모든 Day의 예문 생성이 완료되었습니다.",
      });
    }
  };

  const handlePause = () => {
    setPauseRef(true);
    setPaused(true);
  };

  const handleResume = () => {
    setPaused(false);
    setPauseRef(false);
    // Continue from where we left off
    const lastProcessed = dayStatuses.findIndex(s => s.status === "pending");
    if (lastProcessed > 0) {
      setStartDay(dayStatuses[lastProcessed - 1].dayNumber + 1);
      startGeneration();
    }
  };

  const handleReset = () => {
    setGenerating(false);
    setPaused(false);
    setPauseRef(false);
    setCurrentDay(0);
    setDayStatuses([]);
    loadStats();
  };

  const progress = currentDay > 0 ? Math.round(((currentDay - startDay) / (endDay - startDay + 1)) * 100) : 0;
  const completedCount = dayStatuses.filter(s => s.status === "completed").length;
  const errorCount = dayStatuses.filter(s => s.status === "error").length;
  const coveragePercent = stats.totalWords > 0 
    ? Math.round((stats.wordsWithExamples / stats.totalWords) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-korean-purple" />
            예문 생성 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">{stats.totalWords}</p>
              <p className="text-xs text-muted-foreground">전체 단어</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{stats.wordsWithExamples}</p>
              <p className="text-xs text-muted-foreground">예문 있음</p>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">{stats.wordsWithoutExamples}</p>
              <p className="text-xs text-muted-foreground">예문 없음</p>
            </div>
          </div>
          
          {/* Coverage Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">예문 커버리지</span>
              <span className="font-medium">{coveragePercent}%</span>
            </div>
            <Progress value={coveragePercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Generation Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-korean-orange" />
            AI 예문 일괄 생성
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">시작 Day</label>
              <Select 
                value={startDay.toString()} 
                onValueChange={(v) => setStartDay(parseInt(v))}
                disabled={generating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 82 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      Day {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">종료 Day</label>
              <Select 
                value={endDay.toString()} 
                onValueChange={(v) => setEndDay(parseInt(v))}
                disabled={generating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 82 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      Day {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">배치 크기</label>
              <Select 
                value={batchSize.toString()} 
                onValueChange={(v) => setBatchSize(parseInt(v))}
                disabled={generating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3개씩</SelectItem>
                  <SelectItem value="5">5개씩</SelectItem>
                  <SelectItem value="10">10개씩</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex flex-wrap gap-3">
            {!generating ? (
              <Button
                onClick={startGeneration}
                className="bg-gradient-to-r from-korean-purple to-korean-pink"
              >
                <Play className="w-4 h-4 mr-2" />
                예문 생성 시작
              </Button>
            ) : (
              <>
                {!paused ? (
                  <Button onClick={handlePause} variant="outline">
                    <Pause className="w-4 h-4 mr-2" />
                    일시 정지
                  </Button>
                ) : (
                  <Button onClick={handleResume} variant="outline">
                    <Play className="w-4 h-4 mr-2" />
                    계속하기
                  </Button>
                )}
              </>
            )}

            {(generating || dayStatuses.length > 0) && (
              <Button onClick={handleReset} variant="ghost">
                <RotateCcw className="w-4 h-4 mr-2" />
                초기화
              </Button>
            )}

            <Button onClick={loadStats} variant="ghost" size="sm">
              새로고침
            </Button>
          </div>

          {/* Progress */}
          {generating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {paused ? (
                    <Badge variant="secondary">일시 정지됨</Badge>
                  ) : (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Day {currentDay} 처리 중...
                    </>
                  )}
                </span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Results Summary */}
          {dayStatuses.length > 0 && !generating && (
            <div className="flex gap-4 text-sm">
              <Badge variant="secondary" className="gap-1">
                <Check className="w-3 h-3 text-green-500" />
                완료: {completedCount}
              </Badge>
              {errorCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <AlertCircle className="w-3 h-3 text-red-500" />
                  오류: {errorCount}
                </Badge>
              )}
            </div>
          )}

          {/* Detailed Status */}
          {dayStatuses.length > 0 && (
            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  상세 보기
                  {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-64 overflow-y-auto">
                  {dayStatuses.map(status => (
                    <div
                      key={status.dayNumber}
                      className={`p-2 rounded text-center text-xs transition-all ${
                        status.status === "completed"
                          ? "bg-green-500/10 text-green-600"
                          : status.status === "error"
                          ? "bg-red-500/10 text-red-600"
                          : status.status === "processing"
                          ? "bg-yellow-500/10 text-yellow-600 animate-pulse"
                          : "bg-muted text-muted-foreground"
                      }`}
                      title={`성공: ${status.successWords}, 실패: ${status.failedWords}`}
                    >
                      {status.status === "processing" ? (
                        <Loader2 className="w-3 h-3 mx-auto animate-spin" />
                      ) : status.status === "completed" ? (
                        <div>
                          <Check className="w-3 h-3 mx-auto" />
                          <span className="text-[10px]">{status.successWords}</span>
                        </div>
                      ) : status.status === "error" ? (
                        <AlertCircle className="w-3 h-3 mx-auto" />
                      ) : (
                        <span>D{status.dayNumber}</span>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Info */}
          <p className="text-xs text-muted-foreground">
            💡 Lovable AI (Gemini 2.5 Flash)를 사용하여 한국어 예문과 7개국어 번역을 자동 생성합니다.
            이미 예문이 있는 단어는 건너뜁니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
