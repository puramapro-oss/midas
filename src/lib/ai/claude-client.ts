// =============================================================================
// MIDAS — Claude API Client
// Wrapper migré vers @purama/smarana pour cache + mémoire centralisés
// =============================================================================

import 'server-only';
import { smarana } from '@purama/smarana';
import Anthropic from '@anthropic-ai/sdk';

// Loi 1 SMARANA-BRIEF.md : "Aucune app n'appelle l'API directement. Tout passe par smarana.ask()."
// MIDAS ne détient plus de client Anthropic — mémoire cross-écosystème + cache + usage
// centralisés dans @purama/smarana (packages/smarana).

/**
 * Envoie un message a Claude et retourne la reponse texte.
 */
export async function askClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4096,
  userId?: string
): Promise<string> {
  const result = await smarana.ask({
    appSlug: 'midas',
    userId,
    system: systemPrompt,
    message: userMessage,
    tier: maxTokens >= 8192 ? 'main' : maxTokens < 2000 ? 'fast' : 'main',
    maxTokens,
  });
  return result.text;
}

/**
 * Envoie un message a Claude et parse la reponse en JSON type.
 */
export async function askClaudeJSON<T>(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4096,
  userId?: string
): Promise<T> {
  const jsonSystemPrompt = `${systemPrompt}\n\nIMPORTANT: Tu dois repondre UNIQUEMENT avec du JSON valide, sans markdown, sans backticks, sans texte avant ou apres. Le JSON doit etre directement parsable.`;

  const text = await askClaude(jsonSystemPrompt, userMessage, maxTokens, userId);

  // Extraire le JSON meme si entoure de backticks
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`[MIDAS] Impossible de parser la reponse JSON de Claude: ${cleaned.slice(0, 200)}`);
  }
}

/**
 * Stream la reponse de Claude via un ReadableStream.
 * NOTE: smarana.ask() ne supporte pas le streaming (P0/P1). Streaming hors périmètre.
 * Cette fonction reste telle quelle (appel direct SDK) pour compatibilité.
 */
export function streamClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4096
): ReadableStream<string> {
  // STREAMING HORS PÉRIMÈTRE @purama/smarana P0/P1 — appel direct SDK conservé
  // cf packages/smarana/README.md ligne 102-105 "Hors périmètre volontaire"
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('[MIDAS] ANTHROPIC_API_KEY manquante');
  }
  const client = new Anthropic({ apiKey });
  const MODEL = process.env.ANTHROPIC_MODEL_MAIN || 'claude-sonnet-4-6';

  return new ReadableStream<string>({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: MODEL,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        });

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(event.delta.text);
          }
        }

        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        controller.error(new Error(`[MIDAS] Erreur stream Claude: ${message}`));
      }
    },
  });
}

/**
 * Envoie un message avec historique de conversation.
 */
export async function askClaudeWithHistory(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  maxTokens = 4096,
  userId?: string
): Promise<string> {
  // Sépare le dernier message utilisateur et utilise les précédents comme recentMessages
  if (messages.length === 0) {
    throw new Error('[MIDAS] Aucun message fourni');
  }

  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== 'user') {
    throw new Error('[MIDAS] Le dernier message doit être un message utilisateur');
  }

  const recentMessages = messages.slice(0, -1).map(m => ({
    role: m.role,
    content: m.content,
  }));

  const result = await smarana.ask({
    appSlug: 'midas',
    userId,
    system: systemPrompt,
    recentMessages,
    message: lastMessage.content,
    tier: maxTokens >= 8192 ? 'main' : maxTokens < 2000 ? 'fast' : 'main',
    maxTokens,
  });

  return result.text;
}
