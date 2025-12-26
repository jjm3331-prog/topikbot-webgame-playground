import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { ChevronLeft, Loader2, Sparkles, Shield, Users, Play, ArrowRight, Eye, EyeOff, Check, Mail } from "lucide-react";
import { motion } from "framer-motion";

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// Validation schema with dynamic messages
const createAuthSchema = (t: (key: string) => string) => z.object({
  email: z.string().email(t('auth.invalidEmail') || "Please enter a valid email"),
  password: z.string().min(6, t('auth.passwordMinLength') || "Password must be at least 6 characters"),
  username: z.string().min(2, t('auth.usernameMinLength') || "Username must be at least 2 characters").optional(),
});

type AuthMode = "login" | "signup" | "forgot";

const Auth = () => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Get redirect URL from query params (for invite links)
  // Note: OAuth callbacks may drop the query string, so we persist it in sessionStorage.
  const redirectFromQuery = searchParams.get("redirect");
  const redirectToRaw = redirectFromQuery || sessionStorage.getItem("auth_redirect") || "/dashboard";
  const redirectTo = redirectToRaw.startsWith("/") ? redirectToRaw : "/dashboard";

  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  useEffect(() => {
    if (redirectFromQuery) sessionStorage.setItem("auth_redirect", redirectFromQuery);
  }, [redirectFromQuery]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const authSchema = createAuthSchema(t);

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        setResetEmailSent(true);
        toast({
          title: t('auth.emailSent'),
          description: t('auth.resetLinkSentDesc'),
        });
        return;
      }

      const validationData = mode === "login" 
        ? { email, password } 
        : { email, password, username };
      
      authSchema.parse(validationData);

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        sessionStorage.removeItem("auth_redirect");
        navigate(redirectTo);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${redirectTo}`,
            data: { username },
          },
        });
        if (error) throw error;
        toast({
          title: t('auth.signupSuccess'),
          description: t('auth.welcomeToLukato'),
        });
        sessionStorage.removeItem("auth_redirect");
        navigate(redirectTo);
      }
    } catch (error: any) {
      let message = error.message;
      if (error.message?.includes("already registered")) {
        message = t('auth.alreadyRegistered');
      } else if (error.message?.includes("Invalid login")) {
        message = t('auth.invalidLogin');
      }
      toast({
        title: t('auth.errorOccurred'),
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
      const productionUrl = 'https://game.topikbot.kr';
      // For Google OAuth, we need to handle redirect after OAuth completes
      // Store the intended redirect in sessionStorage so we can use it after OAuth callback
      if (redirectTo !== "/dashboard") {
        sessionStorage.setItem("auth_redirect", redirectTo);
      }
      // IMPORTANT: Use hash routing (/#/) for OAuth redirect since this is a HashRouter app
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${productionUrl}/#${redirectTo}`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: t('auth.errorOccurred'),
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "login": return t('auth.login');
      case "signup": return t('auth.createAccount');
      case "forgot": return t('auth.resetPassword');
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "login": return t('auth.welcomeBack');
      case "signup": return t('auth.startJourney');
      case "forgot": return t('auth.enterEmail');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col relative overflow-hidden">
      {/* Background decorations - matching Landing page */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="blob-primary w-[600px] h-[600px] -top-40 -right-40" />
        <div className="blob-secondary w-[500px] h-[500px] -bottom-40 -left-40" />
        <motion.div 
          animate={{ y: [0, -30, 0], x: [0, 20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 right-1/3 w-[200px] h-[200px] bg-korean-purple/10 rounded-full blur-3xl" 
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4 md:p-6">
        <button 
          onClick={() => mode === "forgot" ? setMode("login") : navigate("/")} 
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">{t('auth.goBack')}</span>
        </button>
        <div className="flex items-center gap-2">
          <img src="/favicon.png" alt="LUKATO" className="w-8 h-8 rounded-lg" />
          <span className="font-heading font-bold text-foreground">
            LUKATO AI
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-md">
          {/* Title Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-center mb-8"
          >
            <div className="badge-premium mb-6 inline-flex">
              <Sparkles className="w-4 h-4" />
              <span>{t('brand.platformNo1')}</span>
            </div>
            <h1 className="font-heading font-bold text-3xl md:text-4xl text-foreground mb-3">
              {getTitle()}
            </h1>
            <p className="text-muted-foreground">
              {getDescription()}
            </p>
          </motion.div>

          {/* Auth Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="premium-card p-8"
          >
              {resetEmailSent && mode === "forgot" ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{t('auth.checkEmail')}</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {t('auth.resetLinkSent', { email })}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMode("login");
                      setResetEmailSent(false);
                    }}
                  >
                    {t('auth.backToLogin')}
                  </Button>
                </div>
              ) : (
              <form onSubmit={handleAuth} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('auth.username')}</label>
                    <Input
                      type="text"
                      placeholder={t('auth.enterUsername')}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-12 bg-muted/50 border-border focus:border-primary transition-colors"
                      required={mode === "signup"}
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('auth.email')}</label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 bg-muted/50 border-border focus:border-primary transition-colors"
                    required
                  />
                </div>
                
                {mode !== "forgot" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('auth.password')}</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder={t('auth.enterPassword')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 bg-muted/50 border-border focus:border-primary transition-colors pr-12"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === "login" && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-sm text-primary hover:underline"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 btn-primary text-primary-foreground text-base font-semibold rounded-xl mt-6"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : mode === "forgot" ? (
                    <>
                      <Mail className="w-5 h-5 mr-2" />
                      {t('auth.sendResetLink')}
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      {mode === "login" ? t('auth.login') : t('auth.signup')}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {mode !== "forgot" && (
              <>
                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-border"></div>
                  <span className="text-muted-foreground text-sm">{t('common.or')}</span>
                  <div className="flex-1 h-px bg-border"></div>
                </div>

                {/* Google Login */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full h-12 border-2 border-border hover:border-primary/50 bg-card font-medium flex items-center justify-center gap-3 rounded-xl transition-all"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <GoogleIcon />
                      <span>{t('auth.continueWithGoogle')}</span>
                    </>
                  )}
                </Button>

                {/* Toggle login/signup */}
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setMode(mode === "login" ? "signup" : "login")}
                    className="text-primary hover:text-primary/80 transition-colors text-sm font-medium"
                  >
                    {mode === "login"
                      ? t('auth.noAccount')
                      : t('auth.hasAccount')}
                  </button>
                </div>
              </>
            )}
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4 mt-8 text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-korean-green" />
              <span className="text-xs font-medium">{t('auth.sslSecurity')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-korean-blue" />
              <span className="text-xs font-medium">{t('auth.students')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-korean-purple" />
              <span className="text-xs font-medium">{t('auth.freeForever')}</span>
            </div>
          </motion.div>

          {/* Footer */}
          <p className="text-center text-muted-foreground text-xs mt-8">
            {t('auth.copyright')}
          </p>
        </div>
      </main>
    </div>
  );
};

export default Auth;
