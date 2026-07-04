import { useCallback, useState } from 'react';
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
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DecisionPicker } from '@/components/DecisionPicker';
import { Colors } from '@/constants/Colors';
import {
  deleteItem,
  getItem,
  getPhotoSignedUrl,
  updateItemDecision,
  updateItemNotes,
  updateItemProminence,
} from '@/lib/items';
import {
  getItemInterests,
  getFamilyNotes,
  type ItemInterestWithMember,
  type FamilyNoteWithMember,
} from '@/lib/familyInteractions';
import { formatValueRange, type Decision, type Item } from '@/types/item';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [prominence, setProminence] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingProminence, setSavingProminence] = useState(false);
  const [updatingDecision, setUpdatingDecision] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interests, setInterests] = useState<ItemInterestWithMember[]>([]);
  const [familyNotes, setFamilyNotes] = useState<FamilyNoteWithMember[]>([]);

  const loadItem = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getItem(id);
      if (!data) {
        setError('Item not found');
        setItem(null);
        return;
      }

      setItem(data);
      setNotes(data.notes ?? '');
      setProminence(data.prominence ?? '');

      const [url, itemInterests, itemNotes] = await Promise.all([
        getPhotoSignedUrl(data.photo_path),
        getItemInterests(id),
        getFamilyNotes(id),
      ]);
      setPhotoUrl(url);
      setInterests(itemInterests);
      setFamilyNotes(itemNotes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load item');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadItem();
    }, [loadItem])
  );

  async function handleNotesBlur() {
    if (!item || notes === (item.notes ?? '')) return;

    setSavingNotes(true);
    try {
      const updated = await updateItemNotes(item.id, notes);
      setItem(updated);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to save notes'
      );
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleProminenceBlur() {
    if (!item || prominence === (item.prominence ?? '')) return;

    setSavingProminence(true);
    try {
      const updated = await updateItemProminence(item.id, prominence);
      setItem(updated);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to save story'
      );
    } finally {
      setSavingProminence(false);
    }
  }

  async function handleDecisionChange(decision: Decision, familyMemberId?: string | null) {
    if (!item || (decision === item.decision && familyMemberId === item.family_member_id)) return;

    setUpdatingDecision(true);
    try {
      const updated = await updateItemDecision(item.id, decision, familyMemberId);
      setItem(updated);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to update decision'
      );
    } finally {
      setUpdatingDecision(false);
    }
  }

  function handleDelete() {
    if (!item) return;

    Alert.alert(
      'Delete item?',
      'This will permanently remove the item and its photo.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteItem(item.id, item.photo_path);
              router.replace('/(tabs)');
            } catch (err) {
              Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Failed to delete item'
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>{error ?? 'Item not found'}</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.photo} contentFit="cover" />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Text style={styles.photoPlaceholderText}>📷</Text>
        </View>
      )}

      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>

      <View style={styles.valueBox}>
        <Text style={styles.valueLabel}>Estimated value</Text>
        <Text style={styles.value}>
          {formatValueRange(item.estimated_value_low, item.estimated_value_high)}
        </Text>
        {item.ai_confidence && (
          <Text style={styles.confidence}>Confidence: {item.ai_confidence}</Text>
        )}
        <Text style={styles.disclaimer}>
          AI estimates are rough guides, not professional appraisals.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Notes</Text>
          {savingNotes && (
            <ActivityIndicator size="small" color={Colors.primary} />
          )}
        </View>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          onBlur={handleNotesBlur}
          placeholder="Add notes about this item..."
          placeholderTextColor={Colors.textMuted}
          multiline
          textAlignVertical="top"
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Story & History</Text>
          {savingProminence && (
            <ActivityIndicator size="small" color={Colors.primary} />
          )}
        </View>
        <Text style={styles.prominenceHint}>
          Record this item's story — where it came from, who owned it, why it matters.
        </Text>
        <TextInput
          style={styles.prominenceInput}
          value={prominence}
          onChangeText={setProminence}
          onBlur={handleProminenceBlur}
          placeholder="e.g., This was Grandpa Joe's watch from WWII..."
          placeholderTextColor={Colors.textMuted}
          multiline
          textAlignVertical="top"
        />
      </View>

      {(interests.length > 0 || familyNotes.length > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Family Interest</Text>
          
          {interests.length > 0 && (
            <View style={styles.interestBox}>
              <FontAwesome name="heart" size={16} color={Colors.primary} />
              <Text style={styles.interestText}>
                {interests.map(i => i.family_member.name).join(', ')}
                {interests.length === 1 ? ' wants' : ' want'} this item
              </Text>
            </View>
          )}

          {familyNotes.length > 0 && (
            <View style={styles.notesList}>
              {familyNotes.map((note) => (
                <View key={note.id} style={styles.noteItem}>
                  <View style={styles.noteHeader}>
                    <FontAwesome name="comment" size={12} color={Colors.textMuted} />
                    <Text style={styles.noteName}>{note.family_member.name}</Text>
                  </View>
                  <Text style={styles.noteText}>{note.note}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Decision</Text>
        <DecisionPicker
          value={item.decision}
          familyMemberId={item.family_member_id}
          onChange={handleDecisionChange}
          disabled={updatingDecision}
        />
      </View>

      <Pressable
        style={[styles.deleteButton, deleting && styles.disabled]}
        onPress={handleDelete}
        disabled={deleting}
      >
        {deleting ? (
          <ActivityIndicator color={Colors.error} />
        ) : (
          <Text style={styles.deleteButtonText}>Delete Item</Text>
        )}
      </Pressable>
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
  photo: {
    borderRadius: 16,
    height: 280,
    width: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#EDE4D6',
    borderRadius: 16,
    height: 280,
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 64,
  },
  title: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  description: {
    color: Colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  valueBox: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    padding: 16,
  },
  valueLabel: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  value: {
    color: Colors.primaryDark,
    fontSize: 22,
    fontWeight: '700',
  },
  confidence: {
    color: Colors.textMuted,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  disclaimer: {
    color: Colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  section: {
    gap: 10,
  },
  interestBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F3EAD6',
    padding: 14,
    borderRadius: 10,
  },
  interestText: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
  },
  notesList: {
    gap: 8,
  },
  noteItem: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noteName: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  noteText: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  notesInput: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: Colors.text,
    fontSize: 16,
    minHeight: 100,
    padding: 14,
  },
  prominenceHint: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  prominenceInput: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: Colors.text,
    fontSize: 16,
    minHeight: 140,
    padding: 14,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: Colors.errorBg,
    borderRadius: 12,
    marginTop: 8,
    paddingVertical: 14,
  },
  deleteButtonText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  errorTitle: {
    color: Colors.error,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    padding: 12,
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.6,
  },
});
