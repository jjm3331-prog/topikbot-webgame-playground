import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        {/* 404 Number with gradient */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="relative mb-8"
        >
          <h1 className="text-[120px] sm:text-[150px] font-black leading-none bg-gradient-to-br from-primary via-accent to-primary bg-clip-text text-transparent">
            404
          </h1>
          <div className="absolute inset-0 text-[120px] sm:text-[150px] font-black leading-none text-primary/10 blur-xl -z-10">
            404
          </div>
        </motion.div>

        {/* Error Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <Search className="w-10 h-10 text-primary" />
        </motion.div>

        {/* Error Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-foreground">
            {t('notFound.title', '페이지를 찾을 수 없습니다')}
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            {t('notFound.description', '요청하신 페이지가 존재하지 않거나 이동되었습니다.')}
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button 
            asChild
            size="lg"
            className="rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            <Link to="/">
              <Home className="w-5 h-5 mr-2" />
              {t('notFound.goHome', '홈으로 돌아가기')}
            </Link>
          </Button>
          <Button 
            variant="outline"
            size="lg"
            className="rounded-xl"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('notFound.goBack', '이전 페이지')}
          </Button>
        </motion.div>

        {/* Path Info */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-sm text-muted-foreground/60"
        >
          {t('notFound.path', '경로')}: <code className="bg-muted px-2 py-1 rounded text-xs">{location.pathname}</code>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default NotFound;
