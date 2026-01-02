import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, Check, AlertCircle, BookOpen, RefreshCw, Brain, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ImportStatus {
  dayNumber: number;
  status: "pending" | "loading" | "success" | "error";
  rootsCount?: number;
  wordsCount?: number;
  error?: string;
}

export default function HanjaImporter() {
  const [importing, setImporting] = useState(false);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [loadingMarkdown, setLoadingMarkdown] = useState(false);
  const [importStatuses, setImportStatuses] = useState<ImportStatus[]>([]);
  const [currentDay, setCurrentDay] = useState(0);
  const [dbStats, setDbStats] = useState({ units: 0, days: 0, roots: 0, words: 0 });
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadDbStats();
  }, []);

  const loadDbStats = async () => {
    const [
      { count: unitsCount },
      { count: daysCount },
      { count: rootsCount },
      { count: wordsCount },
    ] = await Promise.all([
      supabase.from("hanja_units").select("*", { count: "exact", head: true }),
      supabase.from("hanja_days").select("*", { count: "exact", head: true }),
      supabase.from("hanja_roots").select("*", { count: "exact", head: true }),
      supabase.from("hanja_words").select("*", { count: "exact", head: true }),
    ]);

    setDbStats({
      units: unitsCount || 0,
      days: daysCount || 0,
      roots: rootsCount || 0,
      words: wordsCount || 0,
    });
  };

  const loadMarkdown = async () => {
    setLoadingMarkdown(true);
    try {
      const response = await fetch("/data/hanja-mindmap.md");
      if (!response.ok) throw new Error("Failed to fetch markdown file");
      const text = await response.text();
      setMarkdown(text);
      toast({
        title: "마크다운 로드 완료",
        description: `${Math.round(text.length / 1024)} KB 로드됨`,
      });
    } catch (error) {
      console.error("Load markdown error:", error);
      toast({
        title: "마크다운 로드 실패",
        description: "hanja-mindmap.md 파일을 불러올 수 없습니다.",
        variant: "destructive",
      });
    } finally {
      setLoadingMarkdown(false);
    }
  };

  const importSingleDay = async (dayNumber: number): Promise<ImportStatus> => {
    if (!markdown) {
      return { dayNumber, status: "error", error: "Markdown not loaded" };
    }

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke("hanja-import", {
          body: { markdown, dayNumber },
        });

        // Supabase client-level error (network, non-2xx, etc.)
        if (error) {
          const message = error.message || "Unknown error";
          // Retry only for transient failures
          const shouldRetry = attempt < maxAttempts && /fetch|timeout|network|5\d\d/i.test(message);
          if (shouldRetry) {
            await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
            continue;
          }
          return { dayNumber, status: "error", error: message };
        }

        // Function-level error payload
        const result = data as any;
        if (result?.error) {
          return {
            dayNumber,
            status: "error",
            error: typeof result.error === "string" ? result.error : "Function returned an error",
          };
        }

        return {
          dayNumber,
          status: "success",
          rootsCount: result?.rootsCount,
          wordsCount: result?.wordsCount,
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        const shouldRetry = attempt < maxAttempts;
        if (shouldRetry) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
          continue;
        }
        return { dayNumber, status: "error", error: message };
      }
    }

    return { dayNumber, status: "error", error: "Unknown error" };
  };

  const startImport = async () => {
    if (!markdown) {
      toast({
        title: "마크다운 먼저 로드",
        description: "마크다운 파일을 먼저 로드해주세요.",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);

    const initialStatuses: ImportStatus[] = [];
    for (let i = 1; i <= 82; i++) initialStatuses.push({ dayNumber: i, status: "pending" });
    setImportStatuses(initialStatuses);

    let localSuccess = 0;

    for (let i = 1; i <= 82; i++) {
      setCurrentDay(i);

      setImportStatuses((prev) => prev.map((s) => (s.dayNumber === i ? { ...s, status: "loading" } : s)));

      const result = await importSingleDay(i);
      if (result.status === "success") localSuccess++;

      setImportStatuses((prev) => prev.map((s) => (s.dayNumber === i ? result : s)));

      // Small delay between days to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    setImporting(false);
    setCurrentDay(0);
    await loadDbStats();

    toast({
      title: "임포트 완료",
      description: `${localSuccess}/82 Day 성공적으로 임포트됨`,
    });
  };

  const progress = currentDay > 0 ? Math.round((currentDay / 82) * 100) : 0;
  const successCount = importStatuses.filter(s => s.status === "success").length;
  const errorCount = importStatuses.filter(s => s.status === "error").length;

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-korean-purple" />
            한자어 마인드맵 데이터
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">{dbStats.units}</p>
              <p className="text-xs text-muted-foreground">대단원</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">{dbStats.days}</p>
              <p className="text-xs text-muted-foreground">Day</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">{dbStats.roots}</p>
              <p className="text-xs text-muted-foreground">한자 뿌리</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">{dbStats.words}</p>
              <p className="text-xs text-muted-foreground">단어</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadDbStats}
            className="mt-4"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </CardContent>
      </Card>

      {/* Import Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-korean-orange" />
            마크다운 임포트
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={loadMarkdown}
              disabled={loadingMarkdown || importing}
              variant="outline"
            >
              {loadingMarkdown ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <BookOpen className="w-4 h-4 mr-2" />
              )}
              1. 마크다운 로드
            </Button>

            {markdown && (
              <Badge variant="secondary" className="py-2">
                ✓ {Math.round(markdown.length / 1024)} KB 로드됨
              </Badge>
            )}

            <Button
              onClick={startImport}
              disabled={!markdown || importing}
              className="bg-gradient-to-r from-korean-orange to-korean-pink"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              2. 82일 전체 재임포트(덮어쓰기)
            </Button>
          </div>

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Day {currentDay}/82 처리 중...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Results Summary */}
          {importStatuses.length > 0 && !importing && (
            <div className="flex gap-4 text-sm">
              <Badge variant="secondary" className="gap-1">
                <Check className="w-3 h-3 text-green-500" />
                성공: {successCount}
              </Badge>
              {errorCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <AlertCircle className="w-3 h-3 text-red-500" />
                  실패: {errorCount}
                </Badge>
              )}
            </div>
          )}

          {/* Detailed Status */}
          {importStatuses.length > 0 && (
            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  상세 보기
                  {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-64 overflow-y-auto">
                  {importStatuses.map(status => (
                    <div
                      key={status.dayNumber}
                      className={`p-2 rounded text-center text-xs ${
                        status.status === "success"
                          ? "bg-green-500/10 text-green-600"
                          : status.status === "error"
                          ? "bg-red-500/10 text-red-600"
                          : status.status === "loading"
                          ? "bg-yellow-500/10 text-yellow-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                      title={status.error || `${status.rootsCount || 0} roots, ${status.wordsCount || 0} words`}
                    >
                      {status.status === "loading" ? (
                        <Loader2 className="w-3 h-3 mx-auto animate-spin" />
                      ) : status.status === "success" ? (
                        <Check className="w-3 h-3 mx-auto" />
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
        </CardContent>
      </Card>
    </div>
  );
}
