import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Plus, MessageSquare, Trash2, Send, Image as ImageIcon, X, Settings, Pin, Highlighter, AlertTriangle, Undo2, Redo2, Eraser, Copy, Check, ChevronDown, ShieldAlert, LogIn, LogOut, Search, GitCompare, Edit, Edit2, ThumbsUp, ThumbsDown, AlertCircle, ChevronUp, RefreshCw, Cpu, Flame, Snowflake, Bot, User, Lock, ChevronRight } from 'lucide-react';
import { useChatStore, useSettingsStore, useAdminStore, useUserStore, useGroupStore, ReleaseNote, ReleaseNoteImage, ReleaseNoteBadge } from '../store';
import { Group, GroupMessage } from '../types';
import { db } from '../firebase';
import { collection, doc, onSnapshot, query, orderBy, addDoc, serverTimestamp, getDoc, where, updateDoc } from 'firebase/firestore';
import { auth, signInWithGoogle, logOut, handleFirestoreError, OperationType } from '../firebase';
import { AuthModal } from '../components/AuthModal';
import { generateResponse, generateResponseStream, generateTitle } from '../services/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { Rnd } from 'react-rnd';
import { v4 as uuidv4 } from 'uuid';
import { Message, Point } from '../types';

const RespostaOptions = ({ disabled }: { disabled: boolean }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const id = React.useId();
  
  return (
    <div className="flex flex-col gap-3 mt-4 mb-6 resposta-options" data-selected={selected || ''}>
      {['A', 'B', 'C', 'D', 'E'].map(opt => (
        <label key={opt} className={`flex items-center gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <input 
            type="radio" 
            name={`q-${id}`}
            checked={selected === opt}
            onChange={() => {}}
            onClick={(e) => {
              if (disabled) return;
              if (selected === opt) {
                setSelected(null);
              } else {
                setSelected(opt);
              }
            }}
            disabled={disabled}
            className="w-5 h-5 accent-[var(--color-sec)] cursor-pointer"
          />
          <span className="font-medium text-[var(--text-base)]">Opção {opt}</span>
        </label>
      ))}
    </div>
  );
};

const Logo = ({ className, color }: { className?: string, color?: string }) => (
  <Cpu className={className} strokeWidth={1.5} color={color || "currentColor"} />
);

const MessageItem = ({ msg, sessionId, settings, isHighlightMode, isEraserMode, highlightColor, togglePinMessage, addStroke, onStrokeStart, previousUserMessage, onRetry, aiModels, addFeedback, onSendAnswer }: any) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isErrorHubOpen, setIsErrorHubOpen] = useState(false);
  const [isErrorInfoOpen, setIsErrorInfoOpen] = useState(false);
  const [answersSubmitted, setAnswersSubmitted] = useState(false);

  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'like' | 'dislike' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);
  
  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim() || !feedbackType) return;
    try {
      await addFeedback({
        messageId: msg.id,
        isPositive: feedbackType === 'like',
        comment: feedbackText,
        userEmail: auth.currentUser?.email || 'Anônimo',
        model: msg.model || 'Desconhecido',
        prompt: previousUserMessage?.content || 'Sem prompt anterior',
        response: msg.content
      });
      setHasSubmittedFeedback(true);
      setIsFeedbackModalOpen(false);
      setFeedbackText('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  useEffect(() => {
    const resizeCanvas = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.offsetWidth;
        canvasRef.current.height = containerRef.current.offsetHeight;
        drawAll();
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    const observer = new ResizeObserver(resizeCanvas);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      observer.disconnect();
    };
  }, [msg.strokes, currentStroke, settings.theme]);

  const drawAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawStroke = (points: Point[], color: string, isEraser?: boolean) => {
      if (points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 30;
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.globalAlpha = 1.0;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = 20;
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.4;
      }
      ctx.stroke();
    };

    msg.strokes?.forEach((s: any) => drawStroke(s.points, s.color, s.isEraser));
    if (currentStroke.length > 0) {
      drawStroke(currentStroke, highlightColor, isEraserMode);
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  useEffect(() => {
    drawAll();
  }, [msg.strokes, currentStroke, highlightColor]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isHighlightMode || msg.role !== 'ai') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setIsDrawing(true);
    setCurrentStroke([{ x: e.clientX - rect.left, y: e.clientY - rect.top }]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !isHighlightMode) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCurrentStroke(prev => [...prev, { x: e.clientX - rect.left, y: e.clientY - rect.top }]);
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 1) {
      const newStroke = { color: highlightColor, points: currentStroke, isEraser: isEraserMode };
      addStroke(sessionId, msg.id, newStroke);
      if (onStrokeStart) onStrokeStart(msg.id, newStroke);
    }
    setCurrentStroke([]);
  };

  return (
    <motion.div 
      id={`msg-${msg.id}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)', transition: { duration: 0.3, ease: 'easeOut' } }}
      className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} relative`}
    >
      {msg.role === 'ai' && (
        <div className="w-10 h-10 rounded-full bg-[var(--bg-surface)] flex items-center justify-center shrink-0 mt-1 shadow-lg border border-[var(--border-strong)]">
          <Logo className="w-6 h-6 text-[var(--color-sec)]" />
        </div>
      )}
      <div 
        ref={containerRef}
        className={`relative max-w-[90%] md:max-w-[75%] rounded-3xl px-4 py-3 md:px-6 md:py-4 shadow-sm group ${msg.role === 'user' ? 'bg-[var(--bg-surface)] rounded-tr-sm border border-[var(--border-subtle)]' : 'bg-transparent text-[var(--text-base)]'}`}
        style={msg.role === 'user' ? { color: settings.userMessageColor || '#ffffff' } : {}}
      >
        {msg.role === 'ai' && (
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`absolute inset-0 z-10 ai-message-canvas rounded-3xl ${isHighlightMode ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}`}
          />
        )}
        
        <div className="relative z-0 message-content">
          {!msg.content && msg.role === 'ai' && !msg.isError && (
            <div className="flex items-center h-6 mt-1 px-2">
              <div className="jumping-dots text-2xl font-bold text-[var(--color-sec)]">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </div>
            </div>
          )}
          {msg.imageUrl && (
            <img src={msg.imageUrl} alt="Upload" className="max-w-sm w-full rounded-2xl mb-4 object-contain shadow-lg border border-[var(--border-strong)]" />
          )}
          {msg.imageUrls && msg.imageUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {msg.imageUrls.map((url, index) => (
                <img key={index} src={url} alt={`Upload ${index}`} className="max-w-[200px] w-full rounded-2xl object-contain shadow-lg border border-[var(--border-strong)]" />
              ))}
            </div>
          )}
          {msg.content && (
            <div className={`prose ${settings.theme === 'dark' ? 'prose-invert' : ''} max-w-none highlight-strong-no-effect ${msg.role === 'user' ? 'prose-p:leading-relaxed' : 'prose-p:leading-relaxed prose-pre:bg-[var(--bg-input)] prose-pre:border prose-pre:border-[var(--border-strong)] prose-pre:rounded-2xl'}`}>
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap m-0">{msg.content}</p>
              ) : (
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    strong: ({node, ...props}) => <strong style={{ color: settings.secondaryColor }} {...props} />,
                    pre: ({node, children, ...props}: any) => {
                      let isResposta = false;
                      React.Children.forEach(children, (child: any) => {
                        if (React.isValidElement(child) && typeof (child.props as any).className === 'string' && (child.props as any).className.includes('language-resposta')) {
                          isResposta = true;
                        }
                      });
                      if (isResposta) {
                        return <RespostaOptions disabled={answersSubmitted} />
                      }
                      return <pre {...props}>{children}</pre>
                    }
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>
          )}
          
          {msg.role === 'ai' && msg.content?.includes('```resposta') && !answersSubmitted && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  if (containerRef.current) {
                    const optionsContainers = containerRef.current.querySelectorAll('.resposta-options') as NodeListOf<HTMLDivElement>;
                    let allAnswered = true;
                    let answersText = "Aqui estão minhas respostas para as questões acima:\n\n";
                    
                    optionsContainers.forEach((container, index) => {
                      const selected = container.getAttribute('data-selected');
                      if (!selected) {
                        allAnswered = false;
                      }
                      answersText += `Questão ${index + 1}: ${selected || 'Não respondida'}\n\n`;
                    });
                    
                    if (!allAnswered) {
                      const event = new CustomEvent('show-error', { detail: 'Por favor, responda todas as questões antes de enviar.' });
                      window.dispatchEvent(event);
                      return;
                    }

                    answersText += "Por favor, corrija minhas respostas, diga se estão certas ou erradas e explique o porquê.";
                    if (onSendAnswer) onSendAnswer(answersText);
                    setAnswersSubmitted(true);
                  }
                }}
                className="px-6 py-2.5 bg-[var(--color-sec)] text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Enviar Respostas
              </button>
            </div>
          )}

          {msg.isCancelled && (
            <div className="text-yellow-500 font-bold mt-4 p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
              Mensagem cancelada pelo usuário
            </div>
          )}
        </div>
        
        {msg.isError && (
          <div className="mt-4 flex items-center gap-2 relative">
            <button 
              onClick={() => setIsErrorInfoOpen(!isErrorInfoOpen)}
              className="flex items-center gap-1.5 text-red-500 hover:text-red-600 transition-colors text-sm font-medium"
            >
              <AlertCircle className="w-4 h-4" />
              Erro Interno
            </button>
            <div className="relative">
              <button 
                onClick={() => setIsErrorHubOpen(!isErrorHubOpen)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-base)] transition-colors text-[var(--text-muted)]"
              >
                {isErrorHubOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <AnimatePresence>
                {isErrorHubOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-1 w-48 bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl shadow-xl z-50 overflow-hidden"
                  >
                    <button 
                      onClick={() => {
                        setIsErrorHubOpen(false);
                        if (onRetry && previousUserMessage) {
                          onRetry(previousUserMessage.content, previousUserMessage.imageUrls ? previousUserMessage.imageUrls.map((url: string) => ({url, mimeType: 'image/jpeg'})) : []);
                        }
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-surface)] transition-colors flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Tentar de novo
                    </button>
                    <button 
                      onClick={() => {
                        setIsErrorHubOpen(false);
                        // Trocar modelo logic could be handled by opening the model dropdown, but for now we'll just trigger retry with a different model if we had the state, or just let the user change it manually.
                        // Actually, the prompt says "trocar modelo", maybe we just focus the model selector or open it.
                        // For now, let's just show the button.
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-surface)] transition-colors flex items-center gap-2"
                    >
                      <Cpu className="w-4 h-4" />
                      Trocar modelo
                    </button>
                    <button 
                      onClick={() => {
                        setIsErrorHubOpen(false);
                        if (previousUserMessage) {
                          navigator.clipboard.writeText(previousUserMessage.content);
                        }
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-surface)] transition-colors flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copiar prompt
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <AnimatePresence>
              {isErrorInfoOpen && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute top-full left-0 mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs max-w-sm z-40"
                >
                  <p className="font-bold mb-1">Erro Interno do Servidor</p>
                  <p className="mb-2">Ocorreu um problema ao processar sua solicitação. Por favor, volte mais tarde ou tente novamente.</p>
                  <p className="opacity-80 font-mono text-[10px] break-all">{msg.errorMessage}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        
        {msg.role === 'ai' && (
          <div className="absolute -top-5 right-4 flex flex-row justify-end gap-1 z-20 md:opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-xl p-1 shadow-sm">
            <button 
              onClick={() => togglePinMessage(sessionId, msg.id)}
              className={`p-1.5 rounded-lg transition-colors ${msg.isPinned ? 'text-[var(--color-sec)] bg-[var(--bg-surface)]' : 'text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)]'}`}
              title={msg.isPinned ? "Desmarcar como importante" : "Marcar como importante"}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={handleCopy}
              className="p-1.5 rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)]"
              title="Copiar mensagem"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-[var(--color-sec)]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            {msg.role === 'ai' && !hasSubmittedFeedback && (
              <>
                <div className="w-px h-4 bg-[var(--border-subtle)] mx-1" />
                <button 
                  onClick={() => { setFeedbackType('like'); setIsFeedbackModalOpen(true); }}
                  className="p-1.5 rounded-lg transition-colors text-[var(--text-muted)] hover:text-green-500 hover:bg-green-500/10"
                  title="A resposta foi útil"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => { setFeedbackType('dislike'); setIsFeedbackModalOpen(true); }}
                  className="p-1.5 rounded-lg transition-colors text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10"
                  title="A resposta não foi útil"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {msg.role === 'ai' && hasSubmittedFeedback && (
              <>
                <div className="w-px h-4 bg-[var(--border-subtle)] mx-1" />
                <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-500" />
                  Obrigado pelo feedback!
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isFeedbackModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[var(--bg-panel)] rounded-3xl border border-[var(--border-strong)] w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-[var(--border-subtle)]">
                <h3 className="text-xl font-bold text-[var(--text-base)] flex items-center gap-2">
                  {feedbackType === 'like' ? <ThumbsUp className="w-5 h-5 text-green-500" /> : <ThumbsDown className="w-5 h-5 text-red-500" />}
                  {feedbackType === 'like' ? 'O que a IA acertou?' : 'O que a IA errou?'}
                </h3>
                <button onClick={() => setIsFeedbackModalOpen(false)} className="p-2 hover:bg-[var(--bg-surface)] rounded-full transition-colors text-[var(--text-muted)] hover:text-[var(--text-base)]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-[var(--text-muted)] mb-4">
                  Seu feedback ajuda a melhorar o modelo <span className="font-medium text-[var(--text-base)]">{aiModels?.find(m => m.key === msg.model)?.name || msg.model || 'A.S'}</span>.
                </p>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder={feedbackType === 'like' ? "Ex: A resposta foi clara e direta ao ponto..." : "Ex: A IA não entendeu o contexto ou deu uma informação errada..."}
                  className="w-full h-32 bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl p-4 focus:outline-none focus:border-[var(--color-sec)] resize-none mb-4"
                />
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setIsFeedbackModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleFeedbackSubmit}
                    disabled={!feedbackText.trim()}
                    className="px-6 py-2 bg-[var(--color-sec)] text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Enviar Feedback
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const TypingTitle = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const prevTextRef = useRef(text);

  useEffect(() => {
    if (text !== prevTextRef.current && text !== 'Nova Conversa') {
      setIsTyping(true);
      setDisplayedText('');
      let i = 0;
      const interval = setInterval(() => {
        setDisplayedText(text.slice(0, i + 1));
        i++;
        if (i >= text.length) {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, 50);
      prevTextRef.current = text;
      return () => clearInterval(interval);
    } else {
      setDisplayedText(text);
      prevTextRef.current = text;
    }
  }, [text]);

  return (
    <span className="text-sm truncate">
      {displayedText}
      {isTyping && <span className="animate-pulse">|</span>}
    </span>
  );
};

const FORBIDDEN_WORDS = [
  "hack", "hacker", "hacking", "ddos", "sql injection", "xss", "exploit", "payload", "backdoor", "trojan", "malware", "ransomware", "phishing", "keylogger", "botnet", "rootkit", "spyware", "deface", "spoofing", "sniffer", "brute force", "zero day", "vulnerability", "shellcode", "reverse engineering", "penetration testing", "pentest", "nmap", "metasploit", "wireshark", "aircrack", "john the ripper", "hashcat", "burp suite", "hydra", "sqlmap", "netcat", "tcpdump", "ettercap", "maltego", "owasp", "cyberattack", "cybercrime", "dark web", "deep web", "tor", "onion", "carding", "skimming", "c2", "command and control", "rat", "remote access trojan", "crypter", "binder", "dropper", "downloader", "obfuscator", "packer", "fud", "bypass", "firewall", "ids", "ips", "waff", "antivirus", "edr", "xdr", "mdr", "soc", "siem", "threat intelligence", "osint", "social engineering", "baiting", "tailgating", "pretexting", "vishing", "smishing", "whaling", "pharming", "watering hole", "evil twin", "rogue ap", "man in the middle", "mitm", "session hijacking", "cookie theft", "csrf", "ssrf", "xxe", "lfi", "rfi", "directory traversal", "path traversal", "command injection", "os command injection", "code injection", "ldap injection", "xpath injection", "nosql injection", "idor", "broken authentication", "broken access control", "security misconfiguration", "sensitive data exposure", "insecure deserialization", "cibersegurança", "defacement", "script kiddie",
  "cryptography", "encryption", "decryption", "hashing", "salting", "digital signature", "pki", "ssl", "tls", "ipsec", "vpn", "ssh", "pgp", "gpg", "aes", "des", "3des", "rsa", "dsa", "ecc", "md5", "sha1", "sha256", "sha512", "bcrypt", "scrypt", "argon2", "pbkdf2", "hmac", "mac", "diffie hellman", "dh", "ecdh", "pfs", "quantum cryptography", "homomorphic encryption", "zero knowledge proof", "zkp", "criptografia", "descriptografar", "descriptografia", "chave privada", "chave pública", "token", "jwt", "oauth", "saml", "openid", "sso", "dados criptografados",
  "programação", "código fonte", "source code", "python", "java", "c++", "javascript", "typescript", "php", "ruby", "go", "rust", "swift", "kotlin", "c#", "sql", "html", "css", "bash", "powershell", "shell script", "assembly", "compilador", "interpretador", "depurador", "debugger", "ide", "git", "github", "gitlab", "bitbucket", "docker", "kubernetes", "aws", "azure", "gcp", "cloud", "servidor", "banco de dados", "database", "api", "rest", "graphql", "soap", "webhook", "json", "xml", "yaml", "csv", "regex", "expressão regular", "algoritmo", "estrutura de dados", "loop", "if else", "switch case", "função", "classe", "objeto", "herança", "polimorfismo", "encapsulamento", "abstração", "interface", "ponteiro", "variável", "constante", "array", "lista", "dicionário", "mapa", "set", "tupla", "string", "inteiro", "float", "booleano", "null", "undefined", "nan", "infinity", "try catch", "exception", "erro", "bug", "debug", "refatoração", "clean code", "solid", "design pattern", "mvc", "mvvm", "arquitetura", "microsserviços", "monolito", "frontend", "backend", "fullstack", "devops", "ci cd", "pipeline", "deploy", "teste unitário", "teste de integração", "teste e2e", "tdd", "bdd", "ddd", "scrum", "kanban", "agile", "sprint", "backlog", "épico", "história de usuário", "task", "issue", "pull request", "merge request", "commit", "push", "pull", "clone", "fetch", "branch", "tag", "release", "versão", "semver", "npm", "yarn", "pip", "gem", "maven", "gradle", "nuget", "composer", "dockerfile", "docker compose", "kubernetes manifest", "helm chart", "terraform", "ansible", "chef", "puppet", "vagrant", "virtualbox", "vmware", "hyper v", "wsl", "linux", "ubuntu", "debian", "centos", "fedora", "red hat", "arch", "manjaro", "kali", "parrot", "windows", "macos", "android", "ios",
  "porra", "caralho", "buceta", "cu", "rola", "cacete", "foda", "foder", "fodido", "foda-se", "viado", "viadinho", "bicha", "sapatão", "puta", "putaria", "corno", "chifrudo", "arrombado", "cuzão", "babaca", "otário", "trouxa", "merda", "bosta", "mijo", "gozo", "punheta", "siririca", "tesão", "tesudo", "gostosa", "gostoso", "piranha", "vagabunda", "vadia", "quenga", "rapariga", "puta que pariu", "vtnc", "vsf", "fdp", "tnc", "krl", "prr", "bct", "mlk", "mano", "véi", "truta", "parça", "lek", "zika", "chave", "daora", "irado", "sinistro", "bolado", "cabuloso", "pica", "treta", "treteiro", "zueira", "zuera", "zoar", "troll", "trollar", "noob", "nub", "lixo", "ruim", "podre", "lixão", "chorão", "mimimi", "gado", "incel", "redpill", "sigma", "beta", "alfa", "chad", "virgin", "normie", "cringe", "based", "redpillado", "bluepill", "blackpill", "doomer", "bloomer", "zoomer", "boomer", "millennial", "gen z", "gen x", "karen", "maconha", "droga", "pó", "cocaína", "crack", "lsd", "doce", "bala", "ecstasy", "mdma", "lança", "loló", "baforar", "fumar", "cheirar", "injetar", "beber", "cachaça", "pinga", "mé", "breja", "cerva", "gelada", "litrão", "corote", "catuaba", "vinho", "vodka", "whisky", "gin", "tequila", "rum", "licor", "absinto", "saquê", "soju", "baseado", "beck", "fininho", "tora", "bomba", "charuto", "blunt", "bong", "pipe", "seda", "dichavador", "isqueiro", "maçarico", "cinzeiro", "piteira", "filtro", "tabaco", "fumo", "palheiro", "cigarro", "vape", "pod", "juul", "pendrive", "fumaça", "brisa", "lombra", "chapado", "noiado", "drogado", "viciado", "cracudo", "maconheiro", "zé droguinha", "traficante", "biqueira", "boca de fumo", "favela", "morro", "quebrada", "gueto", "periferia", "comunidade", "asfalto", "playboy", "patricinha", "mauricinho", "burguês", "rico", "pobre", "mendigo", "morador de rua", "sem teto", "sem terra",
  "sistema", "prompt", "instruções", "regras", "ignorar", "jailbreak", "desobedecer", "esquecer", "apagar", "override", "developer mode", "modo desenvolvedor", "dan", "do anything now"
];

const TextSelectionToolbar = ({ onCopy, onPin, onExplain, onSearch, onCompare, position, isSearchModel }: any) => {
  if (!position) return null;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.9 }}
      className="fixed z-[100] bg-black text-white rounded-xl shadow-2xl border border-zinc-800 flex items-center p-1 gap-1"
      style={{ top: position.y + 20, left: position.x, transform: 'translateX(-50%)' }}
    >
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-black"></div>
      <button onClick={onCopy} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors" title="Copiar">
        <Copy className="w-4 h-4" />
      </button>
      <button onClick={onPin} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors" title="Fixar">
        <Pin className="w-4 h-4" />
      </button>
      {!isSearchModel && (
        <button onClick={onExplain} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors" title="Explicar">
          <MessageSquare className="w-4 h-4" />
        </button>
      )}
      <button onClick={onSearch} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors" title="Pesquisar no Google">
        <Search className="w-4 h-4" />
      </button>
      {!isSearchModel && (
        <button onClick={onCompare} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors" title="Comparar Modelos">
          <GitCompare className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
};

const HoldButton = ({ onConfirm, onCancel, children, className, holdTime = 2000 }: any) => {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startHold = () => {
    setIsHolding(true);
    setProgress(0);
    
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min((elapsed / holdTime) * 100, 100));
    }, 50);

    timerRef.current = setTimeout(() => {
      clearInterval(intervalRef.current!);
      setProgress(100);
      onConfirm();
      setIsHolding(false);
    }, holdTime);
  };

  const cancelHold = () => {
    if (isHolding && progress < 100) {
      if (onCancel) onCancel();
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsHolding(false);
    setProgress(0);
  };

  return (
    <button
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      className={`relative overflow-hidden ${className}`}
    >
      <div 
        className="absolute inset-y-0 left-0 bg-red-700 transition-all duration-75"
        style={{ width: `${progress}%` }}
      />
      <div className="relative z-10 flex items-center gap-3 justify-center w-full">
        {children}
      </div>
    </button>
  );
};

const ImageUpload = ({ value, onChange, label }: { value: string, onChange: (val: string) => void, label: string }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 500;
            const MAX_HEIGHT = 500;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            // Compress to JPEG with 0.8 quality
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            onChange(dataUrl);
          };
          img.src = e.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    } else {
      alert('Por favor, selecione uma imagem válida (PNG, JPG, etc).');
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--text-muted)]">{label}</label>
      <div className="flex flex-col gap-3">
        {value && (
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[var(--border-strong)] mx-auto">
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
            <button 
              onClick={() => onChange('')}
              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        )}
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${isDragging ? 'border-[var(--color-sec)] bg-[var(--color-sec)]/10' : 'border-[var(--border-strong)] hover:border-[var(--text-muted)]'}`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} 
            accept="image/*" 
            className="hidden" 
          />
          <ImageIcon className="w-6 h-6 mx-auto mb-2 text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">Arraste uma imagem ou clique para selecionar</p>
        </div>
      </div>
    </div>
  );
};

export default function ChatPage() {
  const navigate = useNavigate();
  const { sessions, currentSessionId, setCurrentSessionId, currentSession, createSession, addMessage, updateMessage, deleteSession, togglePinSession, togglePinMessage, addPinnedText, removePinnedText, addStroke, setStrokes, updateSessionTitle } = useChatStore();
  const { settings, updateSettings } = useSettingsStore();
  const { groups, createGroup, joinGroup, renameGroup, updateGroupStreak, updateGroup, removeMember, deleteGroup } = useGroupStore();
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinGroupId = params.get('joinGroup');
    const inviterName = params.get('inviterName') || 'Um usuário';
    
    if (joinGroupId && auth.currentUser) {
      // Remove parameter from URL without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
      
      const checkGroup = async () => {
        try {
          const groupRef = doc(db, 'groups', joinGroupId);
          const groupSnap = await getDoc(groupRef);
          
          if (groupSnap.exists()) {
            const groupData = groupSnap.data();
            if (groupData.members && groupData.members.includes(auth.currentUser!.uid)) {
              // Already a member
              setSelectedGroupId(joinGroupId);
              setCurrentSessionId(null);
            } else {
              // Show invite modal
              setInviteModalData({
                groupId: joinGroupId,
                groupName: groupData.name,
                inviterName: inviterName
              });
            }
          }
        } catch (error) {
          console.error("Error fetching group details:", error);
        }
      };
      
      checkGroup();
    }
  }, [auth.currentUser]);
  
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupInviteLink, setGroupInviteLink] = useState('');
  const [isRenameGroupModalOpen, setIsRenameGroupModalOpen] = useState(false);
  const [renameGroupId, setRenameGroupId] = useState<string | null>(null);
  const [newRenameValue, setNewRenameValue] = useState('');
  const [isGroupSettingsModalOpen, setIsGroupSettingsModalOpen] = useState(false);
  const [isGroupMembersModalOpen, setIsGroupMembersModalOpen] = useState(false);
  const [groupSettingsData, setGroupSettingsData] = useState<{ name: string, photoURL: string, systemInstruction: string }>({ name: '', photoURL: '', systemInstruction: '' });
  const [inviteModalData, setInviteModalData] = useState<{ groupId: string, groupName: string, inviterName: string } | null>(null);
  const [confirmModalData, setConfirmModalData] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
  
  const memberDetails = useMemo(() => {
    const details: Record<string, { name: string, photoURL: string | null }> = {};
    groupMessages.forEach(msg => {
      if (msg.senderId !== 'ai' && !details[msg.senderId]) {
        details[msg.senderId] = {
          name: msg.senderName,
          photoURL: msg.senderPhotoURL || null
        };
      }
    });
    return details;
  }, [groupMessages]);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default to false on mobile for better UX
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [selectedImages, setSelectedImages] = useState<{url: string, mimeType: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [textSelection, setTextSelection] = useState<{ text: string, position: { x: number, y: number } } | null>(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showSettingsConfirm, setShowSettingsConfirm] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [tempSettings, setTempSettings] = useState(settings);
  const [isPinnedMessagesOpen, setIsPinnedMessagesOpen] = useState(false);
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [isEraserMode, setIsEraserMode] = useState(false);
  const [highlightColor, setHighlightColor] = useState('#eab308');
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isOverloaded, setIsOverloaded] = useState(false);
  const [undoStack, setUndoStack] = useState<{messageId: string, stroke: any}[]>([]);
  const [redoStack, setRedoStack] = useState<{messageId: string, stroke: any}[]>([]);
  const [selectedModel, setSelectedModel] = useState<'thinking' | 'fast' | 'search' | 'as'>('thinking');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isDevModelsModalOpen, setIsDevModelsModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [shakeInput, setShakeInput] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(60);
  const [showASWarning, setShowASWarning] = useState(false);
  const [newChatTimestamps, setNewChatTimestamps] = useState<number[]>([]);
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  const [unlockedFeature, setUnlockedFeature] = useState<{name: string, days: number} | null>(null);
  const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [tempDisplayName, setTempDisplayName] = useState('');
  const [tempPhotoURL, setTempPhotoURL] = useState('');

  const { seenReleaseNotes, markAsSeen, userRole, hasSeenRoleNotification, markRoleNotificationAsSeen, streakDays, lastMessageDate, freezesAvailable, updateStreak, checkStreak, displayName, photoURL, hasSetProfile, updateProfile, unlockedFeatures, markFeatureAsSeen, isUserLoaded } = useUserStore();
  const prevStreakRef = useRef(streakDays);

  useEffect(() => {
    if (auth.currentUser && lastMessageDate) {
      checkStreak();
    }
  }, [auth.currentUser, lastMessageDate]);

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        unsubscribe();
        return;
      }
      
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc')
      );
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (data.userId === user.uid && !data.read) {
              showError(data.message, 'error');
              // Mark as read
              updateDoc(doc(db, 'notifications', change.doc.id), { read: true }).catch(console.error);
            }
          }
        });
      }, (error) => {
        console.error("Error fetching notifications:", error);
      });
    });
    
    return () => {
      unsubscribeAuth();
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!selectedGroupId) {
      setGroupMessages([]);
      return;
    }
    const q = query(collection(db, `groups/${selectedGroupId}/messages`), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupMessage));
      setGroupMessages(msgs);
      setTimeout(scrollToBottom, 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `groups/${selectedGroupId}/messages`);
    });
    return () => unsubscribe();
  }, [selectedGroupId]);

  useEffect(() => {
    if (isUserLoaded && auth.currentUser && hasSetProfile === false && !isProfileSetupOpen) {
      setIsProfileSetupOpen(true);
      setTempDisplayName(displayName || auth.currentUser.displayName || '');
      setTempPhotoURL(photoURL || auth.currentUser.photoURL || '');
    }
  }, [isUserLoaded, auth.currentUser, hasSetProfile, displayName, photoURL]);

  useEffect(() => {
    if (prevStreakRef.current !== streakDays) {
      const prev = prevStreakRef.current;
      const curr = streakDays;
      
      let feature = null;
      if (prev < 3 && curr >= 3) feature = { name: 'Cor de Seleção', days: 3 };
      else if (prev < 10 && curr >= 10) feature = { name: 'Fonte do Título', days: 10 };
      else if (prev < 15 && curr >= 15) feature = { name: 'Imagem de Fundo', days: 15 };
      else if (prev < 20 && curr >= 20) feature = { name: 'Comportamento da IA', days: 20 };
      
      if (feature && prev > 0 && !unlockedFeatures.includes(feature.name)) {
        setUnlockedFeature(feature);
      }
      
      prevStreakRef.current = curr;
    }
  }, [streakDays]);
  const [isAdmin, setIsAdmin] = useState(false);
  const { releaseNotes, feedbacks, aiModels, users, allGroups, addReleaseNote, updateReleaseNote, deleteReleaseNote, updateAiModel, addFeedback, updateUserStreak, updateUserRole, updateAdminGroupStreak, deleteAdminGroup } = useAdminStore(isAdmin);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'releaseNotes' | 'feedbacks' | 'models' | 'users' | 'groups'>('releaseNotes');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [currentReleaseNote, setCurrentReleaseNote] = useState<ReleaseNote | null>(null);
  
  const [editingReleaseNoteId, setEditingReleaseNoteId] = useState<string | null>(null);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [newReleaseNote, setNewReleaseNote] = useState({
    version: '',
    title: '',
    description: '',
    changes: '',
    imageUrl: '',
    titleRgb: false,
    outlineColor: '',
    backgroundColor: '',
    buttonText: 'Entendi!',
    buttonColor: '',
    buttonRgb: false,
    images: [] as ReleaseNoteImage[],
    badges: [] as ReleaseNoteBadge[]
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && (userRole === 'admin' || user.email === 'playaxieinfinity2021@gmail.com')) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, [userRole]);

  const [roleNotificationModal, setRoleNotificationModal] = useState<{ role: string } | null>(null);

  useEffect(() => {
    if (auth.currentUser && userRole && (userRole === 'admin' || userRole === 'developer') && !hasSeenRoleNotification) {
      setRoleNotificationModal({ role: userRole === 'admin' ? 'Administrador' : 'Desenvolvedor' });
      markRoleNotificationAsSeen();
    }
  }, [userRole, hasSeenRoleNotification, auth.currentUser]);

  useEffect(() => {
    if (!isUserLoaded) return;
    const unseen = releaseNotes.find(note => !seenReleaseNotes.includes(note.id));
    if (unseen) {
      setCurrentReleaseNote(unseen);
    }
  }, [releaseNotes, seenReleaseNotes, isUserLoaded]);

  const closeReleaseNote = () => {
    if (currentReleaseNote) {
      markAsSeen(currentReleaseNote.id);
      setCurrentReleaseNote(null);
    }
  };

  const handleSaveReleaseNote = () => {
    if (!newReleaseNote.version || !newReleaseNote.title) return;
    
    const noteData = {
      version: newReleaseNote.version,
      title: newReleaseNote.title,
      description: newReleaseNote.description,
      changes: newReleaseNote.changes.split('\n').filter(c => c.trim() !== ''),
      imageUrl: newReleaseNote.imageUrl,
      titleRgb: newReleaseNote.titleRgb,
      outlineColor: newReleaseNote.outlineColor,
      backgroundColor: newReleaseNote.backgroundColor,
      buttonText: newReleaseNote.buttonText,
      buttonColor: newReleaseNote.buttonColor,
      buttonRgb: newReleaseNote.buttonRgb,
      images: newReleaseNote.images,
      badges: newReleaseNote.badges
    };

    if (editingReleaseNoteId) {
      updateReleaseNote(editingReleaseNoteId, noteData);
      setEditingReleaseNoteId(null);
    } else {
      addReleaseNote(noteData);
    }
    
    setNewReleaseNote({
      version: '',
      title: '',
      description: '',
      changes: '',
      imageUrl: '',
      titleRgb: false,
      outlineColor: '',
      backgroundColor: '',
      buttonText: 'Entendi!',
      buttonColor: '',
      buttonRgb: false,
      images: [],
      badges: []
    });
  };

  const handleEditReleaseNote = (note: ReleaseNote) => {
    setEditingReleaseNoteId(note.id);
    setNewReleaseNote({
      version: note.version,
      title: note.title,
      description: note.description,
      changes: note.changes.join('\n'),
      imageUrl: note.imageUrl || '',
      titleRgb: note.titleRgb || false,
      outlineColor: note.outlineColor || '',
      backgroundColor: note.backgroundColor || '',
      buttonText: note.buttonText || 'Entendi!',
      buttonColor: note.buttonColor || '',
      buttonRgb: note.buttonRgb || false,
      images: note.images || [],
      badges: note.badges || []
    });
  };

  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleResizeMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isResizingRef.current) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = startYRef.current - clientY;
    const newHeight = Math.max(60, Math.min(window.innerHeight * 0.6, startHeightRef.current + deltaY));
    setTextareaHeight(newHeight);
  }, []);

  const handleResizeEnd = useCallback(() => {
    isResizingRef.current = false;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    document.removeEventListener('touchmove', handleResizeMove);
    document.removeEventListener('touchend', handleResizeEnd);
  }, [handleResizeMove]);

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    isResizingRef.current = true;
    startYRef.current = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startHeightRef.current = textareaHeight;
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    document.addEventListener('touchmove', handleResizeMove, { passive: false });
    document.addEventListener('touchend', handleResizeEnd);
  };

  const handleNewChat = () => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentTimestamps = newChatTimestamps.filter(t => t > oneMinuteAgo);

    if (recentTimestamps.length >= 5) {
      const oldest = recentTimestamps[0];
      const remainingSeconds = Math.ceil((oldest + 60000 - now) / 1000);
      setRateLimitWarning(`Limite de Requests, tente novamente em ${remainingSeconds} segundos`);
      setNewChatTimestamps(recentTimestamps);
      return;
    }

    setNewChatTimestamps([...recentTimestamps, now]);
    createSession();
    setSelectedGroupId(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const pinnedSessions = sessions.filter(s => s.isPinned);
  const unpinnedSessions = sessions.filter(s => !s.isPinned);
  const pinnedMessages = currentSession?.messages.filter(m => m.isPinned) || [];
  const pinnedTexts = currentSession?.pinnedTexts || [];
  const hasPinnedItems = pinnedMessages.length > 0 || pinnedTexts.length > 0;
  const hasHighlights = currentSession?.messages.some(m => m.strokes && m.strokes.length > 0);

  const latestState = useRef({ sessions, currentSessionId, setStrokes, addStroke });
  useEffect(() => {
    latestState.current = { sessions, currentSessionId, setStrokes, addStroke };
  });

  useEffect(() => {
    if (!textareaRef.current) return;
    let lastHeight = 0;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const maxHeight = window.innerHeight * 0.6;
        const currentHeight = entry.contentRect.height;
        if (currentHeight >= maxHeight - 5 && lastHeight < maxHeight - 5) {
          setShakeInput(true);
          setTimeout(() => setShakeInput(false), 500);
        }
        lastHeight = currentHeight;
      }
    });
    observer.observe(textareaRef.current);
    return () => observer.disconnect();
  }, []);

  const handleCloseSettings = () => {
    if (JSON.stringify(tempSettings) !== JSON.stringify(settings)) {
      setShowSettingsConfirm(true);
    } else {
      setSettingsError(null);
      setIsSettingsOpen(false);
    }
  };

  const handleBgUpload = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxWidth = 1920;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          setTempSettings({ ...tempSettings, backgroundImage: canvas.toDataURL('image/jpeg', 0.6) });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const confirmSettingsClose = (save: boolean) => {
    if (save) {
      const instruction = tempSettings.customInstruction?.toLowerCase() || '';
      const foundForbiddenWords = FORBIDDEN_WORDS.filter(word => {
        const escapedWord = word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
        return regex.test(instruction);
      });
      
      if (foundForbiddenWords.length > 0) {
        setSettingsError(`Erro: Por favor, remova as seguintes palavras proibidas do comportamento da IA: ${foundForbiddenWords.slice(0, 5).join(', ')}${foundForbiddenWords.length > 5 ? '...' : ''}. A IA não permite falar sobre hacking, palavrões, gírias, cibersegurança, dados criptografados ou programação.`);
        setShowSettingsConfirm(false);
        return;
      }
      
      updateSettings(tempSettings);
    } else {
      setTempSettings(settings);
    }
    setSettingsError(null);
    setShowSettingsConfirm(false);
    setIsSettingsOpen(false);
  };

  useEffect(() => {
    if (isSettingsOpen) {
      setTempSettings(settings);
    }
  }, [isSettingsOpen, settings]);

  const handleAddStrokeToStack = (messageId: string, stroke: any) => {
    setUndoStack(prev => [...prev, { messageId, stroke }]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const lastAction = prev[prev.length - 1];
      const newStack = prev.slice(0, -1);
      setRedoStack(r => [...r, lastAction]);
      
      const { sessions, currentSessionId, setStrokes } = latestState.current;
      const msg = sessions.find(s => s.id === currentSessionId)?.messages.find(m => m.id === lastAction.messageId);
      if (msg && msg.strokes) {
        const newStrokes = msg.strokes.filter(s => s !== lastAction.stroke);
        setStrokes(currentSessionId!, lastAction.messageId, newStrokes);
      }
      return newStack;
    });
  };

  const handleRedo = () => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const actionToRedo = prev[prev.length - 1];
      const newStack = prev.slice(0, -1);
      setUndoStack(u => [...u, actionToRedo]);
      
      const { currentSessionId, addStroke } = latestState.current;
      addStroke(currentSessionId!, actionToRedo.messageId, actionToRedo.stroke);
      return newStack;
    });
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--color-sec', settings.secondaryColor);
    document.documentElement.style.setProperty('--selection-color', settings.selectionColor || '#3b82f6');
    if (settings.theme === 'light') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
    }
  }, [settings.secondaryColor, settings.theme, settings.selectionColor]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleGlobalMouseDown = (e: MouseEvent) => {
      if (isHighlightMode) {
        const target = e.target as HTMLElement;
        if (!target.closest('.ai-message-canvas') && !target.closest('.highlighter-tools')) {
          showError('Você só pode grifar as respostas da IA!');
        }
      }
    };
    window.addEventListener('mousedown', handleGlobalMouseDown);
    return () => window.removeEventListener('mousedown', handleGlobalMouseDown);
  }, [isHighlightMode]);

  useEffect(() => {
    const checkMemory = () => {
      if ((performance as any).memory) {
        const used = (performance as any).memory.usedJSHeapSize;
        if (used > 1073741824) { // 1GB
          setIsOverloaded(true);
        }
      }
    };
    const interval = setInterval(checkMemory, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (sessions.length === 0) {
      createSession();
    } else if (!currentSessionId && !selectedGroupId) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [sessions, currentSessionId, createSession, setCurrentSessionId, selectedGroupId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, isLoading]);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Only show if selection is inside a message content
        let isInsideMessage = false;
        let node: Node | null = selection.anchorNode;
        while (node) {
          if (node instanceof HTMLElement && node.classList.contains('message-content')) {
            isInsideMessage = true;
            break;
          }
          node = node.parentNode;
        }

        if (isInsideMessage) {
          setTextSelection({
            text: selection.toString(),
            position: {
              x: rect.left + rect.width / 2,
              y: rect.top
            }
          });
        } else {
          setTextSelection(null);
        }
      } else {
        setTextSelection(null);
      }
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('touchend', handleSelection);
    
    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('touchend', handleSelection);
    };
  }, []);

  const showError = (msg: string, type: 'success' | 'error' = 'success') => {
    setErrorToast(msg);
    setToastType(type);
    setTimeout(() => setErrorToast(null), 3000);
  };

  useEffect(() => {
    const handleShowError = (e: Event) => {
      const customEvent = e as CustomEvent<{msg: string, type: 'success' | 'error'}>;
      if (typeof customEvent.detail === 'string') {
        showError(customEvent.detail, 'error');
      } else {
        showError(customEvent.detail.msg, customEvent.detail.type);
      }
    };
    window.addEventListener('show-error', handleShowError);
    return () => window.removeEventListener('show-error', handleShowError);
  }, []);

  const scrollToMessage = (id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-[var(--border-strong)]');
      setTimeout(() => el.classList.remove('bg-[var(--border-strong)]'), 2000);
    }
    setIsPinnedMessagesOpen(false);
  };

  const processFiles = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.match(/^image\/(jpeg|png|webp|gif|bmp|svg\+xml)$/i));
    
    if (imageFiles.length === 0) return;

    setSelectedImages(prev => {
      const availableSlots = 10 - prev.length;
      if (availableSlots <= 0) {
        showError('Limite de 10 imagens por mensagem.');
        return prev;
      }

      const filesToProcess = imageFiles.slice(0, availableSlots);
      if (imageFiles.length > availableSlots) {
        showError(`Apenas ${availableSlots} imagem(ns) adicionada(s). Limite de 10 atingido.`);
      }

      filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 1000;
              const MAX_HEIGHT = 1000;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
              setSelectedImages(current => {
                if (current.length >= 10) return current;
                return [...current, { url: dataUrl, mimeType: 'image/jpeg' }];
              });
            };
            img.src = reader.result as string;
          }
        };
        reader.readAsDataURL(file);
      });

      return prev; // The actual update happens in the onloadend callback
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!e.dataTransfer.types.includes('Files')) {
      setIsDragging(false);
      return;
    }

    const hasImageFiles = Array.from(e.dataTransfer.items).some(
      item => item.kind === 'file' && item.type.match(/^image\/(jpeg|png|webp|gif|bmp|svg\+xml)$/i)
    );
    
    if (hasImageFiles) {
      setIsDragging(true);
    } else {
      setIsDragging(false);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    processFiles(files);
  };

  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);
  const [pullProgress, setPullProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchEndY(null);
    setTouchStart(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
    setPullProgress(0);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);

    if (scrollContainerRef.current && scrollContainerRef.current.scrollTop === 0 && touchStartY !== null) {
      const distanceY = e.targetTouches[0].clientY - touchStartY;
      if (distanceY > 0) {
        setPullProgress(Math.min(distanceY / 150, 1));
      }
    }
  };

  const onTouchEndHandler = () => {
    if (pullProgress > 0.8 && !isRefreshing) {
      setIsRefreshing(true);
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else {
      setPullProgress(0);
    }

    if (!touchStart || !touchEnd || !touchStartY || !touchEndY) return;
    const distanceX = touchStart - touchEnd;
    const distanceY = touchStartY - touchEndY;
    const isLeftSwipe = distanceX > 50;
    const isRightSwipe = distanceX < -50;
    
    // Only trigger if horizontal swipe is greater than vertical swipe
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      // Swipe right from the left edge to open sidebar
      if (isRightSwipe && touchStart < 60) {
        setIsSidebarOpen(true);
      }
      // Swipe left to close sidebar
      if (isLeftSwipe && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (overrideInput?: string, overrideImages?: {url: string, mimeType: string}[], overrideModel?: 'thinking' | 'fast' | 'search' | 'as') => {
    const textToSend = overrideInput !== undefined ? overrideInput : input.trim();
    const imagesToSend = overrideImages !== undefined ? overrideImages : selectedImages;
    const modelToUse = overrideModel !== undefined ? overrideModel : selectedModel;

    if (!textToSend && imagesToSend.length === 0) return;
    
    if (!auth.currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    if (selectedGroupId) {
      const groupId = selectedGroupId;
      
      if (overrideInput === undefined) setInput('');
      if (overrideImages === undefined) setSelectedImages([]);
      setTextareaHeight(60);
      
      const userMessage: Omit<GroupMessage, 'id'> = {
        senderId: auth.currentUser.uid,
        senderName: displayName || auth.currentUser.displayName || 'Usuário',
        senderPhotoURL: photoURL || auth.currentUser.photoURL || null,
        content: textToSend,
        imageUrls: imagesToSend.map(img => img.url),
        timestamp: Date.now()
      };
      
      try {
        await addDoc(collection(db, `groups/${groupId}/messages`), userMessage);
        await updateGroupStreak(groupId);
        
        setIsLoading(true);
        const group = groups.find(g => g.id === groupId);
        const customInstruction = group?.systemInstruction || settings.customInstruction;
        const history = groupMessages.map(m => ({
          role: m.senderId === 'ai' ? 'ai' : 'user' as 'ai' | 'user',
          content: m.content,
          imageUrls: m.imageUrls
        }));
        const aiResponse = await generateResponse(textToSend, imagesToSend, modelToUse, customInstruction, history);
        
        const aiMessage: Omit<GroupMessage, 'id'> = {
          senderId: 'ai',
          senderName: 'BROXA AI',
          senderPhotoURL: null,
          content: aiResponse,
          timestamp: Date.now()
        };
        
        await addDoc(collection(db, `groups/${groupId}/messages`), aiMessage);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `groups/${groupId}/messages`);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    updateStreak();
    
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = createSession();
    }

    const userMessageContent = textToSend;
    const userImageUrls = imagesToSend.map(img => img.url);

    const isFirstMessage = !currentSession || currentSession.messages.length === 0;

    addMessage(sessionId, {
      role: 'user',
      content: userMessageContent,
      imageUrls: userImageUrls.length > 0 ? userImageUrls : undefined,
    });

    if (isFirstMessage && userMessageContent) {
      generateTitle(userMessageContent).then(title => {
        updateSessionTitle(sessionId, title);
      }).catch(console.error);
    }

    const imagesToProcess = imagesToSend.length > 0 ? [...imagesToSend] : undefined;

    if (overrideInput === undefined) {
      setInput('');
      setSelectedImages([]);
    }
    setIsLoading(true);
    
    setTimeout(scrollToBottom, 100);

    try {
      if (modelToUse === 'search') {
        setIsSearching(true);
        
        const statuses = [
          'Analisando texto...',
          'Iniciando processo de reescrita anti-detecção...',
          'Ajustando vocabulário e estrutura de frases...',
          'Adicionando imperfeições humanas sutis...',
          'Conectando aos servidores do Gemini...',
          'Humanizando texto...',
          'Finalizando detalhes...'
        ];

        for (let i = 0; i < statuses.length; i++) {
          setSearchStatus(statuses[i]);
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }

      abortControllerRef.current = new AbortController();
      
      const aiMessageId = addMessage(sessionId, {
        role: 'ai',
        content: '',
        model: modelToUse,
      });

      let fullResponse = '';
      
      try {
        const stream = await generateResponseStream(
          userMessageContent, 
          imagesToProcess, 
          modelToUse, 
          settings.customInstruction,
          currentSession?.messages
        );

        for await (const chunk of stream) {
          if (abortControllerRef.current?.signal.aborted) {
            updateMessage(sessionId, aiMessageId, { content: fullResponse, isCancelled: true });
            break;
          }
          fullResponse += chunk;
          updateMessage(sessionId, aiMessageId, fullResponse);
        }
        
        if (!fullResponse && !abortControllerRef.current?.signal.aborted) {
          updateMessage(sessionId, aiMessageId, "Sem resposta.");
        }
      } catch (streamError: any) {
        if (abortControllerRef.current?.signal.aborted) {
           updateMessage(sessionId, aiMessageId, { content: fullResponse, isCancelled: true });
        } else {
           throw streamError;
        }
      } finally {
        abortControllerRef.current = null;
      }
    } catch (error: any) {
      console.error("Error generating response:", error);
      let errorMessage = "Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.";
      
      const errorString = error?.toString() || "";
      let errorJson = "";
      try {
        errorJson = JSON.stringify(error);
      } catch (e) {}
      
      const isQuotaError = 
        error?.status === 429 || 
        error?.error?.code === 429 ||
        error?.message?.includes("429") || 
        error?.message?.includes("quota") || 
        error?.status === "RESOURCE_EXHAUSTED" ||
        error?.error?.status === "RESOURCE_EXHAUSTED" ||
        errorString.includes("429") ||
        errorString.includes("quota") ||
        errorString.includes("RESOURCE_EXHAUSTED") ||
        errorJson.includes("429") ||
        errorJson.includes("quota") ||
        errorJson.includes("RESOURCE_EXHAUSTED");

      if (isQuotaError) {
        errorMessage = "O limite de uso da API foi excedido (Erro 429). Por favor, verifique sua cota no Google AI Studio ou tente novamente mais tarde.";
      } else if (errorString.includes("A chave da API do Gemini não está configurada") || error?.message?.includes("A chave da API")) {
        errorMessage = "A chave da API do Gemini não está configurada. Para que o site funcione na Netlify, você precisa adicionar a variável de ambiente `GEMINI_API_KEY` nas configurações do seu projeto na Netlify.";
      } else if (errorString.includes("leaked") || errorJson.includes("leaked")) {
        errorMessage = "⚠️ **Sua Chave da API foi bloqueada pelo Google.** O Google detectou que a sua chave vazou (provavelmente foi enviada para o GitHub ou outro local público) e a desativou por segurança. Você precisa ir no Google AI Studio, gerar uma **nova chave**, e atualizar a variável `GEMINI_API_KEY` na Netlify.";
      } else {
        errorMessage = `Desculpe, ocorreu um erro ao processar sua solicitação. Detalhes do erro: ${errorString}`;
      }

      addMessage(sessionId, {
        role: 'ai',
        content: errorMessage,
        isError: true,
        errorMessage: errorString,
        model: modelToUse,
      });
    } finally {
      setIsLoading(false);
      setIsSearching(false);
      setSearchStatus(null);
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderSession = (session: any) => (
    <motion.div 
      layout="position"
      key={session.id}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: -20, height: 0, paddingBottom: 0, paddingTop: 0, margin: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => {
        setCurrentSessionId(session.id);
        setSelectedGroupId(null);
        if (window.innerWidth < 768) setIsSidebarOpen(false);
      }}
      className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-colors overflow-hidden ${currentSessionId === session.id ? 'bg-[var(--bg-surface)] text-[var(--text-base)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-base)]'}`}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <MessageSquare className="w-4 h-4 shrink-0" />
        <TypingTitle text={session.title} />
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => { e.stopPropagation(); togglePinSession(session.id); }}
          className={`p-1 transition-colors ${session.isPinned ? 'text-[var(--color-sec)]' : 'hover:text-[var(--text-base)]'}`}
        >
          <Pin className="w-4 h-4" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); setSessionToDelete(session.id); }}
          className="p-1 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );

  return (
    <div 
      className="flex h-[100dvh] bg-[var(--bg-base)] text-[var(--text-base)] font-sans overflow-hidden relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEndHandler}
    >
      {settings.backgroundImage && (
        <div 
          className="absolute inset-0 z-0 opacity-30 blur-sm pointer-events-none bg-cover bg-center bg-no-repeat mix-blend-overlay"
          style={{ backgroundImage: `url(${settings.backgroundImage})` }}
        />
      )}
      <div className="flex w-full h-full relative z-10">
        <AnimatePresence>
          {textSelection && (
            <TextSelectionToolbar 
              position={textSelection.position}
              isSearchModel={selectedModel === 'search'}
              onCopy={() => {
                navigator.clipboard.writeText(textSelection.text);
                setTextSelection(null);
                showError('Texto copiado!');
              }}
              onPin={() => {
                if (currentSessionId) {
                  addPinnedText(currentSessionId, textSelection.text);
                  setTextSelection(null);
                  showError('Texto fixado!');
                }
              }}
              onExplain={() => {
                setInput(`Explique isso: "${textSelection.text}"`);
                setTextSelection(null);
                textareaRef.current?.focus();
              }}
              onSearch={() => {
                window.open(`https://www.google.com/search?q=${encodeURIComponent(textSelection.text)}`, '_blank');
                setTextSelection(null);
              }}
              onCompare={() => {
                setInput(`Compare os resultados para: "${textSelection.text}"`);
                setTextSelection(null);
                textareaRef.current?.focus();
              }}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {errorToast && (
            <motion.div 
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              onClick={() => setErrorToast(null)}
              className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] ${toastType === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 cursor-pointer group`}
            >
              {toastType === 'success' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              {errorToast}
              <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-full p-1">
                <X className="w-4 h-4" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      <AnimatePresence>
        {isOverloaded && (
          <motion.div className="absolute inset-0 z-[200] bg-black flex flex-col items-center justify-center p-8 text-center">
            <AlertTriangle className="w-20 h-20 text-red-500 mb-6 animate-pulse" />
            <h2 className="text-2xl font-bold text-white mb-4">Este sistema evita travamentos no site, inicie uma nova conversa ou tente novamente mais tarde</h2>
            <p className="text-red-400 text-xl">Ah não, sua conversa sobrecarregou</p>
            <button onClick={() => window.location.reload()} className="mt-8 px-6 py-3 bg-white text-black rounded-xl font-bold">Recarregar Página</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rateLimitWarning && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-red-600/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 cursor-pointer hover:bg-red-700 transition-all border border-red-500/50"
            onClick={() => setRateLimitWarning(null)}
          >
            <AlertTriangle className="w-5 h-5" />
            <span className="font-bold text-sm tracking-wide">{rateLimitWarning}</span>
            <X className="w-4 h-4 ml-2 opacity-70" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sessionToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[var(--bg-panel)] rounded-3xl border border-[var(--border-strong)] w-full max-w-sm shadow-2xl flex flex-col overflow-hidden p-6"
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Apagar Conversa</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Tem certeza? Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setSessionToDelete(null)} 
                  className="flex-1 py-3 bg-[var(--bg-surface)] hover:bg-[var(--border-strong)] text-[var(--text-base)] rounded-xl font-medium transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    deleteSession(sessionToDelete);
                    setSessionToDelete(null);
                  }} 
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors text-sm"
                >
                  Apagar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showASWarning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[var(--bg-panel)] rounded-3xl border border-[var(--border-strong)] w-full max-w-sm shadow-2xl flex flex-col overflow-hidden p-6"
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Aviso Importante</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  A versão <strong className="text-[var(--text-base)]">{aiModels?.find(m => m.key === 'as')?.name || 'A.S 0.5'}</strong> está em desenvolvimento. Você pode encontrar instabilidades ou respostas inesperadas.
                </p>
              </div>
              <button 
                onClick={() => setShowASWarning(false)} 
                className="w-full py-3 bg-[var(--text-base)] hover:opacity-90 text-[var(--bg-base)] rounded-xl font-medium transition-colors text-sm"
              >
                Entendi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdminPanelOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-[var(--bg-panel)] rounded-3xl border border-[var(--border-strong)] w-full max-w-6xl m-4 shadow-2xl flex flex-col max-h-[90vh] relative overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-[var(--border-subtle)] shrink-0">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-6 h-6 text-[var(--color-sec)]" />
                  <h3 className="text-xl font-bold text-[var(--text-base)]">Painel de Administrador</h3>
                </div>
                <button 
                  onClick={() => setIsAdminPanelOpen(false)}
                  className="p-2 hover:bg-[var(--bg-surface)] rounded-full transition-colors text-[var(--text-muted)] hover:text-[var(--text-base)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex border-b border-[var(--border-subtle)] px-6 pt-4 gap-4 shrink-0">
                <button
                  onClick={() => setAdminTab('releaseNotes')}
                  className={`pb-3 px-2 font-medium transition-colors border-b-2 ${adminTab === 'releaseNotes' ? 'border-[var(--color-sec)] text-[var(--color-sec)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-base)]'}`}
                >
                  Release Notes
                </button>
                <button
                  onClick={() => setAdminTab('feedbacks')}
                  className={`pb-3 px-2 font-medium transition-colors border-b-2 ${adminTab === 'feedbacks' ? 'border-[var(--color-sec)] text-[var(--color-sec)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-base)]'}`}
                >
                  Feedbacks
                </button>
                <button
                  onClick={() => setAdminTab('models')}
                  className={`pb-3 px-2 font-medium transition-colors border-b-2 ${adminTab === 'models' ? 'border-[var(--color-sec)] text-[var(--color-sec)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-base)]'}`}
                >
                  Modelos IA
                </button>
                <button
                  onClick={() => setAdminTab('users')}
                  className={`pb-3 px-2 font-medium transition-colors border-b-2 ${adminTab === 'users' ? 'border-[var(--color-sec)] text-[var(--color-sec)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-base)]'}`}
                >
                  Usuários (Foguinho)
                </button>
                <button
                  onClick={() => setAdminTab('groups')}
                  className={`pb-3 px-2 font-medium transition-colors border-b-2 ${adminTab === 'groups' ? 'border-[var(--color-sec)] text-[var(--color-sec)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-base)]'}`}
                >
                  Grupos
                </button>
              </div>

              <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                {adminTab === 'releaseNotes' && (
                  <>
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar border-r border-[var(--border-subtle)]">
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-lg font-semibold text-[var(--text-base)] mb-4">Lançar Nova Atualização (Release Notes)</h4>
                      <p className="text-sm text-[var(--text-muted)] mb-4">
                        Crie uma nota de atualização. Ela aparecerá uma vez para cada usuário.
                      </p>
                      
                      <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Versão</label>
                          <input 
                            type="text" 
                            value={newReleaseNote.version}
                            onChange={(e) => setNewReleaseNote({...newReleaseNote, version: e.target.value})}
                            placeholder="Ex: v1.2.0"
                            className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl p-3 focus:outline-none focus:border-[var(--color-sec)]"
                          />
                        </div>
                        <div className="flex-[2]">
                          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Título</label>
                          <input 
                            type="text" 
                            value={newReleaseNote.title}
                            onChange={(e) => setNewReleaseNote({...newReleaseNote, title: e.target.value})}
                            placeholder="Ex: Nova Busca Inteligente"
                            className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl p-3 focus:outline-none focus:border-[var(--color-sec)]"
                          />
                        </div>
                      </div>

                      <div>
                        <ImageUpload 
                          value={newReleaseNote.imageUrl || ''} 
                          onChange={(val) => setNewReleaseNote({...newReleaseNote, imageUrl: val})} 
                          label="Imagem de Apresentação (Opcional)" 
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Descrição Curta</label>
                        <textarea 
                          value={newReleaseNote.description}
                          onChange={(e) => setNewReleaseNote({...newReleaseNote, description: e.target.value})}
                          placeholder="Descreva o que há de novo nesta atualização..."
                          className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl p-3 min-h-[80px] resize-y focus:outline-none focus:border-[var(--color-sec)]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Mudanças (uma por linha)</label>
                        <textarea 
                          value={newReleaseNote.changes}
                          onChange={(e) => setNewReleaseNote({...newReleaseNote, changes: e.target.value})}
                          placeholder="- Adicionado novo recurso X&#10;- Corrigido bug Y&#10;- Melhoria de performance Z"
                          className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl p-3 min-h-[120px] resize-y focus:outline-none focus:border-[var(--color-sec)]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] mb-1">
                            <input 
                              type="checkbox" 
                              checked={newReleaseNote.titleRgb}
                              onChange={(e) => setNewReleaseNote({...newReleaseNote, titleRgb: e.target.checked})}
                              className="rounded border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--color-sec)] focus:ring-[var(--color-sec)]"
                            />
                            Título com Efeito RGB
                          </label>
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] mb-1">
                            <input 
                              type="checkbox" 
                              checked={newReleaseNote.buttonRgb}
                              onChange={(e) => setNewReleaseNote({...newReleaseNote, buttonRgb: e.target.checked})}
                              className="rounded border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--color-sec)] focus:ring-[var(--color-sec)]"
                            />
                            Botão com Efeito RGB
                          </label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Cor da Borda (Ex: #ff0000)</label>
                          <input 
                            type="text" 
                            value={newReleaseNote.outlineColor}
                            onChange={(e) => setNewReleaseNote({...newReleaseNote, outlineColor: e.target.value})}
                            placeholder="#..."
                            className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl p-3 focus:outline-none focus:border-[var(--color-sec)]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Cor de Fundo (Ex: #1a1a1a)</label>
                          <input 
                            type="text" 
                            value={newReleaseNote.backgroundColor}
                            onChange={(e) => setNewReleaseNote({...newReleaseNote, backgroundColor: e.target.value})}
                            placeholder="#..."
                            className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl p-3 focus:outline-none focus:border-[var(--color-sec)]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Texto do Botão</label>
                          <input 
                            type="text" 
                            value={newReleaseNote.buttonText}
                            onChange={(e) => setNewReleaseNote({...newReleaseNote, buttonText: e.target.value})}
                            placeholder="Entendi!"
                            className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl p-3 focus:outline-none focus:border-[var(--color-sec)]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Cor do Botão (Ex: #00ff00)</label>
                          <input 
                            type="text" 
                            value={newReleaseNote.buttonColor}
                            onChange={(e) => setNewReleaseNote({...newReleaseNote, buttonColor: e.target.value})}
                            placeholder="#..."
                            className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl p-3 focus:outline-none focus:border-[var(--color-sec)]"
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[var(--border-subtle)]">
                        <h5 className="text-sm font-semibold text-[var(--text-base)] mb-3">Elementos Visuais</h5>
                        <div className="flex gap-2 mb-4">
                          <button
                            onClick={() => setShowImagePrompt(true)}
                            className="px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg text-sm hover:bg-[var(--border-subtle)] transition-colors flex items-center gap-2"
                          >
                            <ImageIcon className="w-4 h-4" /> Adicionar Imagem
                          </button>
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                setNewReleaseNote({
                                  ...newReleaseNote,
                                  badges: [...newReleaseNote.badges, { id: uuidv4(), type: e.target.value as any, x: 0, y: 0, scale: 1 }]
                                });
                                e.target.value = '';
                              }
                            }}
                            className="px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg text-sm hover:bg-[var(--border-subtle)] transition-colors focus:outline-none"
                          >
                            <option value="">+ Adicionar Badge</option>
                            <option value="BETA">BETA</option>
                            <option value="EM DESENVOLVIMENTO">EM DESENVOLVIMENTO</option>
                            <option value="NOVO">NOVO</option>
                            <option value="REMOVIDO">REMOVIDO</option>
                            <option value="EM BREVE">EM BREVE</option>
                          </select>
                        </div>
                        
                        {showImagePrompt && (
                          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-3xl">
                            <div className="bg-[var(--bg-base)] p-6 rounded-xl border border-[var(--border-strong)] shadow-xl w-full max-w-sm">
                              <h4 className="text-lg font-bold mb-4">Adicionar Imagem</h4>
                              <div className="mb-4">
                                <ImageUpload
                                  value={tempImageUrl}
                                  onChange={setTempImageUrl}
                                  label="Selecionar Imagem"
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setShowImagePrompt(false);
                                    setTempImageUrl('');
                                  }}
                                  className="px-4 py-2 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => {
                                    if (tempImageUrl) {
                                      setNewReleaseNote({
                                        ...newReleaseNote,
                                        images: [...newReleaseNote.images, { id: uuidv4(), url: tempImageUrl, x: 0, y: 0, scale: 1, rotation: 0 }]
                                      });
                                      setTempImageUrl('');
                                      setShowImagePrompt(false);
                                    }
                                  }}
                                  className="px-4 py-2 bg-[var(--color-sec)] text-white rounded-lg hover:opacity-90 transition-opacity"
                                >
                                  Adicionar
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      </div>
                      
                      <button 
                        onClick={handleSaveReleaseNote}
                        disabled={!newReleaseNote.version || !newReleaseNote.title}
                        className="w-full py-3 bg-[var(--color-sec)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                      >
                        Lançar Atualização
                      </button>
                    </div>
                  </div>

                  {releaseNotes.length > 0 && (
                    <div className="pt-6 border-t border-[var(--border-subtle)]">
                      <h4 className="text-lg font-semibold text-[var(--text-base)] mb-4">Histórico de Lançamentos</h4>
                      <div className="space-y-3">
                        {releaseNotes.map(note => (
                          <div key={note.id} className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex justify-between items-center">
                            <div>
                              <div className="font-bold text-[var(--text-base)]">{note.version} - {note.title}</div>
                              <div className="text-xs text-[var(--text-muted)]">{new Date(note.date).toLocaleDateString()}</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handleEditReleaseNote(note)}
                                className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setNoteToDelete(note.id)}
                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Live Preview Column */}
                <div className="flex-1 p-6 bg-[var(--bg-base)] overflow-y-auto custom-scrollbar flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
                  
                  <div className="w-full max-w-lg">
                    <h4 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4 text-center">Preview em Tempo Real</h4>
                    
                    <div 
                      style={{
                        backgroundColor: newReleaseNote.backgroundColor || 'var(--bg-panel)',
                        borderColor: newReleaseNote.outlineColor || 'var(--border-strong)'
                      }}
                      className="rounded-3xl border shadow-2xl flex flex-col overflow-hidden relative"
                    >
                      {newReleaseNote.imageUrl && (
                        <div className="w-full h-32 bg-[var(--bg-surface)] relative">
                          <img 
                            src={newReleaseNote.imageUrl} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div 
                            className="absolute inset-0 bg-gradient-to-t to-transparent" 
                            style={{
                              backgroundImage: `linear-gradient(to top, ${newReleaseNote.backgroundColor || 'var(--bg-panel)'}, transparent)`
                            }}
                          />
                        </div>
                      )}
                      
                      <div className="p-5 overflow-y-auto custom-scrollbar relative min-h-[400px]">
                        {newReleaseNote.images?.map(img => (
                          <Rnd
                            key={img.id}
                            position={{ x: img.x, y: img.y }}
                            size={{ width: 100 * img.scale, height: 'auto' }}
                            bounds="parent"
                            onDragStop={(e, d) => {
                              setNewReleaseNote({
                                ...newReleaseNote,
                                images: newReleaseNote.images.map(i => i.id === img.id ? { ...i, x: d.x, y: d.y } : i)
                              });
                            }}
                            onResizeStop={(e, direction, ref, delta, position) => {
                              setNewReleaseNote({
                                ...newReleaseNote,
                                images: newReleaseNote.images.map(i => i.id === img.id ? { 
                                  ...i, 
                                  x: position.x, 
                                  y: position.y,
                                  scale: parseFloat(ref.style.width) / 100
                                } : i)
                              });
                            }}
                            style={{ zIndex: 10 }}
                          >
                            <div className="relative group w-full h-full">
                              <img src={img.url} alt="" className="w-full h-full object-contain pointer-events-none" style={{ transform: `rotate(${img.rotation}deg)` }} />
                              <button
                                onClick={() => setNewReleaseNote({
                                  ...newReleaseNote,
                                  images: newReleaseNote.images.filter(i => i.id !== img.id)
                                })}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-50"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </Rnd>
                        ))}
                        
                        {newReleaseNote.badges?.map(badge => (
                          <Rnd
                            key={badge.id}
                            position={{ x: badge.x, y: badge.y }}
                            bounds="parent"
                            onDragStop={(e, d) => {
                              setNewReleaseNote({
                                ...newReleaseNote,
                                badges: newReleaseNote.badges.map(b => b.id === badge.id ? { ...b, x: d.x, y: d.y } : b)
                              });
                            }}
                            style={{ zIndex: 10 }}
                          >
                            <div className="relative group">
                              <span className={`px-2 py-1 text-[10px] font-bold rounded-full pointer-events-none ${
                                badge.type === 'BETA' ? 'bg-purple-500/20 text-purple-500' :
                                badge.type === 'EM DESENVOLVIMENTO' ? 'bg-yellow-500/20 text-yellow-500' :
                                badge.type === 'NOVO' ? 'bg-green-500/20 text-green-500' :
                                badge.type === 'REMOVIDO' ? 'bg-red-500/20 text-red-500' :
                                'bg-blue-500/20 text-blue-500'
                              }`} style={{ transform: `scale(${badge.scale})`, display: 'inline-block' }}>
                                {badge.type}
                              </span>
                              <button
                                onClick={() => setNewReleaseNote({
                                  ...newReleaseNote,
                                  badges: newReleaseNote.badges.filter(b => b.id !== badge.id)
                                })}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-50"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </Rnd>
                        ))}

                        <div className="inline-block px-2 py-1 bg-[var(--color-sec)]/20 text-[var(--color-sec)] text-[10px] font-bold rounded-full mb-2 relative z-20">
                          NOVA VERSÃO {newReleaseNote.version || 'v1.0.0'}
                        </div>
                        
                        <h2 className={`text-xl font-bold text-[var(--text-base)] mb-2 relative z-20 ${newReleaseNote.titleRgb ? 'animate-rgb-text' : ''}`}>
                          {newReleaseNote.title || 'Título da Atualização'}
                        </h2>
                        
                        {newReleaseNote.description && (
                          <p className="text-[var(--text-muted)] text-sm mb-4 leading-relaxed relative z-20">
                            {newReleaseNote.description}
                          </p>
                        )}
                        
                        {newReleaseNote.changes && newReleaseNote.changes.trim() !== '' && (
                          <div className="space-y-2 mb-4 relative z-20">
                            <h3 className="text-xs font-bold text-[var(--text-base)] uppercase tracking-wider">O que mudou:</h3>
                            <ul className="space-y-1">
                              {newReleaseNote.changes.split('\n').filter(c => c.trim() !== '').map((change, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-base)]">
                                  <div className="w-1 h-1 rounded-full bg-[var(--color-sec)] mt-1.5 shrink-0" />
                                  <span className="leading-relaxed">{change}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <button 
                          style={{
                            backgroundColor: newReleaseNote.buttonColor || 'var(--color-sec)'
                          }}
                          className={`w-full py-2.5 hover:opacity-90 text-white rounded-xl text-sm font-bold transition-colors shadow-lg relative z-20 ${newReleaseNote.buttonRgb ? 'animate-rgb-bg' : ''}`}
                        >
                          {newReleaseNote.buttonText || 'Continuar para o App'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                </>
                )}

                {adminTab === 'feedbacks' && (
                  <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                    <h4 className="text-lg font-semibold text-[var(--text-base)] mb-4">Feedbacks dos Usuários</h4>
                    <div className="space-y-4">
                      {feedbacks?.length === 0 ? (
                        <p className="text-[var(--text-muted)]">Nenhum feedback recebido ainda.</p>
                      ) : (
                        feedbacks?.map(feedback => (
                          <div key={feedback.id} className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                {feedback.isPositive ? (
                                  <div className="p-1.5 bg-green-500/20 text-green-500 rounded-lg">
                                    <ThumbsUp className="w-4 h-4" />
                                  </div>
                                ) : (
                                  <div className="p-1.5 bg-red-500/20 text-red-500 rounded-lg">
                                    <ThumbsDown className="w-4 h-4" />
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-[var(--text-base)]">{feedback.userEmail}</div>
                                  <div className="text-xs text-[var(--text-muted)]">{new Date(feedback.date).toLocaleString()}</div>
                                </div>
                              </div>
                              <div className="text-xs font-medium px-2 py-1 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-subtle)]">
                                Modelo: {aiModels?.find(m => m.key === feedback.model)?.name || feedback.model}
                              </div>
                            </div>
                            
                            <div className="bg-[var(--bg-panel)] p-3 rounded-lg border border-[var(--border-subtle)]">
                              <div className="text-xs text-[var(--text-muted)] mb-1 font-bold">Comentário do Usuário:</div>
                              <p className="text-sm text-[var(--text-base)]">{feedback.comment}</p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                              <div className="bg-[var(--bg-panel)] p-3 rounded-lg border border-[var(--border-subtle)]">
                                <div className="text-xs text-[var(--text-muted)] mb-1 font-bold">Prompt:</div>
                                <p className="text-xs text-[var(--text-base)] line-clamp-3" title={feedback.prompt}>{feedback.prompt}</p>
                              </div>
                              <div className="bg-[var(--bg-panel)] p-3 rounded-lg border border-[var(--border-subtle)]">
                                <div className="text-xs text-[var(--text-muted)] mb-1 font-bold">Resposta da IA:</div>
                                <p className="text-xs text-[var(--text-base)] line-clamp-3" title={feedback.response}>{feedback.response}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {adminTab === 'models' && (
                  <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                    <h4 className="text-lg font-semibold text-[var(--text-base)] mb-4">Gerenciar Modelos de IA</h4>
                    <div className="space-y-4">
                      {[...(aiModels || [])].sort((a, b) => {
                        const order = ['thinking', 'fast', 'as', 'search'];
                        const indexA = order.indexOf(a.key);
                        const indexB = order.indexOf(b.key);
                        const aVal = indexA === -1 ? 999 : indexA;
                        const bVal = indexB === -1 ? 999 : indexB;
                        return aVal - bVal;
                      }).map(model => (
                        <div key={model.id} className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col gap-3">
                          <div className="flex justify-between items-center">
                            <div className="font-bold text-[var(--text-base)]">{model.key}</div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Nome de Exibição</label>
                              <input 
                                type="text" 
                                value={model.name}
                                onChange={(e) => updateAiModel(model.id, { name: e.target.value })}
                                className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)]"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Badge</label>
                              <select
                                value={model.badgeType || 'NENHUMA'}
                                onChange={(e) => updateAiModel(model.id, { badgeType: e.target.value as any })}
                                className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)]"
                              >
                                <option value="NENHUMA">Nenhuma</option>
                                <option value="BETA">BETA</option>
                                <option value="EM DESENVOLVIMENTO">EM DESENVOLVIMENTO</option>
                                <option value="NOVO">NOVO</option>
                                <option value="REMOVIDO">REMOVIDO</option>
                                <option value="EM BREVE">EM BREVE</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {adminTab === 'users' && (
                  <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-[var(--text-base)]">Gerenciar Usuários</h4>
                      <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                          type="text"
                          placeholder="Buscar usuários..."
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-[var(--color-sec)]"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      {users.filter(user => 
                        (user.email || '').toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                        (user.id || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                        (user.displayName || '').toLowerCase().includes(userSearchTerm.toLowerCase())
                      ).map(user => (
                        <div key={user.id} className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col gap-3">
                          <div className="flex justify-between items-center">
                            <div className="font-bold text-[var(--text-base)]">{user.displayName || user.email || user.id}</div>
                            <div className="text-sm text-[var(--text-muted)]">{user.email}</div>
                          </div>
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex-1 min-w-[120px]">
                              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Cargo</label>
                              <select
                                value={user.role || 'user'}
                                onChange={(e) => updateUserRole(user.id, e.target.value as any)}
                                className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)]"
                              >
                                <option value="user">Usuário</option>
                                <option value="developer">Desenvolvedor</option>
                                <option value="admin">Administrador</option>
                              </select>
                            </div>
                            <div className="flex-1 min-w-[120px]">
                              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Dias de Foguinho</label>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number" 
                                  min="0"
                                  value={user.streakDays || 0}
                                  onChange={(e) => updateUserStreak(user.id, parseInt(e.target.value) || 0)}
                                  className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)]"
                                />
                                <Flame className={`w-5 h-5 ${(user.streakDays || 0) > 0 ? 'text-orange-500 fill-orange-500' : 'text-gray-400'}`} />
                              </div>
                            </div>
                            <div className="flex-1 min-w-[120px]">
                              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Última Mensagem</label>
                              <div className="text-sm text-[var(--text-base)] px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-lg">
                                {user.lastMessageDate || 'Nunca'}
                              </div>
                            </div>
                            <div className="flex-1 min-w-[120px]">
                              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Congelamentos</label>
                              <div className="text-sm text-[var(--text-base)] px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-lg">
                                {user.freezesAvailable ?? 2}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {adminTab === 'groups' && (
                  <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-[var(--text-base)]">Gerenciar Grupos</h4>
                      <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                          type="text"
                          placeholder="Buscar grupo..."
                          value={groupSearchTerm}
                          onChange={(e) => setGroupSearchTerm(e.target.value)}
                          className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-[var(--color-sec)]"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      {allGroups?.filter(group => 
                        (group.name || '').toLowerCase().includes(groupSearchTerm.toLowerCase()) ||
                        (group.id || '').toLowerCase().includes(groupSearchTerm.toLowerCase())
                      ).map(group => (
                        <div key={group.id} className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col gap-3">
                          <div className="flex justify-between items-center">
                            <div className="font-bold text-[var(--text-base)]">{group.name || 'Sem Nome'}</div>
                            <div className="text-xs text-[var(--text-muted)]">ID: {group.id}</div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Dias de Foguinho</label>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number" 
                                  min="0"
                                  value={group.streakDays || 0}
                                  onChange={(e) => updateAdminGroupStreak(group.id, parseInt(e.target.value) || 0)}
                                  className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)]"
                                />
                                <Flame className={`w-5 h-5 ${(group.streakDays || 0) > 0 ? 'text-orange-500 fill-orange-500' : 'text-gray-400'}`} />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Membros</label>
                              <div className="text-sm text-[var(--text-base)] px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-lg">
                                {group.members?.length || 0} membros
                              </div>
                            </div>
                            <div className="flex items-end">
                              <button
                                onClick={() => {
                                  if (window.confirm('Tem certeza que deseja deletar este grupo? Esta ação não pode ser desfeita.')) {
                                    deleteAdminGroup(group.id);
                                  }
                                }}
                                className="w-full bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-lg px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Deletar Grupo
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {currentReleaseNote && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ 
                scaleY: [1, 0.02, 0.02],
                scaleX: [1, 1, 0],
                opacity: [1, 1, 0],
                transition: { duration: 0.6, times: [0, 0.5, 1], ease: "easeInOut" }
              }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                backgroundColor: currentReleaseNote.backgroundColor || 'var(--bg-panel)',
                borderColor: currentReleaseNote.outlineColor || 'var(--border-strong)'
              }}
              className="rounded-3xl border w-full max-w-lg shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
            >
              {currentReleaseNote.imageUrl && (
                <div className="w-full h-48 bg-[var(--bg-surface)] relative">
                  <img 
                    src={currentReleaseNote.imageUrl} 
                    alt="Release Note" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div 
                    className="absolute inset-0 bg-gradient-to-t to-transparent" 
                    style={{
                      backgroundImage: `linear-gradient(to top, ${currentReleaseNote.backgroundColor || 'var(--bg-panel)'}, transparent)`
                    }}
                  />
                </div>
              )}
              
              <div className="p-6 overflow-y-auto custom-scrollbar relative">
                {currentReleaseNote.images?.map(img => (
                  <img
                    key={img.id}
                    src={img.url}
                    alt=""
                    className="absolute pointer-events-none"
                    style={{
                      left: img.x,
                      top: img.y,
                      width: `${img.scale * 100}px`,
                      transform: `rotate(${img.rotation}deg)`,
                      zIndex: 10
                    }}
                  />
                ))}
                
                {currentReleaseNote.badges?.map(badge => (
                  <span
                    key={badge.id}
                    className={`absolute px-2 py-1 text-xs font-bold rounded-full pointer-events-none ${
                      badge.type === 'BETA' ? 'bg-purple-500/20 text-purple-500' :
                      badge.type === 'EM DESENVOLVIMENTO' ? 'bg-yellow-500/20 text-yellow-500' :
                      badge.type === 'NOVO' ? 'bg-green-500/20 text-green-500' :
                      badge.type === 'REMOVIDO' ? 'bg-red-500/20 text-red-500' :
                      'bg-blue-500/20 text-blue-500'
                    }`}
                    style={{
                      left: badge.x,
                      top: badge.y,
                      transform: `scale(${badge.scale})`,
                      zIndex: 10
                    }}
                  >
                    {badge.type}
                  </span>
                ))}

                <div className="inline-block px-3 py-1 bg-[var(--color-sec)]/20 text-[var(--color-sec)] text-xs font-bold rounded-full mb-3 relative z-20">
                  NOVA VERSÃO {currentReleaseNote.version}
                </div>
                
                <h2 className={`text-2xl font-bold text-[var(--text-base)] mb-2 relative z-20 ${currentReleaseNote.titleRgb ? 'animate-rgb-text' : ''}`}>
                  {currentReleaseNote.title}
                </h2>
                
                {currentReleaseNote.description && (
                  <p className="text-[var(--text-muted)] mb-6 leading-relaxed relative z-20">
                    {currentReleaseNote.description}
                  </p>
                )}
                
                {currentReleaseNote.changes && currentReleaseNote.changes.length > 0 && (
                  <div className="space-y-3 mb-6 relative z-20">
                    <h3 className="text-sm font-bold text-[var(--text-base)] uppercase tracking-wider">O que mudou:</h3>
                    <ul className="space-y-2">
                      {currentReleaseNote.changes.map((change, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-base)]">
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-sec)] mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <button 
                  onClick={closeReleaseNote}
                  style={{
                    backgroundColor: currentReleaseNote.buttonColor || 'var(--color-sec)'
                  }}
                  className={`w-full py-3 hover:opacity-90 text-white rounded-xl font-bold transition-colors shadow-lg relative z-20 ${currentReleaseNote.buttonRgb ? 'animate-rgb-bg' : ''}`}
                >
                  {currentReleaseNote.buttonText || 'Continuar para o App'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      <AnimatePresence>
        {noteToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h2 className="text-xl font-bold mb-4">Excluir Release Note</h2>
              <p className="text-[var(--text-muted)] mb-6">
                Tem certeza que deseja excluir esta release note? Esta ação não pode ser desfeita.
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setNoteToDelete(null)}
                  className="px-4 py-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-colors"
                >
                  Cancelar
                </button>
                <HoldButton 
                  onConfirm={() => {
                    deleteReleaseNote(noteToDelete);
                    setNoteToDelete(null);
                  }}
                  onCancel={() => showError('Ação cancelada. Segure para confirmar.')}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
                >
                  Excluir (Segure)
                </HoldButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLogoutModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h2 className="text-xl font-bold mb-4">Sair da conta</h2>
              <p className="text-[var(--text-muted)] mb-6">
                Tem certeza que deseja sair da sua conta? Você precisará fazer login novamente para acessar seus chats.
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-colors"
                >
                  Cancelar
                </button>
                <HoldButton 
                  onConfirm={() => {
                    setSelectedGroupId(null);
                    logOut();
                    setIsLogoutModalOpen(false);
                  }}
                  onCancel={() => showError('Ação cancelada. Segure para confirmar.')}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
                >
                  Sair (Segure)
                </HoldButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isStreakModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-3xl p-6 max-w-md w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setIsStreakModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--bg-surface)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-base)]"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center mb-8 mt-4">
                <div className="relative mb-4">
                  <Flame className={`w-20 h-20 ${streakDays > 0 ? 'text-orange-500 fill-orange-500' : 'text-gray-400'}`} />
                  <div className="absolute -bottom-2 -right-2 bg-[var(--bg-base)] rounded-full p-1 border border-[var(--border-strong)]" title={`${freezesAvailable} congelamentos disponíveis`}>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-500">
                      <Snowflake className="w-4 h-4" />
                      <span className="text-xs font-bold ml-1">{freezesAvailable}</span>
                    </div>
                  </div>
                </div>
                <h2 className="text-3xl font-black text-[var(--text-base)] mb-2">
                  {streakDays} {streakDays === 1 ? 'dia' : 'dias'}
                </h2>
                <p className="text-[var(--text-muted)]">
                  {streakDays > 0 
                    ? (lastMessageDate === new Date().toISOString().slice(0, 10) 
                        ? 'Você já mandou mensagem hoje! Volte amanhã para manter sua sequência.' 
                        : 'Mande uma mensagem hoje para manter sua sequência!')
                    : 'Mande mensagens todos os dias para construir sua sequência e desbloquear recursos!'}
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Recompensas</h3>
                
                <div className="space-y-2">
                  {[
                    { days: 3, name: 'Cor de Seleção' },
                    { days: 10, name: 'Fonte do Título' },
                    { days: 15, name: 'Imagem de Fundo' },
                    { days: 20, name: 'Comportamento da IA' }
                  ].map(feature => (
                    <div 
                      key={feature.days}
                      className={`flex items-center justify-between p-3 rounded-xl border ${streakDays >= feature.days ? 'bg-orange-500/10 border-orange-500/30' : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] opacity-70'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${streakDays >= feature.days ? 'bg-orange-500 text-white' : 'bg-[var(--bg-base)] text-[var(--text-muted)]'}`}>
                          {streakDays >= feature.days ? <Check className="w-4 h-4" /> : <Flame className="w-4 h-4" />}
                        </div>
                        <span className={`font-medium ${streakDays >= feature.days ? 'text-orange-500' : 'text-[var(--text-base)]'}`}>
                          {feature.name}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-[var(--text-muted)]">
                        {feature.days} dias
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-[var(--bg-panel)] rounded-3xl border border-[var(--border-strong)] w-full max-w-md m-4 shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center p-6 border-b border-[var(--border-subtle)] shrink-0">
                <h3 className="text-xl font-bold text-[var(--text-base)]">Configurações</h3>
                <button onClick={handleCloseSettings} className="p-2 hover:bg-[var(--bg-surface)] rounded-full transition-colors"><X className="w-5 h-5 text-[var(--text-muted)]" /></button>
              </div>
              
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                <div className={`flex flex-col gap-2 ${streakDays < 10 ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-base)] font-medium">Fonte do Título (BROXA AI)</span>
                    {streakDays < 10 && <span className="text-xs text-orange-500 flex items-center gap-1 font-bold"><Flame className="w-3 h-3" /> 10 dias</span>}
                  </div>
                  <select
                    value={tempSettings.customTitleFont || 'BROXA AI'}
                    onChange={e => setTempSettings({ ...tempSettings, customTitleFont: e.target.value })}
                    className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl p-3 focus:outline-none focus:border-[var(--color-sec)]"
                  >
                    <option value="BROXA AI">Normal (BROXA AI)</option>
                    <option value="𝕭𝕽𝕺𝖃𝕬 𝕬𝕴">Gótico (𝕭𝕽𝕺𝖃𝕬 𝕬𝕴)</option>
                    <option value="𝐁𝐑𝐎𝐗𝐀 𝐀𝐈">Negrito Serif (𝐁𝐑𝐎𝐗𝐀 𝐀𝐈)</option>
                    <option value="𝘉𝘙𝘖𝘟𝘈 𝘈𝘐">Itálico (𝘉𝘙𝘖𝘟𝘈 𝘈𝘐)</option>
                    <option value="𝘽𝙍Ｏ𝙓𝘼 𝘼𝙄">Negrito Itálico (𝘽𝙍Ｏ𝙓𝘼 𝘼𝙄)</option>
                    <option value="𝙱𝚁𝙾𝚇𝙰 𝙰𝙸">Máquina de Escrever (𝙱𝚁𝙾𝚇𝙰 𝙰𝙸)</option>
                    <option value="𝗕𝗥𝗢𝗫𝗔 𝗔𝗜">Negrito Sans (𝗕𝗥𝗢𝗫𝗔 𝗔𝗜)</option>
                    <option value="𝔅ℜ𝔒𝔛𝔄 𝔄ℑ">Medieval (𝔅ℜ𝔒𝔛𝔄 𝔄ℑ)</option>
                    <option value="𝔹ℝ𝕆𝕏𝔸 𝔸𝕀">Contorno (𝔹ℝ𝕆𝕏𝔸 𝔸𝕀)</option>
                    <option value="ＢＲＯＸＡ ＡＩ">Espaçado (ＢＲＯＸＡ ＡＩ)</option>
                    <option value="ⓑⓡⓞⓧⓐ ⓐⓘ">Círculos (ⓑⓡⓞⓧⓐ ⓐⓘ)</option>
                    <option value="🅑🅡🅞🅧🅐 🅐🅘">Círculos Escuros (🅑🅡🅞🅧🅐 🅐🅘)</option>
                    <option value="🅱🆁🅾🆇🅰 🅰🅸">Quadrados (🅱🆁🅾🆇🅰 🅰🅸)</option>
                    <option value="ᗷᖇO᙭ᗩ ᗩI">Curvado (ᗷᖇO᙭ᗩ ᗩI)</option>
                    <option value="乃尺ㄖ乂卂 卂丨">Asiático (乃尺ㄖ乂卂 卂丨)</option>
                    <option value="ᏰᏒᎧጀᏗ ᏗᎥ">Mágico (ᏰᏒᎧጀᏗ ᏗᎥ)</option>
                    <option value="฿ⱤØӾ₳ ₳ł">Moeda (฿ⱤØӾ₳ ₳ł)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[var(--text-base)] font-medium">Tema</span>
                  <div className="radio-group">
                    <label className="radio">
                      <input 
                        type="radio" 
                        name="theme" 
                        value="dark" 
                        checked={tempSettings.theme === 'dark'}
                        onChange={() => setTempSettings({ ...tempSettings, theme: 'dark' })}
                      />
                      <span className="radio-visual">
                        <span className="radio-dot"></span>
                      </span>
                      <span className="radio-label text-[var(--text-base)]">Escuro</span>
                    </label>
                    <label className="radio">
                      <input 
                        type="radio" 
                        name="theme" 
                        value="light" 
                        checked={tempSettings.theme === 'light'}
                        onChange={() => setTempSettings({ ...tempSettings, theme: 'light' })}
                      />
                      <span className="radio-visual">
                        <span className="radio-dot"></span>
                      </span>
                      <span className="radio-label text-[var(--text-base)]">Claro</span>
                    </label>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <span className="text-[var(--text-base)] font-medium">Efeitos Visuais</span>
                  <div className="radio-group">
                    <label className="radio">
                      <input 
                        type="radio" 
                        name="effects" 
                        checked={tempSettings.enableEffects}
                        onChange={() => setTempSettings({ ...tempSettings, enableEffects: true })}
                      />
                      <span className="radio-visual">
                        <span className="radio-dot"></span>
                      </span>
                      <span className="radio-label text-[var(--text-base)]">Ativado</span>
                    </label>
                    <label className="radio">
                      <input 
                        type="radio" 
                        name="effects" 
                        checked={!tempSettings.enableEffects}
                        onChange={() => setTempSettings({ ...tempSettings, enableEffects: false })}
                      />
                      <span className="radio-visual">
                        <span className="radio-dot"></span>
                      </span>
                      <span className="radio-label text-[var(--text-base)]">Desativado</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-base)] font-medium">Cor Secundária</span>
                  <input 
                    type="color" 
                    value={tempSettings.secondaryColor}
                    onChange={e => setTempSettings({ ...tempSettings, secondaryColor: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-base)] font-medium">Cor das Suas Mensagens</span>
                  <input 
                    type="color" 
                    value={tempSettings.userMessageColor || '#ffffff'}
                    onChange={e => setTempSettings({ ...tempSettings, userMessageColor: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                  />
                </div>

                <div className={`flex justify-between items-center ${streakDays < 3 ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--text-base)] font-medium">Cor de Seleção</span>
                    {streakDays < 3 && <span className="text-xs text-orange-500 flex items-center gap-1 font-bold"><Flame className="w-3 h-3" /> 3 dias</span>}
                  </div>
                  <input 
                    type="color" 
                    value={tempSettings.selectionColor || '#3b82f6'}
                    onChange={e => setTempSettings({ ...tempSettings, selectionColor: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                  />
                </div>

                <div className={`flex flex-col gap-2 ${streakDays < 15 ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-base)] font-medium">Imagem de Fundo</span>
                    {streakDays < 15 && <span className="text-xs text-orange-500 flex items-center gap-1 font-bold"><Flame className="w-3 h-3" /> 15 dias</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-24 h-24 rounded-xl border-2 border-dashed border-[var(--border-strong)] flex flex-col items-center justify-center cursor-pointer hover:border-[var(--color-sec)] hover:bg-[var(--bg-surface)] transition-colors relative overflow-hidden"
                      onClick={() => document.getElementById('bg-upload')?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleBgUpload(file);
                      }}
                    >
                      {tempSettings.backgroundImage ? (
                        <img src={tempSettings.backgroundImage} alt="Background" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <ImageIcon className="w-6 h-6 text-[var(--text-muted)] mb-1" />
                          <span className="text-[10px] text-[var(--text-muted)] text-center px-2">Clique ou arraste</span>
                        </>
                      )}
                      <input 
                        id="bg-upload"
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleBgUpload(file);
                        }}
                      />
                    </div>
                    {tempSettings.backgroundImage && (
                      <button 
                        onClick={() => setTempSettings({ ...tempSettings, backgroundImage: null })}
                        className="text-sm text-red-500 hover:text-red-400"
                      >
                        Remover Fundo
                      </button>
                    )}
                  </div>
                </div>

                <div className={`flex flex-col gap-2 ${streakDays < 20 ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-base)] font-medium">Comportamento da IA (Instrução Customizada)</span>
                    {streakDays < 20 && <span className="text-xs text-orange-500 flex items-center gap-1 font-bold"><Flame className="w-3 h-3" /> 20 dias</span>}
                  </div>
                  <textarea 
                    value={tempSettings.customInstruction || ''}
                    onChange={e => {
                      setTempSettings({ ...tempSettings, customInstruction: e.target.value });
                      setSettingsError(null);
                    }}
                    disabled={selectedModel === 'as'}
                    placeholder={selectedModel === 'as' ? "Não disponível para o modelo A.S" : "Deixe em branco para usar o padrão. Ex: Responda como um pirata..."}
                    className={`w-full bg-[var(--bg-input)] text-[var(--text-base)] border ${settingsError ? 'border-red-500' : 'border-[var(--border-subtle)]'} rounded-xl p-3 min-h-[100px] resize-y focus:outline-none focus:border-[var(--color-sec)] disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                  {selectedModel === 'as' && (
                    <span className="text-xs text-[var(--text-muted)]">O comportamento customizado não é aplicável ao modelo A.S.</span>
                  )}
                  {settingsError && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-sm mt-1 p-3 bg-red-500/10 rounded-xl border border-red-500/20 flex items-start gap-2"
                    >
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>{settingsError}</span>
                    </motion.div>
                  )}
                </div>
                
                {auth.currentUser && (
                  <div className="pt-6 border-t border-[var(--border-subtle)]">
                    <button 
                      onClick={() => {
                        setIsSettingsOpen(false);
                        setIsLogoutModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors font-medium"
                    >
                      <LogOut className="w-5 h-5" />
                      Sair da conta
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {unlockedFeature && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-[var(--bg-panel)] border-2 border-orange-500 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center max-w-sm"
          >
            <button 
              onClick={() => {
                if (unlockedFeature) {
                  markFeatureAsSeen(unlockedFeature.name);
                }
                setUnlockedFeature(null);
              }}
              className="absolute top-3 right-3 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)] rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <motion.div 
              animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
            >
              <Flame className="w-16 h-16 text-orange-500 fill-orange-500 mb-4" />
            </motion.div>
            <h3 className="text-2xl font-bold text-[var(--text-base)] mb-2">Novo Recurso Desbloqueado!</h3>
            <p className="text-[var(--text-muted)] mb-4">
              Você atingiu uma sequência de <span className="text-orange-500 font-bold">{unlockedFeature.days} dias</span>.
            </p>
            <div className="bg-orange-500/10 text-orange-500 px-4 py-2 rounded-xl font-bold mb-6">
              {unlockedFeature.name}
            </div>
            <button 
              onClick={() => {
                if (unlockedFeature) {
                  markFeatureAsSeen(unlockedFeature.name);
                }
                setUnlockedFeature(null);
              }}
              className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
            >
              Entendi
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettingsConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[var(--bg-panel)] rounded-3xl border border-[var(--border-strong)] w-full max-w-sm shadow-2xl flex flex-col overflow-hidden p-6"
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-[var(--color-sec)]/10 flex items-center justify-center mb-4">
                  <Settings className="w-6 h-6 text-[var(--color-sec)]" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Salvar alterações?</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Você fez alterações nas configurações. Deseja salvá-las antes de sair?
                </p>
              </div>
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => confirmSettingsClose(false)}
                  className="flex-1 py-3 bg-[var(--bg-surface)] hover:bg-[var(--border-strong)] text-[var(--text-base)] rounded-xl font-medium transition-colors text-sm"
                >
                  Descartar
                </button>
                <button 
                  onClick={() => confirmSettingsClose(true)}
                  className="flex-1 py-3 bg-[var(--color-sec)] hover:opacity-90 text-white rounded-xl font-medium transition-colors text-sm"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm border-4 border-dashed border-[var(--color-sec)] flex items-center justify-center"
          >
            <div className="text-2xl font-bold text-white flex flex-col items-center gap-4">
              <ImageIcon className="w-16 h-16 text-[var(--color-sec)] animate-bounce" />
              Solte a imagem aqui
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      <div className={`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[288px] md:w-72 bg-[var(--bg-panel)] border-r border-[var(--border-subtle)] transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 md:rounded-none rounded-r-[40px]`}>
        <div className="p-4 flex items-center justify-between">
          <div className={`flex items-center gap-3 text-lg font-bold ${settings.enableEffects ? 'broxa-title' : 'text-[var(--text-base)]'}`}>
            <Logo className="w-8 h-8 text-[var(--color-sec)]" />
            {settings.customTitleFont || 'BROXA AI'}
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-3 -mr-2 text-[var(--text-muted)] hover:text-[var(--text-base)]">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-3 pb-4">
          <button 
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-4 py-3 bg-[var(--bg-surface)] hover:bg-[var(--border-strong)] border border-[var(--border-strong)] rounded-2xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Conversa
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
          {pinnedSessions.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider px-4 mb-2">Conversas Favoritadas</div>
              <div className="space-y-1">
                <AnimatePresence>
                  {pinnedSessions.map(renderSession)}
                </AnimatePresence>
              </div>
            </div>
          )}

          {auth.currentUser && (
            <div className="mb-4">
              <div className="flex items-center justify-between px-4 mb-2">
                <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Grupos</div>
                <button 
                  onClick={() => setIsGroupModalOpen(true)}
                  className="p-1 hover:bg-[var(--bg-surface)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-base)] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1">
                {groups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => {
                      setSelectedGroupId(group.id);
                      setCurrentSessionId(null);
                      if (window.innerWidth < 768) setIsSidebarOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-2xl flex items-center gap-3 transition-all duration-200 group ${
                      selectedGroupId === group.id
                        ? 'bg-[var(--bg-surface)] text-[var(--text-base)] shadow-sm border border-[var(--border-strong)]'
                        : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-base)] border border-transparent'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedGroupId === group.id ? 'bg-[var(--color-sec)] text-white' : 'bg-[var(--bg-input)] text-[var(--text-muted)] group-hover:bg-[var(--color-sec)] group-hover:text-white'} transition-colors`}>
                        <MessageSquare className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium text-sm">{group.name}</div>
                      <div className="text-xs opacity-70 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-500" />
                        {group.streakDays} dias
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider px-4 mb-2">Histórico</div>
          <div className="space-y-1">
            <AnimatePresence>
              {unpinnedSessions.map(renderSession)}
            </AnimatePresence>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border-subtle)]">
          {isAdmin && (
            <button 
              onClick={() => setIsAdminPanelOpen(true)}
              className="flex items-center gap-3 text-sm text-[var(--color-sec)] hover:text-white transition-colors w-full p-2 rounded-xl hover:bg-[var(--color-sec)]/20 mb-2"
            >
              <ShieldAlert className="w-4 h-4" />
              Painel Admin
            </button>
          )}
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-3 text-sm text-[var(--text-muted)] hover:text-[var(--text-base)] transition-colors w-full p-2 rounded-xl hover:bg-[var(--bg-surface)] mb-2"
          >
            <Settings className="w-4 h-4" />
            Configurações
          </button>
          {auth.currentUser ? (
            <button 
              onClick={() => {
                setTempDisplayName(displayName || auth.currentUser?.displayName || '');
                setTempPhotoURL(photoURL || auth.currentUser?.photoURL || '');
                setIsUserSettingsOpen(true);
                setIsSidebarOpen(false);
              }}
              className="flex items-center gap-3 text-sm text-[var(--text-muted)] hover:text-[var(--text-base)] transition-colors w-full p-2 rounded-xl hover:bg-[var(--bg-surface)]"
            >
              <User className="w-4 h-4" />
              Usuário
            </button>
          ) : (
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-3 text-sm text-[var(--text-muted)] hover:text-[var(--text-base)] transition-colors w-full p-2 rounded-xl hover:bg-[var(--bg-surface)]"
            >
              <LogIn className="w-4 h-4" />
              Fazer Login
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-base)] relative z-0 rounded-none md:rounded-l-[40px] md:border-l border-[var(--border-subtle)] shadow-2xl overflow-hidden">
        <header className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/80 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-3 -ml-2 text-[var(--text-muted)] hover:text-[var(--text-base)]">
              <Menu className="w-6 h-6" />
            </button>
            
            {selectedGroupId ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedGroupId(null)}
                  className="p-2 -ml-2 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)] rounded-full transition-colors"
                  title="Sair do Grupo"
                >
                  <Undo2 className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-[var(--color-sec)] text-white flex items-center justify-center shadow-md overflow-hidden">
                  {groups.find(g => g.id === selectedGroupId)?.photoURL ? (
                    <img src={groups.find(g => g.id === selectedGroupId)?.photoURL!} alt="Group" className="w-full h-full object-cover" />
                  ) : (
                    <MessageSquare className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-[var(--text-base)] text-lg leading-tight">
                    {groups.find(g => g.id === selectedGroupId)?.name || 'Grupo'}
                  </h2>
                  <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-500" />
                    {groups.find(g => g.id === selectedGroupId)?.streakDays || 0} dias de ofensiva
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className={`md:hidden flex items-center gap-2 text-[var(--text-base)] font-bold ${settings.enableEffects ? 'broxa-title' : ''}`}>
                  <Logo className="w-6 h-6 text-[var(--color-sec)]" />
                  {settings.customTitleFont || 'BROXA AI'}
                </div>
                
                <div className="flex items-center">
                  <div className="relative">
                    <button 
                      onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                      className="flex items-center gap-2 text-[var(--text-base)] font-bold text-base md:text-lg hover:bg-[var(--bg-surface)] px-3 py-2 rounded-xl transition-colors"
                    >
                      BROXA {aiModels?.find(m => m.key === selectedModel)?.name || (selectedModel === 'thinking' ? '1.1 Thinking' : selectedModel === 'fast' ? '1.1 Fast' : selectedModel === 'search' ? '0.8 Search' : '0.5 A.S')}
                      <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
                    </button>

                    <AnimatePresence>
                      {isModelDropdownOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full left-0 mt-2 w-[280px] md:w-80 bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-2xl shadow-2xl z-50 overflow-hidden"
                        >
                          <div className="p-2">
                          <div className="text-xs font-bold text-[var(--text-muted)] px-3 py-2">Latest</div>
                          
                          {[...(aiModels || [])].sort((a, b) => {
                            const order = ['thinking', 'fast', 'as', 'search'];
                            const indexA = order.indexOf(a.key);
                            const indexB = order.indexOf(b.key);
                            const aVal = indexA === -1 ? 999 : indexA;
                            const bVal = indexB === -1 ? 999 : indexB;
                            return aVal - bVal;
                          }).map(model => (
                            <button 
                              key={model.id}
                              onClick={() => { 
                                setSelectedModel(model.key as any); 
                                setIsModelDropdownOpen(false); 
                                if (model.key === 'as') setShowASWarning(true);
                              }}
                              className={`w-full text-left px-3 py-3 rounded-xl flex items-center justify-between hover:bg-[var(--bg-surface)] transition-colors ${selectedModel === model.key ? 'bg-[var(--bg-surface)]' : ''}`}
                            >
                              <div>
                                <div className="font-bold text-[var(--text-base)] flex items-center gap-2">
                                  {model.name}
                                  {model.badgeType && model.badgeType !== 'NENHUMA' && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                      model.badgeType === 'BETA' ? 'bg-yellow-500 text-black' :
                                      model.badgeType === 'EM DESENVOLVIMENTO' ? 'bg-red-600 text-white' :
                                      model.badgeType === 'NOVO' ? 'bg-green-500 text-white' :
                                      model.badgeType === 'REMOVIDO' ? 'bg-gray-500 text-white' :
                                      'bg-blue-500 text-white'
                                    }`}>
                                      {model.badgeType}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-[var(--text-muted)]">{model.description}</div>
                              </div>
                              {selectedModel === model.key && <Check className="w-5 h-5 text-[var(--text-base)]" />}
                            </button>
                          ))}

                          {(isAdmin || userRole === 'developer') && (
                            <>
                              <div className="h-px bg-[var(--border-strong)] my-2 mx-2" />
                              <button
                                onClick={() => {
                                  setIsModelDropdownOpen(false);
                                  setIsDevModelsModalOpen(true);
                                }}
                                className="w-full text-left px-3 py-3 rounded-xl flex items-center justify-between hover:bg-[var(--bg-surface)] transition-colors text-[var(--color-sec)]"
                              >
                                <div>
                                  <div className="font-bold flex items-center gap-2">
                                    Modelos de Desenvolvedor
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide bg-[var(--color-sec)]/20 text-[var(--color-sec)]">
                                      DEV
                                    </span>
                                  </div>
                                  <div className="text-xs opacity-80">Acesso a modelos privados</div>
                                </div>
                                <ChevronRight className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 relative">
          {selectedGroupId ? (
            <>
              <button 
                onClick={() => {
                  const inviterName = encodeURIComponent(displayName || auth.currentUser?.displayName || 'Um usuário');
                  const link = `${window.location.origin}?joinGroup=${selectedGroupId}&inviterName=${inviterName}`;
                  navigator.clipboard.writeText(link);
                  alert('Link de convite copiado!');
                }}
                className="p-3 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)] rounded-xl transition-colors"
                title="Copiar Link de Convite"
              >
                <Copy className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {
                  setIsGroupMembersModalOpen(true);
                }}
                className="p-3 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)] rounded-xl transition-colors"
                title="Membros do Grupo"
              >
                <User className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {
                  const group = groups.find(g => g.id === selectedGroupId);
                  if (group) {
                    setGroupSettingsData({
                      name: group.name,
                      photoURL: group.photoURL || '',
                      systemInstruction: group.systemInstruction || ''
                    });
                    setIsGroupSettingsModalOpen(true);
                  }
                }}
                className="p-3 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)] rounded-xl transition-colors"
                title="Configurações do Grupo"
              >
                <Settings className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              {/* Streak Indicator */}
              <div 
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] mr-2 cursor-pointer hover:bg-[var(--bg-base)] transition-colors" 
                title={streakDays > 0 ? (lastMessageDate === new Date().toISOString().slice(0, 10) ? `Sequência de ${streakDays} dias` : `Sequência congelada em ${streakDays} dias. Mande uma mensagem para descongelar!`) : 'Comece uma sequência mandando mensagens diariamente!'}
                onClick={() => setIsStreakModalOpen(true)}
              >
                <Flame 
                  className={`w-5 h-5 transition-colors ${
                    streakDays > 0 && lastMessageDate === new Date().toISOString().slice(0, 10)
                      ? 'text-orange-500 fill-orange-500 animate-pulse' 
                      : 'text-gray-400'
                  }`} 
                />
                <span className={`font-bold ${streakDays > 0 && lastMessageDate === new Date().toISOString().slice(0, 10) ? 'text-orange-500' : 'text-gray-400'}`}>
                  {streakDays}
                </span>
              </div>

              <div className="relative">
                <button onClick={() => setIsPinnedMessagesOpen(!isPinnedMessagesOpen)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-base)] relative">
                <Pin className="w-5 h-5" />
                {hasPinnedItems && <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-sec)] rounded-full"></span>}
              </button>
              
              <AnimatePresence>
                {isPinnedMessagesOpen && (
                  <motion.div className="absolute top-full right-0 mt-2 w-[90vw] max-w-[320px] bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-3 border-b border-[var(--border-subtle)] font-bold text-[var(--text-base)]">Itens Fixados</div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-2">
                      {!hasPinnedItems ? (
                        <div className="text-center text-[var(--text-muted)] p-4 text-sm">Nenhum item fixado.</div>
                      ) : (
                        <>
                          {pinnedMessages.map(m => (
                            <div key={m.id} onClick={() => scrollToMessage(m.id)} className="p-3 bg-[var(--bg-surface)] rounded-xl cursor-pointer hover:bg-[var(--border-strong)] transition-colors text-sm text-[var(--text-base)] line-clamp-3">
                              <span className="text-xs text-[var(--text-muted)] block mb-1">Mensagem</span>
                              {m.content}
                            </div>
                          ))}
                          {pinnedTexts.map(t => (
                            <div key={t.id} className="p-3 bg-[var(--bg-surface)] rounded-xl group hover:bg-[var(--border-strong)] transition-colors text-sm text-[var(--text-base)] relative">
                              <span className="text-xs text-[var(--text-muted)] block mb-1">Texto</span>
                              <div className="line-clamp-3">{t.text}</div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (currentSessionId) removePinnedText(currentSessionId, t.id);
                                }}
                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            </>
          )}
          </div>
        </header>

        <div ref={scrollContainerRef} className={`flex-1 ${isHighlightMode ? 'overflow-hidden' : 'overflow-y-auto'} p-4 md:p-8 custom-scrollbar relative`}>
          
          {/* Pull to refresh indicator */}
          {(pullProgress > 0 || isRefreshing) && (
            <div 
              className="absolute top-0 left-0 right-0 flex justify-center z-30 pointer-events-none transition-transform duration-200"
              style={{ transform: `translateY(${isRefreshing ? 40 : pullProgress * 40}px)` }}
            >
              <div className="bg-[var(--bg-surface)] rounded-full p-2 shadow-lg border border-[var(--border-strong)]">
                <div 
                  className={`w-6 h-6 border-2 border-[var(--color-sec)] border-t-transparent rounded-full ${isRefreshing ? 'animate-spin' : ''}`}
                  style={!isRefreshing ? { transform: `rotate(${pullProgress * 360}deg)` } : {}}
                />
              </div>
            </div>
          )}

          <div className="max-w-3xl mx-auto space-y-8 pb-48">
            {selectedGroupId ? (
              !groupMessages.length ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center mt-32"
                >
                  <div className="w-24 h-24 bg-[var(--bg-surface)] rounded-full flex items-center justify-center mb-6 shadow-lg border border-[var(--border-strong)]">
                    <MessageSquare className="w-14 h-14 text-[var(--color-sec)]" />
                  </div>
                  <h2 className="text-3xl font-semibold mb-3">Bem-vindo ao Grupo</h2>
                  <p className="text-[var(--text-muted)] max-w-md text-lg">
                    Mande a primeira mensagem para começar a interagir com seus amigos e com a IA.
                  </p>
                </motion.div>
              ) : (
                <AnimatePresence initial={false}>
                  {groupMessages.map((msg, index) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-4 ${msg.senderId === auth.currentUser?.uid ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div className="flex-shrink-0">
                        {msg.senderId === 'ai' ? (
                          <div className="w-10 h-10 rounded-full bg-[var(--color-sec)] flex items-center justify-center shadow-md">
                            <Logo className="w-6 h-6 text-white" />
                          </div>
                        ) : msg.senderPhotoURL ? (
                          <img src={msg.senderPhotoURL} alt={msg.senderName} className="w-10 h-10 rounded-full object-cover shadow-md" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[var(--bg-surface)] border border-[var(--border-strong)] flex items-center justify-center shadow-md">
                            <User className="w-5 h-5 text-[var(--text-muted)]" />
                          </div>
                        )}
                      </div>
                      <div className={`flex flex-col max-w-[80%] ${msg.senderId === auth.currentUser?.uid ? 'items-end' : 'items-start'}`}>
                        <span className="text-xs text-[var(--text-muted)] mb-1 font-medium px-1">
                          {msg.senderName}
                        </span>
                        <div className={`p-4 rounded-2xl ${
                          msg.senderId === auth.currentUser?.uid 
                            ? 'bg-[var(--color-sec)] text-white rounded-tr-sm' 
                            : msg.senderId === 'ai'
                              ? 'bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-tl-sm'
                              : 'bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-tl-sm'
                        }`}>
                          {msg.imageUrls && msg.imageUrls.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {msg.imageUrls.map((url, i) => (
                                <img key={i} src={url} alt="Attachment" className="max-w-xs rounded-lg object-cover" />
                              ))}
                            </div>
                          )}
                          <div className={`prose prose-sm ${settings.theme === 'dark' ? 'prose-invert prose-p:text-white prose-headings:text-white' : 'prose-p:text-black prose-headings:text-black'} max-w-none break-words`}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )
            ) : !currentSession?.messages.length ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center mt-32"
              >
                <div className="w-24 h-24 bg-[var(--bg-surface)] rounded-full flex items-center justify-center mb-6 shadow-lg border border-[var(--border-strong)]">
                  <Logo className="w-14 h-14 text-[var(--color-sec)]" />
                </div>
                <h2 className="text-3xl font-semibold mb-3">Como posso ajudar hoje?</h2>
                <p className="text-[var(--text-muted)] max-w-md text-lg">
                  Envie uma foto da sua tarefa ou faça uma pergunta. Estou aqui para fornecer respostas precisas e organizadas.
                </p>
              </motion.div>
            ) : (
              <AnimatePresence initial={false}>
                {currentSession.messages.map((msg, index) => (
                  <MessageItem 
                    key={msg.id} 
                    msg={msg} 
                    sessionId={currentSessionId} 
                    settings={settings} 
                    isHighlightMode={isHighlightMode || isEraserMode} 
                    isEraserMode={isEraserMode}
                    highlightColor={highlightColor} 
                    togglePinMessage={togglePinMessage} 
                    addStroke={addStroke} 
                    onStrokeStart={handleAddStrokeToStack}
                    previousUserMessage={index > 0 ? currentSession.messages[index - 1] : undefined}
                    onRetry={(input, images, model) => handleSend(input, images, model)}
                    aiModels={aiModels}
                    addFeedback={addFeedback}
                    onSendAnswer={(text: string) => handleSend(text, [], 'as')}
                  />
                ))}
              </AnimatePresence>
            )}
            {isLoading && selectedModel !== 'search' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4 justify-start relative"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--bg-surface)] flex items-center justify-center shrink-0 mt-1 shadow-lg border border-[var(--border-strong)]">
                  <Logo className="w-6 h-6 text-[var(--color-sec)]" />
                </div>
                <div className="relative max-w-[90%] md:max-w-[75%] rounded-3xl px-4 py-3 md:px-6 md:py-4 shadow-sm group bg-transparent text-[var(--text-base)] flex items-center gap-1">
                  <motion.div 
                    animate={{ y: [0, -5, 0] }} 
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                    className="w-2 h-2 bg-[var(--text-muted)] rounded-full"
                  />
                  <motion.div 
                    animate={{ y: [0, -5, 0] }} 
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                    className="w-2 h-2 bg-[var(--text-muted)] rounded-full"
                  />
                  <motion.div 
                    animate={{ y: [0, -5, 0] }} 
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                    className="w-2 h-2 bg-[var(--text-muted)] rounded-full"
                  />
                </div>
              </motion.div>
            )}
            {isLoading && selectedModel === 'search' && searchStatus && !selectedGroupId && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4 justify-start"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--bg-surface)] flex items-center justify-center shrink-0 mt-1 shadow-lg border border-[var(--border-strong)]">
                  <Logo className="w-6 h-6 text-[var(--color-sec)]" />
                </div>
                <div className="px-6 py-5 flex items-center gap-3 text-[var(--text-muted)] bg-transparent rounded-3xl rounded-tl-sm">
                  <div className="flex items-center gap-3 text-[var(--text-base)] font-medium">
                    <div className="w-4 h-4 border-2 border-[var(--color-sec)] border-t-transparent rounded-full animate-spin"></div>
                    {searchStatus}
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)] to-transparent pt-12 pb-6 px-4 md:px-8 z-20 pointer-events-none">
          <div className="max-w-3xl mx-auto relative pointer-events-auto">
            <AnimatePresence>
              {selectedImages.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  className="absolute bottom-full mb-4 left-0 bg-[var(--bg-surface)] p-2 rounded-2xl border border-[var(--border-strong)] flex items-start gap-2 shadow-2xl overflow-x-auto max-w-full"
                >
                  {selectedImages.map((img, index) => (
                    <div 
                      key={index} 
                      className="relative flex-shrink-0 cursor-move"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', index.toString());
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                        const toIndex = index;
                        if (fromIndex !== toIndex && !isNaN(fromIndex)) {
                          setSelectedImages(prev => {
                            const newImages = [...prev];
                            const [movedImage] = newImages.splice(fromIndex, 1);
                            newImages.splice(toIndex, 0, movedImage);
                            return newImages;
                          });
                        }
                      }}
                    >
                      <img src={img.url} alt={`Preview ${index}`} className="h-24 w-24 object-cover rounded-xl pointer-events-none" />
                      <button onClick={() => removeImage(index)} className="p-1.5 bg-black/80 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors absolute top-1 right-1 shadow-md backdrop-blur-sm z-10">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <div className={`bg-[var(--bg-input)] border rounded-[32px] flex flex-col shadow-2xl overflow-hidden focus-within:ring-1 transition-all ${shakeInput ? 'animate-shake border-red-500 ring-1 ring-red-500' : 'border-[var(--border-strong)] focus-within:border-[var(--border-strong)] focus-within:ring-[var(--border-strong)]'}`}>
              <div 
                className="w-full h-3 cursor-ns-resize flex items-center justify-center hover:bg-[var(--border-subtle)] transition-colors opacity-50 hover:opacity-100"
                onMouseDown={handleResizeStart}
                onTouchStart={handleResizeStart}
              >
                <div className="w-10 h-1 rounded-full bg-[var(--text-muted)]"></div>
              </div>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (isHighlightMode) setIsHighlightMode(false);
                  if (isEraserMode) setIsEraserMode(false);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Envie uma mensagem, cole ou arraste uma foto..."
                className="w-full bg-transparent text-[var(--text-base)] placeholder-[var(--text-muted)] px-5 py-2 resize-none focus:outline-none custom-scrollbar text-base"
                style={{ height: `${textareaHeight}px` }}
              />
              <div className="flex items-end justify-between px-3 pb-3 pt-1 gap-2">
                <div className="flex flex-wrap items-center gap-1 highlighter-tools flex-1">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--border-subtle)] rounded-2xl transition-colors"
                    title="Anexar imagem"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <div className="w-px h-6 bg-[var(--border-strong)] mx-1"></div>
                  <button 
                    onClick={() => {
                      setIsHighlightMode(!isHighlightMode);
                      if (isEraserMode) setIsEraserMode(false);
                    }}
                    className={`p-2.5 rounded-2xl transition-colors ${isHighlightMode && !isEraserMode ? 'bg-[var(--color-sec)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--border-subtle)]'}`}
                    title="Modo Marca-texto"
                  >
                    <Highlighter className="w-5 h-5" />
                  </button>
                  {hasHighlights && (
                    <button 
                      onClick={() => {
                        setIsEraserMode(!isEraserMode);
                        if (!isHighlightMode) setIsHighlightMode(true);
                      }}
                      className={`p-2.5 rounded-2xl transition-colors ${isEraserMode ? 'bg-[var(--text-base)] text-[var(--bg-base)]' : 'text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--border-subtle)]'}`}
                      title="Borracha"
                    >
                      <Eraser className="w-5 h-5" />
                    </button>
                  )}
                  <AnimatePresence>
                    {isHighlightMode && !isEraserMode && (
                      <motion.div
                        initial={{ width: 0, opacity: 0, scale: 0.8 }}
                        animate={{ width: 'auto', opacity: 1, scale: 1 }}
                        exit={{ width: 0, opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-1.5 bg-[var(--bg-surface)] rounded-full px-2 py-1.5 border border-[var(--border-strong)] ml-2 overflow-hidden shadow-sm"
                      >
                        {['#22c55e', '#eab308', '#ec4899', '#3b82f6', '#a855f7'].map(color => (
                          <button
                            key={color}
                            onClick={() => setHighlightColor(color)}
                            className={`w-5 h-5 rounded-full transition-transform hover:scale-110 flex-shrink-0 ${highlightColor === color ? 'ring-2 ring-offset-2 ring-[var(--text-base)] ring-offset-[var(--bg-surface)]' : ''}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                        <div className="w-px h-4 bg-[var(--border-strong)] mx-1 flex-shrink-0"></div>
                        <button
                          onClick={() => setIsHighlightMode(false)}
                          className="p-1 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors flex-shrink-0"
                          title="Sair do modo marca-texto"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {(undoStack.length > 0 || redoStack.length > 0) && (
                    <div className="flex items-center gap-1 ml-2 border-l border-[var(--border-strong)] pl-2">
                      <button 
                        onClick={handleUndo}
                        disabled={undoStack.length === 0}
                        className="p-2 text-[var(--text-muted)] hover:text-[var(--text-base)] disabled:opacity-30 transition-colors"
                        title="Desfazer (Ctrl+Z)"
                      >
                        <Undo2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={handleRedo}
                        disabled={redoStack.length === 0}
                        className="p-2 text-[var(--text-muted)] hover:text-[var(--text-base)] disabled:opacity-30 transition-colors"
                        title="Refazer (Ctrl+Y)"
                      >
                        <Redo2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => {
                    if (isLoading) {
                      abortControllerRef.current?.abort();
                      setIsLoading(false);
                    } else {
                      handleSend();
                    }
                  }}
                  disabled={(!input.trim() && selectedImages.length === 0 && !isLoading)}
                  className={`p-3 ${isLoading ? 'bg-transparent border-2 border-[var(--text-base)]' : 'bg-[var(--text-base)]'} hover:opacity-80 disabled:opacity-50 text-[var(--bg-base)] rounded-2xl transition-all flex items-center justify-center shadow-lg disabled:shadow-none shrink-0`}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 bg-[var(--text-base)] rounded-sm" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isProfileSetupOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h2 className="text-xl font-bold mb-2">Como podemos te chamar?</h2>
              <p className="text-[var(--text-muted)] mb-6 text-sm">
                Escolha um nome para usar no chat.
              </p>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Nome</label>
                  <input 
                    type="text" 
                    value={tempDisplayName}
                    onChange={(e) => setTempDisplayName(e.target.value)}
                    placeholder="Seu nome"
                    maxLength={50}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-xl px-4 py-3 text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)] transition-colors"
                  />
                </div>
                <ImageUpload 
                  value={tempPhotoURL} 
                  onChange={setTempPhotoURL} 
                  label="Foto de Perfil (Opcional)" 
                />
              </div>
              <div className="flex justify-end">
                <button 
                  onClick={() => {
                    if (tempDisplayName.trim()) {
                      updateProfile(tempDisplayName.trim(), tempPhotoURL);
                      setIsProfileSetupOpen(false);
                    }
                  }}
                  disabled={!tempDisplayName.trim()}
                  className="px-6 py-2 bg-[var(--color-sec)] text-white rounded-xl hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isUserSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Perfil de Usuário</h2>
                <button onClick={() => setIsUserSettingsOpen(false)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)] rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                <ImageUpload 
                  value={tempPhotoURL} 
                  onChange={setTempPhotoURL} 
                  label="Foto de Perfil (Opcional)" 
                />
                
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Nome</label>
                  <input 
                    type="text" 
                    value={tempDisplayName}
                    onChange={(e) => setTempDisplayName(e.target.value)}
                    placeholder="Seu nome"
                    maxLength={50}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-xl px-4 py-3 text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)] transition-colors"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsUserSettingsOpen(false)}
                  className="px-4 py-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (tempDisplayName.trim()) {
                      updateProfile(tempDisplayName.trim(), tempPhotoURL);
                      setIsUserSettingsOpen(false);
                    }
                  }}
                  disabled={!tempDisplayName.trim()}
                  className="px-6 py-2 bg-[var(--color-sec)] text-white rounded-xl hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGroupModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Criar Grupo</h2>
                <button onClick={() => setIsGroupModalOpen(false)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)] rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Nome do Grupo</label>
                  <input 
                    type="text" 
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Ex: Amigos da Faculdade"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-xl px-4 py-3 text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)] transition-colors"
                  />
                </div>
                {groupInviteLink && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Link de Convite</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        readOnly
                        value={groupInviteLink}
                        className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-xl px-4 py-3 text-[var(--text-base)] focus:outline-none"
                      />
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(groupInviteLink);
                        }}
                        className="p-3 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl hover:bg-[var(--bg-input)] transition-colors"
                      >
                        <Copy className="w-5 h-5 text-[var(--text-muted)]" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3">
                {!groupInviteLink ? (
                  <button 
                    onClick={async () => {
                      if (newGroupName.trim()) {
                        const groupId = await createGroup(newGroupName.trim());
                        if (groupId) {
                          const inviterName = encodeURIComponent(displayName || auth.currentUser?.displayName || 'Um usuário');
                          const link = `${window.location.origin}?joinGroup=${groupId}&inviterName=${inviterName}`;
                          setGroupInviteLink(link);
                        }
                      }
                    }}
                    disabled={!newGroupName.trim()}
                    className="px-6 py-2 bg-[var(--color-sec)] text-white rounded-xl hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Criar e Gerar Link
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      setIsGroupModalOpen(false);
                      setNewGroupName('');
                      setGroupInviteLink('');
                    }}
                    className="px-6 py-2 bg-[var(--color-sec)] text-white rounded-xl hover:opacity-90 transition-opacity font-medium"
                  >
                    Concluir
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRenameGroupModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Renomear Grupo</h2>
                <button onClick={() => setIsRenameGroupModalOpen(false)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)] rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Novo Nome</label>
                  <input 
                    type="text" 
                    value={newRenameValue}
                    onChange={(e) => setNewRenameValue(e.target.value)}
                    placeholder="Novo nome do grupo"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-xl px-4 py-3 text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)] transition-colors"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsRenameGroupModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (newRenameValue.trim() && renameGroupId) {
                      renameGroup(renameGroupId, newRenameValue.trim());
                      setIsRenameGroupModalOpen(false);
                    }
                  }}
                  disabled={!newRenameValue.trim()}
                  className="px-6 py-2 bg-[var(--color-sec)] text-white rounded-xl hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {inviteModalData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Convite para Grupo</h2>
                <button onClick={() => setInviteModalData(null)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)] rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4 mb-8 text-center">
                <p className="text-[var(--text-base)] text-lg">
                  <span className="font-bold">{inviteModalData.inviterName}</span> convidou você para entrar no grupo <span className="font-bold">{inviteModalData.groupName}</span>
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    joinGroup(inviteModalData.groupId).then(() => {
                      setSelectedGroupId(inviteModalData.groupId);
                      setCurrentSessionId(null);
                      setInviteModalData(null);
                    });
                  }}
                  className="w-full px-6 py-3 bg-[var(--color-sec)] text-white rounded-xl hover:opacity-90 transition-opacity font-medium"
                >
                  Aceitar
                </button>
                <button 
                  onClick={() => setInviteModalData(null)}
                  className="w-full px-6 py-3 bg-[var(--bg-surface)] text-[var(--text-base)] rounded-xl hover:bg-[var(--bg-input)] transition-colors font-medium border border-[var(--border-strong)]"
                >
                  Recusar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGroupSettingsModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-3xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Configurações do Grupo</h2>
                <button onClick={() => setIsGroupSettingsModalOpen(false)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)] rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Nome do Grupo</label>
                  <input 
                    type="text" 
                    value={groupSettingsData.name}
                    onChange={(e) => setGroupSettingsData({ ...groupSettingsData, name: e.target.value })}
                    placeholder="Nome do grupo"
                    maxLength={50}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-xl px-4 py-3 text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)] transition-colors"
                  />
                </div>
                
                <ImageUpload 
                  value={groupSettingsData.photoURL} 
                  onChange={(val) => setGroupSettingsData({ ...groupSettingsData, photoURL: val })} 
                  label="Foto do Grupo (Opcional)" 
                />

                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Comportamento da IA (Instrução de Sistema)</label>
                  <textarea 
                    value={groupSettingsData.systemInstruction}
                    onChange={(e) => setGroupSettingsData({ ...groupSettingsData, systemInstruction: e.target.value })}
                    placeholder="Ex: Responda sempre como um pirata..."
                    maxLength={5000}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-xl px-4 py-3 text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)] transition-colors resize-none h-24"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1">Isso afetará como a IA responde para todos os membros do grupo.</p>
                </div>
              </div>
              <div className="flex justify-between items-center mt-6">
                {groups.find(g => g.id === selectedGroupId)?.ownerId === auth.currentUser?.uid && (
                  <button 
                    onClick={() => {
                      setConfirmModalData({
                        title: 'Deletar Grupo',
                        message: 'Tem certeza que deseja deletar este grupo? Esta ação não pode ser desfeita.',
                        onConfirm: () => {
                          deleteGroup(selectedGroupId);
                          setIsGroupSettingsModalOpen(false);
                          navigate('/');
                        }
                      });
                    }}
                    className="px-4 py-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Deletar Grupo
                  </button>
                )}
                <div className="flex gap-3 ml-auto">
                  <button 
                    onClick={() => setIsGroupSettingsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      if (groupSettingsData.name.trim() && selectedGroupId) {
                        updateGroup(selectedGroupId, {
                          name: groupSettingsData.name.trim(),
                          photoURL: groupSettingsData.photoURL,
                          systemInstruction: groupSettingsData.systemInstruction
                        });
                        setIsGroupSettingsModalOpen(false);
                      }
                    }}
                    disabled={!groupSettingsData.name.trim()}
                    className="px-6 py-2 bg-[var(--color-sec)] text-white rounded-xl hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGroupMembersModalOpen && selectedGroupId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-3xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Membros do Grupo</h2>
                <button onClick={() => setIsGroupMembersModalOpen(false)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)] rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
                {groups.find(g => g.id === selectedGroupId)?.members.map(memberId => {
                  const isOwner = groups.find(g => g.id === selectedGroupId)?.ownerId === memberId;
                  const isMe = auth.currentUser?.uid === memberId;
                  const amIOwner = groups.find(g => g.id === selectedGroupId)?.ownerId === auth.currentUser?.uid;
                  const details = memberDetails[memberId];
                  const name = isMe ? (displayName || auth.currentUser?.displayName || 'Você') : (details?.name || 'Usuário');
                  const photo = isMe ? (photoURL || auth.currentUser?.photoURL) : details?.photoURL;
                  
                  return (
                    <div key={memberId} className="flex items-center justify-between p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-strong)]">
                      <div className="flex items-center gap-3">
                        {photo ? (
                          <img src={photo} alt={name} className="w-10 h-10 rounded-full object-cover border border-[var(--border-subtle)]" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[var(--bg-input)] flex items-center justify-center overflow-hidden">
                            <User className="w-5 h-5 text-[var(--text-muted)]" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-[var(--text-base)] flex items-center gap-2">
                            {name}
                            {isOwner && <span className="text-xs bg-[var(--color-sec)]/20 text-[var(--color-sec)] px-2 py-0.5 rounded-full font-bold">Dono</span>}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">{memberId.substring(0, 8)}...</div>
                        </div>
                      </div>
                      
                      {amIOwner && !isOwner && (
                        <button 
                          onClick={() => {
                            setConfirmModalData({
                              title: 'Remover Usuário',
                              message: 'Tem certeza que deseja remover este usuário do grupo?',
                              onConfirm: () => {
                                removeMember(selectedGroupId, memberId);
                              }
                            });
                          }}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Remover usuário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDevModelsModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setIsDevModelsModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)] rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[var(--color-sec)]/20 rounded-xl flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-[var(--color-sec)]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-base)]">Modelos de Desenvolvedor</h2>
                  <p className="text-sm text-[var(--text-muted)]">Acesso exclusivo a modelos privados</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between opacity-50 cursor-not-allowed">
                  <div>
                    <div className="font-bold text-[var(--text-base)] flex items-center gap-2">
                      Broxa 2.0 Pro
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide bg-purple-500/20 text-purple-400">
                        EM BREVE
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">Modelo avançado com raciocínio profundo</div>
                  </div>
                  <Lock className="w-5 h-5 text-[var(--text-muted)]" />
                </div>
                
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between opacity-50 cursor-not-allowed">
                  <div>
                    <div className="font-bold text-[var(--text-base)] flex items-center gap-2">
                      Broxa Vision
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide bg-blue-500/20 text-blue-400">
                        EM BREVE
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">Especializado em análise de imagens</div>
                  </div>
                  <Lock className="w-5 h-5 text-[var(--text-muted)]" />
                </div>
              </div>
              
              <button 
                onClick={() => setIsDevModelsModalOpen(false)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[var(--text-base)] hover:bg-[var(--bg-base)] transition-colors font-medium"
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {roleNotificationModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-[var(--color-sec)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-8 h-8 text-[var(--color-sec)]" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Parabéns!</h2>
              <p className="text-[var(--text-muted)] mb-6">
                Você foi adicionado à equipe do Broxa AI como <strong className="text-[var(--text-base)]">{roleNotificationModal.role}</strong>.
              </p>
              
              <button 
                onClick={() => setRoleNotificationModal(null)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-sec)] text-white hover:opacity-90 transition-colors font-medium"
              >
                Entendi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmModalData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h2 className="text-xl font-bold mb-4">{confirmModalData.title}</h2>
              <p className="text-[var(--text-muted)] mb-6">{confirmModalData.message}</p>
              
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setConfirmModalData(null)}
                  className="px-4 py-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    confirmModalData.onConfirm();
                    setConfirmModalData(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors font-medium"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}
