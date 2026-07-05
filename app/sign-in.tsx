import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Colors } from '@/constants/Colors';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  signInWithApple,
  signInWithProvider,
  isAppleSignInAvailable,
} from '@/lib/auth';

export default function SignInScreen() {
  const router = useRouter();
  const [signingIn, setSigningIn] = useState<'apple' | 'google' | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  async function handleApple() {
    setSigningIn('apple');
    try {
      await signInWithApple();
      router.replace('/');
    } catch (err) {
      // Code 1001 = user cancelled the Apple sheet; not an error.
      const code = (err as { code?: string }).code;
      if (code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(
          'Sign-in failed',
          err instanceof Error ? err.message : 'Please try again.'
        );
      }
    } finally {
      setSigningIn(null);
    }
  }

  async function handleGoogle() {
    setSigningIn('google');
    try {
      const session = await signInWithProvider('google');
      if (session) {
        router.replace('/');
      }
    } catch (err) {
      Alert.alert(
        'Sign-in failed',
        err instanceof Error ? err.message : 'Please try again.'
      );
    } finally {
      setSigningIn(null);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.appName}>Grandma's Attic</Text>
          <Text style={styles.subtitle}>
            Supabase is not configured. Copy .env.example to .env and add your
            keys, then restart the dev server.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🏠</Text>
        <Text style={styles.welcome}>Welcome to</Text>
        <Text style={styles.appName}>Grandma's Attic</Text>
        <Text style={styles.subtitle}>
          Catalog treasures, preserve their stories, and decide together as a
          family.
        </Text>
      </View>

      <View style={styles.buttons}>
        {appleAvailable && (
          <View style={styles.appleWrap}>
            {signingIn === 'apple' ? (
              <View style={styles.appleLoading}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            ) : (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                }
                buttonStyle={
                  AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={14}
                style={styles.appleButton}
                onPress={handleApple}
              />
            )}
          </View>
        )}

        <Pressable
          style={[styles.googleButton, signingIn !== null && styles.disabled]}
          onPress={handleGoogle}
          disabled={signingIn !== null}
        >
          {signingIn === 'google' ? (
            <ActivityIndicator size="small" color={Colors.text} />
          ) : (
            <>
              <FontAwesome name="google" size={18} color={Colors.text} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.privacyNote}>
          No passwords needed — sign in with the account you already have.
        </Text>
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
    marginBottom: 56,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  welcome: {
    color: Colors.textMuted,
    fontSize: 18,
  },
  appName: {
    color: Colors.primaryDark,
    fontSize: 34,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 16,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  buttons: {
    gap: 14,
  },
  appleWrap: {
    height: 52,
  },
  appleButton: {
    height: 52,
    width: '100%',
  },
  appleLoading: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    backgroundColor: '#FFFFFF',
    borderColor: Colors.border,
    borderRadius: 14,
    borderWidth: 1,
  },
  googleButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  privacyNote: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  disabled: {
    opacity: 0.6,
  },
});
