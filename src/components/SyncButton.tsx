import { RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncButtonProps {
  pendingCount: number;
  isSyncing: boolean;
  isOnline: boolean;
  onSync: () => void;
}

export function SyncButton({ pendingCount, isSyncing, isOnline, onSync }: SyncButtonProps) {
  const isDisabled = !isOnline || isSyncing || pendingCount === 0;

  return (
    <button
      onClick={onSync}
      disabled={isDisabled}
      className={cn(
        'relative w-full py-5 px-8 rounded-2xl font-bold text-lg transition-all duration-300',
        'flex items-center justify-center gap-3',
        'shadow-lg hover:shadow-xl',
        isDisabled 
          ? 'bg-muted text-muted-foreground cursor-not-allowed'
          : 'bg-lema-gradient-accent text-foreground hover:scale-[1.02] active:scale-95'
      )}
    >
      {isSyncing ? (
        <>
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Sincronizando...</span>
        </>
      ) : isOnline ? (
        <>
          <Cloud className="w-6 h-6" />
          <span>SINCRONIZAR AGORA</span>
        </>
      ) : (
        <>
          <CloudOff className="w-6 h-6" />
          <span>SEM CONEXÃO</span>
        </>
      )}

      {pendingCount > 0 && !isSyncing && (
        <span className={cn(
          'absolute -top-2 -right-2 w-8 h-8 rounded-full',
          'flex items-center justify-center text-sm font-bold',
          'bg-lema-primary text-white shadow-md',
          'animate-scale-in'
        )}>
          {pendingCount}
        </span>
      )}
    </button>
  );
}
