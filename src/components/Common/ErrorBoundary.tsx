import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-butter p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4">
            <AlertCircle className="mx-auto text-red-500" size={48} />
            <h1 className="text-2xl font-black text-forest">Oops! Something went wrong.</h1>
            <p className="text-forest/60 text-sm">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              className="btn-primary w-full mt-4"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
