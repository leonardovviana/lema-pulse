import { Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon';
  className?: string;
}

export function Logo({ size = 'md', variant = 'full', className }: LogoProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  const iconSizes = {
    sm: 20,
    md: 28,
    lg: 40,
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="bg-lema-gradient p-2 rounded-lg shadow-lema">
        <Megaphone 
          size={iconSizes[size]} 
          className="text-white" 
          strokeWidth={2.5}
        />
      </div>
      {variant === 'full' && (
        <div className="flex flex-col leading-tight">
          <span className={cn('font-bold text-lema-primary', sizeClasses[size])}>
            Lema
          </span>
          <span className={cn('font-medium text-muted-foreground', 
            size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
          )}>
            Pesquisas
          </span>
        </div>
      )}
    </div>
  );
}
