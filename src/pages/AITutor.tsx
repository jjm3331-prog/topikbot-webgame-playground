import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  MessageCircle, 
  ExternalLink, 
  Sparkles, 
  Clock, 
  Globe, 
  BookOpen,
  Users,
  CheckCircle,
  ArrowRight,
  Zap,
  Brain,
  Headphones
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import CleanHeader from "@/components/CleanHeader";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const LUKATO_AI_CHAT_URL = "https://chat-topikbot.kr";

const features = [
  {
    icon: MessageCircle,
    title: "Hỏi đáp không giới hạn",
    description: "Hỏi bất kỳ câu hỏi nào về kiến thức TOPIK, HSA, TSA, API. AI sẽ giải đáp chi tiết và dễ hiểu."
  },
  {
    icon: Clock,
    title: "Hỗ trợ 24/7",
    description: "Chatbot AI hoạt động liên tục, sẵn sàng AI trả lời bất cứ lúc nào."
  },
  {
    icon: BookOpen,
    title: "Đa dạng môn học",
    description: "Toán Lý, Hóa, Sinh, Anh, Địa, Lịch sử, Ngữ văn - tất cả trong một nền tảng duy nhất."
  },
  {
    icon: Sparkles,
    title: "AI tiên tiến nhất",
    description: "Sử dụng công nghệ Compound AI với Chatbot Chuyên gia đầu tiên Việt Nam."
  }
];

const aiModels = [
  {
    name: "All About THPTQG",
    subtitle: "Mô hình tổng hợp",
    description: "Giải đáp mọi câu hỏi THPT từ Toán, Lý, Hóa, Sinh, Anh, Sử, Địa.",
    icon: "🇻🇳"
  },
  {
    name: "ĐGNL & ĐGTD",
    subtitle: "AI Chuyên gia",
    description: "AI Chuyên gia cho TSA ĐGNL, Đ.TĐ, APT-O, ĐGTD TSA-HQ.",
    icon: "⭐"
  },
  {
    name: "THPT for Math",
    subtitle: "Chuyên Toán",
    description: "Công thức và giải thuật Toán cấp 3.",
    icon: "📐"
  },
  {
    name: "THPT for English",
    subtitle: "Chuyên Anh",
    description: "Từ vựng, ngữ pháp tiếng Anh.",
    icon: "🇬🇧"
  }
];

const steps = [
  {
    number: 1,
    title: "Đăng nhập / Đăng ký",
    description: "Truy cập LUKATO AI Chat và đăng nhập bằng Google hoặc đăng ký tài khoản mới.",
    highlight: "Hội viên LUKATO (Basic/Premium) sẽ được cấp quyền truy cập ngay sau khi đăng nhập."
  },
  {
    number: 2,
    title: "Chọn mô hình AI",
    description: "Click vào tên mô hình ở góc trái trên để xem danh sách các mô hình AI. Chọn mô hình phù hợp với môn học bạn cần.",
    highlight: "Click \"Thử tìm mô hình\" để lưu mô hình yêu thích vào bên."
  },
  {
    number: 3,
    title: "Cài đặt cá nhân",
    description: "Click vào avatar góc phải trên → Cài đặt để tùy chỉnh ngôn ngữ, giao diện và các tùy chọn khác.",
    highlight: "Giao diện giống như ChatGPT, dễ sử dụng!"
  },
  {
    number: 4,
    title: "Bắt đầu hỏi đáp",
    description: "Viết câu hỏi về bất kỳ kiến thức nào. AI sẽ giải đáp chi tiết như một thầy giáo riêng!",
    highlight: "Hỗ trợ gọng nói và upload file."
  }
];

const notices = [
  "Quyền truy cập AI được cấp ngay lập tức sau khi nâng cấp thành công.",
  "Đăng nhập bằng cùng email Có đăng ký tại LUKATO để nộc nhật.",
  "Các mô hình AI sẽ tự động hiển thị sau khi được cấp quyền.",
  "Sử dụng giống ChatGPT/Gemini - đặt câu hỏi và nhận trả lời chi tiết!"
];

