import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { ChevronLeft, Loader2 } from "lucide-react";

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);
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

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Production 도메인으로 고정 (lovable.app 스테이징 URL 문제 방지)
      const productionUrl = 'https://game.topikbot.kr';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${productionUrl}/game`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "오류 (Lỗi)",
        description: error.message,
        variant: "destructive",
      });
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

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-white/20"></div>
              <span className="text-white/50 text-sm">또는 / Hoặc</span>
              <div className="flex-1 h-px bg-white/20"></div>
            </div>

            {/* Google Login */}
            <Button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-12 bg-white hover:bg-gray-100 text-gray-700 font-medium flex items-center justify-center gap-3 border border-gray-300"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <GoogleIcon />
                  <span>Google로 시작하기 / Đăng nhập với Google</span>
                </>
              )}
            </Button>

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
