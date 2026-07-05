import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/Colors';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getSession, onAuthStateChange } from '@/lib/auth';
import { getMyMembership, clearMembershipCache } from '@/lib/household';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isLoading, setIsLoading] = useState(true);
  const [authVersion, setAuthVersion] = useState(0);

  // Re-run the guard when auth state changes (sign-in/sign-out).
  useEffect(() => {
    const unsubscribe = onAuthStateChange(() => {
      clearMembershipCache();
      setAuthVersion((v) => v + 1);
    });
    return unsubscribe;
  }, []);

  // Route guard: re-evaluated on every navigation and auth change so it
  // never acts on stale state.
  useEffect(() => {
    let cancelled = false;

    async function enforceAccess() {
      if (!isSupabaseConfigured) {
        setIsLoading(false);
        if (segments[0] !== 'sign-in') {
          router.replace('/sign-in');
        }
        return;
      }

      const inSignIn = segments[0] === 'sign-in';
      const inOnboarding =
        segments[0] === 'role-select' || segments[0] === 'join-household';
      const inFamilyArea =
        segments[0] === '(family)' || segments[0] === 'family-item';
      const inOwnerArea = segments[0] === '(tabs)' || segments[0] === 'item';

      try {
        const session = await getSession();
        if (cancelled) return;

        if (!session) {
          setIsLoading(false);
          if (!inSignIn) {
            router.replace('/sign-in');
          }
          return;
        }

        const membership = await getMyMembership();
        if (cancelled) return;
        setIsLoading(false);

        if (!membership) {
          // Signed in but no household yet: onboarding.
          if (!inOnboarding) {
            router.replace('/role-select');
          }
        } else if (membership.role === 'owner') {
          if (inSignIn || inOnboarding || inFamilyArea) {
            router.replace('/(tabs)');
          }
        } else {
          if (inSignIn || inOnboarding || inOwnerArea) {
            router.replace('/(family)');
          }
        }
      } catch (err) {
        console.error('Route guard failed:', err);
        if (!cancelled) setIsLoading(false);
      }
    }

    enforceAccess();
    return () => {
      cancelled = true;
    };
  }, [segments, router, authVersion]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.primaryDark,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="role-select" options={{ headerShown: false }} />
        <Stack.Screen name="join-household" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(family)" options={{ headerShown: false }} />
        <Stack.Screen
          name="item/[id]"
          options={{
            title: 'Item Details',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="family-item/[id]"
          options={{
            title: 'Item Details',
            presentation: 'card',
          }}
        />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
