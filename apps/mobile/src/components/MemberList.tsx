import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Avatar, Chip } from 'react-native-paper';
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
              <Text style={styles.memberName}>{displayName}</Text>
              {isHost && (
                <Chip compact style={styles.hostChip} textStyle={styles.hostChipText}>
                  Host
                </Chip>
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
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  hostChip: {
    backgroundColor: colors.accent,
    height: 24,
  },
  hostChipText: {
    color: colors.onAccent,
    fontSize: 11,
  },
});
