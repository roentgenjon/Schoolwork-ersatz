import { create } from 'zustand';
import { api } from '../api/client';
import type { Class, Assignment, Handout, ChatRoom, ChatMessage, User, Submission } from '../types';

interface AppState {
  classes: Class[];
  assignments: Assignment[];
  handouts: Handout[];
  chatRooms: ChatRoom[];
  users: User[];
  activeRoomId: string | null;
  messages: Record<string, ChatMessage[]>;

  fetchClasses: () => Promise<void>;
  fetchAssignments: (classId?: string) => Promise<void>;
  fetchHandouts: (classId?: string) => Promise<void>;
  fetchChatRooms: () => Promise<void>;
  fetchRoomMessages: (roomId: string) => Promise<void>;
  fetchUsers: () => Promise<void>;
  addMessage: (roomId: string, msg: ChatMessage) => void;
  setActiveRoom: (roomId: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  classes: [],
  assignments: [],
  handouts: [],
  chatRooms: [],
  users: [],
  activeRoomId: null,
  messages: {},

  async fetchClasses() {
    const data = await api.get<Class[]>('/api/classes');
    set({ classes: data });
  },

  async fetchAssignments(classId?: string) {
    const params = classId ? { class_id: classId } : undefined;
    const data = await api.get<Assignment[]>('/api/assignments', params);
    set({ assignments: data });
  },

  async fetchHandouts(classId?: string) {
    const params = classId ? { class_id: classId } : undefined;
    const data = await api.get<Handout[]>('/api/handouts', params);
    set({ handouts: data });
  },

  async fetchChatRooms() {
    const data = await api.get<ChatRoom[]>('/api/chat/rooms');
    set({ chatRooms: data });
  },

  async fetchRoomMessages(roomId: string) {
    const msgs = await api.get<ChatMessage[]>(`/api/chat/rooms/${roomId}/messages`);
    set((s) => ({ messages: { ...s.messages, [roomId]: msgs } }));
  },

  async fetchUsers() {
    const data = await api.get<User[]>('/api/users');
    set({ users: data });
  },

  addMessage(roomId, msg) {
    set((s) => {
      const existing = s.messages[roomId] ?? [];
      // Deduplicate: ignore if message with same id already present
      if (existing.some((m) => m.id === msg.id)) return s;
      return {
        messages: { ...s.messages, [roomId]: [...existing, msg] },
      };
    });
  },

  setActiveRoom(roomId) {
    set({ activeRoomId: roomId });
  },
}));
