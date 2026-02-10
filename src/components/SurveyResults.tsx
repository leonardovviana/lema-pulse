import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter,
    DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { AnswerValue } from '@/types/survey';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, ChevronDown, Download, FileText, Merge, Shuffle } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell, LabelList,
    ResponsiveContainer,
    Tooltip,
    XAxis, YAxis,
} from 'recharts';
import { toast } from 'sonner';

// ── Lema brand colors ──────────────────────────────────
const LEMA_ORANGE = '#FF9F00';
const LEMA_MAGENTA = '#90205D';
const CHART_COLORS = [
  LEMA_ORANGE, LEMA_MAGENTA, '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#F97316', '#06B6D4',
];

// ── Types ──────────────────────────────────────────────
interface QuestionData {
  id: string;
  texto: string;
  tipo: string;
  tipo_pergunta: string | null;
  opcoes: string[] | null;
  ordem: number;
  versao?: number;
}

interface SurveyOption {
  id: string;
  titulo: string;
  versao: number;
  perguntas: QuestionData[];
}

interface ResponseRow {
  id: string;
  pesquisa_id: string;
  entrevistador_id: string;
  respostas: Record<string, AnswerValue>;
  created_at: string;
  pesquisa_versao: number;
  profiles: { nome: string; equipe: string | null } | null;
}

interface QuestionAnalysis {
  question: QuestionData;
  index: number;
  entries: [string, number][];
  total: number;
}

// ── Helpers ────────────────────────────────────────────
/** Normaliza valor: trim + colapsar espaços internos múltiplos */
function normalizeValue(v: string): string {
  return v.trim().replace(/\s+/g, ' ');
}

function extractValues(val: AnswerValue | undefined): string[] {
  if (!val) return [];
  if (typeof val === 'string') { const n = normalizeValue(val); return n ? [n] : []; }
  if (Array.isArray(val)) return val.map(normalizeValue).filter(Boolean);
  if (typeof val === 'object') {
    const results: string[] = [];
    if (typeof val.opcao === 'string' && val.opcao) results.push(normalizeValue(val.opcao));
    else if (Array.isArray(val.opcao)) results.push(...val.opcao.map(normalizeValue).filter(Boolean));
    if (val.outro?.trim()) results.push(normalizeValue(val.outro));
    return results;
  }
  return [];
}

function extractSingleValue(val: AnswerValue | undefined): string | null {
  const vals = extractValues(val);
  return vals[0] || null;
}

