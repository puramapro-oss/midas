// =============================================================================
// MIDAS — useVoice Helpers & Types
// =============================================================================

export type VoiceState = 'idle' | 'recording' | 'transcribing' | 'speaking';

export interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

export interface SpeechRecognitionInstance extends EventTarget {
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

export function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function getLocaleFromCookie(): string {
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
