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
    "Samsung Electronics",
    "LG Electronics", 
    "Hyundai Motor",
    "Naver",
    "Kakao",
    "SK Hynix",
    "Coupang",
    "Baemin (Woowa Brothers)"
  ];

  const handleSearch = async (query?: string) => {
    const searchQuery = query || companyName;
    if (!searchQuery.trim()) {
      toast({
        title: "Vui lòng nhập tên công ty",
        description: "Hãy nhập tên công ty Hàn Quốc bạn muốn tìm kiếm.",
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
      
      // Filter out any <think> tags that might have slipped through
      let cleanReport = data.report || '';
      cleanReport = cleanReport.replace(/<think>[\s\S]*?<\/think>/gi, '');
      cleanReport = cleanReport.replace(/<\/?think>/gi, '');
      cleanReport = cleanReport.replace(/^\s*\n\s*\n/gm, '\n\n').trim();
      
      setReport(cleanReport);
      setCitations(data.citations || []);
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Lỗi tìm kiếm",
        description: "Không thể lấy thông tin công ty. Vui lòng thử lại.",
        variant: "destructive"
      });
    } finally {
      setSearching(false);
    }
  };

  const reportSections = [
    { icon: Building2, label: "Tổng quan công ty", color: "text-blue-500" },
    { icon: DollarSign, label: "Thông tin lương", color: "text-green-500" },
    { icon: Users, label: "Văn hóa công ty", color: "text-purple-500" },
    { icon: MessageSquare, label: "Review phỏng vấn", color: "text-orange-500" },
    { icon: Newspaper, label: "Tin tức mới nhất", color: "text-pink-500" }
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
          {!isPremium && <PremiumPreviewBanner featureName="Báo cáo chuyên sâu công ty" />}

          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
              <Search className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">Dựa trên AI Web Search</span>
            </div>
            
            <h1 className="text-headline">
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                Báo Cáo Chuyên Sâu Công Ty
              </span>
            </h1>
            <p className="text-body text-muted-foreground">
              Phân tích thông tin ẩn của các công ty Hàn Quốc với LUKATO RAG AI
            </p>
          </div>

          {/* Search Section */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex gap-3">
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Nhập tên công ty Hàn Quốc (VD: Samsung, Hyundai...)"
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
                <p className="text-card-body text-muted-foreground mb-2">Tìm kiếm nhanh:</p>
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
                <p className="text-card-title text-foreground mb-3">Nội dung báo cáo bao gồm:</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {reportSections.map((section) => (
                    <div key={section.label} className="flex items-center gap-2">
                      <section.icon className={`w-4 h-4 ${section.color}`} />
                      <span className="text-card-caption text-muted-foreground">{section.label}</span>
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
                  <p className="text-card-title-lg text-foreground">AI đang tìm kiếm trên web...</p>
                  <p className="text-card-body text-muted-foreground">Đang phân tích lương, văn hóa, review phỏng vấn...</p>
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
                  <h2 className="text-title text-foreground">Báo cáo chuyên sâu: {companyName}</h2>
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
                    Tài liệu tham khảo ({citations.length})
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
