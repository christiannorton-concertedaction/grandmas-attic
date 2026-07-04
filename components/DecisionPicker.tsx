import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/Colors';
import {
  DECISION_COLORS,
  DECISION_LABELS,
  type Decision,
  type FamilyMember,
} from '@/types/item';
import { listFamilyMembers, createFamilyMember, deleteFamilyMember } from '@/lib/familyMembers';

interface DecisionBadgeProps {
  decision: Decision;
  familyMemberName?: string | null;
  compact?: boolean;
}

export function DecisionBadge({ decision, familyMemberName, compact }: DecisionBadgeProps) {
  const label = decision === 'family_member' && familyMemberName 
    ? familyMemberName 
    : DECISION_LABELS[decision];
    
  return (
    <View
      style={[
        styles.badge,
        compact && styles.badgeCompact,
        { backgroundColor: DECISION_COLORS[decision] },
      ]}
    >
      <Text style={[styles.text, compact && styles.textCompact]}>
        {label}
      </Text>
    </View>
  );
}

interface DecisionPickerProps {
  value: Decision;
  familyMemberId?: string | null;
  onChange: (decision: Decision, familyMemberId?: string | null) => void;
  disabled?: boolean;
}

export function DecisionPicker({
  value,
  familyMemberId,
  onChange,
  disabled,
}: DecisionPickerProps) {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    loadFamilyMembers();
  }, []);

  async function loadFamilyMembers() {
    try {
      const members = await listFamilyMembers();
      setFamilyMembers(members);
    } catch (err) {
      console.error('Failed to load family members:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMember() {
    if (!newMemberName.trim()) return;

    setAddingMember(true);
    try {
      const member = await createFamilyMember(newMemberName.trim());
      setFamilyMembers((prev) => [...prev, member].sort((a, b) => a.name.localeCompare(b.name)));
      setNewMemberName('');
      setShowAddMember(false);
      onChange('family_member', member.id);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add family member');
    } finally {
      setAddingMember(false);
    }
  }

  function handleDeleteMember(member: FamilyMember) {
    Alert.alert(
      `Remove ${member.name}?`,
      'This will remove them from the family list. Items tagged with them will become unassigned.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFamilyMember(member.id);
              setFamilyMembers((prev) => prev.filter((m) => m.id !== member.id));
              if (familyMemberId === member.id) {
                onChange('undecided', null);
              }
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove family member');
            }
          },
        },
      ]
    );
  }

  const baseOptions: Decision[] = ['undecided', 'ebay', 'garage_sale'];

  return (
    <View style={styles.picker}>
      {baseOptions.map((option) => {
        const selected = value === option;
        return (
          <Pressable
            key={option}
            style={[
              styles.option,
              selected && styles.optionSelected,
              disabled && styles.optionDisabled,
            ]}
            onPress={() => !disabled && onChange(option, null)}
            disabled={disabled}
          >
            <Text
              style={[
                styles.optionText,
                selected && styles.optionTextSelected,
              ]}
            >
              {DECISION_LABELS[option]}
            </Text>
          </Pressable>
        );
      })}

      <View style={styles.familySection}>
        <Text style={styles.familySectionTitle}>Give to Family Member</Text>
        
        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} style={styles.loader} />
        ) : (
          <>
            {familyMembers.map((member) => {
              const selected = value === 'family_member' && familyMemberId === member.id;
              return (
                <View key={member.id} style={styles.familyMemberRow}>
                  <Pressable
                    style={[
                      styles.option,
                      styles.familyOption,
                      selected && styles.optionSelected,
                      disabled && styles.optionDisabled,
                    ]}
                    onPress={() => !disabled && onChange('family_member', member.id)}
                    disabled={disabled}
                  >
                    <FontAwesome name="user" size={14} color={selected ? Colors.primaryDark : Colors.textMuted} style={styles.userIcon} />
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {member.name}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => handleDeleteMember(member)}
                    disabled={disabled}
                  >
                    <FontAwesome name="times" size={14} color={Colors.textMuted} />
                  </Pressable>
                </View>
              );
            })}

            {showAddMember ? (
              <View style={styles.addMemberForm}>
                <TextInput
                  style={styles.addMemberInput}
                  value={newMemberName}
                  onChangeText={setNewMemberName}
                  placeholder="Enter name..."
                  placeholderTextColor={Colors.textMuted}
                  autoFocus
                  editable={!addingMember}
                />
                <Pressable
                  style={[styles.addMemberButton, addingMember && styles.optionDisabled]}
                  onPress={handleAddMember}
                  disabled={addingMember || !newMemberName.trim()}
                >
                  {addingMember ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <FontAwesome name="check" size={14} color="#FFFFFF" />
                  )}
                </Pressable>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowAddMember(false);
                    setNewMemberName('');
                  }}
                  disabled={addingMember}
                >
                  <FontAwesome name="times" size={14} color={Colors.textMuted} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={[styles.addFamilyButton, disabled && styles.optionDisabled]}
                onPress={() => setShowAddMember(true)}
                disabled={disabled}
              >
                <FontAwesome name="plus" size={12} color={Colors.primary} />
                <Text style={styles.addFamilyText}>Add family member</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  textCompact: {
    fontSize: 11,
  },
  picker: {
    gap: 8,
  },
  option: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.border,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  familyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionSelected: {
    backgroundColor: '#F3EAD6',
    borderColor: Colors.primary,
  },
  optionDisabled: {
    opacity: 0.6,
  },
  optionText: {
    color: Colors.text,
    fontSize: 15,
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  familySection: {
    marginTop: 8,
    gap: 8,
  },
  familySectionTitle: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  familyMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userIcon: {
    marginRight: 8,
  },
  deleteButton: {
    padding: 12,
  },
  loader: {
    paddingVertical: 12,
  },
  addFamilyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  addFamilyText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  addMemberForm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addMemberInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: Colors.border,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  addMemberButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    padding: 12,
  },
});
