import { useState } from "react";
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
  MessageCircle,
  BookOpen,
  Gamepad2,
  PenTool,
  HelpCircle,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import MegaMenu from "@/components/MegaMenu";
import Footer from "@/components/Footer";

type BillingPeriod = "1-month" | "6-months" | "12-months";

interface PricingPlan {
  name: string;
  icon: React.ElementType;
  prices: Record<BillingPeriod, { price: number; perMonth: number; savings?: number }>;
  features: string[];
  isPopular?: boolean;
  isCurrent?: boolean;
  buttonText: string;
  buttonVariant: "outline" | "default" | "secondary";
}

const pricingPlans: PricingPlan[] = [
  {
    name: "Miễn phí",
    icon: Zap,
    prices: {
      "1-month": { price: 0, perMonth: 0 },
      "6-months": { price: 0, perMonth: 0 },
      "12-months": { price: 0, perMonth: 0 },
    },
    features: [
      "Game học TOPIK cơ bản",
      "Xếp hạng & tích điểm",
      "Đổi quà qua Zalo",
      "Cộng đồng học tập",
    ],
    isCurrent: true,
    buttonText: "Đăng nhập để bắt đầu",
    buttonVariant: "outline",
  },
  {
    name: "Plus",
    icon: Sparkles,
    prices: {
      "1-month": { price: 200000, perMonth: 200000 },
      "6-months": { price: 960000, perMonth: 160000, savings: 240000 },
      "12-months": { price: 1440000, perMonth: 120000, savings: 960000 },
    },
    features: [
      "Tất cả tính năng Miễn phí",
      "Truy cập AI Chat (20 lần/ngày)",
      "Game học nâng cao",
      "Hỗ trợ ưu tiên",
    ],
    buttonText: "Đăng nhập để bắt đầu",
    buttonVariant: "secondary",
  },
  {
    name: "Premium",
    icon: Crown,
    prices: {
      "1-month": { price: 500000, perMonth: 500000 },
      "6-months": { price: 2400000, perMonth: 400000, savings: 600000 },
      "12-months": { price: 3600000, perMonth: 300000, savings: 2400000 },
    },
    features: [
      "Tất cả tính năng Plus",
      "AI Chat không giới hạn",
      "Chấm Writing TOPIK AI",
      "Phân tích câu sai AI",
      "Báo cáo học tập AI",
    ],
    isPopular: true,
    buttonText: "Đăng nhập để bắt đầu",
    buttonVariant: "default",
  },
];

