import { useState, useEffect } from 'react';
import { ChatSession, Message, Stroke, Group, GroupMessage } from './types';
import { v4 as uuidv4 } from 'uuid';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, getDoc, updateDoc, arrayUnion, where, addDoc } from 'firebase/firestore';

function getSessionStorageKey(uid: string | null): string {
  return uid ? `broxa_ai_sessions_${uid}` : 'broxa_ai_sessions';
}

export function useChatStore() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(getSessionStorageKey(auth.currentUser?.uid || null));
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('localStorage is not available', e);
      return [];
    }
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // React to auth changes - load sessions for the logged-in user
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      const uid = user ? user.uid : null;
      try {
        const saved = localStorage.getItem(getSessionStorageKey(uid));
        const userSessions = saved ? JSON.parse(saved) : [];
        setSessions(userSessions);
        setCurrentSessionId(userSessions[0]?.id || null);
      } catch (e) {
        setSessions([]);
        setCurrentSessionId(null);
      }
    });
    return () => unsub();
  }, []);

  const saveSessions = (newSessions: ChatSession[]) => {
    try {
      const uid = auth.currentUser?.uid;
      localStorage.setItem(getSessionStorageKey(uid), JSON.stringify(newSessions));
    } catch (e) {
      console.warn('localStorage is not available', e);
    }
  };

  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  const clearSessions = () => {
    try {
      const uid = auth.currentUser?.uid;
      if (uid) {
        localStorage.removeItem(getSessionStorageKey(uid));
      }
      setSessions([]);
      setCurrentSessionId(null);
    } catch (e) {
      console.warn('localStorage is not available', e);
    }
  };

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

  const deleteMessage = (sessionId: string, messageId: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          messages: s.messages.filter(m => m.id !== messageId)
        };
      }
      return s;
    }));
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
    deleteMessage,
    deleteSession,
    togglePinSession,
    togglePinMessage,
    addPinnedText,
    removePinnedText,
    addStroke,
    setStrokes,
    updateSessionTitle,
    clearSessions
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

  const updateSetting = (key: string, value: unknown) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      return newSettings;
    });
  };

  const updateSettings = (partialSettings: Partial<typeof settings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...partialSettings };
      return newSettings;
    });
  };

  return { settings, updateSetting, updateSettings };
}

export interface ReleaseNote {
  id: string;
  version: string;
  title: string;
  description: string;
  changes: string[];
  imageUrl?: string;
  titleRgb?: boolean;
  outlineColor?: string;
  backgroundColor?: string;
  buttonText?: string;
  buttonColor?: string;
  buttonRgb?: boolean;
  images?: ReleaseNoteImage[];
  badges?: ReleaseNoteBadge[];
}

export interface ReleaseNoteImage {
  id: string;
  url: string;
  caption: string;
}

export interface ReleaseNoteBadge {
  id: string;
  text: string;
  color: string;
}

export interface Feedback {
  id: string;
  userId: string;
  userEmail: string;
  message: string;
  timestamp: number;
}

export interface AiModel {
  id: string;
  key: string;
  name: string;
  description: string;
  badgeType?: string;
  isPublic: boolean;
}

interface UserDoc {
  uid: string;
  email: string;
  role: string;
  displayName: string;
  photoURL: string;
  lastMessageDate: string;
  streakDays: number;
  violationsCount: number;
  isBanned: boolean;
  appealStatus: string | null;
  appealText: string | null;
  hasSeenRoleNotification: boolean;
  seenReleaseNotes: string[];
  unlockedFeatures: string[];
  hasSetProfile: boolean;
  freezesAvailable: number;
  lastFreezeMonth: string;
}

