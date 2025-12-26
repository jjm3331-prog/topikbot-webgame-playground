import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ChevronRight, Sparkles, Flame, Music, Star, AlertTriangle, Users, Loader2 } from 'lucide-react';
import CleanHeader from '@/components/CleanHeader';
import AppFooter from '@/components/AppFooter';

// NPC 캐릭터 이미지 임포트
import ceoDoyoon from '@/assets/manager/ceo-kangdoyoon.jpg';
import traineeMinseo from '@/assets/manager/trainee-minseo.jpg';
import trainerJiyeon from '@/assets/manager/trainer-jiyeon.jpg';
import traineeSumin from '@/assets/manager/trainee-sumin.jpg';
import pdMinho from '@/assets/manager/pd-minho.jpg';

// 배경 이미지 임포트
import bgPracticeRoom from '@/assets/manager/bg-practice-room.jpg';
import bgRecordingStudio from '@/assets/manager/bg-recording-studio.jpg';
import bgBroadcastStation from '@/assets/manager/bg-broadcast-station.jpg';
import bgCeoOffice from '@/assets/manager/bg-ceo-office.jpg';
import bgDormitory from '@/assets/manager/bg-dormitory.jpg';
import bgBackstage from '@/assets/manager/bg-backstage.jpg';

type GroupConcept = 'fresh' | 'crush' | 'hiphop' | 'retro' | 'dark' | 'band';
type GroupGender = 'male' | 'female' | 'mixed';
type GamePhase = 'setup' | 'loading' | 'prologue' | 'dialogue' | 'mission' | 'scoring' | 'result';
type Emotion = '분노' | '슬픔' | '냉정' | '불안' | '희망';

interface DialogueLine {
  speaker: string;
  emotion: Emotion;
  text_ko: string;
  text_vi: string;
  action?: string;
}

interface MissionData {
  intro_ko: string;
  intro_vi: string;
  prompt_ko: string;
  prompt_vi: string;
  tips: string[];
  forbidden: string[];
}

interface StoryData {
  chapter: { number: number; title_ko: string; title_vi: string; day: string; location: string };
  scene: { prologue_ko: string; prologue_vi: string; setting_ko: string; setting_vi: string };
  dialogue: DialogueLine[];
  mission: MissionData;
}

interface GameStats {
  stat_mental: number;
  stat_chemistry: number;
  stat_media_tone: number;
  gauge_rumor: number;
}

// NPC 초상화 매핑
const NPC_PORTRAITS: Record<string, string> = {
  '강도윤': ceoDoyoon,
  '강도윤 대표': ceoDoyoon,
  '민서': traineeMinseo,
  '탈락 연습생 민서': traineeMinseo,
  '박지연': trainerJiyeon,
  '박지연 트레이너': trainerJiyeon,
  '트레이너 박지연': trainerJiyeon,
  '수민': traineeSumin,
  '연습생 수민': traineeSumin,
  '하늘': traineeSumin,
  '연습생 하늘': traineeSumin,
  '최민호': pdMinho,
  '예능 PD 최민호': pdMinho,
  'PD 최민호': pdMinho,
};

// 배경 이미지 매핑
const LOCATION_BACKGROUNDS: Record<string, string> = {
  '연습실': bgPracticeRoom,
  '연습실 A': bgPracticeRoom,
  '연습실 B': bgPracticeRoom,
  '녹음실': bgRecordingStudio,
  '방송국': bgBroadcastStation,
  '방송국 회의실': bgBroadcastStation,
  '대표실': bgCeoOffice,
  '숙소': bgDormitory,
  '기숙사': bgDormitory,
  '백스테이지': bgBackstage,
};

// 위치로 배경 이미지 찾기
function getLocationBackground(location: string): string {
  if (LOCATION_BACKGROUNDS[location]) return LOCATION_BACKGROUNDS[location];
  
  for (const [key, value] of Object.entries(LOCATION_BACKGROUNDS)) {
    if (location.includes(key) || key.includes(location)) {
      return value;
    }
  }
  return bgPracticeRoom; // 기본값
}

