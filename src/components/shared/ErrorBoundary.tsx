'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center" data-testid="error-boundary">
          <div className="glass-gold p-6 rounded-xl max-w-md">
            <AlertTriangle className="w-12 h-12 text-[var(--gold-primary)] mx-auto mb-4" />
            <h3
              className="text-lg font-semibold mb-2"
              style={{ fontFamily: 'var(--font-orbitron)' }}
            >
              Erreur inattendue
            </h3>
            <p className="text-[var(--text-secondary)] text-sm mb-4">
              {this.state.error?.message ?? 'Une erreur est survenue. Veuillez réessayer.'}
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--gold-primary)] text-[var(--bg-primary)] font-medium text-sm hover:bg-[var(--gold-light)] transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              Réessayer
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
