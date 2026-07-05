import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/Colors';
import { createHousehold } from '@/lib/household';
import { signOut } from '@/lib/auth';

export default function RoleSelectScreen() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function handleCreateHousehold() {
    setCreating(true);
    try {
      await createHousehold();
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to create household'
      );
      setCreating(false);
    }
  }

  function handleJoin() {
    router.push('/join-household');
  }

  async function handleSignOut() {
    try {
      await signOut();
      router.replace('/sign-in');
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Get Started</Text>
        <Text style={styles.subtitle}>
          Are you cataloging your home, or joining a family member's attic?
        </Text>
      </View>

      <View style={styles.options}>
        <Pressable
          style={styles.option}
          onPress={handleCreateHousehold}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator size="large" color={Colors.primary} />
          ) : (
            <>
              <View style={styles.iconWrap}>
                <FontAwesome name="home" size={40} color={Colors.primary} />
              </View>
              <Text style={styles.optionTitle}>I'm the Owner</Text>
              <Text style={styles.optionDesc}>
                Create your household, catalog items, get AI valuations, and
                invite family to browse
              </Text>
            </>
          )}
        </Pressable>

        <Pressable style={styles.option} onPress={handleJoin} disabled={creating}>
          <View style={styles.iconWrap}>
            <FontAwesome name="users" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.optionTitle}>I'm Family</Text>
          <Text style={styles.optionDesc}>
            Join with an invite code to browse items, leave notes, and mark
            what you're interested in
          </Text>
        </Pressable>
      </View>

      <Pressable style={styles.signOutButton} onPress={handleSignOut} disabled={creating}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    color: Colors.primaryDark,
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  options: {
    gap: 16,
  },
  option: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 20,
    borderWidth: 2,
    padding: 24,
    alignItems: 'center',
    minHeight: 180,
    justifyContent: 'center',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3EAD6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  optionTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  optionDesc: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  signOutButton: {
    alignItems: 'center',
    marginTop: 32,
    padding: 12,
  },
  signOutText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
});
