export type ConversationState = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking'

export const STATUS_LABELS: Record<ConversationState, string> = {
  idle: 'Appuie pour parler',
  listening: 'Ecoute...',
  transcribing: 'Transcription...',
  thinking: 'Reflexion...',
  speaking: 'Parle...',
}
