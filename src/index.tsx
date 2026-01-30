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
 * 전역 에러 바운더리: 애플리케이션의 치명적 오류를 포착하여 사용자에게 안내합니다.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // TypeScript 에러 방지를 위해 클래스 프로퍼티로 state를 명시적으로 선언합니다.
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
          <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">문제가 발생했습니다</h1>
          <p className="text-gray-500 mb-8 max-w-md leading-relaxed">
            애플리케이션 실행 중 오류가 발생했습니다. 페이지를 새로고침해 주세요.
          </p>
          <pre className="bg-white/50 backdrop-blur-md p-6 rounded-2xl border border-indigo-100 text-left text-[11px] text-indigo-400 mb-10 max-w-xl overflow-auto w-full font-mono shadow-inner max-h-40">
            {error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white px-12 py-5 rounded-[2rem] font-black text-xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
          >
            새로고침
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