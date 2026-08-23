// MIDAS — Error Handling

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface MidasErrorConfig {
  code: string;
  message: string;
  userMessage: string;
  statusCode: number;
  severity: ErrorSeverity;
  retryable: boolean;
}

export class MidasError extends Error {
  readonly code: string;
  readonly userMessage: string;
  readonly statusCode: number;
  readonly severity: ErrorSeverity;
  readonly retryable: boolean;
  readonly timestamp: string;
  readonly context: Record<string, unknown>;

  constructor(config: MidasErrorConfig, context?: Record<string, unknown>) {
    super(config.message);
    this.name = 'MidasError';
    this.code = config.code;
    this.userMessage = config.userMessage;
    this.statusCode = config.statusCode;
    this.severity = config.severity;
    this.retryable = config.retryable;
    this.timestamp = new Date().toISOString();
    this.context = context ?? {};

    // Maintenir la stack trace correcte
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MidasError);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      statusCode: this.statusCode,
      severity: this.severity,
      retryable: this.retryable,
      timestamp: this.timestamp,
      context: this.context,
    };
  }

  static ismidasError(error: unknown): error is MidasError {
    return error instanceof MidasError;
  }
}

// Re-export from error-definitions
export { ERRORS } from './error-definitions';

/**
 * Cree une MidasError a partir d'une configuration predefinies
 */
export function createError(
  errorConfig: MidasErrorConfig,
  context?: Record<string, unknown>
): MidasError {
  return new MidasError(errorConfig, context);
}

/**
 * Extrait un message utilisateur safe depuis n'importe quelle erreur
 */
export function getUserMessage(error: unknown): string {
  if (MidasError.ismidasError(error)) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    return 'Une erreur inattendue s\'est produite. Reessayez.';
  }
  return 'Une erreur inconnue s\'est produite.';
}

/**
 * Extrait le status code HTTP depuis n'importe quelle erreur
 */
export function getStatusCode(error: unknown): number {
  if (MidasError.ismidasError(error)) {
    return error.statusCode;
  }
  return 500;
}
