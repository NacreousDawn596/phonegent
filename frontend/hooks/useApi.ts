/**
 * hooks/useApi.ts — HTTP client talking to the FastAPI backend
 */
import { useStore } from '../store';

function getHttpBase(wsUrl: string) {
  return wsUrl.replace(/^ws/, 'http').replace(/\/+$/, '');
}

export function useApi() {
  const serverUrl = useStore((s) => s.serverUrl);
  const base = getHttpBase(serverUrl);

  async function request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${path} → ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  // ── Conversations ──
  async function createConversation(title = 'New conversation') {
    return request<{ id: number; title: string }>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async function fetchConversations() {
    return request<Array<{ id: number; title: string; updated_at: number }>>(
      '/api/conversations'
    );
  }

  async function fetchMessages(convId: number) {
    return request<
      Array<{
        id: number;
        role: string;
        content: string;
        tool_name?: string;
        created_at: number;
      }>
    >(`/api/conversations/${convId}/messages`);
  }

  async function deleteConversation(convId: number) {
    return request<{ status: string }>(`/api/conversations/${convId}`, {
      method: 'DELETE',
    });
  }

  // ── Memory ──
  async function fetchMemories(category?: string) {
    const qs = category ? `?category=${category}` : '';
    return request<
      Array<{ id: number; key: string; value: string; category: string; updated_at: number }>
    >(`/api/memories${qs}`);
  }

  async function saveMemory(key: string, value: string, category = 'general') {
    return request('/api/memories', {
      method: 'POST',
      body: JSON.stringify({ key, value, category }),
    });
  }

  async function deleteMemory(key: string) {
    return request(`/api/memories/${encodeURIComponent(key)}`, {
      method: 'DELETE',
    });
  }

  async function healthCheck() {
    return request<{ status: string; model: string }>('/health');
  }

  return {
    createConversation,
    fetchConversations,
    fetchMessages,
    deleteConversation,
    fetchMemories,
    saveMemory,
    deleteMemory,
    healthCheck,
  };
}
