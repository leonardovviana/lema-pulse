import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
}

// 96 kbps mono opus — clear speech quality, ~720 KB/min
const TARGET_BITRATE = 96_000;

export function useAudioRecorder() {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = {
        ...(mimeType && { mimeType }),
        audioBitsPerSecond: TARGET_BITRATE,
      };

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const actualMime = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: actualMime });
        const url = URL.createObjectURL(blob);

        // Store in ref immediately so getBase64Audio can access it
        // even before React re-renders
        audioBlobRef.current = blob;

        setState((prev) => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          audioBlob: blob,
          audioUrl: url,
        }));

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.start(2000);
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setState((prev) => ({ ...prev, duration: elapsed }));
      }, 1000);

      setState((prev) => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        duration: 0,
        audioBlob: null,
        audioUrl: null,
      }));

      toast.success('Gravacao iniciada', {
        description: 'O audio esta sendo capturado.',
      });
    } catch (err: unknown) {
      console.error('Error starting recording:', err);
      const error = err instanceof DOMException ? err : err instanceof Error ? err : new Error('Erro desconhecido');
      const msgs: Record<string, [string, string]> = {
        NotAllowedError: ['Permissao de microfone negada', 'Clique no icone do cadeado na barra de endereco e permita o acesso ao microfone.'],
        NotFoundError: ['Microfone nao encontrado', 'Conecte um microfone e tente novamente.'],
      };
      const [title, desc] = msgs[error.name] || ['Erro ao acessar microfone', error.message || 'Verifique as permissoes do navegador.'];
      toast.error(title, { description: desc, ...(error.name === 'NotAllowedError' && { duration: 8000 }) });
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      state.isRecording &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setState((prev) => ({ ...prev, isPaused: true }));
    }
  }, [state.isRecording]);

  const resumeRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      state.isPaused &&
      mediaRecorderRef.current.state === 'paused'
    ) {
      mediaRecorderRef.current.resume();
      startTimeRef.current = Date.now() - state.duration * 1000;
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setState((prev) => ({ ...prev, duration: elapsed }));
      }, 1000);
      setState((prev) => ({ ...prev, isPaused: false }));
    }
  }, [state.isPaused, state.duration]);

  const resetRecording = useCallback(() => {
    if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    audioBlobRef.current = null;
    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
    });
  }, [state.audioUrl]);

  // Convert blob to raw base64 — uses arrayBuffer (faster than FileReader)
  const getBase64Audio = useCallback(async (): Promise<string | null> => {
    const blob = audioBlobRef.current || state.audioBlob;
    if (!blob) return null;
    try {
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    } catch {
      return null;
    }
  }, [state.audioBlob]);

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    getBase64Audio,
  };
}
