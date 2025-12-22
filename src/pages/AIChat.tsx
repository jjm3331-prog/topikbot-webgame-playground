import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { 
  ExternalLink, 
  MessageSquare, 
  Brain, 
  Zap, 
  Clock, 
  BookOpen,
  Shield,
  Database,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Globe,
  Users,
  GraduationCap
} from "lucide-react";

const AIChat = () => {
  const handleOpenChat = () => {
    window.open("https://chat-topikbot.kr", "_blank");
  };

  const steps = [
    {
      number: 1,
      title: "Truy cập",
      description: "Truy cập Q&A Agent và đăng nhập bằng Google hoặc email.",
      tip: "Đăng nhập bằng email giống với tài khoản LUKATO để đồng bộ!"
    },
    {
      number: 2,
      title: "Chọn mô hình AI",
      description: "Chọn mô hình AI phù hợp nhất với mục đích học tập của bạn.",
      tip: "Q&A Agent được cấu thành từ nhiều mô hình AI hiệu suất cao nhất."
    },
    {
      number: 3,
      title: "Đặt câu hỏi",
      description: "Hỏi bất cứ điều gì về ngữ pháp, từ vựng, chiến lược thi.",
      tip: "Câu hỏi càng cụ thể, câu trả lời càng chính xác."
    },
    {
      number: 4,
      title: "Học tập",
      description: "Học sâu hơn với giải thích chi tiết và ví dụ từ AI.",
      tip: "Nếu không hiểu, hãy yêu cầu 'Giải thích đơn giản hơn'!"
    }
  ];

  const features = [
    {
      icon: Database,
      title: "Hệ thống RAG chuyên nghiệp",
      description: "Dựa trên cơ sở dữ liệu khổng lồ: đề thi TOPIK, sách ngữ pháp, giáo trình"
    },
    {
      icon: Brain,
      title: "LUKATO RAG AI",
      description: "Mô hình AI độc quyền được tối ưu hóa riêng cho việc học TOPIK"
    },
    {
      icon: Zap,
      title: "Phản hồi thời gian thực",
      description: "Trả lời nhanh trong vòng 2 giây, duy trì nhịp học tập"
    },
    {
      icon: Clock,
      title: "Hoạt động 24/7",
      description: "Hỏi bất cứ lúc nào, kể cả lúc nửa đêm hay trước kỳ thi"
    },
    {
      icon: BookOpen,
      title: "Giải thích theo trình độ",
      description: "Điều chỉnh độ khó phù hợp với trình độ của người học"
    },
    {
      icon: Shield,
      title: "Thông tin chính xác",
      description: "Dựa trên tài liệu TOPIK đã được xác minh, giảm thiểu sai sót"
    }
  ];

  const whyExternal = [
    {
      icon: Globe,
      title: "Hạ tầng chuyên dụng",
      description: "Server được tối ưu riêng cho Q&A, đảm bảo phản hồi ổn định và nhanh chóng."
    },
    {
      icon: Database,
      title: "Cơ sở tri thức khổng lồ",
      description: "Vận hành database TOPIK riêng biệt để cung cấp câu trả lời chính xác hơn."
    },
    {
      icon: Users,
      title: "Hệ sinh thái học tập tích hợp",
      description: "Học vui qua game, thắc mắc hỏi AI - chu trình học tập hoàn hảo!"
    },
    {
      icon: GraduationCap,
      title: "Chuyên biệt cho TOPIK",
      description: "Khác với ChatGPT thông thường, hệ thống RAG được thiết kế riêng cho kỳ thi TOPIK."
    }
  ];

  const notices = [
    "chat-topikbot.kr là dịch vụ Q&A AI chính thức của LUKATO",
    "Đăng nhập cùng email để đồng bộ lịch sử học tập",
    "Thành viên miễn phí được hỏi một số lượng câu hỏi nhất định mỗi ngày",
    "Thành viên Premium được hỏi không giới hạn và sử dụng các mô hình AI cao cấp"
  ];

  return (
    <div className="min-h-screen bg-background">
      <CleanHeader />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <MessageSquare className="w-4 h-4" />
              Q&A Agent - Dịch vụ hỏi đáp
              <span className="px-2 py-0.5 rounded-full bg-korean-green/20 text-korean-green text-xs">
                RAG
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-primary">LUKATO</span>{" "}
              <span className="bg-gradient-to-r from-korean-blue to-korean-green bg-clip-text text-transparent">
                Q&A Agent
              </span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Bạn có thắc mắc trong quá trình học TOPIK?<br />
              <strong className="text-foreground">Hãy hỏi trực tiếp các mô hình Premium với LUKATO Q&A Agent hiệu suất cao nhất!</strong>
            </p>
            
            <Button 
              size="lg" 
              onClick={handleOpenChat}
              className="bg-gradient-to-r from-korean-blue to-korean-green hover:opacity-90 text-white gap-2 px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              <Sparkles className="w-5 h-5" />
              Q&A Agent bắt đầu
              <ExternalLink className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Why External Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Tại sao cung cấp dịch vụ như một Agent độc lập?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Để mang lại trải nghiệm học tập tốt hơn, chúng tôi vận hành dịch vụ Q&A Agent chuyên biệt
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {whyExternal.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full border-border/50 bg-card/50 backdrop-blur hover:border-primary/30 transition-all">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Cách sử dụng
            </h2>
            <p className="text-muted-foreground">
              Bắt đầu đơn giản chỉ với 4 bước
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto space-y-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden border-border/50 hover:border-primary/30 transition-all">
                  <CardContent className="p-6">
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-korean-blue to-korean-green flex items-center justify-center shrink-0">
                        <span className="text-white font-bold">{step.number}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                        <p className="text-muted-foreground mb-3">{step.description}</p>
                        <div className="flex items-center gap-2 text-sm text-korean-green">
                          <Sparkles className="w-4 h-4" />
                          <span>{step.tip}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Tính năng chính
            </h2>
            <p className="text-muted-foreground">
              Những tính năng đặc biệt chỉ có ở Q&A Agent
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 transition-all group">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-korean-blue/20 to-korean-green/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Notice Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Lưu ý</h3>
                </div>
                <ul className="space-y-3">
                  {notices.map((notice, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-korean-green shrink-0 mt-0.5" />
                      <span>{notice}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-korean-blue to-korean-green flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Hãy hỏi AI ngay bây giờ!
            </h2>
            <p className="text-muted-foreground mb-8">
              Học vui qua game, thắc mắc hỏi AI!<br />
              Người bạn đồng hành hoàn hảo trong hành trình chinh phục TOPIK.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={handleOpenChat}
                className="bg-gradient-to-r from-korean-blue to-korean-green hover:opacity-90 text-white gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Mở Q&A Agent
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => window.location.href = "/dashboard"}
                className="gap-2"
              >
                <BookOpen className="w-5 h-5" />
                Học qua game
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <AppFooter />
    </div>
  );
};

export default AIChat;
