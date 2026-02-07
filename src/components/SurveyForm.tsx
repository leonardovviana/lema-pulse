import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, MapPin, Mic, Check, AlertCircle } from 'lucide-react';
import { Survey, Question, SurveyResponse } from '@/types/survey';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useSyncToSupabase } from '@/hooks/useSyncToSupabase';
import { RecordingIndicator } from '@/components/RecordingIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SurveyFormProps {
  survey: Survey;
  onComplete: () => void;
}

export function SurveyForm({ survey, onComplete }: SurveyFormProps) {
  const navigate = useNavigate();
  const { user, profile } = useSupabaseAuthContext();
  const { addResponse } = useSyncToSupabase();
  const { startRecording, stopRecording, isRecording, duration, getBase64Audio } = useAudioRecorder();
  const { getCurrentPosition, latitude, longitude } = useGeolocation();
  
  const [currentStep, setCurrentStep] = useState(0); // 0 = start, 1+ = questions
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [gps, setGps] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = survey.perguntas.length + 1; // +1 for start step
  const progress = (currentStep / totalSteps) * 100;

  // Start survey: capture GPS and start recording
  const handleStart = async () => {
    toast.info('Iniciando pesquisa...');
    
    // Capture GPS
    const coords = await getCurrentPosition();
    if (coords) {
      setGps(coords);
    }

    // Start audio recording
    await startRecording();

    // Move to first question
    setCurrentStep(1);
  };

  const handleAnswer = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    setAnswers(prev => {
      const current = (prev[questionId] as string[]) || [];
      if (checked) {
        return { ...prev, [questionId]: [...current, option] };
      } else {
        return { ...prev, [questionId]: current.filter(o => o !== option) };
      }
    });
  };

  const canProceed = () => {
    if (currentStep === 0) return true;
    
    const question = survey.perguntas[currentStep - 1];
    if (!question.required) return true;
    
    const answer = answers[question.id];
    if (Array.isArray(answer)) return answer.length > 0;
    return !!answer;
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Stop recording
      stopRecording();
      
      // Wait a bit for recording to finalize
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get audio as base64
      const audioBase64 = await getBase64Audio();

      // Create response object
      const response: SurveyResponse = {
        id: `resp-${Date.now()}`,
        surveyId: survey.id,
        surveyTitulo: survey.titulo,
        entrevistadorId: user?.id || 'unknown',
        entrevistadorNome: profile?.nome || 'Desconhecido',
        respostas: answers,
        audioBlob: audioBase64 || undefined,
        gps: gps,
        timestamp: new Date().toISOString(),
        synced: false,
      };

      // Add to sync queue
      addResponse(response);

      toast.success('Pesquisa concluída!', {
        description: 'Os dados foram salvos com sucesso.',
      });

      onComplete();
    } catch (error) {
      console.error('Error submitting survey:', error);
      toast.error('Erro ao salvar pesquisa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (question: Question) => {
    switch (question.type) {
      case 'text':
        return (
          <Textarea
            value={(answers[question.id] as string) || ''}
            onChange={(e) => handleAnswer(question.id, e.target.value)}
            placeholder="Digite sua resposta..."
            className="min-h-[120px] text-lg"
          />
        );
      
      case 'radio':
        return (
          <RadioGroup
            value={(answers[question.id] as string) || ''}
            onValueChange={(value) => handleAnswer(question.id, value)}
            className="space-y-3"
          >
            {question.options?.map((option) => (
              <div
                key={option}
                className={cn(
                  'flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer',
                  answers[question.id] === option
                    ? 'border-lema-primary bg-accent'
                    : 'border-border hover:border-lema-primary/50'
                )}
                onClick={() => handleAnswer(question.id, option)}
              >
                <RadioGroupItem value={option} id={option} />
                <Label htmlFor={option} className="flex-1 cursor-pointer text-base">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );
      
      case 'checkbox':
        return (
          <div className="space-y-3">
            {question.options?.map((option) => {
              const isChecked = ((answers[question.id] as string[]) || []).includes(option);
              return (
                <div
                  key={option}
                  className={cn(
                    'flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer',
                    isChecked
                      ? 'border-lema-primary bg-accent'
                      : 'border-border hover:border-lema-primary/50'
                  )}
                  onClick={() => handleCheckboxChange(question.id, option, !isChecked)}
                >
                  <Checkbox checked={isChecked} />
                  <Label className="flex-1 cursor-pointer text-base">{option}</Label>
                </div>
              );
            })}
          </div>
        );
      
      case 'select':
        return (
          <Select
            value={(answers[question.id] as string) || ''}
            onValueChange={(value) => handleAnswer(question.id, value)}
          >
            <SelectTrigger className="h-14 text-lg">
              <SelectValue placeholder="Selecione uma opção..." />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option} value={option} className="text-base py-3">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Recording Indicator */}
      <RecordingIndicator isRecording={isRecording} duration={duration} />

      {/* Progress Bar */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            {currentStep === 0 ? 'Início' : `Pergunta ${currentStep} de ${survey.perguntas.length}`}
          </span>
          <span className="text-sm font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Content */}
      <div className="p-4 animate-fade-in">
        {currentStep === 0 ? (
          // Start Screen
          <div className="text-center py-8 space-y-6">
            <div className="w-20 h-20 mx-auto bg-lema-gradient rounded-2xl flex items-center justify-center">
              <MapPin className="w-10 h-10 text-white" />
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {survey.titulo}
              </h1>
              <p className="text-muted-foreground">
                {survey.descricao}
              </p>
            </div>

            <div className="bg-accent rounded-xl p-4 text-left space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-lema-primary mt-0.5" />
                <div>
                  <p className="font-medium">Localização GPS</p>
                  <p className="text-sm text-muted-foreground">
                    Será capturada automaticamente ao iniciar
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mic className="w-5 h-5 text-lema-primary mt-0.5" />
                <div>
                  <p className="font-medium">Gravação de Áudio</p>
                  <p className="text-sm text-muted-foreground">
                    A entrevista será gravada para fins de auditoria
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <p className="text-sm text-orange-800 text-left">
                Certifique-se de que o entrevistado está ciente da gravação antes de prosseguir.
              </p>
            </div>

            <Button
              onClick={handleStart}
              className="w-full h-14 text-lg btn-primary-lema"
            >
              Iniciar Pesquisa
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        ) : currentStep <= survey.perguntas.length ? (
          // Question Screen
          <div className="space-y-6 py-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-lema-primary">
                  Pergunta {currentStep}
                </span>
                {survey.perguntas[currentStep - 1].required && (
                  <span className="text-xs text-red-500">*Obrigatória</span>
                )}
              </div>
              <h2 className="text-xl font-semibold">
                {survey.perguntas[currentStep - 1].text}
              </h2>
            </div>

            {renderQuestion(survey.perguntas[currentStep - 1])}
          </div>
        ) : (
          // Completion Screen
          <div className="text-center py-8 space-y-6">
            <div className="w-20 h-20 mx-auto bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-10 h-10 text-white" />
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Pesquisa Completa!
              </h1>
              <p className="text-muted-foreground">
                Revise as informações e confirme o envio.
              </p>
            </div>

            <div className="bg-muted rounded-xl p-4 text-left space-y-2">
              <p><strong>Pesquisa:</strong> {survey.titulo}</p>
              <p><strong>Respostas:</strong> {Object.keys(answers).length}</p>
              <p><strong>GPS:</strong> {gps ? `${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}` : 'Não capturado'}</p>
              <p><strong>Áudio:</strong> {isRecording ? `${duration}s gravados` : 'Finalizado'}</p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-14 text-lg btn-primary-lema"
            >
              {isSubmitting ? 'Salvando...' : 'Confirmar e Salvar'}
            </Button>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      {currentStep > 0 && currentStep <= survey.perguntas.length && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-4">
          <div className="flex gap-3 max-w-lg mx-auto">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep <= 1}
              className="flex-1 h-12"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
            <Button
              onClick={currentStep === survey.perguntas.length ? () => setCurrentStep(totalSteps) : handleNext}
              disabled={!canProceed()}
              className="flex-1 h-12 bg-lema-primary hover:bg-lema-primary/90"
            >
              {currentStep === survey.perguntas.length ? 'Finalizar' : 'Próxima'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
