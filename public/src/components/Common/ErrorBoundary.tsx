import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
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

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong. Please try again later.";
      let isFirestoreError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            isFirestoreError = true;
            if (parsed.error.includes('the client is offline')) {
              errorMessage = "Connection lost. Please check your internet connection and try again.";
            } else if (parsed.error.includes('insufficient permissions')) {
              errorMessage = "You don't have permission to perform this action.";
            } else {
              errorMessage = `Database error: ${parsed.error}`;
            }
          }
        }
      } catch (e) {
        // Not a JSON error message, use default or raw message
        if (this.state.error?.message) {
          errorMessage = this.state.error.message;
        }
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto">
              <AlertCircle size={40} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-800">Oops!</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <button
              onClick={handleReset}
              className="w-full bg-forest text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-forest-dark transition-all active:scale-95"
            >
              <RefreshCw size={20} />
              Reload Application
            </button>
            
            {isFirestoreError && (
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                Error Code: FIRESTORE_PERMISSION_DENIED
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function handleReset() {
  window.location.reload();
}
