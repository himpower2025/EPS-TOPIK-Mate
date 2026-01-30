import React, { ReactNode, ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global Error Boundary: Catches fatal app errors and displays a recovery UI in English.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Explicitly define state with public access for TypeScript compatibility
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public override render() {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-indigo-50 text-center font-sans">
          <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-xl">
             <span className="text-5xl">⚠️</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Application Error</h1>
          <p className="text-gray-500 mb-8 max-w-md leading-relaxed">
            An unexpected error occurred. Please try reloading the application.
          </p>
          <pre className="bg-white/50 backdrop-blur-md p-6 rounded-2xl border border-indigo-100 text-left text-[11px] text-indigo-400 mb-10 max-w-xl overflow-auto w-full font-mono shadow-inner max-h-40">
            {error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white px-12 py-5 rounded-[2rem] font-black text-xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
          >
            Reload App
          </button>
        </div>
      );
    }

    return children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}