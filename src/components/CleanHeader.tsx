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
      <header className="sticky top-0 z-50 min-h-[56px] sm:min-h-[64px] bg-background border-b border-border safe-area-top">
        <div className="h-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 flex items-center justify-between gap-1 sm:gap-2 py-2">
          {/* Brand */}
          <div
            className="flex items-center gap-1.5 sm:gap-2.5 cursor-pointer shrink-0 min-w-0"
            onClick={() => {
              setIsMenuOpen(false);
              navigate(effectiveLoggedIn ? "/dashboard" : "/");
            }}
            aria-label="Go to home"
          >
            <span className="text-base sm:text-xl md:text-2xl shrink-0">🇰🇷</span>
            <span className="font-heading font-bold text-sm sm:text-lg md:text-xl text-foreground whitespace-nowrap">LUKATO AI</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
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
              <Button onClick={() => navigate("/auth")} size="sm" className="h-7 sm:h-8 md:h-10 rounded-full text-[11px] sm:text-xs md:text-sm px-2 sm:px-3 md:px-4">
                <LogIn className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 shrink-0" />
                <span className="ml-1 sm:ml-1.5 whitespace-nowrap">Đăng nhập</span>
              </Button>
            )}

            {/* Menu button */}
            <Button
              variant="ghost"
              onClick={() => setIsMenuOpen((v) => !v)}
              className="h-7 sm:h-8 md:h-10 rounded-full px-2 sm:px-3 gap-1 sm:gap-2"
              aria-expanded={isMenuOpen}
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline text-sm">Menu</span>
              <motion.span
                animate={{ rotate: isMenuOpen ? 180 : 0 }}
                transition={{ duration: 0.18 }}
                className="hidden sm:inline-flex"
              >
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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

