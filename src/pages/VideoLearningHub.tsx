import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import CleanHeader from '@/components/CleanHeader';
import AppFooter from '@/components/AppFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Globe, 
  BookOpen, 
  Mic, 
  MessageSquare, 
  Trophy,
  ChevronRight,
  Sparkles,
  Languages,
  Volume2,
  PenLine,
  Clock,
  CheckCircle,
  Star,
  Zap,
  Users,
  Target
} from 'lucide-react';

interface VideoLesson {
  id: string;
  title: string;
  thumbnail_url: string | null;
  category: string;
  difficulty: string;
  view_count: number;
}

const CATEGORIES = [
  { value: 'all', label: '전체', emoji: '📺' },
  { value: 'drama', label: '드라마', emoji: '🎭' },
  { value: 'news', label: '뉴스', emoji: '📰' },
  { value: 'education', label: '교육', emoji: '📚' },
  { value: 'variety', label: '예능', emoji: '🎪' },
  { value: 'music', label: '음악', emoji: '🎵' },
];

const FEATURES = [
  {
    icon: Languages,
    title: '7개국어 자막',
    description: '한국어, 베트남어, 영어, 일본어, 중국어, 러시아어, 우즈베크어 실시간 전환',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: BookOpen,
    title: 'TOPIK 어휘 연동',
    description: '자막 클릭 시 TOPIK 단어장과 연동된 의미, 예문, 발음 팝업',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Mic,
    title: '쉐도잉 연습',
    description: '구간 반복 재생 + STT 기반 발음 연습으로 원어민처럼 말하기',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: MessageSquare,
    title: 'AI Q&A',
    description: '"이 표현 언제 써요?" RAG 기반 맞춤 답변으로 깊이 있는 학습',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: PenLine,
    title: '오답노트',
    description: '모르는 단어 자동 저장, 영상별 복습으로 완벽한 암기',
    color: 'from-indigo-500 to-violet-500',
  },
  {
    icon: Trophy,
    title: '구간 퀴즈',
    description: '시청 후 자동 생성 퀴즈로 학습 효과 극대화',
    color: 'from-yellow-500 to-amber-500',
  },
];

const HOW_TO_USE = [
  {
    step: 1,
    title: '영상 선택',
    description: '카테고리별로 원하는 한국어 영상을 선택하세요',
    icon: Play,
  },
  {
    step: 2,
    title: '자막 언어 설정',
    description: '7개 언어 중 원하는 자막을 선택하세요',
    icon: Globe,
  },
  {
    step: 3,
    title: '단어 클릭 학습',
    description: '모르는 단어를 클릭하면 의미와 예문이 팝업됩니다',
    icon: BookOpen,
  },
  {
    step: 4,
    title: '쉐도잉 연습',
    description: '구간을 선택해 반복 듣고, 녹음해 비교하세요',
    icon: Mic,
  },
  {
    step: 5,
    title: '오답노트 확인',
    description: '저장된 단어들을 복습하고 마스터하세요',
    icon: CheckCircle,
  },
];

