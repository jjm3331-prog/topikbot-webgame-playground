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
  Send,
  Mail,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

// Assets
import zaloQr from "@/assets/zalo-qr.jpg";
import kakaoQr from "@/assets/kakao-qr.png";
import kakaoLogo from "@/assets/kakao-logo.png";
import telegramQr from "@/assets/telegram-qr.jpg";

// 텔레그램 사용 언어
const TELEGRAM_LANGS = ["en", "ru", "uz", "zh", "ja"];
const TELEGRAM_LINK = "https://t.me/lukato_ai";
const SUPPORT_EMAIL = "lukas@tam9.me";

// 언어별 텔레그램 고객센터 설정
const telegramConfigs: Record<string, {
  title: string;
  subtitle: string;
  description: string;
  scanText: string;
  buttonText: string;
  emailTitle: string;
  emailDesc: string;
  emailButton: string;
  supportHours: string;
  supportTime: string;
  helpTitle: string;
  helpItems: string[];
  footerCopyright: string;
  footerPlatform: string;
}> = {
  en: {
    title: "Help Center",
    subtitle: "LUKATO AI Official Customer Support",
    description: "Get real-time support via Telegram or Email",
    scanText: "Scan the QR code or click the button below to join",
    buttonText: "Open Telegram Support",
    emailTitle: "Email Support",
    emailDesc: "Send us your inquiry via email",
    emailButton: "Send Email",
    supportHours: "Live Support",
    supportTime: "Available 24/7 via Telegram",
    helpTitle: "How can we help you?",
    helpItems: [
      "App usage guide & features",
      "Payment & subscription support",
      "Bug reports & suggestions",
      "Learning content inquiries",
    ],
    footerCopyright: "© 2025 LUKATO AI. Smart exam prep with AI.",
    footerPlatform: "Global TOPIK AI Learning Platform",
  },
  ru: {
    title: "Центр помощи",
    subtitle: "Официальная поддержка LUKATO AI",
    description: "Получите поддержку в реальном времени через Telegram или Email",
    scanText: "Отсканируйте QR-код или нажмите кнопку ниже, чтобы присоединиться",
    buttonText: "Открыть Telegram поддержку",
    emailTitle: "Поддержка по Email",
    emailDesc: "Отправьте нам ваш запрос по электронной почте",
    emailButton: "Отправить письмо",
    supportHours: "Живая поддержка",
    supportTime: "Доступна 24/7 через Telegram",
    helpTitle: "Чем мы можем помочь?",
    helpItems: [
      "Руководство по использованию приложения",
      "Помощь с оплатой и подпиской",
      "Сообщения об ошибках и предложения",
      "Вопросы по учебному контенту",
    ],
    footerCopyright: "© 2025 LUKATO AI. Умная подготовка к экзаменам с ИИ.",
    footerPlatform: "Глобальная платформа AI для изучения TOPIK",
  },
  uz: {
    title: "Yordam markazi",
    subtitle: "LUKATO AI rasmiy mijozlar xizmati",
    description: "Telegram yoki Email orqali real vaqtda yordam oling",
    scanText: "QR kodni skanerlang yoki quyidagi tugmani bosing",
    buttonText: "Telegram yordamini ochish",
    emailTitle: "Email orqali yordam",
    emailDesc: "Bizga so'rovingizni elektron pochta orqali yuboring",
    emailButton: "Email yuborish",
    supportHours: "Jonli yordam",
    supportTime: "Telegram orqali 24/7 mavjud",
    helpTitle: "Sizga qanday yordam bera olamiz?",
    helpItems: [
      "Ilovadan foydalanish qo'llanmasi",
      "To'lov va obuna yordami",
      "Xato xabarlari va takliflar",
      "O'quv kontenti bo'yicha savollar",
    ],
    footerCopyright: "© 2025 LUKATO AI. AI bilan aqlli imtihon tayyorgarligi.",
    footerPlatform: "Butun dunyo bo'ylab TOPIK AI o'quv platformasi",
  },
  zh: {
    title: "帮助中心",
    subtitle: "LUKATO AI 官方客服",
    description: "通过 Telegram 或电子邮件获得实时支持",
    scanText: "扫描二维码或点击下方按钮加入",
    buttonText: "打开 Telegram 支持",
    emailTitle: "邮件支持",
    emailDesc: "通过电子邮件向我们发送您的咨询",
    emailButton: "发送邮件",
    supportHours: "在线支持",
    supportTime: "通过 Telegram 24/7 全天候服务",
    helpTitle: "我们能帮您什么？",
    helpItems: [
      "应用使用指南和功能",
      "付款和订阅支持",
      "错误报告和建议",
      "学习内容咨询",
    ],
    footerCopyright: "© 2025 LUKATO AI. AI智能备考。",
    footerPlatform: "面向全球学员的TOPIK AI学习平台",
  },
  ja: {
    title: "ヘルプセンター",
    subtitle: "LUKATO AI 公式カスタマーサポート",
    description: "TelegramまたはEmailでリアルタイムサポートを受けられます",
    scanText: "QRコードをスキャンするか、下のボタンを押して参加してください",
    buttonText: "Telegramサポートを開く",
    emailTitle: "メールサポート",
    emailDesc: "メールでお問い合わせを送信してください",
    emailButton: "メールを送信",
    supportHours: "ライブサポート",
    supportTime: "Telegramで24時間365日対応",
    helpTitle: "何かお手伝いできますか？",
    helpItems: [
      "アプリ使用ガイドと機能",
      "決済＆サブスクリプションサポート",
      "バグ報告＆改善提案",
      "学習コンテンツに関するお問い合わせ",
    ],
    footerCopyright: "© 2025 LUKATO AI. AIとスマート試験対策。",
    footerPlatform: "世界中の学習者向けTOPIK AI学習プラットフォーム",
  },
};

