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
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    async function checkRole() {
      try {
        const storedRole = await getUserRole();
        setRole(storedRole);
      } catch (err) {
        console.error('Failed to check role:', err);
      } finally {
        setIsLoading(false);
      }
    }
    checkRole();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inRoleSelect = segments[0] === 'role-select';
    const inFamilyIdentity = segments[0] === 'family-identity';
    const inFamilyTabs = segments[0] === '(family)';
    const inOwnerTabs = segments[0] === '(tabs)';

    if (!role) {
      if (!inRoleSelect) {
        router.replace('/role-select');
      }
    } else if (role === 'grandma') {
      if (inRoleSelect || inFamilyIdentity || inFamilyTabs) {
        router.replace('/(tabs)');
      }
    } else if (role === 'family') {
      if (inRoleSelect) {
        getFamilyMemberIdentity().then((memberId) => {
          if (memberId) {
            router.replace('/(family)');
          } else {
            router.replace('/family-identity');
          }
        });
      } else if (inOwnerTabs) {
        router.replace('/(family)');
      }
    }
  }, [isLoading, role, segments, router]);

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
