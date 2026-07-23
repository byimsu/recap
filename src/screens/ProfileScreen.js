import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, deleteAccount } from '../services/profileService';
import { uploadProfileImage, saveGuestProfileImage } from '../services/storageService';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

const NAME_MIN = 2;
const NAME_MAX = 30;

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function SectionLabel({ label, colors }) {
  return (
    <Text style={[styles.sectionLabel, { color: colors.subtext }]}>{label}</Text>
  );
}

function Row({ icon, label, sublabel, right, onPress, disabled, colors }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border },
        disabled && { opacity: 0.6 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        {icon}
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {!!sublabel && (
          <Text style={[styles.rowSublabel, { color: colors.subtext }]}>{sublabel}</Text>
        )}
      </View>
      {right}
    </Wrapper>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { user, isGuest, emailVerified, logout } = useAuth();

  const [profile, setProfile] = useState(null);
  const [nameInput, setNameInput] = useState('');
  const [initializing, setInitializing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // null | 0–100

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  const hasNameChanged = profile && nameInput.trim() !== profile.displayName;
  const canSave = hasNameChanged && nameInput.trim().length >= NAME_MIN && !saving && uploadProgress === null;

  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getProfile(user);
      setProfile(data);
      setNameInput(data?.displayName ?? '');
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Could not load your profile. Please try again.');
    } finally {
      setInitializing(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleChangeName() {
    const trimmed = nameInput.trim();
    if (trimmed.length < NAME_MIN) {
      Alert.alert('Name Too Short', `Display name must be at least ${NAME_MIN} characters.`);
      return;
    }
    if (trimmed.length > NAME_MAX) {
      Alert.alert('Name Too Long', `Display name must be ${NAME_MAX} characters or fewer.`);
      return;
    }

    setSaving(true);
    try {
      await updateProfile(user, { displayName: trimmed });
      setProfile((prev) => ({ ...prev, displayName: trimmed }));
    } catch (error) {
      console.error('Error saving name:', error);
      Alert.alert('Save Failed', 'Could not update your display name. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow Recap to access your photo library in Settings.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) return;

    const localUri = result.assets[0].uri;

    setUploadProgress(0);
    try {
      let photoURL;
      if (isGuest) {
        photoURL = await saveGuestProfileImage(localUri);
      } else {
        photoURL = await uploadProfileImage(user.uid, localUri, setUploadProgress);
      }
      await updateProfile(user, { photoURL });
      setProfile((prev) => ({ ...prev, photoURL }));
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Upload Failed', 'Could not update your profile picture. Please try again.');
    } finally {
      setUploadProgress(null);
    }
  }

  function handleLogout() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Sign Out Failed', 'There was an issue signing you out. Please try again.');
            }
          },
        },
      ]
    );
  }

  async function handleConfirmDeleteAccount() {
    if (confirmInput.trim().toLowerCase() !== 'confirm') return;

    setDeleting(true);
    try {
      await deleteAccount(user, passwordInput);
      setShowDeleteModal(false);
      setConfirmInput('');
      setPasswordInput('');
      Alert.alert('Account Deleted', 'Your account and data have been permanently deleted.');
      await logout();
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('Deletion Failed', error.message || 'Could not delete your account. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  function handlePrivacyPolicy() {
    Alert.alert('Privacy Policy', 'Privacy policy coming soon.');
  }

  function handleTerms() {
    Alert.alert('Terms of Service', 'Terms of service coming soon.');
  }

  if (initializing) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  const uploading = uploadProgress !== null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={colors.bg === '#FFFFFF' ? 'dark' : 'light'} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { borderColor: colors.border }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.screenTitle, { color: colors.text }]}>Profile</Text>

        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          <TouchableOpacity
            onPress={handleChangePhoto}
            disabled={uploading || saving}
            activeOpacity={0.8}
          >
            <View style={styles.avatarOuter}>
              {profile?.photoURL ? (
                <Image
                  source={{ uri: profile.photoURL }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.avatarInitials, { color: colors.buttonText }]}>
                    {getInitials(profile?.displayName)}
                  </Text>
                </View>
              )}

              {uploading ? (
                <View style={styles.avatarOverlay}>
                  <Text style={styles.uploadProgressText}>{uploadProgress}%</Text>
                </View>
              ) : (
                <View style={[styles.cameraButton, { backgroundColor: colors.button }]}>
                  <Feather name="camera" size={12} color={colors.buttonText} />
                </View>
              )}
            </View>
          </TouchableOpacity>

          <Text style={[styles.profileName, { color: colors.text }]}>
            {profile?.displayName || 'Guest'}
          </Text>
          <View style={[styles.badge, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.badgeText, { color: colors.subtext }]}>
              {isGuest ? 'Guest Account' : 'Registered Account'}
            </Text>
          </View>
        </View>

        {/* Guest CTA */}
        {isGuest && (
          <TouchableOpacity
            style={[styles.guestCta, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.8}
          >
            <Feather name="cloud" size={16} color={colors.text} />
            <Text style={[styles.guestCtaText, { color: colors.text }]}>
              Create an account to sync your data to the cloud
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
          </TouchableOpacity>
        )}

        {/* Edit Profile */}
        <SectionLabel label="EDIT PROFILE" colors={colors} />

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.inputLabel, { color: colors.subtext }]}>Display Name</Text>
          <TextInput
            value={nameInput}
            onChangeText={setNameInput}
            placeholder="Your name"
            placeholderTextColor={colors.subtext}
            maxLength={NAME_MAX}
            editable={!saving && !uploading}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />
          <Text style={[styles.charCount, { color: colors.subtext }]}>
            {nameInput.trim().length}/{NAME_MAX}
          </Text>

          <TouchableOpacity
            onPress={handleChangeName}
            disabled={!canSave}
            style={[
              styles.saveButton,
              { backgroundColor: colors.button },
              !canSave && { opacity: 0.4 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color={colors.buttonText} size="small" />
            ) : (
              <Text style={[styles.saveButtonText, { color: colors.buttonText }]}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Account — only for registered users */}
        {!isGuest && (
          <>
            <SectionLabel label="ACCOUNT" colors={colors} />
            <Row
              colors={colors}
              icon={<Feather name="mail" size={16} color={colors.text} />}
              label={profile?.email || '—'}
              sublabel="Email address"
            />
            <Row
              colors={colors}
              icon={
                <Feather
                  name={emailVerified ? 'check-circle' : 'alert-circle'}
                  size={16}
                  color={emailVerified ? colors.success : colors.danger}
                />
              }
              label={emailVerified ? 'Email Verified' : 'Email Not Verified'}
              sublabel={emailVerified ? null : 'Check your inbox for a verification link'}
            />
          </>
        )}

        {/* About */}
        <SectionLabel label="ABOUT" colors={colors} />
        <Row
          colors={colors}
          icon={<Feather name="info" size={16} color={colors.text} />}
          label="App Version"
          sublabel={APP_VERSION}
        />
        <Row
          colors={colors}
          icon={<Feather name="shield" size={16} color={colors.text} />}
          label="Privacy Policy"
          onPress={handlePrivacyPolicy}
          right={<Ionicons name="chevron-forward" size={18} color={colors.subtext} />}
        />
        <Row
          colors={colors}
          icon={<Feather name="file-text" size={16} color={colors.text} />}
          label="Terms of Service"
          onPress={handleTerms}
          right={<Ionicons name="chevron-forward" size={18} color={colors.subtext} />}
        />

        {/* Session */}
        <SectionLabel label="SESSION" colors={colors} />
        <Row
          colors={colors}
          icon={<Feather name="log-out" size={16} color={colors.danger} />}
          label="Sign Out"
          onPress={handleLogout}
          right={<Ionicons name="chevron-forward" size={18} color={colors.subtext} />}
        />

        {/* Danger Zone */}
        <SectionLabel label="DANGER ZONE" colors={colors} />
        <Row
          colors={colors}
          icon={<Feather name="trash-2" size={16} color={colors.danger} />}
          label="Delete Account"
          sublabel="Permanently delete your account and all data"
          onPress={() => setShowDeleteModal(true)}
          right={<Ionicons name="chevron-forward" size={18} color={colors.subtext} />}
        />

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) setShowDeleteModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalIconBadge}>
              <Feather name="alert-triangle" size={24} color={colors.danger} />
            </View>

            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete Account?</Text>

            <Text style={[styles.modalSubtext, { color: colors.subtext }]}>
              This action is permanent and cannot be undone. All your notes, decks, progress, and account data will be wiped.
            </Text>

            <Text style={[styles.modalInputPrompt, { color: colors.text }]}>
              Type <Text style={{ fontWeight: '800', color: colors.danger }}>confirm</Text> to proceed:
            </Text>

            <TextInput
              value={confirmInput}
              onChangeText={setConfirmInput}
              placeholder="confirm"
              placeholderTextColor={colors.subtext}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!deleting}
              style={[
                styles.modalInput,
                { color: colors.text, borderColor: confirmInput.trim().toLowerCase() === 'confirm' ? colors.danger : colors.border },
              ]}
            />

            {!isGuest && (
              <>
                <Text style={[styles.modalInputPrompt, { color: colors.text }]}>
                  Account password:
                </Text>
                <TextInput
                  value={passwordInput}
                  onChangeText={setPasswordInput}
                  placeholder="Your account password"
                  placeholderTextColor={colors.subtext}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!deleting}
                  style={[
                    styles.modalInput,
                    { color: colors.text, borderColor: passwordInput.trim().length > 0 ? colors.danger : colors.border },
                  ]}
                />
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                disabled={deleting}
                onPress={() => {
                  setConfirmInput('');
                  setPasswordInput('');
                  setShowDeleteModal(false);
                }}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              {(() => {
                const isValid = confirmInput.trim().toLowerCase() === 'confirm' && (isGuest || passwordInput.trim().length > 0);
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalDeleteBtn,
                      { backgroundColor: colors.danger },
                      (!isValid || deleting) && { opacity: 0.4 },
                    ]}
                    disabled={!isValid || deleting}
                    onPress={handleConfirmDeleteAccount}
                  >
                    {deleting ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.modalDeleteText}>Delete Account</Text>
                    )}
                  </TouchableOpacity>
                );
              })()}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: '6%',
    paddingTop: '16%',
    paddingBottom: '6%',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 28,
    letterSpacing: -0.5,
  },
  avatarWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarOuter: {
    width: 88,
    height: 88,
    marginBottom: 12,
    position: 'relative',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '700',
  },
  avatarOverlay: {
    position: 'absolute',
    inset: 0,
    borderRadius: 44,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadProgressText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  guestCta: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  guestCtaText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    fontSize: 15.5,
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 16,
    height: 48,
  },
  charCount: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 14,
  },
  saveButton: {
    height: 48,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontWeight: '700',
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContent: {
    flex: 1,
    marginLeft: 14,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSublabel: {
    fontSize: 12.5,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtext: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInputPrompt: {
    fontSize: 13,
    fontWeight: '500',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  modalInput: {
    width: '100%',
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 100,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalDeleteBtn: {
    flex: 1,
    height: 46,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDeleteText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

