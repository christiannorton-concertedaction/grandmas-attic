import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { PhotoCapture } from '@/components/PhotoCapture';
import { DecisionPicker } from '@/components/DecisionPicker';
import { Colors } from '@/constants/Colors';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  analyzeItemPhoto,
  createItem,
  uploadItemPhoto,
} from '@/lib/items';
import type { AiConfidence, Decision } from '@/types/item';
import { formatValueRange } from '@/types/item';

type Step = 'capture' | 'analyzing' | 'review';

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
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [itemId, setItemId] = useState(() => generateId());
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [valueLow, setValueLow] = useState<number | null>(null);
  const [valueHigh, setValueHigh] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<AiConfidence | null>(null);
  const [notes, setNotes] = useState('');
  const [prominence, setProminence] = useState('');
  const [decision, setDecision] = useState<Decision>('undecided');
  const [familyMemberId, setFamilyMemberId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePhotoSelected(uri: string) {
    if (!isSupabaseConfigured) {
      Alert.alert(
        'Setup required',
        'Copy .env.example to .env and add your Supabase URL and anon key.'
      );
      return;
    }

    setLocalUri(uri);
    setError(null);
    setStep('analyzing');

    try {
      const path = await uploadItemPhoto(uri, itemId);
      setPhotoPath(path);

      const result = await analyzeItemPhoto(path);
      setTitle(result.title);
      setDescription(result.description);
      setValueLow(result.estimated_value_low);
      setValueHigh(result.estimated_value_high);
      setConfidence(result.confidence);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze photo');
      setStep('capture');
    }
  }

  async function handleSave() {
    if (!photoPath || !title.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const item = await createItem({
        id: itemId,
        photo_path: photoPath,
        title: title.trim(),
        description: description.trim(),
        estimated_value_low: valueLow,
        estimated_value_high: valueHigh,
        notes: notes.trim() || null,
        prominence: prominence.trim() || null,
        decision,
        family_member_id: decision === 'family_member' ? familyMemberId : null,
        ai_confidence: confidence,
      });

      router.replace(`/item/${item.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setItemId(generateId());
    setStep('capture');
    setLocalUri(null);
    setPhotoPath(null);
    setTitle('');
    setDescription('');
    setValueLow(null);
    setValueHigh(null);
    setConfidence(null);
    setNotes('');
    setProminence('');
    setDecision('undecided');
    setFamilyMemberId(null);
    setError(null);
  }

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
            Photograph something you might sell. Grandma will take a look and
            suggest what it is and what it might be worth.
          </Text>
          <PhotoCapture key={itemId} onPhotoSelected={handlePhotoSelected} />
          {error && <Text style={styles.error}>{error}</Text>}
        </>
      )}

      {step === 'analyzing' && (
        <View style={styles.analyzing}>
          {localUri && (
            <Image source={{ uri: localUri }} style={styles.preview} contentFit="cover" />
          )}
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.analyzingText}>Grandma&apos;s looking it up...</Text>
        </View>
      )}

      {step === 'review' && (
        <>
          {localUri && (
            <Image source={{ uri: localUri }} style={styles.preview} contentFit="cover" />
          )}

          <View style={styles.section}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Item name"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.description}>{description}</Text>
            <Text style={styles.value}>
              Estimated value: {formatValueRange(valueLow, valueHigh)}
            </Text>
            {confidence && (
              <Text style={styles.confidence}>
                Confidence: {confidence}
              </Text>
            )}
            <Text style={styles.disclaimer}>
              AI estimates are rough guides, not professional appraisals.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Your notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes (condition, memories, etc.)"
              placeholderTextColor={Colors.textMuted}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Story & History</Text>
            <Text style={styles.prominenceHint}>
              Record this item's story — where it came from, who owned it, why it matters to the family.
            </Text>
            <TextInput
              style={[styles.input, styles.prominenceInput]}
              value={prominence}
              onChangeText={setProminence}
              placeholder="e.g., This was Grandpa Joe's watch from WWII. He wore it every day until..."
              placeholderTextColor={Colors.textMuted}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>What should we do with it?</Text>
            <DecisionPicker 
              value={decision} 
              familyMemberId={familyMemberId}
              onChange={(newDecision, newFamilyMemberId) => {
                setDecision(newDecision);
                setFamilyMemberId(newFamilyMemberId ?? null);
              }} 
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.saveButton, saving && styles.disabled]}
            onPress={handleSave}
            disabled={saving || !title.trim()}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save to Attic</Text>
            )}
          </Pressable>

          <Pressable style={styles.resetButton} onPress={handleReset} disabled={saving}>
            <Text style={styles.resetButtonText}>Start over</Text>
          </Pressable>
        </>
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
    paddingVertical: 32,
  },
  analyzingText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '500',
  },
  preview: {
    borderRadius: 16,
    height: 220,
    width: '100%',
  },
  section: {
    gap: 8,
  },
  label: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: Colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  notesInput: {
    minHeight: 100,
    paddingTop: 12,
  },
  prominenceHint: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  prominenceInput: {
    minHeight: 120,
    paddingTop: 12,
  },
  description: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  value: {
    color: Colors.primaryDark,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  confidence: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  disclaimer: {
    color: Colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  error: {
    color: Colors.error,
    fontSize: 14,
    lineHeight: 20,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    marginTop: 8,
    paddingVertical: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resetButtonText: {
    color: Colors.textMuted,
    fontSize: 15,
  },
  disabled: {
    opacity: 0.6,
  },
});
