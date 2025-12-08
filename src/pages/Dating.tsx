import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  ChevronLeft,
  Heart,
  X,
  MessageCircle,
  Send,
  ImageIcon,
  Sparkles,
  Crown,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type GamePhase = 'swipe' | 'match' | 'chat' | 'album';

interface DateProfile {
  id: number;
  name: string;
  age: number;
  job: string;
  mbti: string;
  intro: string;
  image: string;
}

interface ChatMessage {
  role: 'user' | 'npc';
  content: string;
}

const NPC_PROFILES: DateProfile[] = [
  {
    id: 1,
    name: "서연",
    age: 24,
    job: "패션 디자이너",
    mbti: "ENFP",
    intro: "맛집 탐방 좋아해요! 같이 카페 투어 하실 분~ ☕",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop&crop=faces"
  },
  {
    id: 2,
    name: "지민",
    age: 26,
    job: "마케팅 매니저",
    mbti: "INTJ",
    intro: "음악이랑 영화 좋아해요. 취향 공유할 사람 찾아요 🎵",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop&crop=faces"
  },
  {
    id: 3,
    name: "수아",
    age: 23,
    job: "대학원생",
    mbti: "INFJ",
    intro: "한강에서 야경 보면서 이야기 나누고 싶어요 🌃",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=600&fit=crop&crop=faces"
  },
  {
    id: 4,
    name: "민준",
    age: 27,
    job: "스타트업 개발자",
    mbti: "INTP",
    intro: "코딩하다 지치면 같이 산책해요 🚶‍♂️",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=faces"
  },
  {
    id: 5,
    name: "현우",
    age: 25,
    job: "웹툰 작가",
    mbti: "ISFP",
    intro: "예술적인 감성 공유할 사람 있나요? 🎨",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop&crop=faces"
  }
];

