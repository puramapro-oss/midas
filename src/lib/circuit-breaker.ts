// =============================================================================
// MIDAS — Circuit Breaker
// Protection contre les cascades d'erreurs avec etats closed/open/half-open
// =============================================================================

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  /** Nombre d'echecs avant ouverture du circuit (defaut: 5) */
  failureThreshold: number;
  /** Duree en ms avant de passer en half-open (defaut: 30000) */
  resetTimeoutMs: number;
  /** Nombre de succes en half-open pour fermer le circuit (defaut: 1) */
  halfOpenSuccessThreshold: number;
  /** Callback optionnel lors d'un changement d'etat */
  onStateChange?: (from: CircuitBreakerState, to: CircuitBreakerState, name: string) => void;
}

export interface CircuitBreakerStatus {
  name: string;
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime: string | null;
  lastSuccessTime: string | null;
  nextRetryTime: string | null;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenSuccessThreshold: 1,
};

export class CircuitBreaker {
  readonly name: string;
  private state: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private readonly options: CircuitBreakerOptions;

  constructor(name: string, options?: Partial<CircuitBreakerOptions>) {
    this.name = name;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Execute une fonction protegee par le circuit breaker.
   * Lance CircuitOpenError si le circuit est ouvert et le timeout pas expire.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.transitionTo('half-open');
      } else {
        throw new CircuitOpenError(this.name, this.getRemainingTimeoutMs());
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /** Etat courant du circuit */
  getState(): CircuitBreakerState {
    // Verifier si on devrait passer en half-open automatiquement
    if (this.state === 'open' && this.shouldAttemptReset()) {
      this.transitionTo('half-open');
    }
    return this.state;
  }

  /** Statut complet du circuit pour monitoring */
  getStatus(): CircuitBreakerStatus {
    return {
      name: this.name,
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
        ? new Date(this.lastFailureTime).toISOString()
        : null,
      lastSuccessTime: this.lastSuccessTime
        ? new Date(this.lastSuccessTime).toISOString()
        : null,
      nextRetryTime: this.state === 'open' && this.lastFailureTime
        ? new Date(this.lastFailureTime + this.options.resetTimeoutMs).toISOString()
        : null,
    };
  }

  /** Reset manuel du circuit */
  reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.transitionTo('closed');
  }

  private onSuccess(): void {
    this.lastSuccessTime = Date.now();

    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.options.halfOpenSuccessThreshold) {
        this.failureCount = 0;
        this.successCount = 0;
        this.transitionTo('closed');
      }
    } else if (this.state === 'closed') {
      // Un succes en closed remet le compteur d'echecs a zero
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      // Un echec en half-open reouvre immediatement
      this.successCount = 0;
      this.transitionTo('open');
    } else if (this.state === 'closed') {
      if (this.failureCount >= this.options.failureThreshold) {
        this.transitionTo('open');
      }
    }
  }

  private shouldAttemptReset(): boolean {
    if (this.lastFailureTime === null) return true;
    return Date.now() - this.lastFailureTime >= this.options.resetTimeoutMs;
  }

  private getRemainingTimeoutMs(): number {
    if (this.lastFailureTime === null) return 0;
    const elapsed = Date.now() - this.lastFailureTime;
    return Math.max(0, this.options.resetTimeoutMs - elapsed);
  }

  private transitionTo(newState: CircuitBreakerState): void {
    const oldState = this.state;
    if (oldState === newState) return;
    this.state = newState;
    this.options.onStateChange?.(oldState, newState, this.name);
  }
}

/**
 * Erreur specifique quand le circuit est ouvert
 */
export class CircuitOpenError extends Error {
  readonly serviceName: string;
  readonly remainingMs: number;

  constructor(serviceName: string, remainingMs: number) {
    super(
      `Circuit breaker "${serviceName}" est ouvert. Reessayez dans ${Math.ceil(remainingMs / 1000)}s.`
    );
    this.name = 'CircuitOpenError';
    this.serviceName = serviceName;
    this.remainingMs = remainingMs;
  }
}

// =============================================================================
// Singleton Registry — un circuit breaker par nom de service
// =============================================================================

const registry = new Map<string, CircuitBreaker>();

/**
 * Retourne le circuit breaker pour un service donne (cree s'il n'existe pas).
 */
export function getCircuitBreaker(
  name: string,
  options?: Partial<CircuitBreakerOptions>
): CircuitBreaker {
  const existing = registry.get(name);
  if (existing) return existing;

  const breaker = new CircuitBreaker(name, options);
  registry.set(name, breaker);
  return breaker;
}

/**
 * Retourne le statut de tous les circuit breakers enregistres.
 */
export function getServiceStatus(): Record<string, CircuitBreakerStatus> {
  const status: Record<string, CircuitBreakerStatus> = {};
  for (const [name, breaker] of registry) {
    status[name] = breaker.getStatus();
  }
  return status;
}

/**
 * Reset tous les circuit breakers (utile pour les tests).
 */
export function resetAllCircuitBreakers(): void {
  for (const breaker of registry.values()) {
    breaker.reset();
  }
}
