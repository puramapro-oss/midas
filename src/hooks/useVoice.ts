'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { DEFAULT_VOICE_ID } from '@/lib/voice/constants';

type VoiceState = 'idle' | 'recording' | 'transcribing' | 'speaking';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

export interface UseVoiceReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string>;
  cancelRecording: () => void;
  isPlaying: boolean;
  speak: (text: string, voiceId?: string) => Promise<void>;
  stopSpeaking: () => void;
  analyserNode: AnalyserNode | null;
  error: string | null;
  state: VoiceState;
}

function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function getLocaleFromCookie(): string {
  if (typeof document === 'undefined') return 'fr-FR';
  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/);
  const lang = match?.[1] ?? 'fr';
  const localeMap: Record<string, string> = {
    fr: 'fr-FR', en: 'en-US', es: 'es-ES', de: 'de-DE',
    it: 'it-IT', pt: 'pt-PT', ar: 'ar-SA', zh: 'zh-CN',
    ja: 'ja-JP', ko: 'ko-KR', hi: 'hi-IN', ru: 'ru-RU',
    tr: 'tr-TR', nl: 'nl-NL', pl: 'pl-PL', sv: 'sv-SE',
  };
  return localeMap[lang] ?? 'fr-FR';
}

export function useVoice(): UseVoiceReturn {
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const resolveTranscriptionRef = useRef<((text: string) => void) | null>(null);
  const rejectTranscriptionRef = useRef<((error: Error) => void) | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      }
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close().catch(() => {});
      }
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // ─── STT via Web Speech API ─────────────────────────────────────────
  const startRecordingWebSpeech = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const SpeechRec = getSpeechRecognitionConstructor();
      if (!SpeechRec) {
        reject(new Error('Web Speech API non supportee par ce navigateur'));
        return;
      }

      const recognition = new SpeechRec();
      recognition.lang = getLocaleFromCookie();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognitionRef.current = recognition;
      resolveTranscriptionRef.current = resolve;
      rejectTranscriptionRef.current = reject;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0]?.[0]?.transcript ?? '';
        resolveTranscriptionRef.current?.(transcript);
        resolveTranscriptionRef.current = null;
        rejectTranscriptionRef.current = null;
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'aborted' || event.error === 'no-speech') {
          resolveTranscriptionRef.current?.('');
        } else {
          rejectTranscriptionRef.current?.(new Error(`Erreur reconnaissance vocale: ${event.error}`));
        }
        resolveTranscriptionRef.current = null;
        rejectTranscriptionRef.current = null;
      };

      recognition.onend = () => {
        // If neither resolve nor reject was called, resolve with empty
        resolveTranscriptionRef.current?.('');
        resolveTranscriptionRef.current = null;
        rejectTranscriptionRef.current = null;
        if (state === 'recording') {
          setState('idle');
        }
      };

      recognition.start();
    });
  }, [state]);

  // ─── STT via MediaRecorder + Whisper API fallback ───────────────────
  const startRecordingMediaRecorder = useCallback(async (): Promise<void> => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;
    audioChunksRef.current = [];

    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm',
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
  }, []);

  const stopRecordingMediaRecorder = useCallback(async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve('');
        return;
      }

      recorder.onstop = async () => {
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];

        if (audioBlob.size === 0) {
          resolve('');
          return;
        }

        setState('transcribing');

        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('language', getLocaleFromCookie().split('-')[0] ?? 'fr');

          const response = await fetch('/api/ai/speech-to-text', {
            method: 'POST',
            body: formData,
          });

          const data = await response.json();

          if (!response.ok) {
            if (data.fallback === 'browser') {
              resolve('');
              return;
            }
            throw new Error(data.error ?? 'Erreur de transcription');
          }

          resolve(data.text ?? '');
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Erreur de transcription'));
        }
      };

      recorder.stop();
    });
  }, []);

  // ─── Public recording API ───────────────────────────────────────────
  const startRecording = useCallback(async () => {
    clearError();
    setState('recording');

    const SpeechRec = getSpeechRecognitionConstructor();

    if (SpeechRec) {
      // Web Speech API handles everything in stopRecording
      try {
        // Just start the recognition, promise resolves on stop
        const recognition = new SpeechRec();
        recognition.lang = getLocaleFromCookie();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        setState('idle');
        setError(err instanceof Error ? err.message : 'Impossible de demarrer la reconnaissance vocale');
      }
    } else {
      // Fallback: MediaRecorder
      try {
        await startRecordingMediaRecorder();
      } catch (err) {
        setState('idle');
        setError(err instanceof Error ? err.message : 'Impossible d\'acceder au microphone');
      }
    }
  }, [clearError, startRecordingMediaRecorder]);

  const stopRecording = useCallback(async (): Promise<string> => {
    try {
      const SpeechRec = getSpeechRecognitionConstructor();

      if (SpeechRec && recognitionRef.current) {
        // Web Speech API path
        const transcriptPromise = new Promise<string>((resolve) => {
          const recognition = recognitionRef.current;
          if (!recognition) {
            resolve('');
            return;
          }

          const originalOnResult = recognition.onresult;
          const originalOnError = recognition.onerror;
          const originalOnEnd = recognition.onend;

          let resolved = false;
          const safeResolve = (text: string) => {
            if (!resolved) {
              resolved = true;
              resolve(text);
            }
          };

          recognition.onresult = (event: SpeechRecognitionEvent) => {
            originalOnResult?.call(recognition, event);
            const transcript = event.results[0]?.[0]?.transcript ?? '';
            safeResolve(transcript);
          };

          recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            originalOnError?.call(recognition, event);
            safeResolve('');
          };

          recognition.onend = () => {
            originalOnEnd?.call(recognition);
            safeResolve('');
          };

          recognition.stop();
        });

        setState('transcribing');
        const text = await transcriptPromise;
        setState('idle');
        recognitionRef.current = null;
        return text;
      }

      // MediaRecorder fallback path
      const text = await stopRecordingMediaRecorder();
      setState('idle');
      return text;
    } catch (err) {
      setState('idle');
      const msg = err instanceof Error ? err.message : 'Erreur lors de la transcription';
      setError(msg);
      return '';
    }
  }, [stopRecordingMediaRecorder]);

  const cancelRecording = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;

    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    audioChunksRef.current = [];

    resolveTranscriptionRef.current?.('');
    resolveTranscriptionRef.current = null;
    rejectTranscriptionRef.current = null;

    setState('idle');
    clearError();
  }, [clearError]);

  // ─── TTS ────────────────────────────────────────────────────────────
  const getAudioContext = useCallback((): AudioContext => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const speak = useCallback(async (text: string, voiceId?: string) => {
    clearError();

    // Stop any current playback
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
    }

    setState('speaking');

    try {
      const response = await fetch('/api/ai/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: voiceId ?? DEFAULT_VOICE_ID,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur de synthese vocale' }));
        throw new Error(errorData.error ?? `Erreur ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const audioEl = new Audio(audioUrl);
      audioElementRef.current = audioEl;

      // Set up AudioContext + AnalyserNode for waveform visualization
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      // Create source only once per element
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }

      const source = ctx.createMediaElementSource(audioEl);
      sourceNodeRef.current = source;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      setAnalyserNode(analyser);

      audioEl.onended = () => {
        setState('idle');
        setAnalyserNode(null);
        URL.revokeObjectURL(audioUrl);
        sourceNodeRef.current?.disconnect();
        sourceNodeRef.current = null;
        audioElementRef.current = null;
      };

      audioEl.onerror = () => {
        setState('idle');
        setAnalyserNode(null);
        setError('Erreur de lecture audio');
        URL.revokeObjectURL(audioUrl);
        sourceNodeRef.current?.disconnect();
        sourceNodeRef.current = null;
        audioElementRef.current = null;
      };

      await audioEl.play();
    } catch (err) {
      setState('idle');
      setAnalyserNode(null);
      setError(err instanceof Error ? err.message : 'Erreur de synthese vocale');
    }
  }, [clearError, getAudioContext]);

  const stopSpeaking = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
      audioElementRef.current = null;
    }
    sourceNodeRef.current?.disconnect();
    sourceNodeRef.current = null;
    setAnalyserNode(null);
    setState('idle');
  }, []);

  return {
    isRecording: state === 'recording',
    startRecording,
    stopRecording,
    cancelRecording,
    isPlaying: state === 'speaking',
    speak,
    stopSpeaking,
    analyserNode,
    error,
    state,
  };
}
