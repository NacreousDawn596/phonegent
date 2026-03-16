/**
 * components/ToolIndicator.tsx
 * Animated banner shown while the agent is executing a tool.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { ToolEvent } from '../store';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';

const TOOL_ICONS: Record<string, string> = {
  get_battery_status:       '🔋',
  get_wifi_scan:            '📡',
  get_device_info:          '📱',
  get_cell_info:            '📶',
  get_location:             '📍',
  get_sensor_data:          '🌡️',
  get_step_count:           '👟',
  take_photo:               '📸',
  record_audio:             '🎙️',
  speech_to_text:           '🎤',
  speak_text:               '🔊',
  vibrate_phone:            '📳',
  toggle_flashlight:        '🔦',
  set_brightness:           '☀️',
  show_notification:        '🔔',
  set_clipboard:            '📋',
  get_clipboard:            '📋',
  read_sms:                 '💬',
  send_sms:                 '📤',
  get_call_log:             '📞',
  authenticate_fingerprint: '🔐',
  remember:                 '🧠',
  recall:                   '🧠',
  forget:                   '🗑️',
};

interface Props {
  tool: ToolEvent;
}

export default function ToolIndicator({ tool }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const pulse   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Pulse while running
    if (tool.status === 'running') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.12, duration: 500, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,    duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.stopAnimation();
      Animated.spring(pulse, { toValue: 1, useNativeDriver: true }).start();
    }
  }, [tool.status]);

  const icon = TOOL_ICONS[tool.name] ?? '⚡';
  const label = tool.name.replace(/_/g, ' ');

  return (
    <Animated.View style={[styles.wrapper, { opacity }]}>
      <Animated.View
        style={[styles.bar, { transform: [{ scale: pulse }] }]}
      >
        <Text style={styles.icon}>{icon}</Text>
        <View style={styles.info}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.status}>
            {tool.status === 'running' ? 'Running…' : '✓ Done'}
          </Text>
        </View>
        {tool.status === 'running' && (
          <View style={styles.spinner}>
            <DotSpinner />
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

/** Three-dot animated spinner */
function DotSpinner() {
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    dots.forEach((dot, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay((2 - i) * 150),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
      {dots.map((d, i) => (
        <Animated.View
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: 3,
            backgroundColor: Colors.accent,
            opacity: d,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 108,
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 20,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accentBg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: {
    fontSize: 20,
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  status: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  spinner: {
    marginLeft: 'auto',
  },
});
