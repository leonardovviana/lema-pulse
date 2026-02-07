export type QuestionType = 'text' | 'radio' | 'checkbox' | 'select';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  required?: boolean;
}

export interface Survey {
  id: string;
  titulo: string;
  descricao: string;
  perguntas: Question[];
  ativa: boolean;
  createdAt: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  surveyTitulo: string;
  entrevistadorId: string;
  entrevistadorNome: string;
  respostas: Record<string, string | string[]>;
  audioBlob?: string; // Base64 encoded
  gps: {
    latitude: number;
    longitude: number;
  } | null;
  timestamp: string;
  synced: boolean;
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
