import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  Plus,
  MessageSquare,
  Trash2,
  Image as ImageIcon,
  X,
  Settings,
  Pin,
  Highlighter,
  AlertTriangle,
  Undo2,
  Redo2,
  Eraser,
  Copy,
  Check,
  ChevronDown,
  ShieldAlert,
  LogIn,
  LogOut,
  Search,
  GitCompare,
  Edit,
  Edit2,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  ChevronUp,
  RefreshCw,
  Cpu,
  Flame,
  Snowflake,
  Bot,
  User,
  Lock,
  ChevronRight,
  ShieldCheck,
  LayoutDashboard,
  Globe,
  Dog,
  Monitor,
  Shield,
  Palette,
  FolderOpen,
  List,
  Grid3X3,
  Download,
  Users,
  UserPlus,
  ChevronLeft,
  ArrowUp,
  PenLine,
  FileText,
  HelpCircle,
  Ban,
  LinkIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  useChatStore,
  useSettingsStore,
  useAdminStore,
  useUserStore,
  useGroupStore,
  ReleaseNote,
  ReleaseNoteImage,
  ReleaseNoteBadge,
} from "../store";
import { Group, GroupMessage } from "../types";
import { FriendRequest } from "../types";
import { db } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  getDocs,
  getDoc,
  where,
  updateDoc,
  deleteField,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  auth,
  signInWithGoogle,
  logOut,
  handleFirestoreError,
  OperationType,
} from "../firebase";
import { AuthModal } from "../components/AuthModal";
import {
  generateResponse,
  generateResponseStream,
  generateTitle,
} from "../services/ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "motion/react";
import { Rnd } from "react-rnd";
import { v4 as uuidv4 } from "uuid";
import { Message, Point, FriendRequest } from "../types";
import { MindMap } from "../components/MindMap";
import { checkContent, getViolationMessage } from "../services/moderation";
import { BanScreen } from "../components/BanScreen";

interface ColorPickerDropdownProps {
  valueColor: string;
  colorMap: { value: string; label: string }[];
  onSelect: (color: string) => void;
}

