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
import NotFound from "./pages/NotFound";
import PWAInstallPrompt from "./components/PWAInstallPrompt";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;