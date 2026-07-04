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
import { Colors } from '@/constants/Colors';
import { DecisionBadge } from '@/components/DecisionPicker';
import { getPhotoSignedUrl } from '@/lib/items';
import { getFamilyMember } from '@/lib/familyMembers';
import { formatValueRange, type Item } from '@/types/item';

interface ItemCardProps {
  item: Item;
}

export function ItemCard({ item }: ItemCardProps) {
  const router = useRouter();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(true);
  const [familyMemberName, setFamilyMemberName] = useState<string | null>(null);

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

  const isPending = item.analysis_status === 'pending' || item.analysis_status === 'analyzing';
  const isFailed = item.analysis_status === 'failed';

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/item/${item.id}`)}
    >
      <View style={styles.thumbnailWrap}>
        {loadingPhoto ? (
          <ActivityIndicator color={Colors.primary} />
        ) : photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.thumbnail} contentFit="cover" />
        ) : (
          <Text style={styles.placeholder}>📷</Text>
        )}
        {isPending && (
          <View style={styles.pendingOverlay}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title || (isPending ? 'Analyzing...' : 'Unknown item')}
        </Text>
        {isFailed ? (
          <Text style={styles.errorText}>Analysis failed</Text>
        ) : isPending ? (
          <Text style={styles.pendingText}>Waiting for analysis</Text>
        ) : (
          <>
            <Text style={styles.value}>
              {formatValueRange(item.estimated_value_low, item.estimated_value_high)}
            </Text>
            <DecisionBadge decision={item.decision} familyMemberName={familyMemberName} compact />
          </>
        )}
      </View>
    </Pressable>
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
  pendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
  },
});
