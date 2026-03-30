import { useState, useEffect } from 'react';
import { ChatSession, Message, Stroke, Group, GroupMessage } from './types';
import { v4 as uuidv4 } from 'uuid';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, getDoc, updateDoc, arrayUnion, where, addDoc } from 'firebase/firestore';

export function useChatStore() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('broxa_ai_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('localStorage is not available', e);
      return [];
    }
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('broxa_ai_sessions', JSON.stringify(sessions));
    } catch (e) {
      console.warn('localStorage is not available', e);
    }
  }, [sessions]);

  const createSession = () => {
    const newSession: ChatSession = {
      id: uuidv4(),
      title: 'Nova Conversa',
      messages: [],
      updatedAt: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    return newSession.id;
  };

  const addMessage = (sessionId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessageId = uuidv4();
    setSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        const newMessage: Message = {
          ...message,
          id: newMessageId,
          timestamp: Date.now(),
        };
        const updatedMessages = [...session.messages, newMessage];
        
        let newTitle = session.title;
        if (updatedMessages.filter(m => m.role === 'user').length === 1 && message.role === 'user') {
            const textContent = message.content.trim();
            if (textContent) {
                newTitle = textContent.slice(0, 30) + (textContent.length > 30 ? '...' : '');
            } else if (message.imageUrl) {
                newTitle = 'Imagem enviada';
            }
        }

        return {
          ...session,
          title: newTitle,
          messages: updatedMessages,
          updatedAt: Date.now(),
        };
      }
      return session;
    }).sort((a, b) => b.updatedAt - a.updatedAt));
    return newMessageId;
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  };

  const togglePinSession = (sessionId: string) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, isPinned: !s.isPinned } : s));
  };

  const togglePinMessage = (sessionId: string, messageId: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          messages: s.messages.map(m => m.id === messageId ? { ...m, isPinned: !m.isPinned } : m)
        };
      }
      return s;
    }));
  };

  const addStroke = (sessionId: string, messageId: string, stroke: Stroke) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          messages: s.messages.map(m => {
            if (m.id === messageId) {
              return { ...m, strokes: [...(m.strokes || []), stroke] };
            }
            return m;
          })
        };
      }
      return s;
    }));
  };

  const setStrokes = (sessionId: string, messageId: string, strokes: Stroke[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          messages: s.messages.map(m => {
            if (m.id === messageId) {
              return { ...m, strokes };
            }
            return m;
          })
        };
      }
      return s;
    }));
  };

  const updateSessionTitle = (sessionId: string, newTitle: string) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: newTitle } : s));
  };

  const updateMessage = (sessionId: string, messageId: string, contentOrUpdate: string | Partial<Message>) => {
    setSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          messages: session.messages.map(msg => {
            if (msg.id === messageId) {
              if (typeof contentOrUpdate === 'string') {
                return { ...msg, content: contentOrUpdate };
              }
              return { ...msg, ...contentOrUpdate };
            }
            return msg;
          }),
          updatedAt: Date.now(),
        };
      }
      return session;
    }));
  };

  const addPinnedText = (sessionId: string, text: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          pinnedTexts: [...(s.pinnedTexts || []), { id: uuidv4(), text }]
        };
      }
      return s;
    }));
  };

  const removePinnedText = (sessionId: string, textId: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          pinnedTexts: (s.pinnedTexts || []).filter(t => t.id !== textId)
        };
      }
      return s;
    }));
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  return {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    currentSession,
    createSession,
    addMessage,
    updateMessage,
    deleteSession,
    togglePinSession,
    togglePinMessage,
    addPinnedText,
    removePinnedText,
    addStroke,
    setStrokes,
    updateSessionTitle
  };
}

export function useSettingsStore() {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('broxa_ai_settings');
      return saved ? JSON.parse(saved) : { enableEffects: true, theme: 'dark', secondaryColor: '#22c55e', customInstruction: '', backgroundImage: null, selectionColor: '#3b82f6', customTitleFont: 'BROXA AI', userMessageColor: '#ffffff' };
    } catch (e) {
      console.warn('localStorage is not available', e);
      return { enableEffects: true, theme: 'dark', secondaryColor: '#22c55e', customInstruction: '', backgroundImage: null, selectionColor: '#3b82f6', customTitleFont: 'BROXA AI', userMessageColor: '#ffffff' };
    }
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists() && docSnap.data().settings) {
            setSettings(docSnap.data().settings);
          }
        });
        return () => unsubscribeDoc();
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('broxa_ai_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('localStorage is not available', e);
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<typeof settings>) => {
    setSettings((s: any) => {
      const updated = { ...s, ...newSettings };
      if (auth.currentUser) {
        updateDoc(doc(db, 'users', auth.currentUser.uid), { settings: updated }).catch(console.error);
      }
      return updated;
    });
  };

  return { settings, updateSettings };
}

