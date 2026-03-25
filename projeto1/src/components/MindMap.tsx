import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Maximize2, Minimize2, Download, Edit3, Save, X, Undo2, Redo2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import './MindMap.css';

interface MindMapNode {
  title: string;
  children?: MindMapNode[];
}

interface MindMapProps {
  data: MindMapNode;
}

const Node = ({ 
  node, 
  level = 0, 
  isEditing, 
  onUpdate,
  path = []
}: { 
  node: MindMapNode; 
  level?: number;
  isEditing: boolean;
  onUpdate: (path: number[], newTitle: string) => void;
  path?: number[];
}) => {
  const isRoot = level === 0;
  
  return (
    <li>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: level * 0.1 }}
        className={`
          inline-block px-4 py-2 rounded-xl shadow-md border relative z-10
          ${isRoot 
            ? 'bg-[var(--color-sec)] text-white border-[var(--color-sec)] font-bold text-lg' 
            : 'bg-[var(--bg-surface)] text-[var(--text-base)] border-[var(--border-strong)]'
          }
        `}
      >
        {isEditing ? (
          <input
            type="text"
            value={node.title}
            onChange={(e) => onUpdate(path, e.target.value)}
            className={`bg-transparent border-b focus:outline-none text-center min-w-[80px] ${isRoot ? 'border-white/50 focus:border-white' : 'border-[var(--text-muted)] focus:border-[var(--text-base)]'}`}
            autoFocus={isRoot}
            size={Math.max(node.title.length, 5)}
          />
        ) : (
          <span>{node.title}</span>
        )}
      </motion.div>
      
      {node.children && node.children.length > 0 && (
        <ul>
          {node.children.map((child, index) => (
            <Node 
              key={index} 
              node={child} 
              level={level + 1} 
              isEditing={isEditing}
              onUpdate={onUpdate}
              path={[...path, index]}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export const MindMap: React.FC<MindMapProps> = ({ data }) => {
  const [history, setHistory] = useState<MindMapNode[]>([JSON.parse(JSON.stringify(data))]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [draftData, setDraftData] = useState<MindMapNode | null>(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const currentData = isEditing && draftData ? draftData : history[historyIndex];

  const deepCopy = (obj: any) => JSON.parse(JSON.stringify(obj));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history.length, isEditing]);

  const handleUndo = () => {
    if (isEditing) return;
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
    }
  };

  const handleRedo = () => {
    if (isEditing) return;
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
    }
  };

  const handleNodeUpdate = (path: number[], newTitle: string) => {
    if (!draftData) return;
    const newData = deepCopy(draftData);
    let current = newData;
    for (const idx of path) {
      current = current.children[idx];
    }
    current.title = newTitle;
    setDraftData(newData);
  };

  const startEditing = () => {
    setDraftData(deepCopy(history[historyIndex]));
    setIsEditing(true);
  };

  const saveChanges = () => {
    if (!draftData) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(deepCopy(draftData));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setDraftData(null);
    setIsEditing(false);
  };

  const cancelEditing = (actionAfter?: () => void) => {
    if (JSON.stringify(draftData) !== JSON.stringify(history[historyIndex])) {
      setPendingAction(() => () => {
        setIsEditing(false);
        setDraftData(null);
        if (actionAfter) actionAfter();
      });
      setShowUnsavedPrompt(true);
    } else {
      setIsEditing(false);
      setDraftData(null);
      if (actionAfter) actionAfter();
    }
  };

  const toggleFullscreen = () => {
    if (isFullscreen && isEditing) {
      cancelEditing(() => setIsFullscreen(false));
    } else {
      setIsFullscreen(!isFullscreen);
    }
  };

  const handleDownloadPDF = async () => {
    if (!mapRef.current) return;
    
    try {
      const canvas = await html2canvas(mapRef.current, {
        scale: 2,
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-base').trim() || '#ffffff',
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('mapa-mental.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const toolbar = (
    <div className={`flex flex-wrap justify-end gap-2 mb-4 ${isFullscreen ? 'fixed top-4 right-4 z-[10000] bg-[var(--bg-base)]/80 backdrop-blur p-2 rounded-xl shadow-sm border border-[var(--border-subtle)]' : 'absolute top-2 right-2 z-20'}`}>
      {!isEditing && (
        <>
          <button 
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-2 bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-base)] disabled:opacity-30 disabled:cursor-not-allowed border border-[var(--border-strong)] rounded-lg hover:bg-[var(--border-subtle)] transition-colors shadow-sm"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button 
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-base)] disabled:opacity-30 disabled:cursor-not-allowed border border-[var(--border-strong)] rounded-lg hover:bg-[var(--border-subtle)] transition-colors shadow-sm"
            title="Refazer (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </>
      )}

      {isEditing ? (
        <>
          <button 
            onClick={saveChanges}
            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm flex items-center gap-1 text-sm"
            title="Salvar alterações"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Salvar</span>
          </button>
          <button 
            onClick={() => cancelEditing()}
            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm flex items-center gap-1 text-sm"
            title="Cancelar edição"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Cancelar</span>
          </button>
        </>
      ) : (
        <button 
          onClick={startEditing}
          className="p-2 bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-base)] border border-[var(--border-strong)] rounded-lg hover:bg-[var(--border-subtle)] transition-colors shadow-sm flex items-center gap-1 text-sm"
          title="Editar textos"
        >
          <Edit3 className="w-4 h-4" />
          <span className="hidden sm:inline">Editar</span>
        </button>
      )}
      
      <button 
        onClick={handleDownloadPDF}
        className="p-2 bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-base)] border border-[var(--border-strong)] rounded-lg hover:bg-[var(--border-subtle)] transition-colors shadow-sm flex items-center gap-1 text-sm"
        title="Baixar PDF"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">PDF</span>
      </button>
      
      <button 
        onClick={toggleFullscreen}
        className="p-2 bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-base)] border border-[var(--border-strong)] rounded-lg hover:bg-[var(--border-subtle)] transition-colors shadow-sm"
        title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
      >
        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>
    </div>
  );

  const unsavedPrompt = showUnsavedPrompt && (
    <div className="fixed inset-0 z-[99999] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[var(--bg-surface)] p-6 rounded-2xl shadow-2xl border border-[var(--border-strong)] max-w-sm w-full">
        <h3 className="text-lg font-bold mb-2 text-[var(--text-base)]">Alterações não salvas</h3>
        <p className="text-[var(--text-muted)] mb-6">Você tem alterações no mapa mental que não foram salvas. O que deseja fazer?</p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={() => { setShowUnsavedPrompt(false); setPendingAction(null); }} 
            className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-input)] transition-colors"
          >
            Voltar
          </button>
          <button 
            onClick={() => { 
              setShowUnsavedPrompt(false); 
              if (pendingAction) pendingAction(); 
            }} 
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
          >
            Descartar
          </button>
          <button 
            onClick={() => { 
              saveChanges();
              setShowUnsavedPrompt(false);
              if (pendingAction) pendingAction();
            }} 
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-sec)] text-white hover:opacity-90 transition-opacity"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );

  const mapContent = (
    <>
      {toolbar}
      <div 
        ref={mapRef} 
        className={`min-w-max flex justify-center mindmap-tree ${isFullscreen ? 'flex-1 items-center mt-16' : ''} p-8`}
      >
        <ul>
          <Node node={currentData} isEditing={isEditing} onUpdate={handleNodeUpdate} />
        </ul>
      </div>
      {unsavedPrompt}
    </>
  );

  if (isFullscreen) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-[var(--bg-base)] overflow-auto flex flex-col p-4">
        {mapContent}
      </div>,
      document.body
    );
  }

  return (
    <div 
      ref={containerRef}
      className="w-full overflow-x-auto py-8 px-4 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-subtle)] my-4 relative min-h-[300px]"
    >
      {mapContent}
    </div>
  );
};