const Dating = () => {
  const [phase, setPhase] = useState<GamePhase>('swipe');
  const [profiles, setProfiles] = useState<DateProfile[]>([...NPC_PROFILES]);
  const [currentMatch, setCurrentMatch] = useState<DateProfile | null>(null);
  const [affinity, setAffinity] = useState(30);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unlockedPhotos, setUnlockedPhotos] = useState<string[]>([]);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const currentProfile = profiles[profiles.length - 1];

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!currentProfile) return;
    
    setSwipeDirection(direction);
    
    setTimeout(() => {
      if (direction === 'right') {
        // Match!
        setCurrentMatch(currentProfile);
        setPhase('match');
      }
      
      setProfiles(prev => prev.slice(0, -1));
      setSwipeDirection(null);
    }, 300);
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      handleSwipe('right');
    } else if (info.offset.x < -threshold) {
      handleSwipe('left');
    }
  };

  const startChat = () => {
    setPhase('chat');
    setAffinity(30);
    setMessages([
      {
        role: 'npc',
        content: `안녕~ 나는 ${currentMatch?.name}이야! 프로필 보고 관심 생겼어? 😊\n(Xin chào~ Mình là ${currentMatch?.name}! Bạn thấy profile mình thú vị à? 😊)`
      }
    ]);
  };

  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isLoading || !currentMatch) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('dating-chat', {
        body: {
          message: userMessage,
          npcName: currentMatch.name,
          npcMbti: currentMatch.mbti,
          npcJob: currentMatch.job,
          currentAffinity: affinity,
          conversationHistory: messages.slice(-6).map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
          }))
        }
      });

      if (error) throw error;

      const newAffinity = Math.max(0, Math.min(100, affinity + data.affinityChange));
      setAffinity(newAffinity);
      
      setMessages(prev => [...prev, { role: 'npc', content: data.response }]);

      // Show affinity change toast
      if (data.affinityChange > 0) {
        toast({
          title: `💕 호감도 +${data.affinityChange}`,
          description: data.reason,
        });
      } else if (data.affinityChange < 0) {
        toast({
          title: `💔 호감도 ${data.affinityChange}`,
          description: data.reason,
          variant: "destructive"
        });
      }

      // Check for 100% affinity
      if (newAffinity >= 100) {
        setTimeout(() => {
          toast({
            title: "🎉 축하해요! / Chúc mừng!",
            description: `${currentMatch.name}와(과) 연인이 되었어요! 비밀 앨범이 해금되었습니다!`,
          });
          setUnlockedPhotos(prev => [...prev, currentMatch.image]);
        }, 1000);
      }

    } catch (error) {
      console.error('Dating chat error:', error);
      toast({
        title: "오류 발생",
        description: "다시 시도해주세요",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [inputMessage, currentMatch, affinity, messages, toast, isLoading]);

  const getAffinityColor = () => {
    if (affinity >= 80) return 'from-red-500 to-pink-500';
    if (affinity >= 50) return 'from-pink-400 to-pink-500';
    return 'from-gray-400 to-gray-500';
  };

  const resetAndGoBack = () => {
    setPhase('swipe');
    setProfiles([...NPC_PROFILES]);
    setCurrentMatch(null);
    setMessages([]);
    setAffinity(30);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-900 via-purple-900 to-gray-900 max-w-md mx-auto relative overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => phase === 'swipe' ? navigate("/game") : resetAndGoBack()} 
            className="text-white/70 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-white font-medium">
            {phase === 'album' ? '비밀 앨범 / Album bí mật' : 'Seoul Love Signal 💕'}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPhase('album')}
          className="text-pink-300 hover:text-pink-200"
        >
          <ImageIcon className="w-5 h-5" />
        </Button>
      </header>

      <AnimatePresence mode="wait">
        {/* SWIPE PHASE */}
        {phase === 'swipe' && (
          <motion.div
            key="swipe"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 h-[calc(100dvh-70px)] flex flex-col"
          >
            {profiles.length > 0 ? (
              <>
                <div className="relative flex-1 flex items-center justify-center">
                  <AnimatePresence>
                    {currentProfile && (
                      <motion.div
                        key={currentProfile.id}
                        className="absolute w-full max-w-sm"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={handleDragEnd}
                        animate={{
                          x: swipeDirection === 'left' ? -500 : swipeDirection === 'right' ? 500 : 0,
                          rotate: swipeDirection === 'left' ? -20 : swipeDirection === 'right' ? 20 : 0,
                          opacity: swipeDirection ? 0 : 1
                        }}
                        transition={{ duration: 0.3 }}
                        whileDrag={{ scale: 1.05 }}
                      >
                        <div className="bg-white/10 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-white/20">
                          <div className="relative h-96">
                            <img
                              src={currentProfile.image}
                              alt={currentProfile.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-6">
                              <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-3xl font-bold text-white">{currentProfile.name}</h2>
                                <span className="text-white/80 text-xl">{currentProfile.age}</span>
                              </div>
                              <p className="text-pink-300 font-medium">{currentProfile.job}</p>
                              <span className="inline-block mt-2 px-3 py-1 bg-purple-500/50 rounded-full text-sm text-white font-medium">
                                {currentProfile.mbti}
                              </span>
                            </div>
                          </div>
                          <div className="p-4 bg-black/20">
                            <p className="text-white/90 text-center">{currentProfile.intro}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Swipe Buttons */}
                <div className="flex justify-center gap-8 pb-8">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleSwipe('left')}
                    className="w-16 h-16 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center"
                  >
                    <X className="w-8 h-8 text-red-400" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleSwipe('right')}
                    className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-red-500 flex items-center justify-center shadow-lg shadow-pink-500/30"
                  >
                    <Heart className="w-8 h-8 text-white" />
                  </motion.button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Sparkles className="w-16 h-16 text-pink-400 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">더 이상 프로필이 없어요!</h2>
                <p className="text-white/60 mb-4">Không còn profile nào nữa!</p>
                <Button onClick={() => setProfiles([...NPC_PROFILES])} className="bg-pink-500 hover:bg-pink-600">
                  다시 시작 / Bắt đầu lại
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* MATCH PHASE */}
        {phase === 'match' && currentMatch && (
          <motion.div
            key="match"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-lg z-20 p-8"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <Heart className="w-24 h-24 text-pink-500 mx-auto mb-4 fill-pink-500" />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-red-400 mb-2"
              >
                It's a Match!
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-white/80 mb-2"
              >
                {currentMatch.name}님과 매칭되었어요!
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-white/60 text-sm mb-6"
              >
                Bạn đã match với {currentMatch.name}!
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
              >
                <Button
                  onClick={startChat}
                  className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-lg px-8"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  대화 시작하기 / Bắt đầu trò chuyện
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* CHAT PHASE */}
        {phase === 'chat' && currentMatch && (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-[calc(100dvh-70px)]"
          >
            {/* Chat Header with Affinity */}
            <div className="p-4 border-b border-white/10 bg-black/20">
              <div className="flex items-center gap-3">
                <img
                  src={currentMatch.image}
                  alt={currentMatch.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-pink-400"
                />
                <div className="flex-1">
                  <h3 className="text-white font-bold">{currentMatch.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Heart className="w-4 h-4 text-pink-400" />
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full bg-gradient-to-r ${getAffinityColor()}`}
                        animate={{ width: `${affinity}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <span className="text-pink-400 text-sm font-bold">{affinity}%</span>
                  </div>
                </div>
                {affinity >= 100 && (
                  <Crown className="w-6 h-6 text-yellow-400" />
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-br-none'
                        : 'bg-white/10 text-white rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 p-3 rounded-2xl rounded-bl-none">
                    <Loader2 className="w-5 h-5 text-pink-400 animate-spin" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10 bg-black/20">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="메시지 입력... / Nhập tin nhắn..."
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  disabled={isLoading}
                />
                <Button
                  onClick={sendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-center text-white/40 text-xs mt-2">
                자연스러운 한국어로 대화하면 호감도가 올라가요! / Nói tiếng Hàn tự nhiên để tăng độ thân mật!
              </p>
            </div>
          </motion.div>
        )}

        {/* ALBUM PHASE */}
        {phase === 'album' && (
          <motion.div
            key="album"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 h-[calc(100dvh-70px)]"
          >
            <h2 className="text-xl font-bold text-white mb-4 text-center">
              🔐 비밀 앨범 / Album bí mật
            </h2>
            <p className="text-white/60 text-center text-sm mb-6">
              호감도 100%를 달성하면 사진이 해금됩니다
              <br />
              Đạt 100% độ thân mật để mở khóa ảnh
            </p>

            {unlockedPhotos.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {unlockedPhotos.map((photo, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="aspect-square rounded-xl overflow-hidden border-2 border-pink-400"
                  >
                    <img src={photo} alt="Unlocked" className="w-full h-full object-cover" />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-24 h-24 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                  <ImageIcon className="w-12 h-12 text-white/30" />
                </div>
                <p className="text-white/50">아직 해금된 사진이 없어요</p>
                <p className="text-white/30 text-sm">Chưa có ảnh nào được mở khóa</p>
              </div>
            )}

            <Button
              onClick={() => setPhase('swipe')}
              className="w-full mt-6 bg-pink-500 hover:bg-pink-600"
            >
              스와이프로 돌아가기 / Quay lại swipe
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dating;