export interface ReleaseNoteImage {
  id: string;
  url: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface ReleaseNoteBadge {
  id: string;
  type: 'BETA' | 'EM DESENVOLVIMENTO' | 'NOVO' | 'REMOVIDO' | 'EM BREVE';
  x: number;
  y: number;
  scale: number;
}

export interface ReleaseNote {
  id: string;
  version: string;
  title: string;
  description: string;
  changes: string[];
  imageUrl?: string;
  date: number;
  // Customization fields
  titleRgb?: boolean;
  outlineColor?: string;
  backgroundColor?: string;
  buttonText?: string;
  buttonColor?: string;
  buttonRgb?: boolean;
  images?: ReleaseNoteImage[];
  badges?: ReleaseNoteBadge[];
}

export interface Feedback {
  id: string;
  messageId: string;
  isPositive: boolean;
  comment: string;
  date: number;
  userEmail?: string;
  model: string;
  prompt: string;
  response: string;
}

export interface AIModel {
  id: string;
  key: string;
  name: string;
  description: string;
  badgeType?: 'BETA' | 'EM DESENVOLVIMENTO' | 'NOVO' | 'REMOVIDO' | 'EM BREVE' | 'NENHUMA';
}

export function useAdminStore(isAdmin: boolean = false) {
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [allGroups, setAllGroups] = useState<any[]>([]);

  useEffect(() => {
    const qNotes = query(collection(db, 'releaseNotes'), orderBy('date', 'desc'));
    const unsubscribeNotes = onSnapshot(qNotes, (snapshot) => {
      const notes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReleaseNote[];
      setReleaseNotes(notes);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'releaseNotes');
    });

    let unsubscribeFeedbacks: () => void = () => {};
    let unsubscribeUsers: () => void = () => {};
    let unsubscribeAllGroups: () => void = () => {};
    if (isAdmin) {
      const qFeedbacks = query(collection(db, 'feedbacks'), orderBy('date', 'desc'));
      unsubscribeFeedbacks = onSnapshot(qFeedbacks, (snapshot) => {
        const fb = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Feedback[];
        setFeedbacks(fb);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'feedbacks');
      });

      const qUsers = query(collection(db, 'users'));
      unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
        const usrs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsers(usrs);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      });

