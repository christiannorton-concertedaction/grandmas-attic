import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/Colors';
import { clearUserRole, setFamilyMemberIdentity } from '@/lib/userRole';
import { listFamilyMembers, createFamilyMember } from '@/lib/familyMembers';
import type { FamilyMember } from '@/types/item';

export default function FamilyIdentityScreen() {
  const router = useRouter();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      const data = await listFamilyMembers();
      setMembers(data);
    } catch (err) {
      console.error('Failed to load family members:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectMember(memberId: string) {
    setSelecting(memberId);
    try {
      await setFamilyMemberIdentity(memberId);
      router.replace('/(family)');
    } catch (err) {
      console.error('Failed to set identity:', err);
      Alert.alert('Error', 'Failed to select identity');
      setSelecting(null);
    }
  }

  async function handleAddNew() {
    if (!newName.trim()) return;

    setAdding(true);
    try {
      const member = await createFamilyMember(newName.trim());
      await setFamilyMemberIdentity(member.id);
      router.replace('/(family)');
    } catch (err) {
      console.error('Failed to create member:', err);
      Alert.alert('Error', 'Failed to add family member');
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Who are you?</Text>
        <Text style={styles.subtitle}>
          Select your name or add yourself to the family
        </Text>
      </View>

      {members.length > 0 && (
        <View style={styles.membersList}>
          {members.map((member) => (
            <Pressable
              key={member.id}
              style={[
                styles.memberOption,
                selecting === member.id && styles.memberSelected,
              ]}
              onPress={() => handleSelectMember(member.id)}
              disabled={selecting !== null || adding}
            >
              {selecting === member.id ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <FontAwesome name="user" size={20} color={Colors.primary} />
                  <Text style={styles.memberName}>{member.name}</Text>
                </>
              )}
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {showAddNew ? (
        <View style={styles.addNewForm}>
          <Text style={styles.addNewLabel}>Enter your name</Text>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="Your name"
            placeholderTextColor={Colors.textMuted}
            autoFocus
            editable={!adding}
          />
          <View style={styles.addNewButtons}>
            <Pressable
              style={styles.cancelButton}
              onPress={() => {
                setShowAddNew(false);
                setNewName('');
              }}
              disabled={adding}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, (!newName.trim() || adding) && styles.disabled]}
              onPress={handleAddNew}
              disabled={!newName.trim() || adding}
            >
              {adding ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Continue</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          style={styles.addNewButton}
          onPress={() => setShowAddNew(true)}
          disabled={selecting !== null}
        >
          <FontAwesome name="plus" size={16} color={Colors.primary} />
          <Text style={styles.addNewButtonText}>I'm not listed - add me</Text>
        </Pressable>
      )}

      <Pressable
        style={styles.backButton}
        onPress={async () => {
          // Clear the stored role first, otherwise the navigation guard
          // immediately redirects away from the role-select screen.
          await clearUserRole();
          router.replace('/role-select');
        }}
        disabled={selecting !== null || adding}
      >
        <FontAwesome name="arrow-left" size={14} color={Colors.textMuted} />
        <Text style={styles.backButtonText}>Back to role selection</Text>
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
    padding: 24,
    paddingTop: 60,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 16,
    lineHeight: 22,
  },
  membersList: {
    gap: 12,
  },
  memberOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  memberSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F3EAD6',
  },
  memberName: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    color: Colors.textMuted,
    fontSize: 14,
    marginHorizontal: 16,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 16,
  },
  addNewButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  addNewForm: {
    gap: 12,
  },
  addNewLabel: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: Colors.text,
    fontSize: 16,
    padding: 14,
  },
  addNewButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
  },
  cancelButtonText: {
    color: Colors.textMuted,
    fontSize: 16,
  },
  confirmButton: {
    flex: 2,
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 14,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    padding: 12,
  },
  backButtonText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  disabled: {
    opacity: 0.6,
  },
});
