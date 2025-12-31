import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Globe, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { languages, type LanguageCode, getUiLangStorageKey } from "@/i18n/config";
import { toast } from "@/hooks/use-toast";

// Normalize language code (e.g., "ko-KR" → "ko", "en-US" → "en")
const normalizeLanguageCode = (code: string): LanguageCode => {
  const baseCode = code.split('-')[0].toLowerCase();
  const validCodes = languages.map(l => l.code);
  return validCodes.includes(baseCode as LanguageCode) 
    ? (baseCode as LanguageCode) 
    : 'ko'; // fallback to Korean
};

export const LanguageSelector = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredLang, setHoveredLang] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize current language (handle ko-KR, en-US, etc.)
  const normalizedLang = useMemo(() => normalizeLanguageCode(i18n.language), [i18n.language]);
  
  // Auto-normalize language if it doesn't match (e.g., ko-KR → ko)
  useEffect(() => {
    if (i18n.language !== normalizedLang) {
      i18n.changeLanguage(normalizedLang);
    }
  }, [i18n, normalizedLang]);

  const currentLanguage = languages.find(lang => lang.code === normalizedLang) || languages[0];

  const handleLanguageChange = async (code: LanguageCode) => {
    if (code === normalizedLang) {
      setIsOpen(false);
      return;
    }

    const selectedLang = languages.find(lang => lang.code === code);
    if (!selectedLang) return;

    // Start transition effect
    setIsTransitioning(true);
    setIsOpen(false);

    // Small delay for visual effect
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Change language + persist ONLY explicit user choice (scoped by domain)
    window.localStorage.setItem(getUiLangStorageKey(), code);
    await i18n.changeLanguage(code);
    
    // Show toast notification
    toast({
      title: `${selectedLang.flag} ${selectedLang.nativeName}`,
      description: getLanguageChangeMessage(code),
      duration: 3000,
    });

    // Smooth scroll to top
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    // End transition effect
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsTransitioning(false);
  };

  const getLanguageChangeMessage = (code: LanguageCode): string => {
    const messages: Record<LanguageCode, string> = {
      ko: '언어가 한국어로 변경되었습니다',
      vi: 'Ngôn ngữ đã được chuyển sang Tiếng Việt',
      en: 'Language changed to English',
      ja: '言語が日本語に変更されました',
      zh: '语言已切换为中文',
      ru: 'Язык изменен на русский',
      uz: "Til o'zbek tiliga o'zgartirildi",
    };
    return messages[code];
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <>
      {/* Page Transition Overlay */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center bg-background/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              transition={{ duration: 0.3, type: 'spring' }}
              className="flex flex-col items-center gap-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary"
              />
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl"
              >
                {currentLanguage.flag}
              </motion.span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative" ref={containerRef}>
        {/* Trigger Button with Premium Glow Effect */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="relative h-10 sm:h-11 px-3 sm:px-4 gap-2 rounded-xl bg-gradient-to-r from-background/80 to-muted/50 hover:from-muted/80 hover:to-muted/60 border border-border/40 hover:border-primary/30 shadow-sm hover:shadow-md hover:shadow-primary/10 transition-all duration-300 group overflow-hidden"
        >
          {/* Shimmer Effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -skew-x-12"
            initial={{ x: '-100%' }}
            animate={isOpen ? { x: '200%' } : { x: '-100%' }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
          
          {/* Flag with Bounce */}
          <motion.span 
            className="text-xl sm:text-2xl drop-shadow-md relative z-10"
            animate={{ 
              rotate: isOpen ? [0, -10, 10, 0] : 0,
            }}
            transition={{ duration: 0.4 }}
          >
            {currentLanguage.flag}
          </motion.span>
          
          {/* Language Code Badge */}
          <span className="hidden sm:inline text-xs font-bold text-foreground/90 bg-muted/60 px-2 py-0.5 rounded-md relative z-10">
            {currentLanguage.code.toUpperCase()}
          </span>
          
          {/* Animated Chevron */}
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
            className="relative z-10"
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
          </motion.span>
        </Button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop with Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-background/20 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Premium Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -15, scale: 0.9, rotateX: -10 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ 
                duration: 0.3, 
                type: "spring", 
                stiffness: 400, 
                damping: 25 
              }}
              className="absolute left-1/2 -translate-x-1/2 top-full mt-3 z-50 min-w-[260px] bg-gradient-to-br from-popover via-popover to-muted/30 backdrop-blur-xl border border-border/30 rounded-2xl shadow-2xl shadow-primary/5 overflow-hidden"
              style={{ transformOrigin: 'top center' }}
            >
              {/* Decorative Top Gradient */}
              <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
              
              {/* Header */}
              <div className="relative px-5 py-4 border-b border-border/30">
                <div className="flex items-center gap-2.5">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20"
                  >
                    <Globe className="w-4 h-4 text-primary" />
                  </motion.div>
                  <div>
                    <span className="text-sm font-bold text-foreground">{t("language.select")}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] text-muted-foreground font-medium">7 Languages</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Language List */}
              <div className="relative p-2.5 max-h-[340px] overflow-y-auto custom-scrollbar">
                {languages.map((lang, index) => {
                  const isActive = lang.code === normalizedLang;
                  const isHovered = hoveredLang === lang.code;
                  
                  return (
                    <motion.button
                      key={lang.code}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04, type: 'spring', stiffness: 300 }}
                      onClick={() => handleLanguageChange(lang.code)}
                      onMouseEnter={() => setHoveredLang(lang.code)}
                      onMouseLeave={() => setHoveredLang(null)}
                      className={`relative w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-left transition-all duration-300 group/item overflow-hidden ${
                        isActive
                          ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25'
                          : 'hover:bg-muted/70'
                      }`}
                    >
                      {/* Hover Glow Effect */}
                      {!isActive && isHovered && (
                        <motion.div
                          layoutId="hoverGlow"
                          className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                      
                      {/* Active Indicator Line */}
                      {isActive && (
                        <motion.div
                          layoutId="activeLine"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-foreground/40 rounded-r-full"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      
                      {/* Flag with Animation */}
                      <motion.span 
                        className="text-2xl drop-shadow-md relative z-10"
                        animate={isHovered && !isActive ? { 
                          scale: [1, 1.2, 1],
                          rotate: [0, -5, 5, 0]
                        } : {}}
                        transition={{ duration: 0.4 }}
                      >
                        {lang.flag}
                      </motion.span>
                      
                      {/* Language Info */}
                      <div className="flex-1 min-w-0 relative z-10">
                        <span className={`block text-sm font-bold truncate transition-colors duration-200 ${
                          isActive ? 'text-primary-foreground' : 'text-foreground group-hover/item:text-foreground'
                        }`}>
                          {lang.nativeName}
                        </span>
                        <span className={`block text-[11px] truncate transition-colors duration-200 ${
                          isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {lang.name}
                        </span>
                      </div>
                      
                      {/* Check Badge */}
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                          className="relative z-10 flex-shrink-0 w-6 h-6 rounded-full bg-primary-foreground/25 backdrop-blur-sm flex items-center justify-center border border-primary-foreground/20"
                        >
                          <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
                        </motion.div>
                      )}
                      
                      {/* Hover Arrow */}
                      {!isActive && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={isHovered ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                          className="relative z-10"
                        >
                          <ChevronDown className="w-4 h-4 text-primary -rotate-90" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="relative px-5 py-3 border-t border-border/30 bg-muted/20">
                <motion.p 
                  className="text-[10px] text-muted-foreground text-center font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {t("language.hint")}
                </motion.p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </div>
    </>
  );
};

export default LanguageSelector;