      const qGroups = query(collection(db, 'groups'));
      unsubscribeAllGroups = onSnapshot(qGroups, (snapshot) => {
        const grps = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllGroups(grps);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'groups');
      });
    }

    const qModels = query(collection(db, 'aiModels'));
    const unsubscribeModels = onSnapshot(qModels, (snapshot) => {
      if (snapshot.empty) {
        // Initialize default models if none exist
        const defaultModels: AIModel[] = [
          { id: 'thinking', key: 'thinking', name: 'Thinking 1.1', description: 'Pensa mais para gerar respostas melhores', badgeType: 'NENHUMA' },
          { id: 'fast', key: 'fast', name: 'Fast 1.1', description: 'Respostas imediatas', badgeType: 'NENHUMA' },
          { id: 'search', key: 'search', name: 'Search 0.8', description: 'Bypass da Morgana', badgeType: 'BETA' },
          { id: 'as', key: 'as', name: 'A.S 0.5', description: 'Resumo', badgeType: 'EM DESENVOLVIMENTO' }
        ];
        if (isAdmin) {
          defaultModels.forEach(model => {
            setDoc(doc(db, 'aiModels', model.id), model).catch(e => console.error("Error creating default model:", e));
          });
        }
        setAiModels(defaultModels);
      } else {
        const models = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AIModel[];
        setAiModels(models);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'aiModels');
    });

    return () => {
      unsubscribeNotes();
      unsubscribeFeedbacks();
      unsubscribeModels();
      unsubscribeUsers();
      unsubscribeAllGroups();
    };
  }, [isAdmin]);

  const addReleaseNote = async (note: Omit<ReleaseNote, 'id' | 'date'>) => {
    if (!auth.currentUser) return;
    try {
      const newNoteRef = doc(collection(db, 'releaseNotes'));
      await setDoc(newNoteRef, {
        ...note,
        date: Date.now(),
        authorUid: auth.currentUser.uid
      });
    } catch (error) {
      console.error("Error adding release note:", error);
      throw error;
    }
  };

  const updateReleaseNote = async (id: string, note: Partial<Omit<ReleaseNote, 'id' | 'date'>>) => {
    if (!auth.currentUser) return;
    try {
      const noteRef = doc(db, 'releaseNotes', id);
      await updateDoc(noteRef, note);
    } catch (error) {
      console.error("Error updating release note:", error);
      throw error;
    }
  };

  const deleteReleaseNote = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'releaseNotes', id));
    } catch (error) {
      console.error("Error deleting release note:", error);
      throw error;
    }
  };

  const addFeedback = async (feedback: Omit<Feedback, 'id' | 'date'>) => {
    try {
      const newRef = doc(collection(db, 'feedbacks'));
      await setDoc(newRef, {
        ...feedback,
        date: Date.now()
      });
    } catch (error) {
      console.error("Error adding feedback:", error);
      throw error;
    }
  };

  const deleteFeedback = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'feedbacks', id));
    } catch (error) {
      console.error("Error deleting feedback:", error);
      throw error;
    }
  };

  const updateAiModel = async (id: string, updates: Partial<AIModel>) => {
    try {
      await updateDoc(doc(db, 'aiModels', id), updates);
    } catch (error) {
      console.error("Error updating AI model:", error);
      throw error;
    }
  };

  const updateUserStreak = async (userId: string, newStreak: number) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        streakDays: newStreak
      });
    } catch (error) {
      console.error("Error updating user streak:", error);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'developer' | 'user') => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        hasSeenRoleNotification: false // Reset notification when role changes to admin/dev
      });
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };

  const updateAdminGroupStreak = async (groupId: string, newStreak: number) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'groups', groupId), { streakDays: newStreak });
    } catch (error) {
      console.error("Error updating group streak:", error);
    }
  };

  const deleteAdminGroup = async (groupId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'groups', groupId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `groups/${groupId}`);
    }
  };

  const approveAppeal = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isBanned: false,
        violationsCount: 0,
        appealStatus: 'approved'
      });
    } catch (error) {
      console.error("Error approving appeal:", error);
    }
  };

  const denyAppeal = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        appealStatus: 'denied'
      });
    } catch (error) {
      console.error("Error denying appeal:", error);
    }
  };

  return { releaseNotes, feedbacks, aiModels, users, allGroups, addReleaseNote, updateReleaseNote, deleteReleaseNote, addFeedback, deleteFeedback, updateAiModel, updateUserStreak, updateUserRole, updateAdminGroupStreak, deleteAdminGroup, approveAppeal, denyAppeal };
}

