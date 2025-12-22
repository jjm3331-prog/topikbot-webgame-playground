import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { motion } from 'framer-motion';
import { Crown, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface PremiumRouteProps {
  children: ReactNode;
}

const LoadingState = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const PremiumRequired = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md"
    >
      <Card className="p-8 text-center bg-card border-border">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-korean-orange to-korean-pink flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-2xl font-heading font-bold text-foreground mb-3">
          Premium 전용 기능
        </h1>
        
        <p className="text-muted-foreground mb-6">
          이 기능은 Premium 회원만 이용할 수 있습니다.<br />
          지금 업그레이드하고 모든 기능을 이용해보세요!
        </p>

        <div className="space-y-3">
          <Button
            asChild
            className="w-full bg-gradient-to-r from-korean-orange to-korean-pink hover:from-korean-orange/90 hover:to-korean-pink/90 text-white font-bold"
          >
            <a href="/pricing">
              <Crown className="w-4 h-4 mr-2" />
              Premium 업그레이드
            </a>
          </Button>
          
          <Button
            variant="outline"
            asChild
            className="w-full"
          >
            <a href="/">홈으로 돌아가기</a>
          </Button>
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">Premium 혜택</h3>
          <ul className="text-sm text-muted-foreground space-y-2 text-left">
            <li className="flex items-center gap-2">
              <span className="text-korean-green">✓</span>
              취업 서비스 (한국 취업 정보 + Headhunting)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-korean-green">✓</span>
              AI 작문 첨삭 (Writing Correction)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-korean-green">✓</span>
              학습 진도 추적 & 분석
            </li>
            <li className="flex items-center gap-2">
              <span className="text-korean-green">✓</span>
              오답노트 관리
            </li>
          </ul>
        </div>
      </Card>
    </motion.div>
  </div>
);

export const PremiumRoute = ({ children }: PremiumRouteProps) => {
  const { isPremium, loading, user } = useSubscription();

  if (loading) {
    return <LoadingState />;
  }

  // If not logged in, redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If not premium, show upgrade prompt
  if (!isPremium) {
    return <PremiumRequired />;
  }

  return <>{children}</>;
};

export default PremiumRoute;
