/**
 * hooks/useVoice.ts — microphone recording + basic STT via backend
 */
import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store';

export function useVoice(onTranscript: (text: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const recording = useRef<Audio.Recording | null>(null);
  const serverUrl = useStore((s) => s.serverUrl);

  const startRecording = useCallback(async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recording.current = rec;
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.error('startRecording', e);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recording.current) return;
    try {
      await recording.current.stopAndUnloadAsync();
      const uri = recording.current.getURI();
      setIsRecording(false);
      recording.current = null;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (!uri) return;

      // Send the audio file to backend STT endpoint
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: 'voice.m4a',
      } as unknown as Blob);

      const base = serverUrl.replace(/^ws/, 'http').replace(/\/+$/, '');
      const res = await fetch(`${base}/api/stt`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          onTranscript(data.text);
        }
      }
    } catch (e) {
      console.error('stopRecording', e);
      setIsRecording(false);
    }
  }, [serverUrl, onTranscript]);

  return { isRecording, startRecording, stopRecording };
}
