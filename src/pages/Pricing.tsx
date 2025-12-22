import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Zap, 
  Crown, 
  Check, 
  X, 
  CreditCard, 
  Shield, 
  ChevronRight,
  Sparkles,
  BookOpen,
  Gamepad2,
  PenTool,
  Briefcase,
  TrendingUp,
  FileX,
  Users,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import CleanHeader from "@/components/CleanHeader";
import CommonFooter from "@/components/CommonFooter";
import { supabase } from "@/integrations/supabase/client";

type BillingPeriod = "1-month" | "6-months" | "12-months";

const comparisonFeatures = [
  { 
    icon: Gamepad2, 
    name: "Game học TOPIK (tất cả)", 
    free: true, 
    premium: true,
    description: "8 game học tiếng Hàn"
  },
  { 
    icon: BookOpen, 
    name: "TOPIK I & II học tập", 
    free: true, 
    premium: true,
    description: "Bài học theo cấp độ"
  },
  { 
    icon: Sparkles, 
    name: "Xếp hạng & Nhận quà", 
    free: true, 
    premium: true,
    description: "Đổi quà qua Zalo"
  },
  { 
    icon: Briefcase, 
    name: "Tìm việc tại Hàn Quốc", 
    free: false, 
    premium: true,
    description: "Thông tin việc làm & du học"
  },
  { 
    icon: Users, 
    name: "Headhunting 1:1", 
    free: false, 
    premium: true,
    description: "Tư vấn việc làm cá nhân"
  },
  { 
    icon: PenTool, 
    name: "Chấm Writing TOPIK AI", 
    free: false, 
    premium: true,
    description: "AI chấm bài viết chi tiết"
  },
  { 
    icon: TrendingUp, 
    name: "Tiến độ học tập", 
    free: false, 
    premium: true,
    description: "Theo dõi & phân tích"
  },
  { 
    icon: FileX, 
    name: "Sổ lỗi sai", 
    free: false, 
    premium: true,
    description: "Ghi nhớ & ôn tập lỗi"
  },
];

