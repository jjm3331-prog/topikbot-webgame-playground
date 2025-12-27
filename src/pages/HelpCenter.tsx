import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Headphones,
  ExternalLink,
  MessageCircle,
  Clock,
  Target,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

// Assets
import zaloQr from "@/assets/zalo-qr.jpg";
import kakaoQr from "@/assets/kakao-qr.png";
import kakaoLogo from "@/assets/kakao-logo.png";

const HelpCenter = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const currentLang = (i18n.language || "ko").split("-")[0];
  const isKorean = currentLang === "ko";

  // 언어별 연락처 설정
  const contactConfig = {
    ko: {
      platform: "카카오톡",
      link: "https://open.kakao.com/o/salnPB8h",
      qrImage: kakaoQr,
      logo: kakaoLogo,
      buttonText: "카카오톡 오픈채팅 참여하기",
      description: "카카오톡 오픈채팅으로 실시간 상담을 받아보세요",
      scanText: "QR 코드를 스캔하거나 아래 버튼을 눌러 참여하세요",
      supportHours: "실시간 고객 지원",
      supportTime: "평일 09:00 - 18:00 (주말·공휴일 휴무)",
      helpTitle: "무엇을 도와드릴까요?",
      helpItems: [
        "앱 사용 방법 및 기능 안내",
        "결제 및 구독 관련 문의",
        "버그 신고 및 개선 제안",
        "학습 콘텐츠 관련 문의",
      ],
      features: [
        { icon: Zap, title: "빠른 응답", desc: "평균 30분 이내 답변" },
        { icon: Shield, title: "전문 상담", desc: "TOPIK 전문가 상담" },
        { icon: Sparkles, title: "맞춤 지원", desc: "1:1 맞춤형 솔루션" },
      ],
      brandColor: "from-[#FEE500] to-[#F9D900]",
      buttonColor: "bg-[#FEE500] hover:bg-[#F9D900] text-[#3C1E1E]",
    },
    default: {
      platform: "Zalo",
      link: "https://zalo.me/g/mogvgb538",
      qrImage: zaloQr,
      logo: null,
      buttonText: t("helpCenter.openZalo"),
      description: t("helpCenter.description"),
      scanText: t("helpCenter.scanQr"),
      supportHours: t("helpCenter.supportHours"),
      supportTime: t("helpCenter.supportTime"),
      helpTitle: t("helpCenter.whatCanWeHelp"),
      helpItems: [
        t("helpCenter.helpItem1"),
        t("helpCenter.helpItem2"),
        t("helpCenter.helpItem3"),
        t("helpCenter.helpItem4"),
      ],
      features: [],
      brandColor: "from-blue-500 to-blue-600",
      buttonColor: "bg-blue-500 hover:bg-blue-600 text-white",
    },
  };

  const config = isKorean ? contactConfig.ko : contactConfig.default;

  // 한국어 전용 프리미엄 UI
  if (isKorean) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full hover:bg-muted"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FEE500] to-[#F9D900] flex items-center justify-center shadow-lg shadow-[#FEE500]/20">
                <Headphones className="w-5 h-5 text-[#3C1E1E]" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-lg">고객 지원 센터</h1>
                <p className="text-xs text-muted-foreground">LUKATO AI 공식 고객센터</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
          {/* Hero Section */}
          <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring" }}
              className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[#FEE500] to-[#F9D900] flex items-center justify-center shadow-2xl shadow-[#FEE500]/30"
            >
              <img src={kakaoLogo} alt="KakaoTalk" className="w-16 h-16 rounded-xl" />
            </motion.div>
            <h2 className="text-3xl font-bold text-foreground">
              카카오톡으로 <span className="text-[#FEE500]">빠른 상담</span>
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {config.description}
            </p>
          </motion.section>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-3"
          >
            {config.features.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/50 shadow-sm"
              >
                <feature.icon className="w-4 h-4 text-[#FEE500]" />
                <span className="text-sm font-medium">{feature.title}</span>
                <span className="text-xs text-muted-foreground">· {feature.desc}</span>
              </div>
            ))}
          </motion.div>

          {/* QR Card - Premium Design */}
          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card via-card to-muted/30 shadow-xl"
          >
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#FEE500]/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[#FEE500]/5 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative p-8 flex flex-col items-center">
              {/* QR Code Container */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FEE500] to-[#F9D900] rounded-3xl blur-xl opacity-30" />
                <div className="relative bg-white p-4 rounded-2xl shadow-2xl">
                  <img
                    src={kakaoQr}
                    alt="카카오톡 오픈채팅 QR 코드"
                    className="w-56 h-56 sm:w-72 sm:h-72 object-contain"
                    loading="lazy"
                  />
                </div>
                {/* Kakao Badge */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-[#FEE500] rounded-full shadow-lg">
                  <span className="text-xs font-bold text-[#3C1E1E]">카카오톡 오픈채팅</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center mb-6">
                {config.scanText}
              </p>

              {/* CTA Button */}
              <Button
                className={`w-full max-w-sm ${config.buttonColor} rounded-2xl py-7 text-lg font-bold shadow-lg shadow-[#FEE500]/20 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-[#FEE500]/30`}
                onClick={() => window.open(config.link, "_blank")}
              >
                <MessageCircle className="w-6 h-6 mr-3" />
                {config.buttonText}
                <ExternalLink className="w-5 h-5 ml-3" />
              </Button>
            </div>
          </motion.section>

          {/* Info Cards Grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Support Hours Card */}
            <motion.section
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-2xl border border-border/50 bg-card p-6 shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-1">
                    {config.supportHours}
                  </h3>
                  <p className="text-sm text-muted-foreground">{config.supportTime}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-green-500 font-medium">현재 운영 중</span>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Help Topics Card */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-border/50 bg-card p-6 shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center shrink-0">
                  <Target className="w-6 h-6 text-orange-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground text-lg mb-3">
                    {config.helpTitle}
                  </h3>
                  <ul className="space-y-2">
                    {config.helpItems.map((item, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FEE500] shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.section>
          </div>

          {/* Footer */}
          <footer className="text-center pt-8 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              © 2025 LUKATO AI. AI와 함께하는 스마트 시험 대비.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              글로벌 TOPIK 시험 AI 학습 플랫폼
            </p>
          </footer>
        </main>
      </div>
    );
  }

  // 기본 (베트남어/기타 언어) UI - 기존 Zalo 기반
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label={t("common.back")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-heading font-bold text-lg">{t("helpCenter.title")}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <motion.section
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Headphones className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">{t("helpCenter.title")}</h2>
          <p className="text-muted-foreground">{config.description}</p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card overflow-hidden"
        >
          <div className="p-6 flex flex-col items-center">
            <img
              src={config.qrImage}
              alt={`${config.platform} QR code`}
              className="w-80 h-80 sm:w-96 sm:h-96 md:w-[28rem] md:h-[28rem] object-contain rounded-xl"
              loading="lazy"
            />
            <p className="text-sm text-muted-foreground mt-4 text-center">{config.scanText}</p>
          </div>

          <div className="px-6 pb-6">
            <Button
              className={`w-full ${config.buttonColor} rounded-xl py-6 text-base font-semibold`}
              onClick={() => window.open(config.link, "_blank")}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              {config.buttonText}
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </motion.section>

        <motion.section
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
                {config.supportHours}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{config.supportTime}</p>
            </div>
          </div>
        </motion.section>

        <motion.section
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
              <h3 className="font-semibold text-foreground flex items-center gap-2">{config.helpTitle}</h3>
              <ul className="mt-3 space-y-2">
                {config.helpItems.map((item, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.section>

        <footer className="text-center pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground">{t("helpCenter.copyright")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("helpCenter.platform")}</p>
        </footer>
      </main>
    </div>
  );
};

export default HelpCenter;