const comparisonFeatures = [
  { 
    icon: BookOpen, 
    name: "Game học TOPIK cơ bản", 
    free: true, 
    plus: true, 
    premium: true 
  },
  { 
    icon: Gamepad2, 
    name: "Game học nâng cao", 
    free: false, 
    plus: true, 
    premium: true 
  },
  { 
    icon: MessageCircle, 
    name: "AI Chat", 
    free: false, 
    plus: true, 
    premium: true 
  },
  { 
    icon: PenTool, 
    name: "Chấm Writing TOPIK AI", 
    free: false, 
    plus: false, 
    premium: true 
  },
  { 
    icon: Sparkles, 
    name: "Xếp hạng & Nhận quà", 
    free: true, 
    plus: true, 
    premium: true 
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
    question: "Gói Premium khác gì với Plus?",
    answer: "Gói Premium bao gồm tất cả tính năng của Plus, cộng thêm AI Chat không giới hạn, chấm Writing TOPIK bằng AI, phân tích câu sai chi tiết, và báo cáo học tập cá nhân hóa."
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN").format(price);
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <MegaMenu />

      <main className="flex-1 pt-20 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-korean-green/20 text-korean-green text-sm font-medium">
                <Zap className="w-4 h-4" />
                5 câu × 30 phút = Thành công!
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium border border-border">
                <Crown className="w-4 h-4" />
                Nâng cấp tài khoản
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold mb-4">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-korean-green via-korean-cyan to-korean-blue">
                Korean Learning
              </span>
              {" "}
              <span className="text-foreground">Super App</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Game học TOPIK • AI Tutor 24/7 • LUKATO AI RAG Agent
            </p>
          </motion.div>

          {/* Billing Period Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center mb-10"
          >
            <div className="inline-flex items-center p-1 rounded-full bg-muted border border-border">
              <button
                onClick={() => setBillingPeriod("1-month")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  billingPeriod === "1-month"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                1 tháng
              </button>
              <button
                onClick={() => setBillingPeriod("6-months")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all relative ${
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
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all relative ${
                  billingPeriod === "12-months"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                12 tháng
                <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-korean-green text-white">
                  BEST DEAL
                </span>
              </button>
            </div>
          </motion.div>

          {/* Pricing Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid md:grid-cols-3 gap-6 mb-16"
          >
            {pricingPlans.map((plan, index) => {
              const priceData = plan.prices[billingPeriod];
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className={`relative rounded-2xl p-6 border transition-all ${
                    plan.isPopular
                      ? "bg-gradient-to-b from-korean-green/10 to-background border-korean-green/50 shadow-lg shadow-korean-green/10"
                      : "bg-card border-border hover:border-primary/30"
                  }`}
                >
                  {/* Labels */}
                  {plan.isCurrent && (
                    <span className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-korean-green text-white text-xs font-bold">
                      Đang dùng
                    </span>
                  )}
                  {plan.isPopular && (
                    <span className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-korean-orange text-white text-xs font-bold">
                      Phổ biến nhất
                    </span>
                  )}

                  {/* Icon */}
                  <div className="flex justify-center mb-4 pt-2">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      plan.isPopular 
                        ? "bg-korean-green/20" 
                        : "bg-muted"
                    }`}>
                      <plan.icon className={`w-6 h-6 ${
                        plan.isPopular ? "text-korean-green" : "text-muted-foreground"
                      }`} />
                    </div>
                  </div>

                  {/* Plan Name */}
                  <h3 className="text-center text-lg font-semibold text-foreground mb-4">
                    {plan.name}
                  </h3>

                  {/* Price */}
                  <div className="text-center mb-6">
                    <div className={`text-3xl sm:text-4xl font-bold ${
                      plan.isPopular ? "text-korean-green" : "text-foreground"
                    }`}>
                      {formatPrice(priceData.price)}đ
                    </div>
                    {billingPeriod !== "1-month" && priceData.perMonth > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        ~{formatPrice(priceData.perMonth)}đ/tháng
                      </p>
                    )}
                    {priceData.savings && priceData.savings > 0 && (
                      <p className="text-sm text-korean-green mt-1">
                        Tiết kiệm {formatPrice(priceData.savings)}đ
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm">
                        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${
                          plan.isPopular ? "text-korean-green" : "text-primary"
                        }`} />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    onClick={() => navigate("/auth")}
                    variant={plan.buttonVariant}
                    className={`w-full ${
                      plan.isPopular 
                        ? "bg-korean-green hover:bg-korean-green/90 text-white border-0" 
                        : ""
                    }`}
                  >
                    {plan.buttonText}
                  </Button>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Feature Comparison Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold text-center text-foreground mb-8">
              So sánh chi tiết
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full max-w-3xl mx-auto">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">
                      Tính năng
                    </th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-muted-foreground">
                      Miễn phí
                    </th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-korean-cyan">
                      Plus
                    </th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-korean-green">
                      Premium
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feature) => (
                    <tr key={feature.name} className="border-b border-border/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <feature.icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{feature.name}</span>
                        </div>
                      </td>
                      <td className="text-center py-4 px-4">
                        {feature.free ? (
                          <Check className="w-5 h-5 text-korean-green mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground/50 mx-auto" />
                        )}
                      </td>
                      <td className="text-center py-4 px-4">
                        {feature.plus ? (
                          <Check className="w-5 h-5 text-korean-cyan mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground/50 mx-auto" />
                        )}
                      </td>
                      <td className="text-center py-4 px-4">
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
            transition={{ delay: 0.5 }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold text-center text-foreground mb-3">
              Quy trình thanh toán
            </h2>
            <p className="text-center text-muted-foreground mb-8">
              Đơn giản, nhanh chóng, an toàn
            </p>

            <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              {[
                {
                  step: 1,
                  icon: BookOpen,
                  title: "Chọn gói phù hợp",
                  description: "So sánh các gói và chọn gói phù hợp với nhu cầu học tập."
                },
                {
                  step: 2,
                  icon: CreditCard,
                  title: "Thanh toán qua ZaloPay",
                  description: "Thanh toán nhanh chóng, an toàn. Không cần thẻ tín dụng."
                },
                {
                  step: 3,
                  icon: Zap,
                  title: "Kích hoạt tự động",
                  description: "Tài khoản được nâng cấp ngay sau khi thanh toán."
                }
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="relative inline-block mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center">
                      <item.icon className="w-7 h-7 text-foreground" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-korean-cyan text-white text-xs font-bold flex items-center justify-center">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Security Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-16"
          >
            <div className="max-w-2xl mx-auto bg-muted/50 rounded-2xl p-6 border border-border">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-korean-green/20 flex items-center justify-center shrink-0">
                  <Shield className="w-6 h-6 text-korean-green" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Thanh toán an toàn 100%
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Mọi giao dịch được xử lý qua ZaloPay - nền tảng thanh toán được bảo mật cao nhất tại Việt Nam.
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-korean-green" />
                      Mã hóa SSL
                    </span>
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-korean-green" />
                      Bảo mật PCI-DSS
                    </span>
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-korean-green" />
                      Hoàn tiền 7 ngày
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold text-center text-foreground mb-3">
              Câu hỏi thường gặp
            </h2>
            <p className="text-center text-muted-foreground mb-8">
              Giải đáp thắc mắc về gói dịch vụ và thanh toán
            </p>

            <div className="max-w-2xl mx-auto">
              <Accordion type="single" collapsible className="space-y-3">
                {faqItems.map((item, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="bg-muted/50 rounded-xl border border-border px-4"
                  >
                    <AccordionTrigger className="text-left text-foreground hover:no-underline py-4">
                      <div className="flex items-center gap-3">
                        <HelpCircle className="w-5 h-5 text-korean-cyan shrink-0" />
                        <span className="text-sm font-medium">{item.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-sm pb-4 pl-8">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </motion.div>

          {/* Payment Partner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0068FF]/10 border border-[#0068FF]/30 mb-3">
              <span className="text-lg font-bold text-[#0068FF]">Zalo</span>
              <span className="text-lg font-bold text-korean-green">Pay</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Thanh toán an toàn qua <span className="text-foreground font-medium">ZaloPay</span>
            </p>
            <p className="text-muted-foreground/70 text-xs mt-1">
              Hủy bất cứ lúc nào • Không cam kết dài hạn
            </p>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;