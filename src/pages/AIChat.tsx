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
      title: "접속하기",
      description: "chat-topikbot.kr에 접속하여 Google 또는 이메일로 로그인하세요.",
      tip: "TOPIKBOT 계정과 동일한 이메일로 로그인하면 연동됩니다!"
    },
    {
      number: 2,
      title: "AI 모델 선택",
      description: "학습 목적에 맞는 최적의 AI 모델을 선택하세요.",
      tip: "'TOPIK Master' 모델은 한국어 학습에 최적화되어 있습니다."
    },
    {
      number: 3,
      title: "질문하기",
      description: "문법, 어휘, 시험 전략 등 무엇이든 질문하세요.",
      tip: "구체적으로 질문할수록 더 정확한 답변을 받을 수 있습니다."
    },
    {
      number: 4,
      title: "학습하기",
      description: "AI의 상세한 설명과 예시로 깊이 있게 학습하세요.",
      tip: "이해가 안 되면 '더 쉽게 설명해줘'라고 요청해보세요!"
    }
  ];

  const features = [
    {
      icon: Database,
      title: "전문 RAG 시스템",
      description: "TOPIK 기출문제, 문법서, 교재 등 방대한 데이터베이스 기반"
    },
    {
      icon: Brain,
      title: "최신 AI 모델",
      description: "GPT-4, Gemini Pro 등 최고 성능 AI 엔진 탑재"
    },
    {
      icon: Zap,
      title: "실시간 응답",
      description: "평균 2초 이내 빠른 답변으로 학습 흐름 유지"
    },
    {
      icon: Clock,
      title: "24시간 운영",
      description: "새벽에도 시험 직전에도 언제든 질문 가능"
    },
    {
      icon: BookOpen,
      title: "맞춤형 설명",
      description: "학습자 수준에 맞춰 쉽게 또는 심화 설명"
    },
    {
      icon: Shield,
      title: "정확한 정보",
      description: "검증된 TOPIK 자료 기반으로 오류 최소화"
    }
  ];

  const whyExternal = [
    {
      icon: Globe,
      title: "전용 인프라",
      description: "Q&A 전용으로 최적화된 서버에서 안정적이고 빠른 응답을 제공합니다."
    },
    {
      icon: Database,
      title: "대용량 지식 베이스",
      description: "TOPIK 전문 데이터베이스를 별도 운영하여 더 정확한 답변이 가능합니다."
    },
    {
      icon: Users,
      title: "통합 학습 생태계",
      description: "게임으로 재미있게 배우고, 모르는 건 AI에게 물어보는 완벽한 학습 사이클!"
    },
    {
      icon: GraduationCap,
      title: "TOPIK 특화",
      description: "일반 ChatGPT와 달리 TOPIK 시험에 특화된 RAG 시스템을 갖추고 있습니다."
    }
  ];

  const notices = [
    "chat-topikbot.kr은 TOPIKBOT의 공식 AI 질의응답 서비스입니다",
    "동일한 이메일로 로그인하면 학습 이력이 연동됩니다",
    "무료 회원도 하루 일정 횟수 질문이 가능합니다",
    "Premium 회원은 무제한 질문 및 고급 AI 모델 사용 가능"
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
              AI Chat - 질의응답 서비스
              <span className="px-2 py-0.5 rounded-full bg-korean-green/20 text-korean-green text-xs">
                RAG 기반
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-primary">TOPIKBOT</span>{" "}
              <span className="bg-gradient-to-r from-korean-blue to-korean-green bg-clip-text text-transparent">
                AI Chat
              </span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              TOPIK 학습 중 궁금한 점이 있으신가요?<br />
              <strong className="text-foreground">chat-topikbot.kr</strong>에서 최고 성능의 RAG AI에게 물어보세요!
            </p>
            
            <Button 
              size="lg" 
              onClick={handleOpenChat}
              className="bg-gradient-to-r from-korean-blue to-korean-green hover:opacity-90 text-white gap-2 px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              <Sparkles className="w-5 h-5" />
              AI Chat 시작하기
              <ExternalLink className="w-4 h-4" />
            </Button>
            
            <p className="text-sm text-muted-foreground mt-4">
              🔗 chat-topikbot.kr 에서 이용 가능
            </p>
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
              왜 별도 사이트에서 운영하나요?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              더 나은 학습 경험을 위해 전문 Q&A 서비스를 분리 운영합니다
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
              이용 방법
            </h2>
            <p className="text-muted-foreground">
              4단계로 간단하게 시작하세요
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
              주요 기능
            </h2>
            <p className="text-muted-foreground">
              TOPIKBOT AI Chat만의 특별한 기능들
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
                  <h3 className="font-semibold">알아두세요</h3>
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
              지금 바로 AI에게 물어보세요!
            </h2>
            <p className="text-muted-foreground mb-8">
              게임으로 즐겁게 배우고, 궁금한 건 AI에게!<br />
              TOPIK 학습의 완벽한 파트너가 되어드립니다.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={handleOpenChat}
                className="bg-gradient-to-r from-korean-blue to-korean-green hover:opacity-90 text-white gap-2"
              >
                <Sparkles className="w-5 h-5" />
                AI Chat 열기
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => window.location.href = "/dashboard"}
                className="gap-2"
              >
                <BookOpen className="w-5 h-5" />
                게임으로 학습하기
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
