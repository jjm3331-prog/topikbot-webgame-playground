import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageCircle, Map, Award } from "lucide-react";
import AppFooter from "@/components/AppFooter";
import seoulHero from "@/assets/seoul-hero.jpg";

const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/game");
      }
    });
  }, [navigate]);

  const features = [
    {
      icon: MessageCircle,
      titleKo: "AI 기반 대화",
      titleVi: "Hội thoại AI",
    },
    {
      icon: Map,
      titleKo: "실생활 시나리오",
      titleVi: "Tình huống thực tế",
    },
    {
      icon: Award,
      titleKo: "TOPIK 준비",
      titleVi: "Chuẩn bị TOPIK",
    },
  ];

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(${seoulHero})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Header with Logo */}
      <header className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <img 
            src="/favicon.png" 
            alt="LUKATO" 
            className="w-10 h-10 rounded-full shadow-lg shadow-neon-pink/30"
          />
          <span className="font-display font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-cyan">
            LUKATO
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate("/auth")}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          로그인
        </Button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-lg w-full space-y-8">
          {/* Title */}
          <div className="animate-fade-in">
            <h1 className="font-display text-4xl md:text-5xl text-white mb-2">
              Game{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-purple-400 to-neon-cyan">
                LUKATO
              </span>
            </h1>
            <p className="text-lg text-white/80 font-medium">
              Your Korean Mentor
            </p>
            <p className="text-sm text-purple-300 mt-1">
              AI 기반 한국어 학습 RPG
            </p>
          </div>

          {/* Start Button */}
          <div className="animate-scale-in" style={{ animationDelay: "0.2s" }}>
            <Button
              onClick={() => navigate("/auth")}
              className="px-12 py-6 text-xl font-bold bg-gradient-to-r from-neon-pink to-neon-purple hover:from-pink-600 hover:to-purple-600 text-white rounded-full shadow-lg shadow-neon-pink/30 transition-all hover:scale-105"
            >
              시작하기 / Bắt đầu
            </Button>
          </div>

          {/* Description Card */}
          <div 
            className="glass-card p-6 rounded-2xl text-left animate-slide-up"
            style={{ animationDelay: "0.4s" }}
          >
            <p className="text-white/90 leading-relaxed mb-4">
              몰입형 한국어 학습 여정을 시작하세요. AI 기반 대화를 통해 실생활 
              시나리오를 연습하고, 어휘를 쌓고, 서울 일상생활을 경험하면서 
              TOPIK 자격증을 준비하세요.
            </p>
            <p className="text-purple-300 italic text-sm leading-relaxed">
              Bắt đầu hành trình học tiếng Hàn đầy đam mê. Luyện tập các tình huống thực tế thông qua 
              hội thoại AI, xây dựng từ vựng và chuẩn bị chứng chỉ TOPIK.
            </p>

            {/* Feature List */}
            <div className="mt-6 space-y-3">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <feature.icon className="w-5 h-5 text-neon-cyan" />
                  <span className="text-white">{feature.titleKo}</span>
                  <span className="text-purple-300 text-sm">({feature.titleVi})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <AppFooter compact />
    </div>
  );
};

export default Landing;
