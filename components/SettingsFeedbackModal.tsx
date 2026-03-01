import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { saveFeedback } from '../lib/supabase';
import { deleteAccount } from '../lib/supabase/auth';
import { Avatar } from './ui/Avatar';
import { useProfilePicture } from '../hooks/useProfilePicture';
import { colors, typography, spacing, borderRadius, fontFamily } from '../theme/designTokens';

interface SettingsFeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsFeedbackModal: React.FC<SettingsFeedbackModalProps> = ({
  visible,
  onClose,
}) => {
  const { signOut, user, refreshUser } = useAuth();
  const [feedbackType, setFeedbackType] = useState<'bug' | 'wish' | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { handleAddProfilePicture, uploading } = useProfilePicture(user?.id || '', async () => {
    await refreshUser();
  });

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, all journal entries, mirrors, and friend connections. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'All your data will be deleted immediately and cannot be recovered.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    setIsDeletingAccount(true);
                    const result = await deleteAccount(user?.id);
                    setIsDeletingAccount(false);
                    if (result.success) {
                      onClose();
                      await signOut();
                    } else {
                      Alert.alert('Error', 'Failed to delete account. Please try again or contact support.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            signOut();
            onClose();
          },
        },
      ]
    );
  };

  const submitFeedback = async () => {
    if (!feedbackType || !feedbackText.trim()) {
      Alert.alert('Missing Info', 'Please select a feedback type and enter your message.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await saveFeedback(user?.id, feedbackType, feedbackText);

      if (result.success) {
        Alert.alert(
          'Thanks!',
          'Your feedback has been submitted. We really appreciate it!',
          [{ text: 'OK', onPress: () => {
            setFeedbackText('');
            setFeedbackType(null);
            onClose();
          }}]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to submit feedback. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = !feedbackType || !feedbackText.trim() || isSubmitting;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Send Feedback</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Image
                  source={require('../assets/images/icons/Close.png')}
                  style={styles.closeIcon}
                />
              </TouchableOpacity>
            </View>

            {/* Feedback Section */}
            <View style={styles.section}>
              {/* Type Selector */}
              <View style={styles.typeButtonsContainer}>
                <TouchableOpacity
                  style={[styles.typeButton, feedbackType === 'bug' && styles.typeButtonSelected]}
                  onPress={() => setFeedbackType('bug')}
                >
                  <Text style={[styles.typeButtonText, feedbackType === 'bug' && styles.typeButtonTextSelected]}>
                    Bug Report
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeButton, feedbackType === 'wish' && styles.typeButtonSelected]}
                  onPress={() => setFeedbackType('wish')}
                >
                  <Text style={[styles.typeButtonText, feedbackType === 'wish' && styles.typeButtonTextSelected]}>
                    I wish Oxbow did...
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Text Input */}
              <TextInput
                style={styles.feedbackInput}
                placeholder={
                  feedbackType === 'bug'
                    ? 'Describe what happened and what you expected...'
                    : feedbackType === 'wish'
                    ? 'I wish Oxbow could...'
                    : 'Select a feedback type above first...'
                }
                placeholderTextColor={colors.text.bodyLight}
                multiline
                value={feedbackText}
                onChangeText={setFeedbackText}
                editable={!!feedbackType}
                returnKeyType="default"
                blurOnSubmit={false}
                textAlignVertical="top"
              />

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitButton, isSubmitDisabled && styles.submitButtonDisabled]}
                onPress={submitFeedback}
                disabled={isSubmitDisabled}
              >
                <Text style={[styles.submitButtonText, isSubmitDisabled && styles.submitButtonTextDisabled]}>
                  {isSubmitting ? 'Submitting...' : 'Send Feedback'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Account Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account</Text>

              {/* Profile Picture */}
              <View style={styles.profilePicSection}>
                <Avatar
                  imageUri={user?.profile_picture_url || undefined}
                  initials={user?.display_name?.charAt(0) ?? '?'}
                  size="default"
                />
                <TouchableOpacity
                  style={[styles.changeProfilePicButton, uploading && styles.buttonDisabled]}
                  onPress={handleAddProfilePicture}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color={colors.text.primary} size="small" />
                  ) : (
                    <Text style={styles.changeProfilePicText}>
                      {user?.profile_picture_url ? 'Change profile pic' : 'Add profile pic'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Sign Out */}
              <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
                <Text style={styles.signOutButtonText}>Sign Out</Text>
              </TouchableOpacity>

              {/* Delete Account */}
              <TouchableOpacity
                style={[styles.deleteAccountButton, isDeletingAccount && styles.buttonDisabled]}
                onPress={handleDeleteAccount}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? (
                  <ActivityIndicator color={colors.text.error} size="small" />
                ) : (
                  <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 50 : 20,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    backgroundColor: colors.background.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.divider,
  },
  title: {
    ...typography.heading.l,
    color: colors.text.body,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    width: 28,
    height: 28,
    tintColor: colors.text.bodyLight,
  },
  // Sections
  section: {
    backgroundColor: colors.background.white,
    marginTop: spacing.l,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
    gap: spacing.xl,
  },
  sectionTitle: {
    ...typography.heading.default,
    color: colors.text.body,
  },
  // Type selector
  typeButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.l,
  },
  typeButton: {
    flex: 1,
    paddingVertical: spacing.l,
    paddingHorizontal: spacing.m,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: colors.border.divider,
    backgroundColor: colors.background.white,
    alignItems: 'center',
  },
  typeButtonSelected: {
    borderColor: colors.border.outline,
  },
  typeButtonText: {
    ...typography.heading.s,
    color: colors.text.bodyLight,
    textAlign: 'center',
  },
  typeButtonTextSelected: {
    color: colors.text.primary,
  },
  // Input
  feedbackInput: {
    borderWidth: 1,
    borderColor: colors.border.divider,
    borderRadius: borderRadius.card,
    padding: spacing.xl,
    fontFamily: fontFamily.primary,
    fontSize: 17,
    fontWeight: '400',
    color: colors.text.body,
    backgroundColor: colors.background.white,
    textAlignVertical: 'top',
    minHeight: 120,
    maxHeight: 200,
  },
  // Submit
  submitButton: {
    backgroundColor: colors.text.primary,
    borderRadius: borderRadius.button,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.background.disabled,
  },
  submitButtonText: {
    ...typography.heading.s,
    color: colors.text.white,
  },
  submitButtonTextDisabled: {
    color: colors.text.bodyLight,
  },
  // Profile
  profilePicSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  changeProfilePicButton: {
    flex: 1,
    backgroundColor: colors.background.defaultLight,
    borderRadius: borderRadius.button,
    paddingVertical: spacing.l,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  changeProfilePicText: {
    ...typography.heading.s,
    color: colors.text.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Sign Out
  signOutButton: {
    backgroundColor: colors.text.primary,
    borderRadius: borderRadius.button,
    paddingVertical: spacing.l,
    alignItems: 'center',
  },
  signOutButtonText: {
    ...typography.heading.s,
    color: colors.text.white,
  },
  // Delete Account
  deleteAccountButton: {
    paddingVertical: spacing.l,
    alignItems: 'center',
  },
  deleteAccountButtonText: {
    ...typography.heading.s,
    color: '#C0392B',
  },
});
