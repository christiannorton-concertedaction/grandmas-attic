import { useState } from 'react';
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
import { clearUserRole } from '@/lib/userRole';

export default function OwnerSettingsScreen() {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

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

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Role</Text>
        <View style={styles.roleCard}>
          <View style={styles.roleIcon}>
            <FontAwesome name="home" size={24} color={Colors.primary} />
          </View>
          <View style={styles.roleInfo}>
            <Text style={styles.roleName}>Owner</Text>
            <Text style={styles.roleLabel}>Full access to all features</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>
        <Pressable
          style={[styles.optionButton, switching && styles.disabled]}
          onPress={handleSwitchRole}
          disabled={switching}
        >
          {switching ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <>
              <FontAwesome name="exchange" size={18} color={Colors.primary} />
              <Text style={styles.optionButtonText}>Switch to Family Mode</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Grandma's Attic</Text>
        <Text style={styles.footerSubtext}>Owner Mode</Text>
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
