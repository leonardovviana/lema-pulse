import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusIndicatorProps {
  isOnline: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusIndicator({ isOnline, showLabel = true, size = 'md' }: StatusIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22,
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div 
          className={cn(
            'rounded-full',
            sizeClasses[size],
            isOnline ? 'status-online' : 'status-offline'
          )}
        />
      </div>
      {showLabel && (
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <Wifi size={iconSizes[size]} className="text-green-600" />
          ) : (
            <WifiOff size={iconSizes[size]} className="text-red-600" />
          )}
          <span className={cn(
            'font-medium',
            textSizes[size],
            isOnline ? 'text-green-600' : 'text-red-600'
          )}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      )}
    </div>
  );
}
