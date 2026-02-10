export type QuestionType = 'text' | 'radio' | 'checkbox' | 'select';
export type PromptType = 'espontanea' | 'estimulada' | 'mista';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  promptType: PromptType;
  options?: string[];
  suggestedOptions?: string[];
  allowOther?: boolean;
  required?: boolean;
  blockId?: string | null;
  blockTitle?: string | null;
}

export interface SurveyBlock {
  id: string;
  titulo: string;
  descricao?: string | null;
  ordem: number;
}

export interface Survey {
  id: string;
  titulo: string;
  descricao: string;
  blocos?: SurveyBlock[];
  perguntas: Question[];
  ativa: boolean;
  createdAt: string;
  versao?: number;
}

export type AnswerValue =
  | string
  | string[]
  | {
      opcao?: string | string[];
      outro?: string;
    };

export interface SurveyResponse {
  id: string;
  surveyId: string;
  surveyTitulo: string;
  entrevistadorId: string;
  entrevistadorNome: string;
  respostas: Record<string, AnswerValue>;
  audioBlob?: string; // Base64 encoded
  gps: {
    latitude: number;
    longitude: number;
  } | null;
  timestamp: string;
  synced: boolean;
  pesquisaVersao?: number;
}

export interface User {
  id: string;
  nome: string;
  pin: string;
  role: 'entrevistador' | 'admin';
  avatar?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  isSyncing: boolean;
}

export interface DailyStats {
  date: string;
  completed: number;
  target: number;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
