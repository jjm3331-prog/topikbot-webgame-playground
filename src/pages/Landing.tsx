import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageCircle, Map, Award } from "lucide-react";
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
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(${seoulHero})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Main Content - Single Screen Focus */}
      <div className="text-center max-w-lg w-full space-y-8">
        {/* Title */}
        <div className="animate-fade-in">
          <h1 className="font-display text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-purple-400 to-neon-cyan mb-2">
            K-Life: 서울 생존기
          </h1>
          <p className="text-xl text-white/90 font-medium">
            한국어 학습 RPG <span className="text-purple-300">(Game Nhập Vai Học Tiếng Hàn)</span>
          </p>
        </div>

        {/* Start Button */}
        <div className="animate-scale-in" style={{ animationDelay: "0.2s" }}>
          <Button
            onClick={() => navigate("/auth")}
            className="px-12 py-6 text-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-full shadow-lg shadow-orange-500/30 transition-all hover:scale-105"
          >
            시작하기 (Bắt đầu)
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
            (Bắt đầu hành trình học tiếng Hàn đầy đam mê. Luyện tập các tình huống thực tế thông qua 
            hội thoại AI, xây dựng từ vựng và chuẩn bị chứng chỉ TOPIK 
            khi trải nghiệm cuộc sống hàng ngày ở Seoul.)
          </p>

          {/* Feature List */}
          <div className="mt-6 space-y-3">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="w-2 h-2 rounded-full bg-neon-cyan" />
                <span className="text-white">{feature.titleKo}</span>
                <span className="text-purple-300 text-sm">({feature.titleVi})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-white/40 text-sm animate-fade-in" style={{ animationDelay: "0.6s" }}>
          2025 Powered by LUKATO AI
        </p>
      </div>
    </div>
  );
};

export default Landing;
