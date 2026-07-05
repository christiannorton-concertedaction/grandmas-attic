import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/Colors';
import { joinHouseholdWithCode } from '@/lib/invites';

export default function JoinHouseholdScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    if (code.trim().length === 0 || joining) return;

    setJoining(true);
    setError(null);
    try {
      const joined = await joinHouseholdWithCode(code);
      if (joined) {
        router.replace('/(family)');
      } else {
        setError(
          "That code didn't match a household. Double-check it with the owner and try again."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to join. Please try again.'
      );
    } finally {
      setJoining(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <FontAwesome name="key" size={36} color={Colors.primary} />
        </View>

        <Text style={styles.title}>Join a Household</Text>
        <Text style={styles.subtitle}>
          Ask the owner for their invite code. You'll find it in their app
          under Settings.
        </Text>

        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={(text) => {
            setCode(text.toUpperCase());
            setError(null);
          }}
          placeholder="ABC123"
          placeholderTextColor={Colors.border}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          editable={!joining}
          onSubmitEditing={handleJoin}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[
            styles.joinButton,
            (code.trim().length < 6 || joining) && styles.disabled,
          ]}
          onPress={handleJoin}
          disabled={code.trim().length < 6 || joining}
        >
          {joining ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.joinButtonText}>Join Household</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={joining}
        >
          <FontAwesome name="arrow-left" size={14} color={Colors.textMuted} />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3EAD6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  codeInput: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 16,
    borderWidth: 2,
    color: Colors.text,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 8,
    padding: 16,
    textAlign: 'center',
    width: '100%',
    marginBottom: 16,
  },
  error: {
    color: Colors.error,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  joinButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
    width: '100%',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
