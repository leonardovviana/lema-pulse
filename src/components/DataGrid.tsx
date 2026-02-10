import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { SurveyResponse } from '@/types/survey';
import { Calendar, FileSpreadsheet, FileText, MapPin, Pause, Play, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface DataGridProps {
  responses: SurveyResponse[];
}

export function DataGrid({ responses }: DataGridProps) {
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
    const headers = ['ID', 'Pesquisa', 'Entrevistador', 'Data', 'Localização', 'Status'];
    const rows = responses.map(r => [
      r.id,
      r.surveyTitulo,
      r.entrevistadorNome,
      formatDate(r.timestamp),
      r.gps ? `${r.gps.latitude.toFixed(4)}, ${r.gps.longitude.toFixed(4)}` : 'N/A',
      r.synced ? 'Sincronizado' : 'Pendente',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    downloadBlob(csv, 'text/csv;charset=utf-8;', 'csv');
  };

  const exportToWord = () => {
    const tableRows = responses.map(r =>
      `<tr><td>${r.id}</td><td>${r.surveyTitulo}</td><td>${r.entrevistadorNome}</td><td>${formatDate(r.timestamp)}</td><td>${r.gps ? `${r.gps.latitude.toFixed(4)}, ${r.gps.longitude.toFixed(4)}` : 'N/A'}</td><td>${r.synced ? 'Sincronizado' : 'Pendente'}</td></tr>`
    ).join('');
    const html = `<html><head><meta charset="utf-8"><style>body{font-family:Arial}h1{color:#90205D}table{border-collapse:collapse;width:100%;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#90205D;color:#fff}tr:nth-child(even){background:#f9f9f9}</style></head><body><h1>Relatório de Coletas</h1><p>Gerado em: ${new Date().toLocaleString('pt-BR')} | Total: ${responses.length}</p><table><tr><th>ID</th><th>Pesquisa</th><th>Entrevistador</th><th>Data</th><th>Localização</th><th>Status</th></tr>${tableRows}</table></body></html>`;
    downloadBlob(html, 'application/msword', 'doc');
  };

  const downloadBlob = (content: string, type: string, ext: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lema_coletas_${new Date().toISOString().split('T')[0]}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exportação concluída!');
  };

  return (
    <div className="card-elevated">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-lg">Coletas</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={exportToExcel}
            className="gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={exportToWord}
            className="gap-2"
          >
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
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Pesquisa</TableHead>
              <TableHead>Entrevistador</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Áudio</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {responses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhuma coleta encontrada
                </TableCell>
              </TableRow>
            ) : (
              responses.map((response) => {
                const mapsUrl = getGoogleMapsUrl(response.gps);
                
                return (
                  <TableRow key={response.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-xs">
                      {response.id.slice(-6)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {response.surveyTitulo}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {response.entrevistadorNome}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {formatDate(response.timestamp)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {mapsUrl ? (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-lema-primary hover:underline text-sm"
                        >
                          <MapPin className="w-4 h-4" />
                          Ver no mapa
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePlay(response.id, response.audioBlob)}
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
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-muted/30">
        <p className="text-sm text-muted-foreground">
          Exibindo {responses.length} coleta(s)
        </p>
      </div>
    </div>
  );
}
