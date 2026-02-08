import { useState } from 'react';
import { Play, Pause, MapPin, Calendar, User, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { SurveyResponse } from '@/types/survey';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface DataGridProps {
  responses: SurveyResponse[];
}

export function DataGrid({ responses }: DataGridProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePlay = (id: string, audioBlob?: string) => {
    if (!audioBlob) {
      toast.info('Áudio não disponível para esta coleta');
      return;
    }

    if (playingId === id) {
      setPlayingId(null);
      // Would pause audio here
    } else {
      setPlayingId(id);
      // Would play audio here
      toast.success('Reproduzindo áudio da coleta');
      setTimeout(() => setPlayingId(null), 3000);
    }
  };

  const getGoogleMapsUrl = (gps: { latitude: number; longitude: number } | null) => {
    if (!gps) return null;
    return `https://www.google.com/maps?q=${gps.latitude},${gps.longitude}`;
  };

  const exportToExcel = () => {
    // Create CSV content
    const headers = ['ID', 'Pesquisa', 'Entrevistador', 'Data', 'Localização', 'Status'];
    const rows = responses.map(r => [
      r.id,
      r.surveyTitulo,
      r.entrevistadorNome,
      formatDate(r.timestamp),
      r.gps ? `${r.gps.latitude.toFixed(4)}, ${r.gps.longitude.toFixed(4)}` : 'N/A',
      r.synced ? 'Sincronizado' : 'Pendente',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lema_coletas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Exportação concluída!', {
      description: 'Arquivo Excel gerado com sucesso.',
    });
  };

  const exportToWord = () => {
    // Create HTML content for Word
    const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; }
            h1 { color: #90205D; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #90205D; color: white; }
            tr:nth-child(even) { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h1>Relatório de Coletas</h1>
          <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
          <p>Total de coletas: ${responses.length}</p>
          <table>
            <tr>
              <th>ID</th>
              <th>Pesquisa</th>
              <th>Entrevistador</th>
              <th>Data</th>
              <th>Localização</th>
              <th>Status</th>
            </tr>
            ${responses.map(r => `
              <tr>
                <td>${r.id}</td>
                <td>${r.surveyTitulo}</td>
                <td>${r.entrevistadorNome}</td>
                <td>${formatDate(r.timestamp)}</td>
                <td>${r.gps ? `${r.gps.latitude.toFixed(4)}, ${r.gps.longitude.toFixed(4)}` : 'N/A'}</td>
                <td>${r.synced ? 'Sincronizado' : 'Pendente'}</td>
              </tr>
            `).join('')}
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lema_coletas_${new Date().toISOString().split('T')[0]}.doc`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Exportação concluída!', {
      description: 'Arquivo Word gerado com sucesso.',
    });
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