const faqItems = [
  {
    question: "Tôi có thể hủy gói bất cứ lúc nào không?",
    answer: "Có, bạn có thể hủy gói đăng ký bất cứ lúc nào. Sau khi hủy, bạn vẫn có thể sử dụng các tính năng Premium cho đến khi hết thời hạn đã thanh toán."
  },
  {
    question: "Phương thức thanh toán nào được hỗ trợ?",
    answer: "Chúng tôi hỗ trợ thanh toán qua ZaloPay, MoMo, VNPay, và chuyển khoản ngân hàng. Tất cả các giao dịch đều được mã hóa SSL an toàn."
  },
  {
    question: "Premium bao gồm những gì?",
    answer: "Premium bao gồm: Dịch vụ tìm việc tại Hàn Quốc, Headhunting 1:1, AI chấm bài viết TOPIK, theo dõi tiến độ học tập chi tiết, và sổ lỗi sai thông minh."
  },
  {
    question: "Có được hoàn tiền không?",
    answer: "Chúng tôi hoàn tiền 100% trong vòng 7 ngày đầu tiên nếu bạn không hài lòng với dịch vụ. Liên hệ support để được hỗ trợ."
  },
  {
    question: "Học sinh có được giảm giá không?",
    answer: "Có! Học sinh và sinh viên được giảm 20% khi đăng ký gói 6 tháng hoặc 12 tháng. Vui lòng liên hệ support để được hỗ trợ xác minh."
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("1-month");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | undefined>();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsLoggedIn(true);
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", session.user.id)
          .single();
        if (profile) {
          setUsername(profile.username);
        }
      }
    };
    checkAuth();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN").format(price);
  };

  const getPremiumPrice = () => {
    switch (billingPeriod) {
      case "1-month":
        return { price: 299000, perMonth: 299000, savings: 0 };
      case "6-months":
        return { price: 1494000, perMonth: 249000, savings: 300000 };
      case "12-months":
        return { price: 2388000, perMonth: 199000, savings: 1200000 };
    }
  };

  const premiumPrice = getPremiumPrice();

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <CleanHeader isLoggedIn={isLoggedIn} username={username} />

      <main className="flex-1 pt-[76px] pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 pt-6"
          >
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold mb-3">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-korean-green via-korean-cyan to-korean-blue">
                Chọn gói phù hợp
              </span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Bắt đầu miễn phí, nâng cấp khi cần thiết
            </p>
          </motion.div>

          {/* Billing Period Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center mb-8"
          >
            <div className="inline-flex items-center p-1 rounded-full bg-muted border border-border">
              <button
                onClick={() => setBillingPeriod("1-month")}
                className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  billingPeriod === "1-month"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                1 tháng
              </button>
              <button
                onClick={() => setBillingPeriod("6-months")}
                className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all relative ${
                  billingPeriod === "6-months"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                6 tháng
                <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-korean-orange text-white">
                  -20%
                </span>
              </button>
              <button
                onClick={() => setBillingPeriod("12-months")}
                className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all relative ${
                  billingPeriod === "12-months"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                12 tháng
                <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-korean-green text-white">
                  BEST
                </span>
              </button>
            </div>
          </motion.div>

          {/* Pricing Cards - 2 Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12"
          >
            {/* Free Plan */}
            <div className="relative rounded-2xl p-6 border bg-card border-border hover:border-primary/30 transition-all">
              <span className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-muted text-foreground text-xs font-bold border border-border">
                Miễn phí
              </span>

              <div className="flex justify-center mb-4 pt-4">
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                  <Zap className="w-7 h-7 text-muted-foreground" />
                </div>
              </div>

              <h3 className="text-center text-xl font-bold text-foreground mb-2">
                Free
              </h3>

              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-foreground">
                  0đ
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Miễn phí mãi mãi
                </p>
              </div>

              <ul className="space-y-3 mb-6">
                {[
                  "Game học TOPIK (tất cả)",
                  "Xếp hạng & tích điểm",
                  "Đổi quà qua Zalo",
                  "TOPIK I & II học tập",
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check className="w-4 h-4 shrink-0 mt-0.5 text-korean-green" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => navigate(isLoggedIn ? "/dashboard" : "/auth")}
                variant="outline"
                className="w-full"
              >
                {isLoggedIn ? "Đang sử dụng" : "Bắt đầu miễn phí"}
              </Button>
            </div>

            {/* Premium Plan */}
            <div className="relative rounded-2xl p-6 border bg-gradient-to-b from-korean-green/10 to-background border-korean-green/50 shadow-lg shadow-korean-green/10">
              <span className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-korean-orange text-white text-xs font-bold">
                Phổ biến nhất
              </span>

              <div className="flex justify-center mb-4 pt-4">
                <div className="w-14 h-14 rounded-xl bg-korean-green/20 flex items-center justify-center">
                  <Crown className="w-7 h-7 text-korean-green" />
                </div>
              </div>

              <h3 className="text-center text-xl font-bold text-foreground mb-2">
                Premium
              </h3>

              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-korean-green">
                  {formatPrice(premiumPrice.price)}đ
                </div>
                {billingPeriod !== "1-month" && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ~{formatPrice(premiumPrice.perMonth)}đ/tháng
                  </p>
                )}
                {premiumPrice.savings > 0 && (
                  <p className="text-sm text-korean-green mt-1">
                    Tiết kiệm {formatPrice(premiumPrice.savings)}đ
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {[
                  "✅ Tất cả tính năng Miễn phí",
                  "🏢 Tìm việc tại Hàn Quốc",
                  "👔 Headhunting 1:1",
                  "✍️ Chấm Writing TOPIK AI",
                  "📊 Tiến độ học tập chi tiết",
                  "📝 Sổ lỗi sai thông minh",
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check className="w-4 h-4 shrink-0 mt-0.5 text-korean-green" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => navigate("/auth")}
                className="w-full bg-korean-green hover:bg-korean-green/90 text-white"
              >
                Nâng cấp Premium
              </Button>
            </div>
          </motion.div>

          {/* Feature Comparison Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-12"
          >
            <h2 className="text-xl font-bold text-center text-foreground mb-6">
              So sánh chi tiết
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full max-w-2xl mx-auto">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">
                      Tính năng
                    </th>
                    <th className="text-center py-3 px-3 text-sm font-medium text-muted-foreground w-24">
                      Free
                    </th>
                    <th className="text-center py-3 px-3 text-sm font-medium text-korean-green w-24">
                      Premium
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feature) => (
                    <tr key={feature.name} className="border-b border-border/50">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <feature.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div>
                            <span className="text-sm text-foreground block">{feature.name}</span>
                            <span className="text-xs text-muted-foreground hidden sm:block">{feature.description}</span>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-3 px-3">
                        {feature.free ? (
                          <Check className="w-5 h-5 text-korean-green mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground/50 mx-auto" />
                        )}
                      </td>
                      <td className="text-center py-3 px-3">
                        {feature.premium ? (
                          <Check className="w-5 h-5 text-korean-green mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground/50 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Payment Process */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-12"
          >
            <h2 className="text-xl font-bold text-center text-foreground mb-2">
              Quy trình thanh toán
            </h2>
            <p className="text-center text-muted-foreground text-sm mb-6">
              Đơn giản, nhanh chóng, an toàn
            </p>

            <div className="grid sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
              {[
                {
                  step: 1,
                  icon: BookOpen,
                  title: "Chọn gói",
                  description: "Chọn gói phù hợp với nhu cầu"
                },
                {
                  step: 2,
                  icon: CreditCard,
                  title: "Thanh toán",
                  description: "ZaloPay, MoMo, chuyển khoản"
                },
                {
                  step: 3,
                  icon: Zap,
                  title: "Kích hoạt",
                  description: "Tự động ngay sau thanh toán"
                }
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="relative inline-block mb-3">
                    <div className="w-14 h-14 rounded-xl bg-muted border border-border flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-foreground" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-korean-cyan text-white text-xs font-bold flex items-center justify-center">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Security Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="max-w-xl mx-auto mb-12"
          >
            <div className="flex items-start gap-3 p-4 rounded-xl bg-korean-green/10 border border-korean-green/20">
              <Shield className="w-5 h-5 text-korean-green shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground text-sm mb-1">
                  Thanh toán an toàn 100%
                </h3>
                <p className="text-xs text-muted-foreground">
                  Mã hóa SSL • Bảo mật PCI-DSS • Hoàn tiền 7 ngày
                </p>
              </div>
            </div>
          </motion.div>

          {/* FAQ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="max-w-2xl mx-auto mb-12"
          >
            <h2 className="text-xl font-bold text-center text-foreground mb-2">
              Câu hỏi thường gặp
            </h2>
            <p className="text-center text-muted-foreground text-sm mb-6">
              Giải đáp thắc mắc về gói dịch vụ
            </p>

            <Accordion type="single" collapsible className="space-y-2">
              {faqItems.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border border-border rounded-xl px-4 data-[state=open]:bg-muted/50"
                >
                  <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-3">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      {item.question}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-3">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-center"
          >
            <p className="text-muted-foreground text-sm mb-4">
              Thanh toán an toàn qua ZaloPay
            </p>
            <div className="flex justify-center">
              <img src="https://zalopay.vn/images/logo.svg" alt="ZaloPay" className="h-8 opacity-70" />
            </div>
          </motion.div>
        </div>
      </main>

      <CommonFooter />
    </div>
  );
};

export default Pricing;