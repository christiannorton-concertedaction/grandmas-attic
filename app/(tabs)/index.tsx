import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ItemCard } from '@/components/ItemCard';
import { EmptyState } from '@/components/EmptyState';
import { Colors } from '@/constants/Colors';
import { isSupabaseConfigured } from '@/lib/supabase';
import { listItems } from '@/lib/items';
import type { Item } from '@/types/item';

export default function ItemsScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async (isRefresh = false) => {
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Copy .env.example to .env and add your keys.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await listItems();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ItemCard item={item} />}
        contentContainerStyle={
          items.length === 0 ? styles.emptyList : styles.list
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadItems(true)}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={
          items.length > 0 ? (
            <Text style={styles.header}>
              {items.length} item{items.length === 1 ? '' : 's'} in the attic
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title="Your attic is empty"
            message="Snap your first item to get started. Head to the Add tab to take a photo."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyList: {
    flexGrow: 1,
  },
  header: {
    color: Colors.textMuted,
    fontSize: 14,
    marginBottom: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    color: Colors.error,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
