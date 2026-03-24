import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import CaptchaPage from './pages/CaptchaPage';
import NotFoundPage from './pages/NotFoundPage';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, showDetails: false };
  }

  componentDidMount() {
    window.addEventListener('error', this.handleGlobalError);
    window.addEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  handleGlobalError = (event: ErrorEvent) => {
    const errorMsg = event.message || event.error?.message || '';
    if (errorMsg.toLowerCase().includes('websocket') || errorMsg.toLowerCase().includes('failed to connect to websocket')) {
      return;
    }
    this.setState({ hasError: true, error: event.error || new Error(event.message) });
  };

  handlePromiseRejection = (event: PromiseRejectionEvent) => {
    const errorMsg = event.reason?.message || String(event.reason) || '';
    if (errorMsg.toLowerCase().includes('websocket') || errorMsg.toLowerCase().includes('failed to connect to websocket')) {
      return;
    }
    this.setState({ hasError: true, error: new Error(errorMsg || 'Erro de rede ou promessa rejeitada') });
  };

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-base)] flex flex-col items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full text-center">
            <div className="mb-8 relative inline-block">
              <div className="text-[120px] font-black text-[var(--bg-surface)] leading-none select-none">
                444
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <AlertTriangle className="w-24 h-24 text-red-500 opacity-80" />
              </div>
            </div>

            <h1 className="text-3xl font-bold mb-3">Ops! Algo deu errado</h1>
            <p className="text-[var(--text-muted)] mb-8">
              Encontramos um erro inesperado. Nossa equipe de macacos treinados já foi notificada.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <button 
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[var(--text-base)] hover:bg-[var(--bg-panel)] transition-colors font-medium"
              >
                Detalhes Técnicos
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--color-sec)] text-white hover:opacity-90 transition-opacity font-medium shadow-lg shadow-[var(--color-sec)]/20"
              >
                <RefreshCw className="w-5 h-5" />
                Tentar Novamente
              </button>
            </div>

            {this.state.showDetails && (
              <div className="w-full text-left bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-strong)] overflow-auto max-h-[40vh] shadow-inner">
                <pre className="text-xs text-red-400 font-mono whitespace-pre-wrap">
                  {this.state.error?.message || "Erro desconhecido"}
                  {'\n\n'}
                  {this.state.error?.stack}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [isVerified, setIsVerified] = useState(() => {
    try {
      const lastVerified = localStorage.getItem('captcha_verified_time');
      if (lastVerified) {
        const timeDiff = Date.now() - parseInt(lastVerified, 10);
        if (timeDiff < 86400000) {
          return true;
        }
      }
    } catch (e) {
      console.warn('localStorage is not available', e);
    }
    return false;
  });

  const handleCaptchaSuccess = () => {
    try {
      localStorage.setItem('captcha_verified_time', Date.now().toString());
    } catch (e) {
      console.warn('localStorage is not available', e);
    }
    setIsVerified(true);
  };

  useEffect(() => {
    // Discord-like console warning
    console.log(
      "%cCalma aí!",
      "color: #5865F2; font-size: 50px; font-weight: bold; -webkit-text-stroke: 1px black;"
    );
    console.log(
      "%cSe alguém te disser para copiar e colar algo aqui, tem 110% de chance de ser golpe.",
      "font-size: 16px;"
    );
    console.log(
      "%cColar qualquer coisa aqui pode dar a invasores acesso à sua conta.",
      "color: red; font-size: 16px; font-weight: bold;"
    );

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleOffline = () => {
      window.dispatchEvent(new ErrorEvent('error', {
        error: new Error('Sem conexão com a internet (Offline)'),
        message: 'Sem conexão com a internet (Offline)'
      }));
    };

    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isVerified) {
    return <CaptchaPage onSuccess={handleCaptchaSuccess} />;
  }

  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
}
