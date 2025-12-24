import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, PencilBrush } from "fabric";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RotateCcw, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HangulTracingProps {
  characters: string[]; // Array of characters to practice
  onComplete?: (scores: number[]) => void;
  className?: string;
}

const HangulTracing = ({ characters, onComplete, className }: HangulTracingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const guideCanvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const currentChar = characters[currentIndex];
  const canvasSize = 300;

  // Initialize fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: canvasSize,
      height: canvasSize,
      backgroundColor: "transparent",
      isDrawingMode: true,
    });

    // Configure brush
    const brush = new PencilBrush(canvas);
    brush.color = "#3B82F6"; // Blue for user strokes
    brush.width = 8;
    canvas.freeDrawingBrush = brush;

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  // Draw guide character
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

    // Draw the guide character
    ctx.font = "200px 'Noto Sans KR', sans-serif";
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(currentChar, canvasSize / 2, canvasSize / 2 + 10);
  }, [currentChar]);

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

    tempCtx.font = "200px 'Noto Sans KR', sans-serif";
    tempCtx.fillStyle = "rgba(0, 0, 0, 1)";
    tempCtx.textAlign = "center";
    tempCtx.textBaseline = "middle";
    tempCtx.fillText(currentChar, canvasSize / 2, canvasSize / 2 + 10);

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
  }, [fabricCanvas, currentChar]);

  // Handle check
  const handleCheck = useCallback(() => {
    const score = calculateScore();
    const newScores = [...scores, score];
    setScores(newScores);

    if (score >= 70) {
      toast.success(`잘했어요! ${score}점`, {
        description: "훌륭한 필체입니다! 👏",
      });
    } else if (score >= 40) {
      toast.info(`괜찮아요! ${score}점`, {
        description: "조금만 더 연습해봐요!",
      });
    } else {
      toast.warning(`다시 해봐요! ${score}점`, {
        description: "가이드 글자를 따라 써보세요.",
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

  if (isComplete) {
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return (
      <div className={cn("flex flex-col items-center gap-6 p-6", className)}>
        <h2 className="text-2xl font-bold">연습 완료! 🎉</h2>
        <div className="text-5xl font-bold text-primary">{avgScore}점</div>
        <div className="flex flex-wrap gap-2 justify-center">
          {characters.map((char, idx) => (
            <div
              key={idx}
              className={cn(
                "w-12 h-12 flex items-center justify-center rounded-lg text-lg font-bold",
                scores[idx] >= 70
                  ? "bg-green-100 text-green-700"
                  : scores[idx] >= 40
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
              )}
            >
              {char}
            </div>
          ))}
        </div>
        <Button onClick={handleRestart} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          다시 연습하기
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Progress */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{currentIndex + 1}</span>
        <span>/</span>
        <span>{characters.length}</span>
      </div>

      {/* Character display */}
      <div className="text-4xl font-bold mb-2">{currentChar}</div>

      {/* Canvas container */}
      <div className="relative border-2 border-dashed border-muted-foreground/30 rounded-xl bg-white">
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

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrev}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <Button variant="outline" onClick={handleClear} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          지우기
        </Button>

        <Button onClick={handleCheck} className="gap-2">
          <Check className="w-4 h-4" />
          확인
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={currentIndex === characters.length - 1}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Hint */}
      <p className="text-sm text-muted-foreground text-center">
        가이드 글자 위에 손가락이나 마우스로 따라 써보세요
      </p>
    </div>
  );
};

export default HangulTracing;