// NPC 이름으로 초상화 찾기
function getNpcPortrait(speaker: string): string | null {
  if (NPC_PORTRAITS[speaker]) return NPC_PORTRAITS[speaker];
  
  for (const [key, value] of Object.entries(NPC_PORTRAITS)) {
    if (speaker.includes(key) || key.includes(speaker)) {
      return value;
    }
  }
  return null;
}

const CONCEPT_OPTIONS = [
  { value: 'fresh' as GroupConcept, label_ko: '청량', label_vi: 'Tươi mát', icon: <Sparkles className="w-5 h-5" /> },
  { value: 'crush' as GroupConcept, label_ko: '크러시', label_vi: 'Crush', icon: <Flame className="w-5 h-5" /> },
  { value: 'hiphop' as GroupConcept, label_ko: '힙합', label_vi: 'Hip-hop', icon: <Music className="w-5 h-5" /> },
  { value: 'retro' as GroupConcept, label_ko: '레트로', label_vi: 'Retro', icon: <Star className="w-5 h-5" /> },
  { value: 'dark' as GroupConcept, label_ko: '다크', label_vi: 'Dark', icon: <AlertTriangle className="w-5 h-5" /> },
  { value: 'band' as GroupConcept, label_ko: '밴드', label_vi: 'Ban nhạc', icon: <Users className="w-5 h-5" /> }
];

const GENDER_OPTIONS = [
  { value: 'male' as GroupGender, label_ko: '남돌', label_vi: 'Nam' },
  { value: 'female' as GroupGender, label_ko: '여돌', label_vi: 'Nữ' },
  { value: 'mixed' as GroupGender, label_ko: '혼성', label_vi: 'Hỗn hợp' }
];

const EMOTION_EMOJIS: Record<Emotion, string> = {
  '분노': '😠',
  '슬픔': '😢',
  '냉정': '😐',
  '불안': '😰',
  '희망': '🥺'
};

