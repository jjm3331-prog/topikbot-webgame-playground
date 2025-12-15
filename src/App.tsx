import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Game from "./pages/Game";
import Chat from "./pages/Chat";
import Ranking from "./pages/Ranking";
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
import NotFound from "./pages/NotFound";
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
            <Route path="/game" element={<Game />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/ranking" element={<Ranking />} />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
