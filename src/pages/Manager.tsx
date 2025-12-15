import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Mic, MicOff, Volume2, ChevronRight, 
  Heart, Users, TrendingUp, AlertTriangle,
  Music, Sparkles, Flame, Star
} from 'lucide-react';
import AppHeader from '@/components/AppHeader';

// 타입 정의
type GroupConcept = 'fresh' | 'crush' | 'hiphop' | 'retro' | 'dark' | 'band';
type GroupGender = 'male' | 'female' | 'mixed';
type GamePhase = 'setup' | 'playing' | 'result';

interface GameStats {
  stat_vocal: number;
  stat_dance: number;
  stat_variety: number;
  stat_condition: number;
  stat_mental: number;
  stat_chemistry: number;
  stat_media_tone: number;
  stat_fandom_power: number;
  gauge_rumor: number;
  gauge_obsession: number;
}

interface DialogueLine {
  speaker: string;
  text_ko: string;
  text_vi: string;
  isUser?: boolean;
  isMission?: boolean;
  missionPrompt?: { ko: string; vi: string };
}

// 챕터1 스크립트
const CHAPTER_1_SCRIPT: DialogueLine[] = [
  {
    speaker: '대표 강도윤',
    text_ko: '오늘 안에 정리해. 데뷔조는 세 명. 나머지는 계약 종료.',
    text_vi: 'Hôm nay phải chốt. Đội debut ba người. Còn lại chấm dứt hợp đồng.'
  },
  {
    speaker: 'SYSTEM',
    text_ko: '[미션 1] 대표에게 공손하게 보고하고 면담 시간을 요청하세요.',
    text_vi: '[Nhiệm vụ 1] Báo cáo lịch sự với CEO và xin thời gian gặp riêng.',
    isMission: true,
    missionPrompt: {
      ko: '대표에게 "절차대로 하겠다"고 공손하게 보고하고, 면담 시간을 요청하세요.',
      vi: 'Hãy báo cáo lịch sự rằng bạn sẽ làm theo quy trình và xin thời gian để gặp riêng.'
    }
  },
  {
    speaker: '탈락 연습생 민서',
    text_ko: '저… 진짜 끝이에요? 저 뭐 잘못했어요?',
    text_vi: 'Em… thật sự là hết rồi ạ? Em làm sai gì sao?'
  },
  {
    speaker: 'SYSTEM',
    text_ko: '[미션 2] 공감 + 사실 + 대안을 각 1문장씩 말하세요.',
    text_vi: '[Nhiệm vụ 2] Nói đồng cảm + sự thật + lựa chọn, mỗi thứ 1 câu.',
    isMission: true,
    missionPrompt: {
      ko: '상대의 감정을 인정하고(공감), 사실관계를 짧게 말한 뒤, 다음 선택지를 제시하세요.',
      vi: 'Hãy công nhận cảm xúc, nói sự thật ngắn gọn, rồi đưa ra lựa chọn tiếp theo.'
    }
  }
];

// 컨셉 옵션
const CONCEPT_OPTIONS: { value: GroupConcept; label_ko: string; label_vi: string; icon: React.ReactNode }[] = [
  { value: 'fresh', label_ko: '청량', label_vi: 'Tươi mát', icon: <Sparkles className="w-5 h-5" /> },
  { value: 'crush', label_ko: '크러시', label_vi: 'Crush', icon: <Flame className="w-5 h-5" /> },
  { value: 'hiphop', label_ko: '힙합', label_vi: 'Hip-hop', icon: <Music className="w-5 h-5" /> },
  { value: 'retro', label_ko: '레트로', label_vi: 'Retro', icon: <Star className="w-5 h-5" /> },
  { value: 'dark', label_ko: '다크', label_vi: 'Dark', icon: <AlertTriangle className="w-5 h-5" /> },
  { value: 'band', label_ko: '밴드', label_vi: 'Ban nhạc', icon: <Users className="w-5 h-5" /> }
];

const GENDER_OPTIONS: { value: GroupGender; label_ko: string; label_vi: string }[] = [
  { value: 'male', label_ko: '남돌', label_vi: 'Nam' },
  { value: 'female', label_ko: '여돌', label_vi: 'Nữ' },
  { value: 'mixed', label_ko: '혼성', label_vi: 'Hỗn hợp' }
];

