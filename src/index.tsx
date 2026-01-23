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

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div style={{ padding: '2rem', color: '#dc2626', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', color: '#111827', marginBottom: '1rem' }}>Something went wrong</h1>
          <p style={{ color: '#4b5563', marginBottom: '2rem' }}>
            The application encountered a critical error. Please try refreshing the page.
          </p>
          <pre style={{ backgroundColor: '#f3f4f6', padding: '1.5rem', borderRadius: '1rem', overflowX: 'auto', border: '1px solid #e5e7eb', textAlign: 'left', fontSize: '0.75rem' }}>
            {error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '2rem', padding: '1rem 2rem', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '1rem', cursor: 'pointer', fontWeight: '900', boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)' }}
          >
            Refresh Application
          </button>
        </div>
      );
    }

    return children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);