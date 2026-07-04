import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { Colors } from '@/constants/Colors';

interface VoiceInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  hint?: string;
}

export function VoiceInput({
  value,
  onChangeText,
  placeholder = 'Tap the microphone to speak...',
  label,
  hint,
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [showTextInput, setShowTextInput] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  // Text present when listening started. Interim results fire repeatedly with
  // growing transcripts, so we always combine base + latest transcript instead
  // of appending (which would duplicate words).
  const baseTextRef = useRef('');

  useEffect(() => {
    checkAvailability();
  }, []);

  async function checkAvailability() {
    try {
      const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
      setIsAvailable(available);
      if (!available) {
        setShowTextInput(true);
      }
    } catch {
      setIsAvailable(false);
      setShowTextInput(true);
    }
  }

  async function requestPermissions(): Promise<boolean> {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      const granted = result.granted;
      setPermissionGranted(granted);
      return granted;
    } catch {
      setPermissionGranted(false);
      return false;
    }
  }

  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript ?? '';
    if (!transcript) return;

    const base = baseTextRef.current;
    const combined = base ? `${base} ${transcript}` : transcript;
    onChangeText(combined);

    if (event.isFinal) {
      baseTextRef.current = combined;
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log('Speech recognition error:', event.error, event.message);
    setIsListening(false);
    if (event.error === 'not-allowed') {
      setPermissionGranted(false);
    }
  });

  async function handleMicPress() {
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    if (permissionGranted === null || permissionGranted === false) {
      const granted = await requestPermissions();
      if (!granted) {
        setShowTextInput(true);
        return;
      }
    }

    try {
      baseTextRef.current = value;
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
      });
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setShowTextInput(true);
    }
  }

  function handleSwitchToText() {
    setShowTextInput(true);
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
    }
  }

  function handleSwitchToVoice() {
    if (isAvailable) {
      setShowTextInput(false);
    }
  }

  if (!isAvailable || showTextInput) {
    return (
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}
        {hint && <Text style={styles.hint}>{hint}</Text>}
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          multiline
          textAlignVertical="top"
        />
        {isAvailable && (
          <Pressable style={styles.switchButton} onPress={handleSwitchToVoice}>
            <FontAwesome name="microphone" size={14} color={Colors.primary} />
            <Text style={styles.switchText}>Use voice instead</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      {hint && <Text style={styles.hint}>{hint}</Text>}

      <View style={styles.voiceContainer}>
        <Pressable
          style={[styles.micButton, isListening && styles.micButtonActive]}
          onPress={handleMicPress}
        >
          {isListening ? (
            <View style={styles.micActiveContent}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <FontAwesome name="microphone" size={32} color="#FFFFFF" />
            </View>
          ) : (
            <FontAwesome name="microphone" size={32} color={Colors.primary} />
          )}
        </Pressable>

        <Text style={styles.micHint}>
          {isListening ? 'Listening... tap to stop' : 'Tap to speak the story'}
        </Text>

        {value ? (
          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptText}>{value}</Text>
            <Pressable
              style={styles.clearButton}
              onPress={() => onChangeText('')}
            >
              <FontAwesome name="times-circle" size={18} color={Colors.textMuted} />
            </Pressable>
          </View>
        ) : null}
      </View>

      <Pressable style={styles.switchButton} onPress={handleSwitchToText}>
        <FontAwesome name="keyboard-o" size={14} color={Colors.primary} />
        <Text style={styles.switchText}>Type instead</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  voiceContainer: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  micButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3EAD6',
    borderRadius: 40,
    height: 80,
    width: 80,
  },
  micButtonActive: {
    backgroundColor: Colors.primary,
  },
  micActiveContent: {
    alignItems: 'center',
    gap: 4,
  },
  micHint: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  transcriptBox: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 12,
    width: '100%',
  },
  transcriptText: {
    color: Colors.text,
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  clearButton: {
    padding: 4,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: Colors.text,
    fontSize: 16,
    minHeight: 100,
    padding: 14,
    paddingTop: 14,
  },
  switchButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  switchText: {
    color: Colors.primary,
    fontSize: 14,
  },
});
