'use client';

import { DEFAULT_VOICE_ID } from '@/lib/voice/constants';

export interface TTSResources {
  audioContext: AudioContext | null;
  audioElement: HTMLAudioElement | null;
  sourceNode: MediaElementAudioSourceNode | null;
}

export interface TTSPlaybackResult {
  analyserNode: AnalyserNode;
  audioElement: HTMLAudioElement;
  sourceNode: MediaElementAudioSourceNode;
  cleanup: () => void;
}

/**
 * Get or create AudioContext
 */
export function getOrCreateAudioContext(
  currentContext: AudioContext | null
): AudioContext {
  if (!currentContext || currentContext.state === 'closed') {
    return new AudioContext();
  }
  return currentContext;
}

/**
 * Synthesize speech and play it with waveform analysis
 */
export async function synthesizeSpeech(
  text: string,
  resources: {
    audioContext: AudioContext | null;
    sourceNode: MediaElementAudioSourceNode | null;
  },
  voiceId?: string
): Promise<TTSPlaybackResult> {
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

  // Set up AudioContext + AnalyserNode for waveform visualization
  const ctx = getOrCreateAudioContext(resources.audioContext);
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;

  // Create source only once per element
  if (resources.sourceNode) {
    resources.sourceNode.disconnect();
  }

  const source = ctx.createMediaElementSource(audioEl);
  source.connect(analyser);
  analyser.connect(ctx.destination);

  await audioEl.play();

  const cleanup = () => {
    URL.revokeObjectURL(audioUrl);
    source.disconnect();
  };

  return {
    analyserNode: analyser,
    audioElement: audioEl,
    sourceNode: source,
    cleanup,
  };
}

/**
 * Stop current audio playback
 */
export function stopAudioPlayback(
  audioElement: HTMLAudioElement | null,
  sourceNode: MediaElementAudioSourceNode | null
): void {
  if (audioElement) {
    audioElement.pause();
    audioElement.src = '';
  }
  sourceNode?.disconnect();
}
