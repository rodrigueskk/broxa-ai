export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  color: string;
  points: Point[];
  isEraser?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  imageUrl?: string; // Kept for backwards compatibility
  imageUrls?: string[];
  timestamp: number;
  isPinned?: boolean;
  isCancelled?: boolean;
  strokes?: Stroke[];
  isError?: boolean;
  errorMessage?: string;
  model?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  isPinned?: boolean;
  pinnedTexts?: { id: string; text: string }[];
}

export interface GroupMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhotoURL: string | null;
  content: string;
  imageUrls?: string[];
  timestamp: number;
  isError?: boolean;
  errorMessage?: string;
  model?: string;
}

export interface Group {
  id: string;
  name: string;
  photoURL?: string | null;
  systemInstruction?: string;
  ownerId: string;
  members: string[];
  isPublic?: boolean;
  streakDays: number;
  lastMessageDate: string | null;
  createdAt: number;
}

export interface Friend {
  userId: string;
  displayName: string;
  photoURL?: string | null;
  email: string;
}

export interface FriendRequest {
  from: string;
  to: string;
  displayName: string;
  photoURL?: string | null;
  timestamp: number;
}
