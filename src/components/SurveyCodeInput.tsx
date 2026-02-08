import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Key, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface SurveyCodeInputProps {
  onSurveyUnlocked: (survey: {
    id: string;
    titulo: string;
    descricao: string | null;
  }) => void;
}

export function SurveyCodeInput({ onSurveyUnlocked }: SurveyCodeInputProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCodeChange = (value: string) => {
    // Uppercase and remove non-alphanumeric
    const filtered = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      toast.error('O código deve ter 6 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pesquisas')
        .select('id, titulo, descricao')
        .eq('codigo_liberacao', code)
        .eq('ativa', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error('Código inválido', {
          description: 'Verifique o código e tente novamente.'
        });
        return;
      }

      toast.success('Pesquisa liberada!', {
        description: data.titulo
      });
      onSurveyUnlocked(data);
    } catch (error: any) {
      console.error('Error validating code:', error);
      toast.error('Erro ao validar código', {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-xl shadow-lg border p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Key className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Código de Liberação</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Digite o código fornecido pelo administrador
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Código da Pesquisa</Label>
          <Input
            id="code"
            type="text"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="h-14 text-center text-2xl tracking-[0.3em] font-mono uppercase"
            maxLength={6}
          />
          <p className="text-xs text-muted-foreground text-center">
            6 caracteres (letras e números)
          </p>
        </div>

        <Button
          type="submit"
          disabled={code.length !== 6 || isLoading}
          className="w-full h-12 text-lg bg-primary hover:bg-primary/90"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Liberar Pesquisa
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
