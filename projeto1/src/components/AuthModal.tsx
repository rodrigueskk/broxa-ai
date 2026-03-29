import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, ArrowLeft, Eye, EyeOff, ShieldCheck, RefreshCw } from 'lucide-react';
import { auth, signInWithGoogle, db } from '../firebase';
import { fetchSignInMethodsForEmail, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, EmailAuthProvider, linkWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { SpotifySuccess } from './SpotifySuccess';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStep?: 'email' | 'password' | 'signup' | 'otp' | 'create_google_password';
  initialPassword?: string;
}

type AuthStep = 'email' | 'password' | 'signup' | 'otp' | 'create_google_password';

export function AuthModal({ isOpen, onClose, initialStep, initialPassword }: AuthModalProps) {
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWeakWarning, setShowWeakWarning] = useState(false);

  // OTP State
  const [otpInputs, setOtpInputs] = useState(['', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpAction, setOtpAction] = useState<{type: 'login' | 'signup' | 'google_link'} | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const getPasswordStrength = (pass: string) => {
    if (pass.length === 0) return { label: '', color: 'bg-transparent' };
    if (pass.length < 6) return { label: 'Fraca', color: 'bg-red-500' };
    const hasLetters = /[a-zA-Z]/.test(pass);
    const hasNumbers = /[0-9]/.test(pass);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pass);
    
    if (hasLetters && hasNumbers && hasSpecial && pass.length >= 8) return { label: 'Forte', color: 'bg-green-500' };
    if (hasLetters && hasNumbers) return { label: 'Média', color: 'bg-yellow-500' };
    return { label: 'Fraca', color: 'bg-red-500' };
  };

  const strength = getPasswordStrength(password);

  const maskEmail = (emailStr: string) => {
    const [namePart, domain] = emailStr.split('@');
    if (!namePart || !domain) return emailStr;
    if (namePart.length <= 2) return `**@${domain}`;
    const masked = '*'.repeat(namePart.length - 2) + namePart.slice(-2);
    return `${masked}@${domain}`;
  };

  React.useEffect(() => {
    if (isOpen) {
      const step = initialStep || 'email';
      setStep(step);
      
      const currentEmail = initialStep === 'create_google_password' && auth.currentUser?.email 
        ? auth.currentUser.email 
        : '';
      setEmail(currentEmail);
      
      const initialPass = initialPassword || '';
      setPassword(initialPass);
      setConfirmPassword(initialPass);
      
      setShowPassword(false);
      setName(auth.currentUser?.displayName || '');
      setError('');
      setIsLoading(false);
      setShowWeakWarning(false);
      setOtpInputs(['', '', '', '']);
      setOtpCooldown(0);
      setIsSuccess(false);

      // Auto-start OTP when coming from settings
      if (initialStep === 'create_google_password' && initialPass && currentEmail && auth.currentUser) {
        // Simple artificial delay to ensure everything is set
        setTimeout(() => {
          startOtpFlow({ type: 'google_link' });
        }, 300);
      }
    }
  }, [isOpen, initialStep, initialPassword]);

  React.useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (otpCooldown === 0 && generatedOtp) {
      setGeneratedOtp(''); // Código expira quando o tempo acaba
    }
  }, [otpCooldown, generatedOtp]);

  if (!isOpen) return null;

  const checkIpAndAttempts = async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      const ip = data.ip;
      
      const ipDoc = await getDoc(doc(db, 'bannedIPs', ip.replace(/\./g, '_')));
      if (ipDoc.exists()) {
        const { bannedUntil } = ipDoc.data();
        if (bannedUntil && Date.now() < bannedUntil) {
          throw new Error(`Suspicious activity detected. Action blocked for this IP until ${new Date(bannedUntil).toLocaleTimeString()}.`);
        }
      }
      return ip;
    } catch (err: any) {
      if (err.message.includes('Suspicious activity')) throw err;
      return 'unknown_ip';
    }
  };

  const recordOtpRequest = async (ip: string) => {
    if (ip === 'unknown_ip') return;
    const ipId = ip.replace(/\./g, '_');
    const ipRef = doc(db, 'bannedIPs', ipId);
    const ipDoc = await getDoc(ipRef);
    
    if (ipDoc.exists()) {
      const data = ipDoc.data();
      const newAttempts = (data.attempts || 0) + 1;
      if (newAttempts >= 5) {
        const hours = 2 * (newAttempts - 4);
        const bannedUntil = Date.now() + (hours * 60 * 60 * 1000);
        await updateDoc(ipRef, { attempts: newAttempts, bannedUntil });
        throw new Error(`Múltiplas requisições suspeitas. IP suspenso por ${hours} horas.`);
      } else {
        await updateDoc(ipRef, { attempts: newAttempts });
      }
    } else {
      await setDoc(ipRef, { attempts: 1, bannedUntil: 0 });
    }
  };

  const startOtpFlow = async (action: {type: 'login' | 'signup' | 'google_link'}) => {
    try {
      const ip = await checkIpAndAttempts();
      await recordOtpRequest(ip);

      setOtpAction(action);
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedOtp(code);
      setOtpInputs(['', '', '', '']);
      setStep('otp');
      setOtpCooldown(60);
      
      console.log(`%c [🔒 BROXA AI SECURITY] NOVO CÓDIGO OTP ENVIADO PARA ${email}: ${code} `, 'background: #111; color: #00ff00; font-size: 16px; font-weight: bold; border: 1px solid #00ff00;');
      
      try {
        const emailData = {
          service_id: 'service_5nwu12y',
          template_id: 'template_tcwsuoa',
          user_id: 'q_U44pH0ejGEKSepN',
          template_params: {
            to_email: email,
            reply_to: 'suporte@broxa.ai',
            message: `O seu código de verificação BROXA AI é: ${code}`,
            code: code,
            passcode: code,
            duration: '60',
            time: '60'
          }
        };

        const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          body: JSON.stringify(emailData),
          headers: { 'Content-Type': 'application/json' }
        });

        if (!res.ok) {
          const textError = await res.text();
          throw new Error(textError || 'Erro desconhecido da API do EmailJS');
        }
      } catch (emailErr: any) {
        console.error('Erro ao enviar e-mail via fetch:', emailErr);
        throw new Error(`EmailJS: ${emailErr.message}`);
      }

    } catch (err: any) {
      setError(err.message || 'Erro ao processar verificações de segurança.');
      setIsLoading(false);
      throw err;
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isLoading) return;
    
    setError('');
    setIsLoading(true);
    console.log('[Auth] Verificando e-mail:', email);

    try {
      // Pequeno timeout de segurança caso a API do Firebase demore demais
      const methodsPromise = fetchSignInMethodsForEmail(auth, email);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));
      
      const methods = await Promise.race([methodsPromise, timeoutPromise]) as string[];
      
      console.log('[Auth] Métodos encontrados:', methods);
      if (methods.length > 0) {
        setStep('password');
      } else {
        setError('E-mail não encontrado. Por favor, crie uma nova conta.');
      }
    } catch (err: any) {
      console.error('[Auth] Erro ao verificar e-mail:', err);
      if (err.message === 'timeout' || err.code === 'auth/operation-not-allowed' || err.code === 'auth/admin-restricted-operation') {
        // Se a enumeração estiver bloqueada ou houver timeout, apenas prosseguimos para a senha
        setStep('password');
      } else {
        setError('Erro ao verificar e-mail. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      await auth.signOut(); // Immediately sign out so they don't bypass OTP
      
      await startOtpFlow({ type: 'login' });
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos.');
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (strength.label === 'Fraca' && !showWeakWarning) {
      setShowWeakWarning(true);
      setError('Sua senha é fraca. Clique novamente para confirmar mesmo assim.');
      return;
    }

    setIsLoading(true);
    try {
      await startOtpFlow({ type: 'signup' });
    } catch (err: any) {
      // handled in startOtpFlow
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newInputs = [...otpInputs];
    newInputs[index] = value;
    setOtpInputs(newInputs);
    setError('');

    if (value && index < 3) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
    
    if (index === 3 && value) {
      verifyOtp(newInputs.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpInputs[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const verifyOtp = async (code: string) => {
    setIsLoading(true);
    setError('');
    
    if (!generatedOtp) {
      setError('O código expirou. Solicite um novo.');
      setOtpInputs(['', '', '', '']);
      document.getElementById('otp-0')?.focus();
      setIsLoading(false);
      return;
    }

    if (code === generatedOtp) {
      try {
        if (otpAction?.type === 'login') {
          await signInWithEmailAndPassword(auth, email, password);
        } else if (otpAction?.type === 'signup') {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(userCredential.user, { displayName: name });
        } else if (otpAction?.type === 'google_link') {
          if (auth.currentUser) {
            const credential = EmailAuthProvider.credential(email, password);
            await linkWithCredential(auth.currentUser, credential);
          }
        }
        setIsSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } catch(err: any) {
        console.error('OTP Verification Error:', err);
        if (err.code === 'auth/credential-already-in-use') {
          setError('Este e-mail já está vinculado a outra conta.');
        } else if (err.code === 'auth/requires-recent-login') {
          setError('Sessão expirada. Faça login novamente para vincular a senha.');
        } else {
          setError(`Erro: ${err.message || 'Falha de sistema interno'}`);
        }
        setIsLoading(false);
      }
    } else {
      setError('Código incorreto.');
      setOtpInputs(['', '', '', '']);
      document.getElementById('otp-0')?.focus();
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithGoogle();
      if (!result) return;
      const user = result.user;
      
      const hasPassword = user.providerData.some((p: any) => p.providerId === 'password');
      
      if (!hasPassword) {
        setEmail(user.email || '');
        setStep('create_google_password');
      } else {
        onClose();
      }
    } catch (err) {
      setError('Erro ao fazer login com Google.');
    }
  };

  const handleGooglePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (strength.label === 'Fraca' && !showWeakWarning) {
      setShowWeakWarning(true);
      setError('Sua senha é fraca. Clique novamente para confirmar mesmo assim.');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      await startOtpFlow({ type: 'google_link' });
    } catch (err: any) {
      // erro lidado no startOtpFlow
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-[var(--bg-panel)] rounded-3xl border border-[var(--border-strong)] w-full max-w-md shadow-2xl overflow-hidden"
        >
          <div className="flex justify-between items-center p-6 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              {step !== 'email' && step !== 'otp' && (
                <button onClick={() => { setStep('email'); setError(''); }} className="p-1 hover:bg-[var(--bg-surface)] rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-[var(--text-muted)]" />
                </button>
              )}
              {step === 'otp' && (
                <button onClick={() => { setStep(otpAction?.type === 'login' ? 'password' : otpAction?.type === 'google_link' ? 'create_google_password' : 'signup'); setError(''); }} className="p-1 hover:bg-[var(--bg-surface)] rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-[var(--text-muted)]" />
                </button>
              )}
              <h3 className="text-xl font-bold text-[var(--text-base)]">
                {step === 'email' ? 'Fazer Login' : step === 'password' ? 'Digite sua senha' : step === 'signup' ? 'Criar Conta' : step === 'create_google_password' ? 'Nova Segurança' : 'Código de Verificação'}
              </h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[var(--bg-surface)] rounded-full transition-colors text-[var(--text-muted)] hover:text-[var(--text-base)]">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                {error}
              </div>
            )}

            {step === 'email' && (
              <div className="space-y-4">
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-[var(--color-sec)]"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={isLoading || !email}
                    className="w-full py-3 bg-white text-black hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-colors"
                  >
                    {isLoading ? 'Verificando...' : 'Continuar'}
                  </button>
                </form>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-[var(--border-subtle)]"></div>
                  <span className="flex-shrink-0 mx-4 text-[var(--text-muted)] text-sm">ou</span>
                  <div className="flex-grow border-t border-[var(--border-subtle)]"></div>
                </div>

                <button 
                  onClick={handleGoogleLogin}
                  className="w-full py-3 bg-[var(--bg-surface)] hover:bg-[var(--border-subtle)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continuar com Google
                </button>

                <button 
                  onClick={() => { setStep('signup'); setError(''); }}
                  className="w-full py-3 text-[var(--color-sec)] hover:bg-[var(--color-sec)]/10 rounded-xl font-medium transition-colors"
                >
                  Criar uma nova conta
                </button>
              </div>
            )}

            {step === 'password' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] mb-4">
                  <p className="text-sm text-[var(--text-muted)]">Fazendo login como:</p>
                  <p className="font-medium text-[var(--text-base)] truncate">{email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha"
                      className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl py-3 pl-10 pr-12 focus:outline-none focus:border-[var(--color-sec)]"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-base)]"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={isLoading || !password}
                  className="w-full py-3 bg-[var(--color-sec)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-colors"
                >
                  {isLoading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
            )}

            {step === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="p-3 bg-[var(--color-sec)]/10 border border-[var(--color-sec)]/20 rounded-xl mb-4 text-center text-sm font-medium text-[var(--color-sec)]">
                  Permitida apenas 1 conta por e-mail.
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome completo"
                      className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-[var(--color-sec)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-[var(--color-sec)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setShowWeakWarning(false);
                      }}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl py-3 pl-10 pr-12 focus:outline-none focus:border-[var(--color-sec)]"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-base)]"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
                        <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: strength.label === 'Fraca' ? '33%' : strength.label === 'Média' ? '66%' : '100%' }}></div>
                      </div>
                      <span className={`text-xs font-medium ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Confirmar Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirme sua senha"
                      className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl py-3 pl-10 pr-12 focus:outline-none focus:border-[var(--color-sec)]"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={isLoading || !email || !password || !name || !confirmPassword}
                  className="w-full py-3 bg-[var(--color-sec)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-colors"
                >
                  {isLoading ? 'Processando...' : showWeakWarning ? 'Criar Conta Mesmo Assim' : 'Criar Conta e Entrar'}
                </button>
              </form>
            )}

            {step === 'create_google_password' && (
              <form onSubmit={handleGooglePasswordSubmit} className="space-y-4">
                <div className="p-4 bg-[var(--color-sec)]/10 border border-[var(--color-sec)]/20 rounded-xl mb-6 text-center">
                  <p className="text-[var(--text-base)] font-bold mb-2">Estamos atualizando nossa segurança!</p>
                  <p className="text-sm text-[var(--text-muted)] mb-3">
                    Você entrou via Google. Para proteger ainda mais seus dados, pedimos que crie uma senha para realizar acessos de forma manual se necessário.
                  </p>
                  <p className="text-xs font-semibold text-[var(--color-sec)]">
                    Estes dados são 100% protegidos.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Crie sua nova Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setShowWeakWarning(false);
                      }}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl py-3 pl-10 pr-12 focus:outline-none focus:border-[var(--color-sec)]"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-base)]"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-2 flex items-center gap-2">
                       <div className="flex-1 h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
                        <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: strength.label === 'Fraca' ? '33%' : strength.label === 'Média' ? '66%' : '100%' }}></div>
                      </div>
                      <span className={`text-xs font-medium ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Confirmar Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirme sua senha"
                      className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl py-3 pl-10 pr-12 focus:outline-none focus:border-[var(--color-sec)]"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={isLoading || !password || password.length < 6 || !confirmPassword}
                  className="w-full py-3 bg-[var(--color-sec)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-colors"
                >
                  {isLoading ? 'Verificando...' : showWeakWarning ? 'Criar Mesmo Assim' : 'Continuar'}
                </button>
              </form>
            )}

            {step === 'otp' && (
              <div className="space-y-6 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-[var(--color-sec)]/10 flex items-center justify-center mb-2">
                  <ShieldCheck className="w-8 h-8 text-[var(--color-sec)]" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-[var(--text-base)] font-medium">Enviamos um código para o seu e-mail!</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    Enviado para: <span className="font-bold">{maskEmail(email)}</span>
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    O código expira em: <span className="font-bold text-[var(--color-sec)]">{otpCooldown}s</span>
                  </p>
                </div>
                
                <div className="flex items-center justify-center gap-3 my-4">
                  {isSuccess ? (
                    <div className="flex flex-col items-center justify-center p-4 min-h-[100px]">
                      <SpotifySuccess />
                    </div>
                  ) : (
                    [0, 1, 2, 3].map((index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={otpInputs[index]}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        autoFocus={index === 0}
                        disabled={isLoading}
                        className="w-14 h-16 text-center text-2xl font-black bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-2xl focus:outline-none focus:border-[var(--color-sec)] focus:ring-2 focus:ring-[var(--color-sec)]/20 transition-all disabled:opacity-50"
                      />
                    ))
                  )}
                </div>

                {isLoading && !isSuccess && (
                  <div className="flex items-center justify-center gap-2 text-[var(--color-sec)] font-medium">
                    <RefreshCw className="w-5 h-5 animate-spin" /> Verificando...
                  </div>
                )}

                {!isSuccess && (
                  <div className="pt-4 border-t border-[var(--border-subtle)] w-full text-center">
                    <button
                      onClick={() => startOtpFlow(otpAction!)}
                      disabled={otpCooldown > 0 || isLoading}
                      className="text-sm font-medium text-[var(--color-sec)] hover:underline disabled:opacity-50 disabled:hover:no-underline disabled:cursor-not-allowed"
                    >
                      {otpCooldown > 0 ? `Aguarde ${otpCooldown}s para reenviar` : 'Não recebi o código / Reenviar'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