// ── Main component ─────────────────────────────────────
export function SurveyResults() {
  const queryClient = useQueryClient();
  const [selectedSurvey, setSelectedSurvey] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<string>('all');
  const [subTab, setSubTab] = useState<'analysis' | 'cross'>('analysis');
  const [crossRowQ, setCrossRowQ] = useState('');
  const [crossColQ, setCrossColQ] = useState('');

  // Merge state
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeQuestionId, setMergeQuestionId] = useState('');
  const [mergeSelectedValues, setMergeSelectedValues] = useState<string[]>([]);
  const [mergeTargetValue, setMergeTargetValue] = useState('');

  // Fetch all surveys (including inactive)
  const { data: surveys, isLoading: surveysLoading } = useQuery({
    queryKey: ['results-surveys'],
    queryFn: async (): Promise<SurveyOption[]> => {
      const { data, error } = await supabase
        .from('pesquisas')
        .select('*, perguntas(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((s: { id: string; titulo: string; versao?: number; perguntas: QuestionData[] }) => ({
        id: s.id,
        titulo: s.titulo,
        versao: (s.versao as number) || 1,
        perguntas: (s.perguntas || []).sort((a: QuestionData, b: QuestionData) => a.ordem - b.ordem),
      }));
    },
    staleTime: 30_000,
  });

  // Fetch responses for selected survey
  const { data: responses, isLoading: responsesLoading } = useQuery({
    queryKey: ['results-responses', selectedSurvey],
    queryFn: async (): Promise<ResponseRow[]> => {
      const { data, error } = await supabase
        .from('respostas')
        .select(`
          *,
          profiles:profiles!respostas_entrevistador_profile_fkey(nome, equipe)
        `)
        .eq('pesquisa_id', selectedSurvey)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r: Record<string, unknown>) => ({
        ...r,
        pesquisa_versao: (r.pesquisa_versao as number) || 1,
      })) as unknown as ResponseRow[];
    },
    enabled: !!selectedSurvey,
    staleTime: 15_000,
  });

  const survey = surveys?.find(s => s.id === selectedSurvey);

  // Compute available versions from responses
  const availableVersions = useMemo(() => {
    if (!responses?.length) return [1];
    const versions = Array.from(new Set(responses.map(r => r.pesquisa_versao || 1))).sort((a, b) => a - b);
    return versions.length > 0 ? versions : [1];
  }, [responses]);

  // Filter responses by selected version
  const filteredResponses = useMemo(() => {
    if (!responses) return [];
    if (selectedVersion === 'all') return responses;
    return responses.filter(r => (r.pesquisa_versao || 1) === Number(selectedVersion));
  }, [responses, selectedVersion]);

  // Get questions for the selected version
  const questions = useMemo(() => {
    if (!survey?.perguntas?.length) return [];
    if (selectedVersion === 'all') {
      // Show questions for the latest version
      const latestVersion = survey.versao || 1;
      const versionQuestions = survey.perguntas.filter(q => (q.versao || 1) === latestVersion);
      return versionQuestions.length > 0 ? versionQuestions : survey.perguntas;
    }
    const versionQuestions = survey.perguntas.filter(q => (q.versao || 1) === Number(selectedVersion));
    return versionQuestions.length > 0 ? versionQuestions : survey.perguntas;
  }, [survey, selectedVersion]);

  const totalResponses = filteredResponses.length;

  // ── Per-question analysis ──
  const questionAnalysis = useMemo((): QuestionAnalysis[] => {
    if (!questions.length || !filteredResponses?.length) return [];
    return questions.map((q, idx) => {
      const counts = new Map<string, number>();
      let totalAnswered = 0;

      for (const resp of filteredResponses) {
        const vals = extractValues(resp.respostas[q.id]);
        if (vals.length > 0) {
          totalAnswered++;
          vals.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
        }
      }

      const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
      return { question: q, index: idx + 1, entries, total: totalAnswered };
    });
  }, [questions, filteredResponses]);

  // ── Cross-tabulation ──
  const crossData = useMemo(() => {
    if (!crossRowQ || !crossColQ || !filteredResponses?.length) return null;

    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    const matrix = new Map<string, Map<string, number>>();

    for (const resp of filteredResponses) {
      const rv = extractSingleValue(resp.respostas[crossRowQ]);
      const cv = extractSingleValue(resp.respostas[crossColQ]);
      if (!rv || !cv) continue;

      rowSet.add(rv);
      colSet.add(cv);
      if (!matrix.has(rv)) matrix.set(rv, new Map());
      matrix.get(rv)!.set(cv, (matrix.get(rv)!.get(cv) || 0) + 1);
    }

    if (rowSet.size === 0) return null;
    return {
      rows: Array.from(rowSet).sort(),
      cols: Array.from(colSet).sort(),
      matrix,
    };
  }, [crossRowQ, crossColQ, filteredResponses]);

  // ── Merge answers mutation ──
  const mergeMutation = useMutation({
    mutationFn: async ({ questionId, oldValues, newValue }: { questionId: string; oldValues: string[]; newValue: string }) => {
      // Find all responses that contain one of the old values for this question
      const affectedResponses = (responses || []).filter(r => {
        const vals = extractValues(r.respostas[questionId]);
        return vals.some(v => oldValues.includes(v));
      });

      let updated = 0;
      for (const resp of affectedResponses) {
        const currentRespostas = { ...resp.respostas };
        const currentVal = currentRespostas[questionId];

        // Replace the value
        if (typeof currentVal === 'string') {
          const normalized = normalizeValue(currentVal);
          if (oldValues.includes(normalized)) {
            currentRespostas[questionId] = newValue;
          }
        } else if (Array.isArray(currentVal)) {
          currentRespostas[questionId] = currentVal.map(v => {
            const normalized = normalizeValue(v);
            return oldValues.includes(normalized) ? newValue : v;
          });
        } else if (typeof currentVal === 'object' && currentVal !== null) {
          const patched = { ...currentVal };
          if (typeof patched.opcao === 'string' && oldValues.includes(normalizeValue(patched.opcao))) {
            patched.opcao = newValue;
          } else if (Array.isArray(patched.opcao)) {
            patched.opcao = patched.opcao.map(v => oldValues.includes(normalizeValue(v)) ? newValue : v);
          }
          if (patched.outro && oldValues.includes(normalizeValue(patched.outro))) {
            patched.outro = newValue;
          }
          currentRespostas[questionId] = patched;
        }

        const { error } = await supabase
          .from('respostas')
          .update({ respostas: currentRespostas })
          .eq('id', resp.id);

        if (error) throw error;
        updated++;
      }

      return updated;
    },
    onSuccess: (count) => {
      toast.success(`${count} resposta(s) atualizadas!`);
      queryClient.invalidateQueries({ queryKey: ['results-responses', selectedSurvey] });
      setMergeDialogOpen(false);
      setMergeSelectedValues([]);
      setMergeTargetValue('');
      setMergeQuestionId('');
    },
    onError: (error: Error) => {
      toast.error('Erro ao unificar respostas', { description: error.message });
    },
  });

  const openMergeDialog = (questionId: string, entries: [string, number][]) => {
    setMergeQuestionId(questionId);
    setMergeSelectedValues([]);
    setMergeTargetValue('');
    setMergeDialogOpen(true);
  };

  const handleMerge = () => {
    if (mergeSelectedValues.length < 2) {
      toast.error('Selecione pelo menos 2 valores para unificar');
      return;
    }
    if (!mergeTargetValue.trim()) {
      toast.error('Digite o valor final');
      return;
    }
    mergeMutation.mutate({
      questionId: mergeQuestionId,
      oldValues: mergeSelectedValues,
      newValue: mergeTargetValue.trim(),
    });
  };

  // ── Export to Word ──
  const handleExportWord = async () => {
    if (!survey || !responses?.length || !questionAnalysis.length) {
      toast.error('Selecione uma pesquisa com respostas para exportar');
      return;
    }

    toast.info('Gerando relatório Word...', { duration: 2000 });

    try {
      const docx = await import('docx');
      const hdrColor = '90205D';
      const accColor = 'FF9F00';

      const makeCellText = (
        text: string,
        opts?: { bold?: boolean; color?: string; size?: number; alignment?: (typeof docx.AlignmentType)[keyof typeof docx.AlignmentType] },
      ) =>
        new docx.Paragraph({
          alignment: opts?.alignment ?? docx.AlignmentType.CENTER,
          children: [
            new docx.TextRun({
              text,
              bold: opts?.bold ?? false,
              color: opts?.color,
              size: opts?.size ?? 20,
            }),
          ],
        });

      // Build per-question sections
      const buildQuestionSection = (a: QuestionAnalysis) => {
        const children: (InstanceType<typeof docx.Paragraph> | InstanceType<typeof docx.Table>)[] = [];
        const tipo = a.question.tipo_pergunta || 'estimulada';

        children.push(
          new docx.Paragraph({
            spacing: { before: 400, after: 100 },
            children: [
              new docx.TextRun({
                text: `${a.index}. ${a.question.texto.toUpperCase()}`,
                bold: true,
                size: 24,
                color: hdrColor,
              }),
            ],
          }),
        );

        children.push(
          new docx.Paragraph({
            spacing: { after: 200 },
            children: [
              new docx.TextRun({ text: 'Pergunta: ', bold: true, size: 20 }),
              new docx.TextRun({ text: `"${a.question.texto}"`, italics: true, size: 20 }),
              new docx.TextRun({ text: `  (${tipo})`, size: 16, color: '888888' }),
            ],
          }),
        );

        if (a.entries.length === 0) {
          children.push(
            new docx.Paragraph({
              children: [new docx.TextRun({ text: 'Nenhuma resposta registrada.', italics: true, size: 20 })],
            }),
          );
          return children;
        }

        const headerRow = new docx.TableRow({
          tableHeader: true,
          children: ['Resposta', `Contagem`, `Porcentagem`].map(
            (label) =>
              new docx.TableCell({
                shading: { type: docx.ShadingType.CLEAR, fill: hdrColor },
                verticalAlign: docx.VerticalAlign.CENTER,
                children: [makeCellText(label, { bold: true, color: 'FFFFFF' })],
              }),
          ),
        });

        const dataRows = a.entries.map(([label, count], i) => {
          const pct = a.total > 0 ? ((count / a.total) * 100).toFixed(1) : '0.0';
          const fill = i % 2 === 0 ? 'FFFFFF' : 'F5F5F5';
          return new docx.TableRow({
            children: [
              new docx.TableCell({
                shading: { type: docx.ShadingType.CLEAR, fill },
                children: [makeCellText(label, { bold: true, alignment: docx.AlignmentType.LEFT })],
              }),
              new docx.TableCell({
                shading: { type: docx.ShadingType.CLEAR, fill },
                children: [makeCellText(String(count))],
              }),
              new docx.TableCell({
                shading: { type: docx.ShadingType.CLEAR, fill },
                children: [makeCellText(`${pct}%`)],
              }),
            ],
          });
        });

        const totalRow = new docx.TableRow({
          children: ['Total Geral', String(a.total), '100.0%'].map(
            (text) =>
              new docx.TableCell({
                shading: { type: docx.ShadingType.CLEAR, fill: accColor },
                verticalAlign: docx.VerticalAlign.CENTER,
                children: [makeCellText(text, { bold: true, color: 'FFFFFF' })],
              }),
          ),
        });

        children.push(
          new docx.Table({
            width: { size: 100, type: docx.WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows, totalRow],
          }),
        );

        return children;
      };

      // Build cross-tab section
      const buildCrossSection = () => {
        if (!crossData) return [];
        const children: (InstanceType<typeof docx.Paragraph> | InstanceType<typeof docx.Table>)[] = [];
        const rowQ = questions.find(q => q.id === crossRowQ);
        const colQ = questions.find(q => q.id === crossColQ);
        const { rows, cols, matrix } = crossData;

        children.push(
          new docx.Paragraph({
            spacing: { before: 600, after: 200 },
            children: [
              new docx.TextRun({
                text: `CRUZAMENTO: ${(colQ?.texto || '').toUpperCase()} X ${(rowQ?.texto || '').toUpperCase()}`,
                bold: true,
                size: 24,
                color: hdrColor,
              }),
            ],
          }),
        );

        const headerCells = [
          new docx.TableCell({
            shading: { type: docx.ShadingType.CLEAR, fill: hdrColor },
            children: [makeCellText(rowQ?.texto?.slice(0, 30) || '', { bold: true, color: 'FFFFFF', size: 18 })],
          }),
          ...cols.map(
            c =>
              new docx.TableCell({
                shading: { type: docx.ShadingType.CLEAR, fill: hdrColor },
                children: [makeCellText(c, { bold: true, color: 'FFFFFF', size: 18 })],
              }),
          ),
          new docx.TableCell({
            shading: { type: docx.ShadingType.CLEAR, fill: hdrColor },
            children: [makeCellText('Total Geral', { bold: true, color: 'FFFFFF', size: 18 })],
          }),
        ];

        const dataRows = rows.map((rv, i) => {
          const fill = i % 2 === 0 ? 'FFFFFF' : 'F5F5F5';
          const rowMap = matrix.get(rv) || new Map();
          const rowTotal = cols.reduce((s, cv) => s + (rowMap.get(cv) || 0), 0);
          return new docx.TableRow({
            children: [
              new docx.TableCell({
                shading: { type: docx.ShadingType.CLEAR, fill },
                children: [makeCellText(rv, { bold: true, alignment: docx.AlignmentType.LEFT, size: 18 })],
              }),
              ...cols.map(
                cv =>
                  new docx.TableCell({
                    shading: { type: docx.ShadingType.CLEAR, fill },
                    children: [makeCellText(String(rowMap.get(cv) || ''), { size: 18 })],
                  }),
              ),
              new docx.TableCell({
                shading: { type: docx.ShadingType.CLEAR, fill },
                children: [makeCellText(String(rowTotal), { bold: true, size: 18 })],
              }),
            ],
          });
        });

        const colTotals = cols.map(cv => rows.reduce((s, rv) => s + (matrix.get(rv)?.get(cv) || 0), 0));
        const grandTotal = colTotals.reduce((s, v) => s + v, 0);

        const totalRow = new docx.TableRow({
          children: [
            new docx.TableCell({
              shading: { type: docx.ShadingType.CLEAR, fill: accColor },
              children: [makeCellText('Total Geral', { bold: true, color: 'FFFFFF', size: 18 })],
            }),
            ...colTotals.map(
              t =>
                new docx.TableCell({
                  shading: { type: docx.ShadingType.CLEAR, fill: accColor },
                  children: [makeCellText(String(t), { bold: true, color: 'FFFFFF', size: 18 })],
                }),
            ),
            new docx.TableCell({
              shading: { type: docx.ShadingType.CLEAR, fill: accColor },
              children: [makeCellText(String(grandTotal), { bold: true, color: 'FFFFFF', size: 18 })],
            }),
          ],
        });

        children.push(
          new docx.Table({
            width: { size: 100, type: docx.WidthType.PERCENTAGE },
            rows: [new docx.TableRow({ tableHeader: true, children: headerCells }), ...dataRows, totalRow],
          }),
        );

        return children;
      };

      // Assemble document
      const docChildren: (InstanceType<typeof docx.Paragraph> | InstanceType<typeof docx.Table>)[] = [
        new docx.Paragraph({
          spacing: { after: 300 },
          alignment: docx.AlignmentType.CENTER,
          children: [
            new docx.TextRun({ text: survey.titulo.toUpperCase(), bold: true, size: 32, color: hdrColor }),
          ],
        }),
        new docx.Paragraph({
          spacing: { after: 100 },
          alignment: docx.AlignmentType.CENTER,
          children: [new docx.TextRun({ text: `Total de respostas: ${totalResponses}`, size: 22 })],
        }),
        new docx.Paragraph({
          spacing: { after: 400 },
          alignment: docx.AlignmentType.CENTER,
          children: [
            new docx.TextRun({
              text: `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
              size: 18,
              color: '888888',
            }),
          ],
        }),
      ];

      for (const a of questionAnalysis) {
        docChildren.push(...buildQuestionSection(a));
      }

      docChildren.push(...buildCrossSection());

      const doc = new docx.Document({
        sections: [
          {
            properties: {
              page: { margin: { top: 1000, right: 800, bottom: 1000, left: 800 } },
            },
            children: docChildren,
          },
        ],
      });

      const blob = await docx.Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_${survey.titulo.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Relatório Word exportado com sucesso!');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Erro ao exportar relatório');
    }
  };

  // ── Excel/CSV Export — one question per sheet-like block, proper columns ──
  const handleExportCSV = () => {
    if (!survey || !responses?.length) return;

    // Build a real tabular CSV: each response is a row, each question is a column
    const qList = questions;
    const headerCols = ['#', 'Entrevistador', 'Data', ...qList.map((q, i) => `P${i + 1}: ${q.texto}`)];

    const dataRows = (responses || []).map((r, idx) => {
      const nome = (r.profiles as { nome?: string } | null)?.nome || 'Desconhecido';
      const data = new Date(r.created_at).toLocaleString('pt-BR');
      const answerCols = qList.map(q => {
        const vals = extractValues(r.respostas[q.id]);
        return vals.join(', ');
      });
      return [String(idx + 1), nome, data, ...answerCols];
    });

    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [
      headerCols.map(escape).join(';'),
      ...dataRows.map(row => row.map(escape).join(';')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultados_${survey.titulo.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Planilha exportada com sucesso!');
  };

  // ── Render ───────────────────────────────────────────
  if (surveysLoading) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Resultados</h1>
          <p className="text-muted-foreground">Análise e cruzamento dos dados coletados</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select
            value={selectedSurvey}
            onValueChange={(v) => {
              setSelectedSurvey(v);
              setCrossRowQ('');
              setCrossColQ('');
            }}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Selecione uma pesquisa" />
            </SelectTrigger>
            <SelectContent>
              {surveys?.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedSurvey && !!responses?.length && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportCSV} className="gap-2">
                <Download className="w-4 h-4" />
                CSV
              </Button>
              <Button onClick={handleExportWord} className="gap-2">
                <FileText className="w-4 h-4" />
                Exportar Word
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {!selectedSurvey ? (
        <div className="card-elevated p-12 text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Selecione uma pesquisa</h3>
          <p className="text-muted-foreground">
            Escolha uma pesquisa acima para visualizar os resultados
          </p>
        </div>
      ) : responsesLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : !responses?.length ? (
        <div className="card-elevated p-12 text-center">
          <p className="text-muted-foreground">Nenhuma resposta coletada para esta pesquisa.</p>
        </div>
      ) : (
        <>
          {/* Stats bar + version filter */}
          <div className="flex gap-3 flex-wrap items-center">
            <Badge variant="secondary" className="text-sm px-4 py-2">
              {totalResponses} respostas
            </Badge>
            <Badge variant="secondary" className="text-sm px-4 py-2">
              {questions.length} perguntas
            </Badge>
            {availableVersions.length > 1 && (
              <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Versão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas versões ({responses?.length || 0})</SelectItem>
                  {availableVersions.map(v => {
                    const count = (responses || []).filter(r => (r.pesquisa_versao || 1) === v).length;
                    return (
                      <SelectItem key={v} value={String(v)}>
                        Versão {v} ({count} coletas)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-1 border-b">
            <button
              onClick={() => setSubTab('analysis')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px',
                subTab === 'analysis'
                  ? 'border-lema-primary text-lema-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <BarChart3 className="w-4 h-4" />
              Análise por Pergunta
            </button>
            <button
              onClick={() => setSubTab('cross')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px',
                subTab === 'cross'
                  ? 'border-lema-primary text-lema-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Shuffle className="w-4 h-4" />
              Cruzamentos
            </button>
          </div>

          {/* ── Analysis Tab ── */}
          {subTab === 'analysis' && (
            <div className="space-y-8">
              {questionAnalysis.map(a => (
                <QuestionCard key={a.question.id} analysis={a} onMerge={openMergeDialog} />
              ))}
            </div>
          )}

          {/* ── Cross-tabulation Tab ── */}
          {subTab === 'cross' && (
            <div className="space-y-6">
              {/* Configuration */}
              <div className="card-elevated p-6">
                <h3 className="font-semibold mb-4">Configurar Cruzamento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Variável das Linhas</label>
                    <Select value={crossRowQ} onValueChange={setCrossRowQ}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a pergunta (linhas)" />
                      </SelectTrigger>
                      <SelectContent>
                        {questions.map(q => (
                          <SelectItem key={q.id} value={q.id}>
                            {q.texto.length > 60 ? q.texto.slice(0, 60) + '…' : q.texto}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Variável das Colunas</label>
                    <Select value={crossColQ} onValueChange={setCrossColQ}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a pergunta (colunas)" />
                      </SelectTrigger>
                      <SelectContent>
                        {questions
                          .filter(q => q.id !== crossRowQ)
                          .map(q => (
                            <SelectItem key={q.id} value={q.id}>
                              {q.texto.length > 60 ? q.texto.slice(0, 60) + '…' : q.texto}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Cross-tab result */}
              {crossData && (
                <CrossTabTable
                  data={crossData}
                  rowLabel={questions.find(q => q.id === crossRowQ)?.texto || ''}
                  colLabel={questions.find(q => q.id === crossColQ)?.texto || ''}
                />
              )}
              {crossRowQ && crossColQ && !crossData && (
                <div className="card-elevated p-8 text-center text-muted-foreground">
                  Sem dados cruzados para as perguntas selecionadas.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Merge Dialog ── */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Merge className="w-5 h-5" />
              Unificar Respostas
            </DialogTitle>
            <DialogDescription>
              Selecione os valores semelhantes que deseja unificar em um único valor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            <div className="space-y-2">
              <p className="text-sm font-medium">Selecione os valores para unificar:</p>
              {questionAnalysis
                .find(a => a.question.id === mergeQuestionId)
                ?.entries.map(([label, count]) => (
                  <label
                    key={label}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors',
                      mergeSelectedValues.includes(label) ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                    )}
                  >
                    <Checkbox
                      checked={mergeSelectedValues.includes(label)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setMergeSelectedValues(prev => [...prev, label]);
                          if (!mergeTargetValue) setMergeTargetValue(label);
                        } else {
                          setMergeSelectedValues(prev => prev.filter(v => v !== label));
                        }
                      }}
                    />
                    <span className="flex-1 text-sm">{label}</span>
                    <Badge variant="secondary" className="text-xs">{count}</Badge>
                  </label>
                ))}
            </div>
            {mergeSelectedValues.length >= 2 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Valor final unificado:</p>
                <Input
                  value={mergeTargetValue}
                  onChange={(e) => setMergeTargetValue(e.target.value)}
                  placeholder="Ex: Raquel Lyra"
                />
                <p className="text-xs text-muted-foreground">
                  {mergeSelectedValues.length} valores serão unificados em "{mergeTargetValue}"
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleMerge}
              disabled={mergeSelectedValues.length < 2 || !mergeTargetValue.trim() || mergeMutation.isPending}
            >
              {mergeMutation.isPending ? 'Unificando...' : 'Unificar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── QuestionCard (collapsible) ──────────────────────────────
function QuestionCard({ analysis, onMerge }: { analysis: QuestionAnalysis; onMerge: (questionId: string, entries: [string, number][]) => void }) {
  const [open, setOpen] = useState(true);
  const { question, index, entries, total } = analysis;
  const showChart = entries.length > 0 && entries.length <= 15;
  const tipoPergunta = question.tipo_pergunta || 'estimulada';
  const chartData = entries.map(([name, value]) => ({ name, value }));
  const isEspontanea = tipoPergunta === 'espontanea' || question.tipo === 'text';

  return (
    <div className="card-elevated overflow-hidden">
      {/* Header — clickable to toggle */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full text-left bg-gradient-to-r from-lema-primary/10 to-lema-secondary/10 p-4 border-b focus:outline-none"
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-lema-primary text-white flex items-center justify-center text-sm font-bold shrink-0">
            {index}
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">{question.texto}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs capitalize">
                {tipoPergunta}
              </Badge>
              <span className="text-xs text-muted-foreground">{total} respostas</span>
            </div>
          </div>
          {isEspontanea && entries.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onMerge(question.id, entries);
              }}
            >
              <Merge className="w-3.5 h-3.5 mr-1.5" />
              Unificar
            </Button>
          )}
          <ChevronDown
            className={cn('w-5 h-5 text-muted-foreground transition-transform shrink-0', open && 'rotate-180')}
          />
        </div>
      </button>

      {/* Content — collapsible */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
      <div className="overflow-hidden">
      <div className="p-4">
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Nenhuma resposta registrada</p>
        ) : (
          <div className={cn('grid gap-6', showChart ? 'lg:grid-cols-2' : '')}>
            {/* Chart */}
            {showChart && (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      interval={0}
                      angle={entries.length > 5 ? -35 : 0}
                      textAnchor={entries.length > 5 ? 'end' : 'middle'}
                      height={entries.length > 5 ? 90 : 35}
                    />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(value: number) => [`${value}`, 'Contagem']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      <LabelList
                        dataKey="value"
                        position="top"
                        style={{ fontSize: 12, fontWeight: 600 }}
                      />
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#90205D] hover:bg-[#90205D]">
                    <TableHead className="text-white font-semibold">Resposta</TableHead>
                    <TableHead className="text-white font-semibold text-center">Contagem</TableHead>
                    <TableHead className="text-white font-semibold text-center">Porcentagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map(([label, count], i) => {
                    const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
                    return (
                      <TableRow key={label} className={i % 2 === 0 ? '' : 'bg-muted/30'}>
                        <TableCell className="font-medium">{label}</TableCell>
                        <TableCell className="text-center">{count}</TableCell>
                        <TableCell className="text-center">{pct}%</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-[#FF9F00] hover:bg-[#FF9F00]">
                    <TableCell className="font-bold text-white">Total Geral</TableCell>
                    <TableCell className="font-bold text-white text-center">{total}</TableCell>
                    <TableCell className="font-bold text-white text-center">100.0%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
      </div>
      </div>
    </div>
  );
}

// ── CrossTabTable ──────────────────────────────────────────
function CrossTabTable({
  data,
  rowLabel,
  colLabel,
}: {
  data: { rows: string[]; cols: string[]; matrix: Map<string, Map<string, number>> };
  rowLabel: string;
  colLabel: string;
}) {
  const { rows, cols, matrix } = data;

  const colTotals = cols.map(cv =>
    rows.reduce((s, rv) => s + (matrix.get(rv)?.get(cv) || 0), 0),
  );
  const grandTotal = colTotals.reduce((s, v) => s + v, 0);

  return (
    <div className="card-elevated overflow-hidden">
      <div className="bg-gradient-to-r from-lema-primary/10 to-lema-secondary/10 p-4 border-b">
        <h3 className="font-semibold">
          Cruzamento: {colLabel} × {rowLabel}
        </h3>
      </div>
      <div className="overflow-x-auto p-4">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#90205D] hover:bg-[#90205D]">
              <TableHead className="text-white font-semibold">
                {rowLabel.length > 30 ? rowLabel.slice(0, 30) + '…' : rowLabel}
              </TableHead>
              {cols.map(c => (
                <TableHead key={c} className="text-white font-semibold text-center">
                  {c}
                </TableHead>
              ))}
              <TableHead className="text-white font-semibold text-center">Total Geral</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((rv, i) => {
              const rowMap = matrix.get(rv) || new Map();
              const rowTotal = cols.reduce((s, cv) => s + (rowMap.get(cv) || 0), 0);
              return (
                <TableRow key={rv} className={i % 2 === 0 ? '' : 'bg-muted/30'}>
                  <TableCell className="font-semibold">{rv}</TableCell>
                  {cols.map(cv => (
                    <TableCell key={cv} className="text-center">
                      {rowMap.get(cv) || ''}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-semibold">{rowTotal}</TableCell>
                </TableRow>
              );
            })}
            <TableRow className="bg-[#FF9F00] hover:bg-[#FF9F00]">
              <TableCell className="font-bold text-white">Total Geral</TableCell>
              {colTotals.map((t, i) => (
                <TableCell key={i} className="font-bold text-white text-center">
                  {t}
                </TableCell>
              ))}
              <TableCell className="font-bold text-white text-center">{grandTotal}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
