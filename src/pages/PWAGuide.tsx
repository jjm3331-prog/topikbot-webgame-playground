import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Smartphone, 
  Download, 
  Share, 
  MoreVertical,
  Plus,
  Check,
  Zap,
  WifiOff,
  Bell,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import AppFooter from "@/components/AppFooter";

const PWAGuide = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("android");

  const benefits = [
    { icon: Zap, label: "Khởi động nhanh", color: "text-korean-yellow" },
    { icon: WifiOff, label: "Dùng offline", color: "text-korean-cyan" },
    { icon: Bell, label: "Nhận thông báo", color: "text-korean-orange" },
  ];

  const androidSteps = [
    {
      step: 1,
      title: "Mở Chrome",
      desc: "Truy cập game.lukato.kr bằng Chrome",
      icon: "🌐",
    },
    {
      step: 2,
      title: "Nhấn menu ⋮",
      desc: "Góc trên bên phải màn hình",
      icon: "⋮",
    },
    {
      step: 3,
      title: "Cài đặt ứng dụng",
      desc: "Chọn 'Add to Home screen'",
      icon: "📲",
    },
    {
      step: 4,
      title: "Hoàn tất",
      desc: "Nhấn 'Install' để xác nhận",
      icon: "✅",
    },
  ];

  const iosSteps = [
    {
      step: 1,
      title: "Mở Safari",
      desc: "Bắt buộc dùng Safari trên iOS",
      icon: "🧭",
    },
    {
      step: 2,
      title: "Nhấn Share",
      desc: "Nút chia sẻ (□↑) ở dưới",
      icon: "📤",
    },
    {
      step: 3,
      title: "Add to Home",
      desc: "Cuộn và chọn 'Add to Home Screen'",
      icon: "➕",
    },
    {
      step: 4,
      title: "Hoàn tất",
      desc: "Nhấn 'Add' góc trên phải",
      icon: "✅",
    },
  ];

  const faqs = [
    {
      question: "Không thấy nút cài đặt?",
      answer: "Có thể ứng dụng đã được cài đặt hoặc trình duyệt không hỗ trợ. Vui lòng sử dụng Chrome (Android) hoặc Safari (iOS).",
    },
    {
      question: "Muốn gỡ cài đặt?",
      answer: "Nhấn giữ biểu tượng app trên màn hình chính và chọn xóa/gỡ cài đặt như ứng dụng thông thường.",
    },
  ];

  const steps = activeTab === "android" ? androidSteps : iosSteps;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Minimal Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 h-14">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <span className="font-semibold text-foreground">Cài đặt App</span>
          <div className="w-9" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* Hero */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-korean-pink to-korean-purple flex items-center justify-center shadow-xl shadow-korean-purple/30">
              <Smartphone className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Cài đặt LUKATO
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Thêm vào màn hình chính để trải nghiệm như app thực thụ
            </p>
          </motion.div>

          {/* Benefits */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3"
          >
            {benefits.map((benefit, idx) => (
              <div 
                key={idx}
                className="glass-card p-4 rounded-xl text-center"
              >
                <benefit.icon className={`w-6 h-6 mx-auto mb-2 ${benefit.color}`} />
                <p className="text-xs sm:text-sm text-foreground font-medium">{benefit.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Platform Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/50 rounded-xl">
                <TabsTrigger 
                  value="android" 
                  className="rounded-lg text-sm font-medium data-[state=active]:bg-korean-green data-[state=active]:text-white transition-all"
                >
                  <span className="mr-2">🤖</span>
                  Android
                </TabsTrigger>
                <TabsTrigger 
                  value="ios"
                  className="rounded-lg text-sm font-medium data-[state=active]:bg-foreground data-[state=active]:text-background transition-all"
                >
                  <span className="mr-2"></span>
                  iOS
                </TabsTrigger>
              </TabsList>

              <TabsContent value="android" className="mt-4">
                <div className="bg-korean-green/10 border border-korean-green/30 rounded-xl px-4 py-3 mb-4">
                  <p className="text-korean-green text-sm font-medium flex items-center gap-2">
                    💡 Sử dụng trình duyệt Chrome
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="ios" className="mt-4">
                <div className="bg-korean-blue/10 border border-korean-blue/30 rounded-xl px-4 py-3 mb-4">
                  <p className="text-korean-blue text-sm font-medium flex items-center gap-2">
                    ⚠️ Bắt buộc sử dụng Safari
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Steps */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            {steps.map((item, idx) => (
              <motion.div
                key={`${activeTab}-${idx}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border hover:border-primary/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {item.step}
                    </span>
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* FAQ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-korean-orange" />
              Câu hỏi thường gặp
            </h2>
            <Accordion type="single" collapsible className="space-y-2">
              {faqs.map((faq, idx) => (
                <AccordionItem 
                  key={idx} 
                  value={`faq-${idx}`}
                  className="border border-border rounded-xl px-4 bg-muted/20"
                >
                  <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-4">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center pt-4"
          >
            <Button
              onClick={() => navigate("/dashboard")}
              size="lg"
              className="bg-gradient-to-r from-korean-pink to-korean-purple hover:opacity-90 text-white px-8"
            >
              Quay lại Dashboard
            </Button>
          </motion.div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default PWAGuide;
