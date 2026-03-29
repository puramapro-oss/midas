// =============================================================================
// MIDAS — Error Handling
// Classe MidasError et erreurs predefinies avec messages utilisateur en francais
// =============================================================================

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

// --- Erreurs predefinies ---

export const ERRORS = {
  // Exchange
  EXCHANGE_CONNECTION_FAILED: {
    code: 'EXCHANGE_CONNECTION_FAILED',
    message: 'Failed to connect to exchange',
    userMessage: 'Impossible de se connecter a l\'exchange. Verifiez vos cles API et reessayez.',
    statusCode: 502,
    severity: 'high' as ErrorSeverity,
    retryable: true,
  },
  EXCHANGE_API_ERROR: {
    code: 'EXCHANGE_API_ERROR',
    message: 'Exchange API returned an error',
    userMessage: 'L\'exchange a retourne une erreur. Reessayez dans quelques instants.',
    statusCode: 502,
    severity: 'medium' as ErrorSeverity,
    retryable: true,
  },
  EXCHANGE_RATE_LIMITED: {
    code: 'EXCHANGE_RATE_LIMITED',
    message: 'Exchange rate limit exceeded',
    userMessage: 'Trop de requetes vers l\'exchange. Patientez quelques secondes.',
    statusCode: 429,
    severity: 'low' as ErrorSeverity,
    retryable: true,
  },
  EXCHANGE_INVALID_CREDENTIALS: {
    code: 'EXCHANGE_INVALID_CREDENTIALS',
    message: 'Invalid exchange API credentials',
    userMessage: 'Cles API invalides. Verifiez que vos cles sont correctes et que les permissions sont activees.',
    statusCode: 401,
    severity: 'high' as ErrorSeverity,
    retryable: false,
  },
  EXCHANGE_INSUFFICIENT_PERMISSIONS: {
    code: 'EXCHANGE_INSUFFICIENT_PERMISSIONS',
    message: 'Insufficient exchange API permissions',
    userMessage: 'Permissions insuffisantes sur vos cles API. Activez les permissions de trading.',
    statusCode: 403,
    severity: 'high' as ErrorSeverity,
    retryable: false,
  },

  // Trading
  INSUFFICIENT_BALANCE: {
    code: 'INSUFFICIENT_BALANCE',
    message: 'Insufficient balance for trade',
    userMessage: 'Solde insuffisant pour executer ce trade. Ajoutez des fonds ou reduisez la taille.',
    statusCode: 400,
    severity: 'medium' as ErrorSeverity,
    retryable: false,
  },
  TRADE_REJECTED_BY_SHIELD: {
    code: 'TRADE_REJECTED_BY_SHIELD',
    message: 'Trade rejected by risk shield',
    userMessage: 'Ce trade a ete bloque par le bouclier de risque MIDAS. Consultez les details pour comprendre pourquoi.',
    statusCode: 403,
    severity: 'high' as ErrorSeverity,
    retryable: false,
  },
  TRADE_EXECUTION_FAILED: {
    code: 'TRADE_EXECUTION_FAILED',
    message: 'Trade execution failed on exchange',
    userMessage: 'L\'execution du trade a echoue. Verifiez votre position et reessayez.',
    statusCode: 500,
    severity: 'critical' as ErrorSeverity,
    retryable: true,
  },
  TRADE_SIZE_TOO_SMALL: {
    code: 'TRADE_SIZE_TOO_SMALL',
    message: 'Trade size below minimum',
    userMessage: 'La taille du trade est inferieure au minimum requis par l\'exchange.',
    statusCode: 400,
    severity: 'low' as ErrorSeverity,
    retryable: false,
  },
  TRADE_SIZE_TOO_LARGE: {
    code: 'TRADE_SIZE_TOO_LARGE',
    message: 'Trade size exceeds maximum',
    userMessage: 'La taille du trade depasse le maximum autorise par votre plan.',
    statusCode: 400,
    severity: 'medium' as ErrorSeverity,
    retryable: false,
  },
  MAX_POSITIONS_REACHED: {
    code: 'MAX_POSITIONS_REACHED',
    message: 'Maximum concurrent positions reached',
    userMessage: 'Nombre maximum de positions atteint. Fermez une position ou passez au plan superieur.',
    statusCode: 403,
    severity: 'low' as ErrorSeverity,
    retryable: false,
  },
  DAILY_TRADE_LIMIT_REACHED: {
    code: 'DAILY_TRADE_LIMIT_REACHED',
    message: 'Daily trade limit reached',
    userMessage: 'Limite de trades quotidiens atteinte. Elle sera reinitialise demain, ou passez au plan superieur.',
    statusCode: 429,
    severity: 'low' as ErrorSeverity,
    retryable: false,
  },

  // Plan / Limits
  PLAN_LIMIT_REACHED: {
    code: 'PLAN_LIMIT_REACHED',
    message: 'Plan limit reached',
    userMessage: 'Vous avez atteint la limite de votre plan. Passez au plan superieur pour continuer.',
    statusCode: 403,
    severity: 'low' as ErrorSeverity,
    retryable: false,
  },
  FEATURE_NOT_AVAILABLE: {
    code: 'FEATURE_NOT_AVAILABLE',
    message: 'Feature not available on current plan',
    userMessage: 'Cette fonctionnalite n\'est pas disponible avec votre plan actuel. Decouvrez nos offres.',
    statusCode: 403,
    severity: 'low' as ErrorSeverity,
    retryable: false,
  },

  // AI
  AI_UNAVAILABLE: {
    code: 'AI_UNAVAILABLE',
    message: 'AI service unavailable',
    userMessage: 'Le service IA est temporairement indisponible. Reessayez dans quelques instants.',
    statusCode: 503,
    severity: 'high' as ErrorSeverity,
    retryable: true,
  },
  AI_RATE_LIMITED: {
    code: 'AI_RATE_LIMITED',
    message: 'AI rate limit exceeded',
    userMessage: 'Trop de requetes IA. Patientez quelques secondes avant de reessayer.',
    statusCode: 429,
    severity: 'low' as ErrorSeverity,
    retryable: true,
  },
  AI_CONTEXT_TOO_LARGE: {
    code: 'AI_CONTEXT_TOO_LARGE',
    message: 'AI context window exceeded',
    userMessage: 'Le contexte de la conversation est trop long. Commencez une nouvelle conversation.',
    statusCode: 400,
    severity: 'low' as ErrorSeverity,
    retryable: false,
  },

  // API
  API_RATE_LIMITED: {
    code: 'API_RATE_LIMITED',
    message: 'API rate limit exceeded',
    userMessage: 'Trop de requetes. Patientez quelques secondes.',
    statusCode: 429,
    severity: 'low' as ErrorSeverity,
    retryable: true,
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Authentication required',
    userMessage: 'Vous devez etre connecte pour acceder a cette ressource.',
    statusCode: 401,
    severity: 'medium' as ErrorSeverity,
    retryable: false,
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: 'Access forbidden',
    userMessage: 'Vous n\'avez pas les permissions necessaires.',
    statusCode: 403,
    severity: 'medium' as ErrorSeverity,
    retryable: false,
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    message: 'Resource not found',
    userMessage: 'La ressource demandee n\'existe pas.',
    statusCode: 404,
    severity: 'low' as ErrorSeverity,
    retryable: false,
  },
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    userMessage: 'Donnees invalides. Verifiez votre saisie.',
    statusCode: 400,
    severity: 'low' as ErrorSeverity,
    retryable: false,
  },
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
    userMessage: 'Une erreur inattendue s\'est produite. Notre equipe a ete notifiee.',
    statusCode: 500,
    severity: 'critical' as ErrorSeverity,
    retryable: true,
  },

  // Bot
  BOT_START_FAILED: {
    code: 'BOT_START_FAILED',
    message: 'Failed to start bot',
    userMessage: 'Impossible de demarrer le bot. Verifiez la configuration et la connexion a l\'exchange.',
    statusCode: 500,
    severity: 'high' as ErrorSeverity,
    retryable: true,
  },
  BOT_LIMIT_REACHED: {
    code: 'BOT_LIMIT_REACHED',
    message: 'Maximum bots limit reached',
    userMessage: 'Nombre maximum de bots atteint. Arretez un bot ou passez au plan superieur.',
    statusCode: 403,
    severity: 'low' as ErrorSeverity,
    retryable: false,
  },

  // Wallet
  WITHDRAWAL_MINIMUM_NOT_MET: {
    code: 'WITHDRAWAL_MINIMUM_NOT_MET',
    message: 'Withdrawal amount below minimum',
    userMessage: 'Le montant minimum de retrait est de 10 EUR.',
    statusCode: 400,
    severity: 'low' as ErrorSeverity,
    retryable: false,
  },
  WITHDRAWAL_DAILY_LIMIT: {
    code: 'WITHDRAWAL_DAILY_LIMIT',
    message: 'Daily withdrawal limit reached',
    userMessage: 'Vous avez atteint la limite d\'un retrait par jour.',
    statusCode: 429,
    severity: 'low' as ErrorSeverity,
    retryable: false,
  },

  // Backtest
  BACKTEST_INVALID_DATES: {
    code: 'BACKTEST_INVALID_DATES',
    message: 'Invalid backtest date range',
    userMessage: 'La plage de dates est invalide. La date de debut doit etre anterieure a la date de fin.',
    statusCode: 400,
    severity: 'low' as ErrorSeverity,
    retryable: false,
  },
  BACKTEST_NO_DATA: {
    code: 'BACKTEST_NO_DATA',
    message: 'No historical data available for backtest',
    userMessage: 'Pas de donnees historiques disponibles pour cette paire et cette periode.',
    statusCode: 404,
    severity: 'low' as ErrorSeverity,
    retryable: false,
  },
} as const;

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