export function useAdminStore(isAdmin: boolean) {
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [aiModels, setAiModels] = useState<AiModel[]>([]);
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [allGroups, setAllGroups] = useState<Group[]>([]);

  useEffect(() => {
    let unsubscribeDoc: (() => void)[] = [];

    const unsubReleaseNotes = onSnapshot(
      query(collection(db, 'releaseNotes'), orderBy('timestamp', 'desc')),
      (snapshot) => {
        const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReleaseNote));
        setReleaseNotes(notes);
      }
    );
    unsubscribeDoc.push(unsubReleaseNotes);

    const unsubFeedbacks = onSnapshot(
      query(collection(db, 'feedbacks'), orderBy('timestamp', 'desc')),
      (snapshot) => {
        const feedbacksList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback));
        setFeedbacks(feedbacksList);
      }
    );
    unsubscribeDoc.push(unsubFeedbacks);

    const unsubAiModels = onSnapshot(
      query(collection(db, 'aiModels'), orderBy('timestamp', 'desc')),
      (snapshot) => {
        const models = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AiModel));
        setAiModels(models);
      }
    );
    unsubscribeDoc.push(unsubAiModels);

    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), orderBy('lastMessageDate', 'asc')),
      (snapshot) => {
        const usersList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserDoc));
        setUsers(usersList);
      }
    );
    unsubscribeDoc.push(unsubUsers);

    const unsubGroups = onSnapshot(
      query(collection(db, 'groups'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const groupsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
        setAllGroups(groupsList);
      }
    );
    unsubscribeDoc.push(unsubGroups);

    const unsubMaintenance = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setIsMaintenanceMode(docSnap.data().isMaintenanceMode || false);
      }
    });
    unsubscribeDoc.push(unsubMaintenance);

    return () => {
      unsubscribeDoc.forEach(unsub => unsub());
    };
  }, []);

  const addReleaseNote = async (noteData: Omit<ReleaseNote, 'id'>) => {
    if (!isAdmin) return;
    try {
      await addDoc(collection(db, 'releaseNotes'), {
        ...noteData,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Error adding release note:", error);
      throw error;
    }
  };

  const updateReleaseNote = async (noteId: string, noteData: Partial<ReleaseNote>) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'releaseNotes', noteId), noteData);
    } catch (error) {
      console.error("Error updating release note:", error);
      throw error;
    }
  };

  const deleteReleaseNote = async (noteId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'releaseNotes', noteId));
    } catch (error) {
      console.error("Error deleting release note:", error);
      throw error;
    }
  };

  const addFeedback = async (feedbackData: Omit<Feedback, 'id'>) => {
    try {
      await addDoc(collection(db, 'feedbacks'), {
        ...feedbackData,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Error adding feedback:", error);
      throw error;
    }
  };

  const deleteFeedback = async (feedbackId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'feedbacks', feedbackId));
    } catch (error) {
      console.error("Error deleting feedback:", error);
      throw error;
    }
  };

  const updateAiModel = async (modelId: string, modelData: Partial<AiModel>) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'aiModels', modelId), modelData);
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
        hasSeenRoleNotification: false
      });
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };

  const updateUserBannedStatus = async (userId: string, isBanned: boolean) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        isBanned,
        ...(isBanned ? {} : { violationsCount: 0 })
      });
    } catch (error) {
      console.error("Error updating user banned status:", error);
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

  const setMaintenanceMode = async (status: boolean) => {
    if (!isAdmin) return;
    try {
      await setDoc(doc(db, 'settings', 'global'), { isMaintenanceMode: status }, { merge: true });
    } catch (error) {
      console.error("Error updating maintenance mode:", error);
    }
  };

  return { releaseNotes, feedbacks, aiModels, users, allGroups, isMaintenanceMode, addReleaseNote, updateReleaseNote, deleteReleaseNote, addFeedback, deleteFeedback, updateAiModel, updateUserStreak, updateUserRole, updateUserBannedStatus, updateAdminGroupStreak, deleteAdminGroup, approveAppeal, denyAppeal, setMaintenanceMode };
}

