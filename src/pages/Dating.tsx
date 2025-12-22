import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  ChevronLeft, Heart, X, MessageCircle, Send, ImageIcon, Sparkles,
  Crown, Loader2, Gift, Gamepad2, Star, Camera
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Components
import EmotionEmoji from "@/components/dating/EmotionEmoji";
import LuckySpin from "@/components/dating/LuckySpin";
import MbtiCompatibility from "@/components/dating/MbtiCompatibility";
import MiniGame from "@/components/dating/MiniGame";
import SecretEnding, { EndingType } from "@/components/dating/SecretEnding";

// NPC Images
import male01 from "@/assets/dating/male-01.webp";
import male02 from "@/assets/dating/male-02.jpg";
import male03 from "@/assets/dating/male-03.jpg";
import male04 from "@/assets/dating/male-04.jpg";
import male05 from "@/assets/dating/male-05.jfif";
import female01 from "@/assets/dating/female-01.jpg";
import female02 from "@/assets/dating/female-02.jpg";
import female03 from "@/assets/dating/female-03.jfif";
import female04 from "@/assets/dating/female-04.jfif";
import female05 from "@/assets/dating/female-05.jfif";

type GamePhase = 'swipe' | 'match' | 'chat' | 'album' | 'endings';

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

interface UnlockedEnding {
  npcName: string;
  npcImage: string;
  type: EndingType;
}

const NPC_PROFILES: DateProfile[] = [
  { id: 1, name: "서연", age: 24, job: "패션 디자이너", mbti: "ENFP", intro: "맛집 탐방 좋아해요! 같이 카페 투어 하실 분~ ☕", image: female01 },
  { id: 2, name: "지민", age: 26, job: "마케팅 매니저", mbti: "INTJ", intro: "음악이랑 영화 좋아해요. 취향 공유할 사람 찾아요 🎵", image: female02 },
  { id: 3, name: "수아", age: 23, job: "대학원생", mbti: "INFJ", intro: "한강에서 야경 보면서 이야기 나누고 싶어요 🌃", image: female03 },
  { id: 4, name: "유나", age: 25, job: "피아니스트", mbti: "ISFJ", intro: "클래식 음악 좋아하시는 분 있나요? 🎹", image: female04 },
  { id: 5, name: "하은", age: 24, job: "유튜버", mbti: "ESFP", intro: "맛집 브이로그 찍으러 같이 가실 분~ 📹", image: female05 },
  { id: 6, name: "민준", age: 27, job: "스타트업 개발자", mbti: "INTP", intro: "코딩하다 지치면 같이 산책해요 🚶‍♂️", image: male01 },
  { id: 7, name: "현우", age: 25, job: "웹툰 작가", mbti: "ISFP", intro: "예술적인 감성 공유할 사람 있나요? 🎨", image: male02 },
  { id: 8, name: "재현", age: 26, job: "모델", mbti: "ESTP", intro: "운동 좋아해요! 같이 헬스 가실 분~ 💪", image: male03 },
  { id: 9, name: "준서", age: 24, job: "뮤지션", mbti: "INFP", intro: "밤새 음악 이야기 나눌 사람 구해요 🎸", image: male04 },
  { id: 10, name: "도윤", age: 28, job: "영화감독", mbti: "ENFJ", intro: "좋은 영화 추천해드릴게요! 영화 얘기해요 🎬", image: male05 },
];

