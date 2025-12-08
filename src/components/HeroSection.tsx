import { Button } from "@/components/ui/button";
import NeonText from "./NeonText";
import { Play, Sparkles, BookOpen } from "lucide-react";
import seoulHero from "@/assets/seoul-hero.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={seoulHero}
          alt="Seoul Cyberpunk Cityscape"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60" />
      </div>

      {/* Cyber Grid Overlay */}
      <div className="absolute inset-0 cyber-grid opacity-30 z-10" />

      {/* Radial Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/20 via-transparent to-transparent z-10" />

      {/* Content */}
      <div className="relative z-20 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border-primary/30 opacity-0 animate-fade-in"
            style={{ animationDelay: "200ms", animationFillMode: "forwards" }}
          >
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-tech text-accent tracking-wider">
              AI-POWERED KOREAN RPG
            </span>
          </div>

          {/* Main Title */}
          <div
            className="space-y-2 opacity-0 animate-slide-up"
            style={{ animationDelay: "400ms", animationFillMode: "forwards" }}
          >
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-display tracking-tight">
              <NeonText variant="gradient" className="block">
                K-Life
              </NeonText>
            </h1>
            <p className="text-3xl md:text-4xl lg:text-5xl font-display text-foreground">
              서울 생존기
            </p>
          </div>

          {/* Subtitle */}
          <div
            className="space-y-4 opacity-0 animate-fade-in"
            style={{ animationDelay: "600ms", animationFillMode: "forwards" }}
          >
            <p className="text-xl md:text-2xl font-body text-muted-foreground">
              한국어 학습 RPG
            </p>
            <p className="text-lg text-muted-foreground/80 font-body max-w-2xl mx-auto leading-relaxed">
              몰입형 한국어 학습 여정을 시작하세요. AI 기반 대화를 통해 실생활 시나리오를 연습하고,
              어휘를 쌓고, 서울 일상생활을 경험하면서 TOPIK 자격증을 준비하세요.
            </p>
          </div>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4 opacity-0 animate-slide-up"
            style={{ animationDelay: "800ms", animationFillMode: "forwards" }}
          >
            <Button variant="neon" size="xl" className="group">
              <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-display">게임 시작</span>
            </Button>
            <Button variant="cyber" size="lg">
              <BookOpen className="w-5 h-5" />
              <span>학습 가이드</span>
            </Button>
          </div>

          {/* Stats */}
          <div
            className="grid grid-cols-3 gap-8 pt-12 max-w-lg mx-auto opacity-0 animate-fade-in"
            style={{ animationDelay: "1000ms", animationFillMode: "forwards" }}
          >
            {[
              { value: "10K+", label: "학습자", labelEn: "Learners" },
              { value: "500+", label: "시나리오", labelEn: "Scenarios" },
              { value: "6", label: "TOPIK 레벨", labelEn: "Levels" },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl md:text-3xl font-tech text-primary neon-text-pink">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
                <div className="text-xs text-muted-foreground/60">{stat.labelEn}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
        <div className="flex flex-col items-center gap-2 animate-float">
          <span className="text-xs font-tech text-muted-foreground tracking-widest">
            SCROLL
          </span>
          <div className="w-6 h-10 rounded-full border-2 border-primary/50 flex justify-center pt-2">
            <div className="w-1 h-2 bg-primary rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
