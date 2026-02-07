import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'secondary';
}

export function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  variant = 'default' 
}: MetricCardProps) {
  const variantClasses = {
    default: 'bg-card border-border',
    primary: 'bg-lema-gradient text-white border-transparent',
    secondary: 'bg-lema-gradient-accent border-transparent',
  };

  const iconBgClasses = {
    default: 'bg-accent text-lema-primary',
    primary: 'bg-white/20 text-white',
    secondary: 'bg-white/30 text-foreground',
  };

  return (
    <div className={cn(
      'card-metric border',
      variantClasses[variant]
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className={cn(
            'text-sm font-medium',
            variant === 'default' ? 'text-muted-foreground' : 'opacity-90'
          )}>
            {title}
          </p>
          <p className={cn(
            'text-3xl font-bold tracking-tight',
            variant === 'default' ? 'text-foreground' : ''
          )}>
            {value}
          </p>
          {subtitle && (
            <p className={cn(
              'text-xs',
              variant === 'default' ? 'text-muted-foreground' : 'opacity-80'
            )}>
              {subtitle}
            </p>
          )}
          {trend && (
            <p className={cn(
              'text-xs font-medium flex items-center gap-1',
              trend.isPositive ? 'text-green-500' : 'text-red-500'
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              <span className="text-muted-foreground ml-1">vs ontem</span>
            </p>
          )}
        </div>
        <div className={cn(
          'p-3 rounded-xl',
          iconBgClasses[variant]
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
