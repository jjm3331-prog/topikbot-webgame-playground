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
          <Lock className="w-8 h-8 text-primary-foreground" />
        </div>
        
        <h1 className="text-2xl font-heading font-bold text-foreground mb-3">
          Tính năng Premium
        </h1>
        
        <p className="text-muted-foreground mb-6">
          Tính năng này chỉ dành cho thành viên Premium.<br />
          Nâng cấp ngay để mở khóa tất cả tính năng!
        </p>

        <div className="space-y-3">
          <Button
            asChild
            className="w-full bg-gradient-to-r from-korean-orange to-korean-pink hover:from-korean-orange/90 hover:to-korean-pink/90 text-primary-foreground font-bold"
          >
            <a href="/pricing">
              <Crown className="w-4 h-4 mr-2" />
              Nâng cấp Premium
            </a>
          </Button>
          
          <Button
            variant="outline"
            asChild
            className="w-full"
          >
            <a href="/">Về trang chủ</a>
          </Button>
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">Quyền lợi Premium</h3>
          <ul className="text-sm text-muted-foreground space-y-2 text-left">
            <li className="flex items-center gap-2">
              <span className="text-korean-green">✓</span>
              Dịch vụ việc làm (Tìm việc tại Hàn + Headhunting)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-korean-green">✓</span>
              AI chấm bài viết (Writing Correction)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-korean-green">✓</span>
              Theo dõi & phân tích tiến độ học
            </li>
            <li className="flex items-center gap-2">
              <span className="text-korean-green">✓</span>
              Quản lý sổ lỗi sai
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
