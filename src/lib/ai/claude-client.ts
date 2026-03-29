// =============================================================================
// MIDAS — Claude API Client
// Wrapper complet pour l'API Anthropic avec retry et streaming
// =============================================================================

import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

let clientInstance: Anthropic | null = null;

function getClient(): Anthropic {
  if (!clientInstance) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('[MIDAS] ANTHROPIC_API_KEY manquante');
    }
    clientInstance = new Anthropic({ apiKey });
  }
  return clientInstance;
}

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isRetryable =
        lastError.message.includes('rate_limit') ||
        lastError.message.includes('overloaded') ||
        lastError.message.includes('timeout') ||
        lastError.message.includes('529') ||
        lastError.message.includes('500');

      if (!isRetryable || attempt === retries - 1) {
        throw lastError;
      }

      const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError ?? new Error('[MIDAS] Retry exhausted');
}

/**
 * Envoie un message a Claude et retourne la reponse texte.
 */
export async function askClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4096
): Promise<string> {
  const client = getClient();

  const response = await withRetry(() =>
    client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })
  );

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('[MIDAS] Aucun contenu texte dans la reponse Claude');
  }

  return textBlock.text;
}

/**
 * Envoie un message a Claude et parse la reponse en JSON type.
 */
export async function askClaudeJSON<T>(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4096
): Promise<T> {
  const jsonSystemPrompt = `${systemPrompt}\n\nIMPORTANT: Tu dois repondre UNIQUEMENT avec du JSON valide, sans markdown, sans backticks, sans texte avant ou apres. Le JSON doit etre directement parsable.`;

  const text = await askClaude(jsonSystemPrompt, userMessage, maxTokens);

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
 */
export function streamClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4096
): ReadableStream<string> {
  const client = getClient();

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
  maxTokens = 4096
): Promise<string> {
  const client = getClient();

  const response = await withRetry(() =>
    client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    })
  );

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('[MIDAS] Aucun contenu texte dans la reponse Claude');
  }

  return textBlock.text;
}
