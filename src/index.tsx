import React, { Component, ReactNode, ErrorInfo } from 'react';
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
 * 전역 에러 바운더리: 애플리케이션의 치명적 오류를 포착하여 사용자에게 안내합니다.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Critical Runtime Error:", error, errorInfo);
  }

  render() {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-red-50 text-center font-sans">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <span className="text-4xl text-red-600">⚠️</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">앱 실행 중 오류가 발생했습니다</h1>
          <p className="text-gray-600 mb-6 max-w-md">
            페이지를 새로고침하거나 잠시 후 다시 시도해 주세요.
          </p>
          <div className="bg-white p-4 rounded-xl border border-red-100 text-left text-[10px] text-red-400 mb-8 max-w-lg overflow-auto w-full font-mono shadow-inner">
            {error?.stack || error?.toString()}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
          >
            앱 새로고침
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