const AITutor = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkAuth();
  }, []);

  const handleOpenChat = () => {
    window.open(LUKATO_AI_CHAT_URL, "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      <CleanHeader isLoggedIn={!!user} username={user?.email?.split('@')[0]} />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-16 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <MessageCircle className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">AI Chat - Hỏi đáp thông minh</span>
                <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-korean-orange to-korean-pink text-white rounded-full">
                  Basic & Premium
                </span>
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground">
                LUKATO AI Chat
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Hệ thống AI thầy giáo thông minh nhất Việt Nam. Hỏi đáp 24/7 cho tất cả môn học THPT Quốc gia, HSA, TSA, API.
              </p>

              {/* CTA Button */}
              <div className="flex flex-col items-center gap-4">
                <Button
                  onClick={handleOpenChat}
                  size="lg"
                  className="bg-gradient-to-r from-korean-orange to-korean-pink hover:from-korean-orange/90 hover:to-korean-pink/90 text-white font-bold px-8 py-6 text-lg rounded-xl shadow-lg"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Mở LUKATO AI Chat
                  <ExternalLink className="w-5 h-5 ml-2" />
                </Button>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-korean-green" />
                  Hỗ trợ toàn bộ tại chat-topikbot.kr
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* How to Use Section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-primary mb-4">
                Hướng dẫn sử dụng chi tiết
              </h2>
              <p className="text-muted-foreground">
                Làm theo 4 bước đơn giản để bắt đầu
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {steps.map((step, index) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-6 h-full bg-card border-border hover:border-primary/30 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-lg font-bold text-primary">{step.number}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                        <p className="text-muted-foreground text-sm mb-3">{step.description}</p>
                        <div className="flex items-center gap-2 text-xs text-primary">
                          <Zap className="w-3 h-3" />
                          <span>{step.highlight}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Models Section */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-4">
                Các mô hình AI chuyên biệt
              </h2>
              <p className="text-muted-foreground">
                LUKATO AI cung cấp nhiều mô hình AI chuyên biệt cho từng môn học
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {aiModels.map((model, index) => (
                <motion.div
                  key={model.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-4 h-full bg-card border-border hover:border-primary/30 transition-all hover:shadow-md">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{model.icon}</span>
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">{model.name}</h3>
                        <p className="text-xs text-muted-foreground">{model.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{model.description}</p>
                  </Card>
                </motion.div>
              ))}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              💡 Sau khi được cấp quyền, bạn có thể chọn tất kỳ mô hình nào!
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-4">
                Tính năng nổi bật
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-6 h-full bg-gradient-to-b from-primary/5 to-transparent border-primary/10 hover:border-primary/30 transition-colors text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Important Notices */}
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="p-6 bg-muted/50 border-border">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Lưu ý quan trọng cho hội viên</h3>
              </div>
              <ul className="space-y-2">
                {notices.map((notice, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-korean-green shrink-0 mt-0.5" />
                    <span>{notice}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="p-8 bg-gradient-to-r from-primary/10 via-korean-purple/10 to-korean-pink/10 border-primary/20 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Brain className="w-6 h-6 text-primary" />
                <Sparkles className="w-5 h-5 text-korean-yellow" />
              </div>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-3">
                Sẵn sàng học tập cùng AI?
              </h2>
              <p className="text-muted-foreground mb-6">
                LUKATO AI Chat giúp bạn giải đáp mọi thắc mắc và chinh phục kỳ thi!
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  onClick={handleOpenChat}
                  size="lg"
                  className="bg-gradient-to-r from-korean-orange to-korean-pink hover:from-korean-orange/90 hover:to-korean-pink/90 text-white font-bold"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Mở LUKATO AI Chat
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate("/pricing")}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Làm bài tập
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AITutor;
