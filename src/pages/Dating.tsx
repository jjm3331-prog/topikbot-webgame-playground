import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  ChevronLeft, Heart, X, MessageCircle, Send, ImageIcon, Sparkles,
  Crown, Loader2, Gift, Gamepad2, Star, Camera
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";

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
  // Female profiles (20)
  { id: 1, name: "서연", age: 24, job: "패션 디자이너", mbti: "ENFP", intro: "맛집 탐방 좋아해요! 같이 카페 투어 하실 분~ ☕", image: female01 },
  { id: 2, name: "지민", age: 26, job: "마케팅 매니저", mbti: "INTJ", intro: "음악이랑 영화 좋아해요. 취향 공유할 사람 찾아요 🎵", image: female02 },
  { id: 3, name: "수아", age: 23, job: "대학원생", mbti: "INFJ", intro: "한강에서 야경 보면서 이야기 나누고 싶어요 🌃", image: female03 },
  { id: 4, name: "유나", age: 25, job: "피아니스트", mbti: "ISFJ", intro: "클래식 음악 좋아하시는 분 있나요? 🎹", image: female04 },
  { id: 5, name: "하은", age: 24, job: "유튜버", mbti: "ESFP", intro: "맛집 브이로그 찍으러 같이 가실 분~ 📹", image: female05 },
  { id: 6, name: "예진", age: 27, job: "변호사", mbti: "ENTJ", intro: "지적인 대화 좋아해요. 토론 상대 찾아요 ⚖️", image: female01 },
  { id: 7, name: "소희", age: 22, job: "아이돌 연습생", mbti: "ESFJ", intro: "데뷔 준비 중이에요! 응원해주실 분~ 🌟", image: female02 },
  { id: 8, name: "민지", age: 28, job: "의사", mbti: "ISTJ", intro: "바쁜 일상 속 힐링 같이 할 사람 찾아요 🏥", image: female03 },
  { id: 9, name: "채원", age: 25, job: "교사", mbti: "ENFJ", intro: "아이들 가르치는 게 행복해요. 교육에 관심 있으신 분? 📚", image: female04 },
  { id: 10, name: "다현", age: 23, job: "모델", mbti: "ESTP", intro: "패션쇼 끝나고 같이 맛집 가실 분~ 👗", image: female05 },
  { id: 11, name: "지수", age: 26, job: "스타트업 CEO", mbti: "ENTP", intro: "같이 사업 아이디어 나눌 사람? 💡", image: female01 },
  { id: 12, name: "나연", age: 24, job: "바리스타", mbti: "ISFP", intro: "커피 한잔의 여유 좋아하시는 분 ☕", image: female02 },
  { id: 13, name: "윤아", age: 29, job: "승무원", mbti: "ESFP", intro: "세계 여행 같이 할 사람 찾아요 ✈️", image: female03 },
  { id: 14, name: "수빈", age: 22, job: "웹툰 작가", mbti: "INFP", intro: "그림 그리면서 이야기 나눠요 🎨", image: female04 },
  { id: 15, name: "혜진", age: 27, job: "요리사", mbti: "ISFJ", intro: "맛있는 음식 해드릴게요! 🍳", image: female05 },
  { id: 16, name: "은지", age: 25, job: "댄서", mbti: "ESFP", intro: "춤추는 거 좋아하시는 분? 💃", image: female01 },
  { id: 17, name: "아린", age: 23, job: "간호사", mbti: "ISFJ", intro: "따뜻한 마음으로 케어해드릴게요 💗", image: female02 },
  { id: 18, name: "세라", age: 26, job: "방송작가", mbti: "ENTP", intro: "재밌는 이야기 많아요! 📺", image: female03 },
  { id: 19, name: "하나", age: 24, job: "플로리스트", mbti: "INFP", intro: "꽃과 함께 힐링해요 🌸", image: female04 },
  { id: 20, name: "리사", age: 25, job: "DJ", mbti: "ESTP", intro: "클럽에서 만나요! 🎧", image: female05 },
  
  // Male profiles (20)
  { id: 21, name: "민준", age: 27, job: "스타트업 개발자", mbti: "INTP", intro: "코딩하다 지치면 같이 산책해요 🚶‍♂️", image: male01 },
  { id: 22, name: "현우", age: 25, job: "웹툰 작가", mbti: "ISFP", intro: "예술적인 감성 공유할 사람 있나요? 🎨", image: male02 },
  { id: 23, name: "재현", age: 26, job: "모델", mbti: "ESTP", intro: "운동 좋아해요! 같이 헬스 가실 분~ 💪", image: male03 },
  { id: 24, name: "준서", age: 24, job: "뮤지션", mbti: "INFP", intro: "밤새 음악 이야기 나눌 사람 구해요 🎸", image: male04 },
  { id: 25, name: "도윤", age: 28, job: "영화감독", mbti: "ENFJ", intro: "좋은 영화 추천해드릴게요! 영화 얘기해요 🎬", image: male05 },
  { id: 26, name: "서준", age: 29, job: "변호사", mbti: "INTJ", intro: "진지한 대화 좋아해요. 깊은 이야기 나눠요 ⚖️", image: male01 },
  { id: 27, name: "시우", age: 23, job: "아이돌 연습생", mbti: "ESFJ", intro: "곧 데뷔해요! 팬 1호 되실 분? 🌟", image: male02 },
  { id: 28, name: "예준", age: 30, job: "의사", mbti: "ISTJ", intro: "건강하게 오래 함께할 사람 찾아요 🏥", image: male03 },
  { id: 29, name: "지호", age: 26, job: "교사", mbti: "ENFJ", intro: "함께 성장할 수 있는 사람 찾아요 📚", image: male04 },
  { id: 30, name: "건우", age: 25, job: "헬스 트레이너", mbti: "ESTP", intro: "건강한 라이프스타일 함께해요 💪", image: male05 },
  { id: 31, name: "우진", age: 27, job: "요리사", mbti: "ISFP", intro: "맛있는 음식으로 행복을 선물해요 👨‍🍳", image: male01 },
  { id: 32, name: "하준", age: 24, job: "파일럿", mbti: "ISTJ", intro: "하늘을 날며 세계를 여행해요 ✈️", image: male02 },
  { id: 33, name: "성민", age: 28, job: "건축가", mbti: "INTJ", intro: "아름다운 공간을 디자인해요 🏛️", image: male03 },
  { id: 34, name: "동현", age: 25, job: "사진작가", mbti: "INFP", intro: "순간을 영원히 담아요 📷", image: male04 },
  { id: 35, name: "태양", age: 26, job: "프로게이머", mbti: "ISTP", intro: "게임 같이 할 사람? 🎮", image: male05 },
  { id: 36, name: "은호", age: 27, job: "은행원", mbti: "ESTJ", intro: "안정적인 미래 함께 만들어요 🏦", image: male01 },
  { id: 37, name: "준혁", age: 24, job: "바텐더", mbti: "ESFP", intro: "칵테일 한잔 어때요? 🍸", image: male02 },
  { id: 38, name: "현서", age: 29, job: "작곡가", mbti: "INFJ", intro: "감성적인 음악으로 마음을 전해요 🎼", image: male03 },
  { id: 39, name: "지민", age: 25, job: "수의사", mbti: "ISFJ", intro: "동물을 사랑하는 따뜻한 마음 🐾", image: male04 },
  { id: 40, name: "승우", age: 26, job: "유튜버", mbti: "ENTP", intro: "재밌는 콘텐츠 같이 만들어요! 📹", image: male05 },
];

