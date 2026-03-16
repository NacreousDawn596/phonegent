/**
 * components/ChatBubble.tsx
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Message } from '../store';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';

interface Props {
  message: Message;
}

const markdownStyles = {
  body: { color: Colors.text, fontSize: Typography.base, lineHeight: 22 },
  code_inline: {
    fontFamily: Typography.fontMono,
    backgroundColor: Colors.elevated,
    color: '#86efac',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  fence: {
    backgroundColor: Colors.elevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  code_block: {
    fontFamily: Typography.fontMono,
    color: '#86efac',
    fontSize: Typography.sm,
  },
  strong: { color: Colors.text, fontWeight: '700' },
  em: { color: Colors.textMuted },
  link: { color: Colors.accent },
};

function ToolBubble({ message }: Props) {
  const name = message.tool_name ?? 'tool';
  return (
    <View style={styles.toolRow}>
      <View style={styles.toolPill}>
        <Text style={styles.toolIcon}>⚡</Text>
        <Text style={styles.toolName}>{name}</Text>
      </View>
    </View>
  );
}

function UserBubble({ message }: Props) {
  return (
    <View style={styles.userRow}>
      <View style={styles.userBubble}>
        <Text style={styles.userText}>{message.content}</Text>
      </View>
    </View>
  );
}

function AssistantBubble({ message }: Props) {
  return (
    <View style={styles.assistantRow}>
      <View style={styles.avatarDot} />
      <View style={[styles.assistantBubble, message.isStreaming && styles.streaming]}>
        <Markdown style={markdownStyles}>{message.content}</Markdown>
        {message.isStreaming && (
          <View style={styles.cursor} />
        )}
      </View>
    </View>
  );
}

function ChatBubble({ message }: Props) {
  if (message.role === 'user') return <UserBubble message={message} />;
  if (message.role === 'tool') return <ToolBubble message={message} />;
  return <AssistantBubble message={message} />;
}

export default memo(ChatBubble);

const styles = StyleSheet.create({
  // User
  userRow: {
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  userBubble: {
    backgroundColor: Colors.userBubble,
    borderRadius: Radius.xl,
    borderBottomRightRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    maxWidth: '82%',
  },
  userText: {
    color: '#fff',
    fontSize: Typography.base,
    lineHeight: 22,
  },

  // Assistant
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  avatarDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    marginTop: 8,
    flexShrink: 0,
  },
  assistantBubble: {
    flex: 1,
    backgroundColor: Colors.assistantBubble,
    borderRadius: Radius.xl,
    borderTopLeftRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  streaming: {
    borderColor: Colors.border,
    borderWidth: 1,
  },
  cursor: {
    width: 2,
    height: 16,
    backgroundColor: Colors.accent,
    marginTop: 2,
  },

  // Tool
  toolRow: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  toolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.elevated,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toolIcon: {
    fontSize: 12,
  },
  toolName: {
    fontSize: Typography.xs,
    color: Colors.toolText,
    fontFamily: Typography.fontMono,
    letterSpacing: 0.5,
  },
});
