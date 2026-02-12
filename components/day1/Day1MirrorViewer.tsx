// components/day1/Day1MirrorViewer.tsx
// Viewer for Day 1 mirrors in Mirror tab

import React, { useState, useEffect } from 'react';
import { Modal, View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Keyboard, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMirrorById } from '../../lib/supabase/mirrors';
import { saveFocusAreas } from '../../lib/supabase/day1';

interface Day1MirrorViewerProps {
  visible: boolean;
  onClose: () => void;
  mirrorId: string;
  userId: string;
  userName: string;
  spiritualPlace: string;
  isOwner: boolean; // Whether current user owns this mirror
}

// Spiritual place images (optimized JPGs)
const SPIRITUAL_PLACE_IMAGES: { [key: string]: any } = {
  'Adventuring': require('../../assets/images/spiritual-places/adventuring.jpg'),
  'Battling': require('../../assets/images/spiritual-places/battling.jpg'),
  'Hiding': require('../../assets/images/spiritual-places/hiding.jpg'),
  'Resting': require('../../assets/images/spiritual-places/resting.jpg'),
  'Working': require('../../assets/images/spiritual-places/working.jpg'),
  'Wandering': require('../../assets/images/spiritual-places/wandering.jpg'),
  'Grieving': require('../../assets/images/spiritual-places/grieving.jpg'),
  'Celebrating': require('../../assets/images/spiritual-places/celebrating.jpg'),
};

