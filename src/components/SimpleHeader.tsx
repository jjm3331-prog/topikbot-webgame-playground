import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Menu, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CompactDropdown } from "@/components/CompactDropdown";

export const SimpleHeader = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/90 border-b border-border/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          {/* Logo */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <img 
              src="/favicon.png" 
              alt="LUKATO" 
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover"
            />
            <span className="font-heading font-bold text-base sm:text-lg text-foreground whitespace-nowrap">LUKATO AI</span>
          </motion.div>

          {/* Desktop Navigation Trigger */}
          <nav className="hidden md:flex items-center">
            <Button
              variant="ghost"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 font-medium text-muted-foreground hover:text-foreground"
            >
              {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              Menu
              <ChevronDown className={`w-4 h-4 transition-transform ${isMenuOpen ? "rotate-180" : ""}`} />
            </Button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            
            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>

            {/* Login Button */}
            <Button 
              onClick={() => navigate("/auth")}
              size="sm"
              className="btn-primary text-primary-foreground rounded-lg font-medium px-3 text-xs sm:text-sm"
            >
              Đăng nhập
            </Button>
          </div>
        </div>
      </motion.header>

      <CompactDropdown isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
};

export default SimpleHeader;