export default function Manager() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [isLoading, setIsLoading] = useState(false);
  
  // 설정
  const [groupName, setGroupName] = useState('LUKATO');
  const [groupConcept, setGroupConcept] = useState<GroupConcept>('fresh');
  const [groupGender, setGroupGender] = useState<GroupGender>('mixed');
  
  // 게임 상태
  const [currentChapter, setCurrentChapter] = useState(1);
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [stats, setStats] = useState<GameStats>({
    stat_mental: 70,
    stat_chemistry: 60,
    stat_media_tone: 50,
    gauge_rumor: 0
  });
  
  // 미션 상태
  const [userInput, setUserInput] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [scoreResult, setScoreResult] = useState<any>(null);

  // 스토리 로드
  const loadStory = async (chapter: number) => {
    setPhase('loading');
    try {
      const { data, error } = await supabase.functions.invoke('manager-story', {
        body: {
          chapterNumber: chapter,
          groupName,
          groupGender,
          groupConcept,
          currentStats: stats
        }
      });

      if (error) throw error;
      
      setStoryData(data);
      setDialogueIndex(0);
      setPhase('prologue');
      
    } catch (error) {
      console.error('Story load error:', error);
      toast.error('스토리 로드 실패');
      setPhase('setup');
    }
  };

  // 게임 시작
  const startGame = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('로그인이 필요합니다');
        navigate('/auth');
        return;
      }

      await loadStory(1);
    } catch (error) {
      console.error('Game start error:', error);
      toast.error('게임 시작 실패');
    } finally {
      setIsLoading(false);
    }
  };

  // 프롤로그 → 대화로 진행
  const startDialogue = () => {
    setDialogueIndex(0);
    setPhase('dialogue');
  };

  // 다음 대사
  const nextDialogue = () => {
    if (!storyData) return;
    
    if (dialogueIndex < storyData.dialogue.length - 1) {
      setDialogueIndex(prev => prev + 1);
    } else {
      // 대화 끝 → 미션으로
      setPhase('mission');
    }
  };

  // 미션 제출
  const submitMission = async () => {
    if (!userInput.trim()) {
      toast.error('응답을 입력하세요');
      return;
    }

    setIsEvaluating(true);
    setPhase('scoring');

    try {
      const { data, error } = await supabase.functions.invoke('manager-evaluate', {
        body: {
          userResponse: userInput,
          chapterNumber: currentChapter,
          missionContext: storyData?.mission?.prompt_ko
        }
      });

      if (error) throw error;

      setScoreResult(data);
      
      // 스탯 변화 적용
      if (data.stat_changes) {
        setStats(prev => ({
          stat_mental: Math.max(0, Math.min(100, prev.stat_mental + (data.stat_changes.mental || 0))),
          stat_chemistry: Math.max(0, Math.min(100, prev.stat_chemistry + (data.stat_changes.chemistry || 0))),
          stat_media_tone: Math.max(0, Math.min(100, prev.stat_media_tone + (data.stat_changes.media_tone || 0))),
          gauge_rumor: Math.max(0, Math.min(100, prev.gauge_rumor + (data.stat_changes.rumor || 0)))
        }));
      }

    } catch (error) {
      console.error('Evaluation error:', error);
      toast.error('채점 실패');
      setPhase('mission');
    } finally {
      setIsEvaluating(false);
    }
  };

  // 다음 챕터 or 결과
  const proceedAfterScore = () => {
    if (currentChapter >= 3) {
      setPhase('result');
    } else {
      setCurrentChapter(prev => prev + 1);
      setUserInput('');
      setScoreResult(null);
      loadStory(currentChapter + 1);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col overflow-hidden">
      <CleanHeader />

      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {/* 설정 화면 */}
          {phase === 'setup' && (
            <SetupPhase
              groupName={groupName}
              setGroupName={setGroupName}
              groupGender={groupGender}
              setGroupGender={setGroupGender}
              groupConcept={groupConcept}
              setGroupConcept={setGroupConcept}
              isLoading={isLoading}
              onStart={startGame}
            />
          )}

          {/* 로딩 화면 */}
          {phase === 'loading' && (
            <LoadingPhase chapter={currentChapter} />
          )}

          {/* 프롤로그 화면 */}
          {phase === 'prologue' && storyData && (
            <ProloguePhase 
              storyData={storyData} 
              onContinue={startDialogue}
            />
          )}

          {/* 대화 화면 */}
          {phase === 'dialogue' && storyData && (
            <DialoguePhase
              storyData={storyData}
              dialogueIndex={dialogueIndex}
              stats={stats}
              onNext={nextDialogue}
            />
          )}

          {/* 미션 화면 */}
          {phase === 'mission' && storyData && (
            <MissionPhase
              storyData={storyData}
              stats={stats}
              userInput={userInput}
              setUserInput={setUserInput}
              onSubmit={submitMission}
            />
          )}

          {/* 채점 화면 */}
          {phase === 'scoring' && (
            <ScoringPhase
              isEvaluating={isEvaluating}
              scoreResult={scoreResult}
              onContinue={proceedAfterScore}
            />
          )}

          {/* 결과 화면 */}
          {phase === 'result' && (
            <ResultPhase stats={stats} onExit={() => navigate('/dashboard')} />
          )}
        </AnimatePresence>
      </main>
      <AppFooter />
    </div>
  );
}

