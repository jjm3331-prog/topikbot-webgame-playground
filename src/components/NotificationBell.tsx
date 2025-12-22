import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
}

interface NotificationRead {
  notification_id: string;
}

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      setUserId(session.user.id);

      // Fetch notifications
      const { data: notifs } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (notifs) {
        setNotifications(notifs);
      }

      // Fetch read status
      const { data: reads } = await supabase
        .from("user_notification_reads")
        .select("notification_id")
        .eq("user_id", session.user.id);

      if (reads) {
        setReadIds(new Set(reads.map((r: NotificationRead) => r.notification_id)));
      }
    };

    fetchData();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel("notifications-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev.slice(0, 9)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAsRead = async (notificationId: string) => {
    if (!userId || readIds.has(notificationId)) return;

    await supabase.from("user_notification_reads").insert({
      user_id: userId,
      notification_id: notificationId,
    });

    setReadIds((prev) => new Set([...prev, notificationId]));
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    const unreadNotifs = notifications.filter((n) => !readIds.has(n.id));
    
    for (const notif of unreadNotifs) {
      await supabase.from("user_notification_reads").insert({
        user_id: userId,
        notification_id: notif.id,
      });
    }

    setReadIds(new Set(notifications.map((n) => n.id)));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-korean-green/20 text-korean-green";
      case "warning":
        return "bg-korean-yellow/20 text-korean-yellow";
      case "error":
        return "bg-destructive/20 text-destructive";
      default:
        return "bg-primary/20 text-primary";
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold text-foreground">Thông báo</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-primary"
            >
              Đánh dấu tất cả đã đọc
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Không có thông báo nào
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => markAsRead(notif.id)}
                className={`p-3 border-b border-border last:border-b-0 cursor-pointer transition-colors hover:bg-muted/50 ${
                  !readIds.has(notif.id) ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getTypeColor(
                      notif.type
                    )}`}
                  >
                    {notif.type}
                  </span>
                  {!readIds.has(notif.id) && (
                    <span className="w-2 h-2 bg-primary rounded-full mt-1" />
                  )}
                </div>
                <p className="font-medium text-foreground text-sm mt-1">
                  {notif.title}
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {notif.message}
                </p>
                <p className="text-muted-foreground/70 text-[10px] mt-1">
                  {formatDistanceToNow(new Date(notif.created_at), {
                    addSuffix: true,
                    locale: vi,
                  })}
                </p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
