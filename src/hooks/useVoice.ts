'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  type VoiceState,
  type SpeechRecognitionInstance,
  getSpeechRecognitionConstructor,
} from './useVoice-helpers';
import {
  stopWebSpeechRecognition,
  startMediaRecorder,
  stopMediaRecorderAndTranscribe,
} from './useVoice-stt';
import {
  getOrCreateAudioContext,
  synthesizeSpeech,
  stopAudioPlayback,
} from './useVoice-tts';

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

  // ─── Public recording API ───────────────────────────────────────────
  const startRecording = useCallback(async () => {
    clearError();
    setState('recording');

    const SpeechRec = getSpeechRecognitionConstructor();

    if (SpeechRec) {
      // Web Speech API handles everything in stopRecording
      try {
        const recognition = new SpeechRec();
        recognition.lang = 'fr-FR';
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
        const { recorder, stream } = await startMediaRecorder((blob) => {
          audioChunksRef.current = [blob];
        });
        mediaRecorderRef.current = recorder;
        mediaStreamRef.current = stream;
      } catch (err) {
        setState('idle');
        setError(err instanceof Error ? err.message : 'Impossible d\'acceder au microphone');
      }
    }
  }, [clearError]);

  const stopRecording = useCallback(async (): Promise<string> => {
    try {
      const SpeechRec = getSpeechRecognitionConstructor();

      if (SpeechRec && recognitionRef.current) {
        setState('transcribing');
        const text = await stopWebSpeechRecognition(recognitionRef.current);
        setState('idle');
        recognitionRef.current = null;
        return text;
      }

      // MediaRecorder fallback path
      setState('transcribing');
      const text = await stopMediaRecorderAndTranscribe(
        mediaRecorderRef.current,
        mediaStreamRef.current
      );
      mediaRecorderRef.current = null;
      mediaStreamRef.current = null;
      setState('idle');
      return text;
    } catch (err) {
      setState('idle');
      const msg = err instanceof Error ? err.message : 'Erreur lors de la transcription';
      setError(msg);
      return '';
    }
  }, []);

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
  const speak = useCallback(async (text: string, voiceId?: string) => {
    clearError();

    // Stop any current playback
    stopAudioPlayback(audioElementRef.current, sourceNodeRef.current);
    audioElementRef.current = null;
    sourceNodeRef.current = null;

    setState('speaking');

    try {
      audioContextRef.current = getOrCreateAudioContext(audioContextRef.current);

      const { analyserNode, audioElement, sourceNode, cleanup } = await synthesizeSpeech(
        text,
        {
          audioContext: audioContextRef.current,
          sourceNode: sourceNodeRef.current,
        },
        voiceId
      );

      audioElementRef.current = audioElement;
      sourceNodeRef.current = sourceNode;
      setAnalyserNode(analyserNode);

      audioElement.onended = () => {
        setState('idle');
        setAnalyserNode(null);
        cleanup();
        sourceNodeRef.current = null;
        audioElementRef.current = null;
      };

      audioElement.onerror = () => {
        setState('idle');
        setAnalyserNode(null);
        setError('Erreur de lecture audio');
        cleanup();
        sourceNodeRef.current = null;
        audioElementRef.current = null;
      };
    } catch (err) {
      setState('idle');
      setAnalyserNode(null);
      setError(err instanceof Error ? err.message : 'Erreur de synthese vocale');
    }
  }, [clearError]);

  const stopSpeaking = useCallback(() => {
    stopAudioPlayback(audioElementRef.current, sourceNodeRef.current);
    audioElementRef.current = null;
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
