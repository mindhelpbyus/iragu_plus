import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../utils/secureLogger';


interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl p-8 max-w-2xl w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Application Error</h1>
                <p className="text-sm text-muted-foreground">Something went wrong loading the application</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h2 className="font-semibold text-red-900 mb-2">Error Details:</h2>
              <p className="text-red-800 font-mono text-sm break-words">
                {this.state.error?.toString()}
              </p>
            </div>

            {this.state.errorInfo && (
              <details className="bg-[var(--surface-warm)] border border-border rounded-lg p-4 mb-4">
                <summary className="font-semibold text-foreground cursor-pointer">Stack Trace</summary>
                <pre className="mt-2 text-xs text-foreground overflow-auto max-h-96">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reload Application
              </button>

              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="w-full bg-muted text-foreground px-4 py-2 rounded-lg hover:bg-[var(--rule)] transition-colors"
              >
                Try Again
              </button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Troubleshooting Steps:</h3>
              <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                <li>Check the browser console (F12) for detailed error messages</li>
                <li>Ensure all dependencies are installed</li>
                <li>Clear browser cache and reload</li>
                <li>Check Firebase configuration in /config/firebase.ts</li>
                <li>Review /TROUBLESHOOTING.md for common issues</li>
              </ol>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
