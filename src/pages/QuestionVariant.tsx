import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Sparkles, Upload, Wand2, Loader2, Crown, ImageIcon, RefreshCw, BookOpen, Lightbulb, CheckCircle2, Target, Download, BarChart3, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface DifficultyInfo {
  level?: string;
  grade?: string;
  score?: number;
  reasoning?: Record<string, string>;
}

interface SimilarQuestion {
  type?: Record<string, string>;
  description?: Record<string, string>;
  examReference?: string;
}

interface ParsedResult {
  originalAnalysis?: Record<string, string>;
  variantQuestion?: Record<string, string>;
  answer?: Record<string, string>;
  explanation?: Record<string, string>;
  learningPoints?: Record<string, string>;
  difficulty?: DifficultyInfo;
  similarQuestions?: SimilarQuestion[];
}

export default function QuestionVariant() {
  const { t, i18n } = useTranslation();
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<ParsedResult | null>(null);
  const [rawContent, setRawContent] = useState<string | null>(null);

  // 항상 문제/해설 출력은 한국어(ko) 기준으로 표시
  const currentLang = "ko";

  const usageExamples = [
    { subject: t("questionVariant.examples.reading"), example: t("questionVariant.examples.readingDesc") },
    { subject: t("questionVariant.examples.grammar"), example: t("questionVariant.examples.grammarDesc") },
    { subject: t("questionVariant.examples.vocabulary"), example: t("questionVariant.examples.vocabularyDesc") },
    { subject: t("questionVariant.examples.listening"), example: t("questionVariant.examples.listeningDesc") },
  ];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(t("questionVariant.errors.imageTooLarge"));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setImageFile(file);
        setGeneratedContent(null);
        setRawContent(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChangeImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const parseGeneratedContent = (content: string): ParsedResult => {
    const result: ParsedResult = {};

    const sections = {
      originalAnalysis: /##\s*📋\s*원본\s*문제\s*분석\s*[\s\S]*?(?=##|$)/i,
      variantQuestion: /##\s*✨\s*변형\s*문제\s*[\s\S]*?(?=##|$)/i,
      answer: /##\s*✅\s*정답\s*[\s\S]*?(?=##|$)/i,
      explanation: /##\s*📝\s*해설\s*[\s\S]*?(?=##|$)/i,
      learningPoints: /##\s*💡\s*학습\s*포인트\s*[\s\S]*?(?=##|$)/i,
    };

    const language = (t("common.currentLanguage", { defaultValue: "ko" }) as string) || "ko";

    for (const [key, regex] of Object.entries(sections)) {
      const match = content.match(regex);
      if (match) {
        const text = match[0].replace(/^##\s*[📋✨✅📝💡]\s*[^\n]+\n?/, "").trim();
        result[key as keyof ParsedResult] = { [language]: text } as any;
      }
    }

    return result;
  };

  const getDifficultyColor = (score?: number) => {
    if (!score) return "bg-gray-500";
    if (score <= 3) return "bg-green-500";
    if (score <= 5) return "bg-yellow-500";
    if (score <= 7) return "bg-orange-500";
    return "bg-red-500";
  };

  const getDifficultyLabel = (score?: number) => {
    if (!score) return t("questionVariant.difficulty.unknown");
    if (score <= 3) return t("questionVariant.difficulty.easy");
    if (score <= 5) return t("questionVariant.difficulty.medium");
    if (score <= 7) return t("questionVariant.difficulty.hard");
    return t("questionVariant.difficulty.veryHard");
  };

  const handleDownloadPDF = () => {
    if (!generatedContent && !rawContent) {
      toast.error(t("questionVariant.errors.noContent"));
      return;
    }

    try {
      const printContent = `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>TOPIK ${t("questionVariant.title")} - ${new Date().toLocaleDateString()}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&family=Noto+Sans:wght@400;600;700&display=swap');
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Noto Sans KR', 'Noto Sans', sans-serif; line-height: 1.6; color: #1a1a1a; padding: 40px; background: white; }
            .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #f59e0b; }
            .header h1 { font-size: 24px; color: #f59e0b; margin-bottom: 8px; }
            .header .date { font-size: 12px; color: #666; }
            .difficulty-badge { display: inline-block; padding: 8px 16px; border-radius: 8px; background: #f59e0b; color: white; font-weight: bold; margin: 10px 0; }
            .section { margin-bottom: 25px; break-inside: avoid; }
            .section-title { font-size: 14px; font-weight: 700; color: white; padding: 10px 15px; margin-bottom: 15px; border-radius: 6px; }
            .section-1 .section-title { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
            .section-2 .section-title { background: linear-gradient(135deg, #f59e0b, #d97706); }
            .section-3 .section-title { background: linear-gradient(135deg, #10b981, #059669); }
            .section-4 .section-title { background: linear-gradient(135deg, #8b5cf6, #6d28d9); }
            .section-5 .section-title { background: linear-gradient(135deg, #ec4899, #be185d); }
            .section-6 .section-title { background: linear-gradient(135deg, #06b6d4, #0891b2); }
            .content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .lang-block { padding: 15px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; }
            .lang-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid; }
            .lang-ko .lang-label { color: #3b82f6; border-color: #3b82f6; }
            .lang-vi .lang-label { color: #10b981; border-color: #10b981; }
            .lang-content { font-size: 13px; line-height: 1.8; white-space: pre-wrap; }
            .similar-questions { margin-top: 20px; }
            .similar-item { padding: 12px; margin-bottom: 10px; background: #f1f5f9; border-radius: 8px; border-left: 4px solid #06b6d4; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #999; }
            @media print { body { padding: 20px; } .section { break-inside: avoid; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>✨ TOPIK ${t("questionVariant.title")}</h1>
            <div class="date">${t("questionVariant.pdf.createdAt")}: ${new Date().toLocaleString()}</div>
            ${generatedContent?.difficulty ? `
              <div class="difficulty-badge">
                ${generatedContent.difficulty.level} ${generatedContent.difficulty.grade} | 
                ${t("questionVariant.difficulty.score")}: ${generatedContent.difficulty.score}/10
              </div>
            ` : ''}
          </div>
          
          ${generatedContent ? `
            ${generatedContent.originalAnalysis ? `
              <div class="section section-1">
                <div class="section-title">📋 ${t("questionVariant.sections.originalAnalysis")}</div>
                <div class="content-grid">
                  <div class="lang-block lang-ko">
                    <div class="lang-label">🇰🇷 한국어</div>
                    <div class="lang-content">${generatedContent.originalAnalysis.ko || '-'}</div>
                  </div>
                  <div class="lang-block lang-vi">
                    <div class="lang-label">🇻🇳 ${t("questionVariant.pdf.translation")}</div>
                    <div class="lang-content">${generatedContent.originalAnalysis.vi || '-'}</div>
                  </div>
                </div>
              </div>
            ` : ''}
            
            ${generatedContent.variantQuestion ? `
              <div class="section section-2">
                <div class="section-title">📝 ${t("questionVariant.sections.variantQuestion")}</div>
                <div class="content-grid">
                  <div class="lang-block lang-ko">
                    <div class="lang-label">🇰🇷 한국어</div>
                    <div class="lang-content">${generatedContent.variantQuestion.ko || '-'}</div>
                  </div>
                  <div class="lang-block lang-vi">
                    <div class="lang-label">🇻🇳 ${t("questionVariant.pdf.translation")}</div>
                    <div class="lang-content">${generatedContent.variantQuestion.vi || '-'}</div>
                  </div>
                </div>
              </div>
            ` : ''}
            
            ${generatedContent.answer ? `
              <div class="section section-3">
                <div class="section-title">✅ ${t("questionVariant.sections.answer")}</div>
                <div class="content-grid">
                  <div class="lang-block lang-ko">
                    <div class="lang-label">🇰🇷 한국어</div>
                    <div class="lang-content">${generatedContent.answer.ko || '-'}</div>
                  </div>
                  <div class="lang-block lang-vi">
                    <div class="lang-label">🇻🇳 ${t("questionVariant.pdf.translation")}</div>
                    <div class="lang-content">${generatedContent.answer.vi || '-'}</div>
                  </div>
                </div>
              </div>
            ` : ''}
            
            ${generatedContent.explanation ? `
              <div class="section section-4">
                <div class="section-title">💡 ${t("questionVariant.sections.explanation")}</div>
                <div class="content-grid">
                  <div class="lang-block lang-ko">
                    <div class="lang-label">🇰🇷 한국어</div>
                    <div class="lang-content">${generatedContent.explanation.ko || '-'}</div>
                  </div>
                  <div class="lang-block lang-vi">
                    <div class="lang-label">🇻🇳 ${t("questionVariant.pdf.translation")}</div>
                    <div class="lang-content">${generatedContent.explanation.vi || '-'}</div>
                  </div>
                </div>
              </div>
            ` : ''}
            
            ${generatedContent.learningPoints ? `
              <div class="section section-5">
                <div class="section-title">🎯 ${t("questionVariant.sections.learningPoints")}</div>
                <div class="content-grid">
                  <div class="lang-block lang-ko">
                    <div class="lang-label">🇰🇷 한국어</div>
                    <div class="lang-content">${generatedContent.learningPoints.ko || '-'}</div>
                  </div>
                  <div class="lang-block lang-vi">
                    <div class="lang-label">🇻🇳 ${t("questionVariant.pdf.translation")}</div>
                    <div class="lang-content">${generatedContent.learningPoints.vi || '-'}</div>
                  </div>
                </div>
              </div>
            ` : ''}

            ${generatedContent.similarQuestions && generatedContent.similarQuestions.length > 0 ? `
              <div class="section section-6">
                <div class="section-title">📚 ${t("questionVariant.sections.similarQuestions")}</div>
                <div class="similar-questions">
                  ${generatedContent.similarQuestions.map((q, i) => `
                    <div class="similar-item">
                      <strong>${i + 1}. ${q.type?.ko || q.type?.vi || ''}</strong>
                      <p style="margin-top: 8px; color: #64748b;">${q.description?.ko || q.description?.vi || ''}</p>
                      ${q.examReference ? `<p style="margin-top: 4px; color: #0891b2; font-size: 12px;">📖 ${q.examReference}</p>` : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          ` : `
            <div class="section">
              <div class="section-title" style="background: linear-gradient(135deg, #6b7280, #4b5563);">${t("questionVariant.result")}</div>
              <div class="lang-block">
                <div class="lang-content">${rawContent || '-'}</div>
              </div>
            </div>
          `}
          
          <div class="footer">
            LUKATO AI - TOPIK Question Variant Generator | © ${new Date().getFullYear()}
          </div>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
        
        toast.success(t("questionVariant.success.pdfOpened"));
      } else {
        toast.error(t("questionVariant.errors.popupBlocked"));
      }
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error(t("questionVariant.errors.pdfError"));
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage || !imageFile) {
      toast.error(t("questionVariant.errors.selectImage"));
      return;
    }

    if (!isPremium) {
      toast.error(t("questionVariant.errors.premiumRequired"));
      return;
    }

    setIsGenerating(true);
    setGeneratedContent(null);
    setRawContent(null);

    try {
      const base64Data = selectedImage.split(",")[1];
      const mimeType = imageFile.type;

      const { data, error } = await supabase.functions.invoke("question-variant", {
        body: {
          imageBase64: base64Data,
          imageMimeType: mimeType,
          difficulty: "similar",
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || t("questionVariant.errors.apiError"));
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setRawContent(data.response);
      
      if (data.parsed) {
        setGeneratedContent(data.parsed);
      } else {
        setGeneratedContent(parseGeneratedContent(data.response));
      }
      
      toast.success(t("questionVariant.success.generated"));
    } catch (error) {
      console.error("Error generating variant:", error);
      toast.error(error instanceof Error ? error.message : t("questionVariant.errors.tryAgain"));
    } finally {
      setIsGenerating(false);
    }
  };

  if (subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CleanHeader />
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
        disabled={!isPremium}
      />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-foreground flex items-center justify-center gap-3 mb-3">
            <Sparkles className="w-8 h-8 text-yellow-500" />
            {t("questionVariant.title")}
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-medium">
              <Crown className="w-4 h-4" />
              Premium
            </span>
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("questionVariant.description")}
          </p>
        </motion.div>

        {!isPremium && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto mb-8"
          >
            <Card className="border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-orange-500/10">
              <CardContent className="p-6 text-center">
                <Crown className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {t("questionVariant.premiumFeature")}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {t("questionVariant.premiumDescription")}
                </p>
                <Button 
                  onClick={() => navigate("/pricing")}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                >
                  {t("questionVariant.upgradePremium")}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-4xl mx-auto mb-8"
        >
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                {t("questionVariant.howToUse")}
              </h3>
              <div className="grid gap-3">
                {usageExamples.map((item, index) => (
                  <div key={index} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <span className="text-lg shrink-0">📌</span>
                    <div>
                      <span className="font-medium text-foreground">{item.subject}:</span>
                      <span className="text-muted-foreground ml-2">{item.example}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="max-w-4xl mx-auto grid gap-8 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  {t("questionVariant.uploadImage")}
                </h3>
                
                {selectedImage ? (
                  <div className="relative">
                    <img
                      src={selectedImage}
                      alt="Selected question"
                      className="w-full rounded-lg border border-border object-contain max-h-[400px]"
                    />
                    <Button
                      onClick={handleChangeImage}
                      variant="outline"
                      className="absolute top-4 right-4 bg-background/90 hover:bg-background text-foreground border border-border"
                      size="sm"
                      disabled={!isPremium}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {t("questionVariant.changeImage")}
                    </Button>
                  </div>
                ) : (
                  <div 
                    onClick={() => isPremium && fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center min-h-[300px] cursor-pointer border-2 border-dashed border-border/50 hover:border-primary/50 transition-colors ${!isPremium ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ImageIcon className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">
                      {t("questionVariant.clickToUpload")}
                    </p>
                    <p className="text-sm text-muted-foreground/70 mt-2">
                      {t("questionVariant.supportedFormats")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-primary" />
                  {t("questionVariant.generate")}
                </h3>

                <Button
                  onClick={handleGenerate}
                  disabled={!selectedImage || !isPremium || isGenerating}
                  className="w-full py-6 text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                      {t("questionVariant.generating")}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6 mr-2" />
                      {t("questionVariant.generateButton")}
                    </>
                  )}
                </Button>

                <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span>{t("questionVariant.features.analyze")}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span>{t("questionVariant.features.generate")}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span>{t("questionVariant.features.explain")}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <BarChart3 className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                    <span>{t("questionVariant.features.difficulty")}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <span>{t("questionVariant.features.similar")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {(generatedContent || rawContent) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto mt-8"
          >
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Target className="w-6 h-6" />
                    {t("questionVariant.result")}
                  </h3>
                  
                  {generatedContent?.difficulty && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
                        {generatedContent.difficulty.level} {generatedContent.difficulty.grade}
                      </Badge>
                      <Badge className={`${getDifficultyColor(generatedContent.difficulty.score)} text-white border-0 px-3 py-1`}>
                        {getDifficultyLabel(generatedContent.difficulty.score)} ({generatedContent.difficulty.score}/10)
                      </Badge>
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleDownloadPDF}
                  variant="outline"
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t("questionVariant.downloadPDF")}
                </Button>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Difficulty Analysis Section */}
                {generatedContent?.difficulty && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30">
                    <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-cyan-500" />
                      {t("questionVariant.sections.difficultyAnalysis")}
                    </h4>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="text-center p-3 rounded-lg bg-background/50">
                        <div className="text-sm text-muted-foreground mb-1">{t("questionVariant.difficulty.level")}</div>
                        <div className="text-lg font-bold text-foreground">{generatedContent.difficulty.level}</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-background/50">
                        <div className="text-sm text-muted-foreground mb-1">{t("questionVariant.difficulty.grade")}</div>
                        <div className="text-lg font-bold text-foreground">{generatedContent.difficulty.grade}</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-background/50">
                        <div className="text-sm text-muted-foreground mb-1">{t("questionVariant.difficulty.score")}</div>
                        <div className={`text-lg font-bold ${getDifficultyColor(generatedContent.difficulty.score).replace('bg-', 'text-')}`}>
                          {generatedContent.difficulty.score}/10
                        </div>
                      </div>
                    </div>
                    {generatedContent.difficulty.reasoning && (
                      <p className="mt-4 text-sm text-muted-foreground">
                        {generatedContent.difficulty.reasoning[currentLang] || generatedContent.difficulty.reasoning.ko}
                      </p>
                    )}
                  </div>
                )}

                {generatedContent?.originalAnalysis && (
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                    <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-500" />
                      {t("questionVariant.sections.originalAnalysis")}
                    </h4>
                    <p className="text-foreground whitespace-pre-wrap">
                      {generatedContent.originalAnalysis[currentLang] || generatedContent.originalAnalysis.ko}
                    </p>
                  </div>
                )}

                {generatedContent?.variantQuestion && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      {t("questionVariant.sections.variantQuestion")}
                    </h4>
                    <p className="text-foreground whitespace-pre-wrap">
                      {generatedContent.variantQuestion[currentLang] || generatedContent.variantQuestion.ko}
                    </p>
                  </div>
                )}

                {generatedContent?.answer && (
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                    <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      {t("questionVariant.sections.answer")}
                    </h4>
                    <p className="text-foreground whitespace-pre-wrap">
                      {generatedContent.answer[currentLang] || generatedContent.answer.ko}
                    </p>
                  </div>
                )}

                {generatedContent?.explanation && (
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                    <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-purple-500" />
                      {t("questionVariant.sections.explanation")}
                    </h4>
                    <p className="text-foreground whitespace-pre-wrap">
                      {generatedContent.explanation[currentLang] || generatedContent.explanation.ko}
                    </p>
                  </div>
                )}

                {generatedContent?.learningPoints && (
                  <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/30">
                    <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                      <Target className="w-5 h-5 text-pink-500" />
                      {t("questionVariant.sections.learningPoints")}
                    </h4>
                    <p className="text-foreground whitespace-pre-wrap">
                      {generatedContent.learningPoints[currentLang] || generatedContent.learningPoints.ko}
                    </p>
                  </div>
                )}

                {/* Similar Questions Section */}
                {generatedContent?.similarQuestions && generatedContent.similarQuestions.length > 0 && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30">
                    <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-indigo-500" />
                      {t("questionVariant.sections.similarQuestions")}
                    </h4>
                    <div className="space-y-3">
                      {generatedContent.similarQuestions.map((q, index) => (
                        <div key={index} className="p-4 rounded-lg bg-background/50 border border-border/50 hover:border-indigo-500/50 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-500 font-bold shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <h5 className="font-semibold text-foreground mb-1">
                                {q.type?.[currentLang] || q.type?.ko || `유형 ${index + 1}`}
                              </h5>
                              <p className="text-sm text-muted-foreground mb-2">
                                {q.description?.[currentLang] || q.description?.ko}
                              </p>
                              {q.examReference && (
                                <div className="flex items-center gap-2 text-xs text-indigo-500">
                                  <ArrowRight className="w-3 h-3" />
                                  {q.examReference}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!generatedContent && rawContent && (
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-foreground whitespace-pre-wrap">{rawContent}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
