import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Repeat, X, Play, SkipBack, SkipForward } from 'lucide-react';

interface ABRepeatControlsProps {
  pointA: number | null;
  pointB: number | null;
  isRepeating: boolean;
  onSetA: () => void;
  onSetB: () => void;
  onClear: () => void;
  onToggleRepeat: () => void;
  formatTime: (seconds: number) => string;
}

export default function ABRepeatControls({
  pointA,
  pointB,
  isRepeating,
  onSetA,
  onSetB,
  onClear,
  onToggleRepeat,
  formatTime,
}: ABRepeatControlsProps) {
  const hasA = pointA !== null;
  const hasB = pointB !== null;
  const hasRange = hasA && hasB;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* A Point Button */}
      <Button
        size="sm"
        variant={hasA ? 'default' : 'outline'}
        onClick={onSetA}
        className="gap-1"
      >
        <SkipBack className="w-4 h-4" />
        A {hasA ? `(${formatTime(pointA!)})` : ''}
      </Button>

      {/* B Point Button */}
      <Button
        size="sm"
        variant={hasB ? 'default' : 'outline'}
        onClick={onSetB}
        disabled={!hasA}
        className="gap-1"
      >
        <SkipForward className="w-4 h-4" />
        B {hasB ? `(${formatTime(pointB!)})` : ''}
      </Button>

      {/* Repeat Toggle */}
      {hasRange && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2"
        >
          <Button
            size="sm"
            variant={isRepeating ? 'default' : 'secondary'}
            onClick={onToggleRepeat}
            className="gap-1"
          >
            <Repeat className={`w-4 h-4 ${isRepeating ? 'animate-pulse' : ''}`} />
            {isRepeating ? '반복 중' : '반복 시작'}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
          >
            <X className="w-4 h-4" />
          </Button>
        </motion.div>
      )}

      {/* Status Badge */}
      {isRepeating && hasRange && (
        <Badge variant="secondary" className="bg-primary/20 text-primary">
          🔁 {formatTime(pointA!)} → {formatTime(pointB!)}
        </Badge>
      )}
    </div>
  );
}
