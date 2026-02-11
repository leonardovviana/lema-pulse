import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { SurveyResponse } from '@/types/survey';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, MapPin, Pause, Play, User } from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface QuestionInfo {
  id: string;
  texto: string;
  tipo?: string;
  tipo_pergunta?: string;
  ordem?: number;
}

interface DataGridProps {
  responses: SurveyResponse[];
  questions?: QuestionInfo[];
  totalCount?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

const formatAnswer = (value: unknown): string => {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'string') return value || '—';
  if (Array.isArray(value)) return value.join(', ') || '—';
  if (typeof value === 'object') {
    const obj = value as { opcao?: string | string[]; outro?: string };
    const parts: string[] = [];
    if (obj.opcao) {
      parts.push(Array.isArray(obj.opcao) ? obj.opcao.join(', ') : obj.opcao);
    }
    if (obj.outro) parts.push(`Outro: ${obj.outro}`);
    return parts.join(' | ') || '—';
  }
  return String(value);
};

export function DataGrid({ responses, questions = [], totalCount, page = 0, pageSize = 50, onPageChange }: DataGridProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePlay = async (id: string, audioUrl?: string) => {
    if (!audioUrl) {
      toast.info('Áudio não disponível para esta coleta');
      return;
    }

    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      let playUrl = audioUrl;
      const pathMatch = audioUrl.match(/audio-recordings\/(.+?)(\?|$)/);
      if (pathMatch) {
        const { data } = await supabase.storage
          .from('audio-recordings')
          .createSignedUrl(decodeURIComponent(pathMatch[1]), 3600);
        if (data?.signedUrl) playUrl = data.signedUrl;
      }

      const audio = new Audio(playUrl);
      audioRef.current = audio;
      audio.onended = () => { setPlayingId(null); audioRef.current = null; };
      audio.onerror = () => { toast.error('Erro ao reproduzir áudio'); setPlayingId(null); audioRef.current = null; };
      await audio.play();
      setPlayingId(id);
    } catch {
      toast.error('Erro ao reproduzir áudio');
      setPlayingId(null);
    }
  };

  const getGoogleMapsUrl = (gps: { latitude: number; longitude: number } | null) => {
    if (!gps) return null;
    return `https://www.google.com/maps?q=${gps.latitude},${gps.longitude}`;
  };

  const exportToExcel = () => {
    const questionTexts = questions.map(q => q.texto);
    const headers = ['ID', 'Entrevistador', 'Data', 'Localização', 'Status', ...questionTexts];
    const rows = responses.map(r => {
      const answers = questions.map(q => formatAnswer(r.respostas[q.id]));
      return [
        r.id.slice(-6),
        r.entrevistadorNome,
        formatDate(r.timestamp),
        r.gps ? `${r.gps.latitude.toFixed(4)}, ${r.gps.longitude.toFixed(4)}` : 'N/A',
        r.synced ? 'Sincronizado' : 'Pendente',
        ...answers,
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, 'csv');
  };

  const exportToWord = () => {
    const questionHeaders = questions.map(q => `<th>${q.texto}</th>`).join('');
    const tableRows = responses.map(r => {
      const answers = questions.map(q => `<td>${formatAnswer(r.respostas[q.id])}</td>`).join('');
      return `<tr><td>${r.id.slice(-6)}</td><td>${r.entrevistadorNome}</td><td>${formatDate(r.timestamp)}</td><td>${r.gps ? `${r.gps.latitude.toFixed(4)}, ${r.gps.longitude.toFixed(4)}` : 'N/A'}</td><td>${r.synced ? 'Sincronizado' : 'Pendente'}</td>${answers}</tr>`;
    }).join('');
    const html = `<html><head><meta charset="utf-8"><style>body{font-family:Arial}h1{color:#90205D}table{border-collapse:collapse;width:100%;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#90205D;color:#fff}tr:nth-child(even){background:#f9f9f9}</style></head><body><h1>Relatório de Coletas</h1><p>Gerado em: ${new Date().toLocaleString('pt-BR')} | Total: ${totalCount ?? responses.length}</p><table><tr><th>ID</th><th>Entrevistador</th><th>Data</th><th>Localização</th><th>Status</th>${questionHeaders}</tr>${tableRows}</table></body></html>`;
    const blob = new Blob([html], { type: 'application/msword' });
    downloadBlob(blob, 'doc');
  };

  const downloadBlob = (blob: Blob, ext: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lema_coletas_${new Date().toISOString().split('T')[0]}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exportação concluída!');
  };

  const totalPages = totalCount !== undefined ? Math.ceil(totalCount / pageSize) : 1;

  return (
    <div className="card-elevated">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-lg">
          Coletas
          {totalCount !== undefined && totalCount > 0 && (
            <span className="text-sm font-normal text-muted-foreground ml-2">({totalCount})</span>
          )}
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportToWord} className="gap-2">
            <FileText className="w-4 h-4" />
            Word
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Entrevistador</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Respostas</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Áudio</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {responses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhuma coleta encontrada
                </TableCell>
              </TableRow>
            ) : (
              responses.map((response) => {
                const mapsUrl = getGoogleMapsUrl(response.gps);
                const isExpanded = expandedId === response.id;
                const answerCount = Object.keys(response.respostas || {}).length;

                return (
                  <Fragment key={response.id}>
                    <TableRow
                      className={cn('hover:bg-muted/50 cursor-pointer', isExpanded && 'bg-muted/30')}
                      onClick={() => setExpandedId(isExpanded ? null : response.id)}
                    >
                      <TableCell className="px-3">
                        <ChevronDown className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-180')} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {response.id.slice(-6)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {response.entrevistadorNome || 'Desconhecido'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {formatDate(response.timestamp)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{answerCount} resp.</span>
                      </TableCell>
                      <TableCell>
                        {mapsUrl ? (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-lema-primary hover:underline text-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MapPin className="w-4 h-4" />
                            Ver
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handlePlay(response.id, response.audioBlob); }}
                          className="gap-1"
                        >
                          {playingId === response.id ? (
                            <>
                              <Pause className="w-4 h-4" />
                              <span className="text-xs">Pausar</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              <span className="text-xs">Ouvir</span>
                            </>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={response.synced ? 'default' : 'secondary'}
                          className={response.synced ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}
                        >
                          {response.synced ? 'Sincronizado' : 'Pendente'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    {/* Expanded row: all answers */}
                    {isExpanded && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={8} className="bg-muted/20 p-0">
                          <div className="p-4 space-y-2">
                            <h4 className="text-sm font-semibold mb-3">Respostas completas</h4>
                            {questions.length > 0 ? (
                              questions.map((q) => (
                                <div key={q.id} className="grid grid-cols-[1fr_1fr] gap-3 py-2 border-b last:border-0">
                                  <span className="text-sm font-medium text-muted-foreground">{q.texto}</span>
                                  <span className="text-sm">{formatAnswer(response.respostas[q.id])}</span>
                                </div>
                              ))
                            ) : (
                              Object.entries(response.respostas || {}).map(([key, val]) => (
                                <div key={key} className="grid grid-cols-[1fr_1fr] gap-3 py-2 border-b last:border-0">
                                  <span className="text-sm font-medium font-mono text-muted-foreground">{key.slice(-8)}</span>
                                  <span className="text-sm">{formatAnswer(val)}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between p-4 border-t bg-muted/30">
        <p className="text-sm text-muted-foreground">
          {totalCount !== undefined && totalCount > 0
            ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, totalCount)} de ${totalCount} coleta(s)`
            : `${responses.length} coleta(s)`}
        </p>
        {totalCount !== undefined && totalPages > 1 && onPageChange && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page === 0}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">
              Pág. {page + 1}/{totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page + 1 >= totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
