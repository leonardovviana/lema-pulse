import { Survey, SurveyResponse, User, DailyStats } from '@/types/survey';

export const mockUsers: User[] = [
  {
    id: 'ent-001',
    nome: 'Maria Silva',
    pin: '1234',
    role: 'entrevistador',
  },
  {
    id: 'ent-002',
    nome: 'João Santos',
    pin: '5678',
    role: 'entrevistador',
  },
  {
    id: 'adm-001',
    nome: 'Ana Gerente',
    pin: '0000',
    role: 'admin',
  },
];

export const mockSurveys: Survey[] = [
  {
    id: 'surv-001',
    titulo: 'Pesquisa de Satisfação - Varejo',
    descricao: 'Avaliação da experiência de compra em lojas físicas',
    ativa: true,
    createdAt: '2024-01-15',
    perguntas: [
      {
        id: 'q1',
        text: 'Como você avalia a qualidade do atendimento?',
        type: 'radio',
        options: ['Excelente', 'Bom', 'Regular', 'Ruim', 'Péssimo'],
        required: true,
      },
      {
        id: 'q2',
        text: 'Qual foi o tempo de espera para ser atendido?',
        type: 'select',
        options: ['Menos de 5 min', '5-10 min', '10-20 min', 'Mais de 20 min'],
        required: true,
      },
      {
        id: 'q3',
        text: 'Quais aspectos você mais valoriza? (múltipla escolha)',
        type: 'checkbox',
        options: ['Preço', 'Qualidade', 'Variedade', 'Atendimento', 'Localização'],
        required: false,
      },
      {
        id: 'q4',
        text: 'Você recomendaria esta loja para amigos?',
        type: 'radio',
        options: ['Sim, com certeza', 'Provavelmente sim', 'Talvez', 'Provavelmente não', 'Não'],
        required: true,
      },
      {
        id: 'q5',
        text: 'Deixe um comentário ou sugestão:',
        type: 'text',
        required: false,
      },
    ],
  },
  {
    id: 'surv-002',
    titulo: 'Pesquisa Eleitoral - Município',
    descricao: 'Intenção de voto para prefeito 2024',
    ativa: true,
    createdAt: '2024-01-20',
    perguntas: [
      {
        id: 'q1',
        text: 'Em quem você pretende votar para prefeito?',
        type: 'radio',
        options: ['Candidato A', 'Candidato B', 'Candidato C', 'Branco/Nulo', 'Indeciso'],
        required: true,
      },
      {
        id: 'q2',
        text: 'Qual seu grau de certeza nesta escolha?',
        type: 'radio',
        options: ['Totalmente decidido', 'Quase decidido', 'Ainda pensando'],
        required: true,
      },
      {
        id: 'q3',
        text: 'Qual tema é mais importante para você?',
        type: 'select',
        options: ['Saúde', 'Educação', 'Segurança', 'Emprego', 'Infraestrutura'],
        required: true,
      },
    ],
  },
];

export const mockResponses: SurveyResponse[] = [
  {
    id: 'resp-001',
    surveyId: 'surv-001',
    surveyTitulo: 'Pesquisa de Satisfação - Varejo',
    entrevistadorId: 'ent-001',
    entrevistadorNome: 'Maria Silva',
    respostas: {
      q1: 'Bom',
      q2: '5-10 min',
      q3: ['Preço', 'Qualidade'],
      q4: 'Provavelmente sim',
      q5: 'Gostei muito da variedade de produtos.',
    },
    gps: { latitude: -23.5505, longitude: -46.6333 },
    timestamp: '2024-02-01T10:30:00Z',
    synced: true,
  },
  {
    id: 'resp-002',
    surveyId: 'surv-001',
    surveyTitulo: 'Pesquisa de Satisfação - Varejo',
    entrevistadorId: 'ent-002',
    entrevistadorNome: 'João Santos',
    respostas: {
      q1: 'Excelente',
      q2: 'Menos de 5 min',
      q3: ['Atendimento', 'Localização'],
      q4: 'Sim, com certeza',
      q5: '',
    },
    gps: { latitude: -23.5489, longitude: -46.6388 },
    timestamp: '2024-02-01T11:15:00Z',
    synced: true,
  },
  {
    id: 'resp-003',
    surveyId: 'surv-002',
    surveyTitulo: 'Pesquisa Eleitoral - Município',
    entrevistadorId: 'ent-001',
    entrevistadorNome: 'Maria Silva',
    respostas: {
      q1: 'Candidato A',
      q2: 'Totalmente decidido',
      q3: 'Saúde',
    },
    gps: { latitude: -23.5510, longitude: -46.6340 },
    timestamp: '2024-02-01T14:00:00Z',
    synced: true,
  },
  {
    id: 'resp-004',
    surveyId: 'surv-001',
    surveyTitulo: 'Pesquisa de Satisfação - Varejo',
    entrevistadorId: 'ent-001',
    entrevistadorNome: 'Maria Silva',
    respostas: {
      q1: 'Regular',
      q2: '10-20 min',
      q3: ['Preço'],
      q4: 'Talvez',
      q5: 'Muito tempo de espera.',
    },
    gps: { latitude: -23.5520, longitude: -46.6350 },
    timestamp: '2024-02-02T09:45:00Z',
    synced: true,
  },
  {
    id: 'resp-005',
    surveyId: 'surv-002',
    surveyTitulo: 'Pesquisa Eleitoral - Município',
    entrevistadorId: 'ent-002',
    entrevistadorNome: 'João Santos',
    respostas: {
      q1: 'Candidato B',
      q2: 'Quase decidido',
      q3: 'Emprego',
    },
    gps: { latitude: -23.5530, longitude: -46.6360 },
    timestamp: '2024-02-02T10:30:00Z',
    synced: true,
  },
];

export const mockDailyStats: DailyStats[] = [
  { date: '2024-02-01', completed: 15, target: 20 },
  { date: '2024-02-02', completed: 22, target: 20 },
  { date: '2024-02-03', completed: 18, target: 20 },
  { date: '2024-02-04', completed: 25, target: 20 },
  { date: '2024-02-05', completed: 12, target: 20 },
  { date: '2024-02-06', completed: 28, target: 20 },
  { date: '2024-02-07', completed: 20, target: 20 },
];

export const getResponseDistribution = (surveyId: string, questionId: string) => {
  const responses = mockResponses.filter(r => r.surveyId === surveyId);
  const distribution: Record<string, number> = {};
  
  responses.forEach(r => {
    const answer = r.respostas[questionId];
    if (typeof answer === 'string') {
      distribution[answer] = (distribution[answer] || 0) + 1;
    } else if (Array.isArray(answer)) {
      answer.forEach(a => {
        distribution[a] = (distribution[a] || 0) + 1;
      });
    }
  });
  
  return Object.entries(distribution).map(([name, value]) => ({ name, value }));
};