export function useGroupStore() {
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    let unsubscribeAuth: (() => void) | null = null;
    let unsubscribeGroups: (() => void) | null = null;

    unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (unsubscribeGroups) unsubscribeGroups();
      if (user) {
        unsubscribeGroups = onSnapshot(
          query(collection(db, 'groups'), where('members', 'array-contains', user.uid)),
          (snapshot) => {
            const groupList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Group);
            setGroups(groupList);
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, 'groups');
          }
        );
      } else {
        setGroups([]);
      }
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeGroups) unsubscribeGroups();
    };
  }, []);

  const createGroup = async (name: string, photoURL: string | null, systemInstruction: string) => {
    if (!auth.currentUser) return;
    try {
      const groupRef = doc(collection(db, 'groups'));
      await setDoc(groupRef, {
        name,
        photoURL,
        systemInstruction,
        ownerId: auth.currentUser.uid,
        members: [auth.currentUser.uid],
        streakDays: 0,
        lastMessageDate: null,
        createdAt: Date.now()
      });
      return groupRef.id;
    } catch (error) {
      console.error("Error creating group:", error);
      throw error;
    }
  };

  const joinGroup = async (groupId: string) => {
    if (!auth.currentUser) return;
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) {
        const members = groupSnap.data().members || [];
        if (!members.includes(auth.currentUser.uid)) {
          await updateDoc(groupRef, {
            members: [...members, auth.currentUser.uid]
          });
        }
      }
    } catch (error) {
      console.error("Error joining group:", error);
      throw error;
    }
  };

  const renameGroup = async (groupId: string, newName: string) => {
    try {
      await updateDoc(doc(db, 'groups', groupId), { name: newName });
    } catch (error) {
      console.error("Error renaming group:", error);
    }
  };

  const updateGroup = async (groupId: string, data: { name?: string; photoURL?: string | null; systemInstruction?: string }) => {
    try {
      await updateDoc(doc(db, 'groups', groupId), data);
    } catch (error) {
      console.error("Error updating group:", error);
    }
  };

  const updateGroupStreak = async (groupId: string, newStreak: number) => {
    try {
      await updateDoc(doc(db, 'groups', groupId), { streakDays: newStreak });
    } catch (error) {
      console.error("Error updating group streak:", error);
    }
  };

  const updateGroupMessage = async (groupId: string, messageId: string, data: Partial<GroupMessage>) => {
    try {
      await updateDoc(doc(db, `groups/${groupId}/messages`, messageId), data);
    } catch (error) {
      console.error("Error updating group message:", error);
    }
  };

  const removeMember = async (groupId: string, userId: string) => {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) {
        const members = groupSnap.data().members || [];
        await updateDoc(groupRef, { members: members.filter((m: string) => m !== userId) });
      }
    } catch (error) {
      console.error("Error removing member:", error);
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      await deleteDoc(doc(db, 'groups', groupId));
    } catch (error) {
      console.error("Error deleting group:", error);
    }
  };

  return {
    groups,
    createGroup,
    joinGroup,
    renameGroup,
    updateGroupStreak,
    updateGroup,
    updateGroupMessage,
    removeMember,
    deleteGroup
  };
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
    let unsubscribeDoc: () => void = () => { };

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
      setStreakDays(0);
      try {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), { streakDays: 0 });
      } catch (error) {
        console.error("Error resetting streak:", error);
      }
      return false;
    } else if (diffDays === 1) {
      setStreakDays(prev => prev + 1);
      try {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          streakDays: streakDays + 1,
          lastMessageDate: todayStr,
          freezesAvailable: newFreezes,
          lastFreezeMonth: newLastFreezeMonth
        });
      } catch (error) {
        console.error("Error updating streak:", error);
      }
      return true;
    }
    return false;
  };

  const updateLastMessageDate = async () => {
    if (!auth.currentUser) return false;

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const currentMonthStr = today.toISOString().slice(0, 7);

    let newFreezes = freezesAvailable;
    let newLastFreezeMonth = lastFreezeMonth;

    if (lastFreezeMonth !== currentMonthStr) {
      newFreezes = 2;
      newLastFreezeMonth = currentMonthStr;
    }

    if (lastMessageDate === todayStr) return false;

    const todayDate = new Date(todayStr);
    let newStreak = streakDays;
    if (lastMessageDate) {
      const lastDate = new Date(lastMessageDate);
      const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 0;
      }
    } else {
      newStreak = 1;
    }

    setStreakDays(newStreak);
    setLastMessageDate(todayStr);
    setFreezesAvailable(newFreezes);
    setLastFreezeMonth(newLastFreezeMonth);

    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        streakDays: newStreak,
        lastMessageDate: todayStr,
        freezesAvailable: newFreezes,
        lastFreezeMonth: newLastFreezeMonth
      });
    } catch (error) {
      console.error("Error updating last message date:", error);
    }

    return true;
  };

  const freezeStreak = async () => {
    if (!auth.currentUser || freezesAvailable <= 0) return false;

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const currentMonthStr = today.toISOString().slice(0, 7);

    let newFreezes = freezesAvailable - 1;
    let newLastFreezeMonth = currentMonthStr;

    setFreezesAvailable(newFreezes);
    setLastFreezeMonth(newLastFreezeMonth);
    setLastMessageDate(todayStr);

    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        freezesAvailable: newFreezes,
        lastFreezeMonth: newLastFreezeMonth,
        lastMessageDate: todayStr
      });
    } catch (error) {
      console.error("Error freezing streak:", error);
    }

    return true;
  };

  const markFeatureAsSeen = async (feature: string) => {
    if (!auth.currentUser) return;

    setUnlockedFeatures(prev => {
      if (prev.includes(feature)) return prev;
      return [...prev, feature];
    });

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        unlockedFeatures: arrayUnion(feature)
      });
    } catch (error) {
      console.error("Error marking feature as seen:", error);
    }
  };

  const markRoleNotificationAsSeen = async () => {
    if (!auth.currentUser) return;

    setHasSeenRoleNotification(true);

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        hasSeenRoleNotification: true
      });
    } catch (error) {
      console.error("Error marking role notification as seen:", error);
    }
  };

  return {
    userRole, setUserRole,
    streakDays, setStreakDays,
    lastMessageDate, setLastMessageDate,
    freezesAvailable, setFreezesAvailable,
    lastFreezeMonth, setLastFreezeMonth,
    checkStreak, updateLastMessageDate, freezeStreak,
    markFeatureAsSeen, unlockedFeatures,
    displayName, setDisplayName, photoURL, setPhotoURL,
    hasSetProfile, setHasSetProfile,
    seenReleaseNotes, setSeenReleaseNotes, markAsSeen,
    hasSeenRoleNotification, setHasSeenRoleNotification,
    markRoleNotificationAsSeen,
    isUserLoaded,
    violationsCount, setViolationsCount,
    isBanned, setIsBanned,
    appealStatus, setAppealStatus,
    appealText, setAppealText
  };
}
