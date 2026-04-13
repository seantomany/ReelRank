import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { colors, spacing, borderRadius } from '../theme';
import type { RoomMember } from '@reelrank/shared';

interface MemberListProps {
  members: RoomMember[];
  hostId: string;
}

export function MemberList({ members, hostId }: MemberListProps) {
  return (
    <View style={styles.container}>
      {members.map((member) => {
        const isHost = member.userId === hostId;
        const displayName = member.user?.displayName ?? 'Player';
        const initials = displayName.charAt(0).toUpperCase();

        return (
          <View key={member.userId} style={styles.memberRow}>
            {member.user?.photoUrl ? (
              <Avatar.Image size={40} source={{ uri: member.user.photoUrl }} />
            ) : (
              <Avatar.Text size={40} label={initials} />
            )}
            <View style={styles.memberInfo}>
              <Text style={styles.memberName} numberOfLines={1}>
                {displayName}
              </Text>
              {isHost && (
                <View style={styles.hostBadge}>
                  <Text style={styles.hostBadgeText}>Host</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.md,
    gap: spacing.sm,
  },
  memberName: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  hostBadge: {
    flexShrink: 0,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  hostBadgeText: {
    color: colors.onAccent,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
});
