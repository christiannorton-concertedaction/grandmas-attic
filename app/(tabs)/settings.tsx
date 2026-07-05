import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Share,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/Colors';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getOrCreateInviteCode, regenerateInviteCode } from '@/lib/invites';
import { getUser, getDisplayName, signOut } from '@/lib/auth';

export default function OwnerSettingsScreen() {
  const router = useRouter();
  const [accountName, setAccountName] = useState('');
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    if (!isSupabaseConfigured) {
      setLoadingCode(false);
      return;
    }
    try {
      const [code, user] = await Promise.all([
        getOrCreateInviteCode(),
        getUser(),
      ]);
      setInviteCode(code);
      setAccountName(getDisplayName(user));
      setAccountEmail(user?.email ?? null);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoadingCode(false);
    }
  }

  async function handleShareCode() {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: `Join our family's Grandma's Attic! Download the app, sign in, choose "I'm Family", and enter this invite code: ${inviteCode}`,
      });
    } catch {
      // User dismissed the share sheet; nothing to do.
    }
  }

  function handleRegenerateCode() {
    Alert.alert(
      'New Invite Code?',
      'The current code will stop working. Family members who already joined keep their access.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate New Code',
          onPress: async () => {
            setRegenerating(true);
            try {
              const code = await regenerateInviteCode();
              setInviteCode(code);
            } catch (err) {
              Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Failed to generate code'
              );
            } finally {
              setRegenerating(false);
            }
          },
        },
      ]
    );
  }

  function handleSignOut() {
    Alert.alert('Sign Out?', 'Your items are safe. You can sign back in anytime.', [
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Account</Text>
        <View style={styles.roleCard}>
          <View style={styles.roleIcon}>
            <FontAwesome name="home" size={24} color={Colors.primary} />
          </View>
          <View style={styles.roleInfo}>
            <Text style={styles.roleName}>{accountName || 'Owner'}</Text>
            {accountEmail && <Text style={styles.roleLabel}>{accountEmail}</Text>}
            <Text style={styles.roleLabel}>Household Owner</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Invite Family</Text>
        <View style={styles.inviteCard}>
          <Text style={styles.inviteHint}>
            Share this code with family so they can browse your items from
            their own phone. Only people with the code can join.
          </Text>

          {loadingCode ? (
            <ActivityIndicator size="small" color={Colors.primary} style={styles.codeLoader} />
          ) : inviteCode ? (
            <>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{inviteCode}</Text>
              </View>

              <View style={styles.inviteActions}>
                <Pressable style={styles.shareButton} onPress={handleShareCode}>
                  <FontAwesome name="share" size={16} color="#FFFFFF" />
                  <Text style={styles.shareButtonText}>Share Code</Text>
                </Pressable>
                <Pressable
                  style={[styles.regenButton, regenerating && styles.disabled]}
                  onPress={handleRegenerateCode}
                  disabled={regenerating}
                >
                  {regenerating ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <FontAwesome name="refresh" size={16} color={Colors.primary} />
                  )}
                </Pressable>
              </View>
            </>
          ) : (
            <Text style={styles.codeError}>
              Couldn't load the invite code. Check your connection and reopen
              this screen.
            </Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Pressable
          style={[styles.optionButton, signingOut && styles.disabled]}
          onPress={handleSignOut}
          disabled={signingOut}
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
        <Text style={styles.footerSubtext}>Owner Mode</Text>
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
  roleCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3EAD6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  roleLabel: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  inviteCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  inviteHint: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  codeLoader: {
    paddingVertical: 20,
  },
  codeBox: {
    backgroundColor: '#F3EAD6',
    borderColor: Colors.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 16,
    alignItems: 'center',
  },
  codeText: {
    color: Colors.primaryDark,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 6,
  },
  codeError: {
    color: Colors.error,
    fontSize: 14,
    lineHeight: 20,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 10,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 14,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  regenButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
    borderRadius: 12,
    borderWidth: 1,
    width: 50,
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
  footer: {
    alignItems: 'center',
    paddingTop: 16,
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