export function useUserStore() {
  const [seenReleaseNotes, setSeenReleaseNotes] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'developer' | 'user' | null>(null);
  const [hasSeenRoleNotification, setHasSeenRoleNotification] = useState<boolean>(true);
  const [streakDays, setStreakDays] = useState(0);
  const [lastMessageDate, setLastMessageDate] = useState<string | null>(null);
  const [freezesAvailable, setFreezesAvailable] = useState(2);
  const [lastFreezeMonth, setLastFreezeMonth] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [hasSetProfile, setHasSetProfile] = useState<boolean>(false);
  const [unlockedFeatures, setUnlockedFeatures] = useState<string[]>([]);
  const [isUserLoaded, setIsUserLoaded] = useState<boolean>(false);
  const [violationsCount, setViolationsCount] = useState<number>(0);
  const [isBanned, setIsBanned] = useState<boolean>(false);
  const [appealStatus, setAppealStatus] = useState<'pending' | 'approved' | 'denied' | null>(null);
  const [appealText, setAppealText] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeDoc: () => void = () => {};

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        
        unsubscribeDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setSeenReleaseNotes(data.seenReleaseNotes || []);
            setUserRole(data.role);
            setHasSeenRoleNotification(data.hasSeenRoleNotification ?? true);
            setStreakDays(data.streakDays || 0);
            setLastMessageDate(data.lastMessageDate || null);
            setFreezesAvailable(data.freezesAvailable ?? 2);
            setLastFreezeMonth(data.lastFreezeMonth || null);
            setDisplayName(data.displayName || null);
            setPhotoURL(data.photoURL || null);
            setHasSetProfile(data.hasSetProfile || false);
            setUnlockedFeatures(data.unlockedFeatures || []);
            setViolationsCount(data.violationsCount || 0);
            setIsBanned(data.isBanned || false);
            setAppealStatus(data.appealStatus || null);
            setAppealText(data.appealText || null);
            setIsUserLoaded(true);
          } else {
            // Create user doc if it doesn't exist
            setDoc(userRef, {
              email: user.email,
              role: 'user',
              seenReleaseNotes: [],
              streakDays: 0,
              lastMessageDate: null,
              freezesAvailable: 2,
              lastFreezeMonth: new Date().toISOString().slice(0, 7),
              displayName: user.displayName || null,
              photoURL: user.photoURL || null,
              hasSetProfile: false,
              unlockedFeatures: [],
              violationsCount: 0,
              isBanned: false,
              appealStatus: null,
              appealText: null
            }).then(() => {
              setIsUserLoaded(true);
            }).catch(console.error);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        });
      } else {
        unsubscribeDoc();
        setSeenReleaseNotes([]);
        setUserRole(null);
        setStreakDays(0);
        setLastMessageDate(null);
        setFreezesAvailable(2);
        setLastFreezeMonth(null);
        setDisplayName(null);
        setPhotoURL(null);
        setHasSetProfile(false);
        setUnlockedFeatures([]);
        setViolationsCount(0);
        setIsBanned(false);
        setAppealStatus(null);
        setAppealText(null);
        setIsUserLoaded(true);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDoc();
    };
  }, []);

  const markAsSeen = async (id: string) => {
    if (!auth.currentUser) return;
    
    // Optimistic update
    setSeenReleaseNotes(prev => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        seenReleaseNotes: arrayUnion(id)
      });
    } catch (error) {
      console.error("Error marking note as seen:", error);
    }
  };

  const checkStreak = async () => {
    if (!auth.currentUser || !lastMessageDate) return false;
    
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const currentMonthStr = today.toISOString().slice(0, 7);
    
    let newFreezes = freezesAvailable;
    let newLastFreezeMonth = lastFreezeMonth;
    
    if (lastFreezeMonth !== currentMonthStr) {
      newFreezes = 2;
      newLastFreezeMonth = currentMonthStr;
    }

    const lastDate = new Date(lastMessageDate);
    const todayDate = new Date(todayStr);
    const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 1) {
      const missedDays = diffDays - 1;
      if (newFreezes < missedDays && streakDays > 0) {
        // Streak broken
        try {
          await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            streakDays: 0,
            freezesAvailable: newFreezes,
            lastFreezeMonth: newLastFreezeMonth
          });
          return true;
        } catch (error) {
          console.error("Error updating broken streak:", error);
        }
      }
    }
    return false;
  };

  const updateStreak = async () => {
    if (!auth.currentUser) return;
    
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const currentMonthStr = today.toISOString().slice(0, 7);
    
    let newFreezes = freezesAvailable;
    let newLastFreezeMonth = lastFreezeMonth;
    
    if (lastFreezeMonth !== currentMonthStr) {
      newFreezes = 2;
      newLastFreezeMonth = currentMonthStr;
    }

    let newStreak = streakDays;
    
    if (lastMessageDate === todayStr) {
      // Already messaged today, just update month if needed
      if (lastFreezeMonth !== currentMonthStr) {
        try {
          await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            freezesAvailable: newFreezes,
            lastFreezeMonth: newLastFreezeMonth
          });
        } catch (e) { console.error(e); }
      }
      return;
    }

    if (!lastMessageDate) {
      newStreak = 1;
    } else {
      const lastDate = new Date(lastMessageDate);
      const todayDate = new Date(todayStr);
      const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        const missedDays = diffDays - 1;
        if (newFreezes >= missedDays) {
          newFreezes -= missedDays;
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      }
    }

    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        streakDays: newStreak,
        lastMessageDate: todayStr,
        freezesAvailable: newFreezes,
        lastFreezeMonth: newLastFreezeMonth
      });
    } catch (error) {
      console.error("Error updating streak:", error);
    }
  };

  const updateProfile = async (name: string, photo: string | null) => {
    if (!auth.currentUser) return;
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        displayName: name,
        photoURL: photo,
        hasSetProfile: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };

  const markFeatureAsSeen = async (featureName: string) => {
    if (!auth.currentUser) return;
    
    setUnlockedFeatures(prev => [...prev, featureName]);
    
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        unlockedFeatures: arrayUnion(featureName)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };

  const markRoleNotificationAsSeen = async () => {
    if (!auth.currentUser) return;
    try {
      setHasSeenRoleNotification(true);
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        hasSeenRoleNotification: true
      });
    } catch (error) {
      console.error("Error marking role notification as seen:", error);
    }
  };

  const incrementViolations = async () => {
    if (!auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const newCount = violationsCount + 1;
    setViolationsCount(newCount);
    
    const updates: any = { violationsCount: newCount };
    if (newCount >= 10) {
      updates.isBanned = true;
      setIsBanned(true);
    }
    
    try {
      await updateDoc(userRef, updates);
    } catch (error) {
      console.error("Error updating violations:", error);
    }
  };

  const submitAppeal = async (text: string) => {
    if (!auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    try {
      await updateDoc(userRef, {
        appealStatus: 'pending',
        appealText: text
      });
      setAppealStatus('pending');
      setAppealText(text);
    } catch (error) {
      console.error("Error submitting appeal:", error);
    }
  };

  return { seenReleaseNotes, markAsSeen, userRole, hasSeenRoleNotification, markRoleNotificationAsSeen, streakDays, lastMessageDate, freezesAvailable, updateStreak, checkStreak, displayName, photoURL, hasSetProfile, updateProfile, unlockedFeatures, markFeatureAsSeen, isUserLoaded, violationsCount, isBanned, appealStatus, appealText, incrementViolations, submitAppeal };
}

export function useGroupStore() {
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    let unsubscribeGroups: () => void = () => {};

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setGroups([]);
        unsubscribeGroups();
        return;
      }

      const q = query(
        collection(db, 'groups'), 
        where('members', 'array-contains', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      unsubscribeGroups = onSnapshot(q, (snapshot) => {
        const groupsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
        setGroups(groupsData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'groups');
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeGroups();
    };
  }, []);

  const createGroup = async (name: string) => {
    if (!auth.currentUser) return;
    const newGroup: Omit<Group, 'id'> = {
      name,
      ownerId: auth.currentUser.uid,
      photoURL: null,
      systemInstruction: '',
      members: [auth.currentUser.uid],
      streakDays: 0,
      lastMessageDate: null,
      createdAt: Date.now()
    };
    const newDocRef = doc(collection(db, 'groups'));
    await setDoc(newDocRef, newGroup);
    return newDocRef.id;
  };

  const joinGroup = async (groupId: string) => {
    if (!auth.currentUser) return;
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      members: arrayUnion(auth.currentUser.uid)
    });
  };

  const renameGroup = async (groupId: string, newName: string) => {
    if (!auth.currentUser) return;
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, { name: newName });
  };

  const updateGroup = async (groupId: string, updates: Partial<Group>) => {
    if (!auth.currentUser) return;
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, updates);
  };

  const removeMember = async (groupId: string, userId: string) => {
    if (!auth.currentUser) return;
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) return;
    
    const data = groupSnap.data() as Group;
    if (data.ownerId !== auth.currentUser.uid) return; // Only owner can remove
    
    const newMembers = data.members.filter(id => id !== userId);
    await updateDoc(groupRef, { members: newMembers });

    // Notify the removed user
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: userId,
        message: `Você foi removido do grupo "${data.name}".`,
        timestamp: Date.now(),
        read: false
      });
    } catch (e) {
      console.error("Error creating notification:", e);
    }
  };

  const updateGroupStreak = async (groupId: string) => {
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) return;

    const data = groupSnap.data() as Group;
    const today = new Date().toISOString().split('T')[0];
    
    if (data.lastMessageDate === today) return;

    let newStreak = data.streakDays || 0;
    
    if (data.lastMessageDate) {
      const lastDate = new Date(data.lastMessageDate);
      const currentDate = new Date(today);
      const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    await updateDoc(groupRef, {
      streakDays: newStreak,
      lastMessageDate: today
    });
  };

  const deleteGroup = async (groupId: string) => {
    if (!auth.currentUser) return;
    try {
      const groupRef = doc(db, 'groups', groupId);
      await deleteDoc(groupRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `groups/${groupId}`);
    }
  };

  const updateGroupMessage = async (groupId: string, messageId: string, updates: Partial<GroupMessage>) => {
    try {
      const messageRef = doc(db, `groups/${groupId}/messages`, messageId);
      await updateDoc(messageRef, updates);
    } catch (error) {
      console.error("Error updating group message:", error);
    }
  };

  return { groups, createGroup, joinGroup, renameGroup, updateGroup, removeMember, updateGroupStreak, deleteGroup, updateGroupMessage };
}
