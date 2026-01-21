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
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { saveFeedback } from '../lib/supabase';
import { Avatar } from './ui/Avatar';
import { useProfilePicture } from '../hooks/useProfilePicture';

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
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { handleAddProfilePicture, uploading } = useProfilePicture(user?.id || '', async () => {
    // Refresh user data to show updated profile picture
    await refreshUser();
  });

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
      // Save to database
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
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Feedback Section */}
          <View style={styles.section}>

            {/* Feedback Type Buttons */}
            <View style={styles.typeButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  feedbackType === 'bug' && styles.typeButtonSelected,
                ]}
                onPress={() => setFeedbackType('bug')}
              >
                <Text style={styles.typeButtonIcon}>🐛</Text>
                <Text
                  style={[
                    styles.typeButtonText,
                    feedbackType === 'bug' && styles.typeButtonTextSelected,
                  ]}
                >
                  Bug Report
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  feedbackType === 'wish' && styles.typeButtonSelected,
                ]}
                onPress={() => setFeedbackType('wish')}
              >
                <Text style={styles.typeButtonIcon}>💡</Text>
                <Text
                  style={[
                    styles.typeButtonText,
                    feedbackType === 'wish' && styles.typeButtonTextSelected,
                  ]}
                >
                  I wish Oxbow did...
                </Text>
              </TouchableOpacity>
            </View>

            {/* Feedback Text Input */}
            <TextInput
              style={styles.feedbackInput}
              placeholder={
                feedbackType === 'bug'
                  ? 'Describe what happened and what you expected...'
                  : feedbackType === 'wish'
                  ? 'I wish Oxbow could...'
                  : 'Select a feedback type above first...'
              }
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              value={feedbackText}
              onChangeText={setFeedbackText}
              editable={!!feedbackType}
              returnKeyType="default"
              blurOnSubmit={false}
            />

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!feedbackType || !feedbackText.trim() || isSubmitting) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={submitFeedback}
              disabled={!feedbackType || !feedbackText.trim() || isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Submitting...' : 'Send Feedback'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Account</Text>

            {/* Profile Picture */}
            <View style={styles.profilePicSection}>
              <Avatar
                profilePictureUrl={user?.profile_picture_url}
                displayName={user?.display_name}
                size={60}
              />
              <TouchableOpacity
                style={[styles.changeProfilePicButton, uploading && styles.buttonDisabled]}
                onPress={handleAddProfilePicture}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#6366f1" size="small" />
                ) : (
                  <Text style={styles.changeProfilePicText}>
                    {user?.profile_picture_url ? 'Change profile pic' : 'Add profile pic'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
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
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 50 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#ffffff',
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 20,
  },
  typeButtonsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  typeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  typeButtonSelected: {
    borderColor: '#059669',
    backgroundColor: '#f0fdf4',
  },
  typeButtonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
  },
  typeButtonTextSelected: {
    color: '#059669',
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#ffffff',
    textAlignVertical: 'top',
    marginBottom: 16,
    minHeight: 120,
    maxHeight: 200,
  },
  submitButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  profilePicSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  changeProfilePicButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  changeProfilePicText: {
    color: '#6366f1',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});