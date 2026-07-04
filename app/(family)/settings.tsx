import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/Colors';
import { clearUserRole, getFamilyMemberIdentity } from '@/lib/userRole';
import { getFamilyMember } from '@/lib/familyMembers';
import type { FamilyMember } from '@/types/item';

export default function FamilySettingsScreen() {
  const router = useRouter();
  const [identity, setIdentity] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    loadIdentity();
  }, []);

  async function loadIdentity() {
    try {
      const memberId = await getFamilyMemberIdentity();
      if (memberId) {
        const member = await getFamilyMember(memberId);
        setIdentity(member);
      }
    } catch (err) {
      console.error('Failed to load identity:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSwitchRole() {
    Alert.alert(
      'Switch Role?',
      'This will take you back to the role selection screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: async () => {
            setSwitching(true);
            try {
              await clearUserRole();
              router.replace('/role-select');
            } catch (err) {
              console.error('Failed to switch role:', err);
              setSwitching(false);
            }
          },
        },
      ]
    );
  }

  function handleChangeIdentity() {
    router.push('/family-identity');
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Identity</Text>
        <View style={styles.identityCard}>
          <View style={styles.identityIcon}>
            <FontAwesome name="user" size={24} color={Colors.primary} />
          </View>
          <View style={styles.identityInfo}>
            <Text style={styles.identityName}>{identity?.name ?? 'Unknown'}</Text>
            <Text style={styles.identityLabel}>Family Member</Text>
          </View>
        </View>
        <Pressable style={styles.linkButton} onPress={handleChangeIdentity}>
          <Text style={styles.linkButtonText}>Switch to different family member</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>
        <Pressable
          style={[styles.dangerButton, switching && styles.disabled]}
          onPress={handleSwitchRole}
          disabled={switching}
        >
          {switching ? (
            <ActivityIndicator size="small" color={Colors.error} />
          ) : (
            <>
              <FontAwesome name="sign-out" size={18} color={Colors.error} />
              <Text style={styles.dangerButtonText}>Switch to Owner Mode</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Grandma's Attic</Text>
        <Text style={styles.footerSubtext}>Family Viewer Mode</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  identityCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  identityIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3EAD6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityInfo: {
    flex: 1,
  },
  identityName: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  identityLabel: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  linkButton: {
    marginTop: 12,
    padding: 8,
  },
  linkButtonText: {
    color: Colors.primary,
    fontSize: 14,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.errorBg,
    borderRadius: 12,
    padding: 16,
  },
  dangerButtonText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 24,
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  footerSubtext: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  disabled: {
    opacity: 0.6,
  },
});