// ================== 설정 화면 ==================
function SetupPhase({ 
  groupName, setGroupName, groupGender, setGroupGender, 
  groupConcept, setGroupConcept, isLoading, onStart 
}: any) {
  return (
    <motion.div
      key="setup"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full overflow-y-auto p-4"
    >
      <div className="max-w-md mx-auto space-y-6 pb-8">
        {/* 게임 소개 */}
        <div className="bg-gradient-to-br from-pink-500/10 to-purple-600/10 border border-pink-500/20 rounded-xl p-5 space-y-4">
          <div className="text-center">
            <h1 className="text-xl font-bold text-pink-400 mb-1">🎤 LUKATO 매니저</h1>
            <p className="text-sm text-purple-300">Quản lý LUKATO - K-POP 매니지먼트 RPG</p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <p className="font-medium text-zinc-200">📖 게임 소개 / Giới thiệu</p>
              <p className="text-zinc-400 mt-1">
                당신은 데뷔를 앞둔 K-POP 그룹의 매니저. 연습생 탈락 통보, 멘탈 관리, 방송 협상까지... 
                <span className="text-pink-400">당신의 한국어 실력이 그룹의 운명을 결정합니다.</span>
              </p>
              <p className="text-zinc-500 mt-1 text-xs">
                Bạn là quản lý của nhóm K-POP sắp debut. Từ thông báo loại, quản lý tinh thần, đến đàm phán phát sóng... 
                <span className="text-pink-400">Tiếng Hàn của bạn quyết định vận mệnh nhóm.</span>
              </p>
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-3">
              <p className="font-medium text-zinc-200">🎬 시즌 1: 데뷔 전쟁</p>
              <p className="text-zinc-400 mt-1">
                4주간의 데뷔 준비. 매 챕터마다 긴박한 상황에서 NPC와 대화하고, 
                <span className="text-yellow-400"> 한국어로 미션을 해결</span>하세요.
              </p>
              <p className="text-zinc-500 mt-1 text-xs">
                4 tuần chuẩn bị debut. Mỗi chương, đối thoại với NPC trong tình huống căng thẳng và 
                <span className="text-yellow-400"> hoàn thành nhiệm vụ bằng tiếng Hàn</span>.
              </p>
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-3">
              <p className="font-medium text-zinc-200">🎮 플레이 방식</p>
              <div className="text-zinc-400 mt-1 space-y-1">
                <p>1. 📺 스토리 시청 - 드라마처럼 상황 전개</p>
                <p>2. 💬 NPC 대화 - 감정과 맥락 이해</p>
                <p>3. 🎯 미션 수행 - 한국어로 응답</p>
                <p>4. 📊 채점 & 결과 - AI가 평가</p>
              </div>
            </div>
          </div>
        </div>


        {/* 설정 */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">그룹 설정</h2>
          <p className="text-zinc-400 text-sm">Thiết lập nhóm</p>
        </div>

        {/* 그룹명 */}
        <div className="space-y-2">
          <label className="text-sm text-zinc-400">그룹명 / Tên nhóm</label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:border-pink-500 focus:outline-none"
            maxLength={20}
          />
        </div>

        {/* 성별 */}
        <div className="space-y-2">
          <label className="text-sm text-zinc-400">성별 / Giới tính</label>
          <div className="grid grid-cols-3 gap-2">
            {GENDER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setGroupGender(opt.value)}
                className={`py-3 rounded-lg border transition-all ${
                  groupGender === opt.value
                    ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                    : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <div className="font-medium">{opt.label_ko}</div>
                <div className="text-xs text-zinc-500">{opt.label_vi}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 컨셉 */}
        <div className="space-y-2">
          <label className="text-sm text-zinc-400">컨셉 / Concept</label>
          <div className="grid grid-cols-3 gap-2">
            {CONCEPT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setGroupConcept(opt.value)}
                className={`py-3 rounded-lg border transition-all ${
                  groupConcept === opt.value
                    ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                    : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <div className="flex justify-center mb-1">{opt.icon}</div>
                <div className="text-sm font-medium">{opt.label_ko}</div>
                <div className="text-xs text-zinc-500">{opt.label_vi}</div>
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={onStart}
          disabled={isLoading}
          className="w-full py-6 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-lg font-bold"
        >
          {isLoading ? '로딩중...' : '게임 시작 / Bắt đầu'}
        </Button>
      </div>
    </motion.div>
  );
}

// ================== 로딩 화면 ==================
function LoadingPhase({ chapter }: { chapter: number }) {
  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col items-center justify-center"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
        className="w-16 h-16 border-4 border-pink-500/30 border-t-pink-500 rounded-full mb-6"
      />
      <h2 className="text-xl font-bold text-pink-400 mb-2">챕터 {chapter} 로딩중</h2>
      <p className="text-zinc-400 text-sm">스토리를 생성하고 있습니다...</p>
      <p className="text-zinc-500 text-xs mt-1">Đang tạo câu chuyện...</p>
    </motion.div>
  );
}

// ================== 프롤로그 화면 ==================
function ProloguePhase({ storyData, onContinue }: { 
  storyData: StoryData; onContinue: () => void;
}) {
  return (
    <motion.div
      key="prologue"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col"
    >
      <div className="absolute inset-0 -z-10">
        <img 
          src={getLocationBackground(storyData.chapter.location)} 
          alt={storyData.chapter.location}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-purple-950/50 to-black/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.15)_0%,transparent_60%)]" />
      </div>

      <motion.div 
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center pt-8 pb-4"
      >
        <div className="inline-block px-4 py-1 bg-pink-500/20 border border-pink-500/50 rounded-full text-pink-400 text-sm mb-3">
          {storyData.chapter.day}
        </div>
        <h1 className="text-3xl font-bold text-white mb-1">Chapter {storyData.chapter.number}</h1>
        <h2 className="text-xl text-pink-400">{storyData.chapter.title_ko}</h2>
        <p className="text-zinc-400 text-sm">{storyData.chapter.title_vi}</p>
        <p className="text-zinc-500 text-xs mt-2">📍 {storyData.chapter.location}</p>
      </motion.div>

      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="max-w-md text-center space-y-6 bg-black/40 backdrop-blur-sm p-6 rounded-2xl"
        >
          <p className="text-xl text-zinc-200 leading-relaxed font-medium">{storyData.scene.prologue_ko}</p>
          <p className="text-sm text-zinc-400">{storyData.scene.prologue_vi}</p>
          <div className="pt-4 text-zinc-500 text-sm">{storyData.scene.setting_ko}</div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="p-6"
      >
        <Button onClick={onContinue} className="w-full py-5 bg-gradient-to-r from-pink-600 to-purple-600 text-lg font-bold">
          시작하기 / Bắt đầu <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ================== 대화 화면 ==================
function DialoguePhase({ storyData, dialogueIndex, stats, onNext }: { 
  storyData: StoryData; dialogueIndex: number; stats: GameStats; onNext: () => void;
}) {
  const currentLine = storyData.dialogue[dialogueIndex];
  const progress = ((dialogueIndex + 1) / storyData.dialogue.length) * 100;

  return (
    <motion.div
      key="dialogue"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col"
    >
      <div className="absolute inset-0 -z-10">
        <img 
          src={getLocationBackground(storyData.chapter.location)} 
          alt={storyData.chapter.location}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-purple-950/40 to-black/80" />
      </div>

      <div className="p-3 bg-black/60 backdrop-blur-sm border-b border-zinc-700/50">
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="text-zinc-400">📍 {storyData.chapter.location}</span>
          <span className="text-pink-400">{dialogueIndex + 1} / {storyData.dialogue.length}</span>
        </div>
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
          />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          key={dialogueIndex}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          {getNpcPortrait(currentLine?.speaker || '') ? (
            <div className="relative mx-auto mb-4">
              <div className="w-32 h-32 rounded-full overflow-hidden border-3 border-purple-400/50 shadow-[0_0_50px_rgba(168,85,247,0.4)]">
                <img 
                  src={getNpcPortrait(currentLine?.speaker || '')!}
                  alt={currentLine?.speaker}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-zinc-800 rounded-full border-2 border-purple-400 flex items-center justify-center">
                <span className="text-xl">
                  {currentLine?.emotion ? EMOTION_EMOJIS[currentLine.emotion] || '😐' : '🎭'}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-400/50 flex items-center justify-center shadow-[0_0_50px_rgba(168,85,247,0.3)] mb-4">
              <span className="text-5xl">
                {currentLine?.emotion ? EMOTION_EMOJIS[currentLine.emotion] || '😐' : '🎭'}
              </span>
            </div>
          )}
          <div className="px-4 py-1.5 bg-zinc-800/80 rounded-full border border-zinc-600 inline-block">
            <span className="text-sm font-medium">{currentLine?.speaker}</span>
          </div>
          {currentLine?.action && (
            <p className="text-zinc-500 text-xs mt-2 italic">({currentLine.action})</p>
          )}
        </motion.div>
      </div>

      <motion.div 
        key={`dialogue-${dialogueIndex}`}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={onNext}
        className="mx-4 mb-4 p-5 bg-zinc-900/90 border border-zinc-700/50 rounded-2xl cursor-pointer hover:bg-zinc-800/90 transition-colors"
      >
        <p className="text-lg text-white leading-relaxed mb-3">{currentLine?.text_ko}</p>
        <p className="text-sm text-zinc-400">{currentLine?.text_vi}</p>
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="flex items-center justify-end gap-1 mt-3 text-pink-400 text-xs"
        >
          탭하여 계속 / Chạm để tiếp tục <ChevronRight className="w-3 h-3" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ================== 미션 화면 ==================
function MissionPhase({ storyData, stats, userInput, setUserInput, onSubmit }: {
  storyData: StoryData; stats: GameStats; userInput: string; setUserInput: (v: string) => void; onSubmit: () => void;
}) {
  const mission = storyData.mission;

  return (
    <motion.div key="mission" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col overflow-y-auto">
      <div className="absolute inset-0 -z-10">
        <img src={getLocationBackground(storyData.chapter.location)} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-purple-950/40 to-black/90" />
      </div>
      <div className="p-4 text-center border-b border-pink-500/30">
        <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="inline-flex items-center gap-2 px-4 py-1.5 bg-pink-500/20 border border-pink-500/50 rounded-full mb-3">
          <span className="text-xl">🎯</span><span className="text-pink-400 font-bold">MISSION</span>
        </motion.div>
        <h2 className="text-lg font-bold text-white">{storyData.chapter.title_ko}</h2>
      </div>
      <div className="flex-1 p-4 space-y-4">
        <div className="bg-zinc-900/80 border border-zinc-700/50 rounded-xl p-4">
          <h3 className="text-sm font-medium text-zinc-300 mb-2">📝 상황 / Tình huống</h3>
          <p className="text-white">{mission.intro_ko}</p>
          <p className="text-zinc-400 text-sm mt-2">{mission.intro_vi}</p>
        </div>
        <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/30 rounded-xl p-4">
          <h3 className="text-sm font-medium text-pink-300 mb-2">🎤 당신이 할 말 / Bạn cần nói</h3>
          <p className="text-pink-100 font-medium">{mission.prompt_ko}</p>
          <p className="text-pink-300/70 text-sm mt-2">{mission.prompt_vi}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <h4 className="text-xs font-medium text-green-400 mb-2">✓ 팁</h4>
            <ul className="text-xs text-green-300/80 space-y-1">{mission.tips?.map((t, i) => <li key={i}>• {t}</li>)}</ul>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <h4 className="text-xs font-medium text-red-400 mb-2">✗ 금지</h4>
            <ul className="text-xs text-red-300/80 space-y-1">{mission.forbidden?.map((f, i) => <li key={i}>• {f}</li>)}</ul>
          </div>
        </div>
        <div className="space-y-3">
          <textarea 
            value={userInput} 
            onChange={(e) => setUserInput(e.target.value)} 
            placeholder="한국어로 응답하세요... / Trả lời bằng tiếng Hàn..." 
            className="w-full bg-zinc-900/80 border-2 border-pink-500/30 rounded-xl px-4 py-3 resize-none h-28 focus:border-pink-500 focus:outline-none text-white placeholder:text-zinc-500" 
          />
          <Button onClick={onSubmit} disabled={!userInput.trim()} className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-lg font-bold disabled:opacity-50">
            제출하기 / Gửi ✓
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ================== 채점 화면 ==================
function ScoringPhase({ isEvaluating, scoreResult, onContinue }: {
  isEvaluating: boolean; scoreResult: any; onContinue: () => void;
}) {
  if (isEvaluating) {
    return (
      <motion.div
        key="scoring-loading"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full flex flex-col items-center justify-center"
      >
        <Loader2 className="w-12 h-12 text-pink-500 animate-spin mb-4" />
        <p className="text-lg text-white">채점 중...</p>
        <p className="text-sm text-zinc-400">Đang chấm điểm...</p>
      </motion.div>
    );
  }

  const score = scoreResult?.total_score || 0;
  const isSuccess = score >= 70;
  const isWarning = score >= 40 && score < 70;

  return (
    <motion.div
      key="scoring-result"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="h-full flex flex-col items-center justify-center p-6"
    >
      {/* 점수 원형 */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className={`w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold mb-6 ${
          isSuccess ? 'bg-green-500 shadow-[0_0_50px_rgba(34,197,94,0.5)]' :
          isWarning ? 'bg-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.5)]' :
          'bg-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)]'
        }`}
      >
        {score}
      </motion.div>

      {/* 결과 텍스트 */}
      <h2 className={`text-2xl font-bold mb-2 ${
        isSuccess ? 'text-green-400' : isWarning ? 'text-yellow-400' : 'text-red-400'
      }`}>
        {isSuccess ? '✓ 훌륭해요!' : isWarning ? '⚠ 아쉬워요' : '✗ 다시 도전!'}
      </h2>
      <p className="text-zinc-400 text-sm mb-6">
        {isSuccess ? 'Tuyệt vời!' : isWarning ? 'Hơi tiếc!' : 'Thử lại!'}
      </p>

      {/* 피드백 */}
      {scoreResult?.feedback_ko && (
        <div className="w-full max-w-md bg-zinc-800/80 rounded-xl p-4 mb-6 space-y-2">
          <p className="text-white">{scoreResult.feedback_ko}</p>
          <p className="text-zinc-400 text-sm">{scoreResult.feedback_vi}</p>
          {scoreResult.better_expression && (
            <p className="text-pink-400 text-sm mt-2">
              💡 더 좋은 표현: "{scoreResult.better_expression}"
            </p>
          )}
        </div>
      )}

      {/* 지표 변화 */}
      {scoreResult?.stat_changes && (
        <div className="flex gap-4 mb-6 text-sm">
          {scoreResult.stat_changes.mental !== 0 && (
            <span className={scoreResult.stat_changes.mental > 0 ? 'text-blue-400' : 'text-blue-600'}>
              멘탈 {scoreResult.stat_changes.mental > 0 ? '+' : ''}{scoreResult.stat_changes.mental}
            </span>
          )}
          {scoreResult.stat_changes.chemistry !== 0 && (
            <span className={scoreResult.stat_changes.chemistry > 0 ? 'text-green-400' : 'text-green-600'}>
              케미 {scoreResult.stat_changes.chemistry > 0 ? '+' : ''}{scoreResult.stat_changes.chemistry}
            </span>
          )}
        </div>
      )}

      <Button
        onClick={onContinue}
        className={`w-full max-w-md py-4 text-lg font-bold ${
          isSuccess ? 'bg-green-500 hover:bg-green-600' :
          isWarning ? 'bg-yellow-500 hover:bg-yellow-600 text-black' :
          'bg-red-500 hover:bg-red-600'
        }`}
      >
        다음으로 / Tiếp theo <ChevronRight className="w-5 h-5 ml-2" />
      </Button>
    </motion.div>
  );
}

// ================== 결과 화면 ==================
function ResultPhase({ stats, onExit }: { stats: GameStats; onExit: () => void }) {
  return (
    <motion.div
      key="result"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="text-6xl mb-6"
      >
        🏆
      </motion.div>
      <h1 className="text-3xl font-bold text-white mb-2">시즌 1 완료!</h1>
      <p className="text-zinc-400 mb-8">Hoàn thành Mùa 1!</p>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-8">
        <div className="bg-zinc-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.stat_mental}</div>
          <div className="text-xs text-zinc-500">멘탈</div>
        </div>
        <div className="bg-zinc-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{stats.stat_chemistry}</div>
          <div className="text-xs text-zinc-500">케미</div>
        </div>
        <div className="bg-zinc-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{stats.stat_media_tone}</div>
          <div className="text-xs text-zinc-500">미디어</div>
        </div>
        <div className="bg-zinc-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{stats.gauge_rumor}</div>
          <div className="text-xs text-zinc-500">루머</div>
        </div>
      </div>

      <Button onClick={onExit} className="w-full max-w-sm py-4 bg-pink-500 hover:bg-pink-600">
        대시보드로 / Về Dashboard
      </Button>
      <p className="text-xs text-zinc-500 mt-4">시즌 2 준비중... / Mùa 2 đang chuẩn bị...</p>
    </motion.div>
  );
}
