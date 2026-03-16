/**
 * hooks/useWebSocket.ts — Persistent WebSocket connection to the agent
 * Handles streaming tokens, tool events, reconnection.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useStore } from '../store';

type AgentEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_start'; name: string; args: Record<string, unknown> }
  | { type: 'tool_result'; name: string; result: Record<string, unknown> }
  | { type: 'done' }
  | { type: 'error'; message: string };

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const serverUrl    = useStore((s) => s.serverUrl);
  const activeConvId = useStore((s) => s.activeConvId);
  const appendToken  = useStore((s) => s.appendToken);
  const finalizeStreaming = useStore((s) => s.finalizeStreaming);
  const setGenerating = useStore((s) => s.setGenerating);
  const setCurrentTool = useStore((s) => s.setCurrentTool);
  const appendMessage  = useStore((s) => s.appendMessage);

  // ── Connect / reconnect ──
  const connect = useCallback(() => {
    if (!activeConvId) return;
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const url = `${serverUrl}/ws/chat/${activeConvId}`;
    const socket = new WebSocket(url);

    socket.onopen = () => {
      console.log('[WS] Connected to', url);
    };

    socket.onmessage = (e) => {
      const event: AgentEvent = JSON.parse(e.data);
      handleEvent(event);
    };

    socket.onerror = (e) => {
      console.warn('[WS] Error', e);
    };

    socket.onclose = () => {
      console.log('[WS] Closed — reconnecting in 3s');
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.current = socket;
  }, [serverUrl, activeConvId]);

  useEffect(() => {
    connect();
    return () => {
      ws.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  // ── Event handler ──
  function handleEvent(event: AgentEvent) {
    switch (event.type) {
      case 'text':
        appendToken(event.content);
        break;

      case 'tool_start':
        setCurrentTool({ name: event.name, args: event.args, status: 'running' });
        appendMessage({
          id: Date.now(),
          conversation_id: activeConvId ?? 0,
          role: 'tool',
          content: `Running **${event.name}**...`,
          tool_name: event.name,
          created_at: Date.now() / 1000,
        });
        break;

      case 'tool_result':
        setCurrentTool({ name: event.name, args: {}, result: event.result, status: 'done' });
        break;

      case 'done':
        finalizeStreaming();
        setGenerating(false);
        setCurrentTool(null);
        break;

      case 'error':
        finalizeStreaming();
        setGenerating(false);
        setCurrentTool(null);
        appendMessage({
          id: Date.now(),
          conversation_id: activeConvId ?? 0,
          role: 'assistant',
          content: `⚠️ Error: ${event.message}`,
          created_at: Date.now() / 1000,
        });
        break;
    }
  }

  // ── Send message ──
  const sendMessage = useCallback(
    (text: string) => {
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        console.warn('[WS] Not connected');
        return;
      }
      setGenerating(true);
      ws.current.send(JSON.stringify({ message: text }));
    },
    [setGenerating]
  );

  const isConnected = ws.current?.readyState === WebSocket.OPEN;

  return { sendMessage, isConnected };
}
