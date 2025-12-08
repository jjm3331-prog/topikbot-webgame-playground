import { useState } from "react";
import { Button } from "@/components/ui/button";
import GlassCard from "./GlassCard";
import NeonText from "./NeonText";
import LevelSelector from "./LevelSelector";
import { ChevronRight, MessageSquare, User, Heart, Zap, Coins } from "lucide-react";

const scenarios = [
  {
    id: 1,
    title: "카페에서 주문하기",
    titleEn: "Ordering at a Cafe",
    location: "강남역 카페",
    difficulty: "초급",
    xp: 50,
  },
  {
    id: 2,
    title: "지하철 타기",
    titleEn: "Taking the Subway",
    location: "서울 지하철",
    difficulty: "초급",
    xp: 75,
  },
  {
    id: 3,
    title: "식당에서 식사하기",
    titleEn: "Dining at a Restaurant",
    location: "명동 식당",
    difficulty: "중급",
    xp: 100,
  },
];

const GamePreviewSection = () => {
  const [selectedScenario, setSelectedScenario] = useState(scenarios[0]);

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/20 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <span className="text-sm font-tech text-accent tracking-widest uppercase">
            Game Preview
          </span>
          <h2 className="text-4xl md:text-5xl font-display">
            <NeonText variant="gradient">게임 미리보기</NeonText>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Game Screen Preview */}
          <div
            className="opacity-0 animate-slide-up"
            style={{ animationDelay: "200ms", animationFillMode: "forwards" }}
          >
            <GlassCard className="p-0 overflow-hidden">
              {/* Game Header */}
              <div className="bg-gradient-to-r from-muted to-muted/50 p-4 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-neon-purple flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-display text-sm">김민수</p>
                      <p className="text-xs text-muted-foreground">Level 12</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-tech">85</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="w-4 h-4 text-accent" />
                      <span className="text-sm font-tech">120</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Coins className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-tech">2,450</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Preview */}
              <div className="p-6 space-y-4 min-h-[300px] bg-gradient-to-b from-card to-background">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-secondary" />
                  </div>
                  <div className="glass-card p-3 max-w-[80%]">
                    <p className="text-sm">안녕하세요! 무엇을 도와드릴까요?</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Hello! How can I help you?
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 justify-end">
                  <div className="bg-primary/20 border border-primary/30 rounded-2xl p-3 max-w-[80%]">
                    <p className="text-sm">아메리카노 한 잔 주세요.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      One Americano, please.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-secondary" />
                  </div>
                  <div className="glass-card p-3 max-w-[80%]">
                    <p className="text-sm">네, 사이즈는 어떤 걸로 드릴까요?</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sure, what size would you like?
                    </p>
                  </div>
                </div>

                {/* Typing indicator */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-xs">AI가 응답 중...</span>
                </div>
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-border/30 bg-muted/30">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="한국어로 대답하세요..."
                    className="flex-1 bg-background/50 border border-border/50 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                  />
                  <Button variant="neon" size="sm">
                    전송
                  </Button>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Scenarios & Levels */}
          <div className="space-y-8">
            {/* Scenarios List */}
            <div
              className="opacity-0 animate-slide-up"
              style={{ animationDelay: "400ms", animationFillMode: "forwards" }}
            >
              <h3 className="text-xl font-display mb-4">
                <NeonText variant="cyan">시나리오 선택</NeonText>
              </h3>
              <div className="space-y-3">
                {scenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => setSelectedScenario(scenario)}
                    className={`w-full glass-card p-4 text-left transition-all duration-300 hover:scale-[1.02] ${
                      selectedScenario.id === scenario.id
                        ? "border-primary/50 shadow-neon"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-display">{scenario.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {scenario.titleEn}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className="text-secondary">{scenario.location}</span>
                          <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                            {scenario.difficulty}
                          </span>
                          <span className="text-primary">+{scenario.xp} XP</span>
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-5 h-5 transition-colors ${
                          selectedScenario.id === scenario.id
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Level Selector */}
            <div
              className="opacity-0 animate-slide-up"
              style={{ animationDelay: "600ms", animationFillMode: "forwards" }}
            >
              <h3 className="text-xl font-display mb-4">
                <NeonText variant="gold">TOPIK 레벨</NeonText>
              </h3>
              <LevelSelector />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GamePreviewSection;
