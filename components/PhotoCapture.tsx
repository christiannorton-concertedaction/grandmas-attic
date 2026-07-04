import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Colors } from '@/constants/Colors';

interface PhotoCaptureProps {
  onPhotoSelected: (uri: string) => void;
  disabled?: boolean;
}

export function PhotoCapture({ onPhotoSelected, disabled }: PhotoCaptureProps) {
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestPermissions(source: 'camera' | 'library') {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  }

  async function pickImage(source: 'camera' | 'library') {
    if (disabled || loading) return;

    const granted = await requestPermissions(source);
    if (!granted) {
      Alert.alert(
        'Permission needed',
        source === 'camera'
          ? 'Camera access is required to photograph items.'
          : 'Photo library access is required to choose item photos.'
      );
      return;
    }

    setLoading(true);
    try {
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });

      if (!result.canceled && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;
        setPreviewUri(uri);
        onPhotoSelected(uri);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {previewUri ? (
        <Image source={{ uri: previewUri }} style={styles.preview} contentFit="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderEmoji}>📸</Text>
          <Text style={styles.placeholderText}>
            Take a photo or choose from your library
          </Text>
        </View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      <View style={styles.buttons}>
        <Pressable
          style={[styles.button, styles.primaryButton, disabled && styles.disabled]}
          onPress={() => pickImage('camera')}
          disabled={disabled || loading}
        >
          <Text style={styles.primaryButtonText}>Take Photo</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.secondaryButton, disabled && styles.disabled]}
          onPress={() => pickImage('library')}
          disabled={disabled || loading}
        >
          <Text style={styles.secondaryButtonText}>Choose from Library</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  preview: {
    borderRadius: 16,
    height: 240,
    width: '100%',
  },
  placeholder: {
    alignItems: 'center',
    backgroundColor: '#EDE4D6',
    borderColor: Colors.border,
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 2,
    height: 240,
    justifyContent: 'center',
    padding: 24,
  },
  placeholderEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  placeholderText: {
    color: Colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(245, 240, 232, 0.7)',
    justifyContent: 'center',
  },
  buttons: {
    gap: 10,
  },
  button: {
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
  },
});
