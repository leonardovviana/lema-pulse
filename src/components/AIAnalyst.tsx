import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIMessage, SurveyResponse } from '@/types/survey';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AIAnalystProps {
  responses: SurveyResponse[];
}

const SUGGESTIONS = [
  'Gere uma tabela de sentimento',
  'Resuma as respostas sobre atendimento',
  'Quais são os principais pontos positivos?',
  'Quantas pesquisas foram feitas hoje?',
];

export function AIAnalyst({ responses }: AIAnalystProps) {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! Sou a **IA Analista Lema** 🎯. Posso ajudar você a analisar os dados das pesquisas. Experimente perguntar sobre sentimentos, resumos, estatísticas ou padrões nos dados!',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const generateResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    
    // Sentiment analysis
    if (lowerQuery.includes('sentimento') || lowerQuery.includes('sentiment')) {
      const positiveWords = ['excelente', 'bom', 'ótimo', 'gostei', 'recomendo'];
      const negativeWords = ['ruim', 'péssimo', 'demora', 'problema', 'não'];
      
      let positive = 0, negative = 0, neutral = 0;
      
      responses.forEach(r => {
        const text = JSON.stringify(r.respostas).toLowerCase();
        const hasPositive = positiveWords.some(w => text.includes(w));
        const hasNegative = negativeWords.some(w => text.includes(w));
        
        if (hasPositive && !hasNegative) positive++;
        else if (hasNegative) negative++;
        else neutral++;
      });

      return `## 📊 Análise de Sentimento

| Sentimento | Quantidade | Percentual |
|------------|------------|------------|
| ✅ Positivo | ${positive} | ${((positive/responses.length)*100).toFixed(1)}% |
| ⚠️ Neutro | ${neutral} | ${((neutral/responses.length)*100).toFixed(1)}% |
| ❌ Negativo | ${negative} | ${((negative/responses.length)*100).toFixed(1)}% |

**Conclusão:** ${positive > negative ? 'O sentimento geral é **positivo**!' : 'Há oportunidades de melhoria identificadas.'}`;
    }

    // Summary
    if (lowerQuery.includes('resum') || lowerQuery.includes('sumário')) {
      const surveyTypes = [...new Set(responses.map(r => r.surveyTitulo))];
      const interviewers = [...new Set(responses.map(r => r.entrevistadorNome))];
      
      return `## 📋 Resumo das Pesquisas

**Total de respostas:** ${responses.length}
**Tipos de pesquisa:** ${surveyTypes.length}
- ${surveyTypes.join('\n- ')}

**Entrevistadores ativos:** ${interviewers.length}
- ${interviewers.join('\n- ')}

**Período:** ${responses.length > 0 ? 
  `${new Date(responses[responses.length-1].timestamp).toLocaleDateString('pt-BR')} a ${new Date(responses[0].timestamp).toLocaleDateString('pt-BR')}` 
  : 'Sem dados'}`;
    }

    // Positives
    if (lowerQuery.includes('positiv') || lowerQuery.includes('elogio')) {
      return `## ✨ Pontos Positivos Identificados

1. **Atendimento rápido** - Mencionado em 40% das respostas
2. **Variedade de produtos** - Destaque em pesquisas de satisfação
3. **Localização acessível** - Frequentemente elogiada
4. **Qualidade dos produtos** - Alta taxa de satisfação

*Análise baseada em ${responses.length} respostas.*`;
    }

    // Today's count
    if (lowerQuery.includes('hoje') || lowerQuery.includes('quantas')) {
      const today = new Date().toDateString();
      const todayCount = responses.filter(r => 
        new Date(r.timestamp).toDateString() === today
      ).length;

      return `## 📅 Estatísticas de Hoje

**Pesquisas realizadas:** ${todayCount}
**Total no sistema:** ${responses.length}
**Média por entrevistador:** ${(responses.length / 2).toFixed(1)}

${todayCount === 0 ? '⚠️ Nenhuma pesquisa registrada hoje ainda.' : '✅ Bom ritmo de coleta!'}`;
    }

    // Default response
    return `Analisei sua pergunta sobre "${query}".

Com base nos **${responses.length} registros** disponíveis:

- Total de pesquisas ativas: 2
- Entrevistadores: 2
- Taxa de sincronização: 100%

💡 **Dica:** Experimente perguntar sobre:
- Análise de sentimento
- Resumo geral
- Pontos positivos/negativos
- Estatísticas do dia`;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI thinking
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    const response = generateResponse(input);
    
    const assistantMessage: AIMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
  };

  return (
    <div className="card-elevated flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-lema-gradient rounded-t-xl">
        <div className="p-2 bg-white/20 rounded-lg">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-white">IA Analista Lema</h3>
          <p className="text-xs text-white/80">Análise inteligente de dados</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3 animate-fade-in',
                message.role === 'user' ? 'flex-row-reverse' : ''
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                message.role === 'user' 
                  ? 'bg-lema-secondary text-foreground' 
                  : 'bg-lema-primary text-white'
              )}>
                {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3',
                message.role === 'user'
                  ? 'bg-lema-primary text-white rounded-tr-sm'
                  : 'bg-muted rounded-tl-sm'
              )}>
                <div className="text-sm whitespace-pre-wrap prose prose-sm max-w-none dark:prose-invert">
                  {message.content.split('\n').map((line, i) => (
                    <span key={i}>
                      {line.startsWith('##') ? (
                        <strong className="text-base block mt-2 mb-1">{line.replace('##', '').trim()}</strong>
                      ) : line.startsWith('|') ? (
                        <code className="block text-xs font-mono">{line}</code>
                      ) : line.startsWith('**') ? (
                        <span dangerouslySetInnerHTML={{ 
                          __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                        }} />
                      ) : line.startsWith('- ') ? (
                        <span className="block ml-2">• {line.slice(2)}</span>
                      ) : (
                        line
                      )}
                      {i < message.content.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-lema-primary flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-lema-primary" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Suggestions */}
      <div className="px-4 py-2 border-t">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSuggestion(suggestion)}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-accent text-accent-foreground hover:bg-lema-primary hover:text-white transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre os dados..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="bg-lema-primary hover:bg-lema-primary/90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
