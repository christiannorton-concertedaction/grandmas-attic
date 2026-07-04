import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/Colors';
import { getUserRole, getFamilyMemberIdentity, type UserRole } from '@/lib/userRole';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isLoading, setIsLoading] = useState(true);

  // Re-read the role from storage on every navigation so the guard never
  // acts on stale data (e.g. right after selecting or switching roles).
  useEffect(() => {
    let cancelled = false;

    async function enforceRole() {
      let role: UserRole | null = null;
      try {
        role = await getUserRole();
      } catch (err) {
        console.error('Failed to check role:', err);
      }
      if (cancelled) return;

      setIsLoading(false);

      const inRoleSelect = segments[0] === 'role-select';
      const inFamilyIdentity = segments[0] === 'family-identity';
      const inFamilyArea = segments[0] === '(family)' || segments[0] === 'family-item';
      const inOwnerArea = segments[0] === '(tabs)' || segments[0] === 'item';

      if (!role) {
        if (!inRoleSelect) {
          router.replace('/role-select');
        }
      } else if (role === 'grandma') {
        if (inRoleSelect || inFamilyIdentity || inFamilyArea) {
          router.replace('/(tabs)');
        }
      } else if (role === 'family') {
        if (inRoleSelect || inOwnerArea) {
          const memberId = await getFamilyMemberIdentity();
          if (cancelled) return;
          if (memberId) {
            router.replace('/(family)');
          } else {
            router.replace('/family-identity');
          }
        }
      }
    }

    enforceRole();
    return () => {
      cancelled = true;
    };
  }, [segments, router]);

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
        <Stack.Screen name="role-select" options={{ headerShown: false }} />
        <Stack.Screen name="family-identity" options={{ headerShown: false }} />
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
