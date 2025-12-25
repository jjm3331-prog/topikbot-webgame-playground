import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronDown, LogIn, LogOut, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MegaMenuOverlay } from "@/components/MegaMenuOverlay";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { safeSignOut } from "@/lib/safeSignOut";


interface CleanHeaderProps {
  /** Optional override. If omitted, header will auto-detect login state from the current session. */
  isLoggedIn?: boolean;
  /** Optional override for displaying name in header. */
  username?: string;
}

export const CleanHeader = ({ isLoggedIn, username }: CleanHeaderProps) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const [sessionLoggedIn, setSessionLoggedIn] = useState(false);
  const [sessionUsername, setSessionUsername] = useState<string | undefined>();

  const effectiveLoggedIn = isLoggedIn ?? sessionLoggedIn;
  const displayName = useMemo(() => username ?? sessionUsername, [username, sessionUsername]);

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const hasSession = !!session?.user;
      setSessionLoggedIn(hasSession);
      setUserId(session?.user?.id);

      if (session?.user?.id && !username) {
        const { data } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", session.user.id)
          .single();
        setSessionUsername(data?.username);
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const hasSession = !!session?.user;
      setSessionLoggedIn(hasSession);
      setUserId(session?.user?.id);

      if (!hasSession) {
        setSessionUsername(undefined);
        return;
      }

      if (session?.user?.id && !username) {
        setTimeout(() => {
          supabase
            .from("profiles")
            .select("username")
            .eq("id", session.user.id)
            .single()
            .then(({ data }) => setSessionUsername(data?.username));
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [username]);

  const handleLogout = async () => {
    setIsMenuOpen(false);

    await safeSignOut();

    toast({
      title: "Đã đăng xuất",
      description: "Hẹn gặp lại bạn!",
    });
    navigate("/");
  };

  return (
    <>
      <header className="sticky top-0 z-50 h-[64px] bg-background border-b border-border">
        <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Brand */}
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => {
              setIsMenuOpen(false);
              navigate(effectiveLoggedIn ? "/dashboard" : "/");
            }}
            aria-label="Go to home"
          >
            <span className="text-xl sm:text-2xl">🇰🇷</span>
            <span className="font-heading font-bold text-lg sm:text-xl text-foreground whitespace-nowrap">LUKATO AI</span>
            <span className="hidden sm:block text-card-caption text-muted-foreground">Học tiếng Hàn #1 VN</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />

            {effectiveLoggedIn ? (
              <>
                <NotificationDropdown userId={userId} />

                {displayName && (
                  <Button
                    variant="secondary"
                    onClick={() => navigate("/profile")}
                    className="hidden md:flex h-10 rounded-full px-4 gap-2"
                  >
                    <User className="w-4 h-4" />
                    <span className="max-w-[140px] truncate text-card-caption font-medium">{displayName}</span>
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="hidden sm:inline-flex h-10 rounded-full text-card-caption"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="ml-2">Đăng xuất</span>
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate("/auth")} size="sm" className="h-8 sm:h-10 rounded-full text-badge sm:text-card-caption px-3 sm:px-4">
                <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="ml-1.5">Đăng nhập</span>
              </Button>
            )}

            {/* Menu button (THPT AI 스타일) */}
            <Button
              variant="ghost"
              onClick={() => setIsMenuOpen((v) => !v)}
              className="h-10 rounded-full px-3 gap-2"
              aria-expanded={isMenuOpen}
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
              <span className="hidden sm:inline">Menu</span>
              <motion.span
                animate={{ rotate: isMenuOpen ? 180 : 0 }}
                transition={{ duration: 0.18 }}
                className="inline-flex"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.span>
            </Button>
          </div>
        </div>
      </header>

      <MegaMenuOverlay
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        isLoggedIn={effectiveLoggedIn}
        onLogout={handleLogout}
      />
    </>
  );
};

export default CleanHeader;

