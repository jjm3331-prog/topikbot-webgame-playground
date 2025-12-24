import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, PencilBrush } from "fabric";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RotateCcw, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CharacterItem {
  korean: string;
  vietnamese?: string;
}

interface HangulTracingProps {
  characters: CharacterItem[]; // Array of characters to practice
  onComplete?: (scores: number[]) => void;
  className?: string;
}

// Calculate optimal font size based on text length and canvas size
const calculateFontSize = (text: string, canvasSize: number): number => {
  const charCount = text.length;
  
  // Base size for single character
  if (charCount === 1) return Math.floor(canvasSize * 0.65);
  
  // For words (2-4 chars)
  if (charCount <= 4) return Math.floor(canvasSize * 0.35);
  
  // For longer words/sentences (5-8 chars)
  if (charCount <= 8) return Math.floor(canvasSize * 0.22);
  
  // For very long sentences (9+ chars)
  return Math.floor(canvasSize * 0.15);
};

const HangulTracing = ({ characters, onComplete, className }: HangulTracingProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const guideCanvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [canvasSize, setCanvasSize] = useState(300);

  const currentItem = characters[currentIndex];
  const currentChar = currentItem.korean;

  // Calculate responsive canvas size
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        // Max size 400px, min 260px, responsive to container
        const newSize = Math.min(400, Math.max(260, containerWidth - 32));
        setCanvasSize(newSize);
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  // Initialize fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: canvasSize,
      height: canvasSize,
      backgroundColor: "transparent",
      isDrawingMode: true,
    });

    // Configure brush - scale brush width with canvas size
    const brush = new PencilBrush(canvas);
    brush.color = "#3B82F6"; // Blue for user strokes
    brush.width = Math.max(4, Math.floor(canvasSize / 40));
    canvas.freeDrawingBrush = brush;

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [canvasSize]);

  // Draw guide character - with dynamic font sizing
  useEffect(() => {
    if (!guideCanvasRef.current) return;

    const ctx = guideCanvasRef.current.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // Draw dotted guide lines
    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // Vertical center line
    ctx.beginPath();
    ctx.moveTo(canvasSize / 2, 0);
    ctx.lineTo(canvasSize / 2, canvasSize);
    ctx.stroke();

    // Horizontal center line
    ctx.beginPath();
    ctx.moveTo(0, canvasSize / 2);
    ctx.lineTo(canvasSize, canvasSize / 2);
    ctx.stroke();

    ctx.setLineDash([]);

    // Calculate dynamic font size based on text length
    const fontSize = calculateFontSize(currentChar, canvasSize);

    // Draw the guide character
    ctx.font = `${fontSize}px 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // For very long text, we may need to wrap or adjust positioning
    const textWidth = ctx.measureText(currentChar).width;
    const maxWidth = canvasSize * 0.9;
    
    if (textWidth > maxWidth && currentChar.length > 1) {
      // If text is too wide, reduce font size further
      const scaleFactor = maxWidth / textWidth;
      const adjustedFontSize = Math.floor(fontSize * scaleFactor);
      ctx.font = `${adjustedFontSize}px 'Noto Sans KR', sans-serif`;
    }
    
    ctx.fillText(currentChar, canvasSize / 2, canvasSize / 2 + fontSize * 0.05);
  }, [currentChar, canvasSize]);

  // Calculate similarity score
  const calculateScore = useCallback((): number => {
    if (!fabricCanvas || !guideCanvasRef.current) return 0;

    // Get user drawing as image data
    const userCanvas = fabricCanvas.toCanvasElement();
    const userCtx = userCanvas.getContext("2d");
    if (!userCtx) return 0;

    const userImageData = userCtx.getImageData(0, 0, canvasSize, canvasSize);
    const userData = userImageData.data;

    // Get guide character as image data
    const guideCtx = guideCanvasRef.current.getContext("2d");
    if (!guideCtx) return 0;

    // Create temp canvas for guide character only (darker for comparison)
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvasSize;
    tempCanvas.height = canvasSize;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return 0;

    // Use the same dynamic font size calculation
    const fontSize = calculateFontSize(currentChar, canvasSize);
    tempCtx.font = `${fontSize}px 'Noto Sans KR', sans-serif`;
    tempCtx.fillStyle = "rgba(0, 0, 0, 1)";
    tempCtx.textAlign = "center";
    tempCtx.textBaseline = "middle";
    
    // Check if we need to scale down
    const textWidth = tempCtx.measureText(currentChar).width;
    const maxWidth = canvasSize * 0.9;
    
    if (textWidth > maxWidth && currentChar.length > 1) {
      const scaleFactor = maxWidth / textWidth;
      const adjustedFontSize = Math.floor(fontSize * scaleFactor);
      tempCtx.font = `${adjustedFontSize}px 'Noto Sans KR', sans-serif`;
    }
    
    tempCtx.fillText(currentChar, canvasSize / 2, canvasSize / 2 + fontSize * 0.05);

    const guideImageData = tempCtx.getImageData(0, 0, canvasSize, canvasSize);
    const guideData = guideImageData.data;

    let guidePixels = 0;
    let coveredPixels = 0;
    let userPixelsOutside = 0;
    let totalUserPixels = 0;

    // Compare pixels
    for (let i = 0; i < guideData.length; i += 4) {
      const guideAlpha = guideData[i + 3];
      const userAlpha = userData[i + 3];

      const isGuidePixel = guideAlpha > 50;
      const isUserPixel = userAlpha > 50;

      if (isGuidePixel) {
        guidePixels++;
        if (isUserPixel) {
          coveredPixels++;
        }
      }

      if (isUserPixel) {
        totalUserPixels++;
        if (!isGuidePixel) {
          userPixelsOutside++;
        }
      }
    }

    if (guidePixels === 0 || totalUserPixels === 0) return 0;

    // Coverage: how much of the guide was traced
    const coverage = coveredPixels / guidePixels;

    // Precision: how much of user drawing is within the guide
    const precision = totalUserPixels > 0 ? 1 - (userPixelsOutside / totalUserPixels) : 0;

    // Combined score (weighted average)
    const score = Math.round((coverage * 0.6 + precision * 0.4) * 100);

    return Math.min(100, Math.max(0, score));
  }, [fabricCanvas, currentChar, canvasSize]);

  // Handle check
  const handleCheck = useCallback(() => {
    const score = calculateScore();
    const newScores = [...scores, score];
    setScores(newScores);

    if (score >= 70) {
      toast.success(`Tuyệt vời! ${score} điểm`, {
        description: "Chữ viết rất đẹp! 👏",
      });
    } else if (score >= 40) {
      toast.info(`Khá tốt! ${score} điểm`, {
        description: "Hãy luyện thêm một chút nữa!",
      });
    } else {
      toast.warning(`Thử lại nhé! ${score} điểm`, {
        description: "Hãy viết theo chữ mẫu.",
      });
    }

    // Move to next character or complete
    if (currentIndex < characters.length - 1) {
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        fabricCanvas?.clear();
      }, 1000);
    } else {
      setIsComplete(true);
      onComplete?.(newScores);
    }
  }, [calculateScore, scores, currentIndex, characters.length, fabricCanvas, onComplete]);

  // Handle clear
  const handleClear = () => {
    fabricCanvas?.clear();
  };

  // Handle navigation
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      fabricCanvas?.clear();
    }
  };

  const handleNext = () => {
    if (currentIndex < characters.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      fabricCanvas?.clear();
    }
  };

  // Restart
  const handleRestart = () => {
    setCurrentIndex(0);
    setScores([]);
    setIsComplete(false);
    fabricCanvas?.clear();
  };

  // Calculate display font size for the character preview above canvas
  const getDisplayFontSize = () => {
    const charCount = currentChar?.length || 1;
    if (charCount === 1) return "text-4xl sm:text-5xl";
    if (charCount <= 4) return "text-2xl sm:text-3xl";
    if (charCount <= 8) return "text-xl sm:text-2xl";
    return "text-lg sm:text-xl";
  };

  if (isComplete) {
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return (
      <div className={cn("flex flex-col items-center gap-6 p-4 sm:p-6", className)}>
        <h2 className="text-xl sm:text-2xl font-bold">Hoàn thành! 🎉</h2>
        <div className="text-4xl sm:text-5xl font-bold text-primary">{avgScore} điểm</div>
        <div className="flex flex-wrap gap-2 justify-center max-w-full">
          {characters.map((item, idx) => {
            const charLen = item.korean.length;
            const sizeClass = charLen === 1 
              ? "w-10 h-10 sm:w-12 sm:h-12 text-base sm:text-lg" 
              : charLen <= 4 
                ? "px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm min-w-[40px]" 
                : "px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-xs min-w-[60px]";
            
            return (
              <div
                key={idx}
                className={cn(
                  "flex items-center justify-center rounded-lg font-bold truncate",
                  sizeClass,
                  scores[idx] >= 70
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : scores[idx] >= 40
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                )}
              >
                {item.korean}
              </div>
            );
          })}
        </div>
        <Button onClick={handleRestart} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Luyện lại
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("flex flex-col items-center gap-4 w-full", className)}>
      {/* Progress */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{currentIndex + 1}</span>
        <span>/</span>
        <span>{characters.length}</span>
      </div>

      {/* Character display - responsive sizing */}
      <div className="text-center mb-2 px-4 max-w-full">
        <div className={cn("font-bold break-all", getDisplayFontSize())}>
          {currentChar}
        </div>
        {/* Vietnamese translation */}
        {currentItem.vietnamese && (
          <div className="text-sm sm:text-base text-muted-foreground mt-1">
            {currentItem.vietnamese}
          </div>
        )}
      </div>

      {/* Canvas container - responsive */}
      <div 
        className="relative border-2 border-dashed border-muted-foreground/30 rounded-xl bg-white flex-shrink-0"
        style={{ width: canvasSize, height: canvasSize }}
      >
        {/* Guide canvas (background) */}
        <canvas
          ref={guideCanvasRef}
          width={canvasSize}
          height={canvasSize}
          className="absolute inset-0 pointer-events-none"
        />
        {/* Drawing canvas (foreground) */}
        <canvas
          ref={canvasRef}
          className="relative z-10 touch-none"
        />
      </div>

      {/* Controls - responsive */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="w-9 h-9 sm:w-10 sm:h-10"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <Button variant="outline" onClick={handleClear} className="gap-2 text-sm px-3 sm:px-4">
          <RotateCcw className="w-4 h-4" />
          Xóa
        </Button>

        <Button onClick={handleCheck} className="gap-2 text-sm px-3 sm:px-4">
          <Check className="w-4 h-4" />
          Kiểm tra
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={currentIndex === characters.length - 1}
          className="w-9 h-9 sm:w-10 sm:h-10"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Hint */}
      <p className="text-xs sm:text-sm text-muted-foreground text-center px-4">
        Hãy dùng ngón tay hoặc chuột viết theo chữ mẫu
      </p>
    </div>
  );
};

export default HangulTracing;
