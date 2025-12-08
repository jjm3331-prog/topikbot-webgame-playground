import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { ChevronLeft } from "lucide-react";
import seoulHero from "@/assets/seoul-hero.jpg";

const authSchema = z.object({
  email: z.string().email("올바른 이메일을 입력해주세요"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  username: z.string().min(2, "닉네임은 최소 2자 이상이어야 합니다").optional(),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validationData = isLogin 
        ? { email, password } 
        : { email, password, username };
      
      authSchema.parse(validationData);

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate("/game");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/game`,
            data: { username },
          },
        });
        if (error) throw error;
        toast({
          title: "회원가입 성공! (Đăng ký thành công!)",
          description: "게임을 시작합니다. (Bắt đầu trò chơi.)",
        });
        navigate("/game");
      }
    } catch (error: any) {
      let message = error.message;
      if (error.message?.includes("already registered")) {
        message = "이미 가입된 이메일입니다. (Email đã được đăng ký.)";
      } else if (error.message?.includes("Invalid login")) {
        message = "이메일 또는 비밀번호가 틀렸습니다. (Email hoặc mật khẩu không đúng.)";
      }
      toast({
        title: "오류 (Lỗi)",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-[100dvh] flex flex-col"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(26, 26, 46, 0.95)), url(${seoulHero})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <button 
          onClick={() => navigate("/")} 
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">돌아가기</span>
        </button>
        <div className="flex items-center gap-2">
          <img src="/favicon.png" alt="LUKATO" className="w-8 h-8 rounded-full" />
          <span className="font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-cyan">
            LUKATO
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="font-display text-3xl md:text-4xl text-white mb-2">
              Game{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-cyan">
                LUKATO
              </span>
            </h1>
            <p className="text-base text-white/80">
              {isLogin ? "로그인하고 게임을 시작하세요!" : "회원가입하고 게임을 시작하세요!"}
            </p>
            <p className="text-sm text-purple-300 italic">
              {isLogin ? "Đăng nhập để bắt đầu!" : "Đăng ký và bắt đầu trò chơi!"}
            </p>
          </div>

          {/* Auth Card */}
          <div className="glass-card p-8 rounded-2xl animate-scale-in">
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div>
                  <Input
                    type="text"
                    placeholder="닉네임 (Tên người dùng)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12"
                    required={!isLogin}
                  />
                </div>
              )}
              <div>
                <Input
                  type="email"
                  placeholder="이메일 (Email)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12"
                  required
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="비밀번호 (Mật khẩu)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-neon-pink to-neon-purple hover:opacity-90 text-white font-bold text-lg"
              >
                {loading ? (
                  <span className="animate-pulse">처리중...</span>
                ) : isLogin ? (
                  "게임 시작 / Bắt đầu"
                ) : (
                  "회원가입 / Đăng ký"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-purple-300 hover:text-white transition-colors text-sm"
              >
                {isLogin
                  ? "계정이 없으신가요? 회원가입"
                  : "이미 계정이 있으신가요? 로그인"}
              </button>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-white/30 text-xs mt-6">
            © 2025 Powered by LUKATO AI
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
