// Sentry monitoring - stub implementation
// Install @sentry/nextjs to enable full error tracking

export function initSentryClient(): void {
  // No-op without @sentry/nextjs
}

export function initSentryServer(): void {
  // No-op without @sentry/nextjs
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  console.error('[MIDAS Error]', error, context);
}

export function captureMessage(message: string, level: string = 'info'): void {
  // Sentry stub — en attendant l'intégration @sentry/nextjs, tout niveau
  // remonte en console.error (visible logs Vercel) sans perdre le niveau.
  console.error(`[MIDAS ${level}]`, message);
}

export function setUser(id: string, email?: string): void {
  void id;
  void email;
}

export function clearUser(): void {
  // No-op
}
