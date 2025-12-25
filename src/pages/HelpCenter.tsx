import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Headphones, ExternalLink, MessageCircle, Clock, HelpCircle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import zaloQr from "@/assets/zalo-qr.jpg";

const HelpCenter = () => {
  const navigate = useNavigate();
  const zaloLink = "https://zalo.me/g/mogvgb538";

  const helpItems = [
    "Hướng dẫn sử dụng ứng dụng",
    "Hỗ trợ thanh toán & nâng cấp tài khoản",
    "Báo lỗi & góp ý cải tiến",
    "Giải đáp thắc mắc về nội dung học tập",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-heading font-bold text-lg">Trung tâm Hỗ trợ</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Headphones className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Trung tâm Hỗ trợ</h2>
          <p className="text-muted-foreground">Liên hệ với đội ngũ hỗ trợ qua Zalo</p>
        </motion.div>

        {/* QR Code Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card overflow-hidden"
        >
          <div className="p-6 flex flex-col items-center">
            <img 
              src={zaloQr} 
              alt="LUKATO AI Help Center QR Code" 
              className="w-80 h-80 sm:w-96 sm:h-96 md:w-[28rem] md:h-[28rem] object-contain rounded-xl"
            />
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Quét mã QR hoặc nhấn nút bên dưới để tham gia nhóm hỗ trợ
            </p>
          </div>

          {/* Zalo Button */}
          <div className="px-6 pb-6">
            <Button 
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-6 text-base font-semibold"
              onClick={() => window.open(zaloLink, "_blank")}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Mở Zalo Hỗ trợ
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </motion.div>

        {/* Support Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Hỗ trợ trực tiếp
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Nhóm Zalo hỗ trợ hoạt động từ{" "}
                <span className="text-primary font-medium">8:00 - 22:00</span>{" "}
                hàng ngày
              </p>
            </div>
          </div>
        </motion.div>

        {/* Help Topics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                Chúng tôi có thể giúp gì?
              </h3>
              <ul className="mt-3 space-y-2">
                {helpItems.map((item, index) => (
                  <li 
                    key={index}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="text-center pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground">
            © 2025 LUKATO AI. Ôn thi thông minh với AI.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Nền tảng học tập AI cho kỳ thi TOPIK Việt Nam
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
