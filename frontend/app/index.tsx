/**
 * app/index.tsx — Home screen: conversation list
 */
import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useStore, Conversation } from '../store';
import { useApi } from '../hooks/useApi';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';

function formatDate(ts: number) {
  const d = new Date(ts * 1000);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function HomeScreen() {
  const { conversations, setConversations, addConversation, removeConversation, setActiveConvId, setMessages } =
    useStore();
  const api = useApi();

  useEffect(() => {
    api.fetchConversations().then(setConversations).catch(console.error);
  }, []);

  const handleNew = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const conv = await api.createConversation('New conversation');
      addConversation({ ...conv, created_at: Date.now() / 1000, updated_at: Date.now() / 1000 });
      setActiveConvId(conv.id);
      setMessages([]);
      router.push('/chat');
    } catch (e) {
      Alert.alert('Error', 'Could not create conversation. Is the backend running?');
    }
  }, []);

  const handleOpen = useCallback(async (conv: Conversation) => {
    Haptics.selectionAsync();
    setActiveConvId(conv.id);
    const msgs = await api.fetchMessages(conv.id).catch(() => []);
    setMessages(msgs as any);
    router.push('/chat');
  }, []);

  const handleDelete = useCallback((id: number) => {
    Alert.alert('Delete conversation', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.deleteConversation(id);
          removeConversation(id);
        },
      },
    ]);
  }, []);

  const renderItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.convRow}
      onPress={() => handleOpen(item)}
      onLongPress={() => handleDelete(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.convIcon}>
        <Text style={{ fontSize: 18 }}>💬</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.convTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.convDate}>{formatDate(item.updated_at)}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      {/* Header */}
      <LinearGradient
        colors={['#09090b', 'transparent']}
        style={styles.headerGradient}
      />
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>PhoneGent</Text>
          <Text style={styles.subtitle}>Your local AI agent</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/memory')}
          >
            <Text style={{ color: Colors.textMuted, fontSize: 20 }}>🧠</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/settings')}
          >
            <Text style={{ color: Colors.textMuted, fontSize: 20 }}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Conversations */}
      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>✦</Text>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyHint}>
            Tap the button below to start chatting with your agent.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => String(c.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}

      {/* New chat FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleNew} activeOpacity={0.85}>
        <LinearGradient
          colors={['#818cf8', '#6366f1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGrad}
        >
          <Text style={styles.fabText}>+ New Chat</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    zIndex: 2,
  },
  logo: {
    fontSize: Typography['2xl'],
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  convIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convTitle: {
    fontSize: Typography.base,
    fontWeight: '500',
    color: Colors.text,
  },
  convDate: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: Colors.border,
  },
  sep: {
    height: 1,
    backgroundColor: Colors.borderDim,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['3xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.xl,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyHint: {
    fontSize: Typography.base,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    bottom: 36,
    left: Spacing.xl,
    right: Spacing.xl,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  fabGrad: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  fabText: {
    color: '#fff',
    fontSize: Typography.base,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
