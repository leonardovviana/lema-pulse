import { Mic, MicOff, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecordingIndicatorProps {
  isRecording: boolean;
  duration: number;
  isPaused?: boolean;
}

export function RecordingIndicator({ isRecording, duration, isPaused }: RecordingIndicatorProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isRecording) return null;

  return (
    <div className={cn(
      'fixed top-4 right-4 z-50',
      'flex items-center gap-2 px-4 py-2 rounded-full',
      'bg-red-500/90 text-white shadow-lg backdrop-blur-sm',
      'animate-fade-in'
    )}>
      <div className={cn(
        'w-3 h-3 rounded-full bg-white',
        !isPaused && 'recording-pulse'
      )} />
      <Mic className="w-4 h-4" />
      <span className="font-mono font-medium">
        {formatDuration(duration)}
      </span>
      {isPaused && (
        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
          PAUSADO
        </span>
      )}
    </div>
  );
}
