import React from 'react';
import { View, Text, Image, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RoomMember } from '@reelrank/shared';
import { colors, spacing, borderRadius, typography } from '../theme';

interface MemberListProps {
  members: RoomMember[];
  hostId: string;
}

export default function MemberList({ members, hostId }: MemberListProps) {
  return (
    <FlatList
      data={members}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.member}>
          {item.user?.photoUrl ? (
            <Image source={{ uri: item.user.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={18} color={colors.textSecondary} />
            </View>
          )}
          <Text style={styles.name} numberOfLines={1}>
            {item.user?.displayName ?? 'Anonymous'}
          </Text>
          {item.userId === hostId && (
            <View style={styles.hostBadge}>
              <Ionicons name="star" size={10} color={colors.accent} />
              <Text style={styles.hostText}>Host</Text>
            </View>
          )}
        </View>
      )}
      contentContainerStyle={styles.list}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  hostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  hostText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '700',
  },
});
