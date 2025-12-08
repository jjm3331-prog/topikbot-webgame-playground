import { Bot, MapPin, Award, Gamepad2, Users, Mic } from "lucide-react";
import FeatureCard from "./FeatureCard";
import NeonText from "./NeonText";

const features = [
  {
    icon: Bot,
    title: "AI Conversations",
    titleKo: "AI 기반 대화",
    description: "Practice with intelligent AI that adapts to your level",
    descriptionKo: "당신의 레벨에 맞춰 적응하는 지능형 AI와 대화 연습",
    color: "pink" as const,
  },
  {
    icon: MapPin,
    title: "Real-Life Scenarios",
    titleKo: "실생활 시나리오",
    description: "Navigate everyday situations in Seoul",
    descriptionKo: "서울에서의 일상 상황을 직접 경험하세요",
    color: "cyan" as const,
  },
  {
    icon: Award,
    title: "TOPIK Preparation",
    titleKo: "TOPIK 준비",
    description: "Structured curriculum aligned with TOPIK levels",
    descriptionKo: "TOPIK 레벨에 맞춘 체계적인 커리큘럼",
    color: "gold" as const,
  },
  {
    icon: Gamepad2,
    title: "RPG Gameplay",
    titleKo: "RPG 게임플레이",
    description: "Level up your character as you learn",
    descriptionKo: "학습하면서 캐릭터를 성장시키세요",
    color: "pink" as const,
  },
  {
    icon: Users,
    title: "Multiplayer Quests",
    titleKo: "멀티플레이어 퀘스트",
    description: "Team up with other learners worldwide",
    descriptionKo: "전 세계 학습자들과 함께 퀘스트를 수행하세요",
    color: "cyan" as const,
  },
  {
    icon: Mic,
    title: "Voice Recognition",
    titleKo: "음성 인식",
    description: "Practice pronunciation with real-time feedback",
    descriptionKo: "실시간 피드백으로 발음을 연습하세요",
    color: "gold" as const,
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 relative">
      {/* Background Elements */}
      <div className="absolute inset-0 cyber-grid opacity-20" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-radial from-primary/10 via-transparent to-transparent" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-radial from-secondary/10 via-transparent to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <div
            className="opacity-0 animate-fade-in"
            style={{ animationDelay: "100ms", animationFillMode: "forwards" }}
          >
            <span className="text-sm font-tech text-secondary tracking-widest uppercase">
              Game Features
            </span>
          </div>
          <h2
            className="text-4xl md:text-5xl font-display opacity-0 animate-slide-up"
            style={{ animationDelay: "200ms", animationFillMode: "forwards" }}
          >
            <NeonText variant="gradient">게임 기능</NeonText>
          </h2>
          <p
            className="text-muted-foreground max-w-2xl mx-auto opacity-0 animate-fade-in"
            style={{ animationDelay: "300ms", animationFillMode: "forwards" }}
          >
            한국어 학습을 게임처럼 재미있게. 다양한 기능으로 몰입감 있는 학습 경험을 제공합니다.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              {...feature}
              delay={400 + index * 100}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
