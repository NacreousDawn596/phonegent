/**
 * app/settings.tsx — Connection settings and diagnostics
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useStore } from '../store';
import { useApi } from '../hooks/useApi';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';

export default function SettingsScreen() {
  const { serverUrl, setServerUrl } = useStore();
  const api = useApi();

  const [urlDraft, setUrlDraft] = useState(serverUrl);
  const [checking, setChecking] = useState(false);
  const [healthResult, setHealthResult] = useState<string | null>(null);

  const handleSave = () => {
    let url = urlDraft.trim();
    if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
      url = 'ws://' + url;
    }
    setServerUrl(url);
    Alert.alert('Saved', 'Reconnect to chat to apply changes.');
  };

  const handleHealthCheck = async () => {
    setChecking(true);
    setHealthResult(null);
    try {
      const res = await api.healthCheck();
      setHealthResult(`✓ Connected  ·  Model: ${res.model}`);
    } catch (e) {
      setHealthResult(`✗ Could not connect — is the backend running?`);
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <BlurView intensity={40} tint="dark" style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 36 }} />
      </BlurView>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Connection */}
        <SectionTitle>Connection</SectionTitle>
        <Card>
          <Text style={styles.fieldLabel}>Backend WebSocket URL</Text>
          <TextInput
            style={styles.input}
            value={urlDraft}
            onChangeText={setUrlDraft}
            placeholder="ws://192.168.1.x:8000"
            placeholderTextColor={Colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Text style={styles.hint}>
            Run <Text style={styles.mono}>python main.py</Text> in Termux, then paste the IP shown.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
            <Text style={styles.primaryBtnText}>Save</Text>
          </TouchableOpacity>
        </Card>

        {/* Health check */}
        <SectionTitle>Diagnostics</SectionTitle>
        <Card>
          <TouchableOpacity
            style={[styles.primaryBtn, checking && { opacity: 0.6 }]}
            onPress={handleHealthCheck}
            disabled={checking}
          >
            {checking
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Check Connection</Text>
            }
          </TouchableOpacity>
          {healthResult && (
            <Text style={[
              styles.healthResult,
              healthResult.startsWith('✓') ? styles.healthOk : styles.healthErr,
            ]}>
              {healthResult}
            </Text>
          )}
        </Card>

        {/* About */}
        <SectionTitle>About</SectionTitle>
        <Card>
          <Row label="Version" value="1.0.0" />
          <Sep />
          <Row label="Backend" value="FastAPI + Uvicorn" />
          <Sep />
          <Row label="AI engine" value="Ollama (local)" />
          <Sep />
          <Row label="Memory" value="SQLite" />
        </Card>

        {/* Tips */}
        <SectionTitle>Quick Tips</SectionTitle>
        <Card>
          <Text style={styles.tip}>
            💡 <Text style={styles.tipBold}>Hold the mic button</Text> to record voice, release to transcribe.
          </Text>
          <Sep />
          <Text style={styles.tip}>
            💡 <Text style={styles.tipBold}>Long-press</Text> a conversation or memory to delete it.
          </Text>
          <Sep />
          <Text style={styles.tip}>
            💡 The agent automatically saves facts you mention — check the 🧠 tab.
          </Text>
          <Sep />
          <Text style={styles.tip}>
            💡 Install <Text style={styles.tipBold}>Termux:API</Text> on your phone and enable all permissions for full hardware access.
          </Text>
        </Card>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ── Small sub-components ──────────────────────────────
function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Sep() {
  return <View style={styles.sep} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 54, paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.glassBorder,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 30, color: Colors.textMuted, lineHeight: 34 },
  title: {
    flex: 1, textAlign: 'center',
    fontSize: Typography.base, fontWeight: '600', color: Colors.text,
  },
  scroll: { padding: Spacing.lg, gap: Spacing.sm },
  sectionTitle: {
    fontSize: Typography.xs, fontWeight: '600',
    color: Colors.textMuted, textTransform: 'uppercase',
    letterSpacing: 1, marginTop: Spacing.lg, marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.lg, gap: Spacing.sm,
  },
  fieldLabel: {
    fontSize: Typography.sm, fontWeight: '500',
    color: Colors.textMuted, marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.elevated, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    fontSize: Typography.base, color: Colors.text,
  },
  hint: { fontSize: Typography.xs, color: Colors.textDim, lineHeight: 16 },
  mono: { fontFamily: Typography.fontMono, color: Colors.textMuted },
  primaryBtn: {
    backgroundColor: Colors.accent, borderRadius: Radius.lg,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: Typography.base },
  healthResult: { fontSize: Typography.sm, textAlign: 'center', marginTop: Spacing.xs },
  healthOk: { color: Colors.success },
  healthErr: { color: Colors.danger },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  rowLabel: { fontSize: Typography.base, color: Colors.text },
  rowValue: { fontSize: Typography.base, color: Colors.textMuted },
  sep: { height: 1, backgroundColor: Colors.borderDim },
  tip: { fontSize: Typography.sm, color: Colors.textMuted, lineHeight: 20 },
  tipBold: { fontWeight: '700', color: Colors.text },
});
