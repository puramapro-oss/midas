// =============================================================================
// MIDAS — Fetch with Retry
// Fetch robuste avec retry exponentiel, timeout AbortController, backoff
// =============================================================================

export interface FetchRetryOptions {
  /** Nombre maximum de tentatives (defaut: 3) */
  retries: number;
  /** Delai initial en ms entre les retries (defaut: 1000) */
  initialDelayMs: number;
  /** Facteur multiplicateur pour le backoff exponentiel (defaut: 2) */
  backoffFactor: number;
  /** Delai maximum entre retries en ms (defaut: 10000) */
  maxDelayMs: number;
  /** Timeout par requete en ms (defaut: 15000) */
  timeoutMs: number;
  /** Codes HTTP declenchant un retry (defaut: [408, 429, 500, 502, 503, 504]) */
  retryStatusCodes: number[];
  /** Callback appele a chaque retry */
  onRetry?: (attempt: number, error: FetchRetryError) => void;
}

const DEFAULT_OPTIONS: FetchRetryOptions = {
  retries: 3,
  initialDelayMs: 1000,
  backoffFactor: 2,
  maxDelayMs: 10_000,
  timeoutMs: 15_000,
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
};

export class FetchRetryError extends Error {
  readonly status: number | null;
  readonly attempts: number;
  readonly url: string;
  readonly lastResponse: Response | null;

  constructor(
    message: string,
    url: string,
    attempts: number,
    status: number | null = null,
    lastResponse: Response | null = null
  ) {
    super(message);
    this.name = 'FetchRetryError';
    this.url = url;
    this.attempts = attempts;
    this.status = status;
    this.lastResponse = lastResponse;
  }
}

/**
 * Fetch avec retry automatique, backoff exponentiel et timeout AbortController.
 *
 * Retries sur les codes: 408, 429, 500, 502, 503, 504 par defaut.
 * Timeout de 15s par defaut via AbortController.
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: Partial<FetchRetryOptions>
): Promise<Response> {
  const opts: FetchRetryOptions = { ...DEFAULT_OPTIONS, ...options };
  let lastError: FetchRetryError | null = null;
  let lastResponse: Response | null = null;

  for (let attempt = 1; attempt <= opts.retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: mergeAbortSignals(controller.signal, init?.signal),
      });

      clearTimeout(timeoutId);

      // Succes — pas de retry necessaire
      if (!opts.retryStatusCodes.includes(response.status)) {
        return response;
      }

      // Status retryable — on conserve la reponse pour le message d'erreur
      lastResponse = response;
      lastError = new FetchRetryError(
        `HTTP ${response.status} ${response.statusText} pour ${url}`,
        url,
        attempt,
        response.status,
        response
      );
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === 'AbortError') {
        lastError = new FetchRetryError(
          `Timeout apres ${opts.timeoutMs}ms pour ${url}`,
          url,
          attempt,
          null,
          null
        );
      } else {
        const message = error instanceof Error ? error.message : String(error);
        lastError = new FetchRetryError(
          `Erreur reseau: ${message} pour ${url}`,
          url,
          attempt,
          null,
          null
        );
      }
    }

    // Pas de retry apres la derniere tentative
    if (attempt >= opts.retries) break;

    // Notifier le callback de retry
    if (opts.onRetry && lastError) {
      opts.onRetry(attempt, lastError);
    }

    // Backoff exponentiel avec jitter
    const baseDelay = opts.initialDelayMs * Math.pow(opts.backoffFactor, attempt - 1);
    const jitter = baseDelay * 0.1 * Math.random();
    const delay = Math.min(baseDelay + jitter, opts.maxDelayMs);
    await sleep(delay);
  }

  // Toutes les tentatives echouees
  throw lastError ?? new FetchRetryError(
    `Echec apres ${opts.retries} tentatives pour ${url}`,
    url,
    opts.retries,
    lastResponse?.status ?? null,
    lastResponse
  );
}

/**
 * Combine un signal interne (timeout) avec un signal externe optionnel.
 */
function mergeAbortSignals(
  internal: AbortSignal,
  external?: AbortSignal | null
): AbortSignal {
  if (!external) return internal;

  const controller = new AbortController();

  const onAbort = () => controller.abort();
  internal.addEventListener('abort', onAbort, { once: true });
  external.addEventListener('abort', onAbort, { once: true });

  return controller.signal;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
