import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import WordChain from "./pages/WordChain";
import Quiz from "./pages/Quiz";
import PartTime from "./pages/PartTime";
import BankruptcyRecovery from "./pages/BankruptcyRecovery";
import Dating from "./pages/Dating";
import KDrama from "./pages/KDrama";
import KPop from "./pages/KPop";
import Tutorial from "./pages/Tutorial";
import PWAGuide from "./pages/PWAGuide";
import Manager from "./pages/Manager";
import AITutor from "./pages/AITutor";
import AIChat from "./pages/AIChat";
import AIAgentChat from "./pages/AIAgentChat";
import WritingCorrection from "./pages/WritingCorrection";
import Lesson from "./pages/Lesson";
import LessonMenu from "./pages/LessonMenu";
import HandwritingPractice from "./pages/HandwritingPractice";
import ListeningPractice from "./pages/ListeningPractice";
import ReadingA from "./pages/ReadingA";
import ReadingB from "./pages/ReadingB";
import Vocabulary from "./pages/Vocabulary";
import Grammar from "./pages/Grammar";
import LearningHub from "./pages/LearningHub";
import GameHub from "./pages/GameHub";
import Pricing from "./pages/Pricing";
import Profile from "./pages/Profile";
import Ranking from "./pages/Ranking";
import PointsSystem from "./pages/PointsSystem";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import HelpCenter from "./pages/HelpCenter";
import NotFound from "./pages/NotFound";
import KoreaCareer from "./pages/KoreaCareer";
import Headhunting from "./pages/Headhunting";
import CompanyReport from "./pages/CompanyReport";
import InterviewSimulation from "./pages/InterviewSimulation";
import QuestionVariant from "./pages/QuestionVariant";
import RoleplaySpeaking from "./pages/RoleplaySpeaking";
import PracticalGuide from "./pages/PracticalGuide";
import BoardHub from "./pages/BoardHub";
import Board from "./pages/Board";
import BoardPost from "./pages/BoardPost";
import BoardWrite from "./pages/BoardWrite";
import Battle from "./pages/Battle";
import AdminVideoManager from "./pages/AdminVideoManager";
import AdminVideoSubtitles from "./pages/AdminVideoSubtitles";
import VideoLearningHub from "./pages/VideoLearningHub";
import MockExamHub from "./pages/MockExamHub";
import MockExamTest from "./pages/MockExamTest";
import MockExamReport from "./pages/MockExamReport";
import MockExamMistakes from "./pages/MockExamMistakes";
import AdminMockExam from "./pages/AdminMockExam";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import PWAWelcome from "./components/PWAWelcome";
import SplashScreen from "./components/SplashScreen";

const queryClient = new QueryClient();

function HashDeepLinkBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    // KakaoTalk/Zalo 인앱브라우저에서 딥링크(/vocabulary 등) 접근 시 404가 날 수 있어
    // 공유 링크를 https://game.topikbot.kr/#/vocabulary?... 형태로 만들고,
    // 여기서 hash 경로를 BrowserRouter 경로로 변환합니다.
    const hash = window.location.hash || "";
    if (!hash.startsWith("#/")) return;

    const target = hash.slice(1); // remove leading '#'
    if (!target.startsWith("/")) return;

    try {
      navigate(target, { replace: true });
      // 해시 제거 (URL 깔끔하게)
      window.history.replaceState(null, "", target);
    } catch {
      // ignore
    }
  }, [navigate]);

  return null;
}

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  const simulateProgress = useCallback(() => {
    // Fast initial progress (0-70%)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 70) {
          clearInterval(interval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 100);

    return interval;
  }, []);

  useEffect(() => {
    const progressInterval = simulateProgress();

    // Check if all resources are loaded
    const handleLoad = () => {
      // Complete progress to 100%
      setProgress(100);

      // Small delay to show 100% before hiding
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    };

    // If document is already loaded
    if (document.readyState === "complete") {
      // Minimum display time of 1.2 seconds
      setTimeout(() => {
        setProgress(100);
        setTimeout(() => setIsLoading(false), 300);
      }, 800);
    } else {
      window.addEventListener("load", handleLoad);
    }

    // Fallback: max 2 seconds loading time
    const fallbackTimer = setTimeout(() => {
      setProgress(100);
      setTimeout(() => setIsLoading(false), 300);
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(fallbackTimer);
      window.removeEventListener("load", handleLoad);
    };
  }, [simulateProgress]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <AnimatePresence mode="wait">
            {isLoading && <SplashScreen key="splash" progress={progress} />}
          </AnimatePresence>

          <Toaster />
          <Sonner />
          <PWAInstallPrompt />
          <PWAWelcome />
          <BrowserRouter>
            <HashDeepLinkBridge />
            <Routes>
              {/* Public routes - no login required */}
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/help-center" element={<HelpCenter />} />
              <Route path="/pwa-guide" element={<PWAGuide />} />
              <Route path="/admin-login" element={<AdminLogin />} />
              
              {/* Protected routes - login required */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/korea-career" element={<ProtectedRoute><KoreaCareer /></ProtectedRoute>} />
              <Route path="/headhunting" element={<ProtectedRoute><Headhunting /></ProtectedRoute>} />
              <Route path="/company-report" element={<ProtectedRoute><CompanyReport /></ProtectedRoute>} />
              <Route path="/interview-simulation" element={<ProtectedRoute><InterviewSimulation /></ProtectedRoute>} />
              <Route path="/practical-guide" element={<ProtectedRoute><PracticalGuide /></ProtectedRoute>} />
              <Route path="/writing-correction" element={<ProtectedRoute><WritingCorrection /></ProtectedRoute>} />

              <Route path="/game" element={<Navigate to="/dashboard" replace />} />
              <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/wordchain" element={<ProtectedRoute><WordChain /></ProtectedRoute>} />
              <Route path="/quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
              <Route path="/parttime" element={<ProtectedRoute><PartTime /></ProtectedRoute>} />
              <Route path="/bankruptcy" element={<ProtectedRoute><BankruptcyRecovery /></ProtectedRoute>} />
              <Route path="/dating" element={<ProtectedRoute><Dating /></ProtectedRoute>} />
              <Route path="/kdrama" element={<ProtectedRoute><KDrama /></ProtectedRoute>} />
              <Route path="/kpop" element={<ProtectedRoute><KPop /></ProtectedRoute>} />
              <Route path="/tutorial" element={<ProtectedRoute><Tutorial /></ProtectedRoute>} />
              <Route path="/manager" element={<ProtectedRoute><Manager /></ProtectedRoute>} />
              <Route path="/ai-tutor" element={<ProtectedRoute><AITutor /></ProtectedRoute>} />
              <Route path="/ai-chat" element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
              <Route path="/ai-chat/:agentId" element={<ProtectedRoute><AIAgentChat /></ProtectedRoute>} />
              <Route path="/lesson/:lessonId" element={<ProtectedRoute><Lesson /></ProtectedRoute>} />
              <Route path="/lesson-menu" element={<ProtectedRoute><LessonMenu /></ProtectedRoute>} />
              <Route path="/handwriting" element={<ProtectedRoute><HandwritingPractice /></ProtectedRoute>} />
              <Route path="/listening" element={<ProtectedRoute><ListeningPractice /></ProtectedRoute>} />
              <Route path="/reading-a" element={<ProtectedRoute><ReadingA /></ProtectedRoute>} />
              <Route path="/reading-b" element={<ProtectedRoute><ReadingB /></ProtectedRoute>} />
              <Route path="/vocabulary" element={<ProtectedRoute><Vocabulary /></ProtectedRoute>} />
              <Route path="/grammar" element={<ProtectedRoute><Grammar /></ProtectedRoute>} />
              <Route path="/learning-hub" element={<ProtectedRoute><LearningHub /></ProtectedRoute>} />
              <Route path="/game-hub" element={<ProtectedRoute><GameHub /></ProtectedRoute>} />
              <Route path="/battle" element={<ProtectedRoute><Battle /></ProtectedRoute>} />
              <Route path="/question-variant" element={<ProtectedRoute><QuestionVariant /></ProtectedRoute>} />
              <Route path="/roleplay-speaking" element={<ProtectedRoute><RoleplaySpeaking /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/ranking" element={<ProtectedRoute><Ranking /></ProtectedRoute>} />
              <Route path="/points-system" element={<ProtectedRoute><PointsSystem /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/admin/video-manager" element={<ProtectedRoute><AdminVideoManager /></ProtectedRoute>} />
              <Route path="/admin/video/:videoId/subtitles" element={<ProtectedRoute><AdminVideoSubtitles /></ProtectedRoute>} />
              <Route path="/video-hub" element={<ProtectedRoute><VideoLearningHub /></ProtectedRoute>} />
              <Route path="/video-learning" element={<Navigate to="/video-hub" replace />} />
              <Route path="/mock-exam" element={<ProtectedRoute><MockExamHub /></ProtectedRoute>} />
              <Route path="/mock-exam/:examType" element={<ProtectedRoute><MockExamTest /></ProtectedRoute>} />
              <Route path="/mock-exam/report/:attemptId" element={<ProtectedRoute><MockExamReport /></ProtectedRoute>} />
              <Route path="/mock-exam/mistakes" element={<ProtectedRoute><MockExamMistakes /></ProtectedRoute>} />
              <Route path="/admin/mock-exam" element={<ProtectedRoute><AdminMockExam /></ProtectedRoute>} />
              <Route path="/board-hub" element={<ProtectedRoute><BoardHub /></ProtectedRoute>} />
              <Route path="/board/:boardType" element={<ProtectedRoute><Board /></ProtectedRoute>} />
              <Route path="/board/:boardType/:postId" element={<ProtectedRoute><BoardPost /></ProtectedRoute>} />
              <Route path="/board/:boardType/write" element={<ProtectedRoute><BoardWrite /></ProtectedRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