export default function VideoLearningHub() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('video_lessons')
        .select('id, title, thumbnail_url, category, difficulty, view_count')
        .eq('is_published', true)
        .order('view_count', { ascending: false })
        .limit(6);

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVideos = selectedCategory === 'all' 
    ? videos 
    : videos.filter(v => v.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 sm:py-24">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
          <div className="absolute inset-0">
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
          
          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
              >
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">미기를 압도하는 학습 시스템</span>
              </motion.div>

              {/* Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  비디오 학습
                </span>
                <br />
                <span className="text-foreground">7개국어로 완벽하게</span>
              </h1>

              {/* Subtitle */}
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                유튜브 영상으로 한국어 학습 • 실시간 자막 싱크 • 
                <br className="hidden sm:block" />
                클릭 한 번으로 TOPIK 단어 학습 • AI 기반 맞춤 피드백
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="text-lg px-8 h-14 rounded-2xl bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25"
                  onClick={() => navigate('/video-learning')}
                >
                  <Play className="w-5 h-5 mr-2" />
                  학습 시작하기
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8 h-14 rounded-2xl"
                  onClick={() => document.getElementById('how-to-use')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  사용법 보기
                </Button>
              </div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap justify-center gap-8 mt-12"
              >
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">7</div>
                  <div className="text-sm text-muted-foreground">지원 언어</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">AI</div>
                  <div className="text-sm text-muted-foreground">발음 피드백</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">∞</div>
                  <div className="text-sm text-muted-foreground">구간 반복</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">TOPIK</div>
                  <div className="text-sm text-muted-foreground">어휘 연동</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 sm:py-20 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                🚀 차별화된 학습 기능
              </h2>
              <p className="text-muted-foreground text-lg">
                단순한 영상 시청을 넘어, 완벽한 한국어 습득을 위한 올인원 시스템
              </p>
            </motion.div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full group hover:shadow-xl transition-all duration-300 border-0 bg-card/80 backdrop-blur">
                    <CardContent className="p-6">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <feature.icon className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How to Use Section */}
        <section id="how-to-use" className="py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                📖 사용 가이드
              </h2>
              <p className="text-muted-foreground text-lg">
                5단계로 완벽한 비디오 학습을 시작하세요
              </p>
            </motion.div>

            <div className="relative">
              {/* Connection Line */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20 hidden lg:block -translate-y-1/2" />
              
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
                {HOW_TO_USE.map((step, index) => (
                  <motion.div
                    key={step.step}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                  >
                    <Card className="h-full text-center hover:shadow-lg transition-all border-0 bg-card">
                      <CardContent className="p-6">
                        {/* Step Number */}
                        <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4 relative z-10">
                          {step.step}
                        </div>
                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                          <step.icon className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Video Preview Section */}
        {videos.length > 0 && (
          <section className="py-16 sm:py-20 bg-muted/30">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
              >
                <div>
                  <h2 className="text-3xl font-bold mb-2">🎬 학습 영상</h2>
                  <p className="text-muted-foreground">인기 한국어 학습 영상을 만나보세요</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/video-learning')}
                  className="rounded-xl"
                >
                  전체 보기
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>

              {/* Category Tabs */}
              <div className="flex flex-wrap gap-2 mb-8">
                {CATEGORIES.map((cat) => (
                  <Button
                    key={cat.value}
                    variant={selectedCategory === cat.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.value)}
                    className="rounded-full"
                  >
                    {cat.emoji} {cat.label}
                  </Button>
                ))}
              </div>

              {/* Video Grid */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredVideos.map((video, index) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card 
                      className="overflow-hidden cursor-pointer group hover:shadow-xl transition-all border-0"
                      onClick={() => navigate(`/video-learning/${video.id}`)}
                    >
                      <div className="relative aspect-video bg-muted">
                        {video.thumbnail_url ? (
                          <img 
                            src={video.thumbnail_url} 
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                            <Play className="w-8 h-8 text-primary ml-1" />
                          </div>
                        </div>
                        <Badge className="absolute top-3 left-3 bg-black/60 backdrop-blur">
                          {CATEGORIES.find(c => c.value === video.category)?.emoji} {CATEGORIES.find(c => c.value === video.category)?.label}
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                          {video.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {video.view_count}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {video.difficulty === 'beginner' ? '초급' : video.difficulty === 'intermediate' ? '중급' : '고급'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {filteredVideos.length === 0 && !loading && (
                <div className="text-center py-12 text-muted-foreground">
                  <Play className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>아직 등록된 영상이 없습니다</p>
                  <p className="text-sm mt-2">곧 다양한 학습 영상이 추가됩니다!</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-16 sm:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary to-accent text-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_50%)]" />
                <CardContent className="relative z-10 p-8 sm:p-12 text-center">
                  <Zap className="w-16 h-16 mx-auto mb-6 opacity-80" />
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                    지금 바로 시작하세요!
                  </h2>
                  <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
                    영상을 보면서 자연스럽게 한국어 실력을 키워보세요.
                    <br />
                    7개국어 자막과 AI 기반 학습 도구가 함께합니다.
                  </p>
                  <Button 
                    size="lg"
                    variant="secondary"
                    className="text-lg px-8 h-14 rounded-2xl"
                    onClick={() => navigate('/video-learning')}
                  >
                    <Play className="w-5 h-5 mr-2" />
                    무료로 시작하기
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
