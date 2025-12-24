import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
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
import WritingCorrection from "./pages/WritingCorrection";
import Lesson from "./pages/Lesson";
import LessonMenu from "./pages/LessonMenu";
import HandwritingPractice from "./pages/HandwritingPractice";
import ListeningPractice from "./pages/ListeningPractice";
import ReadingA from "./pages/ReadingA";
import ReadingB from "./pages/ReadingB";
import Vocabulary from "./pages/Vocabulary";
import Pricing from "./pages/Pricing";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import KoreaCareer from "./pages/KoreaCareer";
import Headhunting from "./pages/Headhunting";
import CompanyReport from "./pages/CompanyReport";
import InterviewSimulation from "./pages/InterviewSimulation";
import QuestionVariant from "./pages/QuestionVariant";
import RoleplaySpeaking from "./pages/RoleplaySpeaking";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import PWAWelcome from "./components/PWAWelcome";
import SplashScreen from "./components/SplashScreen";

const queryClient = new QueryClient();

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
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />

              {/* Pages are viewable for everyone (Premium is handled in-page / on actions) */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/korea-career" element={<KoreaCareer />} />
              <Route path="/headhunting" element={<Headhunting />} />
              <Route path="/company-report" element={<CompanyReport />} />
              <Route path="/interview-simulation" element={<InterviewSimulation />} />
              <Route path="/writing-correction" element={<WritingCorrection />} />

              {/* Free Routes */}
              <Route path="/game" element={<Navigate to="/dashboard" replace />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/wordchain" element={<WordChain />} />

              <Route path="/quiz" element={<Quiz />} />
              <Route path="/parttime" element={<PartTime />} />
              <Route path="/bankruptcy" element={<BankruptcyRecovery />} />
              <Route path="/dating" element={<Dating />} />
              <Route path="/kdrama" element={<KDrama />} />
              <Route path="/kpop" element={<KPop />} />
              <Route path="/tutorial" element={<Tutorial />} />
              <Route path="/pwa-guide" element={<PWAGuide />} />
              <Route path="/manager" element={<Manager />} />
              <Route path="/ai-tutor" element={<AITutor />} />
              <Route path="/ai-chat" element={<AIChat />} />
              <Route path="/lesson/:lessonId" element={<Lesson />} />
              <Route path="/lesson-menu" element={<LessonMenu />} />
              <Route path="/handwriting" element={<HandwritingPractice />} />
              <Route path="/listening" element={<ListeningPractice />} />
              <Route path="/reading-a" element={<ReadingA />} />
              <Route path="/reading-b" element={<ReadingB />} />
              <Route path="/vocabulary" element={<Vocabulary />} />
              <Route path="/question-variant" element={<QuestionVariant />} />
              <Route path="/roleplay-speaking" element={<RoleplaySpeaking />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin-login" element={<AdminLogin />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
