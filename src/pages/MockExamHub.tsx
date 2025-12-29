import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  Headphones, 
  PenTool,
  Mic,
  Clock,
  Target,
  Trophy,
  Brain,
  Zap,
  ChevronRight,
  Play,
  BarChart3,
  BookMarked,
  Sparkles,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileText,
  Volume2
} from "lucide-react";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const MockExamHub = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedExam, setSelectedExam] = useState<string>("TOPIK_I");
  const [selectedMode, setSelectedMode] = useState<string>("full");
  const [showModeDialog, setShowModeDialog] = useState(false);

  const examTypes = [
    {
      id: "TOPIK_I",
      title: "TOPIK I",
      subtitle: "초급 (1-2급)",
      description: "한국어 기초 능력 평가",
      color: "from-emerald-500 to-teal-600",
      icon: GraduationCap,
      sections: [
        { name: "듣기", questions: 30, time: 40, icon: Headphones },
        { name: "읽기", questions: 40, time: 60, icon: BookOpen }
      ],
      totalTime: 100,
      totalQuestions: 70
    },
    {
      id: "TOPIK_II",
      title: "TOPIK II",
      subtitle: "중고급 (3-6급)",
      description: "한국어 심화 능력 평가",
      color: "from-blue-500 to-indigo-600",
      icon: Trophy,
      sections: [
        { name: "듣기", questions: 50, time: 60, icon: Headphones },
        { name: "읽기", questions: 50, time: 70, icon: BookOpen },
        { name: "쓰기", questions: 4, time: 50, icon: PenTool }
      ],
      totalTime: 180,
      totalQuestions: 104
    },
    {
      id: "TOPIK_EPS",
      title: "EPS-TOPIK",
      subtitle: "고용허가제",
      description: "해외취업 한국어능력시험",
      color: "from-orange-500 to-red-600",
      icon: Target,
      sections: [
        { name: "듣기", questions: 25, time: 25, icon: Headphones },
        { name: "읽기", questions: 25, time: 25, icon: BookOpen }
      ],
      totalTime: 50,
      totalQuestions: 50
    }
  ];

  const learningModes = [
    {
      id: "full",
      title: "실전 모의고사",
      description: "실제 시험과 동일한 환경에서 전체 문항 풀기",
      icon: Clock,
      color: "bg-gradient-to-br from-red-500 to-pink-600",
      features: ["시간 제한", "전체 문항", "실전 환경"]
    },
    {
      id: "section",
      title: "영역별 연습",
      description: "듣기/읽기 영역을 선택해서 집중 훈련",
      icon: Target,
      color: "bg-gradient-to-br from-blue-500 to-cyan-600",
      features: ["영역 선택", "시간 무제한", "즉시 해설"]
    },
    {
      id: "part",
      title: "Part별 연습",
      description: "특정 문제 유형만 집중적으로 훈련",
      icon: Zap,
      color: "bg-gradient-to-br from-amber-500 to-orange-600",
      features: ["유형별 훈련", "반복 학습", "취약점 보완"]
    },
    {
      id: "weakness",
      title: "약점 집중",
      description: "AI가 분석한 취약 유형 맞춤 문제",
      icon: Brain,
      color: "bg-gradient-to-br from-purple-500 to-violet-600",
      features: ["AI 분석", "맞춤 추천", "효율적 학습"]
    }
  ];

  const features = [
    {
      icon: Sparkles,
      title: "AI 문제 생성",
      description: "RAG + Gemini로 무한한 신규 문제 생성"
    },
    {
      icon: Volume2,
      title: "7개 언어 해설",
      description: "한국어, 베트남어, 영어, 일본어, 중국어, 러시아어, 우즈베크어"
    },
    {
      icon: BarChart3,
      title: "상세 분석",
      description: "영역별 취약점 분석 및 예상 등급 산출"
    },
    {
      icon: BookMarked,
      title: "스마트 오답노트",
      description: "틀린 문제 자동 저장 및 반복 학습 관리"
    }
  ];

  const tutorialSteps = [
    {
      step: 1,
      title: "시험 유형 선택",
      description: "TOPIK I (초급), TOPIK II (중고급), EPS-TOPIK 중 선택하세요."
    },
    {
      step: 2,
      title: "학습 모드 선택",
      description: "실전 모의고사, 영역별, Part별, 약점 집중 중 원하는 모드를 선택하세요."
    },
    {
      step: 3,
      title: "문제 풀기",
      description: "시간 내에 문제를 풀고, 모르는 문제는 표시해두세요."
    },
    {
      step: 4,
      title: "결과 확인",
      description: "점수, 예상 등급, 영역별 분석을 확인하세요."
    },
    {
      step: 5,
      title: "오답 복습",
      description: "틀린 문제는 해설을 확인하고 오답노트에 저장하세요."
    }
  ];

  const selectedExamData = examTypes.find(e => e.id === selectedExam);

  return (
    <div className="min-h-screen bg-background">
      <CleanHeader />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Badge className="mb-4 bg-gradient-to-r from-primary to-purple-600 text-white border-0">
            AI 기반 모의고사 시스템
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
            TOPIK 모의고사
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            실제 TOPIK 시험과 100% 동일한 유형으로<br />
            AI가 생성하는 무한한 문제로 완벽하게 대비하세요
          </p>
        </motion.div>

        {/* Exam Type Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 text-center">시험 유형 선택</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {examTypes.map((exam) => (
              <Card 
                key={exam.id}
                className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                  selectedExam === exam.id 
                    ? 'ring-2 ring-primary shadow-lg' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedExam(exam.id)}
              >
                <CardHeader className={`bg-gradient-to-br ${exam.color} text-white rounded-t-lg`}>
                  <div className="flex items-center justify-between">
                    <exam.icon className="w-10 h-10" />
                    {selectedExam === exam.id && (
                      <CheckCircle2 className="w-6 h-6" />
                    )}
                  </div>
                  <CardTitle className="text-2xl">{exam.title}</CardTitle>
                  <CardDescription className="text-white/90">{exam.subtitle}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-muted-foreground mb-4">{exam.description}</p>
                  <div className="space-y-2">
                    {exam.sections.map((section) => (
                      <div key={section.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <section.icon className="w-4 h-4 text-muted-foreground" />
                          <span>{section.name}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {section.questions}문항 / {section.time}분
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t flex justify-between text-sm font-medium">
                    <span>총 {exam.totalQuestions}문항</span>
                    <span>{exam.totalTime}분</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Learning Modes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 text-center">학습 모드</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {learningModes.map((mode) => (
              <Card 
                key={mode.id}
                className={`cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${
                  selectedMode === mode.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedMode(mode.id)}
              >
                <CardContent className="pt-6">
                  <div className={`w-12 h-12 rounded-xl ${mode.color} flex items-center justify-center mb-4`}>
                    <mode.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold mb-2">{mode.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{mode.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {mode.features.map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-12"
        >
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
            onClick={() => {
              if (selectedMode === 'section') {
                setShowModeDialog(true);
              } else {
                navigate(`/mock-exam/${selectedExam}?mode=${selectedMode}`);
              }
            }}
          >
            <Play className="w-5 h-5 mr-2" />
            {selectedExamData?.title} 시작하기
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 text-center">핵심 기능</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Tutorial Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-12"
        >
          <Card className="bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                사용 가이드
              </CardTitle>
              <CardDescription>
                TOPIK 모의고사 시스템 사용법을 단계별로 안내합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {tutorialSteps.map((step, index) => (
                  <div key={step.step} className="relative">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mb-3">
                        {step.step}
                      </div>
                      <h4 className="font-medium mb-2">{step.title}</h4>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                    {index < tutorialSteps.length - 1 && (
                      <ChevronRight className="hidden md:block absolute top-5 -right-2 w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Important Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold mb-2 text-amber-700 dark:text-amber-400">중요 안내</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 실전 모의고사 모드는 실제 시험과 동일한 시간 제한이 적용됩니다.</li>
                    <li>• 듣기 영역은 오디오가 자동 재생되며, 한 번만 들을 수 있습니다.</li>
                    <li>• 쓰기 영역은 기존 '쓰기 첨삭' 메뉴와 연동됩니다.</li>
                    <li>• 오답노트는 자동으로 저장되며, 언제든 복습할 수 있습니다.</li>
                    <li>• AI 문제 생성 기능은 Premium 회원에게 무제한 제공됩니다.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 flex flex-wrap justify-center gap-4"
        >
          <Button variant="outline" onClick={() => navigate('/writing-correction')}>
            <PenTool className="w-4 h-4 mr-2" />
            쓰기 첨삭
          </Button>
          <Button variant="outline" onClick={() => navigate('/roleplay-speaking')}>
            <Mic className="w-4 h-4 mr-2" />
            말하기 연습
          </Button>
          <Button variant="outline" onClick={() => navigate('/ranking')}>
            <TrendingUp className="w-4 h-4 mr-2" />
            랭킹 보기
          </Button>
        </motion.div>

        {/* Section Selection Dialog */}
        <Dialog open={showModeDialog} onOpenChange={setShowModeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>영역 선택</DialogTitle>
              <DialogDescription>연습할 영역을 선택하세요</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <Button 
                variant="outline" 
                className="h-24 flex flex-col gap-2"
                onClick={() => navigate(`/mock-exam/${selectedExam}?mode=section&section=listening`)}
              >
                <Headphones className="w-8 h-8" />
                <span>듣기</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex flex-col gap-2"
                onClick={() => navigate(`/mock-exam/${selectedExam}?mode=section&section=reading`)}
              >
                <BookOpen className="w-8 h-8" />
                <span>읽기</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>

      <AppFooter />
    </div>
  );
};

export default MockExamHub;
