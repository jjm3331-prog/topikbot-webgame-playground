import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  GraduationCap, 
  Briefcase, 
  FileText, 
  MessageSquare, 
  Plane,
  Search,
  Loader2,
  Send,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Building2,
  BookOpen,
  Users,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CleanHeader from "@/components/CleanHeader";
import CommonFooter from "@/components/CommonFooter";
import { PremiumPreviewBanner } from "@/components/PremiumPreviewBanner";
import { useSubscription } from "@/hooks/useSubscription";

const KoreaCareer = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPremium } = useSubscription();
  const [activeTab, setActiveTab] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<string | null>(null);
  
  // Resume correction states
  const [resumeText, setResumeText] = useState("");
  const [correcting, setCorrecting] = useState(false);
  const [correctionResult, setCorrectionResult] = useState<string | null>(null);
  
  // Interview simulation states
  const [interviewType, setInterviewType] = useState<"company" | "visa" | null>(null);
  const [interviewMessages, setInterviewMessages] = useState<Array<{role: string; content: string}>>([]);
  const [interviewInput, setInterviewInput] = useState("");
  const [simulating, setSimulating] = useState(false);

  const features = [
    {
      icon: Search,
      title: "Tìm kiếm thông tin",
      description: "Du học, visa, việc làm tại Hàn Quốc",
      tab: "search",
      color: "from-korean-blue to-korean-cyan"
    },
    {
      icon: FileText,
      title: "Chỉnh sửa CV/자기소개서",
      description: "AI chấm và sửa hồ sơ xin việc",
      tab: "resume",
      color: "from-korean-orange to-korean-pink"
    },
    {
      icon: MessageSquare,
      title: "Phỏng vấn giả lập",
      description: "Luyện phỏng vấn công ty & đại sứ quán",
      tab: "interview",
      color: "from-korean-purple to-korean-pink"
    }
  ];

  const quickSearches = [
    "Học bổng chính phủ Hàn Quốc 2025",
    "Visa D-4-1 du học Hàn Quốc",
    "Việc làm IT tại Hàn Quốc cho người Việt",
    "Visa E-7 lao động chuyên môn",
    "Top 10 trường đại học Hàn Quốc",
    "Cách viết 자기소개서 xin việc"
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setSearchResults(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("korea-career-search", {
        body: { query: searchQuery, type: "search" }
      });
      
      if (error) throw error;
      setSearchResults(data.result);
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Lỗi tìm kiếm",
        description: "Không thể tìm kiếm. Vui lòng thử lại sau.",
        variant: "destructive"
      });
    } finally {
      setSearching(false);
    }
  };

  const handleResumeCorrection = async () => {
    if (!resumeText.trim()) {
      toast({
        title: "Vui lòng nhập nội dung",
        description: "Hãy dán CV hoặc 자기소개서 của bạn vào ô bên trên.",
        variant: "destructive"
      });
      return;
    }
    
    setCorrecting(true);
    setCorrectionResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("korea-career-search", {
        body: { query: resumeText, type: "resume" }
      });
      
      if (error) throw error;
      setCorrectionResult(data.result);
    } catch (error: any) {
      console.error("Correction error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể chỉnh sửa CV. Vui lòng thử lại sau.",
        variant: "destructive"
      });
    } finally {
      setCorrecting(false);
    }
  };

  const startInterview = async (type: "company" | "visa") => {
    setInterviewType(type);
    setInterviewMessages([]);
    setSimulating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("korea-career-search", {
        body: { 
          query: type === "company" 
            ? "Bắt đầu phỏng vấn công ty Hàn Quốc" 
            : "Bắt đầu phỏng vấn visa đại sứ quán Hàn Quốc",
          type: "interview",
          interviewType: type,
          messages: []
        }
      });
      
      if (error) throw error;
      setInterviewMessages([{ role: "assistant", content: data.result }]);
    } catch (error: any) {
      console.error("Interview error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể bắt đầu phỏng vấn. Vui lòng thử lại sau.",
        variant: "destructive"
      });
    } finally {
      setSimulating(false);
    }
  };

  const sendInterviewMessage = async () => {
    if (!interviewInput.trim() || simulating) return;
    
    const userMessage = interviewInput.trim();
    setInterviewInput("");
    setInterviewMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setSimulating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("korea-career-search", {
        body: { 
          query: userMessage,
          type: "interview",
          interviewType: interviewType,
          messages: [...interviewMessages, { role: "user", content: userMessage }]
        }
      });
      
      if (error) throw error;
      setInterviewMessages(prev => [...prev, { role: "assistant", content: data.result }]);
    } catch (error: any) {
      console.error("Interview error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tiếp tục phỏng vấn. Vui lòng thử lại sau.",
        variant: "destructive"
      });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <CleanHeader />
      
      <main className="pt-[76px] pb-12 px-4 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Premium Preview Banner */}
          {!isPremium && <PremiumPreviewBanner featureName="dịch vụ tìm việc" />}

          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-korean-blue/20 to-korean-cyan/20 text-korean-blue">
              <Plane className="w-4 h-4" />
              <span className="text-sm font-medium">Du học & Việc làm Hàn Quốc</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">
              🇰🇷 Thông tin Du học & Việc làm
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Tìm kiếm thông tin visa, học bổng, việc làm. Chỉnh sửa CV tiếng Hàn. Luyện phỏng vấn với AI.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid sm:grid-cols-3 gap-4">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.tab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card 
                  className={`p-6 cursor-pointer transition-all hover:scale-[1.02] ${
                    activeTab === feature.tab ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setActiveTab(feature.tab)}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Tabs Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="search" className="gap-2">
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Tìm kiếm</span>
              </TabsTrigger>
              <TabsTrigger value="resume" className="gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Chỉnh sửa CV</span>
              </TabsTrigger>
              <TabsTrigger value="interview" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Phỏng vấn</span>
              </TabsTrigger>
            </TabsList>

            {/* Search Tab */}
            <TabsContent value="search" className="space-y-6">
              <Card className="p-6">
                <div className="flex gap-3">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nhập câu hỏi về du học, visa, việc làm tại Hàn Quốc..."
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Button 
                    onClick={isPremium ? handleSearch : () => navigate("/pricing")} 
                    disabled={searching || (!isPremium && false) || !searchQuery.trim()}
                    className={isPremium ? "btn-primary" : "bg-gradient-to-r from-korean-orange to-korean-pink text-white"}
                  >
                    {!isPremium ? <Lock className="w-4 h-4" /> : searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>

                {/* Quick Searches */}
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Tìm kiếm nhanh:</p>
                  <div className="flex flex-wrap gap-2">
                    {quickSearches.map((query, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchQuery(query);
                          handleSearch();
                        }}
                        className="text-xs"
                      >
                        {query}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Search Results */}
              {searchResults && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Kết quả tìm kiếm</h3>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-foreground">{searchResults}</div>
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* Info Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-korean-blue/20 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-5 h-5 text-korean-blue" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Du học Hàn Quốc</h4>
                      <p className="text-sm text-muted-foreground">Học bổng, trường đại học, visa D-4</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                  </div>
                </Card>
                <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-korean-orange/20 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-korean-orange" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Việc làm tại Hàn</h4>
                      <p className="text-sm text-muted-foreground">Visa E-7, tuyển dụng, lương thưởng</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                  </div>
                </Card>
                <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-korean-purple/20 flex items-center justify-center shrink-0">
                      <Plane className="w-5 h-5 text-korean-purple" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Thông tin Visa</h4>
                      <p className="text-sm text-muted-foreground">Thủ tục, hồ sơ, phỏng vấn đại sứ quán</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* Resume Tab */}
            <TabsContent value="resume" className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Chỉnh sửa CV / 자기소개서</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Dán CV tiếng Hàn hoặc 자기소개서 của bạn vào đây. AI sẽ chấm điểm và đề xuất cách cải thiện.
                </p>
                <Textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Dán nội dung CV hoặc 자기소개서 của bạn tại đây..."
                  className="min-h-[200px] mb-4"
                />
                <Button 
                  onClick={isPremium ? handleResumeCorrection : () => navigate("/pricing")}
                  disabled={correcting || !resumeText.trim()}
                  className={`w-full ${isPremium ? "btn-primary" : "bg-gradient-to-r from-korean-orange to-korean-pink text-white"}`}
                >
                  {!isPremium ? (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Nâng cấp Premium
                    </>
                  ) : correcting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang phân tích...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Chấm và sửa CV
                    </>
                  )}
                </Button>
              </Card>

              {/* Correction Result */}
              {correctionResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-korean-orange" />
                      <h3 className="font-semibold text-foreground">Kết quả chấm điểm</h3>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-foreground">{correctionResult}</div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </TabsContent>

            {/* Interview Tab */}
            <TabsContent value="interview" className="space-y-6">
              {!interviewType ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  <Card 
                    className="p-6 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                    onClick={() => startInterview("company")}
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-korean-blue to-korean-cyan flex items-center justify-center mb-4">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Phỏng vấn công ty</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Luyện tập phỏng vấn xin việc tại công ty Hàn Quốc. AI sẽ đóng vai HR và đặt câu hỏi bằng tiếng Hàn.
                    </p>
                    <Button 
                      className="w-full"
                      onClick={() => isPremium ? startInterview("company") : navigate("/pricing")}
                    >
                      {isPremium ? "Bắt đầu phỏng vấn" : <><Lock className="w-4 h-4 mr-2" />Premium</>}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Card>

                  <Card 
                    className="p-6 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                    onClick={() => isPremium ? startInterview("visa") : navigate("/pricing")}
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-korean-purple to-korean-pink flex items-center justify-center mb-4">
                      <Plane className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Phỏng vấn visa đại sứ quán</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Chuẩn bị cho buổi phỏng vấn visa tại Đại sứ quán Hàn Quốc. AI sẽ hỏi các câu hỏi thường gặp.
                    </p>
                    <Button className="w-full">
                      {isPremium ? "Bắt đầu phỏng vấn" : <><Lock className="w-4 h-4 mr-2" />Premium</>}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Card>
                </div>
              ) : (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {interviewType === "company" ? (
                        <Building2 className="w-5 h-5 text-korean-blue" />
                      ) : (
                        <Plane className="w-5 h-5 text-korean-purple" />
                      )}
                      <h3 className="font-semibold text-foreground">
                        {interviewType === "company" ? "Phỏng vấn công ty" : "Phỏng vấn visa"}
                      </h3>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setInterviewType(null);
                        setInterviewMessages([]);
                      }}
                    >
                      Kết thúc
                    </Button>
                  </div>

                  {/* Interview Messages */}
                  <div className="space-y-4 max-h-[400px] overflow-y-auto mb-4 p-4 bg-muted/30 rounded-xl">
                    {interviewMessages.map((msg, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.role === "user" 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-card border border-border text-foreground"
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </motion.div>
                    ))}
                    {simulating && (
                      <div className="flex justify-start">
                        <div className="bg-card border border-border rounded-2xl px-4 py-3">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Interview Input */}
                  <div className="flex gap-3">
                    <Input
                      value={interviewInput}
                      onChange={(e) => setInterviewInput(e.target.value)}
                      placeholder="Nhập câu trả lời của bạn..."
                      onKeyDown={(e) => e.key === "Enter" && sendInterviewMessage()}
                      disabled={simulating}
                    />
                    <Button 
                      onClick={sendInterviewMessage}
                      disabled={simulating || !interviewInput.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <CommonFooter />
    </div>
  );
};

export default KoreaCareer;
