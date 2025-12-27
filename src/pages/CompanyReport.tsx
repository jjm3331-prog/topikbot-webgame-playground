import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
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
  ExternalLink,
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
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isPremium } = useSubscription();

  const [companyName, setCompanyName] = useState("");
  const [searching, setSearching] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);

  const quickSearches = useMemo(
    () => [
      "Samsung Electronics",
      "LG Electronics",
      "Hyundai Motor",
      "Naver",
      "Kakao",
      "SK Hynix",
      "Coupang",
      "Baemin (Woowa Brothers)",
    ],
    []
  );

  const reportSections = useMemo(
    () => [
      { icon: Building2, labelKey: "careerPages.companyReport.sections.overview", color: "text-blue-500" },
      { icon: DollarSign, labelKey: "careerPages.companyReport.sections.salary", color: "text-green-500" },
      { icon: Users, labelKey: "careerPages.companyReport.sections.culture", color: "text-purple-500" },
      { icon: MessageSquare, labelKey: "careerPages.companyReport.sections.interviewReviews", color: "text-orange-500" },
      { icon: Newspaper, labelKey: "careerPages.companyReport.sections.latestNews", color: "text-pink-500" },
    ],
    []
  );

  const handleSearch = async (query?: string) => {
    const searchQuery = query || companyName;
    if (!searchQuery.trim()) {
      toast({
        title: t("careerPages.companyReport.toast.enterCompanyTitle"),
        description: t("careerPages.companyReport.toast.enterCompanyDesc"),
        variant: "destructive",
      });
      return;
    }

    setSearching(true);
    setReport(null);
    setCitations([]);

    try {
      const { data, error } = await supabase.functions.invoke("company-deep-report", {
        body: { companyName: searchQuery },
      });

      if (error) throw error;

      // Filter out any <think> tags that might have slipped through
      let cleanReport = data.report || "";
      cleanReport = cleanReport.replace(/<think>[\s\S]*?<\/think>/gi, "");
      cleanReport = cleanReport.replace(/<\/?think>/gi, "");
      cleanReport = cleanReport.replace(/^\s*\n\s*\n/gm, "\n\n").trim();

      setReport(cleanReport);
      setCitations(data.citations || []);
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: t("careerPages.companyReport.toast.searchErrorTitle"),
        description: t("careerPages.companyReport.toast.searchErrorDesc"),
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1 pt-8 pb-12 px-4 sm:px-8 lg:px-12 max-w-6xl mx-auto w-full">
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
            {t("careerPages.hub.title")}
          </Button>

          {/* Premium Banner */}
          {!isPremium && (
            <PremiumPreviewBanner featureName={t("careerPages.companyReport.premiumPreviewFeatureName")} />
          )}

          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
              <Search className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">{t("careerPages.companyReport.badge")}</span>
            </div>

            <h1 className="text-headline">
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                {t("careerPages.companyReport.title")}
              </span>
            </h1>
            <p className="text-body text-muted-foreground">{t("careerPages.companyReport.description")}</p>
          </div>

          {/* Search Section */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex gap-3">
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={t("careerPages.companyReport.inputPlaceholder")}
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button
                  onClick={() => handleSearch()}
                  disabled={searching || !companyName.trim()}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
                  aria-label={t("careerPages.companyReport.searchButtonLabel")}
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
                <p className="text-card-body text-muted-foreground mb-2">
                  {t("careerPages.companyReport.quickSearch")}
                </p>
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
                <p className="text-card-title text-foreground mb-3">
                  {t("careerPages.companyReport.includes")}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {reportSections.map((section) => (
                    <div key={section.labelKey} className="flex items-center gap-2">
                      <section.icon className={`w-4 h-4 ${section.color}`} />
                      <span className="text-card-caption text-muted-foreground">{t(section.labelKey)}</span>
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
                  <p className="text-card-title-lg text-foreground">{t("careerPages.companyReport.loadingTitle")}</p>
                  <p className="text-card-body text-muted-foreground">{t("careerPages.companyReport.loadingDesc")}</p>
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
                  <h2 className="text-title text-foreground">
                    {t("careerPages.companyReport.resultTitle", { company: companyName })}
                  </h2>
                </div>

                <div className="prose-ai max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-6">
                          <table>{children}</table>
                        </div>
                      ),
                      li: ({ children }) => (
                        <li className="pl-1">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-bold text-foreground">{children}</strong>
                      ),
                    }}
                  >
                    {report}
                  </ReactMarkdown>
                </div>
              </Card>

              {/* Citations */}
              {citations.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    {t("careerPages.companyReport.citations", { count: citations.length })}
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

