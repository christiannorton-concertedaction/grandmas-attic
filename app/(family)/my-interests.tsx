import { useCallback, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { FamilyItemCard } from '@/components/FamilyItemCard';
import { EmptyState } from '@/components/EmptyState';
import { listItems } from '@/lib/items';
import { getMyFamilyMember } from '@/lib/userRole';
import { getInterestedItemIds } from '@/lib/familyInteractions';
import type { Item } from '@/types/item';

export default function MyInterestsScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const member = await getMyFamilyMember();
      const memberId = member?.id ?? null;
      setMyMemberId(memberId);
      
      if (!memberId) {
        setItems([]);
        return;
      }

      const [allItems, interestedIds] = await Promise.all([
        listItems(),
        getInterestedItemIds(memberId),
      ]);

      setItems(
        allItems.filter(
          (i) => i.analysis_status === 'completed' && interestedIds.has(i.id)
        )
      );
    } catch (err) {
      console.error('Failed to load interests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  function handleRefresh() {
    setRefreshing(true);
    loadData();
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FamilyItemCard item={item} myMemberId={myMemberId} />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="No interests yet"
            message="Browse items and tap the heart to mark items you're interested in."
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
});
