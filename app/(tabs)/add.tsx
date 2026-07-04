import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { PhotoCapture } from '@/components/PhotoCapture';
import { VoiceInput } from '@/components/VoiceInput';
import { Colors } from '@/constants/Colors';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  createPendingItem,
  uploadItemPhoto,
  analyzePendingItems,
  listPendingItems,
} from '@/lib/items';

type Step = 'capture' | 'uploading' | 'queue' | 'analyzing';

interface QueuedItem {
  id: string;
  localUri: string;
  prominence: string;
  status: 'uploading' | 'queued' | 'analyzing' | 'done' | 'error';
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export default function AddItemScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('capture');
  const [queue, setQueue] = useState<QueuedItem[]>([]);
  const [prominence, setProminence] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePhotoSelected(uri: string) {
    if (!isSupabaseConfigured) {
      Alert.alert(
        'Setup required',
        'Copy .env.example to .env and add your Supabase URL and anon key.'
      );
      return;
    }

    const itemId = generateId();
    const currentProminence = prominence;
    
    const newItem: QueuedItem = {
      id: itemId,
      localUri: uri,
      prominence: currentProminence,
      status: 'uploading',
    };
    
    setQueue(prev => [...prev, newItem]);
    setProminence('');
    setError(null);

    try {
      const photoPath = await uploadItemPhoto(uri, itemId);
      
      await createPendingItem(photoPath, currentProminence || null);
      
      setQueue(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, status: 'queued' } : item
        )
      );
    } catch (err) {
      setQueue(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, status: 'error' } : item
        )
      );
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
    }
  }

  async function handleAnalyzeAll() {
    if (queue.length === 0) return;
    
    setAnalyzing(true);
    setStep('analyzing');
    setError(null);

    try {
      const result = await analyzePendingItems();
      
      if (result.processed > 0) {
        Alert.alert(
          'Analysis Complete',
          `${result.processed} item${result.processed > 1 ? 's' : ''} analyzed successfully.${result.failed > 0 ? ` ${result.failed} failed.` : ''}`,
          [{ text: 'View Items', onPress: () => router.replace('/(tabs)') }]
        );
      } else if (result.failed > 0) {
        Alert.alert('Analysis Failed', 'Could not analyze items. Please try again.');
        setStep('capture');
      } else {
        Alert.alert('No Items', 'No pending items to analyze.');
        setStep('capture');
      }
      
      setQueue([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze items');
      setStep('capture');
    } finally {
      setAnalyzing(false);
    }
  }

  function handleRemoveFromQueue(id: string) {
    setQueue(prev => prev.filter(item => item.id !== id));
  }

  function handleClearQueue() {
    Alert.alert(
      'Clear Queue?',
      'This will remove all queued photos. They will need to be re-captured.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => setQueue([]) },
      ]
    );
  }

  const queuedCount = queue.filter(i => i.status === 'queued').length;
  const uploadingCount = queue.filter(i => i.status === 'uploading').length;

  if (!isSupabaseConfigured) {
    return (
      <View style={styles.centered}>
        <Text style={styles.setupTitle}>Setup required</Text>
        <Text style={styles.setupMessage}>
          Copy .env.example to .env and add your Supabase project URL and anon key.
          Then restart the Expo dev server.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {step === 'capture' && (
        <>
          <Text style={styles.intro}>
            Take photos of items to catalog. Add the story for each item, then
            analyze them all at once to save costs.
          </Text>

          <VoiceInput
            value={prominence}
            onChangeText={setProminence}
            label="Know the story? (optional)"
            hint="Tell the story to help identify items more accurately — e.g., era, origin, previous owner"
            placeholder="e.g., This belonged to my grandmother in the 1940s..."
          />

          <PhotoCapture onPhotoSelected={handlePhotoSelected} />
          
          {error && <Text style={styles.error}>{error}</Text>}

          {queue.length > 0 && (
            <View style={styles.queueSection}>
              <View style={styles.queueHeader}>
                <Text style={styles.queueTitle}>
                  Photo Queue ({queuedCount} ready{uploadingCount > 0 ? `, ${uploadingCount} uploading` : ''})
                </Text>
                <Pressable onPress={handleClearQueue}>
                  <Text style={styles.clearText}>Clear</Text>
                </Pressable>
              </View>
              
              <View style={styles.queueGrid}>
                {queue.map((item) => (
                  <View key={item.id} style={styles.queueItem}>
                    <Image 
                      source={{ uri: item.localUri }} 
                      style={styles.queueThumb} 
                      contentFit="cover" 
                    />
                    {item.status === 'uploading' && (
                      <View style={styles.queueOverlay}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      </View>
                    )}
                    {item.status === 'error' && (
                      <View style={[styles.queueOverlay, styles.queueError]}>
                        <FontAwesome name="exclamation-circle" size={20} color="#FFFFFF" />
                      </View>
                    )}
                    {item.status === 'queued' && (
                      <Pressable 
                        style={styles.removeButton}
                        onPress={() => handleRemoveFromQueue(item.id)}
                      >
                        <FontAwesome name="times" size={12} color="#FFFFFF" />
                      </Pressable>
                    )}
                    {item.prominence && (
                      <View style={styles.hasStoryBadge}>
                        <FontAwesome name="book" size={10} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                ))}
              </View>

              <Pressable
                style={[styles.analyzeButton, queuedCount === 0 && styles.disabled]}
                onPress={handleAnalyzeAll}
                disabled={queuedCount === 0 || analyzing}
              >
                <FontAwesome name="magic" size={18} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.analyzeButtonText}>
                  Analyze {queuedCount} Item{queuedCount !== 1 ? 's' : ''}
                </Text>
              </Pressable>
              
              <Text style={styles.costHint}>
                Batch analysis saves ~90% vs individual lookups
              </Text>
            </View>
          )}
        </>
      )}

      {step === 'analyzing' && (
        <View style={styles.analyzing}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.analyzingText}>Analyzing {queue.length} items...</Text>
          <Text style={styles.analyzingHint}>
            This uses AI to identify items and estimate values.
            It may take a minute.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  setupTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  setupMessage: {
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  intro: {
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  analyzing: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 48,
  },
  analyzingText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '500',
  },
  analyzingHint: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  error: {
    color: Colors.error,
    fontSize: 14,
    lineHeight: 20,
  },
  queueSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  queueTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  clearText: {
    color: Colors.error,
    fontSize: 14,
  },
  queueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  queueItem: {
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  queueThumb: {
    width: '100%',
    height: '100%',
  },
  queueOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueError: {
    backgroundColor: 'rgba(220,38,38,0.7)',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hasStoryBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  buttonIcon: {
    marginRight: 4,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  costHint: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  disabled: {
    opacity: 0.6,
  },
});
