export const ELEVENLABS_VOICES = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male' as const, lang: 'multi', description: 'Voix profonde et confiante' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'female' as const, lang: 'multi', description: 'Voix douce et naturelle' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'male' as const, lang: 'en', description: 'Voix autoritaire britannique' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', gender: 'female' as const, lang: 'multi', description: 'Voix elegante et chaleureuse' },
  { id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde', gender: 'male' as const, lang: 'en', description: 'Voix charismatique et dynamique' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Emily', gender: 'female' as const, lang: 'multi', description: 'Voix calme et rassurante' },
] as const;

export const DEFAULT_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam

export type VoiceGender = 'male' | 'female';

export type ElevenLabsVoice = (typeof ELEVENLABS_VOICES)[number];

export const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

export const TTS_DAILY_LIMIT = 50;

export const TTS_MODEL_ID = 'eleven_multilingual_v2';

export const TTS_VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
} as const;
