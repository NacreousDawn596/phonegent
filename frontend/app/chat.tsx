/**
 * app/chat.tsx — Main chat interface
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useStore, Message } from '../store';
import { useWebSocket } from '../hooks/useWebSocket';
import { useVoice } from '../hooks/useVoice';
import ChatBubble from '../components/ChatBubble';
import VoiceButton from '../components/VoiceButton';
import ToolIndicator from '../components/ToolIndicator';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';

export default function ChatScreen() {
  const [input, setInput] = useState('');
  const listRef = useRef<FlashList<Message>>(null);
  const inputRef = useRef<TextInput>(null);

  const messages      = useStore((s) => s.messages);
  const isGenerating  = useStore((s) => s.isGenerating);
  const currentTool   = useStore((s) => s.currentTool);
  const activeConvId  = useStore((s) => s.activeConvId);
  const appendMessage = useStore((s) => s.appendMessage);

  const { sendMessage, isConnected } = useWebSocket();

  // ── Auto-scroll ──
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [messages.length, isGenerating]);

  // ── Send ──
  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isGenerating) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    appendMessage({
      id: Date.now(),
      conversation_id: activeConvId ?? 0,
      role: 'user',
      content: text,
      created_at: Date.now() / 1000,
    });
    sendMessage(text);
    setInput('');
  }, [input, isGenerating, sendMessage]);

  // ── Voice ──
  const { isRecording, startRecording, stopRecording } = useVoice((transcript) => {
    setInput(transcript);
    setTimeout(() => inputRef.current?.focus(), 100);
  });

  // ── Connection status dot ──
  const dotColor = isConnected ? Colors.success : Colors.danger;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <BlurView intensity={40} tint="dark" style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>PhoneGent</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
            <Text style={styles.statusText}>
              {isConnected ? 'Connected' : 'Connecting…'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push('/memory')}
        >
          <Text style={{ fontSize: 18 }}>🧠</Text>
        </TouchableOpacity>
      </BlurView>

      {/* Tool indicator */}
      {currentTool && <ToolIndicator tool={currentTool} />}

      {/* Message list */}
      {messages.length === 0 ? (
        <View style={styles.emptyChat}>
          <Text style={styles.emptyChatGlyph}>✦</Text>
          <Text style={styles.emptyChatText}>
            Ask me anything.{'\n'}I can see, hear, and control your phone.
          </Text>
        </View>
      ) : (
        <FlashList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          renderItem={({ item }) => <ChatBubble message={item} />}
          estimatedItemSize={80}
          contentContainerStyle={{ paddingTop: 110, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Input bar */}
      <BlurView intensity={60} tint="dark" style={styles.inputBar}>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Message…"
            placeholderTextColor={Colors.textDim}
            multiline
            maxLength={2000}
            returnKeyType="default"
            blurOnSubmit={false}
            selectionColor={Colors.accent}
          />

          <VoiceButton
            isListening={isRecording}
            onPressIn={startRecording}
            onPressOut={stopRecording}
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!input.trim() || isGenerating) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!input.trim() || isGenerating}
            activeOpacity={0.8}
          >
            {isGenerating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendArrow}>↑</Text>
            )}
          </TouchableOpacity>
        </View>
      </BlurView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 54,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 30,
    color: Colors.textMuted,
    lineHeight: 34,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['3xl'],
    paddingTop: 110,
  },
  emptyChatGlyph: {
    fontSize: 36,
    marginBottom: Spacing.lg,
    color: Colors.accent,
  },
  emptyChatText: {
    fontSize: Typography.base,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Input bar
  inputBar: {
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
    paddingBottom: Platform.OS === 'ios' ? 28 : Spacing.md,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: Typography.base,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    lineHeight: 22,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.elevated,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendArrow: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
});
