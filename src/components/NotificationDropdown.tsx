import { useState, useEffect } from "react";
import { Bell, Check, X, Megaphone, Gift, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
  is_read?: boolean;
}

interface NotificationDropdownProps {
  userId?: string;
}

export const NotificationDropdown = ({ userId }: NotificationDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    if (userId) {
      fetchNotifications();
      fetchReadNotifications();
    }
  }, [userId]);

  const fetchNotifications = async () => {
    // Fetch global notifications and user-specific notifications
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .or(`is_global.eq.true,target_user_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setNotifications(data);
    }
  };

  const fetchReadNotifications = async () => {
    if (!userId) return;
    
    const { data, error } = await supabase
      .from("user_notification_reads")
      .select("notification_id")
      .eq("user_id", userId);

    if (!error && data) {
      const ids = data.map(r => r.notification_id);
      setReadIds(ids);
    }
  };

  useEffect(() => {
    const unread = notifications.filter(n => !readIds.includes(n.id)).length;
    setUnreadCount(unread);
  }, [notifications, readIds]);

  const markAsRead = async (notificationId: string) => {
    if (!userId || readIds.includes(notificationId)) return;

    await supabase.from("user_notification_reads").insert({
      user_id: userId,
      notification_id: notificationId,
    });

    setReadIds(prev => [...prev, notificationId]);
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    
    const unreadNotifications = notifications.filter(n => !readIds.includes(n.id));
    
    for (const notification of unreadNotifications) {
      await supabase.from("user_notification_reads").insert({
        user_id: userId,
        notification_id: notification.id,
      });
    }
    
    setReadIds(prev => [...prev, ...unreadNotifications.map(n => n.id)]);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "announcement":
        return <Megaphone className="w-4 h-4 text-primary" />;
      case "reward":
        return <Gift className="w-4 h-4 text-korean-green" />;
      default:
        return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: vi });
    } catch {
      return "";
    }
  };

  return (
    <div className="relative">
      {/* Bell Button with Badge */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </Button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />
            
            {/* Dropdown Content */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Thông báo
                </h3>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs text-primary hover:text-primary/80"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Đánh dấu đã đọc
                  </Button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">Chưa có thông báo nào</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {notifications.map((notification) => {
                      const isRead = readIds.includes(notification.id);
                      return (
                        <motion.li
                          key={notification.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          onClick={() => markAsRead(notification.id)}
                          className={`px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                            !isRead ? "bg-primary/5" : ""
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className="mt-0.5">
                              {getTypeIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className={`text-sm font-medium truncate ${
                                  !isRead ? "text-foreground" : "text-muted-foreground"
                                }`}>
                                  {notification.title}
                                </h4>
                                {!isRead && (
                                  <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-[10px] text-muted-foreground/70 mt-1">
                                {formatTime(notification.created_at)}
                              </p>
                            </div>
                          </div>
                        </motion.li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-2 border-t border-border bg-muted/30">
                  <p className="text-xs text-center text-muted-foreground">
                    Hiển thị {notifications.length} thông báo gần nhất
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationDropdown;
