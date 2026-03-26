import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Linking } from 'react-native';
import { Text, Switch, Button, Divider, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius } from '../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface SettingsScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

function SettingRow({ icon, label, right }: { icon: string; label: string; right: React.ReactNode }) {
  return (
    <View style={styles.settingRow}>
      <Ionicons name={icon as any} size={22} color={colors.textSecondary} />
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.settingRight}>{right}</View>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { user, signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dailyRecEnabled, setDailyRecEnabled] = useState(true);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const handleClearCache = async () => {
    Alert.alert('Clear Cache', 'This will clear locally cached data. You won\'t lose any account data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(await AsyncStorage.getAllKeys().then(keys =>
            keys.filter(k => !k.includes('onboarded') && !k.includes('firebase'))
          ));
          setSnackbar({ visible: true, message: 'Cache cleared' });
        },
      },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setSnackbar({ visible: true, message: 'Contact support to delete your account' });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionHeader title="Account" />
        <View style={styles.section}>
          <SettingRow
            icon="mail-outline"
            label="Email"
            right={<Text style={styles.valueText}>{user?.email ?? 'Not set'}</Text>}
          />
          <Divider style={styles.divider} />
          <SettingRow
            icon="person-outline"
            label="Display Name"
            right={<Text style={styles.valueText}>{user?.displayName ?? 'Not set'}</Text>}
          />
        </View>

        <SectionHeader title="Notifications" />
        <View style={styles.section}>
          <SettingRow
            icon="notifications-outline"
            label="Push Notifications"
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                color={colors.primary}
              />
            }
          />
          <Divider style={styles.divider} />
          <SettingRow
            icon="sunny-outline"
            label="Daily Recommendation"
            right={
              <Switch
                value={dailyRecEnabled}
                onValueChange={setDailyRecEnabled}
                color={colors.primary}
              />
            }
          />
        </View>

        <SectionHeader title="Data" />
        <View style={styles.section}>
          <SettingRow
            icon="trash-outline"
            label="Clear Cache"
            right={
              <Button mode="text" onPress={handleClearCache} textColor={colors.primary} compact>
                Clear
              </Button>
            }
          />
        </View>

        <SectionHeader title="About" />
        <View style={styles.section}>
          <SettingRow
            icon="information-circle-outline"
            label="Version"
            right={<Text style={styles.valueText}>1.0.0</Text>}
          />
          <Divider style={styles.divider} />
          <SettingRow
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            right={
              <Button
                mode="text"
                onPress={() => Linking.openURL('https://filmstack-gamma.vercel.app/privacy')}
                textColor={colors.primary}
                compact
              >
                View
              </Button>
            }
          />
          <Divider style={styles.divider} />
          <SettingRow
            icon="document-text-outline"
            label="Terms of Service"
            right={
              <Button
                mode="text"
                onPress={() => Linking.openURL('https://filmstack-gamma.vercel.app/terms')}
                textColor={colors.primary}
                compact
              >
                View
              </Button>
            }
          />
        </View>

        <View style={styles.dangerSection}>
          <Button
            mode="outlined"
            onPress={handleSignOut}
            style={styles.signOutButton}
            textColor={colors.error}
          >
            Sign Out
          </Button>
          <Button
            mode="text"
            onPress={handleDeleteAccount}
            textColor={colors.textTertiary}
            style={styles.deleteButton}
          >
            Delete Account
          </Button>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  section: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  settingLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  settingRight: {
    alignItems: 'flex-end',
  },
  valueText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  divider: {
    backgroundColor: colors.border,
    marginLeft: spacing.md + 22 + spacing.md,
  },
  dangerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
  signOutButton: {
    borderColor: colors.error,
  },
  deleteButton: {
    opacity: 0.6,
  },
});
