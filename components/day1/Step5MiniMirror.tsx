// components/day1/Step5MiniMirror.tsx
// Step 5: Display mini-mirror + collect focus areas

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { getMirrorById } from '../../lib/supabase/mirrors';
import { saveFocusAreas, completeDay1 } from '../../lib/supabase/day1';

interface Step5MiniMirrorProps {
  userId: string;
  userName: string;
  mirrorId: string;
  spiritualPlace: string;
  summaries: any; // one_line_summaries from generation
  onComplete: () => void;
  onFocusAreasSaved?: () => void;
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

export const Step5MiniMirror: React.FC<Step5MiniMirrorProps> = ({
  userId,
  userName,
  mirrorId,
  spiritualPlace,
  summaries,
  onComplete,
  onFocusAreasSaved,
}) => {
  const [loading, setLoading] = useState(true);
  const [mirrorContent, setMirrorContent] = useState<any>(null);
  const [focusAreasText, setFocusAreasText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadMirror();
  }, []);

  const loadMirror = async () => {
    const result = await getMirrorById(mirrorId);

    if (result.success && result.content) {
      setMirrorContent(result.content);
    } else {
      Alert.alert('Error', 'Failed to load your mirror. Please try again.');
    }

    setLoading(false);
  };

  const handleInputFocus = () => {
    // Wait for keyboard to appear, then scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSubmit = async () => {
    // Dismiss keyboard immediately so button press works on first tap
    Keyboard.dismiss();

    if (!focusAreasText.trim()) {
      Alert.alert('Input Required', 'Please share where you want to focus before continuing.');
      return;
    }

    setSubmitting(true);

    // Save focus areas
    const saveResult = await saveFocusAreas(userId, mirrorId, focusAreasText);

    if (!saveResult.success) {
      Alert.alert('Save Error', saveResult.error || 'Failed to save your focus areas.');
      setSubmitting(false);
      return;
    }

    // Notify parent that focus areas have been saved
    onFocusAreasSaved?.();

    // Extract theme using edge function
    console.log('🔄 Extracting focus theme...');
    try {
      const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const edgeFunctionUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/extract-focus-theme`;

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({ focusText: focusAreasText }),
      });

      const data = await response.json();
      const focusTheme = data.success ? data.theme : 'Growth';
      console.log('✅ Focus theme:', focusTheme);

      // Mark Day 1 as complete with theme
      const completeResult = await completeDay1(userId, focusTheme);

      if (!completeResult.success) {
        Alert.alert('Error', completeResult.error || 'Failed to complete Day 1.');
        setSubmitting(false);
        return;
      }

      console.log('🎉 Day 1 completed successfully with theme:', focusTheme);
      onComplete();
    } catch (error) {
      console.error('❌ Theme extraction error:', error);
      // Continue anyway with fallback theme
      const completeResult = await completeDay1(userId, 'Growth');

      if (!completeResult.success) {
        Alert.alert('Error', completeResult.error || 'Failed to complete Day 1.');
        setSubmitting(false);
        return;
      }

      console.log('🎉 Day 1 completed successfully with fallback theme');
      onComplete();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your mirror...</Text>
      </View>
    );
  }

  if (!mirrorContent) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load mirror</Text>
      </View>
    );
  }

  const biblical = mirrorContent.screen2_biblical;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Image at top of scroll view */}
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
        {biblical.parallel_story && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Biblical Parallel</Text>
            <Text style={styles.characterName}>{biblical.parallel_story.character}</Text>
            <Text style={styles.storyText}>{biblical.parallel_story.story}</Text>
            <Text style={styles.connectionText}>{biblical.parallel_story.connection}</Text>
          </View>
        )}

        {/* Encouraging Verse */}
        {biblical.encouraging_verse && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Encouragement</Text>
            <Text style={styles.verseReference}>{biblical.encouraging_verse.reference}</Text>
            <Text style={styles.verseText}>"{biblical.encouraging_verse.text}"</Text>
            <Text style={styles.applicationText}>{biblical.encouraging_verse.application}</Text>
          </View>
        )}

        {/* Challenging Verse */}
        {biblical.challenging_verse && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Reflection</Text>
            <Text style={styles.verseReference}>{biblical.challenging_verse.reference}</Text>
            <Text style={styles.verseText}>"{biblical.challenging_verse.text}"</Text>
            <Text style={styles.invitationText}>{biblical.challenging_verse.invitation}</Text>
          </View>
        )}
      </View>

      {/* Focus Areas Input */}
      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Where is God inviting you to focus?</Text>

        <TextInput
          ref={inputRef}
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
          onPress={handleSubmit}
          disabled={!focusAreasText.trim() || submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Finishing...' : 'Finish'}
          </Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
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
});