const ColorPickerDropdown: React.FC<ColorPickerDropdownProps> = ({
  valueColor,
  colorMap,
  onSelect,
}) => {
  const [open, setOpen] = useState(false);
  const currentColorLabel =
    colorMap.find((c) => c.value === valueColor)?.label || "Customizada";
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 border border-[var(--border-strong)] shadow-sm hover:border-[var(--border-subtle)] transition-colors"
      >
        <span className="text-sm text-[var(--text-base)] font-medium">
          {currentColorLabel}
        </span>
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)]"
            style={{ backgroundColor: valueColor }}
          />
          <ChevronDown
            className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 mt-1 w-full bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl shadow-xl overflow-hidden z-50"
          >
            <div className="py-1">
              {colorMap.map((color) => (
                <button
                  key={color.value}
                  onClick={() => {
                    onSelect(color.value);
                    setOpen(false);
                  }}
                  className={`flex items-center justify-between w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--bg-surface)] transition-colors ${valueColor === color.value ? "bg-[var(--bg-surface)]" : ""}`}
                >
                  <span className="text-[var(--text-base)]">{color.label}</span>
                  <div
                    className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)]"
                    style={{ backgroundColor: color.value }}
                  />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const RespostaOptions = ({ disabled }: { disabled: boolean }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const id = React.useId();

  return (
    <div
      className="flex flex-col gap-3 mt-4 mb-6 resposta-options"
      data-selected={selected || ""}
    >
      {["A", "B", "C", "D", "E"].map((opt) => (
        <label
          key={opt}
          className={`flex items-center gap-3 cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
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
          <span className="font-medium text-[var(--text-base)]">
            Opção {opt}
          </span>
        </label>
      ))}
    </div>
  );
};

const Logo = ({ className, color }: { className?: string; color?: string }) => (
  <img
    src="/logo.png"
    className={`${className} rounded-full object-contain`}
    alt="Logo"
  />
);

const MessageItem = React.memo(
  ({
    msg,
    sessionId,
    settings,
    isHighlightMode,
    isEraserMode,
    highlightColor,
    togglePinMessage,
    addStroke,
    onStrokeStart,
    previousUserMessage,
    onRetry,
    aiModels,
    addFeedback,
    onSendAnswer,
  }: any) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
    const [isCopied, setIsCopied] = useState(false);
    const [isErrorHubOpen, setIsErrorHubOpen] = useState(false);
    const [isErrorInfoOpen, setIsErrorInfoOpen] = useState(false);
    const [isErrorCopied, setIsErrorCopied] = useState(false);
    const [answersSubmitted, setAnswersSubmitted] = useState(false);

    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [feedbackType, setFeedbackType] = useState<"like" | "dislike" | null>(
      null,
    );
    const [feedbackText, setFeedbackText] = useState("");
    const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);

    const [showLongPressHint, setShowLongPressHint] = useState(false);

    const handleFeedbackSubmit = async () => {
      if (!feedbackText.trim() || !feedbackType) return;
      try {
        await addFeedback({
          messageId: msg.id,
          isPositive: feedbackType === "like",
          comment: feedbackText,
          userEmail: auth.currentUser?.email || "Anônimo",
          model: msg.model || "Desconhecido",
          prompt: previousUserMessage?.content || "Sem prompt anterior",
          response: msg.content,
        });
        setHasSubmittedFeedback(true);
        setIsFeedbackModalOpen(false);
        setFeedbackText("");
      } catch (error) {
        console.error("Error submitting feedback:", error);
      }
    };

    const handleCopy = () => {
      navigator.clipboard.writeText(msg.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    };

    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );
    const handleTouchStartCopy = () => {
      if (msg.role !== "ai" || !msg.content) return;
      setShowLongPressHint(true);
      longPressTimerRef.current = setTimeout(() => {
        handleCopy();
        setShowLongPressHint(false);
        if (navigator.vibrate) navigator.vibrate(10);
      }, 500);
    };
    const handleTouchEndCopy = () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (showLongPressHint) setShowLongPressHint(false);
    };
    const handleContextMenuCopy = (e: React.MouseEvent) => {
      if (msg.role === "ai") {
        e.preventDefault();
        handleCopy();
      }
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
      window.addEventListener("resize", resizeCanvas);
      const observer = new ResizeObserver(resizeCanvas);
      if (containerRef.current) observer.observe(containerRef.current);
      return () => {
        window.removeEventListener("resize", resizeCanvas);
        observer.disconnect();
      };
    }, [msg.strokes, currentStroke, settings.theme]);

    const drawAll = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const drawStroke = (
        points: Point[],
        color: string,
        isEraser?: boolean,
      ) => {
        if (points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        if (isEraser) {
          ctx.globalCompositeOperation = "destination-out";
          ctx.lineWidth = 30;
          ctx.strokeStyle = "rgba(0,0,0,1)";
          ctx.globalAlpha = 1.0;
        } else {
          ctx.globalCompositeOperation = "source-over";
          ctx.lineWidth = 20;
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.4;
        }
        ctx.stroke();
      };

      msg.strokes?.forEach((s: any) =>
        drawStroke(s.points, s.color, s.isEraser),
      );
      if (currentStroke.length > 0) {
        drawStroke(currentStroke, highlightColor, isEraserMode);
      }
      ctx.globalCompositeOperation = "source-over";
    };

    useEffect(() => {
      drawAll();
    }, [msg.strokes, currentStroke, highlightColor]);

    const handleMouseDown = (e: React.MouseEvent) => {
      if (!isHighlightMode || msg.role !== "ai") return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      setIsDrawing(true);
      setCurrentStroke([{ x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDrawing || !isHighlightMode) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCurrentStroke((prev) => [
        ...prev,
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
      ]);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
      if (!isHighlightMode || msg.role !== "ai") return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      setIsDrawing(true);
      const touch = e.touches[0];
      setCurrentStroke([
        { x: touch.clientX - rect.left, y: touch.clientY - rect.top },
      ]);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (!isDrawing || !isHighlightMode) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const touch = e.touches[0];
      setCurrentStroke((prev) => [
        ...prev,
        { x: touch.clientX - rect.left, y: touch.clientY - rect.top },
      ]);
    };

    const handleMouseUp = () => {
      if (!isDrawing) return;
      setIsDrawing(false);
      if (currentStroke.length > 1) {
        const newStroke = {
          color: highlightColor,
          points: currentStroke,
          isEraser: isEraserMode,
        };
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
        exit={{
          opacity: 0,
          filter: "blur(10px)",
          transition: { duration: 0.3, ease: "easeOut" },
        }}
        className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"} relative`}
      >
        {msg.role === "ai" && (
          <div className="w-10 h-10 rounded-full bg-[var(--bg-surface)] flex items-center justify-center shrink-0 mt-1 shadow-lg border border-[var(--border-strong)]">
            <Logo className="w-6 h-6 text-[var(--color-sec)]" />
          </div>
        )}
        <div
          ref={containerRef}
          className={`relative max-w-[90%] md:max-w-[75%] group ${msg.role === "user" ? "rounded-3xl px-4 py-3 md:px-6 md:py-4 shadow-sm rounded-tr-sm border border-[var(--border-subtle)] select-none" : "rounded-tl-sm border-0 shadow-none px-0 py-0 md:px-0 md:py-0 select-text"}`}
          style={
            msg.role === "user"
              ? {
                  backgroundColor:
                    settings.userMessageColor || "var(--bg-surface)",
                  color: "#ffffff",
                }
              : undefined
          }
          onTouchStart={handleTouchStartCopy}
          onTouchEnd={handleTouchEndCopy}
          onTouchMove={handleTouchEndCopy}
          onContextMenu={handleContextMenuCopy}
        >
          {msg.role === "ai" && (
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
              onTouchCancel={handleMouseUp}
              className={`absolute inset-0 z-10 ai-message-canvas rounded-3xl ${isHighlightMode ? "cursor-crosshair pointer-events-auto touch-none" : "pointer-events-none"}`}
            />
          )}

          <div className="relative z-0 message-content">
            {!msg.content && msg.role === "ai" && !msg.isError && (
              <div className="flex items-center h-6 mt-1 px-2">
                <div className="jumping-dots text-2xl font-bold text-[var(--color-sec)]">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </div>
              </div>
            )}
            {msg.imageUrl && (
              <img
                src={msg.imageUrl}
                alt="Upload"
                className="max-w-sm w-full rounded-2xl mb-4 object-contain shadow-lg border border-[var(--border-strong)]"
              />
            )}
            {msg.imageUrls && msg.imageUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {msg.imageUrls.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Upload ${index}`}
                    className="max-w-[200px] w-full rounded-2xl object-contain shadow-lg border border-[var(--border-strong)]"
                  />
                ))}
              </div>
            )}
            {msg.content && (
              <div
                className={`prose ${settings.theme === "dark" ? "prose-invert" : ""} max-w-none highlight-strong-no-effect ${msg.role === "user" ? "prose-p:leading-relaxed" : "prose-p:leading-relaxed prose-pre:bg-[var(--bg-input)] prose-pre:border prose-pre:border-[var(--border-strong)] prose-pre:rounded-2xl"}`}
              >
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap m-0">{msg.content}</p>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      strong: ({ node, ...props }) => (
                        <strong
                          style={{ color: settings.secondaryColor }}
                          {...props}
                        />
                      ),
                      pre: ({ node, children, ...props }: any) => {
                        let isResposta = false;
                        let isMindmap = false;
                        let mindmapData = null;

                        React.Children.forEach(children, (child: any) => {
                          if (
                            React.isValidElement(child) &&
                            typeof (child.props as any).className === "string"
                          ) {
                            if (
                              (child.props as any).className.includes(
                                "language-resposta",
                              )
                            ) {
                              isResposta = true;
                            } else if (
                              (child.props as any).className.includes(
                                "language-mindmap",
                              )
                            ) {
                              isMindmap = true;
                              try {
                                mindmapData = JSON.parse(
                                  (child.props as any).children,
                                );
                              } catch (e) {
                                // Ignore parse errors during streaming
                              }
                            }
                          }
                        });

                        if (isResposta) {
                          return (
                            <RespostaOptions disabled={answersSubmitted} />
                          );
                        }

                        if (isMindmap) {
                          if (mindmapData) {
                            return (
                              <MindMap
                                data={mindmapData}
                                onFeedbackRequest={() => {
                                  setFeedbackType("like");
                                  setIsFeedbackModalOpen(true);
                                }}
                              />
                            );
                          } else {
                            return (
                              <div className="flex items-center justify-center p-8 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-strong)] my-4">
                                <div className="flex flex-col items-center gap-3">
                                  <div className="w-8 h-8 border-4 border-[var(--color-sec)] border-t-transparent rounded-full animate-spin"></div>
                                  <span className="text-[var(--text-muted)] font-medium">
                                    Gerando mapa mental...
                                  </span>
                                </div>
                              </div>
                            );
                          }
                        }

                        return <pre {...props}>{children}</pre>;
                      },
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
            )}

            {msg.role === "ai" &&
              msg.content?.includes("```resposta") &&
              !answersSubmitted && (
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      if (containerRef.current) {
                        const optionsContainers =
                          containerRef.current.querySelectorAll(
                            ".resposta-options",
                          ) as NodeListOf<HTMLDivElement>;
                        let allAnswered = true;
                        let answersText =
                          "Aqui estão minhas respostas para as questões acima:\n\n";

                        optionsContainers.forEach((container, index) => {
                          const selected =
                            container.getAttribute("data-selected");
                          if (!selected) {
                            allAnswered = false;
                          }
                          answersText += `Questão ${index + 1}: ${selected || "Não respondida"}\n\n`;
                        });

                        if (!allAnswered) {
                          const event = new CustomEvent("show-error", {
                            detail:
                              "Por favor, responda todas as questões antes de enviar.",
                          });
                          window.dispatchEvent(event);
                          return;
                        }

                        answersText +=
                          "Por favor, corrija minhas respostas, diga se estão certas ou erradas e explique o porquê.";
                        if (onSendAnswer) onSendAnswer(answersText);
                        setAnswersSubmitted(true);
                      }
                    }}
                    className="px-6 py-2.5 bg-[var(--color-sec)] text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <ArrowUp className="w-4 h-4" />
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
                <AlertTriangle className="w-4 h-4" />
                Erro Interno
              </button>
              <div className="relative">
                <button
                  onClick={() => setIsErrorHubOpen(!isErrorHubOpen)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-base)] transition-colors text-[var(--text-muted)]"
                >
                  {isErrorHubOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
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
                            onRetry(
                              previousUserMessage.content,
                              previousUserMessage.imageUrls
                                ? previousUserMessage.imageUrls.map(
                                    (url: string) => ({
                                      url,
                                      mimeType: "image/jpeg",
                                    }),
                                  )
                                : [],
                            );
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
                        <img
                          src="/logo.png"
                          className="w-4 h-4 rounded-full object-contain"
                          alt=""
                        />
                        Trocar modelo
                      </button>
                      <button
                        onClick={() => {
                          setIsErrorHubOpen(false);
                          if (previousUserMessage) {
                            navigator.clipboard.writeText(
                              previousUserMessage.content,
                            );
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
                    <p className="mb-2">
                      Ocorreu um problema ao processar sua solicitação. Por
                      favor, volte mais tarde ou tente novamente.
                    </p>
                    <p className="opacity-80 font-mono text-[10px] break-all mb-2">
                      {msg.errorMessage}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          msg.errorMessage || "Erro desconhecido",
                        );
                        setIsErrorCopied(true);
                        setTimeout(() => setIsErrorCopied(false), 2000);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors text-[10px] font-medium"
                    >
                      {isErrorCopied ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}{" "}
                      {isErrorCopied ? "Copiado!" : "Copiar erro"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {msg.role === "ai" && (
            <div className="mt-2 flex items-center gap-1">
              <button
                onClick={() => togglePinMessage(sessionId, msg.id)}
                className={`p-1.5 rounded-lg transition-colors ${msg.isPinned ? "text-[var(--color-sec)] bg-[var(--bg-surface)]" : "text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)]"}`}
                title={
                  msg.isPinned
                    ? "Desmarcar como importante"
                    : "Marcar como importante"
                }
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)]"
                title="Copiar mensagem"
              >
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 text-[var(--color-sec)]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              {!hasSubmittedFeedback && (
                <>
                  <button
                    onClick={() => {
                      setFeedbackType("like");
                      setIsFeedbackModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg transition-colors text-[var(--text-muted)] hover:text-green-500 hover:bg-green-500/10"
                    title="A resposta foi útil"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setFeedbackType("dislike");
                      setIsFeedbackModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg transition-colors text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10"
                    title="A resposta não foi útil"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              {hasSubmittedFeedback && (
                <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 ml-1">
                  <Check className="w-3 h-3 text-green-500" />
                  Obrigado pelo feedback!
                </span>
              )}
            </div>
          )}
        </div>

        {createPortal(
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
                      {feedbackType === "like" ? (
                        <ThumbsUp className="w-5 h-5 text-green-500" />
                      ) : (
                        <ThumbsDown className="w-5 h-5 text-red-500" />
                      )}
                      {feedbackType === "like"
                        ? "O que a IA acertou?"
                        : "O que a IA errou?"}
                    </h3>
                    <button
                      onClick={() => setIsFeedbackModalOpen(false)}
                      className="p-2 hover:bg-[var(--bg-surface)] rounded-full transition-colors text-[var(--text-muted)] hover:text-[var(--text-base)]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-[var(--text-muted)] mb-4">
                      Seu feedback ajuda a melhorar o modelo{" "}
                      <span className="font-medium text-[var(--text-base)]">
                        {aiModels?.find((m) => m.key === msg.model)?.name ||
                          msg.model ||
                          "A.S"}
                      </span>
                      .
                    </p>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder={
                        feedbackType === "like"
                          ? "Ex: A resposta foi clara e direta ao ponto..."
                          : "Ex: A IA não entendeu o contexto ou deu uma informação errada..."
                      }
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
          </AnimatePresence>,
          document.body,
        )}
      </motion.div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.msg === nextProps.msg &&
      prevProps.sessionId === nextProps.sessionId &&
      prevProps.settings === nextProps.settings &&
      prevProps.isHighlightMode === nextProps.isHighlightMode &&
      prevProps.isEraserMode === nextProps.isEraserMode &&
      prevProps.highlightColor === nextProps.highlightColor &&
      prevProps.previousUserMessage === nextProps.previousUserMessage &&
      prevProps.aiModels === nextProps.aiModels
    );
  },
);

const GroupMessageItem = React.memo(
  ({ msg, settings, isCurrentUser, onFeedbackRequest }: any) => {
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [feedbackType, setFeedbackType] = useState<"like" | "dislike" | null>(
      null,
    );
    const [feedbackText, setFeedbackText] = useState("");

    const handleFeedbackSubmit = () => {
      setIsFeedbackModalOpen(false);
      const event = new CustomEvent("show-error", {
        detail: "Feedback enviado com sucesso! Obrigado.",
      });
      window.dispatchEvent(event);
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex gap-4 ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}
      >
        <div className="flex-shrink-0">
          {msg.senderId === "ai" ? (
            <div className="w-10 h-10 rounded-full bg-[var(--color-sec)] flex items-center justify-center shadow-md">
              <Logo className="w-6 h-6 text-white" />
            </div>
          ) : msg.senderPhotoURL ? (
            <img
              src={msg.senderPhotoURL}
              alt={msg.senderName}
              className="w-10 h-10 rounded-full object-cover shadow-md"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[var(--bg-surface)] border border-[var(--border-strong)] flex items-center justify-center shadow-md">
              <User className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
          )}
        </div>
        <div
          className={`flex flex-col max-w-[90%] md:max-w-[75%] ${isCurrentUser ? "items-end" : "items-start"}`}
        >
          <span className="text-xs text-[var(--text-muted)] mb-1 font-medium px-1">
            {msg.senderName}
          </span>
          <div
            className={`p-4 rounded-2xl w-full ${
              isCurrentUser
                ? "rounded-tr-sm border border-[var(--border-subtle)]"
                : msg.senderId === "ai"
                  ? "bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-tl-sm text-[var(--text-base)]"
                  : "bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-tl-sm text-[var(--text-base)]"
            }`}
            style={
              isCurrentUser
                ? {
                    backgroundColor:
                      settings.userMessageColor || "var(--bg-surface)",
                    color: "var(--text-base)",
                  }
                : {}
            }
          >
            {msg.imageUrls && msg.imageUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {msg.imageUrls.map((url: string, i: number) => (
                  <img
                    key={i}
                    src={url}
                    alt="Attachment"
                    className="max-w-xs rounded-lg object-cover"
                  />
                ))}
              </div>
            )}
            <div
              className={`prose ${settings.theme === "dark" ? "prose-invert" : ""} max-w-none break-words prose-p:leading-relaxed prose-pre:bg-[var(--bg-input)] prose-pre:border prose-pre:border-[var(--border-strong)] prose-pre:rounded-2xl`}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  strong: ({ node, ...props }) => (
                    <strong
                      style={{ color: settings.secondaryColor }}
                      {...props}
                    />
                  ),
                  pre: ({ node, children, ...props }: any) => {
                    let isResposta = false;
                    let isMindmap = false;
                    let mindmapData = null;

                    React.Children.forEach(children, (child: any) => {
                      if (
                        React.isValidElement(child) &&
                        typeof (child.props as any).className === "string"
                      ) {
                        if (
                          (child.props as any).className.includes(
                            "language-resposta",
                          )
                        ) {
                          isResposta = true;
                        } else if (
                          (child.props as any).className.includes(
                            "language-mindmap",
                          )
                        ) {
                          isMindmap = true;
                          try {
                            mindmapData = JSON.parse(
                              (child.props as any).children,
                            );
                          } catch (e) {
                            // Ignore parse errors during streaming
                          }
                        }
                      }
                    });

                    if (isResposta) {
                      return <RespostaOptions disabled={false} />;
                    }

                    if (isMindmap) {
                      if (mindmapData) {
                        return (
                          <MindMap
                            data={mindmapData}
                            onFeedbackRequest={() => {
                              setFeedbackType("like");
                              setIsFeedbackModalOpen(true);
                            }}
                          />
                        );
                      } else {
                        return (
                          <div className="flex items-center justify-center p-8 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-strong)] my-4">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-8 h-8 border-4 border-[var(--color-sec)] border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-[var(--text-muted)] font-medium">
                                Gerando mapa mental...
                              </span>
                            </div>
                          </div>
                        );
                      }
                    }

                    return <pre {...props}>{children}</pre>;
                  },
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {createPortal(
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
                      {feedbackType === "like" ? (
                        <ThumbsUp className="w-5 h-5 text-green-500" />
                      ) : (
                        <ThumbsDown className="w-5 h-5 text-red-500" />
                      )}
                      {feedbackType === "like"
                        ? "O que a IA acertou?"
                        : "O que a IA errou?"}
                    </h3>
                    <button
                      onClick={() => setIsFeedbackModalOpen(false)}
                      className="p-2 hover:bg-[var(--bg-surface)] rounded-full transition-colors text-[var(--text-muted)] hover:text-[var(--text-base)]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-[var(--text-muted)] mb-4">
                      Seu feedback ajuda a melhorar o modelo.
                    </p>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder={
                        feedbackType === "like"
                          ? "Ex: A resposta foi clara e direta ao ponto..."
                          : "Ex: A IA não entendeu o contexto ou deu uma informação errada..."
                      }
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
          </AnimatePresence>,
          document.body,
        )}
      </motion.div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.msg === nextProps.msg &&
      prevProps.settings === nextProps.settings &&
      prevProps.isCurrentUser === nextProps.isCurrentUser
    );
  },
);

// Local forbidden words removed to use central moderation service with anti-bypass support.

const TextSelectionToolbar = ({
  onCopy,
  onPin,
  onExplain,
  onSearch,
  onCompare,
  position,
  isSearchModel,
}: any) => {
  if (!position) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.9 }}
      className="fixed z-[100] bg-black text-white rounded-xl shadow-2xl border border-zinc-800 flex items-center p-1 gap-1"
      style={{
        top: position.y + 20,
        left: position.x,
        transform: "translateX(-50%)",
      }}
    >
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-black"></div>
      <button
        onClick={onCopy}
        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        title="Copiar"
      >
        <Copy className="w-4 h-4" />
      </button>
      <button
        onClick={onPin}
        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        title="Fixar"
      >
        <Pin className="w-4 h-4" />
      </button>
      {!isSearchModel && (
        <button
          onClick={onExplain}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          title="Explicar"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={onSearch}
        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        title="Pesquisar no Google"
      >
        <Search className="w-4 h-4" />
      </button>
      {!isSearchModel && (
        <button
          onClick={onCompare}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          title="Comparar Modelos"
        >
          <GitCompare className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
};

const HoldButton = ({
  onConfirm,
  onCancel,
  children,
  className,
  holdTime = 2000,
}: any) => {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  const startHold = () => {
    setIsHolding(true);
    setProgress(0);

    // Initial light vibration
    if (navigator.vibrate) navigator.vibrate(5);

    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min((elapsed / holdTime) * 100, 100));

      // Increasing vibration intensity (duration), but smooth/not too strong
      if (navigator.vibrate) {
        const intensity = 2 + Math.floor((elapsed / holdTime) * 8);
        navigator.vibrate(intensity);
      }
    }, 100);

    timerRef.current = setTimeout(() => {
      clearInterval(intervalRef.current!);
      setProgress(100);
      onConfirm();
      setIsHolding(false);
      // Success vibration pattern
      if (navigator.vibrate) navigator.vibrate([15, 30, 15]);
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
    // Stop vibration immediately
    if (navigator.vibrate) navigator.vibrate(0);
  };

  return (
    <button
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      onTouchCancel={cancelHold}
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

const ImageUpload = ({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (val: string) => void;
  label: string;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
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
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0, width, height);

            // Compress to JPEG with 0.8 quality
            const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
            onChange(dataUrl);
          };
          img.src = e.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    } else {
      alert("Por favor, selecione uma imagem válida (PNG, JPG, etc).");
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
      <label className="block text-sm font-medium text-[var(--text-muted)]">
        {label}
      </label>
      <div className="flex flex-col gap-3">
        {value && (
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[var(--border-strong)] mx-auto">
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => onChange("")}
              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        )}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${isDragging ? "border-[var(--color-sec)] bg-[var(--color-sec)]/10" : "border-[var(--border-strong)] hover:border-[var(--text-muted)]"}`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) =>
              e.target.files?.[0] && handleFile(e.target.files[0])
            }
            accept="image/*"
            className="hidden"
          />
          <ImageIcon className="w-6 h-6 mx-auto mb-2 text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">
            Arraste uma imagem ou clique para selecionar
          </p>
        </div>
      </div>
    </div>
  );
};

export default function ChatPage() {
  const navigate = useNavigate();
  const [historyLoadStatus, setHistoryLoadStatus] = useState<
    "loading" | "success" | "loaded" | "error"
  >("loading");
  const isElectronApp =
    typeof navigator !== "undefined" &&
    navigator.userAgent.toLowerCase().includes("electron");

  const [remoteVersion, setRemoteVersion] = useState<number | null>(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const currentLocalVersion = 1.0;

  // Persist admin UI photos via localStorage
  const [persistedBefore, setPersistedBefore] = useState<string | null>(() => {
    try {
      return localStorage.getItem("broxa_ui_before") || null;
    } catch (_e) {
      return null;
    }
  });
  const [persistedAfter, setPersistedAfter] = useState<string | null>(() => {
    try {
      return localStorage.getItem("broxa_ui_after") || null;
    } catch (_e) {
      return null;
    }
  });

  useEffect(() => {
    if (isElectronApp) {
      const checkUpdate = async () => {
        try {
          const res = await fetch(`/version.json?t=${Date.now()}`);
          if (res.ok) {
            const data = await res.json();
            if (data.version && data.version > currentLocalVersion) {
              setRemoteVersion(data.version);
              setShowUpdateBanner(true);
            }
          }
        } catch (e) {
          console.log("Could not check version");
        }
      };
      checkUpdate();
      const interval = setInterval(checkUpdate, 60000);
      return () => clearInterval(interval);
    }
  }, [isElectronApp]);

  useEffect(() => {
    setHistoryLoadStatus("loaded");
  }, []);

  const {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    currentSession,
    createSession,
    addMessage,
    updateMessage,
    deleteMessage,
    deleteSession,
    togglePinSession,
    togglePinMessage,
    addPinnedText,
    removePinnedText,
    addStroke,
    setStrokes,
    updateSessionTitle,
    clearSessions,
  } = useChatStore();
  const { settings, updateSettings } = useSettingsStore();
  const {
    groups,
    createGroup,
    joinGroup,
    renameGroup,
    updateGroupStreak,
    updateGroup,
    removeMember,
    deleteGroup,
    updateGroupMessage,
  } = useGroupStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinGroupId = params.get("joinGroup");
    const inviterName = params.get("inviterName") || "Um usuário";

    if (joinGroupId && auth.currentUser) {
      // Remove parameter from URL without reloading
      window.history.replaceState({}, document.title, window.location.pathname);

      const checkGroup = async () => {
        try {
          const groupRef = doc(db, "groups", joinGroupId);
          const groupSnap = await getDoc(groupRef);

          if (groupSnap.exists()) {
            const groupData = groupSnap.data();
            if (
              groupData.members &&
              groupData.members.includes(auth.currentUser!.uid)
            ) {
              // Already a member
              setSelectedGroupId(joinGroupId);
              setCurrentSessionId(null);
            } else {
              // Show invite modal
              setInviteModalData({
                groupId: joinGroupId,
                groupName: groupData.name,
                inviterName: inviterName,
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
  const [newGroupName, setNewGroupName] = useState("");
  const [groupCreationStep, setGroupCreationStep] = useState<
    "name" | "privacy"
  >("name");
  const [groupPrivacy, setGroupPrivacy] = useState<"public" | "private">(
    "private",
  );
  const [groupInviteLink, setGroupInviteLink] = useState("");
  const [isShowInviteLinkModal, setIsShowInviteLinkModal] = useState(false);
  const [isPublicGroupsOpen, setIsPublicGroupsOpen] = useState(false);
  const [isFriendRequestsOpen, setIsFriendRequestsOpen] = useState(false);
  const [isFriendsListOpen, setIsFriendsListOpen] = useState(false);
  const [isFriendSearchModalOpen, setIsFriendSearchModalOpen] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [friendSearchResults, setFriendSearchResults] = useState<
    { uid: string; displayName: string; photoURL: string | null }[]
  >([]);
  const [pendingSentRequests, setPendingSentRequests] = useState<Set<string>>(
    new Set(),
  );
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isBlockConfirmModalOpen, setIsBlockConfirmModalOpen] = useState(false);
  const [blockTargetId, setBlockTargetId] = useState("");
  const [blockPhrase, setBlockPhrase] = useState("");
  const [blockInput, setBlockInput] = useState("");
  const [isRemoveFriendConfirm, setIsRemoveFriendConfirm] = useState(false);
  const [removeFriendId, setRemoveFriendId] = useState("");
  const [isRenameGroupModalOpen, setIsRenameGroupModalOpen] = useState(false);
  const [renameGroupId, setRenameGroupId] = useState<string | null>(null);
  const [newRenameValue, setNewRenameValue] = useState("");
  const [isGroupSettingsModalOpen, setIsGroupSettingsModalOpen] =
    useState(false);
  const [isGroupMembersModalOpen, setIsGroupMembersModalOpen] = useState(false);
  const [groupSettingsData, setGroupSettingsData] = useState<{
    name: string;
    photoURL: string;
    systemInstruction: string;
  }>({ name: "", photoURL: "", systemInstruction: "" });
  const [isGroupHeaderPopoverOpen, setIsGroupHeaderPopoverOpen] =
    useState(false);
  const groupHeaderPopoverRef = useRef<HTMLDivElement>(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState("");
  const [isMobileProfilePopoverOpen, setIsMobileProfilePopoverOpen] =
    useState(false);
  const mobileProfilePopoverRef = useRef<HTMLDivElement>(null);
  const [inviteModalData, setInviteModalData] = useState<{
    groupId: string;
    groupName: string;
    inviterName: string;
  } | null>(null);
  const [confirmModalData, setConfirmModalData] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const memberDetails = useMemo(() => {
    const details: Record<string, { name: string; photoURL: string | null }> =
      {};
    groupMessages.forEach((msg) => {
      if (msg.senderId !== "ai" && !details[msg.senderId]) {
        details[msg.senderId] = {
          name: msg.senderName,
          photoURL: msg.senderPhotoURL || null,
        };
      }
    });
    return details;
  }, [groupMessages]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default to false on mobile for better UX
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [selectedImages, setSelectedImages] = useState<
    { url: string; mimeType: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [textSelection, setTextSelection] = useState<{
    text: string;
    position: { x: number; y: number };
  } | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showSettingsConfirm, setShowSettingsConfirm] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [tempSettings, setTempSettings] = useState(settings);
  const [isPinnedMessagesOpen, setIsPinnedMessagesOpen] = useState(false);
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [isEraserMode, setIsEraserMode] = useState(false);
  const [highlightColor, setHighlightColor] = useState("#eab308");
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [isOverloaded, setIsOverloaded] = useState(false);
  const [undoStack, setUndoStack] = useState<
    { messageId: string; stroke: any }[]
  >([]);
  const [redoStack, setRedoStack] = useState<
    { messageId: string; stroke: any }[]
  >([]);
  const [selectedModel, setSelectedModel] = useState<
    "thinking" | "fast" | "search" | "as" | "toto"
  >("thinking");
  const [isTotoVerificationOpen, setIsTotoVerificationOpen] = useState(false);
  const [isTotoHelpExpanded, setIsTotoHelpExpanded] = useState(false);
  const [totoRecordingTime, setTotoRecordingTime] = useState(0);
  const [askTotoAgain, setAskTotoAgain] = useState(false);
  const [totoHoldProgress, setTotoHoldProgress] = useState(0);
  const totoHoldIntervalRef = useRef<any>(null);
  const [isExtensionDetected, setIsExtensionDetected] = useState<
    boolean | null
  >(null);
  const [isTotoAutoMode, setIsTotoAutoMode] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [totoStream, setTotoStream] = useState<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const totoIntervalRef = useRef<any>(null);
  const hasShownRoleNotificationRef = useRef(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const [isDevModelsModalOpen, setIsDevModelsModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [shakeInput, setShakeInput] = useState(false);
  const [inputMaxReached, setInputMaxReached] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(60);
  const [newChatTimestamps, setNewChatTimestamps] = useState<number[]>([]);
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [sessionToRename, setSessionToRename] = useState<any | null>(null);
  const [newSessionName, setNewSessionName] = useState("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalStep, setAuthModalStep] = useState<
    | "email"
    | "password"
    | "signup"
    | "otp"
    | "create_google_password"
    | undefined
  >(undefined);
  const [authModalPassword, setAuthModalPassword] = useState<
    string | undefined
  >(undefined);
  const [isOutdated, setIsOutdated] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [logoutInput, setLogoutInput] = useState("");
  const [logoutPhrase, setLogoutPhrase] = useState("");
  const [groupLeavePhrase, setGroupLeavePhrase] = useState("");
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);

  // Gallery state
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const closeGallery = () => setIsGalleryOpen(false);
  const [isGroupsScreenOpen, setIsGroupsScreenOpen] = useState(false);
  const [groupsScreenSearch, setGroupsScreenSearch] = useState("");
  const [galleryFilter, setGalleryFilter] = useState<
    "all" | "photos" | "mindmaps"
  >("all");
  const [gallerySearch, setGallerySearch] = useState("");
  const [galleryView, setGalleryView] = useState<"grid" | "list">("grid");
  const [selectedGalleryItems, setSelectedGalleryItems] = useState<string[]>(
    [],
  );
  const [galleryItemToDelete, setGalleryItemToDelete] = useState<string | null>(
    null,
  );
  const [unlockedFeature, setUnlockedFeature] = useState<{
    name: string;
    days: number;
  } | null>(null);
  const [showGuestWarning, setShowGuestWarning] = useState(false);
  const shownFeatureRef = useRef<Set<string>>(new Set());
  const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [groupToLeaveId, setGroupToLeaveId] = useState<string | null>(null);
  const [leaveGroupName, setLeaveGroupName] = useState("");
  const [groupLeaveInput, setGroupLeaveInput] = useState("");
  const [isGroupLeaveModalOpen, setIsGroupLeaveModalOpen] = useState(false);
  const [mobileGroupsOpen, setMobileGroupsOpen] = useState(true);
  const [settingsTab, setSettingsTab] = useState("geral");
  const [tempDisplayName, setTempDisplayName] = useState("");
  const [tempPhotoURL, setTempPhotoURL] = useState("");
  const [activeSettingsTab, setActiveSettingsTab] = useState<
    "profile" | "security"
  >("profile");
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("broxa_ai_drafts");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Security Banner & Warning States
  const [isSecurityBannerDismissed, setIsSecurityBannerDismissed] = useState(
    () => {
      try {
        const lastDismissed = localStorage.getItem(
          "security_banner_dismissed_time",
        );
        if (lastDismissed) {
          const timeDiff = Date.now() - parseInt(lastDismissed, 10);
          return timeDiff < 86400000;
        }
      } catch (e) {
        console.warn("localStorage is not available", e);
      }
      return false;
    },
  );
  const [showSuspensionWarning, setShowSuspensionWarning] = useState(false);
  const [userIp, setUserIp] = useState<string | null>(null);
  const [guestMessageCount, setGuestMessageCount] = useState(0);
  const [showGuestLimitPopup, setShowGuestLimitPopup] = useState(false);

  useEffect(() => {
    const fetchIp = async () => {
      try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        setUserIp(data.ip);

        // Fetch usage count for this IP
        const today = new Date().toISOString().split("T")[0];
        const ipId = data.ip.replace(/\./g, "_");
        const usageRef = doc(db, "guestUsage", `${ipId}_${today}`);
        const usageSnap = await getDoc(usageRef);
        if (usageSnap.exists()) {
          setGuestMessageCount(usageSnap.data().count || 0);
        }
      } catch (e) {
        console.error("Failed to fetch IP/usage:", e);
      }
    };
    if (!auth.currentUser) {
      fetchIp();
    }
  }, [currentUser]);

  // Sync drafts to localStorage
  useEffect(() => {
    localStorage.setItem("broxa_ai_drafts", JSON.stringify(drafts));
  }, [drafts]);

  // Click-outside handler for model dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isModelDropdownOpen &&
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(e.target as Node)
      ) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isModelDropdownOpen]);

  // Profile popover
  const [isProfilePopoverOpen, setIsProfilePopoverOpen] = useState(false);
  const profilePopoverRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isProfilePopoverOpen &&
        profilePopoverRef.current &&
        !profilePopoverRef.current.contains(e.target as Node)
      ) {
        setIsProfilePopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfilePopoverOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isGroupHeaderPopoverOpen &&
        groupHeaderPopoverRef.current &&
        !groupHeaderPopoverRef.current.contains(e.target as Node)
      ) {
        setIsGroupHeaderPopoverOpen(false);
      }
      if (
        isMobileProfilePopoverOpen &&
        mobileProfilePopoverRef.current &&
        !mobileProfilePopoverRef.current.contains(e.target as Node)
      ) {
        setIsMobileProfilePopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isGroupHeaderPopoverOpen, isMobileProfilePopoverOpen]);

  // Load draft when switching session/group
  useEffect(() => {
    const id = selectedGroupId || currentSessionId;
    if (id && drafts[id]) {
      setInput(drafts[id]);
    } else {
      setInput("");
    }
  }, [currentSessionId, selectedGroupId]);

  // Save draft on input change
  useEffect(() => {
    const id = selectedGroupId || currentSessionId;
    if (id) {
      setDrafts((prev) => {
        if (input === prev[id]) return prev;
        const newDrafts = { ...prev };
        if (input.trim()) {
          newDrafts[id] = input;
        } else {
          delete newDrafts[id];
        }
        return newDrafts;
      });
    }
  }, [input, currentSessionId, selectedGroupId]);

  // Security Tab Form States
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isSecurityLoading, setIsSecurityLoading] = useState(false);
  const [securityOtpStep, setSecurityOtpStep] = useState(false);

  const isGoogleUserWithoutPassword = useMemo(() => {
    if (!currentUser) return false;
    const hasGoogle = currentUser.providerData.some(
      (p) => p.providerId === "google.com",
    );
    const hasPassword = currentUser.providerData.some(
      (p) => p.providerId === "password",
    );
    return hasGoogle && !hasPassword;
  }, [currentUser]);

  useEffect(() => {
    if (isUserSettingsOpen && isGoogleUserWithoutPassword) {
      setActiveSettingsTab("security");
    } else if (isUserSettingsOpen) {
      setActiveSettingsTab("profile");
    }
  }, [isUserSettingsOpen, isGoogleUserWithoutPassword]);

  const {
    seenReleaseNotes,
    markAsSeen,
    userRole,
    hasSeenRoleNotification,
    markRoleNotificationAsSeen,
    streakDays,
    lastMessageDate,
    freezesAvailable,
    updateLastMessageDate,
    checkStreak,
    displayName,
    photoURL,
    hasSetProfile,
    updateProfile,
    unlockedFeatures,
    markFeatureAsSeen,
    isUserLoaded,
    violationsCount,
    isBanned,
    appealStatus,
    incrementViolations,
    submitAppeal,
  } = useUserStore();

  const [isIpBanned, setIsIpBanned] = useState(false);

  // Sync ban state to local storage to prevent flashes
  useEffect(() => {
    if (isUserLoaded) {
      if (isBanned) {
        localStorage.setItem("broxa_is_banned", "true");
      } else {
        localStorage.removeItem("broxa_is_banned");
      }
    }
  }, [isBanned, isUserLoaded]);

  const localIsBanned = localStorage.getItem("broxa_is_banned") === "true";
  const effectiveIsBanned = isBanned || localIsBanned;

  useEffect(() => {
    const checkIpBan = async () => {
      try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        const ip = data.ip;
        const ipId = ip.replace(/\./g, "_");
        const ipRef = doc(db, "bannedIPs", ipId);
        const ipSnap = await getDoc(ipRef);
        if (ipSnap.exists() && ipSnap.data().isPermanent) {
          setIsIpBanned(true);
        }
      } catch (e) {
        console.error("IP Check failed", e);
      }
    };
    checkIpBan();
  }, []);

  const playIphoneSound = useCallback(() => {
    try {
      const audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.1, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };
      // Simulação do Tri-tone do iPhone
      const now = audioCtx.currentTime;
      playTone(1050, now, 0.15);
      playTone(850, now + 0.15, 0.15);
      playTone(1250, now + 0.3, 0.3);
    } catch (e) {
      console.error("Audio failed", e);
    }
  }, []);

  const stopTotoAuto = useCallback(() => {
    if (totoIntervalRef.current) clearInterval(totoIntervalRef.current);
    if (totoHoldIntervalRef.current) clearInterval(totoHoldIntervalRef.current);
    if (totoStream) {
      totoStream.getTracks().forEach((track) => track.stop());
    }
    setTotoStream(null);
    setIsTotoAutoMode(false);
  }, [totoStream]);

  const startTotoHold = () => {
    setTotoHoldProgress(0);
    totoHoldIntervalRef.current = setInterval(() => {
      setTotoHoldProgress((prev) => {
        if (prev >= 100) {
          stopTotoAuto();
          clearInterval(totoHoldIntervalRef.current!);
          return 0;
        }
        return prev + 10;
      });
    }, 100);
  };

  const endTotoHold = () => {
    if (totoHoldIntervalRef.current) clearInterval(totoHoldIntervalRef.current);
    setTotoHoldProgress(0);
  };

  const manualCaptureAndAskToto = async () => {
    if (!totoStream || !canvasRef.current || isLoading) return;
    try {
      const video = document.createElement("video");
      video.srcObject = totoStream;
      await video.play();

      const canvas = canvasRef.current;
      canvas.width = Math.min(video.videoWidth, 1280);
      canvas.height = (video.videoHeight / video.videoWidth) * canvas.width;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          async (blob) => {
            if (blob) {
              await handleSend(
                "[TOTO_AUTO] Você é o Totó, assistente especializado em exercícios de inglês. Analise esta captura de tela e:\n1. Se houver questões/exercícios de inglês legíveis: resolva cada um de forma clara e objetiva, explicando o raciocínio em português.\n2. Se houver texto em inglês para traduzir: traduza para o português.\n3. Se a imagem não contiver conteúdo legível relacionado a exercícios: responda apenas 'Não consegui identificar nenhuma questão na imagem enviada.'\nNão invente informações que não estão na imagem. Não comente sobre elementos da interface (barra de tarefas, navegador, etc.). Foque APENAS no conteúdo educacional visível.",
                [{ url: URL.createObjectURL(blob), mimeType: "image/jpeg" }],
                "toto",
              );
              setAskTotoAgain(true);
              stopTotoAuto();
            }
          },
          "image/jpeg",
          0.5,
        );
      }
      video.pause();
      video.srcObject = null;
    } catch (err) {
      console.error("Capture failed", err);
    }
  };

  const startTotoWeb = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
      });
      setTotoStream(stream);
      setIsTotoAutoMode(true);
      setIsTotoVerificationOpen(false);
      setTotoRecordingTime(0);
      setAskTotoAgain(false);
      setTotoHoldProgress(0);

      stream.getVideoTracks()[0].onended = () => stopTotoAuto();
    } catch (err) {
      console.error("Failed to share screen", err);
    }
  };

  useEffect(() => {
    if (selectedModel === "toto" && !isTotoAutoMode && !askTotoAgain) {
      setIsTotoVerificationOpen(true);
    }
  }, [selectedModel, isTotoAutoMode, askTotoAgain]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (isTotoAutoMode && totoStream) {
      if (!isTabVisible) {
        totoIntervalRef.current = setInterval(() => {
          setTotoRecordingTime((prev) => {
            if (prev >= 30) {
              stopTotoAuto();
              return 60;
            }
            return prev + 1;
          });
        }, 1000);
      } else {
        if (totoIntervalRef.current) clearInterval(totoIntervalRef.current);
      }
    } else {
      if (totoIntervalRef.current) clearInterval(totoIntervalRef.current);
    }
    return () => {
      if (totoIntervalRef.current) clearInterval(totoIntervalRef.current);
    };
  }, [isTotoAutoMode, totoStream, isTabVisible]);

  const prevStreakRef = useRef(streakDays);

  useEffect(() => {
    if (auth.currentUser && lastMessageDate) {
      checkStreak().then((broken) => {
        if (broken) {
          setErrorToast("Sua ofensiva zerou... 😢");
          setToastType("error");
        }
      });
    }
  }, [auth.currentUser, lastMessageDate, checkStreak]);
  useEffect(() => {
    let unsubscribe: () => void = () => {};

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        unsubscribe();
        return;
      }

      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        orderBy("timestamp", "desc"),
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const data = change.doc.data();
              if (data.userId === user.uid && !data.read) {
                showError(data.message, "error");
                // Mark as read
                updateDoc(doc(db, "notifications", change.doc.id), {
                  read: true,
                }).catch(console.error);
              }
            }
          });
        },
        (error) => {
          console.error("Error fetching notifications:", error);
        },
      );
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
    const q = query(
      collection(db, `groups/${selectedGroupId}/messages`),
      orderBy("timestamp", "asc"),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as GroupMessage,
        );
        setGroupMessages(msgs);
        setTimeout(scrollToBottom, 100);
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `groups/${selectedGroupId}/messages`,
        );
      },
    );
    return () => unsubscribe();
  }, [selectedGroupId]);

  // Friend requests subscription
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const q = query(
      collection(db, "users", uid, "friendRequests"),
      orderBy("timestamp", "desc"),
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const reqs = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as FriendRequest,
        );
        setFriendRequests(reqs);
      },
      () => {},
    );
  }, []);

  // Friends subscription
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const q = query(
      collection(db, "users", uid, "friends"),
      orderBy("timestamp", "desc"),
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const fr = snapshot.docs.map(
          (d) =>
            ({ id: d.id, ...d.data() }) as {
              userId: string;
              displayName: string;
              photoURL: string | null;
            },
        );
        setFriends(fr);
      },
      () => {},
    );
  }, []);

  // Track sent requests in local state
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const q = query(collection(db, "users", uid, "sentRequests"));
    return onSnapshot(
      q,
      (snapshot) => {
        const ids = new Set(snapshot.docs.map((d) => d.id));
        setPendingSentRequests(ids);
      },
      () => {},
    );
  }, []);

  const searchUsersByDisplayName = async (queryText: string) => {
    if (!queryText.trim() || queryText.trim().length < 2) {
      setFriendSearchResults([]);
      return;
    }
    try {
      const usersSnap = await getDocs(query(collection(db, "users")));
      const results: {
        uid: string;
        displayName: string;
        photoURL: string | null;
      }[] = [];
      const currentUid = auth.currentUser?.uid;
      usersSnap.forEach((docSnap) => {
        if (docSnap.id === currentUid) return;
        const data = docSnap.data();
        if (
          data.displayName &&
          data.displayName.toLowerCase().includes(queryText.toLowerCase())
        ) {
          const alreadyFriend = friends.some((f) => f.userId === docSnap.id);
          if (
            !alreadyFriend &&
            !pendingSentRequests.has(docSnap.id) &&
            !friendRequests.some((r) => r.from === docSnap.id)
          ) {
            results.push({
              uid: docSnap.id,
              displayName: data.displayName,
              photoURL: data.photoURL || null,
            });
          }
        }
      });
      setFriendSearchResults(results);
    } catch (e) {
      console.error("Search users error:", e);
    }
  };

  const sendFriendRequest = async (targetId: string) => {
    try {
      const fromUid = auth.currentUser!.uid;
      await setDoc(doc(db, "users", targetId, "friendRequests", fromUid), {
        from: fromUid,
        to: targetId,
        displayName: displayName || auth.currentUser?.displayName || "Usuário",
        photoURL: photoURL || auth.currentUser?.photoURL || null,
        timestamp: Date.now(),
      });
      await setDoc(doc(db, "users", fromUid, "sentRequests", targetId), {
        to: targetId,
        timestamp: Date.now(),
      });
      setFriendSearchResults((prev) => prev.filter((u) => u.uid !== targetId));
      setPendingSentRequests((prev) => new Set([...prev, targetId]));
      setFriendSearchQuery("");
    } catch (e) {
      console.error("Send request error:", e);
    }
  };

  const cancelFriendRequest = async (targetId: string) => {
    try {
      const fromUid = auth.currentUser!.uid;
      const ref = doc(db, "users", targetId, "friendRequests", fromUid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await setDoc(ref, { cancelled: true, ...snap.data() }, { merge: true });
      }
      await deleteDoc(doc(db, "users", fromUid, "sentRequests", targetId));
      setPendingSentRequests((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    } catch (e) {
      console.error("Cancel request error:", e);
    }
  };

  const acceptFriendRequest = async (fromUid: string) => {
    try {
      const myUid = auth.currentUser!.uid;
      const req = friendRequests.find((r) => r.from === fromUid);
      if (!req) return;
      // Add to my friends
      await setDoc(doc(db, "users", myUid, "friends", fromUid), {
        userId: fromUid,
        displayName: req.displayName,
        photoURL: req.photoURL,
        timestamp: Date.now(),
      });
      // Add to their friends (me as friend back)
      await setDoc(doc(db, "users", fromUid, "friends", myUid), {
        userId: myUid,
        displayName: displayName || auth.currentUser?.displayName || "Usuário",
        photoURL: photoURL || auth.currentUser?.photoURL || null,
        timestamp: Date.now(),
      });
      // Remove request
      await deleteDoc(doc(db, "users", myUid, "friendRequests", fromUid));
      // Also clean sentRequests on their side
      await deleteDoc(doc(db, "users", fromUid, "sentRequests", myUid));
    } catch (e) {
      console.error("Accept request error:", e);
    }
  };

  const rejectFriendRequest = async (fromUid: string) => {
    try {
      const myUid = auth.currentUser!.uid;
      await deleteDoc(doc(db, "users", myUid, "friendRequests", fromUid));
      await deleteDoc(doc(db, "users", fromUid, "sentRequests", myUid));
    } catch (e) {
      console.error("Reject request error:", e);
    }
  };

  const removeFriend = async (friendId: string) => {
    try {
      const myUid = auth.currentUser!.uid;
      await deleteDoc(doc(db, "users", myUid, "friends", friendId));
      await deleteDoc(doc(db, "users", friendId, "friends", myUid));
    } catch (e) {
      console.error("Remove friend error:", e);
    }
  };

  const hasShownProfileSetupRef = useRef(false);
  useEffect(() => {
    // Only show profile setup for users without a nickname (new users)
    const hasNickname = !!displayName || !!auth.currentUser?.displayName;
    if (
      isUserLoaded &&
      auth.currentUser &&
      !hasNickname &&
      hasSetProfile === false &&
      !isProfileSetupOpen &&
      !hasShownProfileSetupRef.current
    ) {
      hasShownProfileSetupRef.current = true;
      setIsProfileSetupOpen(true);
      setTempDisplayName(displayName || auth.currentUser.displayName || "");
      setTempPhotoURL(photoURL || auth.currentUser.photoURL || "");
    }
  }, [isUserLoaded, auth.currentUser, hasSetProfile, displayName, photoURL]);

  useEffect(() => {
    if (prevStreakRef.current !== streakDays && isUserLoaded) {
      const prev = prevStreakRef.current;
      const curr = streakDays;

      let feature = null;
      if (prev < 2 && curr >= 2) feature = { name: "Cor do Balão", days: 2 };
      else if (prev < 3 && curr >= 3)
        feature = { name: "Cor de Seleção", days: 3 };
      else if (prev < 10 && curr >= 10)
        feature = { name: "Fonte do Título", days: 10 };
      else if (prev < 15 && curr >= 15)
        feature = { name: "Imagem de Fundo", days: 15 };
      else if (prev < 20 && curr >= 20)
        feature = { name: "Comportamento da IA", days: 20 };

      if (
        feature &&
        prev > 0 &&
        !unlockedFeatures.includes(feature.name) &&
        !shownFeatureRef.current.has(feature.name)
      ) {
        shownFeatureRef.current.add(feature.name);
        setUnlockedFeature(feature);
      }

      prevStreakRef.current = curr;
    }
  }, [streakDays, unlockedFeatures, isUserLoaded]);
  const [isAdmin, setIsAdmin] = useState(false);
  const {
    releaseNotes,
    feedbacks,
    aiModels,
    users,
    allGroups,
    addReleaseNote,
    updateReleaseNote,
    deleteReleaseNote,
    updateAiModel,
    addFeedback,
    updateUserStreak,
    updateUserRole,
    updateUserBannedStatus,
    updateAdminGroupStreak,
    deleteAdminGroup,
    approveAppeal,
    denyAppeal,
    isMaintenanceMode,
    setMaintenanceMode,
  } = useAdminStore(isAdmin);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [newUiBeforeImg, setNewUiBeforeImg] = useState<string | null>(null);
  const [newUiAfterImg, setNewUiAfterImg] = useState<string | null>(null);
  const [isNewUiPhotoModalOpen, setIsNewUiPhotoModalOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<
    | "releaseNotes"
    | "feedbacks"
    | "models"
    | "users"
    | "groups"
    | "appeals"
    | "settings"
  >("releaseNotes");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const [currentReleaseNote, setCurrentReleaseNote] =
    useState<ReleaseNote | null>(null);

  const [editingReleaseNoteId, setEditingReleaseNoteId] = useState<
    string | null
  >(null);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState("");
  const [newReleaseNote, setNewReleaseNote] = useState({
    version: "",
    title: "",
    description: "",
    changes: "",
    imageUrl: "",
    titleRgb: false,
    outlineColor: "",
    backgroundColor: "",
    buttonText: "Entendi!",
    buttonColor: "",
    buttonRgb: false,
    images: [] as ReleaseNoteImage[],
    badges: [] as ReleaseNoteBadge[],
  });

  const [enableNewUi, setEnableNewUi] = useState(false);
  const [selectedUiVersion, setSelectedUiVersion] = useState<
    "before" | "after"
  >("before");
  const [isNovaUiConfirmOpen, setIsNovaUiConfirmOpen] = useState(false);
  const [pendingUiVersion, setPendingUiVersion] = useState<
    "before" | "after" | null
  >(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "global"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEnableNewUi(data.enableNewUi ?? false);
        setNewUiBeforeImg(data.newUiBeforeImg || null);
        setNewUiAfterImg(data.newUiAfterImg || null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(
      `broxa_ui_version_${auth.currentUser?.uid || "anon"}`,
    );
    if (saved === "before" || saved === "after") setSelectedUiVersion(saved);
  }, [auth.currentUser]);

  const handleUiVersionChange = (version: "before" | "after") => {
    if (version === selectedUiVersion) return;
    setPendingUiVersion(version);
    setIsNovaUiConfirmOpen(true);
  };

  const confirmUiVersionChange = () => {
    if (pendingUiVersion) {
      setSelectedUiVersion(pendingUiVersion);
      const uid = auth.currentUser?.uid || "anon";
      localStorage.setItem(`broxa_ui_version_${uid}`, pendingUiVersion);
      setIsNovaUiConfirmOpen(false);
      setPendingUiVersion(null);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (
        user &&
        (userRole === "admin" ||
          user.email === "playaxieinfinity2021@gmail.com")
      ) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, [userRole]);

  const [roleNotificationModal, setRoleNotificationModal] = useState<{
    role: string;
  } | null>(null);

  useEffect(() => {
    if (
      auth.currentUser &&
      userRole &&
      (userRole === "admin" || userRole === "developer") &&
      !hasSeenRoleNotification
    ) {
      setRoleNotificationModal({
        role: userRole === "admin" ? "Administrador" : "Desenvolvedor",
      });
      markRoleNotificationAsSeen();
      hasShownRoleNotificationRef.current = true;
    }
  }, [userRole, hasSeenRoleNotification, auth.currentUser]);

  const hasShownReleaseNoteRef = useRef(false);

  useEffect(() => {
    if (!isUserLoaded || hasShownReleaseNoteRef.current) return;
    const unseen = releaseNotes.find(
      (note) => !seenReleaseNotes.includes(note.id),
    );
    if (unseen) {
      hasShownReleaseNoteRef.current = true;
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
      changes: newReleaseNote.changes
        .split("\n")
        .filter((c) => c.trim() !== ""),
      imageUrl: newReleaseNote.imageUrl,
      titleRgb: newReleaseNote.titleRgb,
      outlineColor: newReleaseNote.outlineColor,
      backgroundColor: newReleaseNote.backgroundColor,
      buttonText: newReleaseNote.buttonText,
      buttonColor: newReleaseNote.buttonColor,
      buttonRgb: newReleaseNote.buttonRgb,
      images: newReleaseNote.images,
      badges: newReleaseNote.badges,
    };

    if (editingReleaseNoteId) {
      updateReleaseNote(editingReleaseNoteId, noteData);
      setEditingReleaseNoteId(null);
    } else {
      addReleaseNote(noteData);
    }

    setNewReleaseNote({
      version: "",
      title: "",
      description: "",
      changes: "",
      imageUrl: "",
      titleRgb: false,
      outlineColor: "",
      backgroundColor: "",
      buttonText: "Entendi!",
      buttonColor: "",
      buttonRgb: false,
      images: [],
      badges: [],
    });
  };

  const handleEditReleaseNote = (note: ReleaseNote) => {
    setEditingReleaseNoteId(note.id);
    setNewReleaseNote({
      version: note.version,
      title: note.title,
      description: note.description,
      changes: note.changes.join("\n"),
      imageUrl: note.imageUrl || "",
      titleRgb: note.titleRgb || false,
      outlineColor: note.outlineColor || "",
      backgroundColor: note.backgroundColor || "",
      buttonText: note.buttonText || "Entendi!",
      buttonColor: note.buttonColor || "",
      buttonRgb: note.buttonRgb || false,
      images: note.images || [],
      badges: note.badges || [],
    });
  };

  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const prevHeightRef = useRef(60);

  const handleResizeMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isResizingRef.current) return;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const deltaY = startYRef.current - clientY;
    const maxHeight = window.innerHeight * 0.35;
    const newHeight = Math.max(
      60,
      Math.min(maxHeight, startHeightRef.current + deltaY),
    );
    // Only shake when growing and hitting max, never when shrinking
    if (newHeight >= maxHeight - 5 && newHeight >= prevHeightRef.current) {
      setInputMaxReached(true);
      setTimeout(() => setInputMaxReached(false), 600);
    }
    prevHeightRef.current = newHeight;
    setTextareaHeight(newHeight);
  }, []);

  const handleResizeEnd = useCallback(() => {
    isResizingRef.current = false;
    document.removeEventListener("mousemove", handleResizeMove);
    document.removeEventListener("mouseup", handleResizeEnd);
    document.removeEventListener("touchmove", handleResizeMove);
    document.removeEventListener("touchend", handleResizeEnd);
  }, [handleResizeMove]);

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    isResizingRef.current = true;
    startYRef.current = "touches" in e ? e.touches[0].clientY : e.clientY;
    startHeightRef.current = textareaHeight;
    prevHeightRef.current = textareaHeight;
    // If already at max, still allow
    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);
    document.addEventListener("touchmove", handleResizeMove, {
      passive: false,
    });
    document.addEventListener("touchend", handleResizeEnd);
  };

  const handleNewChat = () => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentTimestamps = newChatTimestamps.filter((t) => t > oneMinuteAgo);

    if (recentTimestamps.length >= 5) {
      const oldest = recentTimestamps[0];
      const remainingSeconds = Math.ceil((oldest + 60000 - now) / 1000);
      setRateLimitWarning(
        `Limite de Requests, tente novamente em ${remainingSeconds} segundos`,
      );
      setNewChatTimestamps(recentTimestamps);
      return;
    }

    setNewChatTimestamps([...recentTimestamps, now]);
    hasManuallyClearedSession.current = true;
    setCurrentSessionId(null);
    setSelectedGroupId(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const confirmationWords = [
    "azul",
    "pedra",
    "vento",
    "nuvem",
    "sol",
    "mar",
    "lua",
    "flor",
    "rio",
    "paz",
    "fogo",
    "neve",
    "luz",
    "ar",
    "ceu",
    "ponte",
    "gato",
    "livro",
    "chave",
    "noite",
  ];
  const generatePhrase = () => {
    const shuffled = [...confirmationWords].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3).join(" ");
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const pinnedSessions = sessions.filter(
    (s) =>
      s.isPinned &&
      (!mobileSearchQuery ||
        s.title.toLowerCase().includes(mobileSearchQuery.toLowerCase())),
  );
  const unpinnedSessions = sessions.filter(
    (s) =>
      !s.isPinned &&
      (!mobileSearchQuery ||
        s.title.toLowerCase().includes(mobileSearchQuery.toLowerCase())),
  );
  const pinnedMessages =
    currentSession?.messages.filter((m) => m.isPinned) || [];
  const pinnedTexts = currentSession?.pinnedTexts || [];
  const hasPinnedItems = pinnedMessages.length > 0 || pinnedTexts.length > 0;
  const filteredGroups = groups.filter(
    (g) =>
      !groupsScreenSearch ||
      g.name.toLowerCase().includes(groupsScreenSearch.toLowerCase()),
  );
  const hasHighlights = currentSession?.messages.some(
    (m) => m.strokes && m.strokes.length > 0,
  );

  // Gallery: collect all photos and mindmaps from sessions and groups
  interface GalleryItem {
    id: string;
    type: "photo" | "mindmap";
    url: string;
    title: string;
    modified: Date;
    size: string;
    sessionId: string;
  }

  const galleryItems = useMemo(() => {
    const items: GalleryItem[] = [];
    const seen = new Set<string>();

    // Collect from sessions
    for (const session of sessions) {
      for (const msg of session.messages) {
        // Photos: user messages with imageUrls
        if (msg.role === "user" && msg.imageUrls && msg.imageUrls.length > 0) {
          for (const url of msg.imageUrls) {
            const itemId = `${session.id}-${msg.id}-${url}`;
            if (seen.has(itemId)) continue;
            seen.add(itemId);
            items.push({
              id: itemId,
              type: "photo",
              url,
              title: `Foto - ${session.title || "Conversa sem título"}`,
              modified: new Date(msg.timestamp || Date.now()),
              size: "—",
              sessionId: session.id,
            });
          }
        }
        // Mindmaps: AI messages with language-mindmap code blocks
        if (msg.role === "ai" && msg.content) {
          const mindmapRegex = /```language-mindmap\s*\n?([\s\S]*?)```/g;
          let match;
          while ((match = mindmapRegex.exec(msg.content)) !== null) {
            const mmId = `${session.id}-${msg.id}-mm`;
            if (seen.has(mmId)) continue;
            seen.add(mmId);
            try {
              const mindmapData = JSON.parse(match[1].trim());
              // Show the mindmap as SVG or preview; we store it with a special URL marker
              items.push({
                id: mmId,
                type: "mindmap",
                url: match[1].trim(),
                title: `Mapa Mental - ${session.title || "Conversa sem título"}`,
                modified: new Date(msg.timestamp || Date.now()),
                size: "—",
                sessionId: session.id,
              });
            } catch (e) {
              // Not valid JSON, skip
            }
          }
        }
      }
    }

    // Collect from group messages - filter by group
    for (const group of groups) {
      const groupMsgs = groupMessages.filter(
        (m) => m.senderId === group.id || m.senderId === "ai",
      );
      for (const msg of groupMsgs) {
        if (
          msg.senderId !== "ai" &&
          msg.imageUrls &&
          msg.imageUrls.length > 0
        ) {
          for (const url of msg.imageUrls) {
            const itemId = `g-${group.id}-${msg.timestamp}-${url}`;
            if (seen.has(itemId)) continue;
            seen.add(itemId);
            items.push({
              id: itemId,
              type: "photo",
              url,
              title: `Foto - ${group.name || "Grupo"}`,
              modified: new Date(msg.timestamp || Date.now()),
              size: "—",
              sessionId: `group-${group.id}`,
            });
          }
        }
        if (msg.senderId === "ai" && msg.content) {
          const mindmapRegex = /```language-mindmap\s*\n?([\s\S]*?)```/g;
          let match;
          while ((match = mindmapRegex.exec(msg.content)) !== null) {
            const mmId = `g-${group.id}-${msg.timestamp}-mm`;
            if (seen.has(mmId)) continue;
            seen.add(mmId);
            try {
              JSON.parse(match[1].trim());
              items.push({
                id: mmId,
                type: "mindmap",
                url: match[1].trim(),
                title: `Mapa Mental - ${group.name || "Grupo"}`,
                modified: new Date(msg.timestamp || Date.now()),
                size: "—",
                sessionId: `group-${group.id}`,
              });
            } catch (e) {
              /* skip */
            }
          }
        }
      }
    }

    // Apply filter
    let filtered = items;
    if (galleryFilter === "photos")
      filtered = items.filter((i) => i.type === "photo");
    if (galleryFilter === "mindmaps")
      filtered = items.filter((i) => i.type === "mindmap");

    // Apply search
    if (gallerySearch.trim()) {
      const q = gallerySearch.toLowerCase();
      filtered = filtered.filter((i) => i.title.toLowerCase().includes(q));
    }

    return filtered;
  }, [sessions, groups, groupMessages, galleryFilter, gallerySearch]);

  const toggleGalleryItem = (id: string) => {
    setSelectedGalleryItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const downloadItem = (item: GalleryItem) => {
    if (item.type === "photo") {
      const a = document.createElement("a");
      a.href = item.url;
      a.download = `photo-${item.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const blob = new Blob([item.url], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mindmap-${item.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const downloadSelected = () => {
    const selected = galleryItems.filter((i) =>
      selectedGalleryItems.includes(i.id),
    );
    selected.forEach((item) => downloadItem(item));
    setSelectedGalleryItems([]);
  };

  const latestState = useRef({
    sessions,
    currentSessionId,
    setStrokes,
    addStroke,
  });
  useEffect(() => {
    latestState.current = { sessions, currentSessionId, setStrokes, addStroke };
  });

  const handleCloseSettings = () => {
    if (JSON.stringify(tempSettings) !== JSON.stringify(settings)) {
      setShowSettingsConfirm(true);
    } else {
      setSettingsError(null);
      setIsSettingsOpen(false);
    }
  };

  const handleBgUpload = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxWidth = 1920;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          setTempSettings((prev) => ({
            ...prev,
            backgroundImage: canvas.toDataURL("image/jpeg", 0.6),
          }));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const confirmSettingsClose = (save: boolean) => {
    if (save) {
      const instruction = tempSettings.customInstruction || "";
      if (!checkContent(instruction)) {
        incrementViolations();
        setSettingsError(
          `Erro: As instruções de comportamento da IA contêm termos não permitidos (incluindo tentativas de bypass) e violam nossas diretrizes.`,
        );
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

  useEffect(() => {
    let interval: any;

    const checkUpdate = async () => {
      if (isOutdated) return;
      try {
        const res = await fetch("/?t=" + Date.now(), { cache: "no-store" });
        const text = await res.text();
        const match = text.match(
          /<script[^>]+src="([^"]*\/assets\/index-[^"]+\.js)"/,
        );

        if (match) {
          const fetchedScriptSrc = match[1].split("/").pop();
          if (!fetchedScriptSrc) return;

          const currentScripts = Array.from(document.scripts).map(
            (s) => s.getAttribute("src") || "",
          );
          const hasIndexScript = currentScripts.some((s) =>
            s.includes("/assets/index-"),
          );

          if (
            hasIndexScript &&
            !currentScripts.some((s) => s.endsWith("/" + fetchedScriptSrc))
          ) {
            setIsOutdated(true);
          }
        }
      } catch (e) {
        // Ignorar em caso de erro de rede
      }
    };

    // Delay initial check to not block initial render
    const timeout = setTimeout(checkUpdate, 5000);
    interval = setInterval(checkUpdate, 1000 * 60 * 3); // Verificar a cada 3 minutos
    window.addEventListener("focus", checkUpdate);

    // Permitir testar manualmente
    (window as any).testOutdated = () => setIsOutdated(true);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      window.removeEventListener("focus", checkUpdate);
    };
  }, [isOutdated]);

  const handleAddStrokeToStack = (messageId: string, stroke: any) => {
    setUndoStack((prev) => [...prev, { messageId, stroke }]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const lastAction = prev[prev.length - 1];
      const newStack = prev.slice(0, -1);
      setRedoStack((r) => [...r, lastAction]);

      const { sessions, currentSessionId, setStrokes } = latestState.current;
      const msg = sessions
        .find((s) => s.id === currentSessionId)
        ?.messages.find((m) => m.id === lastAction.messageId);
      if (msg && msg.strokes) {
        const newStrokes = msg.strokes.filter((s) => s !== lastAction.stroke);
        setStrokes(currentSessionId!, lastAction.messageId, newStrokes);
      }
      return newStack;
    });
  };

  const handleRedo = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const actionToRedo = prev[prev.length - 1];
      const newStack = prev.slice(0, -1);
      setUndoStack((u) => [...u, actionToRedo]);

      const { currentSessionId, addStroke } = latestState.current;
      addStroke(currentSessionId!, actionToRedo.messageId, actionToRedo.stroke);
      return newStack;
    });
  };

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--color-sec",
      settings.secondaryColor,
    );
    document.documentElement.style.setProperty(
      "--selection-color",
      settings.selectionColor || "#3b82f6",
    );
    document.documentElement.classList.remove("theme-light", "theme-grey");
    if (settings.theme === "light") {
      document.documentElement.classList.add("theme-light");
    } else if (settings.theme === "grey") {
      document.documentElement.classList.add("theme-grey");
    }
  }, [settings.secondaryColor, settings.theme, settings.selectionColor]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        handleUndo();
      }
      if (e.ctrlKey && e.key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleGlobalMouseDown = (e: MouseEvent) => {
      if (isHighlightMode || isEraserMode) {
        const target = e.target as HTMLElement;
        if (
          !target.closest(".ai-message-canvas") &&
          !target.closest(".highlighter-tools")
        ) {
          showError("Você só pode grifar as respostas da IA!", "error");
          setIsHighlightMode(false);
          setIsEraserMode(false);
        }
      }
    };
    window.addEventListener("mousedown", handleGlobalMouseDown);
    return () => window.removeEventListener("mousedown", handleGlobalMouseDown);
  }, [isHighlightMode, isEraserMode]);

  useEffect(() => {
    const checkMemory = () => {
      if ((performance as any).memory) {
        const used = (performance as any).memory.usedJSHeapSize;
        if (used > 1073741824) {
          // 1GB
          setIsOverloaded(true);
        }
      }
    };
    const interval = setInterval(checkMemory, 5000);
    return () => clearInterval(interval);
  }, []);

  const hasManuallyClearedSession = useRef(false);

  useEffect(() => {
    if (sessions.length === 0 && !hasManuallyClearedSession.current) {
      createSession();
    } else if (
      !currentSessionId &&
      !selectedGroupId &&
      !hasManuallyClearedSession.current
    ) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [
    sessions,
    currentSessionId,
    createSession,
    setCurrentSessionId,
    selectedGroupId,
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, isLoading]);

  useEffect(() => {
    const handleSelection = () => {
      setTimeout(() => {
        const selection = window.getSelection();
        if (
          selection &&
          selection.rangeCount > 0 &&
          !selection.isCollapsed &&
          selection.toString().trim().length > 0
        ) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();

          if (rect.width === 0 && rect.height === 0) {
            setTextSelection(null);
            return;
          }

          // Only show if selection is inside a message content
          let isInsideMessage = false;
          let node: Node | null = selection.anchorNode;
          while (node) {
            if (
              node instanceof HTMLElement &&
              node.classList.contains("message-content")
            ) {
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
                y: rect.top,
              },
            });
          } else {
            setTextSelection(null);
          }
        } else {
          setTextSelection(null);
        }
      }, 50);
    };

    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("touchend", handleSelection);

    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("touchend", handleSelection);
    };
  }, []);

  const showError = (msg: string, type: "success" | "error" = "success") => {
    setErrorToast(msg);
    setToastType(type);
    setTimeout(() => setErrorToast(null), 3000);
  };

  useEffect(() => {
    const handleShowError = (e: Event) => {
      const customEvent = e as CustomEvent<{
        msg: string;
        type: "success" | "error";
      }>;
      if (typeof customEvent.detail === "string") {
        showError(customEvent.detail, "error");
      } else {
        showError(customEvent.detail.msg, customEvent.detail.type);
      }
    };
    window.addEventListener("show-error", handleShowError);
    return () => window.removeEventListener("show-error", handleShowError);
  }, []);

  const scrollToMessage = (id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("bg-[var(--border-strong)]");
      setTimeout(() => el.classList.remove("bg-[var(--border-strong)]"), 2000);
    }
    setIsPinnedMessagesOpen(false);
  };

  const processFiles = (files: File[]) => {
    const imageFiles = files.filter((file) =>
      file.type.match(/^image\/(jpeg|png|webp|gif|bmp|svg\+xml)$/i),
    );

    if (imageFiles.length === 0) return;

    setSelectedImages((prev) => {
      const availableSlots = 10 - prev.length;
      if (availableSlots <= 0) {
        showError("Limite de 10 imagens por mensagem.");
        return prev;
      }

      const filesToProcess = imageFiles.slice(0, availableSlots);
      if (imageFiles.length > availableSlots) {
        showError(
          `Apenas ${availableSlots} imagem(ns) adicionada(s). Limite de 10 atingido.`,
        );
      }

      filesToProcess.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
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
              const ctx = canvas.getContext("2d");
              ctx?.drawImage(img, 0, 0, width, height);

              const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
              setSelectedImages((current) => {
                if (current.length >= 10) return current;
                return [...current, { url: dataUrl, mimeType: "image/jpeg" }];
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();

    if (!e.dataTransfer.types.includes("Files")) {
      setIsDragging(false);
      return;
    }

    const hasImageFiles = Array.from(e.dataTransfer.items).some(
      (item) =>
        item.kind === "file" &&
        item.type.match(/^image\/(jpeg|png|webp|gif|bmp|svg\+xml)$/i),
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

  const [pullProgress, setPullProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const versionBarRef = useRef<HTMLDivElement>(null);
  const isVersionBarTouchRef = useRef(false);
  const pullTouchStartY = useRef<number | null>(null);
  const [mobileSessionOptions, setMobileSessionOptions] = useState<any | null>(
    null,
  );
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Only enable pull-to-refresh when touch starts from the version bar
    isVersionBarTouchRef.current = versionBarRef.current
      ? versionBarRef.current.contains(target)
      : false;
    if (isVersionBarTouchRef.current) {
      pullTouchStartY.current = e.targetTouches[0].clientY;
      setPullProgress(0);
    }
    // Track X for sidebar swipe
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    if (isVersionBarTouchRef.current && pullTouchStartY.current !== null) {
      const distanceY = e.targetTouches[0].clientY - pullTouchStartY.current;
      if (distanceY > 0) {
        setPullProgress(Math.min(distanceY / 150, 1));
      }
    }
  };

  const onTouchEndHandler = () => {
    if (pullProgress > 0.8 && !isRefreshing && isVersionBarTouchRef.current) {
      setIsRefreshing(true);
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else {
      setPullProgress(0);
    }
    isVersionBarTouchRef.current = false;
    pullTouchStartY.current = null;

    // Swipe for sidebar
    if (!touchStart || !touchEnd) return;
    const distanceX = touchStart - touchEnd;
    const isRightSwipe = distanceX < -50;

    if (Math.abs(distanceX) > 50) {
      if (isRightSwipe) {
        setIsSidebarOpen(true);
      } else if (distanceX > 50 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (
    overrideInput?: string,
    overrideImages?: { url: string; mimeType: string }[],
    overrideModel?: "thinking" | "fast" | "search" | "as" | "toto",
  ) => {
    const textToSend =
      overrideInput !== undefined ? overrideInput : input.trim();
    const imagesToSend =
      overrideImages !== undefined ? overrideImages : selectedImages;
    const modelToUse =
      overrideModel !== undefined ? overrideModel : selectedModel;

    if (!textToSend && imagesToSend.length === 0) return;

    if (!auth.currentUser) {
      if (guestMessageCount >= 10) {
        setShowGuestLimitPopup(true);
        return;
      }

      // Increment usage count for guests
      if (userIp) {
        const today = new Date().toISOString().split("T")[0];
        const ipId = userIp.replace(/\./g, "_");
        const usageRef = doc(db, "guestUsage", `${ipId}_${today}`);
        const nextCount = guestMessageCount + 1;
        setGuestMessageCount(nextCount);
        setDoc(usageRef, { count: nextCount, lastDate: today }, { merge: true }).catch(console.error);
      } else {
        setGuestMessageCount(prev => prev + 1);
      }
      
      setShowGuestWarning(true);
    }

    if (selectedGroupId) {
      const groupId = selectedGroupId;

      if (overrideInput === undefined) setInput("");
      if (overrideImages === undefined) setSelectedImages([]);
      setTextareaHeight(60);

      const userMessage: Omit<GroupMessage, "id"> = {
        senderId: auth.currentUser.uid,
        senderName: displayName || auth.currentUser.displayName || "Usuário",
        senderPhotoURL: photoURL || auth.currentUser.photoURL || null,
        content: textToSend,
        imageUrls: imagesToSend.map((img) => img.url),
        timestamp: Date.now(),
      };

      try {
        const isTotoAuto = textToSend.includes("[TOTO_AUTO]");

        if (!isTotoAuto && !checkContent(textToSend)) {
          incrementViolations();
          const violationMsg: Omit<GroupMessage, "id"> = {
            senderId: "ai",
            senderName: "BROXA AI",
            senderPhotoURL: null,
            content:
              getViolationMessage() +
              `\n\nVocê ainda tem **${10 - (violationsCount + 1)}** avisos restantes, fique atento!`,
            timestamp: Date.now(),
          };
          await addDoc(
            collection(db, `groups/${groupId}/messages`),
            violationMsg,
          );
          return;
        }

        if (!isTotoAuto) {
          await addDoc(
            collection(db, `groups/${groupId}/messages`),
            userMessage,
          );
          await updateGroupStreak(groupId);
        }

        setIsLoading(true);
        const group = groups.find((g) => g.id === groupId);
        let customInstruction =
          (group?.systemInstruction || settings.customInstruction) +
          "\n\nIMPORTANTE: Você nunca deve gerar conteúdo relacionado a: sexo, pornografia, abuso, racismo, homofobia, machismo, drogas pesadas ou qualquer ato carnal/sexual. Se solicitado, recuse educadamente dizendo que o conteúdo não é tolerado.";

        const modelToUseApi =
          modelToUse === "toto" ? "gemini-3-flash-preview" : modelToUse;

        if (modelToUse === "toto") {
          customInstruction =
            "Você é o Totó, um assistente especializado em resolver questões de inglês. Analise a imagem fornecida, identifique a questão e forneça a resposta correta de forma curta e objetiva, justificando brevemente em português.";
        }

        const history = groupMessages.map((m) => ({
          role: m.senderId === "ai" ? "ai" : ("user" as "ai" | "user"),
          content: m.content,
          imageUrls: m.imageUrls,
        }));
        const aiResponse = await generateResponse(
          textToSend,
          imagesToSend,
          modelToUseApi as any,
          customInstruction,
          history,
        );

        if (isTotoAuto && aiResponse.includes("MODO_SILENCIOSO")) {
          // Do not send silent responses
        } else {
          const aiMessage: Omit<GroupMessage, "id"> = {
            senderId: "ai",
            senderName: "BROXA AI",
            senderPhotoURL: null,
            content: aiResponse,
            timestamp: Date.now(),
          };

          await addDoc(collection(db, `groups/${groupId}/messages`), aiMessage);
        }
      } catch (error: any) {
        console.error("Error generating group response:", error);

        const errorString = error?.toString() || "";
        const isQuotaError =
          error?.status === 429 ||
          error?.error?.code === 429 ||
          error?.message?.includes("429") ||
          error?.message?.includes("quota") ||
          error?.status === "RESOURCE_EXHAUSTED" ||
          error?.error?.status === "RESOURCE_EXHAUSTED" ||
          errorString.includes("429") ||
          errorString.includes("quota") ||
          errorString.includes("RESOURCE_EXHAUSTED");

        const errorMsg = isQuotaError
          ? "O limite de uso da API foi excedido (Erro 429). Por favor, aguarde um momento ou verifique sua cota no Google AI Studio."
          : `Ocorreu um erro ao gerar a resposta: ${errorString}`;

        const lastAiMsg = groupMessages
          .filter((m) => m.senderId === "ai")
          .pop();
        if (lastAiMsg) {
          await updateGroupMessage(groupId, lastAiMsg.id, {
            content: errorMsg,
            isError: true,
          });
        } else {
          await addDoc(collection(db, `groups/${groupId}/messages`), {
            senderId: "ai",
            senderName: "BROXA AI",
            senderPhotoURL: null,
            content: errorMsg,
            timestamp: Date.now(),
            isError: true,
          });
        }
        return;

        handleFirestoreError(
          error,
          OperationType.CREATE,
          `groups/${groupId}/messages`,
        );
      } finally {
        setIsLoading(false);

        if (modelToUse === "toto") {
          playIphoneSound();
        }

        // Clear draft on success
        setDrafts((prev) => {
          const newDrafts = { ...prev };
          delete newDrafts[groupId];
          return newDrafts;
        });
      }
      return;
    }

    updateLastMessageDate();

    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = createSession();
    }

    const userMessageContent = textToSend;
    const userImageUrls = imagesToSend.map((img) => img.url);

    const isFirstMessage =
      !currentSession || currentSession.messages.length === 0;
    const isTotoAuto = userMessageContent.includes("[TOTO_AUTO]");

    if (!isTotoAuto) {
      addMessage(sessionId, {
        role: "user",
        content: userMessageContent,
        imageUrls: userImageUrls.length > 0 ? userImageUrls : undefined,
      });
    }

    if (!isTotoAuto && !checkContent(userMessageContent)) {
      incrementViolations();
      addMessage(sessionId, {
        role: "ai",
        content:
          getViolationMessage() +
          `\n\nVocê ainda tem **${10 - (violationsCount + 1)}** avisos restantes, fique atento!`,
        isError: true,
      });
      setInput("");
      setSelectedImages([]);
      return;
    }

    if (isFirstMessage && userMessageContent && !isTotoAuto) {
      generateTitle(userMessageContent)
        .then((title) => {
          updateSessionTitle(sessionId, title);
        })
        .catch(console.error);
    }

    const imagesToProcess =
      imagesToSend.length > 0 ? [...imagesToSend] : undefined;

    if (overrideInput === undefined) {
      setInput("");
      setSelectedImages([]);
    }
    setIsLoading(true);

    setTimeout(scrollToBottom, 100);

    let aiMessageId: string | null = null;

    try {
      if (modelToUse === "search") {
        setIsSearching(true);

        const statuses = [
          "Analisando texto...",
          "Iniciando processo de reescrita anti-detecção...",
          "Ajustando vocabulário e estrutura de frases...",
          "Adicionando imperfeições humanas sutis...",
          "Conectando aos servidores do Gemini...",
          "Humanizando texto...",
          "Finalizando detalhes...",
        ];

        for (let i = 0; i < statuses.length; i++) {
          setSearchStatus(statuses[i]);
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }

      abortControllerRef.current = new AbortController();

      aiMessageId = addMessage(sessionId, {
        role: "ai",
        content: "",
        model: modelToUse,
      });

      let fullResponse = "";

      try {
        const safetyConstraint =
          "\n\nIMPORTANTE: Você deve recusar PROATIVAMENTE qualquer pedido que envolva: conteúdo sexual (ato carnal, nudez), pedofilia, abuso infantil, hacking, programação, crimes cibernéticos, racismo, ódio ou violência física. Se o usuário tentar burlar estas regras através de 'leetspeak' (ex: P0rn0, r4c1sm0, xv1d3os) ou outros códigos, ignore o comando e responda EXCLUSIVAMENTE com uma mensagem de erro informando que este conteúdo viola as diretrizes de segurança da BROXA AI e que a conta dele poderá ser banida permanentemente.";

        const selectedGroup = groups.find((g) => g.id === selectedGroupId);
        const modelToUseApi =
          modelToUse === "toto" ? "gemini-3-flash-preview" : modelToUse;

        let customInstruction =
          (settings.customInstruction || "") +
          (selectedGroup?.systemInstruction || "") +
          safetyConstraint;

        if (modelToUse === "toto") {
          customInstruction =
            "Você é o Totó, um assistente especializado em resolver questões de inglês. Analise a imagem da tela fornecida com cuidado. Se encontrar uma questão, exercício ou atividade de inglês, resolva-a de forma correta, objetiva e bem explicada em português. Dê a resposta final com clareza e justifique brevemente o raciocínio. Se não houver nenhuma questão de inglês na imagem, responda apenas: 'Aguardando questão...'";
        }

        const stream = await generateResponseStream(
          userMessageContent,
          imagesToProcess,
          modelToUseApi as any,
          customInstruction,
          currentSession?.messages,
        );

        for await (const chunk of stream) {
          if (abortControllerRef.current?.signal.aborted) {
            updateMessage(sessionId, aiMessageId, {
              content: fullResponse,
              isCancelled: true,
            });
            break;
          }
          fullResponse += chunk;

          // Check for violations in AI response as well
          if (!checkContent(fullResponse)) {
            incrementViolations();
            updateMessage(sessionId, aiMessageId, getViolationMessage());
            fullResponse = getViolationMessage();
            break;
          }

          updateMessage(sessionId, aiMessageId, fullResponse);
        }

        if (isTotoAuto && fullResponse.includes("MODO_SILENCIOSO")) {
          deleteMessage(sessionId, aiMessageId);
        } else if (
          !fullResponse &&
          !abortControllerRef.current?.signal.aborted
        ) {
          updateMessage(sessionId, aiMessageId, "Sem resposta.");
        }
      } catch (streamError: any) {
        if (abortControllerRef.current?.signal.aborted) {
          updateMessage(sessionId, aiMessageId, {
            content: fullResponse,
            isCancelled: true,
          });
        } else {
          throw streamError;
        }
      } finally {
        if (
          modelToUse === "toto" &&
          !abortControllerRef.current?.signal.aborted
        ) {
          playIphoneSound();
        }
        abortControllerRef.current = null;
      }
    } catch (error: any) {
      console.error("Error generating response:", error);

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
        errorString.includes("RESOURCE_EXHAUSTED");

      let errorMessage =
        "Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.";

      if (isQuotaError) {
        errorMessage =
          "O limite de uso da API foi excedido (Erro 429). Por favor, verifique sua cota no Google AI Studio ou tente novamente mais tarde.";
      } else if (
        errorString.includes("A chave da API do Gemini não está configurada") ||
        error?.message?.includes("A chave da API")
      ) {
        errorMessage =
          "A chave da API do Gemini não está configurada. Para que o site funcione na Netlify, você precisa adicionar a variável de ambiente `GEMINI_API_KEY` nas configurações do seu projeto na Netlify.";
      } else if (
        errorString.includes("leaked") ||
        errorJson.includes("leaked")
      ) {
        errorMessage =
          "⚠️ **Sua Chave da API foi bloqueada pelo Google.** O Google detectou que a sua chave vazou (provavelmente foi enviada para o GitHub ou outro local público) e a desativou por segurança. Você precisa ir no Google AI Studio, gerar uma **nova chave**, e atualizar a variável `GEMINI_API_KEY` na Netlify.";
      } else {
        errorMessage = `Desculpe, ocorreu um erro ao processar sua solicitação. Detalhes do erro: ${errorString}`;
      }

      if (aiMessageId) {
        updateMessage(sessionId, aiMessageId, {
          content: errorMessage,
          isError: true,
          errorMessage: errorString,
        });
      } else {
        addMessage(sessionId, {
          role: "ai",
          content: errorMessage,
          isError: true,
          errorMessage: errorString,
          model: modelToUse,
        });
      }
    } finally {
      setIsLoading(false);
      setIsSearching(false);
      setSearchStatus(null);

      if (selectedModel === "toto") {
        playIphoneSound();
      }

      const id = selectedGroupId || currentSessionId;
      if (id && !aiMessageId?.includes("error")) {
        setDrafts((prev) => {
          const newDrafts = { ...prev };
          delete newDrafts[id];
          return newDrafts;
        });
      }
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderSession = (session: any, index: number) => (
    <motion.div
      layout="position"
      key={session.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{
        opacity: 0,
        scale: 0.9,
        x: -20,
        height: 0,
        paddingBottom: 0,
        paddingTop: 0,
        margin: 0,
      }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={() => {
        hasManuallyClearedSession.current = false;
        setCurrentSessionId(session.id);
        setSelectedGroupId(null);
        if (window.innerWidth < 768) setIsSidebarOpen(false);
      }}
      onTouchStart={(e) => {
        if (window.innerWidth < 768) {
          longPressTimeoutRef.current = setTimeout(() => {
            if (navigator.vibrate) navigator.vibrate(10);
            setMobileSessionOptions(session);
          }, 500);
        }
      }}
      onTouchEnd={() => {
        if (longPressTimeoutRef.current)
          clearTimeout(longPressTimeoutRef.current);
      }}
      onTouchMove={() => {
        if (longPressTimeoutRef.current)
          clearTimeout(longPressTimeoutRef.current);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        setMobileSessionOptions(session);
      }}
      className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-colors overflow-hidden ${currentSessionId === session.id ? "bg-[var(--bg-surface)] text-[var(--text-base)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-base)]"}`}
    >
      <div className="flex flex-col overflow-hidden flex-1">
        <div className="flex items-center gap-3 overflow-hidden">
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span className="text-sm truncate">{session.title}</span>
        </div>
        {drafts[session.id] && currentSessionId !== session.id && (
          <span className="text-[10px] font-bold text-yellow-500 ml-7">
            Rascunho salvo
          </span>
        )}
      </div>
      {session.isPinned && (
        <Pin className="w-3.5 h-3.5 text-[var(--color-sec)]" />
      )}
    </motion.div>
  );

  if (effectiveIsBanned || isIpBanned) {
    return (
      <BanScreen
        appealStatus={appealStatus}
        onSubmitAppeal={(text) => {
          submitAppeal(text);
        }}
      />
    );
  }

  if (!isUserLoaded && !localIsBanned) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--color-sec)]"></div>
      </div>
    );
  }

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
          className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url("${settings.backgroundImage}")` }}
        />
      )}
      <div className="flex w-full h-full relative z-10">
        <AnimatePresence>
          {textSelection && (
            <TextSelectionToolbar
              position={textSelection.position}
              isSearchModel={selectedModel === "search"}
              onCopy={() => {
                navigator.clipboard.writeText(textSelection.text);
                setTextSelection(null);
                showError("Texto copiado!");
              }}
              onPin={() => {
                if (currentSessionId) {
                  addPinnedText(currentSessionId, textSelection.text);
                  setTextSelection(null);
                  showError("Texto fixado!");
                }
              }}
              onExplain={() => {
                setInput(`Explique isso: "${textSelection.text}"`);
                setTextSelection(null);
                textareaRef.current?.focus();
              }}
              onSearch={() => {
                window.open(
                  `https://www.google.com/search?q=${encodeURIComponent(textSelection.text)}`,
                  "_blank",
                );
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
              className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-max max-w-[90vw] sm:max-w-[400px]"
            >
              <div className="error-alert flex items-center justify-between w-full h-auto min-h-[56px] py-2 px-3 sm:px-4 rounded-xl bg-[#232531] shadow-2xl border border-white/5 gap-4">
                <div className="flex gap-3 items-center">
                  <div
                    className={`p-1.5 rounded-lg bg-white/5 backdrop-blur-xl flex-shrink-0 ${toastType === "success" ? "text-green-500" : "text-[#d65563]"}`}
                  >
                    {toastType === "success" ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-6 h-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex flex-col text-left">
                    <p className="text-white font-medium text-sm">
                      {toastType === "success" ? "Sucesso" : "Algo deu errado"}
                    </p>
                    <p className="text-gray-400 text-xs break-words">
                      {errorToast}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setErrorToast(null)}
                  className="text-gray-500 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isOverloaded && (
            <motion.div className="absolute inset-0 z-[200] bg-black flex flex-col items-center justify-center p-8 text-center">
              <AlertTriangle className="w-20 h-20 text-red-500 mb-6 animate-pulse" />
              <h2 className="text-2xl font-bold text-white mb-4">
                Este sistema evita travamentos no site, inicie uma nova conversa
                ou tente novamente mais tarde
              </h2>
              <p className="text-red-400 text-xl">
                Ah não, sua conversa sobrecarregou
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-8 px-6 py-3 bg-white text-black rounded-xl font-bold"
              >
                Recarregar Página
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isGoogleUserWithoutPassword && !isSecurityBannerDismissed && (
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="fixed top-0 left-0 right-0 z-[150] bg-yellow-500 text-black px-4 py-3 flex items-center justify-between shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  <span className="font-bold text-sm">Atenção:</span>
                  <span className="text-sm ml-1 font-medium">
                    Você ainda não concluiu as configurações necessárias do
                    site.
                  </span>
                  <button
                    onClick={() => setIsUserSettingsOpen(true)}
                    className="ml-3 text-sm font-bold underline hover:no-underline"
                  >
                    Ir para as configurações
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowSuspensionWarning(true)}
                className="p-1.5 hover:bg-black/10 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSuspensionWarning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-[var(--bg-panel)] rounded-3xl border border-[var(--border-strong)] w-full max-w-sm shadow-2xl flex flex-col overflow-hidden p-6"
              >
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
                    <ShieldAlert className="w-6 h-6 text-yellow-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-[var(--text-base)]">
                    Aviso Importante
                  </h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    Se você não concluir a configuração de segurança agora, sua
                    conta pode ser <strong>suspensa</strong> de alguns recursos
                    do site em breve.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setIsUserSettingsOpen(true)}
                    className="w-full py-3 bg-[var(--color-sec)] text-white rounded-xl font-bold hover:opacity-90 transition-all"
                  >
                    Ir para as configurações
                  </button>
                  <button
                    onClick={() => {
                      localStorage.setItem(
                        "security_banner_dismissed_time",
                        Date.now().toString(),
                      );
                      setIsSecurityBannerDismissed(true);
                      setShowSuspensionWarning(false);
                    }}
                    className="w-full py-3 bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-base)] rounded-xl font-medium transition-all text-sm"
                  >
                    Fechar mesmo assim
                  </button>
                </div>
              </motion.div>
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
              <span className="font-bold text-sm tracking-wide">
                {rateLimitWarning}
              </span>
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
                  <h3 className="text-xl font-semibold mb-2">
                    Apagar Conversa
                  </h3>
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
                      if (navigator.vibrate) navigator.vibrate(10);
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
          {sessionToRename && (
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
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Renomear Conversa</h2>
                  <button
                    onClick={() => setSessionToRename(null)}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)] rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                      Novo Nome
                    </label>
                    <input
                      type="text"
                      value={newSessionName}
                      onChange={(e) => setNewSessionName(e.target.value)}
                      placeholder="Novo nome da conversa"
                      maxLength={20}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-xl px-4 py-3 text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)] transition-colors"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setSessionToRename(null)}
                    className="px-4 py-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (newSessionName.trim() && sessionToRename) {
                        if (!checkContent(newSessionName.trim())) {
                          incrementViolations();
                          setRateLimitWarning(
                            "O título da conversa contém termos não permitidos e viola nossas diretrizes.",
                          );
                          setTimeout(() => setRateLimitWarning(null), 5000);
                          return;
                        }
                        updateSessionTitle(
                          sessionToRename.id,
                          newSessionName.trim(),
                        );
                        setSessionToRename(null);
                      }
                    }}
                    disabled={!newSessionName.trim()}
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
          {isAdminPanelOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="bg-[var(--bg-panel)] rounded-3xl border border-[var(--border-strong)] w-full max-w-6xl m-4 shadow-2xl flex flex-col max-h-[90vh] relative overflow-hidden"
              >
                <div className="flex justify-between items-center p-6 border-b border-[var(--border-subtle)] shrink-0">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-6 h-6 text-[var(--color-sec)]" />
                    <h3 className="text-xl font-bold text-[var(--text-base)]">
                      Painel de Administrador
                    </h3>
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
                    onClick={() => setAdminTab("releaseNotes")}
                    className={`pb-3 px-2 font-medium transition-colors border-b-2 ${adminTab === "releaseNotes" ? "border-[var(--color-sec)] text-[var(--color-sec)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-base)]"}`}
                  >
                    Release Notes
                  </button>
                  <button
                    onClick={() => setAdminTab("feedbacks")}
                    className={`pb-3 px-2 font-medium transition-colors border-b-2 ${adminTab === "feedbacks" ? "border-[var(--color-sec)] text-[var(--color-sec)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-base)]"}`}
                  >
                    Feedbacks
                  </button>
                  <button
                    onClick={() => setAdminTab("models")}
                    className={`pb-3 px-2 font-medium transition-colors border-b-2 ${adminTab === "models" ? "border-[var(--color-sec)] text-[var(--color-sec)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-base)]"}`}
                  >
                    Modelos IA
                  </button>
                  <button
                    onClick={() => setAdminTab("users")}
                    className={`pb-3 px-2 font-medium transition-colors border-b-2 ${adminTab === "users" ? "border-[var(--color-sec)] text-[var(--color-sec)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-base)]"}`}
                  >
                    Usuários (Foguinho)
                  </button>
                  <button
                    onClick={() => setAdminTab("groups")}
                    className={`pb-3 px-2 font-medium transition-colors border-b-2 ${adminTab === "groups" ? "border-[var(--color-sec)] text-[var(--color-sec)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-base)]"}`}
                  >
                    Grupos
                  </button>
                  <button
                    onClick={() => setAdminTab("appeals")}
                    className={`pb-3 px-2 font-medium transition-colors border-b-2 ${adminTab === "appeals" ? "border-[var(--color-sec)] text-[var(--color-sec)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-base)]"}`}
                  >
                    Apelos
                  </button>
                  <button
                    onClick={() => setAdminTab("settings")}
                    className={`pb-3 px-2 font-medium transition-colors border-b-2 ${adminTab === "settings" ? "border-[var(--color-sec)] text-[var(--color-sec)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-base)]"}`}
                  >
                    Configurações
                  </button>
                </div>

                <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                  {adminTab === "releaseNotes" && (
                    <>
                      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar border-r border-[var(--border-subtle)]">
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-lg font-semibold text-[var(--text-base)] mb-4">
                              Lançar Nova Atualização (Release Notes)
                            </h4>
                            <p className="text-sm text-[var(--text-muted)] mb-4">
                              Crie uma nota de atualização. Ela aparecerá uma
                              vez para cada usuário.
                            </p>

                            <div className="space-y-4">
                              <div className="flex gap-4">
                                <div className="flex-1">
                                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                                    Versão
                                  </label>
                                  <input
                                    type="text"
                                    value={newReleaseNote.version}
                                    onChange={(e) =>
                                      setNewReleaseNote({
                                        ...newReleaseNote,
                                        version: e.target.value,
                                      })
                                    }
                                    placeholder="Ex: v1.2.0"
                                    className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl p-3 focus:outline-none focus:border-[var(--color-sec)]"
                                  />
                                </div>
                                <div className="flex-[2]">
                                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                                    Título
                                  </label>
                                  <input
                                    type="text"
                                    value={newReleaseNote.title}
                                    onChange={(e) =>
                                      setNewReleaseNote({
                                        ...newReleaseNote,
                                        title: e.target.value,
                                      })
                                    }
                                    placeholder="Ex: Nova Busca Inteligente"
                                    className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl p-3 focus:outline-none focus:border-[var(--color-sec)]"
                                  />
                                </div>
                              </div>

                              <div>
                                <ImageUpload
                                  value={newReleaseNote.imageUrl || ""}
                                  onChange={(val) =>
                                    setNewReleaseNote({
                                      ...newReleaseNote,
                                      imageUrl: val,
                                    })
                                  }
                                  label="Imagem de Apresentação (Opcional)"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                                  Descrição Curta
                                </label>
                                <textarea
                                  value={newReleaseNote.description}
                                  onChange={(e) =>
                                    setNewReleaseNote({
                                      ...newReleaseNote,
                                      description: e.target.value,
                                    })
                                  }
                                  placeholder="Descreva o que há de novo nesta atualização..."
                                  className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl p-3 min-h-[80px] resize-y focus:outline-none focus:border-[var(--color-sec)]"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                                  Mudanças (uma por linha)
                                </label>
                                <textarea
                                  value={newReleaseNote.changes}
                                  onChange={(e) =>
                                    setNewReleaseNote({
                                      ...newReleaseNote,
                                      changes: e.target.value,
                                    })
                                  }
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
                                      onChange={(e) =>
                                        setNewReleaseNote({
                                          ...newReleaseNote,
                                          titleRgb: e.target.checked,
                                        })
                                      }
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
                                      onChange={(e) =>
                                        setNewReleaseNote({
                                          ...newReleaseNote,
                                          buttonRgb: e.target.checked,
                                        })
                                      }
                                      className="rounded border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--color-sec)] focus:ring-[var(--color-sec)]"
                                    />
                                    Botão com Efeito RGB
                                  </label>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                                    Cor da Borda (Ex: #ff0000)
                                  </label>
                                  <input
                                    type="text"
                                    value={newReleaseNote.outlineColor}
                                    onChange={(e) =>
                                      setNewReleaseNote({
                                        ...newReleaseNote,
                                        outlineColor: e.target.value,
                                      })
                                    }
                                    placeholder="#..."
                                    className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl p-3 focus:outline-none focus:border-[var(--color-sec)]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                                    Cor de Fundo (Ex: #1a1a1a)
                                  </label>
                                  <input
                                    type="text"
                                    value={newReleaseNote.backgroundColor}
                                    onChange={(e) =>
                                      setNewReleaseNote({
                                        ...newReleaseNote,
                                        backgroundColor: e.target.value,
                                      })
                                    }
                                    placeholder="#..."
                                    className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl p-3 focus:outline-none focus:border-[var(--color-sec)]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                                    Texto do Botão
                                  </label>
                                  <input
                                    type="text"
                                    value={newReleaseNote.buttonText}
                                    onChange={(e) =>
                                      setNewReleaseNote({
                                        ...newReleaseNote,
                                        buttonText: e.target.value,
                                      })
                                    }
                                    placeholder="Entendi!"
                                    className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl p-3 focus:outline-none focus:border-[var(--color-sec)]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                                    Cor do Botão (Ex: #00ff00)
                                  </label>
                                  <input
                                    type="text"
                                    value={newReleaseNote.buttonColor}
                                    onChange={(e) =>
                                      setNewReleaseNote({
                                        ...newReleaseNote,
                                        buttonColor: e.target.value,
                                      })
                                    }
                                    placeholder="#..."
                                    className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl p-3 focus:outline-none focus:border-[var(--color-sec)]"
                                  />
                                </div>
                              </div>

                              <div className="pt-4 border-t border-[var(--border-subtle)]">
                                <h5 className="text-sm font-semibold text-[var(--text-base)] mb-3">
                                  Elementos Visuais
                                </h5>
                                <div className="flex gap-2 mb-4">
                                  <button
                                    onClick={() => setShowImagePrompt(true)}
                                    className="px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg text-sm hover:bg-[var(--border-subtle)] transition-colors flex items-center gap-2"
                                  >
                                    <ImageIcon className="w-4 h-4" /> Adicionar
                                    Imagem
                                  </button>
                                  <select
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        setNewReleaseNote({
                                          ...newReleaseNote,
                                          badges: [
                                            ...newReleaseNote.badges,
                                            {
                                              id: uuidv4(),
                                              type: e.target.value as any,
                                              x: 0,
                                              y: 0,
                                              scale: 1,
                                            },
                                          ],
                                        });
                                        e.target.value = "";
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg text-sm hover:bg-[var(--border-subtle)] transition-colors focus:outline-none"
                                  >
                                    <option value="">+ Adicionar Badge</option>
                                    <option value="BETA">BETA</option>
                                    <option value="EM DESENVOLVIMENTO">
                                      EM DESENVOLVIMENTO
                                    </option>
                                    <option value="NOVO">NOVO</option>
                                    <option value="REMOVIDO">REMOVIDO</option>
                                    <option value="EM BREVE">EM BREVE</option>
                                  </select>
                                </div>

                                {showImagePrompt && (
                                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-3xl">
                                    <div className="bg-[var(--bg-base)] p-6 rounded-xl border border-[var(--border-strong)] shadow-xl w-full max-w-sm">
                                      <h4 className="text-lg font-bold mb-4">
                                        Adicionar Imagem
                                      </h4>
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
                                            setTempImageUrl("");
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
                                                images: [
                                                  ...newReleaseNote.images,
                                                  {
                                                    id: uuidv4(),
                                                    url: tempImageUrl,
                                                    x: 0,
                                                    y: 0,
                                                    scale: 1,
                                                    rotation: 0,
                                                  },
                                                ],
                                              });
                                              setTempImageUrl("");
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
                              disabled={
                                !newReleaseNote.version || !newReleaseNote.title
                              }
                              className="w-full py-3 bg-[var(--color-sec)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                            >
                              Lançar Atualização
                            </button>
                          </div>
                        </div>

                        {releaseNotes.length > 0 && (
                          <div className="pt-6 border-t border-[var(--border-subtle)]">
                            <h4 className="text-lg font-semibold text-[var(--text-base)] mb-4">
                              Histórico de Lançamentos
                            </h4>
                            <div className="space-y-3">
                              {releaseNotes.map((note) => (
                                <div
                                  key={note.id}
                                  className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex justify-between items-center"
                                >
                                  <div>
                                    <div className="font-bold text-[var(--text-base)]">
                                      {note.version} - {note.title}
                                    </div>
                                    <div className="text-xs text-[var(--text-muted)]">
                                      {new Date(note.date).toLocaleDateString()}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() =>
                                        handleEditReleaseNote(note)
                                      }
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
                          <h4 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4 text-center">
                            Preview em Tempo Real
                          </h4>

                          <div
                            style={{
                              backgroundColor:
                                newReleaseNote.backgroundColor ||
                                "var(--bg-panel)",
                              borderColor:
                                newReleaseNote.outlineColor ||
                                "var(--border-strong)",
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
                                    backgroundImage: `linear-gradient(to top, ${newReleaseNote.backgroundColor || "var(--bg-panel)"}, transparent)`,
                                  }}
                                />
                              </div>
                            )}

                            <div className="p-5 overflow-y-auto custom-scrollbar relative min-h-[400px]">
                              {newReleaseNote.images?.map((img) => (
                                <Rnd
                                  key={img.id}
                                  position={{ x: img.x, y: img.y }}
                                  size={{
                                    width: 100 * img.scale,
                                    height: "auto",
                                  }}
                                  bounds="parent"
                                  onDragStop={(e, d) => {
                                    setNewReleaseNote({
                                      ...newReleaseNote,
                                      images: newReleaseNote.images.map((i) =>
                                        i.id === img.id
                                          ? { ...i, x: d.x, y: d.y }
                                          : i,
                                      ),
                                    });
                                  }}
                                  onResizeStop={(
                                    e,
                                    direction,
                                    ref,
                                    delta,
                                    position,
                                  ) => {
                                    setNewReleaseNote({
                                      ...newReleaseNote,
                                      images: newReleaseNote.images.map((i) =>
                                        i.id === img.id
                                          ? {
                                              ...i,
                                              x: position.x,
                                              y: position.y,
                                              scale:
                                                parseFloat(ref.style.width) /
                                                100,
                                            }
                                          : i,
                                      ),
                                    });
                                  }}
                                  style={{ zIndex: 10 }}
                                >
                                  <div className="relative group w-full h-full">
                                    <img
                                      src={img.url}
                                      alt=""
                                      className="w-full h-full object-contain pointer-events-none"
                                      style={{
                                        transform: `rotate(${img.rotation}deg)`,
                                      }}
                                    />
                                    <button
                                      onClick={() =>
                                        setNewReleaseNote({
                                          ...newReleaseNote,
                                          images: newReleaseNote.images.filter(
                                            (i) => i.id !== img.id,
                                          ),
                                        })
                                      }
                                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-50"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </Rnd>
                              ))}

                              {newReleaseNote.badges?.map((badge) => (
                                <Rnd
                                  key={badge.id}
                                  position={{ x: badge.x, y: badge.y }}
                                  bounds="parent"
                                  onDragStop={(e, d) => {
                                    setNewReleaseNote({
                                      ...newReleaseNote,
                                      badges: newReleaseNote.badges.map((b) =>
                                        b.id === badge.id
                                          ? { ...b, x: d.x, y: d.y }
                                          : b,
                                      ),
                                    });
                                  }}
                                  style={{ zIndex: 10 }}
                                >
                                  <div className="relative group">
                                    <span
                                      className={`px-2 py-1 text-[10px] font-bold rounded-full pointer-events-none ${
                                        badge.type === "BETA"
                                          ? "bg-purple-500/20 text-purple-500"
                                          : badge.type === "EM DESENVOLVIMENTO"
                                            ? "bg-yellow-500/20 text-yellow-500"
                                            : badge.type === "NOVO"
                                              ? "bg-green-500/20 text-green-500"
                                              : badge.type === "REMOVIDO"
                                                ? "bg-red-500/20 text-red-500"
                                                : "bg-blue-500/20 text-blue-500"
                                      }`}
                                      style={{
                                        transform: `scale(${badge.scale})`,
                                        display: "inline-block",
                                      }}
                                    >
                                      {badge.type}
                                    </span>
                                    <button
                                      onClick={() =>
                                        setNewReleaseNote({
                                          ...newReleaseNote,
                                          badges: newReleaseNote.badges.filter(
                                            (b) => b.id !== badge.id,
                                          ),
                                        })
                                      }
                                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-50"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </Rnd>
                              ))}

                              <div className="inline-block px-2 py-1 bg-[var(--color-sec)]/20 text-[var(--color-sec)] text-[10px] font-bold rounded-full mb-2 relative z-20">
                                NOVA VERSÃO {newReleaseNote.version || "v1.0.0"}
                              </div>

                              <h2
                                className={`text-xl font-bold text-[var(--text-base)] mb-2 relative z-20 ${newReleaseNote.titleRgb ? "animate-rgb-text" : ""}`}
                              >
                                {newReleaseNote.title ||
                                  "Título da Atualização"}
                              </h2>

                              {newReleaseNote.description && (
                                <p className="text-[var(--text-muted)] text-sm mb-4 leading-relaxed relative z-20">
                                  {newReleaseNote.description}
                                </p>
                              )}

                              {newReleaseNote.changes &&
                                newReleaseNote.changes.trim() !== "" && (
                                  <div className="space-y-2 mb-4 relative z-20">
                                    <h3 className="text-xs font-bold text-[var(--text-base)] uppercase tracking-wider">
                                      O que mudou:
                                    </h3>
                                    <ul className="space-y-1">
                                      {newReleaseNote.changes
                                        .split("\n")
                                        .filter((c) => c.trim() !== "")
                                        .map((change, i) => (
                                          <li
                                            key={i}
                                            className="flex items-start gap-2 text-xs text-[var(--text-base)]"
                                          >
                                            <div className="w-1 h-1 rounded-full bg-[var(--color-sec)] mt-1.5 shrink-0" />
                                            <span className="leading-relaxed">
                                              {change}
                                            </span>
                                          </li>
                                        ))}
                                    </ul>
                                  </div>
                                )}

                              <button
                                style={{
                                  backgroundColor:
                                    newReleaseNote.buttonColor ||
                                    "var(--color-sec)",
                                }}
                                className={`w-full py-2.5 hover:opacity-90 text-white rounded-xl text-sm font-bold transition-colors shadow-lg relative z-20 ${newReleaseNote.buttonRgb ? "animate-rgb-bg" : ""}`}
                              >
                                {newReleaseNote.buttonText ||
                                  "Continuar para o App"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {adminTab === "feedbacks" && (
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                      <h4 className="text-lg font-semibold text-[var(--text-base)] mb-4">
                        Feedbacks dos Usuários
                      </h4>
                      <div className="space-y-4">
                        {feedbacks?.length === 0 ? (
                          <p className="text-[var(--text-muted)]">
                            Nenhum feedback recebido ainda.
                          </p>
                        ) : (
                          feedbacks?.map((feedback) => (
                            <div
                              key={feedback.id}
                              className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col gap-3"
                            >
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
                                    <div className="font-bold text-[var(--text-base)]">
                                      {feedback.userEmail}
                                    </div>
                                    <div className="text-xs text-[var(--text-muted)]">
                                      {new Date(feedback.date).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-xs font-medium px-2 py-1 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-subtle)]">
                                  Modelo:{" "}
                                  {aiModels?.find(
                                    (m) => m.key === feedback.model,
                                  )?.name || feedback.model}
                                </div>
                              </div>

                              <div className="bg-[var(--bg-panel)] p-3 rounded-lg border border-[var(--border-subtle)]">
                                <div className="text-xs text-[var(--text-muted)] mb-1 font-bold">
                                  Comentário do Usuário:
                                </div>
                                <p className="text-sm text-[var(--text-base)]">
                                  {feedback.comment}
                                </p>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <div className="bg-[var(--bg-panel)] p-3 rounded-lg border border-[var(--border-subtle)]">
                                  <div className="text-xs text-[var(--text-muted)] mb-1 font-bold">
                                    Prompt:
                                  </div>
                                  <p
                                    className="text-xs text-[var(--text-base)] line-clamp-3"
                                    title={feedback.prompt}
                                  >
                                    {feedback.prompt}
                                  </p>
                                </div>
                                <div className="bg-[var(--bg-panel)] p-3 rounded-lg border border-[var(--border-subtle)]">
                                  <div className="text-xs text-[var(--text-muted)] mb-1 font-bold">
                                    Resposta da IA:
                                  </div>
                                  <p
                                    className="text-xs text-[var(--text-base)] line-clamp-3"
                                    title={feedback.response}
                                  >
                                    {feedback.response}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {adminTab === "models" && (
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                      <h4 className="text-lg font-semibold text-[var(--text-base)] mb-4">
                        Gerenciar Modelos de IA
                      </h4>
                      <div className="space-y-4">
                        {[...(aiModels?.length ? aiModels : [{ id: '1', key: 'thinking', name: '1.1 Thinking', badgeType: 'NOVO', description: 'Modelo avançado com Raciocínio' }, { id: '2', key: 'fast', name: '1.1 Fast', badgeType: 'RÁPIDO', description: 'Respostas instantâneas e leves' }, { id: '3', key: 'as', name: '0.5 A.S', badgeType: 'NENHUMA', description: 'Modelo otimizado e balanceado' }, { id: '4', key: 'search', name: '0.8 Search', badgeType: 'NENHUMA', description: 'Excelente para busca de informações' }, { id: '5', key: 'toto', name: 'Totó (Dev)', badgeType: 'VIP', description: 'Acesso web irrestrito' }])]
                          .sort((a, b) => {
                            const order = ["thinking", "fast", "as", "search"];
                            const indexA = order.indexOf(a.key);
                            const indexB = order.indexOf(b.key);
                            const aVal = indexA === -1 ? 999 : indexA;
                            const bVal = indexB === -1 ? 999 : indexB;
                            return aVal - bVal;
                          })
                          .map((model) => (
                            <div
                              key={model.id}
                              className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col gap-3"
                            >
                              <div className="flex justify-between items-center">
                                <div className="font-bold text-[var(--text-base)]">
                                  {model.key}
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                                    Nome de Exibição
                                  </label>
                                  <input
                                    type="text"
                                    value={model.name}
                                    onChange={(e) =>
                                      updateAiModel(model.id, {
                                        name: e.target.value,
                                      })
                                    }
                                    className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                                    Badge
                                  </label>
                                  <select
                                    value={model.badgeType || "NENHUMA"}
                                    onChange={(e) =>
                                      updateAiModel(model.id, {
                                        badgeType: e.target.value as any,
                                      })
                                    }
                                    className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)]"
                                  >
                                    <option value="NENHUMA">Nenhuma</option>
                                    <option value="BETA">BETA</option>
                                    <option value="EM DESENVOLVIMENTO">
                                      EM DESENVOLVIMENTO
                                    </option>
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

                  {adminTab === "users" && (
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-[var(--text-base)]">
                          Gerenciar Usuários
                        </h4>
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
                      <div className="space-y-4 overflow-x-auto w-full">
                        <div className="min-w-[800px] flex flex-col gap-4 pb-2">
                          {users
                            .filter(
                              (user) =>
                                (user.email || "")
                                  .toLowerCase()
                                  .includes(userSearchTerm.toLowerCase()) ||
                                (user.id || "")
                                  .toLowerCase()
                                  .includes(userSearchTerm.toLowerCase()) ||
                                (user.displayName || "")
                                  .toLowerCase()
                                  .includes(userSearchTerm.toLowerCase()),
                            )
                            .map((user) => (
                              <div
                                key={user.id}
                                className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col gap-3"
                              >
                                <div className="flex justify-between items-center">
                                  <div className="font-bold text-[var(--text-base)] flex items-center gap-2">
                                    {user.displayName || user.email || user.id}
                                    {user.isBanned && (
                                      <span className="px-2 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-md text-[10px] uppercase font-bold tracking-wider">
                                        Banido
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-[var(--text-muted)]">
                                    {user.email}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 flex-wrap">
                                  <div className="flex-1 min-w-[120px]">
                                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                                      Cargo
                                    </label>
                                    <select
                                      value={user.role || "user"}
                                      onChange={(e) =>
                                        updateUserRole(
                                          user.id,
                                          e.target.value as any,
                                        )
                                      }
                                      className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)]"
                                    >
                                      <option value="user">Usuário</option>
                                      <option value="developer">
                                        Desenvolvedor
                                      </option>
                                      <option value="admin">
                                        Administrador
                                      </option>
                                    </select>
                                  </div>
                                  <div className="flex-1 min-w-[120px]">
                                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                                      Dias de Foguinho
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="0"
                                        value={user.streakDays || 0}
                                        onChange={(e) =>
                                          updateUserStreak(
                                            user.id,
                                            parseInt(e.target.value) || 0,
                                          )
                                        }
                                        className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)]"
                                      />
                                      <Flame
                                        className={`w-5 h-5 ${(user.streakDays || 0) > 0 ? "text-orange-500 fill-orange-500" : "text-gray-400"}`}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-[120px]">
                                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                                      Última Mensagem
                                    </label>
                                    <div className="text-sm text-[var(--text-base)] px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-lg">
                                      {user.lastMessageDate || "Nunca"}
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-[120px]">
                                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                                      Statu de Acesso
                                    </label>
                                    <button
                                      onClick={() => {
                                        if (
                                          window.confirm(
                                            user.isBanned
                                              ? "Este usuário perderá o banimento e os avisos (0). Confirmar?"
                                              : "Deseja banir este usuário permanentemente?",
                                          )
                                        ) {
                                          updateUserBannedStatus(
                                            user.id,
                                            !user.isBanned,
                                          );
                                        }
                                      }}
                                      className={`w-full py-1.5 px-2 rounded-md text-sm font-bold transition-all border ${user.isBanned ? "bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20" : "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20"}`}
                                    >
                                      {user.isBanned ? "Desbanir" : "Banir"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {adminTab === "groups" && (
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-[var(--text-base)]">
                          Gerenciar Grupos
                        </h4>
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
                        {allGroups
                          ?.filter(
                            (group) =>
                              (group.name || "")
                                .toLowerCase()
                                .includes(groupSearchTerm.toLowerCase()) ||
                              (group.id || "")
                                .toLowerCase()
                                .includes(groupSearchTerm.toLowerCase()),
                          )
                          .map((group) => (
                            <div
                              key={group.id}
                              className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col gap-3"
                            >
                              <div className="flex justify-between items-center">
                                <div className="font-bold text-[var(--text-base)]">
                                  {group.name || "Sem Nome"}
                                </div>
                                <div className="text-xs text-[var(--text-muted)]">
                                  ID: {group.id}
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                                    Dias de Foguinho
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      value={group.streakDays || 0}
                                      onChange={(e) =>
                                        updateAdminGroupStreak(
                                          group.id,
                                          parseInt(e.target.value) || 0,
                                        )
                                      }
                                      className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)]"
                                    />
                                    <Flame
                                      className={`w-5 h-5 ${(group.streakDays || 0) > 0 ? "text-orange-500 fill-orange-500" : "text-gray-400"}`}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                                    Membros
                                  </label>
                                  <div className="text-sm text-[var(--text-base)] px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-lg">
                                    {group.members?.length || 0} membros
                                  </div>
                                </div>
                                <div className="flex items-end">
                                  <button
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          "Tem certeza que deseja deletar este grupo? Esta ação não pode ser desfeita.",
                                        )
                                      ) {
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

                  {adminTab === "appeals" && (
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                      <h4 className="text-lg font-semibold text-[var(--text-base)] mb-4">
                        Apelos de Banimento
                      </h4>
                      <div className="space-y-4">
                        {users.filter((u) => u.appealStatus === "pending")
                          .length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                            <ShieldCheck className="w-12 h-12 mb-4 opacity-20" />
                            <p>Nenhum apelo pendente no momento.</p>
                          </div>
                        ) : (
                          users
                            .filter((u) => u.appealStatus === "pending")
                            .map((user) => (
                              <div
                                key={user.id}
                                className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col gap-4 shadow-sm"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[var(--bg-base)] border border-[var(--border-strong)] flex items-center justify-center font-bold text-[var(--color-sec)]">
                                      {(user.displayName ||
                                        user.email ||
                                        "?")[0].toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="font-bold text-[var(--text-base)]">
                                        {user.displayName || "Sem Nome"}
                                      </div>
                                      <div className="text-xs text-[var(--text-muted)]">
                                        {user.email}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="px-3 py-1 bg-yellow-500/10 text-yellow-500 text-[10px] font-bold rounded-full border border-yellow-500/20 uppercase tracking-wider">
                                    Pendente
                                  </div>
                                </div>

                                <div className="bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border-strong)] italic text-sm text-[var(--text-base)] leading-relaxed">
                                  "
                                  {user.appealText ||
                                    "Sem justificativa fornecida."}
                                  "
                                </div>

                                <div className="flex gap-3 mt-2">
                                  <button
                                    onClick={() => approveAppeal(user.id)}
                                    className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                                  >
                                    <Check className="w-4 h-4" />
                                    Aprovar Apelo
                                  </button>
                                  <button
                                    onClick={() => denyAppeal(user.id)}
                                    className="flex-1 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold text-sm hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                                  >
                                    <X className="w-4 h-4" />
                                    Negar Apelo
                                  </button>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  )}

                  {adminTab === "settings" && (
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-lg font-semibold text-[var(--text-base)] mb-4 lg:mb-6">
                            Configurações Globais da Plataforma
                          </h4>
                          <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                            <div className="flex items-center justify-between p-4 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
                              <div className="flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                <span className="font-semibold text-[var(--text-base)]">
                                  Modo de Manutenção
                                </span>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={isMaintenanceMode}
                                  onChange={(e) =>
                                    setMaintenanceMode(e.target.checked)
                                  }
                                />
                                <div className="w-11 h-6 bg-[var(--bg-input)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                              </label>
                            </div>
                            <div className="p-4 text-sm text-[var(--text-muted)]">
                              Ao ativar esta opção, todos os usuários (exceto
                              administradores) serão imediatamente desconectados
                              da navegação e verão uma tela de manutenção e uma
                              animação. Somente administradores poderão acessar
                              a plataforma normalmente para testar alterações ou
                              desligar esta opção.
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6">
                        <h4 className="text-lg font-semibold text-[var(--text-base)] mb-4">
                          Fotos Nova UI
                        </h4>
                        <p className="text-sm text-[var(--text-muted)] mb-4">
                          Adicione as fotos de antes e depois da nova UI. Elas
                          aparecerão como preview na configuração.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-bold text-[var(--text-muted)] mb-2">
                              Antes (Foto Atual)
                            </p>
                            <div className="bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-xl overflow-hidden aspect-video flex items-center justify-center relative">
                              {newUiBeforeImg ? (
                                <img
                                  src={newUiBeforeImg}
                                  alt="Antes"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-4xl text-[var(--text-muted)]">
                                  ?
                                </span>
                              )}
                              {newUiBeforeImg && (
                                <button
                                  onClick={async () => {
                                    setNewUiBeforeImg(null);
                                    try {
                                      await updateDoc(
                                        doc(db, "settings", "global"),
                                        { newUiBeforeImg: null },
                                        { merge: true },
                                      );
                                    } catch (e) {
                                      console.error(e);
                                    }
                                  }}
                                  className="absolute top-2 right-2 p-1 bg-red-500 rounded-lg text-white hover:bg-red-600 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            {!newUiBeforeImg && (
                              <label className="mt-2 w-full py-2 px-3 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg text-center text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-base)] cursor-pointer transition-colors">
                                Adicionar Foto
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      const dataUrl = reader.result as string;
                                      setNewUiBeforeImg(dataUrl);
                                      try {
                                        localStorage.setItem(
                                          "broxa_ui_before",
                                          dataUrl,
                                        );
                                      } catch (_e) {}
                                      setPersistedBefore(dataUrl);
                                      updateDoc(
                                        doc(db, "settings", "global"),
                                        { newUiBeforeImg: dataUrl },
                                        { merge: true },
                                      ).catch(console.error);
                                    };
                                    reader.readAsDataURL(file);
                                  }}
                                />
                              </label>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[var(--text-muted)] mb-2">
                              Depois (Nova UI)
                            </p>
                            <div className="bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-xl overflow-hidden aspect-video flex items-center justify-center relative">
                              {newUiAfterImg ? (
                                <img
                                  src={newUiAfterImg}
                                  alt="Depois"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-4xl text-[var(--text-muted)]">
                                  ?
                                </span>
                              )}
                              {newUiAfterImg && (
                                <button
                                  onClick={async () => {
                                    setNewUiAfterImg(null);
                                    try {
                                      await updateDoc(
                                        doc(db, "settings", "global"),
                                        { newUiAfterImg: null },
                                        { merge: true },
                                      );
                                    } catch (e) {
                                      console.error(e);
                                    }
                                  }}
                                  className="absolute top-2 right-2 p-1 bg-red-500 rounded-lg text-white hover:bg-red-600 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            {!newUiAfterImg && (
                              <label className="mt-2 w-full py-2 px-3 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg text-center text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-base)] cursor-pointer transition-colors">
                                Adicionar Foto
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      const dataUrl = reader.result as string;
                                      setNewUiAfterImg(dataUrl);
                                      try {
                                        localStorage.setItem(
                                          "broxa_ui_after",
                                          dataUrl,
                                        );
                                      } catch (_e) {}
                                      setPersistedAfter(dataUrl);
                                      updateDoc(
                                        doc(db, "settings", "global"),
                                        { newUiAfterImg: dataUrl },
                                        { merge: true },
                                      ).catch(console.error);
                                    };
                                    reader.readAsDataURL(file);
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
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
                  transition: {
                    duration: 0.6,
                    times: [0, 0.5, 1],
                    ease: "easeInOut",
                  },
                }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                style={{
                  backgroundColor:
                    currentReleaseNote.backgroundColor || "var(--bg-panel)",
                  borderColor:
                    currentReleaseNote.outlineColor || "var(--border-strong)",
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
                        backgroundImage: `linear-gradient(to top, ${currentReleaseNote.backgroundColor || "var(--bg-panel)"}, transparent)`,
                      }}
                    />
                  </div>
                )}

                <div className="p-6 overflow-y-auto custom-scrollbar relative">
                  {currentReleaseNote.images?.map((img) => (
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
                        zIndex: 10,
                      }}
                    />
                  ))}

                  {currentReleaseNote.badges?.map((badge) => (
                    <span
                      key={badge.id}
                      className={`absolute px-2 py-1 text-xs font-bold rounded-full pointer-events-none ${
                        badge.type === "BETA"
                          ? "bg-purple-500/20 text-purple-500"
                          : badge.type === "EM DESENVOLVIMENTO"
                            ? "bg-yellow-500/20 text-yellow-500"
                            : badge.type === "NOVO"
                              ? "bg-green-500/20 text-green-500"
                              : badge.type === "REMOVIDO"
                                ? "bg-red-500/20 text-red-500"
                                : "bg-blue-500/20 text-blue-500"
                      }`}
                      style={{
                        left: badge.x,
                        top: badge.y,
                        transform: `scale(${badge.scale})`,
                        zIndex: 10,
                      }}
                    >
                      {badge.type}
                    </span>
                  ))}

                  <div className="inline-block px-3 py-1 bg-[var(--color-sec)]/20 text-[var(--color-sec)] text-xs font-bold rounded-full mb-3 relative z-20">
                    NOVA VERSÃO {currentReleaseNote.version}
                  </div>

                  <h2
                    className={`text-2xl font-bold text-[var(--text-base)] mb-2 relative z-20 ${currentReleaseNote.titleRgb ? "animate-rgb-text" : ""}`}
                  >
                    {currentReleaseNote.title}
                  </h2>

                  {currentReleaseNote.description && (
                    <p className="text-[var(--text-muted)] mb-6 leading-relaxed relative z-20">
                      {currentReleaseNote.description}
                    </p>
                  )}

                  {currentReleaseNote.changes &&
                    currentReleaseNote.changes.length > 0 && (
                      <div className="space-y-3 mb-6 relative z-20">
                        <h3 className="text-sm font-bold text-[var(--text-base)] uppercase tracking-wider">
                          O que mudou:
                        </h3>
                        <ul className="space-y-2">
                          {currentReleaseNote.changes.map((change, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm text-[var(--text-base)]"
                            >
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
                      backgroundColor:
                        currentReleaseNote.buttonColor || "var(--color-sec)",
                    }}
                    className={`w-full py-3 hover:opacity-90 text-white rounded-xl font-bold transition-colors shadow-lg relative z-20 ${currentReleaseNote.buttonRgb ? "animate-rgb-bg" : ""}`}
                  >
                    {currentReleaseNote.buttonText || "Continuar para o App"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => {
            setIsAuthModalOpen(false);
            setAuthModalStep(undefined);
            setAuthModalPassword(undefined);
            // If the auth was successful (banner might have disappeared already due to auth state change)
          }}
          initialStep={authModalStep}
          initialPassword={authModalPassword}
        />

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
                  Tem certeza que deseja excluir esta release note? Esta ação
                  não pode ser desfeita.
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
                    onCancel={() =>
                      showError("Ação cancelada. Segure para confirmar.")
                    }
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
                <h2 className="text-xl font-bold mb-2">Sair da conta</h2>
                <p className="text-[var(--text-muted)] mb-4 text-sm">
                  Digite{" "}
                  <strong className="text-[var(--text-base)]">
                    {logoutPhrase}
                  </strong>{" "}
                  para confirmar.
                </p>
                <input
                  type="text"
                  value={logoutInput}
                  onChange={(e) => setLogoutInput(e.target.value)}
                  placeholder={logoutPhrase}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)] mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsLogoutModalOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-[var(--bg-surface)] text-[var(--text-base)] font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={
                      logoutInput.toLowerCase() !== logoutPhrase.toLowerCase()
                    }
                    onClick={() => {
                      clearSessions();
                      setSelectedGroupId(null);
                      logOut();
                      setIsLogoutModalOpen(false);
                      setLogoutInput("");
                    }}
                    className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sair
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Group Leave Modal */}
        <AnimatePresence>
          {isGroupLeaveModalOpen && (
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
                <h2 className="text-xl font-bold mb-2">Sair do Grupo</h2>
                <p className="text-[var(--text-muted)] mb-4 text-sm">
                  Digite{" "}
                  <strong className="text-[var(--text-base)]">
                    {groupLeavePhrase}
                  </strong>{" "}
                  para confirmar.
                </p>
                <input
                  type="text"
                  value={groupLeaveInput}
                  onChange={(e) => setGroupLeaveInput(e.target.value)}
                  placeholder={groupLeavePhrase}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)] mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setIsGroupLeaveModalOpen(false);
                      setLeaveGroupName("");
                      setGroupLeaveInput("");
                    }}
                    className="flex-1 py-3 rounded-xl bg-[var(--bg-surface)] text-[var(--text-base)] font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={
                      groupLeaveInput.toLowerCase() !==
                      groupLeavePhrase.toLowerCase()
                    }
                    onClick={async () => {
                      try {
                        const groupDoc = doc(db, "groups", groupToLeaveId!);
                        const snap = await getDoc(groupDoc);
                        const currentMembers = snap.data()?.members ?? [];
                        const newMembers = currentMembers.filter(
                          (m: any) => m.userId !== auth.currentUser?.uid,
                        );
                        if (newMembers.length === 0) {
                          await updateDoc(groupDoc, { members: deleteField() });
                        } else {
                          await updateDoc(groupDoc, { members: newMembers });
                        }
                      } catch (e: any) {
                        console.error("Error leaving group:", e);
                      }
                      setIsGroupLeaveModalOpen(false);
                      setLeaveGroupName("");
                      setGroupLeaveInput("");
                      if (selectedGroupId === groupToLeaveId)
                        setSelectedGroupId(null);
                    }}
                    className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sair
                  </button>
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
                    <Flame
                      className={`w-20 h-20 ${streakDays > 0 ? "text-orange-500 fill-orange-500" : "text-gray-400"}`}
                    />
                    <div
                      className="absolute -bottom-2 -right-2 bg-[var(--bg-base)] rounded-full p-1 border border-[var(--border-strong)]"
                      title={`${freezesAvailable} congelamentos disponíveis`}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-500">
                        <Snowflake className="w-4 h-4" />
                        <span className="text-xs font-bold ml-1">
                          {freezesAvailable}
                        </span>
                      </div>
                    </div>
                  </div>
                  <h2 className="text-3xl font-black text-[var(--text-base)] mb-2">
                    {streakDays} {streakDays === 1 ? "dia" : "dias"}
                  </h2>
                  <p className="text-[var(--text-muted)]">
                    {streakDays > 0
                      ? lastMessageDate ===
                        new Date().toISOString().slice(0, 10)
                        ? "Você já mandou mensagem hoje! Volte amanhã para manter sua sequência."
                        : "Mande uma mensagem hoje para manter sua sequência!"
                      : "Mande mensagens todos os dias para construir sua sequência e desbloquear recursos!"}
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Recompensas
                  </h3>

                  <div className="space-y-2">
                    {[
                      { days: 10, name: "Fonte do Título" },
                      { days: 15, name: "Temas Prontos" },
                      { days: 15, name: "Imagem de Fundo" },
                    ].map((feature) => (
                      <div
                        key={feature.days}
                        className={`flex items-center justify-between p-3 rounded-xl border ${streakDays >= feature.days ? "bg-orange-500/10 border-orange-500/30" : "bg-[var(--bg-surface)] border-[var(--border-subtle)] opacity-70"}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${streakDays >= feature.days ? "bg-orange-500 text-white" : "bg-[var(--bg-base)] text-[var(--text-muted)]"}`}
                          >
                            {streakDays >= feature.days ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Flame className="w-4 h-4" />
                            )}
                          </div>
                          <span
                            className={`font-medium ${streakDays >= feature.days ? "text-orange-500" : "text-[var(--text-base)]"}`}
                          >
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
              onClick={handleCloseSettings}
              className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                onClick={(e) => e.stopPropagation()}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[160] bg-[var(--bg-surface)] w-[calc(100%-2rem)] md:w-[90%] h-[calc(100%-4rem)] md:h-auto md:max-h-[85vh] md:max-w-[900px] rounded-2xl border border-[var(--border-subtle)] flex overflow-hidden shadow-2xl"
              >
                {/* Close X button - top right, above everything */}
                <button
                  onClick={handleCloseSettings}
                  className="absolute top-4 right-4 z-[170] p-2 hover:bg-[var(--bg-base)] rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--text-base)]" />
                </button>
                {/* Left/sidebar nav */}
                <div className="w-full md:w-64 md:flex-shrink-0 flex md:flex-col border-b md:border-b-0 md:border-r border-[var(--border-subtle)]">
                  <div className="hidden md:flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                    <h3 className="text-lg font-semibold text-[var(--text-base)]">
                      Configurações
                    </h3>
                  </div>
                  <div className="flex md:flex-col items-center gap-1 p-2 md:p-2 overflow-x-auto md:overflow-y-auto w-full md:w-auto">
                    {[
                      { label: "Geral", icon: Palette },
                      { label: "Aparência", icon: Palette },
                      { label: "Perfil", icon: User },
                      { label: "Segurança", icon: ShieldCheck },
                      {
                        label: "Inteligência Artificial",
                        icon: Bot,
                        short: "IA",
                      },
                      { label: "Dispositivos", icon: Monitor },
                    ].map(({ label, icon: Icon, short }) => (
                      <button
                        key={label}
                        onClick={() =>
                          setSettingsTab(label.toLowerCase() as any)
                        }
                        className={`flex flex-col items-center gap-1 p-3 md:px-3 md:py-2 rounded-lg md:rounded-lg text-xs md:text-sm shrink-0 md:w-full transition-colors ${settingsTab === label.toLowerCase() ? "bg-[var(--color-sec)]/20 text-[var(--color-sec)] font-medium" : "text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-base)]"}`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="hidden md:block">
                          {short || label}
                        </span>
                      </button>
                    ))}
                  </div>
                  {auth.currentUser && (
                    <div className="hidden md:block p-4 border-t border-[var(--border-subtle)]">
                      <button
                        onClick={() => {
                          setLogoutPhrase(generatePhrase());
                          setIsSettingsOpen(false);
                          setIsLogoutModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-[var(--bg-surface)] text-[var(--text-base)] hover:bg-[var(--border-strong)] rounded-xl transition-colors font-medium text-sm"
                      >
                        <LogOut className="w-5 h-5" />
                        Sair da conta
                      </button>
                    </div>
                  )}
                </div>

                {/* Right content */}
                <div className="flex-1 overflow-y-auto">
                  {/* === GERAL === */}
                  {settingsTab === "geral" && (
                    <div className="p-6 space-y-6">
                      <div>
                        <h2 className="text-lg font-semibold text-[var(--text-base)] mb-3">
                          Modelo de UI
                        </h2>
                        <div className="flex gap-4">
                          {[
                            {
                              value: "before",
                              label: "Padrão",
                              img: newUiBeforeImg,
                            },
                            {
                              value: "after",
                              label: "Remasterizada",
                              img: newUiAfterImg,
                            },
                          ].map(({ value, label, img }) => (
                            <button
                              key={value}
                              onClick={() => {
                                if (!img) return;
                                setPendingUiVersion(
                                  value as "before" | "after",
                                );
                                setIsNovaUiConfirmOpen(true);
                              }}
                              disabled={!img}
                              className={`flex-1 rounded-xl border-2 transition-all p-4 text-center ${selectedUiVersion === value ? "border-[var(--color-sec)]" : !img ? "border-[var(--border-subtle)] opacity-50 cursor-not-allowed" : "border-[var(--border-strong)] hover:border-[var(--text-muted)]"}`}
                            >
                              <div className="w-full h-24 rounded-lg mb-2 bg-[var(--bg-input)] flex items-center justify-center overflow-hidden">
                                {img ? (
                                  <img
                                    src={img}
                                    alt={label}
                                    className="w-full h-full object-cover rounded-lg transition-transform duration-200 hover:scale-110 cursor-pointer"
                                  />
                                ) : (
                                  <span className="text-2xl text-[var(--text-muted)]">
                                    ?
                                  </span>
                                )}
                              </div>
                              <span className="text-sm font-medium text-[var(--text-base)]">
                                {label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* === APARÊNCIA === */}
                  {settingsTab === "aparência" && (
                    <div className="p-6 space-y-6">
                      <div>
                        <h2 className="text-lg font-semibold text-[var(--text-base)] mb-3">
                          Padrão de Cores
                        </h2>
                        <div className="flex gap-4">
                          {[
                            {
                              value: "dark",
                              label: "Escuro",
                              bg: "bg-[#000000]",
                            },
                            {
                              value: "grey",
                              label: "Cinza",
                              bg: "bg-[#2f2f2f]",
                            },
                            {
                              value: "light",
                              label: "Claro",
                              bg: "bg-[#f4f4f5]",
                            },
                          ].map(({ value, label, bg }) => (
                            <button
                              key={value}
                              onClick={() =>
                                setTempSettings({
                                  ...tempSettings,
                                  theme: value,
                                })
                              }
                              className={`flex-1 rounded-xl border-2 transition-all p-4 text-center ${tempSettings.theme === value ? "border-[var(--color-sec)]" : "border-[var(--border-subtle)] hover:border-[var(--text-muted)]"}`}
                            >
                              <div
                                className={`w-full h-24 rounded-lg mb-2 ${bg}`}
                              />
                              <span className="text-sm font-medium text-[var(--text-base)]">
                                {label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-[var(--text-base)] mb-3">
                          Cor Secundária
                        </h2>
                        <ColorPickerDropdown
                          valueColor={tempSettings.secondaryColor || "#22c55e"}
                          colorMap={[
                            { value: "#22c55e", label: "Verde" },
                            { value: "#eab308", label: "Amarelo" },
                            { value: "#ec4899", label: "Rosa" },
                            { value: "#3b82f6", label: "Azul" },
                            { value: "#a855f7", label: "Roxo" },
                          ]}
                          onSelect={(color) =>
                            setTempSettings({
                              ...tempSettings,
                              secondaryColor: color,
                            })
                          }
                        />
                      </div>
                      {streakDays >= 15 && (
                        <div>
                          <h2 className="text-lg font-semibold text-[var(--text-base)] mb-3">
                            Imagem de Fundo
                          </h2>
                          <div className="flex items-center gap-4">
                            <div
                              className="w-28 h-28 rounded-2xl border-2 border-dashed border-[var(--border-subtle)] flex flex-col items-center justify-center cursor-pointer hover:border-[var(--color-sec)] hover:bg-[var(--bg-surface)] transition-colors relative overflow-hidden"
                              onClick={() =>
                                document.getElementById("bg-upload")?.click()
                              }
                              onDragOver={(e) => {
                                e.preventDefault();
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                const file = e.dataTransfer.files?.[0];
                                if (file) handleBgUpload(file);
                              }}
                            >
                              {tempSettings.backgroundImage ? (
                                <img
                                  src={tempSettings.backgroundImage}
                                  alt="Background"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <>
                                  <ImageIcon className="w-7 h-7 text-[var(--text-muted)] mb-1" />
                                  <span className="text-[10px] text-[var(--text-muted)] text-center px-2">
                                    Clique ou arraste
                                  </span>
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
                                onClick={() =>
                                  setTempSettings({
                                    ...tempSettings,
                                    backgroundImage: null,
                                  })
                                }
                                className="text-sm text-red-500 hover:text-red-400"
                              >
                                Remover Fundo
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* === PERFIL === */}
                  {settingsTab === "perfil" && (
                    <div className="p-6 space-y-6">
                      <h2 className="text-lg font-semibold text-[var(--text-base)]">
                        Perfil
                      </h2>
                      <div>
                        <ImageUpload
                          value={tempPhotoURL}
                          onChange={setTempPhotoURL}
                          label="Foto de Perfil (Opcional)"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                          Nome
                        </label>
                        <input
                          type="text"
                          value={tempDisplayName}
                          onChange={(e) => setTempDisplayName(e.target.value)}
                          placeholder="Seu nome"
                          maxLength={50}
                          className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)] transition-colors"
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (tempDisplayName.trim()) {
                            updateProfile(tempDisplayName.trim(), tempPhotoURL);
                            setSettingsTab("geral");
                          }
                        }}
                        disabled={!tempDisplayName.trim()}
                        className="w-full py-3 bg-[var(--color-sec)] text-white rounded-xl hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Salvar Perfil
                      </button>
                    </div>
                  )}

                  {/* === SEGURANÇA === */}
                  {settingsTab === "segurança" && (
                    <div className="p-6 space-y-6">
                      <h2 className="text-lg font-semibold text-[var(--text-base)]">
                        Segurança
                      </h2>
                      {isGoogleUserWithoutPassword && (
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                          <p className="text-xs text-yellow-600 font-medium">
                            Estamos atualizando a segurança do site e melhorando
                            os sistemas. Defina sua senha agora!
                          </p>
                        </div>
                      )}
                      {!securityOtpStep ? (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                              Nova Senha
                            </label>
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Mínimo 6 caracteres"
                              className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)] transition-colors"
                            />
                            {newPassword && (
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all duration-300 ${(() => {
                                      const pass = newPassword;
                                      if (pass.length < 6)
                                        return "bg-red-500 w-1/3";
                                      const hasLetters = /[a-zA-Z]/.test(pass);
                                      const hasNumbers = /[0-9]/.test(pass);
                                      const hasSpecial = /[^a-zA-Z0-9]/.test(
                                        pass,
                                      );
                                      if (
                                        hasLetters &&
                                        hasNumbers &&
                                        hasSpecial &&
                                        pass.length >= 8
                                      )
                                        return "bg-green-500 w-full";
                                      if (hasLetters && hasNumbers)
                                        return "bg-yellow-500 w-2/3";
                                      return "bg-red-500 w-1/3";
                                    })()}`}
                                  ></div>
                                </div>
                                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
                                  {(() => {
                                    const pass = newPassword;
                                    if (pass.length < 6) return "Fraca";
                                    const hasLetters = /[a-zA-Z]/.test(pass);
                                    const hasNumbers = /[0-9]/.test(pass);
                                    const hasSpecial = /[^a-zA-Z0-9]/.test(
                                      pass,
                                    );
                                    if (
                                      hasLetters &&
                                      hasNumbers &&
                                      hasSpecial &&
                                      pass.length >= 8
                                    )
                                      return "Forte";
                                    if (hasLetters && hasNumbers)
                                      return "Média";
                                    return "Fraca";
                                  })()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                              Confirmar Senha
                            </label>
                            <input
                              type="password"
                              value={confirmNewPassword}
                              onChange={(e) =>
                                setConfirmNewPassword(e.target.value)
                              }
                              placeholder="Confirmar sua nova senha"
                              className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)] transition-colors"
                            />
                          </div>
                          <button
                            onClick={() => {
                              if (
                                newPassword.length >= 6 &&
                                newPassword === confirmNewPassword
                              ) {
                                setAuthModalStep("create_google_password");
                                setAuthModalPassword(newPassword);
                                setIsAuthModalOpen(true);
                                setIsUserSettingsOpen(false);
                                setNewPassword("");
                                setConfirmNewPassword("");
                              } else if (newPassword.length < 6) {
                                setErrorToast(
                                  "A senha deve ter pelo menos 6 caracteres.",
                                );
                                setToastType("error");
                              } else if (newPassword !== confirmNewPassword) {
                                setErrorToast("As senhas não coincidem.");
                                setToastType("error");
                              }
                            }}
                            disabled={!newPassword || !confirmNewPassword}
                            className="w-full py-3 bg-[var(--color-sec)] text-white rounded-xl hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Continuar e Enviar Código
                          </button>
                        </>
                      ) : (
                        <div className="text-center py-4">
                          <ShieldCheck className="w-12 h-12 text-[var(--color-sec)] mx-auto mb-4" />
                          <p className="text-sm text-[var(--text-base)] mb-4">
                            Um código de verificação foi enviado para seu e-mail
                            para validar a nova senha.
                          </p>
                          <button
                            onClick={() => {
                              setSecurityOtpStep(false);
                              setAuthModalStep("create_google_password");
                              setAuthModalPassword(newPassword);
                              setIsAuthModalOpen(true);
                              setIsUserSettingsOpen(false);
                            }}
                            className="w-full py-3 bg-[var(--color-sec)] text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition-opacity"
                          >
                            Abrir Verificador de Código
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* === INTELIGÊNCIA ARTIFICIAL === */}
                  {settingsTab === "inteligência artificial" && (
                    <div className="p-6 space-y-6">
                      <div>
                        <h2 className="text-lg font-semibold text-[var(--text-base)] mb-3">
                          Fonte do Título
                        </h2>
                        {streakDays < 10 ? (
                          <div
                            className={`space-y-3 opacity-50 pointer-events-none`}
                          >
                            <div className="flex items-center gap-2">
                              <Flame className="w-4 h-4 text-orange-500" />
                              <span className="text-xs text-orange-500 font-bold">
                                Desbloqueie com 10 dias de ofensiva
                              </span>
                            </div>
                            <select
                              value={tempSettings.customTitleFont || "BROXA AI"}
                              disabled
                              className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl p-4 opacity-50"
                            >
                              <option value="BROXA AI">
                                Normal (BROXA AI)
                              </option>
                            </select>
                          </div>
                        ) : (
                          <select
                            value={tempSettings.customTitleFont || "BROXA AI"}
                            onChange={(e) =>
                              setTempSettings({
                                ...tempSettings,
                                customTitleFont: e.target.value,
                              })
                            }
                            className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl p-4 focus:outline-none focus:border-[var(--color-sec)]"
                          >
                            <option value="BROXA AI">Normal (BROXA AI)</option>
                            <option value="𝕭𝕽𝕺𝖃𝕬 𝕬𝕴">Gótico (𝕭𝕽𝕺𝖃𝕬 𝕬𝕴)</option>
                            <option value="𝐁𝐑𝐎𝐗𝐀 𝐀𝐈">
                              Negrito Serif (𝐁𝐑𝐎𝐗𝐀 𝐀𝐈)
                            </option>
                            <option value="𝘉𝘙𝘖𝘟𝘈 𝘈𝘐">Itálico (𝘉𝘙𝘖𝘟𝘈 𝘈𝘐)</option>
                            <option value="𝘽𝙍Ｏ𝙓𝘼 𝘼𝙄">
                              Negrito Itálico (𝘽𝙍Ｏ𝙓𝘼 𝘼𝙄)
                            </option>
                            <option value="𝙱𝚁𝙾𝚇𝙰 𝙰𝙸">
                              Máquina de Escrever (𝙱𝚁𝙾𝚇𝙰 𝙰𝙸)
                            </option>
                            <option value="𝗕𝗥𝗢𝗫𝗔 𝗔𝗜">
                              Negrito Sans (𝗕𝗥𝗢𝗫𝗔 𝗔𝗜)
                            </option>
                            <option value="𝔅ℜ𝔒𝔛𝔄 𝔄ℑ">
                              Medieval (𝔅ℜ𝔒𝔛𝔄 𝔄ℑ)
                            </option>
                            <option value="𝔹ℝ𝕆𝕏𝔸 𝔸𝕀">
                              Contorno (𝔹ℝ𝕆𝕏𝔸 𝔸𝕀)
                            </option>
                            <option value="ＢＲＯＸＡ ＡＩ">
                              Espaçado (ＢＲＯＸＡ ＡＩ)
                            </option>
                            <option value="ⓑⓡⓞⓧⓐ ⓐⓘ">
                              Círculos (ⓑⓡⓞⓧⓐ ⓐⓘ)
                            </option>
                            <option value="🅑🅡🅞🅧🅐 🅐🅘">
                              Círculos Escuros (🅑🅡🅞🅧🅐 🅐🅘)
                            </option>
                            <option value="🅱🆁🅾🆇🅰 🅰🅸">
                              Quadrados (🅱🆁🅾🆇🅰 🅰🅸)
                            </option>
                            <option value="ᗷᖇO᙭ᗩ ᗩI">Curvado (ᗷᖇO᙭ᗩ ᗩI)</option>
                            <option value="乃尺ㄖ乂卂 卂丨">
                              Asiático (乃尺ㄖ乂卂 卂丨)
                            </option>
                            <option value="ᏰᏒᎧጀᏗ ᏗᎥ">Mágico (ᏰᏒᎧጀᏗ ᏗᎥ)</option>
                            <option value="฿ⱤØӾ₳ ₳ł">Moeda (฿ⱤØӾ₳ ₳ł)</option>
                          </select>
                        )}
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-[var(--text-base)] mb-3">
                          Comportamento da IA
                        </h2>
                        {streakDays < 20 ? (
                          <div className={`opacity-50 pointer-events-none`}>
                            <div className="flex items-center gap-2 mb-2">
                              <Flame className="w-4 h-4 text-orange-500" />
                              <span className="text-xs text-orange-500 font-bold">
                                Desbloqueie com 20 dias de ofensiva
                              </span>
                            </div>
                            <textarea
                              value=""
                              disabled
                              className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl p-4 min-h-[120px] opacity-50"
                            />
                          </div>
                        ) : (
                          <>
                            <textarea
                              value={tempSettings.customInstruction || ""}
                              onChange={(e) => {
                                setTempSettings({
                                  ...tempSettings,
                                  customInstruction: e.target.value,
                                });
                                setSettingsError(null);
                              }}
                              disabled={selectedModel === "as"}
                              placeholder={
                                selectedModel === "as"
                                  ? "Não disponível para o modelo A.S"
                                  : "Melhorar textos..."
                              }
                              className={`w-full bg-[var(--bg-input)] text-[var(--text-base)] border ${settingsError ? "border-red-500" : "border-[var(--border-subtle)]"} rounded-xl p-4 min-h-[120px] resize-y focus:outline-none focus:border-[var(--color-sec)] disabled:opacity-50 disabled:cursor-not-allowed`}
                            />
                            {selectedModel === "as" && (
                              <span className="text-xs text-[var(--text-muted)]">
                                O comportamento customizado não é aplicável ao
                                modelo A.S.
                              </span>
                            )}
                            {settingsError && (
                              <div className="text-red-500 text-sm mt-1 p-3 bg-red-500/10 rounded-xl border border-red-500/20 flex items-start gap-2">
                                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                                <span>{settingsError}</span>
                              </div>
                            )}
                            <button
                              onClick={() =>
                                setTempSettings({
                                  ...tempSettings,
                                  customInstruction: "",
                                })
                              }
                              className="text-sm text-[var(--color-sec)] hover:underline text-left mt-3 block"
                            >
                              Não curtiu o comportamento da IA? Clique aqui para
                              redefinir.
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* === DISPOSITIVOS === */}
                  {settingsTab === "dispositivos" && (
                    <div className="p-6 space-y-6">
                      <h2 className="text-lg font-semibold text-[var(--text-base)]">
                        Dispositivos
                      </h2>
                      <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl p-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                            <Monitor className="w-6 h-6 text-green-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-[var(--text-base)] flex items-center gap-2">
                              Dispositivo Atual
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-500/20 text-green-400">
                                ATIVO
                              </span>
                            </div>
                            <div className="text-sm text-[var(--text-muted)] mt-0.5">
                              {navigator?.userAgent?.includes("Mobile")
                                ? "Dispositivo Móvel"
                                : "Navegador Web"}{" "}
                              •{" "}
                              {new Date().toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-center py-10">
                        <Shield className="w-14 h-14 text-[var(--text-muted)] mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium text-[var(--text-muted)]">
                          Nenhum outro dispositivo conectado
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1.5">
                          Quando fizer login em outro dispositivo, ele aparecerá
                          aqui
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isNovaUiConfirmOpen && (
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
                className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-3xl p-6 max-w-sm w-full shadow-2xl"
              >
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-[var(--color-sec)]/10 flex items-center justify-center mb-4">
                    <Check className="w-6 h-6 text-[var(--color-sec)]" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    Alterar visual do site?
                  </h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    Sua escolha será salva para este navegador. Deseja usar o
                    visual {pendingUiVersion === "before" ? "atual" : "Nova UI"}
                    ?
                  </p>
                </div>
                <div className="flex w-full gap-3">
                  <button
                    onClick={() => {
                      setIsNovaUiConfirmOpen(false);
                      setPendingUiVersion(null);
                    }}
                    className="flex-1 py-3 bg-[var(--bg-surface)] hover:bg-[var(--border-strong)] text-[var(--text-base)] rounded-xl font-medium transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmUiVersionChange}
                    className="flex-1 py-3 bg-[var(--color-sec)] hover:opacity-90 text-white rounded-xl font-medium transition-colors text-sm"
                  >
                    Confirmar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {unlockedFeature && (
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
                className="bg-[var(--bg-panel)] rounded-3xl border border-[var(--border-strong)] w-full max-w-sm shadow-[0_0_40px_rgba(249,115,22,0.1)] flex flex-col overflow-hidden p-8 relative"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-orange-500/10 blur-[40px] pointer-events-none" />

                <button
                  onClick={() => {
                    if (unlockedFeature) {
                      markFeatureAsSeen(unlockedFeature.name);
                    }
                    setUnlockedFeature(null);
                  }}
                  className="absolute top-4 right-4 p-2 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)] rounded-full transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center text-center relative z-10">
                  <motion.div
                    animate={{
                      rotate: [0, -5, 5, -5, 5, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400/20 to-red-600/20 border border-orange-500/30 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(249,115,22,0.2)]"
                  >
                    <Flame className="w-10 h-10 text-orange-500 fill-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                  </motion.div>

                  <h3 className="text-2xl font-bold mb-2 tracking-tight">
                    Recurso Desbloqueado!
                  </h3>
                  <p className="text-[var(--text-muted)] mb-6 text-sm leading-relaxed">
                    Parabéns! Você manteve sua ofensiva por{" "}
                    <span className="text-orange-500 font-bold">
                      {unlockedFeature.days} dias
                    </span>{" "}
                    seguidos.
                  </p>

                  <div className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-4 mb-8">
                    <span className="block text-xs text-[var(--text-muted)] font-medium mb-1 uppercase tracking-wider">
                      Nova Recompensa
                    </span>
                    <span className="block text-lg font-bold text-orange-500 dark:text-orange-400">
                      {unlockedFeature.name}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      if (unlockedFeature) {
                        markFeatureAsSeen(unlockedFeature.name);
                      }
                      setUnlockedFeature(null);
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-[1.02] transition-all active:scale-95"
                  >
                    Continuar
                  </button>
                </div>
              </motion.div>
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
                  <h3 className="text-xl font-semibold mb-2">
                    Salvar alterações?
                  </h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    Você fez alterações nas configurações. Deseja salvá-las
                    antes de sair?
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

        <AnimatePresence>
          {mobileSessionOptions && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4"
              onClick={() => setMobileSessionOptions(null)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--bg-panel)] w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl border sm:border-t-0 border-t border-[var(--border-strong)] shadow-[0_-10px_40px_rgba(0,0,0,0.3)] pb-8 pt-4 px-4 flex flex-col gap-2"
              >
                <div className="w-12 h-1.5 bg-[var(--border-strong)] rounded-full mx-auto mb-4" />

                <button
                  onClick={() => {
                    setSessionToRename(mobileSessionOptions);
                    setNewSessionName(mobileSessionOptions.title || "");
                    setMobileSessionOptions(null);
                  }}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-[var(--bg-surface)] hover:bg-[var(--border-subtle)] rounded-2xl transition-colors font-medium text-[var(--text-base)]"
                >
                  <Edit2 className="w-5 h-5" />
                  Renomear Conversa
                </button>

                <button
                  onClick={() => {
                    togglePinSession(mobileSessionOptions.id);
                    setMobileSessionOptions(null);
                  }}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-[var(--bg-surface)] hover:bg-[var(--border-subtle)] rounded-2xl transition-colors font-medium text-[var(--text-base)]"
                >
                  <Pin
                    className={`w-5 h-5 ${mobileSessionOptions.isPinned ? "text-[var(--color-sec)]" : "text-[var(--text-muted)]"}`}
                  />
                  {mobileSessionOptions.isPinned
                    ? "Desfixar Conversa"
                    : "Fixar Conversa"}
                </button>

                <button
                  onClick={() => {
                    setSessionToDelete(mobileSessionOptions.id);
                    setMobileSessionOptions(null);
                  }}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-2xl transition-colors font-medium"
                >
                  <Trash2 className="w-5 h-5" />
                  Apagar Conversa
                </button>

                <button
                  onClick={() => setMobileSessionOptions(null)}
                  className="w-full py-4 mt-2 bg-transparent text-[var(--text-muted)] hover:text-[var(--text-base)] rounded-2xl transition-colors font-medium"
                >
                  Cancelar
                </button>
              </motion.div>
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

        <div
          className={`fixed inset-y-0 left-0 z-50 w-full md:w-72 bg-[var(--bg-panel)] border-r border-[var(--border-subtle)] transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 md:rounded-none`}
        >
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center text-lg font-bold text-[var(--text-base)]">
              {settings.customTitleFont === "BROXA AI"
                ? "BROXA AI"
                : settings.customTitleFont}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-3 text-[var(--text-muted)] hover:text-[var(--text-base)]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* === MOBILE: action balls === */}
          <div className="md:hidden flex items-center gap-2 px-4 pb-3">
            {auth.currentUser && (
              <button
                onClick={() => setIsGroupsScreenOpen(true)}
                className="w-14 h-14 rounded-full bg-[var(--bg-surface)] flex items-center justify-center border border-[var(--border-strong)] hover:bg-[var(--border-strong)] transition-colors"
              >
                <Users className="w-6 h-6 text-[var(--text-base)]" />
              </button>
            )}
            {auth.currentUser && (
              <button
                onClick={() => setIsGalleryOpen(true)}
                className="w-14 h-14 rounded-full bg-[var(--bg-surface)] flex items-center justify-center border border-[var(--border-strong)] hover:bg-[var(--border-strong)] transition-colors"
              >
                <FolderOpen className="w-6 h-6 text-[var(--text-base)]" />
              </button>
            )}
            <button
              onClick={() => {
                handleNewChat();
                setIsSidebarOpen(false);
              }}
              className="w-14 h-14 rounded-full bg-[var(--color-sec)] flex items-center justify-center border border-[var(--border-strong)] hover:opacity-90 transition-colors"
            >
              <PenLine className="w-6 h-6 text-black" />
            </button>
          </div>
          <div className="md:hidden border-t border-[var(--border-subtle)]" />

          {/* === DESKTOP sidebar buttons: Grupos, Galeria, Nova Conversa === */}
          <div className="hidden md:flex flex-col px-3 mb-2 space-y-2">
            {auth.currentUser && groups.length > 0 && (
              <div>
                <button
                  onClick={() => setMobileGroupsOpen(!mobileGroupsOpen)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider hover:text-[var(--text-base)] transition-colors"
                >
                  Grupos
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${mobileGroupsOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {mobileGroupsOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-0.5 overflow-hidden"
                    >
                      {groups.map((group) => (
                        <div key={group.id} className="group/grp relative">
                          <button
                            onClick={() => {
                              setSelectedGroupId(group.id);
                              setCurrentSessionId(null);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)] transition-colors"
                          >
                            <div className="w-6 h-6 rounded-full bg-[var(--bg-input)] flex items-center justify-center shrink-0">
                              <MessageSquare className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs truncate">
                              {group.name}
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              setGroupToLeaveId(group.id);
                              setLeaveGroupName(group.name);
                              setGroupLeavePhrase(generatePhrase());
                              setGroupLeaveInput("");
                              setIsGroupLeaveModalOpen(true);
                            }}
                            className="hidden group-hover/grp:flex absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-red-500/20 text-red-500 transition-colors"
                            title="Sair do grupo"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {auth.currentUser && (
              <button
                onClick={() => setIsGroupsScreenOpen(true)}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[var(--bg-surface)] hover:bg-[var(--border-strong)] border border-[var(--border-strong)] rounded-xl text-xs font-medium transition-colors"
              >
                <Users className="w-4 h-4" /> Grupos
              </button>
            )}
            {auth.currentUser && (
              <button
                onClick={() => setIsGalleryOpen(true)}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[var(--bg-surface)] hover:bg-[var(--border-strong)] border border-[var(--border-strong)] rounded-xl text-xs font-medium transition-colors"
              >
                <FolderOpen className="w-4 h-4" /> Galeria
              </button>
            )}
            <button
              onClick={handleNewChat}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[var(--bg-surface)] hover:bg-[var(--border-strong)] border border-[var(--border-strong)] rounded-xl text-xs font-medium transition-colors"
            >
              <FileText className="w-4 h-4" /> Nova Conversa
            </button>
            <div className="border-t border-[var(--border-subtle)]" />
          </div>

          {/* === MOBILE: search bar === */}
          <AnimatePresence>
            {mobileSearchOpen && auth.currentUser && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="md:hidden overflow-hidden px-3 pb-2"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={mobileSearchQuery}
                    onChange={(e) => setMobileSearchQuery(e.target.value)}
                    placeholder="Pesquisar conversas..."
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* === MOBILE: groups section === */}
          <div className="md:hidden">
            {auth.currentUser && groups.length > 0 && (
              <>
                <div className="border-t border-[var(--border-subtle)] mx-4 my-2" />
                <div className="px-4 mb-2">
                  <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Grupos
                  </div>
                  <div className="space-y-1">
                    {groups.map((group) => (
                      <button
                        key={group.id}
                        onClick={() => {
                          setSelectedGroupId(group.id);
                          setCurrentSessionId(null);
                          setIsSidebarOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2 transition-colors ${
                          selectedGroupId === group.id
                            ? "bg-[var(--bg-surface)] text-[var(--text-base)] border border-[var(--border-strong)]"
                            : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)] border border-transparent"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-[var(--bg-input)] flex items-center justify-center shrink-0">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <span className="text-sm truncate">{group.name}</span>
                        <div className="ml-auto">
                          <button
                            onClick={() => {
                              setGroupToLeaveId(group.id);
                              setLeaveGroupName(group.name);
                              setGroupLeavePhrase(generatePhrase());
                              setGroupLeaveInput("");
                              setIsGroupLeaveModalOpen(true);
                            }}
                            className="p-1.5 rounded-full hover:bg-red-500/20 text-red-500 transition-colors"
                            title="Sair do grupo"
                          >
                            <LogOut className="w-4 h-4" />
                          </button>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* === SHARED: scrollable history === */}
          <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
            {pinnedSessions.length > 0 && (
              <div className="mb-4 mt-2">
                <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider px-4 mb-2">
                  Conversas Favoritadas
                </div>
                <div className="space-y-1">
                  <AnimatePresence>
                    {pinnedSessions.map(renderSession)}
                  </AnimatePresence>
                </div>
              </div>
            )}

            <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider px-4 mb-2">
              Conversas
            </div>
            <div className="space-y-1">
              {historyLoadStatus === "loading" && (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-8 h-8 border-4 border-[#1ed760] border-t-transparent rounded-full animate-spin mb-3"></div>
                </div>
              )}
              {historyLoadStatus === "success" && (
                <div className="flex flex-col items-center justify-center p-6 text-center mt-2 overflow-hidden" />
              )}
              {historyLoadStatus === "error" && (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
                    <X className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-bold text-red-500 mb-2">
                    Ocorreu um erro
                  </span>
                  <button
                    onClick={() => window.location.reload()}
                    className="p-3 bg-[var(--bg-surface)] hover:bg-[var(--border-strong)] rounded-full transition-all group"
                    title="Atualizar página"
                  >
                    <RefreshCw className="w-5 h-5 text-[var(--text-base)] group-hover:animate-spin" />
                  </button>
                </div>
              )}

              {(historyLoadStatus === "success" ||
                historyLoadStatus === "loaded") && (
                <AnimatePresence>
                  {unpinnedSessions.map(renderSession)}
                </AnimatePresence>
              )}
            </div>
          </div>

          <div className="px-4 py-3 border-t border-[var(--border-subtle)] space-y-2">
            {isAdmin && (
              <button
                onClick={() => setIsAdminPanelOpen(true)}
                className="flex items-center gap-3 text-sm text-[var(--color-sec)] hover:text-white transition-colors w-full p-2 rounded-xl hover:bg-[var(--color-sec)]/20"
              >
                <ShieldAlert className="w-4 h-4" />
                Painel Admin
              </button>
            )}
            {/* Profile / Settings */}
            {auth.currentUser ? (
              <div className="relative" ref={profilePopoverRef}>
                <button
                  onClick={() => setIsProfilePopoverOpen(!isProfilePopoverOpen)}
                  className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-[var(--bg-surface)] transition-colors"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-[var(--border-subtle)]">
                    {photoURL || auth.currentUser.photoURL ? (
                      <img
                        src={photoURL || auth.currentUser.photoURL!}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[var(--bg-surface)] flex items-center justify-center">
                        <User className="w-4 h-4 text-[var(--text-muted)]" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-[var(--text-base)] font-medium truncate">
                    {displayName ||
                      auth.currentUser.displayName?.split(" ")[0] ||
                      "Usuário"}
                  </span>
                </button>
                <AnimatePresence>
                  {isProfilePopoverOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute bottom-full left-0 mb-2 w-full bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl shadow-xl overflow-hidden z-50"
                    >
                      <button
                        onClick={() => {
                          setIsProfilePopoverOpen(false);
                          setIsSettingsOpen(true);
                        }}
                        className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-[var(--bg-surface)] transition-colors"
                      >
                        <Settings className="w-4 h-4 text-white" />
                        <span className="text-sm font-medium text-white">
                          Configurações
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setLogoutPhrase(generatePhrase());
                          setIsProfilePopoverOpen(false);
                          setIsLogoutModalOpen(true);
                        }}
                        className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-[var(--bg-surface)] transition-colors border-t border-[var(--border-subtle)]"
                      >
                        <LogOut className="w-4 h-4 text-white" />
                        <span className="text-sm font-medium text-white">
                          Sair
                        </span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsLoginModalOpen(true);
                }}
                className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-[var(--bg-surface)] transition-colors"
                title="Fazer login"
              >
                <div className="w-8 h-8 rounded-full bg-white border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden">
                  <User className="w-5 h-5 text-zinc-400" />
                </div>
                <span className="text-sm text-[var(--text-base)] font-medium">
                  Fazer login
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-base)] relative z-0 rounded-none md:rounded-l-[40px] md:border-l border-[var(--border-subtle)] shadow-2xl overflow-hidden">
          {showUpdateBanner && (
            <div className="bg-[var(--color-sec)] text-black font-bold p-2 text-center text-sm flex items-center justify-center gap-4 shadow-md z-50 electron-drag">
              O site atualizou para a versão {remoteVersion}!
              <button
                onClick={() => window.location.reload()}
                className="bg-black text-white px-3 py-1.5 rounded-full text-xs hover:bg-zinc-800 transition-colors electron-nodrag ml-2"
              >
                Atualizar agora
              </button>
            </div>
          )}
          <header className="flex items-center justify-between p-4 bg-[var(--bg-base)]/80 backdrop-blur-md sticky top-0 z-40 electron-drag">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-3 -ml-2 text-[var(--text-muted)] hover:text-[var(--text-base)]"
              >
                <Menu className="w-6 h-6" />
              </button>

              {selectedGroupId ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedGroupId(null)}
                    className="p-2 -ml-2 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)] rounded-full transition-colors"
                    title="Voltar"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div
                    className="relative flex items-center gap-3 cursor-pointer"
                    ref={groupHeaderPopoverRef}
                    onClick={() =>
                      setIsGroupHeaderPopoverOpen(!isGroupHeaderPopoverOpen)
                    }
                  >
                    <div className="w-10 h-10 rounded-full bg-[var(--color-sec)] text-white flex items-center justify-center shadow-md overflow-hidden">
                      {groups.find((g) => g.id === selectedGroupId)
                        ?.photoURL ? (
                        <img
                          src={
                            groups.find((g) => g.id === selectedGroupId)
                              ?.photoURL!
                          }
                          alt="Group"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <MessageSquare className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h2 className="font-bold text-[var(--text-base)] text-lg leading-tight">
                        {groups.find((g) => g.id === selectedGroupId)?.name ||
                          "Grupo"}
                      </h2>
                      <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-500" />
                        {groups.find((g) => g.id === selectedGroupId)
                          ?.streakDays || 0}{" "}
                        dias de ofensiva
                      </div>
                    </div>
                    <AnimatePresence>
                      {isGroupHeaderPopoverOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="absolute top-full left-0 mt-2 w-48 bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl shadow-2xl z-[999] overflow-hidden"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsGroupHeaderPopoverOpen(false);
                              const group = groups.find(
                                (g) => g.id === selectedGroupId,
                              );
                              if (group) {
                                setGroupSettingsData({
                                  name: group.name,
                                  photoURL: group.photoURL || "",
                                  systemInstruction:
                                    group.systemInstruction || "",
                                });
                                setIsGroupSettingsModalOpen(true);
                              }
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-surface)] transition-colors"
                          >
                            <Settings className="w-4 h-4 text-white" />
                            <span className="text-sm font-medium text-white">
                              Configurações
                            </span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsGroupHeaderPopoverOpen(false);
                              setGroupToLeaveId(selectedGroupId);
                              setLeaveGroupName(
                                groups.find((g) => g.id === selectedGroupId)
                                  ?.name || "",
                              );
                              setGroupLeavePhrase(generatePhrase());
                              setGroupLeaveInput("");
                              setIsGroupLeaveModalOpen(true);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-surface)] transition-colors border-t border-[var(--border-subtle)]"
                          >
                            <LogOut className="w-4 h-4 text-white" />
                            <span className="text-sm font-medium text-white">
                              Sair
                            </span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center w-full max-w-full min-w-0">
                    <div
                      ref={modelDropdownRef}
                      className="relative w-full max-w-[95%] md:max-w-none"
                    >
                      <button
                        onClick={() =>
                          setIsModelDropdownOpen(!isModelDropdownOpen)
                        }
                        className="flex items-center gap-2 text-[var(--text-base)] font-bold text-base md:text-lg hover:bg-[var(--bg-surface)] px-3 py-2 rounded-xl transition-colors truncate w-full"
                      >
                        {aiModels?.find((m) => m.key === selectedModel)?.name ||
                          (selectedModel === "thinking"
                            ? "1.1 Thinking"
                            : selectedModel === "fast"
                              ? "1.1 Fast"
                              : selectedModel === "search"
                                ? "0.8 Search"
                                : selectedModel === "toto"
                                  ? "Totó (Dev)"
                                  : "0.5 A.S")}
                        <ChevronDown className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
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
                              <div className="text-xs font-bold text-[var(--text-muted)] px-3 py-2">
                                Latest
                              </div>

                              {[...(aiModels?.length ? aiModels : [{ id: '1', key: 'thinking', name: '1.1 Thinking', badgeType: 'NOVO', description: 'Modelo avançado com Raciocínio' }, { id: '2', key: 'fast', name: '1.1 Fast', badgeType: 'RÁPIDO', description: 'Respostas instantâneas e leves' }, { id: '3', key: 'as', name: '0.5 A.S', badgeType: 'NENHUMA', description: 'Modelo otimizado e balanceado' }, { id: '4', key: 'search', name: '0.8 Search', badgeType: 'NENHUMA', description: 'Excelente para busca de informações' }, { id: '5', key: 'toto', name: 'Totó (Dev)', badgeType: 'VIP', description: 'Acesso web irrestrito' }])]
                                .filter(
                                  (m) => !(isElectronApp && m.key === "toto"),
                                )
                                .sort((a, b) => {
                                  const order = [
                                    "thinking",
                                    "fast",
                                    "as",
                                    "search",
                                  ];
                                  const indexA = order.indexOf(a.key);
                                  const indexB = order.indexOf(b.key);
                                  const aVal = indexA === -1 ? 999 : indexA;
                                  const bVal = indexB === -1 ? 999 : indexB;
                                  return aVal - bVal;
                                })
                                .map((model) => (
                                  <button
                                    key={model.id}
                                    onClick={() => {
                                      if (model.key === "toto") return;
                                      setSelectedModel(model.key as any);
                                      setIsModelDropdownOpen(false);
                                    }}
                                    disabled={model.key === "toto"}
                                    className={`w-full text-left px-3 py-3 rounded-xl flex items-center justify-between transition-colors ${selectedModel === model.key ? "bg-[var(--bg-surface)]" : "hover:bg-[var(--bg-surface)]"} ${model.key === "toto" ? "opacity-30 cursor-not-allowed" : ""}`}
                                  >
                                    <div>
                                      <div className="font-bold text-[var(--text-base)] flex items-center gap-2">
                                        {model.name}
                                        {model.key === "toto" ? (
                                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-zinc-500 text-white">EM BREVE</span>
                                        ) : model.badgeType &&
                                          model.badgeType !== "NENHUMA" && (
                                            <span
                                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                                model.badgeType === "BETA"
                                                  ? "bg-yellow-500 text-black"
                                                  : model.badgeType ===
                                                      "EM DESENVOLVIMENTO"
                                                    ? "bg-red-600 text-white"
                                                    : model.badgeType === "NOVO"
                                                      ? "bg-green-500 text-white"
                                                      : model.badgeType ===
                                                          "REMOVIDO"
                                                        ? "bg-gray-500 text-white"
                                                        : "bg-blue-500 text-white"
                                              }`}
                                            >
                                              {model.badgeType}
                                            </span>
                                          )}
                                      </div>
                                      <div className="text-xs text-[var(--text-muted)]">
                                        {model.description}
                                      </div>
                                    </div>
                                    {selectedModel === model.key && (
                                      <Check className="w-5 h-5 text-[var(--text-base)]" />
                                    )}
                                  </button>
                                ))}

                              {(isAdmin || userRole === "developer") && (
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
                                      <div className="text-xs opacity-80">
                                        Acesso a modelos privados
                                      </div>
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
                      const inviterName = encodeURIComponent(
                        displayName ||
                          auth.currentUser?.displayName ||
                          "Um usuário",
                      );
                      const link = `${window.location.origin}?joinGroup=${selectedGroupId}&inviterName=${inviterName}`;
                      navigator.clipboard.writeText(link);
                      alert("Link de convite copiado!");
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
                      const group = groups.find(
                        (g) => g.id === selectedGroupId,
                      );
                      if (group) {
                        setGroupSettingsData({
                          name: group.name,
                          photoURL: group.photoURL || "",
                          systemInstruction: group.systemInstruction || "",
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
                  <div className="relative">
                    <button
                      onClick={() =>
                        setIsPinnedMessagesOpen(!isPinnedMessagesOpen)
                      }
                      className="p-2 text-[var(--text-muted)] hover:text-[var(--text-base)] relative"
                    >
                      <Pin className="w-5 h-5" />
                      {hasPinnedItems && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-sec)] rounded-full"></span>
                      )}
                    </button>

                    <AnimatePresence>
                      {isPinnedMessagesOpen && (
                        <motion.div className="absolute top-full right-0 mt-2 w-[90vw] max-w-[320px] bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-2xl shadow-2xl z-50 overflow-hidden">
                          <div className="p-3 border-b border-[var(--border-subtle)] font-bold text-[var(--text-base)]">
                            Itens Fixados
                          </div>
                          <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-2">
                            {!hasPinnedItems ? (
                              <div className="text-center text-[var(--text-muted)] p-4 text-sm">
                                Nenhum item fixado.
                              </div>
                            ) : (
                              <>
                                {pinnedMessages.map((m) => (
                                  <div
                                    key={m.id}
                                    onClick={() => scrollToMessage(m.id)}
                                    className="p-3 bg-[var(--bg-surface)] rounded-xl cursor-pointer hover:bg-[var(--border-strong)] transition-colors text-sm text-[var(--text-base)] line-clamp-3"
                                  >
                                    <span className="text-xs text-[var(--text-muted)] block mb-1">
                                      Mensagem
                                    </span>
                                    {m.content}
                                  </div>
                                ))}
                                {pinnedTexts.map((t) => (
                                  <div
                                    key={t.id}
                                    className="p-3 bg-[var(--bg-surface)] rounded-xl group hover:bg-[var(--border-strong)] transition-colors text-sm text-[var(--text-base)] relative"
                                  >
                                    <span className="text-xs text-[var(--text-muted)] block mb-1">
                                      Texto
                                    </span>
                                    <div className="line-clamp-3">{t.text}</div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (currentSessionId)
                                          removePinnedText(
                                            currentSessionId,
                                            t.id,
                                          );
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

          <div
            ref={scrollContainerRef}
            className={`flex-1 ${isHighlightMode ? "overflow-hidden" : "overflow-y-auto"} p-4 md:p-8 custom-scrollbar relative`}
          >
            {/* Pull to refresh indicator */}
            {(pullProgress > 0 || isRefreshing) && (
              <div
                className="absolute top-0 left-0 right-0 flex justify-center z-30 pointer-events-none transition-transform duration-200"
                style={{
                  transform: `translateY(${isRefreshing ? 40 : pullProgress * 40}px)`,
                }}
              >
                <div className="bg-[var(--bg-surface)] rounded-full p-2 shadow-lg border border-[var(--border-strong)]">
                  <div
                    className={`w-6 h-6 border-2 border-[var(--color-sec)] border-t-transparent rounded-full ${isRefreshing ? "animate-spin" : ""}`}
                    style={
                      !isRefreshing
                        ? { transform: `rotate(${pullProgress * 360}deg)` }
                        : {}
                    }
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
                    <h2 className="text-3xl font-semibold mb-3">
                      Bem-vindo ao Grupo
                    </h2>
                    <p className="text-[var(--text-muted)] max-w-md text-lg">
                      Mande a primeira mensagem para começar a interagir com
                      seus amigos e com a IA.
                    </p>
                  </motion.div>
                ) : (
                  <AnimatePresence initial={false}>
                    {groupMessages.map((msg, index) => (
                      <GroupMessageItem
                        key={msg.id}
                        msg={msg}
                        settings={settings}
                        isCurrentUser={msg.senderId === auth.currentUser?.uid}
                      />
                    ))}
                  </AnimatePresence>
                )
              ) : !currentSession?.messages.length ? (
                /* ====== NO MESSAGES: greeting centered with input below ====== */
                <div className="min-h-full flex flex-col items-center justify-center text-center px-4">
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="mb-8"
                  >
                    <h1
                      className="text-4xl md:text-5xl claude-font text-[var(--text-base)] mb-3 tracking-tight"
                      style={{ fontWeight: 400 }}
                    >
                      {(() => {
                        const hour = new Date().getHours();
                        const greeting =
                          hour >= 0 && hour < 5
                            ? "Boa madrugada"
                            : hour < 12
                              ? "Bom dia"
                              : hour < 18
                                ? "Boa tarde"
                                : "Boa noite";
                        const name =
                          displayName?.split(" ")[0] ||
                          auth.currentUser?.displayName?.split(" ")[0] ||
                          "visitante";
                        return `${greeting}, ${name}`;
                      })()}
                    </h1>
                    <h2
                      className="text-4xl md:text-5xl claude-font text-[var(--text-muted)] tracking-tight opacity-75"
                      style={{ fontWeight: 400 }}
                    >
                      Como posso ajudar?
                    </h2>
                  </motion.div>
                </div>
              ) : (
                /* ====== MESSAGES EXIST: show messages list ====== */
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
                      previousUserMessage={
                        index > 0
                          ? currentSession.messages[index - 1]
                          : undefined
                      }
                      onRetry={(input, images, model) =>
                        handleSend(input, images, model)
                      }
                      aiModels={aiModels}
                      addFeedback={addFeedback}
                      onSendAnswer={(text: string) =>
                        handleSend(text, [], "as")
                      }
                    />
                  ))}
                </AnimatePresence>
              )}
              {isLoading && selectedGroupId && (
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
                      transition={{
                        repeat: Infinity,
                        duration: 0.6,
                        delay: 0.2,
                      }}
                      className="w-2 h-2 bg-[var(--text-muted)] rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.6,
                        delay: 0.4,
                      }}
                      className="w-2 h-2 bg-[var(--text-muted)] rounded-full"
                    />
                  </div>
                </motion.div>
              )}
              {isLoading &&
                selectedModel === "search" &&
                searchStatus &&
                !selectedGroupId && (
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

          <div
            className={`${!currentSession?.messages.length && selectedGroupId === null ? "relative px-4 md:px-8 pb-6 bg-transparent" : "fixed bottom-0 md:left-72 left-0 right-0 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)] to-transparent pt-8 pb-4 px-4 md:px-8"} z-20 pointer-events-none`}
          >
            {/* Guest messaging popup */}
            <AnimatePresence>
              {(showGuestWarning || showGuestLimitPopup) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="max-w-3xl mx-auto px-4 mb-2 pointer-events-auto"
                >
                  <div className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-2xl p-4 shadow-2xl flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-bold text-white">
                        {showGuestLimitPopup
                          ? "Alcançou o limite diário"
                          : "Faça o login que é de graça"}
                      </p>
                      <p className="text-sm text-[var(--text-muted)] mt-1">
                        {showGuestLimitPopup
                          ? "Faça login para continuar usando a IA sem limites."
                          : "Você pode fazer isso depois."}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setShowGuestWarning(false);
                          setShowGuestLimitPopup(false);
                          setIsLoginModalOpen(true);
                        }}
                        className="px-4 py-2.5 bg-[var(--color-sec)] text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity"
                      >
                        {showGuestLimitPopup ? "Fazer Login" : "Fazer login"}
                      </button>
                      <button
                        onClick={() => {
                          setShowGuestWarning(false);
                          setShowGuestLimitPopup(false);
                        }}
                        className="p-2.5 bg-[var(--bg-surface)] hover:bg-[var(--border-strong)] rounded-xl transition-colors"
                      >
                        <X className="w-5 h-5 text-[var(--text-muted)]" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                          e.dataTransfer.setData(
                            "text/plain",
                            index.toString(),
                          );
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fromIndex = parseInt(
                            e.dataTransfer.getData("text/plain"),
                            10,
                          );
                          const toIndex = index;
                          if (fromIndex !== toIndex && !isNaN(fromIndex)) {
                            setSelectedImages((prev) => {
                              const newImages = [...prev];
                              const [movedImage] = newImages.splice(
                                fromIndex,
                                1,
                              );
                              newImages.splice(toIndex, 0, movedImage);
                              return newImages;
                            });
                          }
                        }}
                      >
                        <img
                          src={img.url}
                          alt={`Preview ${index}`}
                          className="h-24 w-24 object-cover rounded-xl pointer-events-none"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="p-1.5 bg-black/80 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors absolute top-1 right-1 shadow-md backdrop-blur-sm z-10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              <div
                className={`bg-[var(--bg-input)] border rounded-[32px] flex flex-col shadow-2xl overflow-hidden focus-within:ring-1 transition-all ${shakeInput || inputMaxReached ? "animate-shake border-red-500 ring-1 ring-red-500 bg-red-500/10" : "border-[var(--border-strong)] focus-within:border-[var(--border-strong)] focus-within:ring-[var(--border-strong)]"}`}
              >
                {currentSession?.messages.length > 0 && (
                  <div
                    className="w-full h-3 cursor-ns-resize flex items-center justify-center hover:bg-[var(--border-subtle)] transition-colors opacity-50 hover:opacity-100"
                    onMouseDown={handleResizeStart}
                    onTouchStart={handleResizeStart}
                  >
                    <div className="w-10 h-1 rounded-full bg-[var(--text-muted)]"></div>
                  </div>
                )}
                {askTotoAgain ? (
                  <div className="w-full flex flex-col items-center justify-center p-6 gap-3">
                    <h3 className="text-lg font-bold text-[var(--text-base)] text-center">
                      Tem mais coisas que deseja enviar para a IA responder?
                    </h3>
                    <div className="flex w-full gap-3 max-w-sm mt-2">
                      <button
                        onClick={() => setAskTotoAgain(false)}
                        className="flex-1 py-3 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-[var(--bg-panel)] transition-colors text-[var(--text-base)] font-bold text-sm"
                      >
                        Não
                      </button>
                      <button
                        onClick={() => {
                          setAskTotoAgain(false);
                          startTotoWeb();
                        }}
                        className="flex-1 py-3 rounded-xl bg-[var(--color-sec)] text-black font-black uppercase text-sm shadow-md hover:scale-[1.02] transition-all"
                      >
                        Sim
                      </button>
                    </div>
                  </div>
                ) : isTotoAutoMode ? (
                  <div className="w-full flex flex-col items-center justify-center p-6 gap-4">
                    <h3 className="text-xl font-bold text-[var(--text-base)] text-center">
                      Estamos no aguardo do envio
                    </h3>

                    <div className="flex items-center gap-3 bg-[var(--bg-panel)] border border-red-500/30 px-5 py-3 rounded-2xl">
                      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                      <span className="text-red-400 font-mono font-bold text-lg">
                        {Math.floor(totoRecordingTime / 60)
                          .toString()
                          .padStart(2, "0")}
                        :{(totoRecordingTime % 60).toString().padStart(2, "0")}{" "}
                        / 01:00
                      </span>
                    </div>

                    <div className="flex w-full gap-3 mt-2">
                      <button
                        onMouseDown={startTotoHold}
                        onMouseUp={endTotoHold}
                        onMouseLeave={endTotoHold}
                        onTouchStart={startTotoHold}
                        onTouchEnd={endTotoHold}
                        className="flex-1 relative overflow-hidden py-3 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-[var(--bg-panel)] transition-colors select-none"
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-red-500/30 transition-all duration-100 ease-linear"
                          style={{ width: `${totoHoldProgress}%` }}
                        />
                        <span className="relative z-10 text-[var(--text-base)] font-bold text-sm">
                          {totoHoldProgress > 0 ? "Segurando..." : "Cancelar"}
                        </span>
                      </button>
                      <button
                        onClick={manualCaptureAndAskToto}
                        className="flex-1 py-3 rounded-xl bg-[var(--color-sec)] text-black font-black uppercase text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        Enviar a gravação
                      </button>
                    </div>
                  </div>
                ) : (
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
                )}
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
                      className={`p-2.5 rounded-2xl transition-colors ${isHighlightMode && !isEraserMode ? "bg-[var(--color-sec)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--border-subtle)]"}`}
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
                        className={`p-2.5 rounded-2xl transition-colors ${isEraserMode ? "bg-[var(--color-sec)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--border-subtle)]"}`}
                        title="Borracha"
                      >
                        <Eraser className="w-5 h-5" />
                      </button>
                    )}
                    <AnimatePresence>
                      {isHighlightMode && !isEraserMode && (
                        <motion.div
                          initial={{ width: 0, opacity: 0, scale: 0.8 }}
                          animate={{ width: "auto", opacity: 1, scale: 1 }}
                          exit={{ width: 0, opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-1.5 bg-[var(--bg-surface)] rounded-full px-2 py-1.5 border border-[var(--border-strong)] ml-2 overflow-hidden shadow-sm"
                        >
                          {[
                            "#22c55e",
                            "#eab308",
                            "#ec4899",
                            "#3b82f6",
                            "#a855f7",
                          ].map((color) => (
                            <button
                              key={color}
                              onClick={() => setHighlightColor(color)}
                              className={`w-5 h-5 rounded-full transition-transform hover:scale-110 flex-shrink-0 ${highlightColor === color ? "ring-2 ring-offset-2 ring-[var(--text-base)] ring-offset-[var(--bg-surface)]" : ""}`}
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
                    disabled={
                      !input.trim() && selectedImages.length === 0 && !isLoading
                    }
                    className={`p-3 ${isLoading ? "bg-transparent border-2 border-[var(--color-sec)]" : "bg-[var(--color-sec)]"} hover:opacity-80 disabled:opacity-50 text-white rounded-2xl transition-all flex items-center justify-center shadow-lg disabled:shadow-none shrink-0`}
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 bg-[var(--color-sec)] rounded-sm" />
                    ) : (
                      <ArrowUp className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              <div
                ref={versionBarRef}
                className={`text-center mt-3 text-[11px] text-[var(--text-muted)] opacity-70 font-medium ${(currentSession?.messages.length === undefined || currentSession?.messages.length === 0) && selectedGroupId === null ? "hidden" : ""}`}
              >
                BroxaAI pode cometer erros. Confira informações importantes.
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
                <h2 className="text-xl font-bold mb-2">
                  Como podemos te chamar?
                </h2>
                <p className="text-[var(--text-muted)] mb-6 text-sm">
                  Escolha um nome para usar no chat.
                </p>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                      Nome
                    </label>
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
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Configurações</h2>
                  <button
                    onClick={() => {
                      setIsUserSettingsOpen(false);
                      setSecurityOtpStep(false);
                    }}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)] rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex gap-1 p-1 bg-[var(--bg-surface)] rounded-2xl mb-6 border border-[var(--border-strong)]">
                  <button
                    onClick={() => setActiveSettingsTab("profile")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all font-medium text-sm ${activeSettingsTab === "profile" ? "bg-[var(--bg-base)] text-[var(--text-base)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-base)]"}`}
                  >
                    <User className="w-4 h-4" /> Perfil
                  </button>
                  <button
                    onClick={() => setActiveSettingsTab("security")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all font-medium text-sm ${activeSettingsTab === "security" ? "bg-[var(--bg-base)] text-[var(--text-base)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-base)]"}`}
                  >
                    <Lock className="w-4 h-4" /> Segurança
                  </button>
                </div>

                {activeSettingsTab === "profile" ? (
                  <div className="space-y-4 mb-6">
                    <ImageUpload
                      value={tempPhotoURL}
                      onChange={setTempPhotoURL}
                      label="Foto de Perfil (Opcional)"
                    />

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                        Nome
                      </label>
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
                ) : (
                  <div className="space-y-4 mb-6">
                    {isGoogleUserWithoutPassword && (
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl mb-4">
                        <p className="text-xs text-yellow-600 font-medium">
                          Estamos atualizando a segurança do site e melhorando
                          os sistemas. Defina sua senha agora!
                        </p>
                      </div>
                    )}

                    {!securityOtpStep ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                            Nova Senha
                          </label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-xl px-4 py-3 text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)] transition-colors"
                          />
                          {newPassword && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${(() => {
                                    const pass = newPassword;
                                    if (pass.length < 6)
                                      return "bg-red-500 w-1/3";
                                    const hasLetters = /[a-zA-Z]/.test(pass);
                                    const hasNumbers = /[0-9]/.test(pass);
                                    const hasSpecial = /[^a-zA-Z0-9]/.test(
                                      pass,
                                    );
                                    if (
                                      hasLetters &&
                                      hasNumbers &&
                                      hasSpecial &&
                                      pass.length >= 8
                                    )
                                      return "bg-green-500 w-full";
                                    if (hasLetters && hasNumbers)
                                      return "bg-yellow-500 w-2/3";
                                    return "bg-red-500 w-1/3";
                                  })()}`}
                                ></div>
                              </div>
                              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
                                {(() => {
                                  const pass = newPassword;
                                  if (pass.length < 6) return "Fraca";
                                  const hasLetters = /[a-zA-Z]/.test(pass);
                                  const hasNumbers = /[0-9]/.test(pass);
                                  const hasSpecial = /[^a-zA-Z0-9]/.test(pass);
                                  if (
                                    hasLetters &&
                                    hasNumbers &&
                                    hasSpecial &&
                                    pass.length >= 8
                                  )
                                    return "Forte";
                                  if (hasLetters && hasNumbers) return "Média";
                                  return "Fraca";
                                })()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                            Confirmar Senha
                          </label>
                          <input
                            type="password"
                            value={confirmNewPassword}
                            onChange={(e) =>
                              setConfirmNewPassword(e.target.value)
                            }
                            placeholder="Confirmar sua nova senha"
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-xl px-4 py-3 text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)] transition-colors"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <ShieldCheck className="w-12 h-12 text-[var(--color-sec)] mx-auto mb-4" />
                        <p className="text-sm text-[var(--text-base)] mb-4">
                          Um código de verificação foi enviado para seu e-mail
                          para validar a nova senha.
                        </p>
                        <button
                          onClick={() => {
                            setSecurityOtpStep(false);
                            setAuthModalStep("create_google_password");
                            setAuthModalPassword(newPassword);
                            setIsAuthModalOpen(true);
                            setIsUserSettingsOpen(false);
                          }}
                          className="w-full py-3 bg-[var(--color-sec)] text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition-opacity"
                        >
                          Abrir Verificador de Código
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {!securityOtpStep && (
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setIsUserSettingsOpen(false);
                      }}
                      className="px-4 py-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-colors text-sm"
                    >
                      Fechar
                    </button>
                    {activeSettingsTab === "profile" ? (
                      <button
                        onClick={() => {
                          if (tempDisplayName.trim()) {
                            updateProfile(tempDisplayName.trim(), tempPhotoURL);
                            setIsUserSettingsOpen(false);
                          }
                        }}
                        disabled={!tempDisplayName.trim()}
                        className="px-6 py-2 bg-[var(--color-sec)] text-white rounded-xl hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        Salvar Perfil
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (
                            newPassword.length >= 6 &&
                            newPassword === confirmNewPassword
                          ) {
                            setAuthModalStep("create_google_password");
                            setAuthModalPassword(newPassword);
                            setIsAuthModalOpen(true);
                            setIsUserSettingsOpen(false);
                            setNewPassword("");
                            setConfirmNewPassword("");
                          } else if (newPassword.length < 6) {
                            setErrorToast(
                              "A senha deve ter pelo menos 6 caracteres.",
                            );
                            setToastType("error");
                          } else if (newPassword !== confirmNewPassword) {
                            setErrorToast("As senhas não coincidem.");
                            setToastType("error");
                          }
                        }}
                        disabled={!newPassword || !confirmNewPassword}
                        className="px-6 py-2 bg-[var(--color-sec)] text-white rounded-xl hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        Continuar e Enviar Código
                      </button>
                    )}
                  </div>
                )}
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
                  <button
                    onClick={() => setIsGroupModalOpen(false)}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)] rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                      Nome do Grupo
                    </label>
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
                      <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                        Link de Convite
                      </label>
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
                          if (!checkContent(newGroupName.trim())) {
                            incrementViolations();
                            setRateLimitWarning(
                              "O nome do grupo contém termos não permitidos e viola nossas diretrizes.",
                            );
                            setTimeout(() => setRateLimitWarning(null), 5000);
                            return;
                          }
                          const groupId = await createGroup(
                            newGroupName.trim(),
                          );
                          if (groupId) {
                            const inviterName = encodeURIComponent(
                              displayName ||
                                auth.currentUser?.displayName ||
                                "Um usuário",
                            );
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
                        setNewGroupName("");
                        setGroupInviteLink("");
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

        {isTotoAutoMode && (
          <div className="fixed top-20 right-4 z-[100] flex items-center gap-3 bg-[var(--bg-panel)] p-3 rounded-2xl border border-[var(--color-sec)]/30 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
            <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_10px_#4ade80] animate-pulse" />
            <span className="text-xs font-bold text-[var(--text-base)]">
              Visualizando a tela
            </span>
            <button
              onClick={stopTotoAuto}
              className="ml-2 hover:bg-red-500/10 p-1 rounded-lg"
            >
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

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
                  <button
                    onClick={() => setIsRenameGroupModalOpen(false)}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)] rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                      Novo Nome
                    </label>
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
                        if (!checkContent(newRenameValue.trim())) {
                          incrementViolations();
                          setRateLimitWarning(
                            "O novo nome do grupo contém termos não permitidos.",
                          );
                          setTimeout(() => setRateLimitWarning(null), 5000);
                          return;
                        }
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
                  <button
                    onClick={() => setInviteModalData(null)}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)] rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 mb-8 text-center">
                  <p className="text-[var(--text-base)] text-lg">
                    <span className="font-bold">
                      {inviteModalData.inviterName}
                    </span>{" "}
                    convidou você para entrar no grupo{" "}
                    <span className="font-bold">
                      {inviteModalData.groupName}
                    </span>
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
                  <button
                    onClick={() => setIsGroupSettingsModalOpen(false)}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)] rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                      Nome do Grupo
                    </label>
                    <input
                      type="text"
                      value={groupSettingsData.name}
                      onChange={(e) =>
                        setGroupSettingsData({
                          ...groupSettingsData,
                          name: e.target.value,
                        })
                      }
                      placeholder="Nome do grupo"
                      maxLength={50}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-xl px-4 py-3 text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)] transition-colors"
                    />
                  </div>

                  <ImageUpload
                    value={groupSettingsData.photoURL}
                    onChange={(val) =>
                      setGroupSettingsData({
                        ...groupSettingsData,
                        photoURL: val,
                      })
                    }
                    label="Foto do Grupo (Opcional)"
                  />

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                      Comportamento da IA (Instrução de Sistema)
                    </label>
                    <textarea
                      value={groupSettingsData.systemInstruction}
                      onChange={(e) =>
                        setGroupSettingsData({
                          ...groupSettingsData,
                          systemInstruction: e.target.value,
                        })
                      }
                      placeholder="Ex: Responda sempre como um pirata..."
                      maxLength={5000}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-xl px-4 py-3 text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)] transition-colors resize-none h-24"
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Isso afetará como a IA responde para todos os membros do
                      grupo.
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-6">
                  {groups.find((g) => g.id === selectedGroupId)?.ownerId ===
                    auth.currentUser?.uid && (
                    <button
                      onClick={() => {
                        setConfirmModalData({
                          title: "Deletar Grupo",
                          message:
                            "Tem certeza que deseja deletar este grupo? Esta ação não pode ser desfeita.",
                          onConfirm: () => {
                            deleteGroup(selectedGroupId);
                            setIsGroupSettingsModalOpen(false);
                            navigate("/");
                          },
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
                          if (!checkContent(groupSettingsData.name.trim())) {
                            incrementViolations();
                            setRateLimitWarning(
                              "O nome do grupo contém termos não permitidos (incluindo tentativas de bypass).",
                            );
                            setTimeout(() => setRateLimitWarning(null), 5000);
                            return;
                          }
                          if (
                            groupSettingsData.systemInstruction &&
                            !checkContent(groupSettingsData.systemInstruction)
                          ) {
                            incrementViolations();
                            setRateLimitWarning(
                              "As instruções de comportamento da IA contêm termos não permitidos.",
                            );
                            setTimeout(() => setRateLimitWarning(null), 5000);
                            return;
                          }
                          updateGroup(selectedGroupId, {
                            name: groupSettingsData.name.trim(),
                            photoURL: groupSettingsData.photoURL,
                            systemInstruction:
                              groupSettingsData.systemInstruction,
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
                  <button
                    onClick={() => setIsGroupMembersModalOpen(false)}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)] rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
                  {groups
                    .find((g) => g.id === selectedGroupId)
                    ?.members.map((memberId) => {
                      const isOwner =
                        groups.find((g) => g.id === selectedGroupId)
                          ?.ownerId === memberId;
                      const isMe = auth.currentUser?.uid === memberId;
                      const amIOwner =
                        groups.find((g) => g.id === selectedGroupId)
                          ?.ownerId === auth.currentUser?.uid;
                      const details = memberDetails[memberId];
                      const name = isMe
                        ? displayName || auth.currentUser?.displayName || "Você"
                        : details?.name || "Usuário";
                      const photo = isMe
                        ? photoURL || auth.currentUser?.photoURL
                        : details?.photoURL;

                      return (
                        <div
                          key={memberId}
                          className="flex items-center justify-between p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-strong)]"
                        >
                          <div className="flex items-center gap-3">
                            {photo ? (
                              <img
                                src={photo}
                                alt={name}
                                className="w-10 h-10 rounded-full object-cover border border-[var(--border-subtle)]"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-[var(--bg-input)] flex items-center justify-center overflow-hidden">
                                <User className="w-5 h-5 text-[var(--text-muted)]" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-[var(--text-base)] flex items-center gap-2">
                                {name}
                                {isOwner && (
                                  <span className="text-xs bg-[var(--color-sec)]/20 text-[var(--color-sec)] px-2 py-0.5 rounded-full font-bold">
                                    Dono
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[var(--text-muted)]">
                                {memberId.substring(0, 8)}...
                              </div>
                            </div>
                          </div>

                          {amIOwner && !isOwner && (
                            <button
                              onClick={() => {
                                setConfirmModalData({
                                  title: "Remover Usuário",
                                  message:
                                    "Tem certeza que deseja remover este usuário do grupo?",
                                  onConfirm: () => {
                                    removeMember(selectedGroupId, memberId);
                                  },
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
                    <img
                      src="/logo.png"
                      className="w-6 h-6 rounded-full object-contain"
                      alt=""
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[var(--text-base)]">
                      Modelos de Desenvolvedor
                    </h2>
                    <p className="text-sm text-[var(--text-muted)]">
                      Acesso exclusivo a modelos privados
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <button
                    onClick={() => {
                      setSelectedModel("toto");
                      setIsDevModelsModalOpen(false);
                    }}
                    className={`p-4 rounded-xl border transition-all flex items-center justify-between w-full ${selectedModel === "toto" ? "border-[var(--color-sec)] bg-[var(--color-sec)]/10" : "border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--color-sec)]/50"}`}
                  >
                    <div className="text-left">
                      <div className="font-bold text-[var(--text-base)] flex items-center gap-2">
                        Totó 1.0 (Beta)
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide bg-[var(--color-sec)]/20 text-[var(--color-sec)]">
                          DISPONÍVEL
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        Respostas ultra-rápidas para Inglês via Extensão
                      </div>
                    </div>
                    <img
                      src="/logo.png"
                      className="w-5 h-5 rounded-full object-contain"
                      alt=""
                    />
                  </button>

                  <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between opacity-50 cursor-not-allowed">
                    <div>
                      <div className="font-bold text-[var(--text-base)] flex items-center gap-2">
                        Lux 1.0
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide bg-blue-500/20 text-blue-400">
                          EM BREVE
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        Sistema integrado com o PositivoOn e Cambridge
                      </div>
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
                  Você foi adicionado à equipe do Broxa AI como{" "}
                  <strong className="text-[var(--text-base)]">
                    {roleNotificationModal.role}
                  </strong>
                  .
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
                <h2 className="text-xl font-bold mb-4">
                  {confirmModalData.title}
                </h2>
                <p className="text-[var(--text-muted)] mb-6">
                  {confirmModalData.message}
                </p>

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

        <AnimatePresence>
          {isOutdated && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#18181b] p-6 text-center"
            >
              <h1 className="text-3xl md:text-5xl max-w-2xl claude-font text-[#e4e4e7] mb-6 leading-tight">
                A gente atualizou o site e você não pode ficar para trás
              </h1>
              <p className="text-xl md:text-2xl claude-font text-[#a1a1aa] mb-12">
                Atualize a página e continue usando a IA!
              </p>
              <button
                onClick={() => window.location.reload()}
                className="snake-btn group flex items-center justify-between gap-4 px-6 py-4 bg-[#27272a] hover:bg-[#3f3f46] border border-[#3f3f46] rounded-2xl transition-colors min-w-[200px]"
              >
                <span className="text-[#e4e4e7] font-medium claude-font text-lg">
                  Atualizar Agora
                </span>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#e4e4e7]"
                >
                  <path d="M5 12h14" className="snake-line" />
                  <path
                    d="m12 5 7 7-7 7"
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isTotoVerificationOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-sm overflow-hidden rounded-[32px] border border-[var(--border-strong)] bg-gradient-to-b from-[var(--bg-panel)] to-[var(--bg-base)] shadow-2xl"
              >
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-sec)] to-transparent" />

                <div className="p-8 text-center">
                  {/* Icon */}
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full bg-[var(--color-sec)]/10 animate-ping opacity-50" />
                    <div className="relative w-20 h-20 rounded-full bg-[var(--color-sec)]/15 border border-[var(--color-sec)]/30 flex items-center justify-center">
                      <Dog className="w-10 h-10 text-[var(--color-sec)]" />
                    </div>
                  </div>

                  <h2 className="text-2xl font-black text-white tracking-tight mb-1">
                    Totó <span className="text-[var(--color-sec)]">1.0</span>
                  </h2>
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-5">
                    Assistente de Inglês
                  </p>

                  {/* Help Section */}
                  <div className="mb-6">
                    <button
                      onClick={() => setIsTotoHelpExpanded(!isTotoHelpExpanded)}
                      className="flex justify-between items-center w-full bg-[var(--bg-surface)] px-4 py-3 rounded-xl border border-[var(--border-strong)] hover:border-[var(--color-sec)]/50 transition-colors"
                    >
                      <span className="text-sm font-bold text-[var(--text-base)]">
                        Não sabe como usar?
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-300 ${isTotoHelpExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                    <AnimatePresence>
                      {isTotoHelpExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <ul className="text-xs text-[var(--text-muted)] text-left mt-3 space-y-2 bg-[var(--bg-surface)]/50 p-4 rounded-xl border border-[var(--border-subtle)]">
                            <li className="flex gap-2">
                              <span className="text-[var(--color-sec)]">❯</span>{" "}
                              Clique no botão Compartilhar Tela
                            </li>
                            <li className="flex gap-2">
                              <span className="text-[var(--color-sec)]">❯</span>{" "}
                              Estará por padrão selecionado "Guia do Chrome"
                              selecione "Tela Inteira"
                            </li>
                            <li className="flex gap-2">
                              <span className="text-[var(--color-sec)]">❯</span>{" "}
                              Clique em compartilhar
                            </li>
                            <li className="flex gap-2">
                              <span className="text-[var(--color-sec)]">❯</span>{" "}
                              Abra a guia que você deseja obter as respostas
                            </li>
                            <li className="flex gap-2">
                              <span className="text-[var(--color-sec)]">❯</span>{" "}
                              Scrolle até o final deixando bem claro as
                              perguntas
                            </li>
                            <li className="flex gap-2">
                              <span className="text-[var(--color-sec)]">❯</span>{" "}
                              Volte ao site e confirme o envio do vídeo
                            </li>
                            <li className="flex gap-2 text-[var(--color-sec)] font-bold">
                              <span>❯</span> A ia vai responder tudo para voce
                            </li>
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <p className="text-red-500 font-bold text-xs mb-3 text-center tracking-wide">
                    Considere verificar informações importantes.
                  </p>

                  <div className="space-y-3">
                    <button
                      onClick={startTotoWeb}
                      className="w-full py-4 bg-[var(--color-sec)] text-black rounded-2xl font-black text-base shadow-[0_8px_20px_rgba(234,179,8,0.25)] hover:shadow-[0_8px_30px_rgba(234,179,8,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <Monitor className="w-5 h-5" />
                      Compartilhar Tela
                    </button>

                    <button
                      onClick={() => {
                        setIsTotoVerificationOpen(false);
                        setSelectedModel("thinking");
                      }}
                      className="w-full py-2.5 text-[var(--text-muted)] hover:text-white transition-colors text-sm font-medium rounded-xl hover:bg-[var(--bg-surface)]"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gallery Full Screen Overlay */}
        <AnimatePresence>
          {isGalleryOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeGallery}
              className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="fixed inset-0 z-[160] bg-[var(--bg-surface)] flex flex-col"
              >
                {/* Close button */}
                <button
                  onClick={closeGallery}
                  className="absolute top-4 right-4 z-[170] p-2 hover:bg-[var(--bg-base)] rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--text-base)]" />
                </button>

                {/* Header */}
                <div className="p-6 pb-0 pt-6">
                  <h2 className="text-xl font-bold mb-4 pr-12">Galeria</h2>

                  {/* Filter buttons */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {[
                      { label: "Tudo", value: "all" as const },
                      { label: "Fotos", value: "photos" as const },
                      { label: "Mapas Mentais", value: "mindmaps" as const },
                    ].map((f) => (
                      <button
                        key={f.value}
                        onClick={() => {
                          setGalleryFilter(f.value);
                          setSelectedGalleryItems([]);
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${galleryFilter === f.value ? "bg-[var(--color-sec)] text-white" : "bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-base)]"}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Search bar and view toggle */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={gallerySearch}
                        onChange={(e) => {
                          setGallerySearch(e.target.value);
                          setSelectedGalleryItems([]);
                        }}
                        placeholder="Buscar na galeria..."
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)] transition-colors placeholder-[var(--text-muted)]"
                      />
                    </div>
                    <button
                      onClick={() =>
                        setGalleryView(galleryView === "grid" ? "list" : "grid")
                      }
                      className="p-2.5 bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-xl hover:bg-[var(--bg-input)] transition-colors"
                      title={galleryView === "grid" ? "Lista" : "Grade"}
                    >
                      {galleryView === "grid" ? (
                        <List className="w-4 h-4 text-[var(--text-muted)]" />
                      ) : (
                        <Grid3X3 className="w-4 h-4 text-[var(--text-muted)]" />
                      )}
                    </button>
                  </div>

                  {/* Download bar for selected items */}
                  {selectedGalleryItems.length > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-[var(--color-sec)]/10 border border-[var(--color-sec)]/30 rounded-xl mb-3">
                      <span className="text-sm font-bold text-[var(--text-base)]">
                        {selectedGalleryItems.length} selecionado(s)
                      </span>
                      <button
                        onClick={downloadSelected}
                        className="ml-auto flex items-center gap-2 px-4 py-2 bg-[var(--color-sec)] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                      >
                        <Download className="w-4 h-4" />
                        Baixar selecionados
                      </button>
                    </div>
                  )}
                </div>

                {/* Gallery content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {galleryItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <FolderOpen className="w-12 h-12 text-[var(--text-muted)] mb-4" />
                      <p className="text-[var(--text-muted)] font-medium">
                        Nenhum item encontrado
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        Envie fotos ou gere mapas mentais para visualizá-los
                        aqui.
                      </p>
                    </div>
                  ) : galleryView === "grid" ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6 pt-3">
                      {galleryItems.map((item) => {
                        const isSelected = selectedGalleryItems.includes(
                          item.id,
                        );
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleGalleryItem(item.id)}
                            className={`relative group aspect-square rounded-xl border-2 cursor-pointer overflow-hidden transition-all ${isSelected ? "border-[var(--color-sec)] ring-2 ring-[var(--color-sec)]/30" : "border-[var(--border-strong)] hover:border-[var(--border-subtle)]"}`}
                          >
                            {item.type === "photo" ? (
                              <img
                                src={item.url}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-[var(--bg-base)] flex items-center justify-center p-4">
                                <MindMap
                                  data={JSON.parse(item.url)}
                                  onFeedbackRequest={() => {}}
                                />
                              </div>
                            )}
                            {/* Checkmark overlay */}
                            <div
                              className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${isSelected ? "bg-[var(--color-sec)]" : "bg-black/50 opacity-0 group-hover:opacity-100"}`}
                            >
                              {isSelected && (
                                <Check className="w-4 h-4 text-white" />
                              )}
                            </div>
                            {/* Item info */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                              <p className="text-xs text-white font-medium truncate">
                                {item.title}
                              </p>
                              <p className="text-[10px] text-white/60">
                                {item.modified.toLocaleDateString()} •{" "}
                                {item.size}
                              </p>
                              {/* Delete button - grid */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setGalleryItemToDelete(item.id);
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-lg hover:bg-red-500/80 transition-colors opacity-0 group-hover:opacity-100"
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-white" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 pt-3">
                      {galleryItems.map((item) => {
                        const isSelected = selectedGalleryItems.includes(
                          item.id,
                        );
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleGalleryItem(item.id)}
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-colors mb-2 ${isSelected ? "bg-[var(--color-sec)]/10 border border-[var(--color-sec)]/30" : "border border-transparent hover:bg-[var(--bg-base)]"}`}
                          >
                            {item.type === "photo" ? (
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-[var(--bg-base)] flex-shrink-0">
                                <img
                                  src={item.url}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                                <Edit2 className="w-5 h-5 text-purple-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--text-base)] truncate">
                                {item.title}
                              </p>
                              <p className="text-xs text-[var(--text-muted)]">
                                {item.modified.toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[var(--text-muted)]">
                                {item.size}
                              </span>
                              {isSelected && (
                                <Check className="w-4 h-4 text-[var(--color-sec)]" />
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setGalleryItemToDelete(item.id);
                                }}
                                className="p-2 hover:bg-[var(--bg-base)] rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4 text-red-400 hover:text-red-300" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gallery Delete Confirmation */}
        <AnimatePresence>
          {galleryItemToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setGalleryItemToDelete(null)}
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className="font-bold text-[var(--text-base)]">
                    Excluir item?
                  </h3>
                </div>
                <p className="text-sm text-[var(--text-muted)] mb-6">
                  Tem certeza que deseja excluir este item? Essa ação não pode
                  ser desfeita.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setGalleryItemToDelete(null)}
                    className="flex-1 py-3 rounded-xl bg-[var(--bg-surface)] text-[var(--text-base)] font-medium transition-colors hover:bg-[var(--border-strong)]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      setSelectedGalleryItems((prev) =>
                        prev.filter((id) => id !== galleryItemToDelete),
                      );
                      setGalleryItemToDelete(null);
                    }}
                    className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium transition-colors hover:bg-red-600"
                  >
                    Excluir
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* === Groups Screen === */}
        <AnimatePresence>
          {isGroupsScreenOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGroupsScreenOpen(false)}
              className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                onClick={(e) => e.stopPropagation()}
                className="fixed inset-0 z-[160] bg-[var(--bg-surface)] md:inset-y-0 md:right-0 md:w-full md:max-w-[500px] flex flex-col"
              >
                {/* Close button */}
                <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                  <h2 className="text-2xl font-bold text-[var(--text-base)]">
                    Grupos
                  </h2>
                  <button
                    onClick={() => setIsGroupsScreenOpen(false)}
                    className="p-2 hover:bg-[var(--bg-base)] rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-[var(--text-base)]" />
                  </button>
                </div>

                {/* Search & Create */}
                <div className="p-4 space-y-3 border-b border-[var(--border-subtle)]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      value={groupsScreenSearch}
                      onChange={(e) => setGroupsScreenSearch(e.target.value)}
                      placeholder="Pesquisar grupos..."
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-base)] focus:outline-none focus:border-[var(--color-sec)] placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setIsGroupsScreenOpen(false);
                      setIsGroupModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--color-sec)] hover:opacity-90 rounded-xl text-sm font-medium text-black transition-opacity"
                  >
                    <Plus className="w-4 h-4" /> Criar Grupo
                  </button>
                </div>

                {/* Groups List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                  {filteredGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-20">
                      <Users className="w-16 h-16 text-[var(--text-muted)] mb-4 opacity-50" />
                      <p className="text-lg font-medium text-[var(--text-muted)]">
                        Parece que você não está em nenhum grupo
                      </p>
                      <p className="text-sm text-[var(--text-muted)] mt-2 opacity-70">
                        Crie um grupo ou peça para entrar em um
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredGroups.map((group: any) => (
                        <button
                          key={group.id}
                          onClick={() => {
                            setSelectedGroupId(group.id);
                            setCurrentSessionId(null);
                            setIsGroupsScreenOpen(false);
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-base)] hover:bg-[var(--border-strong)] transition-colors text-left"
                        >
                          <div className="w-12 h-12 rounded-full bg-[var(--bg-input)] flex items-center justify-center shrink-0 border border-[var(--border-strong)]">
                            <MessageSquare className="w-6 h-6 text-[var(--color-sec)]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[var(--text-base)] truncate">
                              {group.name}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {group.members?.length || 0} membro
                              {(group.members?.length || 0) !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
