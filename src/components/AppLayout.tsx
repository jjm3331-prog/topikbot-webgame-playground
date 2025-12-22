import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import NotificationBell from "@/components/NotificationBell";
import AppSidebar from "@/components/AppSidebar";
import { safeSignOut } from "@/lib/safeSignOut";


interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", session.user.id)
          .single();
        if (data) {
          setUsername(data.username);
        }
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await safeSignOut();
    toast({
      title: "Đăng xuất thành công",
      description: "Hẹn gặp lại bạn!",
    });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Sidebar */}
      <AppSidebar 
        username={username}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-70'}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-background/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-4">
          {/* Left side - Mobile menu button */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            {/* Logo for mobile */}
            <div 
              className="flex items-center gap-2 lg:hidden cursor-pointer"
              onClick={() => navigate("/")}
            >
              <span className="text-xl">🇰🇷</span>
              <span className="font-heading font-bold text-foreground">LUKATO</span>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationBell />
            
            {username && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border">
                <User className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground max-w-[100px] truncate">
                  {username}
                </span>
              </div>
            )}
            
            <Button 
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
