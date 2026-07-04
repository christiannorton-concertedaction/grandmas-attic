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
import { DecisionBadge } from '@/components/DecisionPicker';
import { Colors } from '@/constants/Colors';
import { getItem, getPhotoSignedUrl } from '@/lib/items';
import { getFamilyMember } from '@/lib/familyMembers';
import { getFamilyMemberIdentity } from '@/lib/userRole';
import {
  hasInterest,
  addItemInterest,
  removeItemInterest,
  getFamilyNotes,
  addFamilyNote,
  type FamilyNoteWithMember,
} from '@/lib/familyInteractions';
import { formatValueRange, type Item } from '@/types/item';

export default function FamilyItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [familyMemberName, setFamilyMemberName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [isInterested, setIsInterested] = useState(false);
  const [togglingInterest, setTogglingInterest] = useState(false);
  
  const [familyNotes, setFamilyNotes] = useState<FamilyNoteWithMember[]>([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const loadItem = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const [data, memberId] = await Promise.all([
        getItem(id),
        getFamilyMemberIdentity(),
      ]);
      
      setMyMemberId(memberId);
      
      if (!data) {
        setError('Item not found');
        setItem(null);
        return;
      }

      setItem(data);

      const [url, notes] = await Promise.all([
        getPhotoSignedUrl(data.photo_path),
        getFamilyNotes(id),
      ]);
      
      setPhotoUrl(url);
      setFamilyNotes(notes);

      if (data.decision === 'family_member' && data.family_member_id) {
        const member = await getFamilyMember(data.family_member_id);
        if (member) setFamilyMemberName(member.name);
      }

      if (memberId) {
        const interested = await hasInterest(id, memberId);
        setIsInterested(interested);
      }
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

  async function handleToggleInterest() {
    if (!myMemberId || !id || togglingInterest) return;

    setTogglingInterest(true);
    try {
      if (isInterested) {
        await removeItemInterest(id, myMemberId);
        setIsInterested(false);
      } else {
        await addItemInterest(id, myMemberId);
        setIsInterested(true);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update interest');
    } finally {
      setTogglingInterest(false);
    }
  }

  async function handleAddNote() {
    if (!myMemberId || !id || !newNote.trim() || addingNote) return;

    setAddingNote(true);
    try {
      await addFamilyNote(id, myMemberId, newNote);
      const notes = await getFamilyNotes(id);
      setFamilyNotes(notes);
      setNewNote('');
    } catch (err) {
      Alert.alert('Error', 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
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

      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{item.title || 'Unknown item'}</Text>
          {myMemberId && (
            <Pressable
              style={[styles.interestButton, isInterested && styles.interestButtonActive]}
              onPress={handleToggleInterest}
              disabled={togglingInterest}
            >
              {togglingInterest ? (
                <ActivityIndicator size="small" color={isInterested ? '#FFFFFF' : Colors.primary} />
              ) : (
                <>
                  <FontAwesome
                    name={isInterested ? 'heart' : 'heart-o'}
                    size={16}
                    color={isInterested ? '#FFFFFF' : Colors.primary}
                  />
                  <Text style={[styles.interestText, isInterested && styles.interestTextActive]}>
                    {isInterested ? 'Interested' : 'I want this'}
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </View>
        <DecisionBadge decision={item.decision} familyMemberName={familyMemberName} />
      </View>

      <Text style={styles.description}>{item.description}</Text>

      <View style={styles.valueBox}>
        <Text style={styles.valueLabel}>Estimated value</Text>
        <Text style={styles.value}>
          {formatValueRange(item.estimated_value_low, item.estimated_value_high)}
        </Text>
        {item.ai_confidence && (
          <Text style={styles.confidence}>Confidence: {item.ai_confidence}</Text>
        )}
      </View>

      {item.prominence && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Story & History</Text>
          <Text style={styles.prominence}>{item.prominence}</Text>
        </View>
      )}

      {item.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Owner's Notes</Text>
          <Text style={styles.ownerNotes}>{item.notes}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Family Comments</Text>
        
        {familyNotes.length > 0 ? (
          <View style={styles.notesList}>
            {familyNotes.map((note) => (
              <View key={note.id} style={styles.noteItem}>
                <View style={styles.noteHeader}>
                  <FontAwesome name="user" size={12} color={Colors.textMuted} />
                  <Text style={styles.noteName}>{note.family_member.name}</Text>
                </View>
                <Text style={styles.noteText}>{note.note}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noNotes}>No comments yet</Text>
        )}

        {myMemberId && (
          <View style={styles.addNoteForm}>
            <TextInput
              style={styles.noteInput}
              value={newNote}
              onChangeText={setNewNote}
              placeholder="Add a comment..."
              placeholderTextColor={Colors.textMuted}
              multiline
              editable={!addingNote}
            />
            <Pressable
              style={[styles.addNoteButton, (!newNote.trim() || addingNote) && styles.disabled]}
              onPress={handleAddNote}
              disabled={!newNote.trim() || addingNote}
            >
              {addingNote ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <FontAwesome name="send" size={16} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        )}
      </View>
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
  header: {
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    flex: 1,
    color: Colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  interestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  interestButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  interestText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  interestTextActive: {
    color: '#FFFFFF',
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
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  prominence: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
    backgroundColor: '#F3EAD6',
    padding: 12,
    borderRadius: 8,
  },
  ownerNotes: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  notesList: {
    gap: 12,
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
  noNotes: {
    color: Colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
  addNoteForm: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  noteInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: Colors.text,
    fontSize: 15,
    padding: 12,
    minHeight: 44,
    maxHeight: 100,
  },
  addNoteButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
