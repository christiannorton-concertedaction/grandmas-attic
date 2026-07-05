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
import { getMyFamilyMember } from '@/lib/userRole';
import { leaveHousehold } from '@/lib/household';
import { getUser, getDisplayName, signOut } from '@/lib/auth';
import type { FamilyMember } from '@/types/item';

export default function FamilySettingsScreen() {
  const router = useRouter();
  const [identity, setIdentity] = useState<FamilyMember | null>(null);
  const [accountName, setAccountName] = useState('');
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const [member, user] = await Promise.all([getMyFamilyMember(), getUser()]);
      setIdentity(member);
      setAccountName(getDisplayName(user));
      setAccountEmail(user?.email ?? null);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleLeaveHousehold() {
    Alert.alert(
      'Leave Household?',
      "You'll no longer see this family's items. You can rejoin later with an invite code from the owner.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            try {
              await leaveHousehold();
              router.replace('/role-select');
            } catch (err) {
              Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Failed to leave household'
              );
              setLeaving(false);
            }
          },
        },
      ]
    );
  }

  function handleSignOut() {
    Alert.alert('Sign Out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
            router.replace('/sign-in');
          } catch (err) {
            console.error('Failed to sign out:', err);
            setSigningOut(false);
          }
        },
      },
    ]);
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
        <Text style={styles.sectionTitle}>Your Account</Text>
        <View style={styles.identityCard}>
          <View style={styles.identityIcon}>
            <FontAwesome name="user" size={24} color={Colors.primary} />
          </View>
          <View style={styles.identityInfo}>
            <Text style={styles.identityName}>
              {identity?.name ?? accountName}
            </Text>
            {accountEmail && (
              <Text style={styles.identityLabel}>{accountEmail}</Text>
            )}
            <Text style={styles.identityLabel}>Family Member</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Household</Text>
        <Pressable
          style={[styles.dangerButton, leaving && styles.disabled]}
          onPress={handleLeaveHousehold}
          disabled={leaving || signingOut}
        >
          {leaving ? (
            <ActivityIndicator size="small" color={Colors.error} />
          ) : (
            <>
              <FontAwesome name="sign-out" size={18} color={Colors.error} />
              <Text style={styles.dangerButtonText}>Leave Household</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Pressable
          style={[styles.optionButton, signingOut && styles.disabled]}
          onPress={handleSignOut}
          disabled={signingOut || leaving}
        >
          {signingOut ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <>
              <FontAwesome name="power-off" size={18} color={Colors.primary} />
              <Text style={styles.optionButtonText}>Sign Out</Text>
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
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  optionButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '500',
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
