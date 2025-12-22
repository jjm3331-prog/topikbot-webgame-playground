import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ChevronLeft, 
  Smartphone, 
  Download, 
  Share, 
  MoreVertical,
  Plus,
  Check,
  Apple,
  Chrome
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppFooter from "@/components/AppFooter";

const PWAGuide = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const androidSteps = [
    {
      icon: Chrome,
      title: "Mở trình duyệt Chrome",
      desc: "Truy cập game.lukato.kr bằng trình duyệt Chrome.",
      image: "🌐"
    },
    {
      icon: MoreVertical,
      title: "Nhấn nút menu",
      desc: "Nhấn vào nút ba chấm (⋮) ở góc trên bên phải.",
      image: "⋮"
    },
    {
      icon: Download,
      title: "Chọn 'Cài đặt ứng dụng'",
      desc: "Chọn 'Cài đặt ứng dụng' hoặc 'Thêm vào màn hình chính'.",
      image: "📲"
    },
    {
      icon: Check,
      title: "Xác nhận cài đặt",
      desc: "Nhấn nút 'Cài đặt' trong popup để hoàn tất!",
      image: "✅"
    }
  ];

  const iosSteps = [
    {
      icon: Apple,
      title: "Mở trình duyệt Safari",
      desc: "Truy cập game.lukato.kr bằng Safari. (Chrome không hỗ trợ)",
      image: "🧭"
    },
    {
      icon: Share,
      title: "Nhấn nút Chia sẻ",
      desc: "Nhấn vào nút chia sẻ (□↑) ở cuối màn hình.",
      image: "📤"
    },
    {
      icon: Plus,
      title: "Chọn 'Thêm vào MH chính'",
      desc: "Cuộn xuống và chọn 'Thêm vào Màn hình chính'.",
      image: "➕"
    },
    {
      icon: Check,
      title: "Nhấn nút 'Thêm'",
      desc: "Nhấn 'Thêm' ở góc trên bên phải để hoàn tất!",
      image: "✅"
    }
  ];

  const StepCard = ({ step, index, isActive }: { step: typeof androidSteps[0], index: number, isActive: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`p-4 rounded-xl border transition-all ${
        isActive 
          ? "bg-gradient-to-r from-neon-pink/20 to-neon-purple/20 border-neon-pink/40" 
          : "bg-white/5 border-white/10"
      }`}
      onClick={() => setCurrentStep(index)}
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0 ${
          isActive ? "bg-gradient-to-br from-neon-pink to-neon-purple" : "bg-white/10"
        }`}>
          {step.image}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              isActive ? "bg-neon-cyan text-black" : "bg-white/20 text-white"
            }`}>
              {index + 1}
            </span>
            <h3 className="text-white font-bold text-sm truncate">{step.title}</h3>
          </div>
          <p className="text-white/80 text-xs leading-relaxed">{step.desc}</p>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f23] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#1a1a2e]/95 border-b border-white/10 safe-area-top">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white/70" />
          </button>
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-neon-cyan" />
            <span className="text-white font-bold">Hướng dẫn cài đặt</span>
          </div>
          <div className="w-8" />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-6"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center shadow-lg shadow-neon-pink/30">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            Cài đặt Game LUKATO
          </h1>
          <p className="text-purple-300/80 text-sm mt-2">
            Thêm vào màn hình chính để sử dụng như ứng dụng thực thụ!
          </p>
        </motion.div>

        {/* Benefits */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
            <span className="text-2xl">⚡</span>
            <p className="text-white/80 text-[10px] mt-1">Khởi động nhanh</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
            <span className="text-2xl">📴</span>
            <p className="text-white/80 text-[10px] mt-1">Dùng offline</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
            <span className="text-2xl">🔔</span>
            <p className="text-white/80 text-[10px] mt-1">Nhận thông báo</p>
          </div>
        </div>

        {/* Platform Tabs */}
        <Tabs defaultValue="android" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/5 rounded-xl p-1 mb-4">
            <TabsTrigger 
              value="android" 
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white text-white/60"
            >
              <span className="mr-2">🤖</span>
              Android
            </TabsTrigger>
            <TabsTrigger 
              value="ios"
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-600 data-[state=active]:to-gray-500 data-[state=active]:text-white text-white/60"
            >
              <Apple className="w-4 h-4 mr-2" />
              iOS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="android" className="space-y-3">
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-4">
              <p className="text-green-400 text-xs font-medium">💡 Hãy sử dụng trình duyệt Chrome!</p>
            </div>
            {androidSteps.map((step, index) => (
              <StepCard key={index} step={step} index={index} isActive={currentStep === index} />
            ))}
          </TabsContent>

          <TabsContent value="ios" className="space-y-3">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 mb-4">
              <p className="text-blue-400 text-xs font-medium">⚠️ Chỉ hoạt động với trình duyệt Safari!</p>
            </div>
            {iosSteps.map((step, index) => (
              <StepCard key={index} step={step} index={index} isActive={currentStep === index} />
            ))}
          </TabsContent>
        </Tabs>

        {/* FAQ */}
        <div className="mt-6 space-y-3">
          <h3 className="text-white font-bold text-sm">❓ Câu hỏi thường gặp</h3>
          
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="text-white/80 text-xs font-medium mb-1">Không thấy nút cài đặt?</p>
            <p className="text-purple-300/60 text-[10px] mt-2">
              → Có thể ứng dụng đã được cài đặt hoặc trình duyệt không hỗ trợ. Vui lòng sử dụng Chrome (Android) hoặc Safari (iOS).
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="text-white/80 text-xs font-medium mb-1">Muốn gỡ cài đặt ứng dụng?</p>
            <p className="text-purple-300/60 text-[10px] mt-2">
              → Giống như ứng dụng thông thường, bạn có thể nhấn giữ biểu tượng trên màn hình chính và chọn xóa.
            </p>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
};

export default PWAGuide;
