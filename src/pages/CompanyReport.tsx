import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Search, 
  Loader2, 
  Building2, 
  DollarSign,
  Users,
  MessageSquare,
  Newspaper,
  ArrowLeft,
  Sparkles,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { PremiumPreviewBanner } from "@/components/PremiumPreviewBanner";
import { useSubscription } from "@/hooks/useSubscription";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const CompanyReport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPremium } = useSubscription();
  
  const [companyName, setCompanyName] = useState("");
  const [searching, setSearching] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);

  const quickSearches = [
    "삼성전자",
    "LG전자", 
    "현대자동차",
    "네이버",
    "카카오",
    "SK하이닉스",
    "쿠팡",
    "배달의민족"
  ];

  const handleSearch = async (query?: string) => {
    const searchQuery = query || companyName;
    if (!searchQuery.trim()) {
      toast({
        title: "기업명을 입력해주세요",
        description: "검색할 한국 기업명을 입력하세요.",
        variant: "destructive"
      });
      return;
    }
    
    setSearching(true);
    setReport(null);
    setCitations([]);
    
    try {
      const { data, error } = await supabase.functions.invoke("company-deep-report", {
        body: { companyName: searchQuery }
      });
      
      if (error) throw error;
      
      setReport(data.report);
      setCitations(data.citations || []);
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "검색 오류",
        description: "기업 정보를 가져오는데 실패했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    } finally {
      setSearching(false);
    }
  };

  const reportSections = [
    { icon: Building2, label: "기업 개요", color: "text-blue-500" },
    { icon: DollarSign, label: "연봉 정보", color: "text-green-500" },
    { icon: Users, label: "기업 문화", color: "text-purple-500" },
    { icon: MessageSquare, label: "면접 후기", color: "text-orange-500" },
    { icon: Newspaper, label: "최신 뉴스", color: "text-pink-500" }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1 pt-8 pb-12 px-4 max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/korea-career")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Korea Career Hub
          </Button>

          {/* Premium Banner */}
          {!isPremium && <PremiumPreviewBanner featureName="기업 심층 리포트" />}

          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
              <Search className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">AI 웹검색 기반</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold">
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                기업 심층 리포트
              </span>
            </h1>
            <p className="text-muted-foreground text-sm">
              Perplexity Deep Research로 한국 기업의 숨겨진 정보를 분석합니다
            </p>
          </div>

          {/* Search Section */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex gap-3">
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="한국 기업명을 입력하세요 (예: 삼성전자, 네이버...)"
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button
                  onClick={() => handleSearch()}
                  disabled={searching || !companyName.trim()}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
                >
                  {searching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Quick Search */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">빠른 검색:</p>
                <div className="flex flex-wrap gap-2">
                  {quickSearches.map((company) => (
                    <Button
                      key={company}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCompanyName(company);
                        handleSearch(company);
                      }}
                      disabled={searching}
                      className="text-xs"
                    >
                      {company}
                    </Button>
                  ))}
                </div>
              </div>

              {/* What you'll get */}
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-3">리포트에 포함되는 내용:</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {reportSections.map((section) => (
                    <div key={section.label} className="flex items-center gap-2 text-sm">
                      <section.icon className={`w-4 h-4 ${section.color}`} />
                      <span className="text-muted-foreground">{section.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Loading State */}
          {searching && (
            <Card className="p-8">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" />
                  <Loader2 className="w-8 h-8 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">AI가 웹을 검색하고 있습니다...</p>
                  <p className="text-sm text-muted-foreground">연봉, 문화, 면접 후기 등을 분석 중</p>
                </div>
              </div>
            </Card>
          )}

          {/* Report Result */}
          {report && !searching && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  <h2 className="font-bold text-lg">{companyName} 심층 리포트</h2>
                </div>
                
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {report}
                  </ReactMarkdown>
                </div>
              </Card>

              {/* Citations */}
              {citations.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    참고 자료 ({citations.length})
                  </h3>
                  <div className="space-y-2">
                    {citations.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-blue-500 hover:underline truncate"
                      >
                        [{idx + 1}] {url}
                      </a>
                    ))}
                  </div>
                </Card>
              )}
            </motion.div>
          )}
        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
};

export default CompanyReport;