const Dating = () => {
  const { t } = useTranslation();
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
      content: t('dating.greeting', { name: currentMatch?.name })
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
        toast({ title: t('dating.photoGenerated', '💕 커플 사진 생성 완료!'), description: t('dating.checkAlbum', '앨범에서 확인하세요!') });
      }
    } catch (error) {
      console.error('Photo generation error:', error);
      toast({ title: t('dating.photoGenerationFailed', '사진 생성 실패'), description: t('common.tryAgain', '다시 시도해주세요'), variant: "destructive" });
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
          title: data.affinityChange > 0 ? t('dating.affinityUp', { value: data.affinityChange }) : t('dating.affinityDown', { value: data.affinityChange }),
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
      toast({ title: t('common.error', '오류 발생'), description: t('common.tryAgain', '다시 시도해주세요'), variant: "destructive" });
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
    toast({ title: t('dating.miniGameComplete', '🎮 미니게임 완료!'), description: t('dating.affinityBonus', { bonus }) });
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-pink-900 via-purple-900 to-[#0f0f23] flex flex-col">
      <CleanHeader />
      
      {/* Modals */}
      <AnimatePresence>
        {showSpin && <LuckySpin onReward={handleSpinReward} canSpin={canSpin} onClose={() => setShowSpin(false)} />}
        {showMbti && currentMatch && <MbtiCompatibility npcName={currentMatch.name} npcMbti={currentMatch.mbti} onClose={() => setShowMbti(false)} />}
        {showMiniGame && currentMatch && <MiniGame npcName={currentMatch.name} onComplete={handleMiniGameComplete} onClose={() => setShowMiniGame(false)} />}
        {showEnding && currentMatch && <SecretEnding ending={showEnding} npcName={currentMatch.name} npcImage={currentMatch.image} onClose={() => setShowEnding(null)} />}
      </AnimatePresence>

      <main className="flex-1 max-w-md mx-auto w-full relative overflow-hidden">

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
                <h2 className="text-2xl font-bold text-white mb-2">{t('dating.noMoreProfiles', '더 이상 프로필이 없어요!')}</h2>
                <Button onClick={() => setProfiles([...NPC_PROFILES])} className="bg-pink-500 hover:bg-pink-600">{t('dating.restart', '다시 시작')}</Button>
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
                  <MessageCircle className="w-5 h-5 mr-2" />{t('dating.startChat', '대화 시작하기')}
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
                <Button size="sm" variant="outline" onClick={() => setShowMbti(true)} className="flex-1 text-xs border-purple-500/50 text-purple-300">🔮 {t('dating.mbti', 'MBTI')}</Button>
                <Button size="sm" variant="outline" onClick={() => setShowMiniGame(true)} className="flex-1 text-xs border-green-500/50 text-green-300">
                  <Gamepad2 className="w-3 h-3 mr-1" />{t('dating.miniGame', '게임')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowSpin(true)} className="flex-1 text-xs border-yellow-500/50 text-yellow-300">🎰 {t('dating.spin', '스핀')}</Button>
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
                <Input value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()} placeholder={t('dating.inputPlaceholder', '메시지 입력...')} className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40" disabled={isLoading} />
                <Button onClick={sendMessage} disabled={isLoading || !inputMessage.trim()} className="bg-gradient-to-r from-pink-500 to-purple-500"><Send className="w-5 h-5" /></Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ALBUM PHASE */}
        {phase === 'album' && (
          <motion.div key="album" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 h-[calc(100dvh-70px)] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4 text-center">💕 {t('dating.album', '커플 앨범')}</h2>
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
                <p className="text-white/50">{t('dating.albumEmpty', '호감도 100%를 달성하면')}<br />{t('dating.albumEmptyDesc', 'AI 커플 사진이 생성돼요!')}</p>
              </div>
            )}
            <Button onClick={() => setPhase('swipe')} className="w-full mt-6 bg-pink-500 hover:bg-pink-600">{t('dating.backToSwipe', '스와이프로')}</Button>
          </motion.div>
        )}

        {/* ENDINGS PHASE */}
        {phase === 'endings' && (
          <motion.div key="endings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 h-[calc(100dvh-70px)] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4 text-center">🎬 {t('dating.endings', '엔딩 컬렉션')}</h2>
            {unlockedEndings.length > 0 ? (
              <div className="space-y-4">
                {unlockedEndings.map((ending, idx) => (
                  <motion.div key={idx} initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="bg-white/10 rounded-xl p-4 flex items-center gap-4">
                    <img src={ending.npcImage} alt={ending.npcName} className="w-16 h-16 rounded-full object-cover" />
                    <div>
                      <p className="text-white font-bold">{ending.npcName}</p>
                      <p className="text-pink-300 text-sm">{ending.type === 'romantic' ? t('dating.endingRomantic', '💕 로맨틱') : ending.type === 'friend' ? t('dating.endingFriend', '🤝 베프') : ending.type === 'tsundere' ? t('dating.endingTsundere', '😤 츤데레') : t('dating.endingDramatic', '🎬 드라마틱')} {t('dating.ending', '엔딩')}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Star className="w-16 h-16 text-white/30 mb-4" />
                <p className="text-white/50">{t('dating.noEndings', '아직 해금된 엔딩이 없어요')}<br />{t('dating.noEndingsDesc', '호감도 100%를 달성하세요!')}</p>
              </div>
            )}
            <Button onClick={() => setPhase('swipe')} className="w-full mt-6 bg-purple-500 hover:bg-purple-600">{t('dating.backToSwipe', '스와이프로')}</Button>
          </motion.div>
        )}
      </AnimatePresence>
      </main>
      <AppFooter />
    </div>
  );
};

export default Dating;
