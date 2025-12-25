import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Copy, Check, Share2, Info } from "lucide-react";

interface RoomCodeCollapsibleProps {
  roomCode: string;
  copied: boolean;
  onCopy: () => void;
  onShare: () => void;
  gradientFrom: string;
  gradientTo: string;
  bgGlow1: string;
  bgGlow2: string;
}

export default function RoomCodeCollapsible({
  roomCode,
  copied,
  onCopy,
  onShare,
  gradientFrom,
  gradientTo,
  bgGlow1,
  bgGlow2,
}: RoomCodeCollapsibleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-card via-card to-muted/30 border-border/50">
      <div className="absolute inset-0 -z-10">
        <div className={`absolute top-0 right-0 w-48 h-48 ${bgGlow1} rounded-full blur-3xl`} />
        <div className={`absolute bottom-0 left-0 w-40 h-40 ${bgGlow2} rounded-full blur-3xl`} />
      </div>

      <div className="p-5">
        {/* Main Share Buttons - Always Visible */}
        <div className="flex justify-center gap-3 mb-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={onCopy} variant="outline" className="gap-2 h-12 text-base font-semibold">
              {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              {copied ? "Đã copy!" : "Copy link mời"}
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              onClick={onShare} 
              className={`gap-2 h-12 text-base font-semibold bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white`}
            >
              <Share2 className="w-5 h-5" />
              Chia sẻ
            </Button>
          </motion.div>
        </div>

        {/* Helper Text */}
        <p className="text-center text-sm text-muted-foreground mb-3">
          Gửi link cho bạn bè để tự động tham gia!
        </p>

        {/* Collapsible Room Code Section */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-sm text-muted-foreground"
        >
          <Info className="w-4 h-4" />
          <span>Mã phòng (chỉ dùng khi link không hoạt động)</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-4 text-center">
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Mã phòng</p>
                <p className={`text-3xl sm:text-4xl font-mono font-black tracking-[0.3em] bg-gradient-to-r ${gradientFrom} ${gradientTo} bg-clip-text text-transparent`}>
                  {roomCode}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Bạn bè có thể nhập mã này nếu link tự động không hoạt động
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}
