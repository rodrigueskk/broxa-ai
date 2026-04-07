import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import CaptchaPage from './pages/CaptchaPage';
import NotFoundPage from './pages/NotFoundPage';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';
import { useAdminStore, useUserStore } from './store';

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
              Encontramos um erro inesperado. Nossa equipe de macacos treinados já foi notificada.<br/>
              Atualizar a página deve resolver isso.
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
  const [isUnsupported, setIsUnsupported] = useState(false);
  const { isMaintenanceMode } = useAdminStore();
  const { userRole } = useUserStore();

  useEffect(() => {
    const checkPlatform = () => {
      const ua = navigator.userAgent.toLowerCase();
      const isWindows = /windows/i.test(ua);
      const isMac = /macintosh/i.test(ua);
      const isLinux = /linux/i.test(ua);
      const isIOS = /iphone|ipad|ipod/i.test(ua);
      const isAndroid = /android/i.test(ua);
      const isValid = isWindows || isMac || isLinux || isIOS || isAndroid;
      setIsUnsupported(!isValid);
    };
    checkPlatform();
  }, []);

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

  if (isUnsupported) {
    return (
      <div className="min-h-screen bg-black text-[#e0e0e0] flex flex-col items-center justify-center p-6 text-center font-sans tracking-tight">
        <h1 className="text-7xl md:text-8xl mb-6 font-black claude-font" style={{ fontWeight: 400 }}>:(</h1>
        <p className="text-xl md:text-2xl opacity-80 max-w-md mx-auto" style={{ fontWeight: 400 }}>Dispositivo não suportado</p>
        <p className="text-sm md:text-base opacity-50 max-w-sm mx-auto mt-4" style={{ fontWeight: 400 }}>Não reconhecemos seu dispositivo. Use Windows, macOS, Linux, iOS ou Android para acessar.</p>
      </div>
    );
  }

  if (isMaintenanceMode && userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="mb-12 relative">
          <svg className="w-32 h-32 text-white animate-[hammer_1.5s_ease-in-out_infinite]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: '#eab308' }}>
            <path d="M15 12l-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9" />
            <path d="M17.64 15L22 10.64" />
            <path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h-.47" />
            <path d="m11.5 11.5 2 2" />
          </svg>
          <div className="absolute bottom-0 right-0 left-0 h-1 bg-white mx-auto w-8 rounded-full translate-y-6"></div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes hammer {
              0%, 100% { transform: rotate(0deg); }
              25% { transform: rotate(-30deg); }
              75% { transform: rotate(45deg) translateY(5px); }
            }
          `}} />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">O site está em manutenção</h1>
        <p className="text-lg md:text-xl text-zinc-400 max-w-lg mx-auto">
          Achamos um bug, mas a nossa equipe de macacos treinados já foi escalada para arrumar isso.
        </p>
      </div>
    );
  }

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
