/**
 * app/memory.tsx — Memory management screen
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useStore, Memory } from '../store';
import { useApi } from '../hooks/useApi';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';

const CATEGORIES = ['all', 'preference', 'fact', 'reminder', 'general'] as const;

const CATEGORY_COLORS: Record<string, string> = {
  preference: '#818cf8',
  fact:       '#34d399',
  reminder:   '#f59e0b',
  general:    '#94a3b8',
};

export default function MemoryScreen() {
  const { memories, setMemories } = useStore();
  const api = useApi();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCat, setNewCat] = useState('general');

  const load = useCallback(async () => {
    const cat = activeTab === 'all' ? undefined : activeTab;
    const data = await api.fetchMemories(cat).catch(() => []);
    setMemories(data as Memory[]);
  }, [activeTab]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback((key: string) => {
    Alert.alert('Forget this memory?', `"${key}"`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Forget',
        style: 'destructive',
        onPress: async () => {
          await api.deleteMemory(key);
          load();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }, [load]);

  const handleAdd = useCallback(async () => {
    if (!newKey.trim() || !newValue.trim()) {
      Alert.alert('Both key and value are required.');
      return;
    }
    await api.saveMemory(newKey.trim(), newValue.trim(), newCat);
    setShowAdd(false);
    setNewKey(''); setNewValue(''); setNewCat('general');
    load();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [newKey, newValue, newCat, load]);

  const renderMemory = ({ item }: { item: Memory }) => {
    const color = CATEGORY_COLORS[item.category] ?? Colors.textMuted;
    return (
      <TouchableOpacity
        style={styles.memCard}
        onLongPress={() => handleDelete(item.key)}
        activeOpacity={0.75}
      >
        <View style={[styles.catDot, { backgroundColor: color }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.memKey}>{item.key}</Text>
          <Text style={styles.memValue}>{item.value}</Text>
        </View>
        <TouchableOpacity
          onPress={() => handleDelete(item.key)}
          style={styles.delBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ color: Colors.textDim, fontSize: 16 }}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <BlurView intensity={40} tint="dark" style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Memory</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAdd(true)}
        >
          <Text style={{ color: Colors.accent, fontWeight: '600', fontSize: Typography.base }}>
            + Add
          </Text>
        </TouchableOpacity>
      </BlurView>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: Spacing.sm }}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.tab, activeTab === cat && styles.tabActive]}
            onPress={() => setActiveTab(cat)}
          >
            <Text style={[styles.tabText, activeTab === cat && styles.tabTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Memory list */}
      {memories.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🧠</Text>
          <Text style={styles.emptyTitle}>No memories yet</Text>
          <Text style={styles.emptyHint}>
            The agent automatically saves facts it learns about you.
          </Text>
        </View>
      ) : (
        <FlatList
          data={memories}
          keyExtractor={(m) => String(m.id)}
          renderItem={renderMemory}
          contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 80 }}
        />
      )}

      {/* Add memory modal */}
      <Modal
        visible={showAdd}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAdd(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modal}
        >
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Memory</Text>

          <Text style={styles.label}>Key</Text>
          <TextInput
            style={styles.input}
            value={newKey}
            onChangeText={setNewKey}
            placeholder="e.g. preferred_language"
            placeholderTextColor={Colors.textDim}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Value</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            value={newValue}
            onChangeText={setNewValue}
            placeholder="e.g. English"
            placeholderTextColor={Colors.textDim}
            multiline
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.catRow}>
            {(['preference', 'fact', 'reminder', 'general'] as const).map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.catChip, newCat === c && styles.catChipActive]}
                onPress={() => setNewCat(c)}
              >
                <Text style={[styles.catChipText, newCat === c && styles.catChipTextActive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
            <Text style={styles.saveBtnText}>Save Memory</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setShowAdd(false)}
          >
            <Text style={{ color: Colors.textMuted, fontSize: Typography.base }}>Cancel</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 54,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 30, color: Colors.textMuted, lineHeight: 34 },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.text,
  },
  addBtn: { width: 60, alignItems: 'flex-end' },

  tabs: { maxHeight: 56, paddingTop: Spacing.sm },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  tabText: { fontSize: Typography.sm, color: Colors.textMuted, textTransform: 'capitalize' },
  tabTextActive: { color: '#fff', fontWeight: '600' },

  memCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  memKey: { fontSize: Typography.sm, fontWeight: '600', color: Colors.text },
  memValue: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2, lineHeight: 18 },
  delBtn: { padding: Spacing.xs },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing['3xl'],
  },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.lg },
  emptyTitle: {
    fontSize: Typography.xl, fontWeight: '600',
    color: Colors.text, marginBottom: Spacing.sm,
  },
  emptyHint: {
    fontSize: Typography.base, color: Colors.textMuted,
    textAlign: 'center', lineHeight: 22,
  },

  // Modal
  modal: {
    flex: 1, backgroundColor: Colors.surface,
    padding: Spacing.xl, paddingTop: Spacing.lg,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center', marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: Typography.xl, fontWeight: '700',
    color: Colors.text, marginBottom: Spacing.xl,
  },
  label: {
    fontSize: Typography.sm, color: Colors.textMuted,
    marginBottom: Spacing.xs, fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.elevated, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    fontSize: Typography.base, color: Colors.text,
    marginBottom: Spacing.lg,
  },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
  catChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.elevated,
  },
  catChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  catChipText: { fontSize: Typography.sm, color: Colors.textMuted },
  catChipTextActive: { color: '#fff', fontWeight: '600' },
  saveBtn: {
    backgroundColor: Colors.accent, borderRadius: Radius.xl,
    paddingVertical: Spacing.lg, alignItems: 'center',
    marginBottom: Spacing.md,
  },
  saveBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', paddingVertical: Spacing.md },
});
