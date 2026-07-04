import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/Colors';
import { setUserRole, type UserRole } from '@/lib/userRole';

export default function RoleSelectScreen() {
  const router = useRouter();
  const [selecting, setSelecting] = useState<UserRole | null>(null);

  async function handleSelectRole(role: UserRole) {
    setSelecting(role);
    try {
      await setUserRole(role);
      if (role === 'grandma') {
        router.replace('/(tabs)');
      } else {
        router.replace('/family-identity');
      }
    } catch (err) {
      console.error('Failed to set role:', err);
      setSelecting(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to</Text>
        <Text style={styles.appName}>Grandma's Attic</Text>
        <Text style={styles.subtitle}>Who are you?</Text>
      </View>

      <View style={styles.options}>
        <Pressable
          style={[styles.option, selecting === 'grandma' && styles.optionSelected]}
          onPress={() => handleSelectRole('grandma')}
          disabled={selecting !== null}
        >
          {selecting === 'grandma' ? (
            <ActivityIndicator size="large" color={Colors.primary} />
          ) : (
            <>
              <View style={styles.iconWrap}>
                <FontAwesome name="home" size={40} color={Colors.primary} />
              </View>
              <Text style={styles.optionTitle}>I'm the Owner</Text>
              <Text style={styles.optionDesc}>
                Catalog items, get AI valuations, and decide what to do with everything
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={[styles.option, selecting === 'family' && styles.optionSelected]}
          onPress={() => handleSelectRole('family')}
          disabled={selecting !== null}
        >
          {selecting === 'family' ? (
            <ActivityIndicator size="large" color={Colors.primary} />
          ) : (
            <>
              <View style={styles.iconWrap}>
                <FontAwesome name="users" size={40} color={Colors.primary} />
              </View>
              <Text style={styles.optionTitle}>I'm Family</Text>
              <Text style={styles.optionDesc}>
                Browse items, leave notes, and mark what you're interested in
              </Text>
            </>
          )}
        </Pressable>
      </View>
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
    marginBottom: 48,
  },
  title: {
    color: Colors.textMuted,
    fontSize: 18,
  },
  appName: {
    color: Colors.primaryDark,
    fontSize: 32,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 24,
  },
  subtitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '500',
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
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F3EAD6',
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
});
