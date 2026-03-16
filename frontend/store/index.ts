/**
 * store/index.ts — Zustand global state
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ──────────────────────────────────────────────
export type Role = 'user' | 'assistant' | 'tool';

export interface Message {
  id: number;
  conversation_id: number;
  role: Role;
  content: string;
  tool_name?: string;
  tool_result?: string;
  created_at: number;
  // streaming-only (not persisted)
  isStreaming?: boolean;
}

export interface Conversation {
  id: number;
  title: string;
  created_at: number;
  updated_at: number;
}

export interface Memory {
  id: number;
  key: string;
  value: string;
  category: string;
  updated_at: number;
}

export interface ToolEvent {
  name: string;
  args: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: 'running' | 'done' | 'error';
}

// ── Store ──────────────────────────────────────────────
interface State {
  // Settings
  serverUrl: string;
  setServerUrl: (url: string) => void;

  // Active conversation
  activeConvId: number | null;
  setActiveConvId: (id: number | null) => void;

  // Conversations
  conversations: Conversation[];
  setConversations: (c: Conversation[]) => void;
  addConversation: (c: Conversation) => void;
  removeConversation: (id: number) => void;

  // Messages
  messages: Message[];
  setMessages: (m: Message[]) => void;
  appendMessage: (m: Message) => void;
  appendToken: (token: string) => void;          // stream into last assistant msg
  finalizeStreaming: () => void;

  // Tool activity
  currentTool: ToolEvent | null;
  setCurrentTool: (t: ToolEvent | null) => void;

  // Memories
  memories: Memory[];
  setMemories: (m: Memory[]) => void;

  // Voice
  isListening: boolean;
  setListening: (v: boolean) => void;

  // Loading
  isGenerating: boolean;
  setGenerating: (v: boolean) => void;
}

export const useStore = create<State>((set, get) => ({
  // Settings
  serverUrl: 'ws://192.168.1.100:8000',
  setServerUrl: (url) => {
    set({ serverUrl: url });
    AsyncStorage.setItem('serverUrl', url);
  },

  // Active conversation
  activeConvId: null,
  setActiveConvId: (id) => set({ activeConvId: id }),

  // Conversations
  conversations: [],
  setConversations: (c) => set({ conversations: c }),
  addConversation: (c) =>
    set((s) => ({ conversations: [c, ...s.conversations] })),
  removeConversation: (id) =>
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
    })),

  // Messages
  messages: [],
  setMessages: (m) => set({ messages: m }),
  appendMessage: (m) =>
    set((s) => ({ messages: [...s.messages, m] })),
  appendToken: (token) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.isStreaming) {
        msgs[msgs.length - 1] = { ...last, content: last.content + token };
      } else {
        msgs.push({
          id: Date.now(),
          conversation_id: s.activeConvId ?? 0,
          role: 'assistant',
          content: token,
          created_at: Date.now() / 1000,
          isStreaming: true,
        });
      }
      return { messages: msgs };
    }),
  finalizeStreaming: () =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.isStreaming ? { ...m, isStreaming: false } : m
      ),
    })),

  // Tool
  currentTool: null,
  setCurrentTool: (t) => set({ currentTool: t }),

  // Memories
  memories: [],
  setMemories: (m) => set({ memories: m }),

  // Voice
  isListening: false,
  setListening: (v) => set({ isListening: v }),

  // Loading
  isGenerating: false,
  setGenerating: (v) => set({ isGenerating: v }),
}));
