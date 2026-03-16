/**
 * components/VoiceButton.tsx — Press-and-hold to speak
 */
import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, View, Animated } from 'react-native';
import { Colors, Radius } from '../constants/theme';

interface Props {
  isListening: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
}

export default function VoiceButton({ isListening, onPressIn, onPressOut }: Props) {
  // Pulsating rings when listening
  const ring1 = useRef(new Animated.Value(1)).current;
  const ring2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(ring1, { toValue: 1.6, duration: 700, useNativeDriver: true }),
          Animated.timing(ring1, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.delay(350),
          Animated.timing(ring2, { toValue: 1.9, duration: 700, useNativeDriver: true }),
          Animated.timing(ring2, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      ring1.stopAnimation();
      ring2.stopAnimation();
      Animated.parallel([
        Animated.spring(ring1, { toValue: 1, useNativeDriver: true }),
        Animated.spring(ring2, { toValue: 1, useNativeDriver: true }),
      ]).start();
    }
  }, [isListening]);

  return (
    <View style={styles.container}>
      {/* Pulsating rings */}
      <Animated.View
        style={[
          styles.ring,
          { transform: [{ scale: ring2 }], opacity: isListening ? 0.2 : 0 },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          { transform: [{ scale: ring1 }], opacity: isListening ? 0.35 : 0 },
        ]}
      />

      {/* Main button */}
      <TouchableOpacity
        style={[styles.button, isListening && styles.buttonActive]}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.85}
      >
        <View style={styles.micIcon}>
          {/* Simple mic SVG-ish with views */}
          <View style={styles.micBody} />
          <View style={styles.micBase} />
          <View style={styles.micStand} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const BTN = 52;

const styles = StyleSheet.create({
  container: {
    width: BTN,
    height: BTN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    backgroundColor: Colors.accent,
  },
  button: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    backgroundColor: Colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  buttonActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  micIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBody: {
    width: 10,
    height: 14,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.text,
    marginBottom: 1,
  },
  micBase: {
    width: 16,
    height: 7,
    borderTopWidth: 0,
    borderWidth: 2,
    borderColor: Colors.text,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginBottom: 0,
  },
  micStand: {
    width: 2,
    height: 4,
    backgroundColor: Colors.text,
  },
});
