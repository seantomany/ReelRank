import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Linking, TextInput as RNTextInput, TouchableOpacity, Image, Modal } from 'react-native';
import { Text, Switch, Button, Divider, Snackbar, Avatar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
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
  const { user, signOut, getIdToken } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dailyRecEnabled, setDailyRecEnabled] = useState(true);
  const [username, setUsername] = useState('');
  const [savedUsername, setSavedUsername] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getIdToken();
        const res = await api.auth.verify(token);
        if (res.data && typeof res.data === 'object') {
          const d = res.data as any;
          const u = d.username ?? '';
          setUsername(u);
          setSavedUsername(u);
          if (d.photoUrl) setPhotoUrl(d.photoUrl);
        }
      } catch {}
    })();
  }, []);

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to change your profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: false,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;
    const sourceUri = result.assets[0].uri;

    const MAX_BYTES = 200_000;
    const qualities = [0.3, 0.2, 0.1];
    let dataUrl: string | null = null;

    try {
      setSnackbar({ visible: true, message: 'Compressing photo…' });
      for (const q of qualities) {
        const manipulated = await ImageManipulator.manipulateAsync(
          sourceUri,
          [{ resize: { width: 400, height: 400 } }],
          {
            compress: q,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
          },
        );
        if (!manipulated.base64) continue;
        const candidate = `data:image/jpeg;base64,${manipulated.base64}`;
        if (candidate.length <= MAX_BYTES) {
          dataUrl = candidate;
          break;
        }
      }
    } catch {
      setSnackbar({ visible: true, message: 'Failed to process photo' });
      return;
    }

    if (!dataUrl) {
      setSnackbar({ visible: true, message: 'Photo still too large after compression, try another image' });
      return;
    }

    try {
      const token = await getIdToken();
      const res = await api.auth.uploadPhoto(dataUrl, token);
      if (res.error) {
        setSnackbar({ visible: true, message: res.error });
      } else {
        setPhotoUrl(dataUrl);
        setSnackbar({ visible: true, message: 'Profile photo updated' });
      }
    } catch {
      setSnackbar({ visible: true, message: 'Failed to upload photo' });
    }
  };

  const handleSaveUsername = async () => {
    if (!username.trim() || username.trim().length < 3) {
      setSnackbar({ visible: true, message: 'Username must be at least 3 characters' });
      return;
    }
    setSavingUsername(true);
    try {
      const token = await getIdToken();
      const res = await api.auth.updateProfile({ username: username.trim() }, token);
      if (res.data) {
        setSavedUsername(username.trim());
        setEditingUsername(false);
        setSnackbar({ visible: true, message: 'Username updated' });
      } else if (res.error) {
        setSnackbar({ visible: true, message: res.error });
      }
    } catch {
      setSnackbar({ visible: true, message: 'Failed to update username' });
    }
    setSavingUsername(false);
  };

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

  const openDeleteAccountModal = () => {
    setDeleteConfirmText('');
    setDeleteModalVisible(true);
  };

  const confirmDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setSnackbar({ visible: true, message: 'Please type DELETE to confirm' });
      return;
    }
    setDeleting(true);
    try {
      const token = await getIdToken();
      const res = await api.auth.deleteAccount(token);
      if (res.error) {
        setSnackbar({ visible: true, message: res.error });
        setDeleting(false);
        return;
      }
      setDeleteModalVisible(false);
      setDeleting(false);
      await signOut();
    } catch (err) {
      setDeleting(false);
      setSnackbar({
        visible: true,
        message: err instanceof Error ? err.message : 'Failed to delete account',
      });
    }
  };


  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionHeader title="Profile Photo" />
        <View style={styles.section}>
          <TouchableOpacity style={styles.photoRow} onPress={handlePickPhoto}>
            <View style={styles.avatarContainer}>
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
              ) : (
                <Avatar.Text size={56} label={user?.displayName?.charAt(0)?.toUpperCase() ?? '?'} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.photoLabel}>{photoUrl ? 'Change photo' : 'Add a profile photo'}</Text>
              <Text style={styles.photoHint}>Tap to select from your library</Text>
            </View>
            <Ionicons name="camera-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

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
          <Divider style={styles.divider} />
          <View style={styles.settingRow}>
            <Ionicons name="at-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.settingLabel}>Username</Text>
            <View style={styles.settingRight}>
              {editingUsername ? (
                <View style={styles.usernameEditRow}>
                  <RNTextInput
                    style={styles.usernameInput}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="username"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={20}
                    onSubmitEditing={handleSaveUsername}
                  />
                  <TouchableOpacity onPress={handleSaveUsername} disabled={savingUsername}>
                    <Text style={styles.saveText}>{savingUsername ? '...' : 'Save'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setUsername(savedUsername); setEditingUsername(false); }}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setEditingUsername(true)}>
                  <Text style={styles.usernameValueText}>
                    {savedUsername || 'Set username'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
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
            right={<Text style={styles.valueText}>{Constants.expoConfig?.version ?? '1.0.0'}</Text>}
          />
          <Divider style={styles.divider} />
          <SettingRow
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            right={
              <Button
                mode="text"
                onPress={() => Linking.openURL('https://reelrank.vercel.app/privacy')}
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
                onPress={() => Linking.openURL('https://reelrank.vercel.app/terms')}
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
            mode="contained"
            onPress={openDeleteAccountModal}
            style={styles.deleteAccountButton}
            buttonColor={colors.error}
            textColor="#ffffff"
          >
            Delete Account
          </Button>
          <Text style={styles.deleteAccountHint}>
            Permanently removes your account and all associated data. This cannot be undone.
          </Text>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setDeleteModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalBody}>
              This will permanently delete your ReelRank account and all associated data, including:
            </Text>
            <View style={styles.modalBullets}>
              <Text style={styles.modalBullet}>• Your profile, username, and photo</Text>
              <Text style={styles.modalBullet}>• All swipes, ratings, and rankings</Text>
              <Text style={styles.modalBullet}>• Watched movies and watchlist</Text>
              <Text style={styles.modalBullet}>• Friends, requests, and comments</Text>
              <Text style={styles.modalBullet}>• Group rooms you created or joined</Text>
            </View>
            <Text style={styles.modalBody}>
              This action is immediate and cannot be undone. To confirm, type <Text style={styles.modalBold}>DELETE</Text> below.
            </Text>
            <RNTextInput
              style={styles.modalInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="Type DELETE"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!deleting}
            />
            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setDeleteModalVisible(false)}
                disabled={deleting}
                style={styles.modalCancelButton}
                textColor={colors.text}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={confirmDeleteAccount}
                loading={deleting}
                disabled={deleting || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                buttonColor={colors.error}
                textColor="#ffffff"
                style={styles.modalConfirmButton}
              >
                Delete Forever
              </Button>
            </View>
          </View>
        </View>
      </Modal>

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
  deleteAccountButton: {
    marginTop: spacing.sm,
  },
  deleteAccountHint: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.error,
  },
  modalBody: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  modalBold: {
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBullets: {
    gap: spacing.xs,
    paddingLeft: spacing.xs,
  },
  modalBullet: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.background,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalCancelButton: {
    flex: 1,
    borderColor: colors.border,
  },
  modalConfirmButton: {
    flex: 1,
  },
  usernameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  usernameInput: {
    color: colors.text,
    fontSize: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 2,
    minWidth: 90,
  },
  saveText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  usernameValueText: {
    color: colors.primary,
    fontSize: 14,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  photoLabel: {
    color: colors.text,
    fontSize: 15,
  },
  photoHint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});
