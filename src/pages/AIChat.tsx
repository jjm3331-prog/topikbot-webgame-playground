import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CleanHeader from "@/components/CleanHeader";
import CommonFooter from "@/components/CommonFooter";
import { supabase } from "@/integrations/supabase/client";
import { 
  Sparkles, 
  Bot, 
  MessageSquare, 
  Zap, 
  ArrowRight,
  Crown,
  BookOpen,
  GraduationCap,
  Globe,
  Lock
} from "lucide-react";

// Agent card data
const AI_AGENTS = [
  {
    id: "topik",
    title: "TOPIK Agent",
    subtitle: "Chuyên gia TOPIK I & II 🇰🇷",
    description: "Giải đáp mọi thắc mắc về tiếng Hàn, ngữ pháp, từ vựng và chiến lược luyện thi TOPIK.",
    icon: GraduationCap,
    available: true,
    features: ["Ngữ pháp tiếng Hàn", "Từ vựng TOPIK", "Chiến lược thi", "Luyện viết"],
    gradient: "from-korean-blue to-korean-green",
    path: "/ai-chat/topik"
  },
  {
    id: "ielts",
    title: "IELTS Agent",
    subtitle: "Tiếng Anh IELTS 🇬🇧",
    description: "Luyện thi IELTS 4 kỹ năng: Listening, Reading, Writing, Speaking.",
    icon: Globe,
    available: true,
    features: ["Writing Task 1&2", "Speaking Practice", "Reading Skills", "Listening Tips"],
    gradient: "from-blue-500 to-indigo-500",
    path: "/ai-chat/ielts"
  },
  {
    id: "jlpt",
    title: "JLPT Agent",
    subtitle: "Tiếng Nhật N1-N5 🇯🇵",
    description: "Hỗ trợ học tiếng Nhật và luyện thi JLPT các cấp độ.",
    icon: BookOpen,
    available: false,
    features: ["Ngữ pháp tiếng Nhật", "Kanji & Từ vựng", "Nghe hiểu", "Đọc hiểu"],
    gradient: "from-red-500 to-pink-500",
    path: "/ai-chat/jlpt"
  },
  {
    id: "hsk",
    title: "HSK Agent", 
    subtitle: "Tiếng Trung HSK 1-6 🇨🇳",
    description: "Học tiếng Trung và chuẩn bị thi HSK hiệu quả.",
    icon: Globe,
    available: false,
    features: ["Ngữ pháp tiếng Trung", "Hán tự", "Luyện nghe", "Luyện viết"],
    gradient: "from-yellow-500 to-red-500",
    path: "/ai-chat/hsk"
  }
];

const AIChat = () => {
  const [isPremium, setIsPremium] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      
      if (user) {
        const { data: sub } = await supabase
          .from('user_subscriptions')
          .select('plan')
          .eq('user_id', user.id)
          .maybeSingle();
        setIsPremium(sub?.plan === 'premium' || sub?.plan === 'plus');
      }
    };
    checkAuth();
  }, []);

  const handleAgentClick = (agent: typeof AI_AGENTS[0]) => {
    if (!agent.available) return;
    navigate(agent.path);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />
      
      <main className="flex-1 pt-20 pb-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              LUKATO AI Agent
              <Badge variant="secondary" className="text-xs bg-korean-green/20 text-korean-green border-0">
                RAG
              </Badge>
            </div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-korean-blue to-korean-green bg-clip-text text-transparent">
              Trợ lý học ngôn ngữ AI 🤖
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Chọn Agent phù hợp với ngôn ngữ bạn đang học. AI sẽ giải đáp mọi thắc mắc của bạn! ✨
            </p>

            {/* Premium badge */}
            {isPremium && (
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-korean-yellow/10 text-korean-yellow text-sm font-medium">
                <Crown className="w-4 h-4" />
                Premium - Không giới hạn câu hỏi
              </div>
            )}
          </motion.div>

          {/* Agent Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AI_AGENTS.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`h-full overflow-hidden transition-all duration-300 group ${
                    agent.available 
                      ? "cursor-pointer hover:shadow-xl hover:border-primary/50 hover:-translate-y-1" 
                      : "opacity-60 cursor-not-allowed"
                  }`}
                  onClick={() => handleAgentClick(agent)}
                >
                  {/* Gradient Header */}
                  <div className={`h-2 bg-gradient-to-r ${agent.gradient}`} />
                  
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${agent.gradient} flex items-center justify-center shadow-lg`}>
                        <agent.icon className="w-7 h-7 text-white" />
                      </div>
                      
                      {!agent.available && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Lock className="w-3 h-3" />
                          Sắp ra mắt
                        </Badge>
                      )}
                      
                      {agent.available && (
                        <Badge className="bg-korean-green/20 text-korean-green border-0 text-xs">
                          <Zap className="w-3 h-3 mr-1" />
                          Hoạt động
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-xl font-bold mb-1">{agent.title}</h3>
                    <p className="text-sm text-primary font-medium mb-3">{agent.subtitle}</p>
                    <p className="text-muted-foreground text-sm mb-4">{agent.description}</p>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {agent.features.map((feature, i) => (
                        <span 
                          key={i}
                          className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <Button 
                      className={`w-full gap-2 ${agent.available ? "" : "opacity-50"}`}
                      disabled={!agent.available}
                      variant={agent.available ? "default" : "outline"}
                    >
                      {agent.available ? (
                        <>
                          <MessageSquare className="w-4 h-4" />
                          Bắt đầu trò chuyện
                          <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          Sắp ra mắt
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Info Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-12 text-center"
          >
            <Card className="max-w-2xl mx-auto bg-muted/30 border-dashed">
              <CardContent className="p-6">
                <Bot className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">LUKATO RAG AI là gì? 🧠</h3>
                <p className="text-sm text-muted-foreground">
                  Hệ thống AI thông minh sử dụng công nghệ RAG (Retrieval-Augmented Generation) để cung cấp câu trả lời chính xác dựa trên cơ sở dữ liệu kiến thức ngôn ngữ chuyên sâu. Mỗi Agent được tối ưu hóa cho từng ngôn ngữ cụ thể! 🎯
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <CommonFooter />
    </div>
  );
};

export default AIChat;
