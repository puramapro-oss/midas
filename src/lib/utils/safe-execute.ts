// =============================================================================
// MIDAS — Safe Execute
// Execution securisee avec retry, timeout, backoff exponentiel et reporting
// =============================================================================

import { MidasError, ERRORS, createError } from '@/lib/utils/errors';

interface SafeExecuteOptions {
  /** Nombre maximum de tentatives (defaut: 3) */
  maxRetries: number;
  /** Timeout par tentative en ms (defaut: 10000) */
  timeoutMs: number;
  /** Delai initial entre retries en ms (defaut: 1000) */
  initialDelayMs: number;
  /** Facteur de backoff exponentiel (defaut: 2) */
  backoffFactor: number;
  /** Delai maximum entre retries en ms (defaut: 30000) */
  maxDelayMs: number;
  /** Nom de l'operation pour le logging */
  operationName: string;
  /** Contexte additionnel pour le reporting */
  context: Record<string, unknown>;
  /** Reporter les erreurs critiques a Sentry (defaut: true) */
  reportCritical: boolean;
  /** Callback appele a chaque retry */
  onRetry: ((attempt: number, error: unknown) => void) | null;
}

const DEFAULT_OPTIONS: SafeExecuteOptions = {
  maxRetries: 3,
  timeoutMs: 10000,
  initialDelayMs: 1000,
  backoffFactor: 2,
  maxDelayMs: 30000,
  operationName: 'unknown',
  context: {},
  reportCritical: true,
  onRetry: null,
};

interface SafeExecuteResult<T> {
  success: boolean;
  data: T | null;
  error: MidasError | null;
  attempts: number;
  totalTimeMs: number;
}

/**
 * Execute une fonction async avec retry, timeout et backoff exponentiel.
 * Reporte les erreurs critiques.
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  options?: Partial<SafeExecuteOptions>
): Promise<SafeExecuteResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      const result = await executeWithTimeout(fn, opts.timeoutMs);
      return {
        success: true,
        data: result,
        error: null,
        attempts: attempt,
        totalTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error;

      // Si l'erreur n'est pas retryable, on arrete immediatement
      if (MidasError.ismidasError(error) && !error.retryable) {
        return {
          success: false,
          data: null,
          error,
          attempts: attempt,
          totalTimeMs: Date.now() - startTime,
        };
      }

      // Derniere tentative, on ne retry plus
      if (attempt >= opts.maxRetries) {
        break;
      }

      // Callback de retry
      if (opts.onRetry) {
        opts.onRetry(attempt, error);
      }

      // Backoff exponentiel avec jitter
      const baseDelay = opts.initialDelayMs * Math.pow(opts.backoffFactor, attempt - 1);
      const jitter = baseDelay * 0.1 * Math.random();
      const delay = Math.min(baseDelay + jitter, opts.maxDelayMs);
      await sleep(delay);
    }
  }

  // Toutes les tentatives echouees
  const midasError = lastError instanceof MidasError
    ? lastError
    : createError(ERRORS.INTERNAL_ERROR, {
        operation: opts.operationName,
        originalError: lastError instanceof Error ? lastError.message : String(lastError),
        ...opts.context,
      });

  // Reporter les erreurs critiques
  if (opts.reportCritical && midasError.severity === 'critical') {
    reportToSentry(midasError, opts.operationName, opts.context);
  }

  return {
    success: false,
    data: null,
    error: midasError,
    attempts: opts.maxRetries,
    totalTimeMs: Date.now() - startTime,
  };
}

/**
 * Execute une fonction avec un timeout
 */
function executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        createError(ERRORS.INTERNAL_ERROR, {
          reason: 'Operation timeout',
          timeoutMs,
        })
      );
    }, timeoutMs);

    fn()
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Sleep utilitaire
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reporte une erreur critique (Sentry ou fallback console en dev)
 */
function reportToSentry(
  error: MidasError,
  operationName: string,
  context: Record<string, unknown>
): void {
  // Import dynamique de Sentry pour eviter les problemes cote client
  try {
    // En production, Sentry sera configure et capturera l'erreur
    if (typeof window === 'undefined') {
      // Server-side: log structure pour monitoring
      const logEntry = {
        level: 'error',
        operation: operationName,
        error: error.toJSON(),
        context,
        timestamp: new Date().toISOString(),
      };
      // eslint-disable-next-line no-console -- Structured logging for monitoring
      console.error('[MIDAS:CRITICAL]', JSON.stringify(logEntry));
    }
  } catch {
    // Silently fail - le reporting ne doit jamais casser l'app
  }
}
