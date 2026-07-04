import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/Colors';
import { DecisionBadge } from '@/components/DecisionPicker';
import { getPhotoSignedUrl } from '@/lib/items';
import { getFamilyMember } from '@/lib/familyMembers';
import { hasInterest, addItemInterest, removeItemInterest } from '@/lib/familyInteractions';
import { formatValueRange, type Item } from '@/types/item';

interface FamilyItemCardProps {
  item: Item;
  myMemberId: string | null;
}

export function FamilyItemCard({ item, myMemberId }: FamilyItemCardProps) {
  const router = useRouter();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(true);
  const [familyMemberName, setFamilyMemberName] = useState<string | null>(null);
  const [isInterested, setIsInterested] = useState(false);
  const [togglingInterest, setTogglingInterest] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPhotoSignedUrl(item.photo_path)
      .then((url) => {
        if (!cancelled) setPhotoUrl(url);
      })
      .catch(() => {
        if (!cancelled) setPhotoUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingPhoto(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item.photo_path]);

  useEffect(() => {
    if (item.decision === 'family_member' && item.family_member_id) {
      let cancelled = false;
      getFamilyMember(item.family_member_id)
        .then((member) => {
          if (!cancelled && member) setFamilyMemberName(member.name);
        })
        .catch(() => {
          if (!cancelled) setFamilyMemberName(null);
        });
      return () => {
        cancelled = true;
      };
    } else {
      setFamilyMemberName(null);
    }
  }, [item.decision, item.family_member_id]);

  useEffect(() => {
    if (myMemberId) {
      hasInterest(item.id, myMemberId)
        .then(setIsInterested)
        .catch(() => setIsInterested(false));
    }
  }, [item.id, myMemberId]);

  async function handleToggleInterest() {
    if (!myMemberId || togglingInterest) return;

    setTogglingInterest(true);
    try {
      if (isInterested) {
        await removeItemInterest(item.id, myMemberId);
        setIsInterested(false);
      } else {
        await addItemInterest(item.id, myMemberId);
        setIsInterested(true);
      }
    } catch (err) {
      console.error('Failed to toggle interest:', err);
    } finally {
      setTogglingInterest(false);
    }
  }

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.mainContent}
        onPress={() => router.push(`/family-item/${item.id}`)}
      >
        <View style={styles.thumbnailWrap}>
          {loadingPhoto ? (
            <ActivityIndicator color={Colors.primary} />
          ) : photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.thumbnail} contentFit="cover" />
          ) : (
            <Text style={styles.placeholder}>📷</Text>
          )}
        </View>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title || 'Unknown item'}
          </Text>
          <Text style={styles.value}>
            {formatValueRange(item.estimated_value_low, item.estimated_value_high)}
          </Text>
          <DecisionBadge decision={item.decision} familyMemberName={familyMemberName} compact />
        </View>
      </Pressable>
      
      {myMemberId && (
        <Pressable
          style={[styles.heartButton, isInterested && styles.heartButtonActive]}
          onPress={handleToggleInterest}
          disabled={togglingInterest}
        >
          {togglingInterest ? (
            <ActivityIndicator size="small" color={isInterested ? '#FFFFFF' : Colors.primary} />
          ) : (
            <FontAwesome
              name={isInterested ? 'heart' : 'heart-o'}
              size={20}
              color={isInterested ? '#FFFFFF' : Colors.primary}
            />
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    overflow: 'hidden',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
  },
  thumbnailWrap: {
    alignItems: 'center',
    backgroundColor: '#EDE4D6',
    borderRadius: 12,
    height: 80,
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
    width: 80,
  },
  thumbnail: {
    height: '100%',
    width: '100%',
  },
  placeholder: {
    fontSize: 28,
  },
  content: {
    flex: 1,
    gap: 6,
    justifyContent: 'center',
  },
  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  value: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  heartButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  heartButtonActive: {
    backgroundColor: Colors.primary,
  },
});
