'use client';

import {
  type SpeechRecognitionEvent,
  type SpeechRecognitionErrorEvent,
  type SpeechRecognitionInstance,
  getSpeechRecognitionConstructor,
  getLocaleFromCookie,
} from './useVoice-helpers';

/**
 * Start Web Speech API recognition and return a promise that resolves with transcript
 */
export function startWebSpeechRecognition(): Promise<string> {
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

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      resolve(transcript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'aborted' || event.error === 'no-speech') {
        resolve('');
      } else {
        reject(new Error(`Erreur reconnaissance vocale: ${event.error}`));
      }
    };

    recognition.onend = () => {
      resolve('');
    };

    recognition.start();
  });
}

/**
 * Stop Web Speech API recognition and return transcript
 */
export function stopWebSpeechRecognition(
  recognition: SpeechRecognitionInstance | null
): Promise<string> {
  return new Promise((resolve) => {
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
}

/**
 * Start MediaRecorder for audio capture
 */
export async function startMediaRecorder(
  onDataAvailable: (blob: Blob) => void
): Promise<{ recorder: MediaRecorder; stream: MediaStream }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const recorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm',
  });

  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  recorder.onstop = () => {
    const audioBlob = new Blob(chunks, { type: 'audio/webm' });
    onDataAvailable(audioBlob);
  };

  recorder.start();

  return { recorder, stream };
}

/**
 * Stop MediaRecorder and transcribe via Whisper API
 */
export async function stopMediaRecorderAndTranscribe(
  recorder: MediaRecorder | null,
  stream: MediaStream | null
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!recorder || recorder.state === 'inactive') {
      resolve('');
      return;
    }

    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = async () => {
      stream?.getTracks().forEach((t) => t.stop());

      const audioBlob = new Blob(chunks, { type: 'audio/webm' });

      if (audioBlob.size === 0) {
        resolve('');
        return;
      }

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
}