export default function Manager() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [isLoading, setIsLoading] = useState(false);
  
  // 설정
  const [groupName, setGroupName] = useState('LUKATO');
  const [groupConcept, setGroupConcept] = useState<GroupConcept>('fresh');
  const [groupGender, setGroupGender] = useState<GroupGender>('mixed');
  
  // 게임 상태
  const [gameId, setGameId] = useState<string | null>(null);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [dialogueHistory, setDialogueHistory] = useState<DialogueLine[]>([]);
  const [stats, setStats] = useState<GameStats>({
    stat_vocal: 50, stat_dance: 50, stat_variety: 50,
    stat_condition: 80, stat_mental: 70, stat_chemistry: 60,
    stat_media_tone: 50, stat_fandom_power: 30,
    gauge_rumor: 0, gauge_obsession: 0
  });
  
  // STT 상태
  const [isRecording, setIsRecording] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ ko: string; vi: string } | null>(null);
  
  const dialogueEndRef = useRef<HTMLDivElement>(null);

  // 자동 스크롤
  useEffect(() => {
    dialogueEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialogueHistory]);

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

      // 기존 세이브 확인
      const { data: existingSave } = await supabase
        .from('manager_game_saves')
        .select('id')
        .eq('user_id', user.id)
        .eq('season', 1)
        .maybeSingle();

      let saveId: string;

      if (existingSave) {
        // 기존 세이브 업데이트
        const { error } = await supabase
          .from('manager_game_saves')
          .update({
            group_name: groupName,
            group_concept: groupConcept,
            group_gender: groupGender,
            current_chapter: 1,
            current_day: 1
          })
          .eq('id', existingSave.id);

        if (error) throw error;
        saveId = existingSave.id;
      } else {
        // 새 세이브 생성
        const { data, error } = await supabase
          .from('manager_game_saves')
          .insert({
            user_id: user.id,
            group_name: groupName,
            group_concept: groupConcept,
            group_gender: groupGender
          })
          .select('id')
          .single();

        if (error) throw error;
        saveId = data.id;
      }

      setGameId(saveId);
      setPhase('playing');
      
      // 첫 대사 추가
      setDialogueHistory([CHAPTER_1_SCRIPT[0]]);
      setCurrentDialogueIndex(0);

    } catch (error) {
      console.error('Game start error:', error);
      toast.error('게임 시작 실패');
    } finally {
      setIsLoading(false);
    }
  };

  // 다음 대사로 진행
  const advanceDialogue = () => {
    const nextIndex = currentDialogueIndex + 1;
    if (nextIndex < CHAPTER_1_SCRIPT.length) {
      const nextLine = CHAPTER_1_SCRIPT[nextIndex];
      setDialogueHistory(prev => [...prev, nextLine]);
      setCurrentDialogueIndex(nextIndex);
      setFeedback(null);
      setLastScore(null);
    } else {
      // 챕터 완료
      setPhase('result');
    }
  };

  // STT 응답 제출
  const submitResponse = async () => {
    if (!userInput.trim()) {
      toast.error('응답을 입력하세요');
      return;
    }

    setIsEvaluating(true);
    try {
      const currentMission = CHAPTER_1_SCRIPT[currentDialogueIndex];
      
      // 사용자 응답 추가
      setDialogueHistory(prev => [...prev, {
        speaker: '나 (매니저)',
        text_ko: userInput,
        text_vi: '',
        isUser: true
      }]);

      // AI 채점
      const { data, error } = await supabase.functions.invoke('manager-evaluate', {
        body: {
          userResponse: userInput,
          chapterNumber: 1,
          missionContext: currentMission.missionPrompt?.ko
        }
      });

      if (error) throw error;

      // 점수 및 피드백 표시
      setLastScore(data.total_score);
      setFeedback({
        ko: data.feedback_ko,
        vi: data.feedback_vi
      });

      // 지표 변화 적용
      if (data.stat_changes) {
        setStats(prev => ({
          ...prev,
          stat_mental: Math.max(0, Math.min(100, prev.stat_mental + (data.stat_changes.mental || 0))),
          stat_chemistry: Math.max(0, Math.min(100, prev.stat_chemistry + (data.stat_changes.chemistry || 0))),
          stat_media_tone: Math.max(0, Math.min(100, prev.stat_media_tone + (data.stat_changes.media_tone || 0))),
          gauge_rumor: Math.max(0, Math.min(100, prev.gauge_rumor + (data.stat_changes.rumor || 0)))
        }));
      }

      // 피드백 대사 추가
      setDialogueHistory(prev => [...prev, {
        speaker: 'SYSTEM',
        text_ko: `[채점: ${data.total_score}점] ${data.feedback_ko}`,
        text_vi: `[Điểm: ${data.total_score}] ${data.feedback_vi}`
      }]);

      setUserInput('');

    } catch (error) {
      console.error('Evaluation error:', error);
      toast.error('채점 실패');
    } finally {
      setIsEvaluating(false);
    }
  };

  // 현재 대사가 미션인지 확인
  const currentLine = CHAPTER_1_SCRIPT[currentDialogueIndex];
  const isMissionActive = currentLine?.isMission;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-900 text-white flex flex-col">
      <AppHeader 
        title="LUKATO 매니저" 
        titleVi="LUKATO Manager" 
        showBack
        showMenu={false}
      />

      <main className="flex-1 overflow-hidden p-4">
        <AnimatePresence mode="wait">
          {/* 설정 화면 */}
          {phase === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto space-y-6 pb-8"
            >
              {/* 게임 소개 섹션 */}
              <div className="bg-gradient-to-br from-pink-500/10 to-purple-600/10 border border-pink-500/20 rounded-xl p-5 space-y-4">
                <div className="text-center">
                  <h1 className="text-xl font-bold text-pink-400 mb-1">🎤 LUKATO 매니저</h1>
                  <p className="text-sm text-purple-300">Quản lý LUKATO - Game quản lý nhóm nhạc K-POP</p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <p className="font-medium text-zinc-200">📖 게임 소개 / Giới thiệu game</p>
                    <p className="text-zinc-400 mt-1">
                      당신은 K-POP 그룹의 매니저입니다. 연습생 선발부터 데뷔까지, 
                      대화와 결정으로 그룹의 운명을 좌우하세요.
                    </p>
                    <p className="text-zinc-500 mt-1 text-xs">
                      Bạn là quản lý của nhóm nhạc K-POP. Từ tuyển chọn thực tập sinh đến debut, 
                      hãy quyết định vận mệnh của nhóm thông qua đối thoại và lựa chọn.
                    </p>
                  </div>

                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <p className="font-medium text-zinc-200">🎮 플레이 방식 / Cách chơi</p>
                    <p className="text-zinc-400 mt-1">
                      미션마다 <span className="text-pink-400">한국어</span>로 응답하세요. 
                      AI가 정확성, 어조, 의도를 평가하여 점수를 매깁니다.
                    </p>
                    <p className="text-zinc-500 mt-1 text-xs">
                      Mỗi nhiệm vụ, hãy trả lời bằng <span className="text-pink-400">tiếng Hàn</span>. 
                      AI sẽ chấm điểm dựa trên độ chính xác, giọng điệu và ý định.
                    </p>
                  </div>

                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <p className="font-medium text-zinc-200">🏆 시즌제 / Hệ thống mùa</p>
                    <p className="text-zinc-400 mt-1">
                      <span className="text-yellow-400">시즌 1</span>: 데뷔 전쟁 (4주간 데뷔 준비)
                    </p>
                    <p className="text-zinc-500 mt-1 text-xs">
                      <span className="text-yellow-400">Mùa 1</span>: Cuộc chiến Debut (4 tuần chuẩn bị debut)
                    </p>
                  </div>

                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <p className="font-medium text-zinc-200">💡 팁 / Mẹo</p>
                    <p className="text-zinc-400 mt-1">
                      존댓말을 사용하고, 상황에 맞는 어조로 대화하세요. 
                      멘탈, 케미, 미디어 지표가 게임에 영향을 줍니다.
                    </p>
                    <p className="text-zinc-500 mt-1 text-xs">
                      Sử dụng kính ngữ và nói chuyện với giọng điệu phù hợp. 
                      Các chỉ số tinh thần, hòa hợp, truyền thông ảnh hưởng đến game.
                    </p>
                  </div>
                </div>
              </div>

              {/* 설정 영역 */}
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">시즌 1: 데뷔 전쟁</h2>
                <p className="text-zinc-400 text-sm">Mùa 1: Cuộc chiến Debut</p>
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

              {/* 성별 선택 */}
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

              {/* 컨셉 선택 */}
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
                onClick={startGame}
                disabled={isLoading}
                className="w-full py-6 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-lg font-bold"
              >
                {isLoading ? '로딩중...' : '게임 시작 / Bắt đầu'}
              </Button>
            </motion.div>
          )}

          {/* 게임 플레이 화면 */}
          {phase === 'playing' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col max-w-2xl mx-auto"
            >
              {/* 지표 바 */}
              <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-zinc-800/50 rounded-lg">
                <StatBar label="멘탈" value={stats.stat_mental} color="text-blue-400" />
                <StatBar label="케미" value={stats.stat_chemistry} color="text-green-400" />
                <StatBar label="미디어" value={stats.stat_media_tone} color="text-yellow-400" />
                <StatBar label="루머" value={stats.gauge_rumor} color="text-red-400" isRisk />
              </div>

              {/* 대화창 */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-4 bg-zinc-800/30 rounded-lg p-4">
                {dialogueHistory.map((line, idx) => (
                  <DialogueBubble key={idx} line={line} />
                ))}
                <div ref={dialogueEndRef} />
              </div>

              {/* 입력 영역 */}
              {isMissionActive ? (
                <div className="space-y-3">
                  {/* 미션 프롬프트 */}
                  <div className="p-3 bg-pink-500/10 border border-pink-500/30 rounded-lg">
                    <p className="text-sm text-pink-300">{currentLine.missionPrompt?.ko}</p>
                    <p className="text-xs text-pink-400/70 mt-1">{currentLine.missionPrompt?.vi}</p>
                  </div>

                  {/* 텍스트 입력 */}
                  <textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="한국어로 응답하세요... / Trả lời bằng tiếng Hàn..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 resize-none h-24 focus:border-pink-500 focus:outline-none"
                  />

                  <div className="flex gap-2">
                    <Button
                      onClick={submitResponse}
                      disabled={isEvaluating || !userInput.trim()}
                      className="flex-1 bg-pink-500 hover:bg-pink-600"
                    >
                      {isEvaluating ? '채점중...' : '제출 / Gửi'}
                    </Button>
                  </div>

                  {/* 피드백 표시 */}
                  {feedback && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg ${
                        lastScore && lastScore >= 70 
                          ? 'bg-green-500/10 border border-green-500/30' 
                          : lastScore && lastScore >= 40
                          ? 'bg-yellow-500/10 border border-yellow-500/30'
                          : 'bg-red-500/10 border border-red-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold">{lastScore}점</span>
                        <span className={
                          lastScore && lastScore >= 70 ? 'text-green-400' :
                          lastScore && lastScore >= 40 ? 'text-yellow-400' : 'text-red-400'
                        }>
                          {lastScore && lastScore >= 70 ? '✓ 성공' : lastScore && lastScore >= 40 ? '⚠ 경고' : '✗ 실패'}
                        </span>
                      </div>
                      <p className="text-sm">{feedback.ko}</p>
                      <p className="text-xs text-zinc-400 mt-1">{feedback.vi}</p>
                      
                      <Button
                        onClick={advanceDialogue}
                        className="mt-3 w-full"
                        variant="outline"
                      >
                        다음 / Tiếp theo <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </motion.div>
                  )}
                </div>
              ) : (
                <Button
                  onClick={advanceDialogue}
                  className="w-full py-4 bg-zinc-700 hover:bg-zinc-600"
                >
                  다음 / Tiếp theo <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </motion.div>
          )}

          {/* 결과 화면 */}
          {phase === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto text-center space-y-6 py-8"
            >
              <h2 className="text-3xl font-bold">챕터 1 완료!</h2>
              <p className="text-zinc-400">Hoàn thành Chương 1!</p>

              <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-800 rounded-lg">
                <div>
                  <div className="text-2xl font-bold text-blue-400">{stats.stat_mental}</div>
                  <div className="text-xs text-zinc-500">멘탈</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">{stats.stat_chemistry}</div>
                  <div className="text-xs text-zinc-500">케미</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-400">{stats.stat_media_tone}</div>
                  <div className="text-xs text-zinc-500">미디어</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-400">{stats.gauge_rumor}</div>
                  <div className="text-xs text-zinc-500">루머</div>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => navigate('/game')}
                  className="w-full bg-pink-500 hover:bg-pink-600"
                >
                  메인으로 / Về trang chính
                </Button>
                <p className="text-xs text-zinc-500">챕터 2 준비중... / Chương 2 đang chuẩn bị...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// 지표 바 컴포넌트
function StatBar({ label, value, color, isRisk }: { label: string; value: number; color: string; isRisk?: boolean }) {
  return (
    <div className="text-center">
      <div className={`text-xs ${color} mb-1`}>{label}</div>
      <Progress 
        value={value} 
        className={`h-2 ${isRisk ? 'bg-zinc-700' : 'bg-zinc-700'}`}
      />
      <div className="text-xs text-zinc-500 mt-1">{value}</div>
    </div>
  );
}

// 대화 버블 컴포넌트
function DialogueBubble({ line }: { line: DialogueLine }) {
  const isMission = line.isMission;
  const isUser = line.isUser;
  const isSystem = line.speaker === 'SYSTEM';

  if (isMission) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-3 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-lg"
      >
        <p className="text-pink-300 font-medium">{line.text_ko}</p>
        <p className="text-pink-400/70 text-sm mt-1">{line.text_vi}</p>
      </motion.div>
    );
  }

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-2"
      >
        <p className="text-zinc-400 text-sm">{line.text_ko}</p>
        <p className="text-zinc-500 text-xs">{line.text_vi}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[80%] ${
        isUser 
          ? 'bg-gradient-to-r from-pink-500 to-purple-600 rounded-tl-xl rounded-tr-xl rounded-bl-xl' 
          : 'bg-zinc-700 rounded-tl-xl rounded-tr-xl rounded-br-xl'
      } p-3`}>
        {!isUser && (
          <div className="text-xs text-zinc-400 mb-1">{line.speaker}</div>
        )}
        <p className="text-white">{line.text_ko}</p>
        {line.text_vi && (
          <p className="text-white/70 text-sm mt-1">{line.text_vi}</p>
        )}
      </div>
    </motion.div>
  );
}
