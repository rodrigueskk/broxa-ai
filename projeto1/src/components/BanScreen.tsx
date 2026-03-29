import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Send, ArrowRight, MessageSquareQuote } from 'lucide-react';

interface BanScreenProps {
  appealStatus: 'pending' | 'approved' | 'denied' | null;
  onSubmitAppeal: (text: string) => void;
}

export const BanScreen: React.FC<BanScreenProps> = ({ appealStatus, onSubmitAppeal }) => {
  const [appealText, setAppealText] = useState('');
  const [showAppealForm, setShowAppealForm] = useState(false);

  return (
    <div className="fixed inset-0 z-[1000] bg-[#0a0a0a] flex items-center justify-center p-6 sm:p-12 overflow-hidden font-sans selection:bg-[#3d3d3d]">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-900/20 blur-[120px] rounded-full" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-900/20 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-2xl bg-[#141414] border border-white/5 rounded-[40px] p-10 sm:p-16 shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col items-center text-center"
      >
        <motion.div 
          initial={{ scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12 }}
          className="w-20 h-20 rounded-[24px] bg-red-500/10 flex items-center justify-center mb-10 border border-red-500/20"
        >
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </motion.div>

        <h1 className="text-4xl sm:text-5xl font-semibold text-white mb-4 tracking-tight">
          Você foi permanentemente banido.
        </h1>
        
        <p className="text-xl text-zinc-400 font-medium mb-12">
          Nós avisamos, mas você ignorou os nossos termos de segurança.
        </p>

        <div className="w-full max-w-md space-y-6 flex flex-col items-center">
          {appealStatus === null && !showAppealForm && (
            <button 
              onClick={() => setShowAppealForm(true)}
              className="group flex items-center justify-center gap-2 text-[#3b82f6] hover:text-[#60a5fa] transition-colors font-semibold text-lg underline underline-offset-8 decoration-white/10 hover:decoration-current"
            >
              Acha que foi injusto? Faça um apelo
            </button>
          )}

          {appealStatus === 'pending' && (
            <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 flex flex-col items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <p className="text-zinc-300 font-medium">Seu apelo está em análise pela nossa equipe.</p>
              <p className="text-sm text-zinc-500 leading-relaxed">Isso pode levar alguns dias. Verifique novamente mais tarde.</p>
            </div>
          )}

          {appealStatus === 'denied' && (
            <div className="p-8 rounded-[32px] bg-red-500/5 border border-red-500/10 flex flex-col items-center gap-4">
              <p className="text-red-400 font-bold text-xl">Seu apelo foi negado.</p>
              <p className="text-sm text-zinc-500 leading-relaxed">Após revisão cuidadosa, decidimos manter o banimento permanente. Esta decisão é final.</p>
            </div>
          )}

          <AnimatePresence>
            {showAppealForm && appealStatus === null && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden w-full text-left"
              >
                <div className="mb-4 flex items-center gap-2 text-zinc-500">
                   <MessageSquareQuote className="w-4 h-4" />
                   <span className="text-sm font-medium uppercase tracking-widest">Seu Apelo</span>
                </div>
                <textarea 
                  value={appealText}
                  onChange={(e) => setAppealText(e.target.value)}
                  placeholder="Explique por que seu banimento deve ser revogado..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-[24px] p-6 text-white text-lg focus:outline-none focus:border-white/20 transition-all min-h-[160px] resize-none leading-relaxed"
                />
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="text-sm text-zinc-500">
                    <span className={appealText.length >= 50 ? 'text-green-500 font-bold' : 'text-red-500/50'}>
                      {appealText.length}
                    </span>
                    <span className="mx-1">/</span>
                    <span>mínimo 50 caracteres</span>
                  </div>
                  <button 
                    disabled={appealText.length < 50}
                    onClick={() => onSubmitAppeal(appealText)}
                    className="w-full sm:w-auto px-8 py-4 bg-white text-black rounded-full font-bold hover:bg-zinc-200 transition-all disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    Enviar Apelo 
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  onClick={() => setShowAppealForm(false)}
                  className="mt-8 text-sm text-zinc-600 hover:text-zinc-400 font-medium w-full text-center"
                >
                  Cancelar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="absolute bottom-12 text-zinc-700 text-[10px] uppercase tracking-[0.3em] font-bold">
        BROXA AI • SECURITY COMPLIANCE ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
      </div>
    </div>
  );
};
