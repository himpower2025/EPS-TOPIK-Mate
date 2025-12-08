import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// [중요] 에러 발생 시 흰 화면 대신 에러 메시지를 보여주는 안전장치
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: '#dc2626', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>⚠️ Something went wrong</h1>
          <p style={{ marginBottom: '1rem' }}>The application crashed with the following error:</p>
          <pre style={{ backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '0.5rem', overflowX: 'auto', border: '1px solid #e5e7eb' }}>
            {this.state.error?.toString()}
          </pre>
          <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
            Please check the console (F12) for more details.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '1.5rem', padding: '0.75rem 1.5rem', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
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