import { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
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
import { getFamilyMemberIdentity } from '@/lib/userRole';
import { hasInterest } from '@/lib/familyInteractions';
import type { Item } from '@/types/item';

export default function MyInterestsScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const memberId = await getFamilyMemberIdentity();
      setMyMemberId(memberId);
      
      if (!memberId) {
        setItems([]);
        return;
      }

      const allItems = await listItems();
      const completedItems = allItems.filter(i => i.analysis_status === 'completed');
      
      const interestedItems: Item[] = [];
      for (const item of completedItems) {
        const interested = await hasInterest(item.id, memberId);
        if (interested) {
          interestedItems.push(item);
        }
      }
      
      setItems(interestedItems);
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
            icon="heart-o"
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