const HelpCenter = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const currentLang = (i18n.language || "ko").split("-")[0];
  const isKorean = currentLang === "ko";
  const isTelegramLang = TELEGRAM_LANGS.includes(currentLang);

  // 텔레그램 언어용 UI (영어, 러시아어, 우즈벡어, 중국어, 일본어)
  if (isTelegramLang) {
    const config = telegramConfigs[currentLang] || telegramConfigs.en;
    
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0088cc] to-[#0077b5] flex items-center justify-center shadow-lg shadow-[#0088cc]/20">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-lg">{config.title}</h1>
                <p className="text-xs text-muted-foreground">{config.subtitle}</p>
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
              className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[#0088cc] to-[#0077b5] flex items-center justify-center shadow-2xl shadow-[#0088cc]/30"
            >
              <Send className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-3xl font-bold text-foreground">
              Telegram <span className="text-[#0088cc]">Support</span>
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
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/50 shadow-sm">
              <Zap className="w-4 h-4 text-[#0088cc]" />
              <span className="text-sm font-medium">24/7</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/50 shadow-sm">
              <Shield className="w-4 h-4 text-[#0088cc]" />
              <span className="text-sm font-medium">TOPIK Expert</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/50 shadow-sm">
              <Sparkles className="w-4 h-4 text-[#0088cc]" />
              <span className="text-sm font-medium">1:1 Support</span>
            </div>
          </motion.div>

          {/* Telegram QR Card */}
          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card via-card to-muted/30 shadow-xl"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#0088cc]/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[#0088cc]/5 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative p-8 flex flex-col items-center">
              {/* QR Code Container */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0088cc] to-[#0077b5] rounded-3xl blur-xl opacity-30" />
                <div className="relative bg-white p-4 rounded-2xl shadow-2xl">
                  <img
                    src={telegramQr}
                    alt="Telegram QR Code"
                    className="w-56 h-56 sm:w-72 sm:h-72 object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-[#0088cc] rounded-full shadow-lg">
                  <span className="text-xs font-bold text-white">Telegram</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center mb-6">
                {config.scanText}
              </p>

              {/* CTA Button */}
              <Button
                className="w-full max-w-sm bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-2xl py-7 text-lg font-bold shadow-lg shadow-[#0088cc]/20 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-[#0088cc]/30"
                onClick={() => window.open(TELEGRAM_LINK, "_blank")}
              >
                <Send className="w-6 h-6 mr-3" />
                {config.buttonText}
                <ExternalLink className="w-5 h-5 ml-3" />
              </Button>
            </div>
          </motion.section>

          {/* Email Support Card */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 shadow-lg"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/10 flex items-center justify-center shrink-0">
                <Mail className="w-7 h-7 text-emerald-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground text-lg mb-1">{config.emailTitle}</h3>
                <p className="text-sm text-muted-foreground mb-4">{config.emailDesc}</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <code className="flex-1 px-4 py-3 bg-muted/50 rounded-xl text-sm font-mono text-foreground border border-border/50">
                    {SUPPORT_EMAIL}
                  </code>
                  <Button
                    variant="outline"
                    className="rounded-xl border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                    onClick={() => window.open(`mailto:${SUPPORT_EMAIL}`, "_blank")}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {config.emailButton}
                  </Button>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Info Cards Grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Support Hours Card */}
            <motion.section
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-border/50 bg-card p-6 shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-1">{config.supportHours}</h3>
                  <p className="text-sm text-muted-foreground">{config.supportTime}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-green-500 font-medium">Online</span>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Help Topics Card */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              className="rounded-2xl border border-border/50 bg-card p-6 shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center shrink-0">
                  <Target className="w-6 h-6 text-orange-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground text-lg mb-3">{config.helpTitle}</h3>
                  <ul className="space-y-2">
                    {config.helpItems.map((item, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0088cc] shrink-0" />
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
            <p className="text-sm text-muted-foreground">{config.footerCopyright}</p>
            <p className="text-xs text-muted-foreground mt-1">{config.footerPlatform}</p>
          </footer>
        </main>
      </div>
    );
  }

  // 한국어 전용 프리미엄 UI (카카오톡)
  if (isKorean) {
    const config = {
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
    };

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
                className="w-full max-w-sm bg-[#FEE500] hover:bg-[#F9D900] text-[#3C1E1E] rounded-2xl py-7 text-lg font-bold shadow-lg shadow-[#FEE500]/20 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-[#FEE500]/30"
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
  const zaloConfig = {
    platform: "Zalo",
    link: "https://zalo.me/g/mogvgb538",
    qrImage: zaloQr,
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
  };

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
          <p className="text-muted-foreground">{zaloConfig.description}</p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card overflow-hidden"
        >
          <div className="p-6 flex flex-col items-center">
            <img
              src={zaloConfig.qrImage}
              alt={`${zaloConfig.platform} QR code`}
              className="w-80 h-80 sm:w-96 sm:h-96 md:w-[28rem] md:h-[28rem] object-contain rounded-xl"
              loading="lazy"
            />
            <p className="text-sm text-muted-foreground mt-4 text-center">{zaloConfig.scanText}</p>
          </div>

          <div className="px-6 pb-6">
            <Button
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-6 text-base font-semibold"
              onClick={() => window.open(zaloConfig.link, "_blank")}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              {zaloConfig.buttonText}
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
                {zaloConfig.supportHours}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{zaloConfig.supportTime}</p>
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
              <h3 className="font-semibold text-foreground flex items-center gap-2">{zaloConfig.helpTitle}</h3>
              <ul className="mt-3 space-y-2">
                {zaloConfig.helpItems.map((item, index) => (
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