const Dating = () => {
  const [phase, setPhase] = useState<GamePhase>('swipe');
  const [profiles, setProfiles] = useState<DateProfile[]>([...NPC_PROFILES]);
  const [currentMatch, setCurrentMatch] = useState<DateProfile | null>(null);
  const [affinity, setAffinity] = useState(30);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  // New feature states
  const [showSpin, setShowSpin] = useState(false);
  const [canSpin, setCanSpin] = useState(true);
  const [showMbti, setShowMbti] = useState(false);
  const [showMiniGame, setShowMiniGame] = useState(false);
  const [showEnding, setShowEnding] = useState<EndingType | null>(null);
  const [unlockedEndings, setUnlockedEndings] = useState<UnlockedEnding[]>([]);
  const [couplePhotos, setCouplePhotos] = useState<string[]>([]);
  const [isGeneratingPhoto, setIsGeneratingPhoto] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentProfile = profiles[profiles.length - 1];

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!currentProfile) return;
    setSwipeDirection(direction);
    setTimeout(() => {
      if (direction === 'right') {
        setCurrentMatch(currentProfile);
        setPhase('match');
      }
      setProfiles(prev => prev.slice(0, -1));
      setSwipeDirection(null);
    }, 300);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) handleSwipe('right');
    else if (info.offset.x < -100) handleSwipe('left');
  };

  const startChat = () => {
    setPhase('chat');
    setAffinity(30);
    setMessages([{
      role: 'npc',
      content: `안녕~ 나는 ${currentMatch?.name}이야! 프로필 보고 관심 생겼어? 😊\n(Xin chào~ Mình là ${currentMatch?.name}! Bạn thấy profile mình thú vị à? 😊)`
    }]);
  };

  const determineEnding = (): EndingType => {
    const msgCount = messages.length;
    if (msgCount > 15) return 'dramatic';
    if (msgCount > 10) return 'romantic';
    if (msgCount > 5) return 'tsundere';
    return 'friend';
  };

  const generateCouplePhoto = async () => {
    if (!currentMatch || isGeneratingPhoto) return;
    setIsGeneratingPhoto(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-couple-photo', {
        body: { npcName: currentMatch.name, npcJob: currentMatch.job }
      });
      
      if (error) throw error;
      if (data.imageUrl) {
        setCouplePhotos(prev => [...prev, data.imageUrl]);
        toast({ title: "💕 커플 사진 생성 완료!", description: "앨범에서 확인하세요!" });
      }
    } catch (error) {
      console.error('Photo generation error:', error);
      toast({ title: "사진 생성 실패", description: "다시 시도해주세요", variant: "destructive" });
    } finally {
      setIsGeneratingPhoto(false);
    }
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

      if (data.affinityChange !== 0) {
        toast({
          title: data.affinityChange > 0 ? `💕 호감도 +${data.affinityChange}` : `💔 호감도 ${data.affinityChange}`,
          description: data.reason,
          variant: data.affinityChange < 0 ? "destructive" : undefined
        });
      }

      if (newAffinity >= 100) {
        const endingType = determineEnding();
        setUnlockedEndings(prev => [...prev, { npcName: currentMatch.name, npcImage: currentMatch.image, type: endingType }]);
        setTimeout(() => {
          setShowEnding(endingType);
          generateCouplePhoto();
        }, 1000);
      }
    } catch (error) {
      console.error('Dating chat error:', error);
      toast({ title: "오류 발생", description: "다시 시도해주세요", variant: "destructive" });
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

  const handleSpinReward = (reward: any) => {
    if (reward.type === 'affinity') {
      setAffinity(prev => Math.min(100, prev + reward.value));
    }
    setCanSpin(false);
  };

  const handleMiniGameComplete = (bonus: number) => {
    setAffinity(prev => Math.min(100, prev + bonus));
    toast({ title: `🎮 미니게임 완료!`, description: `호감도 +${bonus}` });
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-pink-900 via-purple-900 to-[#0f0f23] max-w-md mx-auto relative overflow-hidden">
      {/* Modals */}
      <AnimatePresence>
        {showSpin && <LuckySpin onReward={handleSpinReward} canSpin={canSpin} onClose={() => setShowSpin(false)} />}
        {showMbti && currentMatch && <MbtiCompatibility npcName={currentMatch.name} npcMbti={currentMatch.mbti} onClose={() => setShowMbti(false)} />}
        {showMiniGame && currentMatch && <MiniGame npcName={currentMatch.name} onComplete={handleMiniGameComplete} onClose={() => setShowMiniGame(false)} />}
        {showEnding && currentMatch && <SecretEnding ending={showEnding} npcName={currentMatch.name} npcImage={currentMatch.image} onClose={() => setShowEnding(null)} />}
      </AnimatePresence>

      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-2">
          <button onClick={() => phase === 'swipe' ? navigate("/dashboard") : resetAndGoBack()} className="text-white/70 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-white font-medium">Seoul Love Signal 💕</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowSpin(true)} className="text-yellow-300 hover:text-yellow-200">
            <Gift className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPhase('endings')} className="text-purple-300 hover:text-purple-200">
            <Star className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPhase('album')} className="text-pink-300 hover:text-pink-200">
            <ImageIcon className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {/* SWIPE PHASE */}
        {phase === 'swipe' && (
          <motion.div key="swipe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 h-[calc(100dvh-70px)] flex flex-col">
            {profiles.length > 0 ? (
              <>
                <div className="relative flex-1 flex items-center justify-center">
                  <AnimatePresence>
                    {currentProfile && (
                      <motion.div key={currentProfile.id} className="absolute w-full max-w-sm" drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={handleDragEnd}
                        animate={{ x: swipeDirection === 'left' ? -500 : swipeDirection === 'right' ? 500 : 0, rotate: swipeDirection === 'left' ? -20 : swipeDirection === 'right' ? 20 : 0, opacity: swipeDirection ? 0 : 1 }}
                        transition={{ duration: 0.3 }} whileDrag={{ scale: 1.05 }}>
                        <div className="bg-white/10 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-white/20">
                          <div className="relative h-96">
                            <img src={currentProfile.image} alt={currentProfile.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-6">
                              <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-3xl font-bold text-white">{currentProfile.name}</h2>
                                <span className="text-white/80 text-xl">{currentProfile.age}</span>
                              </div>
                              <p className="text-pink-300 font-medium">{currentProfile.job}</p>
                              <span className="inline-block mt-2 px-3 py-1 bg-purple-500/50 rounded-full text-sm text-white font-medium">{currentProfile.mbti}</span>
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
                <div className="flex justify-center gap-8 pb-8">
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleSwipe('left')} className="w-16 h-16 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
                    <X className="w-8 h-8 text-red-400" />
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleSwipe('right')} className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-red-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
                    <Heart className="w-8 h-8 text-white" />
                  </motion.button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Sparkles className="w-16 h-16 text-pink-400 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">더 이상 프로필이 없어요!</h2>
                <Button onClick={() => setProfiles([...NPC_PROFILES])} className="bg-pink-500 hover:bg-pink-600">다시 시작</Button>
              </div>
            )}
          </motion.div>
        )}

        {/* MATCH PHASE */}
        {phase === 'match' && currentMatch && (
          <motion.div key="match" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-lg z-20 p-8">
            <div className="text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ delay: 0.2 }}>
                <Heart className="w-24 h-24 text-pink-500 mx-auto mb-4 fill-pink-500" />
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-red-400 mb-4">
                It's a Match!
              </motion.h1>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
                <Button onClick={startChat} className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-lg px-8">
                  <MessageCircle className="w-5 h-5 mr-2" />대화 시작하기
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* CHAT PHASE */}
        {phase === 'chat' && currentMatch && (
          <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-[calc(100dvh-70px)]">
            <div className="p-4 border-b border-white/10 bg-black/20">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img src={currentMatch.image} alt={currentMatch.name} className="w-12 h-12 rounded-full object-cover border-2 border-pink-400" />
                  <div className="absolute -top-1 -right-1"><EmotionEmoji affinity={affinity} /></div>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold">{currentMatch.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Heart className="w-4 h-4 text-pink-400" />
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div className={`h-full bg-gradient-to-r ${getAffinityColor()}`} animate={{ width: `${affinity}%` }} transition={{ duration: 0.5 }} />
                    </div>
                    <span className="text-pink-400 text-sm font-bold">{affinity}%</span>
                  </div>
                </div>
                {affinity >= 100 && <Crown className="w-6 h-6 text-yellow-400" />}
              </div>
              {/* Action Buttons */}
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => setShowMbti(true)} className="flex-1 text-xs border-purple-500/50 text-purple-300">🔮 MBTI</Button>
                <Button size="sm" variant="outline" onClick={() => setShowMiniGame(true)} className="flex-1 text-xs border-green-500/50 text-green-300">
                  <Gamepad2 className="w-3 h-3 mr-1" />게임
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowSpin(true)} className="flex-1 text-xs border-yellow-500/50 text-yellow-300">🎰 스핀</Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-br-none' : 'bg-white/10 text-white rounded-bl-none'}`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </motion.div>
              ))}
              {isLoading && <div className="flex justify-start"><div className="bg-white/10 p-3 rounded-2xl rounded-bl-none"><Loader2 className="w-5 h-5 text-pink-400 animate-spin" /></div></div>}
            </div>

            <div className="p-4 border-t border-white/10 bg-black/20">
              <div className="flex gap-2">
                <Input value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()} placeholder="메시지 입력..." className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40" disabled={isLoading} />
                <Button onClick={sendMessage} disabled={isLoading || !inputMessage.trim()} className="bg-gradient-to-r from-pink-500 to-purple-500"><Send className="w-5 h-5" /></Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ALBUM PHASE */}
        {phase === 'album' && (
          <motion.div key="album" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 h-[calc(100dvh-70px)] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4 text-center">💕 커플 앨범 / Album Couple</h2>
            {couplePhotos.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {couplePhotos.map((photo, idx) => (
                  <motion.div key={idx} initial={{ scale: 0 }} animate={{ scale: 1 }} className="aspect-square rounded-xl overflow-hidden border-2 border-pink-400">
                    <img src={photo} alt="Couple" className="w-full h-full object-cover" />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Camera className="w-16 h-16 text-white/30 mb-4" />
                <p className="text-white/50">호감도 100%를 달성하면<br />AI 커플 사진이 생성돼요!</p>
              </div>
            )}
            <Button onClick={() => setPhase('swipe')} className="w-full mt-6 bg-pink-500 hover:bg-pink-600">스와이프로 / Quay lại</Button>
          </motion.div>
        )}

        {/* ENDINGS PHASE */}
        {phase === 'endings' && (
          <motion.div key="endings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 h-[calc(100dvh-70px)] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4 text-center">🎬 엔딩 컬렉션</h2>
            {unlockedEndings.length > 0 ? (
              <div className="space-y-4">
                {unlockedEndings.map((ending, idx) => (
                  <motion.div key={idx} initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="bg-white/10 rounded-xl p-4 flex items-center gap-4">
                    <img src={ending.npcImage} alt={ending.npcName} className="w-16 h-16 rounded-full object-cover" />
                    <div>
                      <p className="text-white font-bold">{ending.npcName}</p>
                      <p className="text-pink-300 text-sm">{ending.type === 'romantic' ? '💕 로맨틱' : ending.type === 'friend' ? '🤝 베프' : ending.type === 'tsundere' ? '😤 츤데레' : '🎬 드라마틱'} 엔딩</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Star className="w-16 h-16 text-white/30 mb-4" />
                <p className="text-white/50">아직 해금된 엔딩이 없어요<br />호감도 100%를 달성하세요!</p>
              </div>
            )}
            <Button onClick={() => setPhase('swipe')} className="w-full mt-6 bg-purple-500 hover:bg-purple-600">스와이프로 / Quay lại</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dating;
