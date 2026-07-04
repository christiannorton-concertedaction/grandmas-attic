import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { FamilyItemCard } from '@/components/FamilyItemCard';
import { EmptyState } from '@/components/EmptyState';
import { listItems } from '@/lib/items';
import { getFamilyMemberIdentity, clearFamilyMemberIdentity } from '@/lib/userRole';
import { getFamilyMember } from '@/lib/familyMembers';
import type { Item, FamilyMember } from '@/types/item';

export default function FamilyBrowseScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myIdentity, setMyIdentity] = useState<FamilyMember | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [itemsData, memberId] = await Promise.all([
        listItems(),
        getFamilyMemberIdentity(),
      ]);
      
      setItems(itemsData.filter(i => i.analysis_status === 'completed'));
      
      if (memberId) {
        const member = await getFamilyMember(memberId);
        if (!member) {
          // The owner deleted this family member; the stored identity is
          // stale, so send the user back to pick or re-create one.
          await clearFamilyMemberIdentity();
          router.replace('/family-identity');
          return;
        }
        setMyIdentity(member);
      } else {
        router.replace('/family-identity');
        return;
      }
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

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
      {myIdentity && (
        <View style={styles.welcomeBanner}>
          <Text style={styles.welcomeText}>
            Welcome, {myIdentity.name}! Browse items and mark what interests you.
          </Text>
        </View>
      )}
      
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FamilyItemCard item={item} myMemberId={myIdentity?.id ?? null} />
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
            title="No items yet"
            message="The owner hasn't cataloged any items yet. Check back later!"
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
  welcomeBanner: {
    backgroundColor: '#F3EAD6',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  welcomeText: {
    color: Colors.text,
    fontSize: 14,
    textAlign: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
});