export const Day1MirrorViewer: React.FC<Day1MirrorViewerProps> = ({
  visible,
  onClose,
  mirrorId,
  userId,
  userName,
  spiritualPlace,
  isOwner,
}) => {
  const [loading, setLoading] = useState(true);
  const [mirrorContent, setMirrorContent] = useState<any>(null);
  const [mirrorMetadata, setMirrorMetadata] = useState<any>(null);
  const [focusAreasText, setFocusAreasText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      loadMirror();
    }
  }, [visible, mirrorId]);

  const loadMirror = async () => {
    setLoading(true);
    const result = await getMirrorById(mirrorId);

    if (result.success && result.content) {
      setMirrorContent(result.content);
      setMirrorMetadata(result.mirror);
      // Load existing focus areas if present
      if (result.mirror?.focus_areas) {
        setFocusAreasText(result.mirror.focus_areas);
      }
    } else {
      Alert.alert('Error', 'Failed to load your mirror. Please try again.');
    }

    setLoading(false);
  };

  const handleInputFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSaveFocus = async () => {
    Keyboard.dismiss();

    if (!focusAreasText.trim()) {
      Alert.alert('Input Required', 'Please share where you want to focus before saving.');
      return;
    }

    setSubmitting(true);

    const saveResult = await saveFocusAreas(userId, mirrorId, focusAreasText);

    if (!saveResult.success) {
      Alert.alert('Save Error', saveResult.error || 'Failed to save your focus areas.');
      setSubmitting(false);
      return;
    }

    // Reload mirror to update metadata (focus_areas now saved)
    await loadMirror();

    Alert.alert('Saved', 'Your focus has been saved.');
    setSubmitting(false);
  };

  // Determine if focus areas should be editable
  // Editable if: owner AND no focus_areas saved yet
  const isFocusEditable = isOwner && (!mirrorMetadata?.focus_areas || mirrorMetadata.focus_areas.trim() === '');

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header with safe area */}
        <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <View style={styles.leftSection} />
            <View style={styles.centerSection} />
            <View style={styles.rightSection}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading your mirror...</Text>
          </View>
        ) : !mirrorContent ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load mirror</Text>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.contentContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={100}
          >
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Image at top */}
              <Image
                source={SPIRITUAL_PLACE_IMAGES[spiritualPlace] || SPIRITUAL_PLACE_IMAGES['Resting']}
                style={styles.image}
                resizeMode="cover"
              />

              {/* Welcome Message */}
              <View style={styles.welcomeSection}>
                <Text style={styles.greetingText}>{userName},</Text>

                <Text style={styles.welcomeTitle}>Welcome to Oxbow.</Text>

                <Text style={styles.letterBody}>
                  Your first Mirror is below.
                </Text>

                <Text style={styles.letterBody}>
                  Each Mirror you make will help you pull out themes and insights into your life with God.
                </Text>
              </View>

              {/* Biblical Mirror Content */}
              <View style={styles.mirrorSection}>
                {/* Parallel Story */}
                {mirrorContent.screen2_biblical?.parallel_story && (
                  <View style={styles.card}>
                    <Text style={styles.cardLabel}>Biblical Parallel</Text>
                    <Text style={styles.characterName}>{mirrorContent.screen2_biblical.parallel_story.character}</Text>
                    <Text style={styles.storyText}>{mirrorContent.screen2_biblical.parallel_story.story}</Text>
                    <Text style={styles.connectionText}>{mirrorContent.screen2_biblical.parallel_story.connection}</Text>
                  </View>
                )}

                {/* Encouraging Verse */}
                {mirrorContent.screen2_biblical?.encouraging_verse && (
                  <View style={styles.card}>
                    <Text style={styles.cardLabel}>Encouragement</Text>
                    <Text style={styles.verseReference}>{mirrorContent.screen2_biblical.encouraging_verse.reference}</Text>
                    <Text style={styles.verseText}>"{mirrorContent.screen2_biblical.encouraging_verse.text}"</Text>
                    <Text style={styles.applicationText}>{mirrorContent.screen2_biblical.encouraging_verse.application}</Text>
                  </View>
                )}

                {/* Challenging Verse */}
                {mirrorContent.screen2_biblical?.challenging_verse && (
                  <View style={styles.card}>
                    <Text style={styles.cardLabel}>Reflection</Text>
                    <Text style={styles.verseReference}>{mirrorContent.screen2_biblical.challenging_verse.reference}</Text>
                    <Text style={styles.verseText}>"{mirrorContent.screen2_biblical.challenging_verse.text}"</Text>
                    <Text style={styles.invitationText}>{mirrorContent.screen2_biblical.challenging_verse.invitation}</Text>
                  </View>
                )}
              </View>

              {/* Focus Areas Section */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Where is God inviting you to focus?</Text>

                {isFocusEditable ? (
                  <>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Share your thoughts..."
                      placeholderTextColor="#94a3b8"
                      multiline
                      numberOfLines={4}
                      value={focusAreasText}
                      onChangeText={setFocusAreasText}
                      onFocus={handleInputFocus}
                      textAlignVertical="top"
                    />

                    <TouchableOpacity
                      style={[styles.submitButton, (!focusAreasText.trim() || submitting) && styles.submitButtonDisabled]}
                      onPress={handleSaveFocus}
                      disabled={!focusAreasText.trim() || submitting}
                    >
                      <Text style={styles.submitButtonText}>
                        {submitting ? 'Saving...' : 'Save Focus'}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.readOnlyFocusContainer}>
                    <Text style={styles.readOnlyFocusText}>
                      {focusAreasText || 'No focus areas saved yet.'}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftSection: {
    width: 70,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
  },
  rightSection: {
    width: 70,
    alignItems: 'flex-end',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#64748b',
  },
  contentContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
  },
  image: {
    width: '100%',
    height: 300,
  },
  welcomeSection: {
    padding: 24,
    backgroundColor: '#ffffff',
  },
  greetingText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'left',
    marginBottom: 12,
  },
  letterBody: {
    fontSize: 17,
    color: '#475569',
    lineHeight: 28,
    textAlign: 'left',
    marginBottom: 18,
  },
  mirrorSection: {
    padding: 24,
    paddingTop: 0,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  characterName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  storyText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 8,
  },
  connectionText: {
    fontSize: 15,
    color: '#059669',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  verseReference: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 8,
  },
  verseText: {
    fontSize: 15,
    color: '#1e293b',
    lineHeight: 22,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  applicationText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  invitationText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  inputSection: {
    padding: 24,
    paddingTop: 16,
    backgroundColor: '#ffffff',
  },
  inputLabel: {
    fontSize: 19,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 16,
    lineHeight: 28,
    fontStyle: 'italic',
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    minHeight: 120,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  submitButton: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  readOnlyFocusContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  readOnlyFocusText: {
    fontSize: 16,
    color: '#1e293b',
    lineHeight: 22,
  },
});
