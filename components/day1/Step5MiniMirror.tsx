// components/day1/Step5MiniMirror.tsx
// Step 5: Display mini-mirror + collect focus areas

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, ImageBackground, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMirrorById } from '../../lib/supabase/mirrors';
import { saveFocusAreas, updateFocusTheme } from '../../lib/supabase/day1';
import { supabase } from '../../lib/supabase/client';
import { colors, typography, spacing, borderRadius, fontFamily } from '../../theme/designTokens';

interface Step5MiniMirrorProps {
  userId: string;
  userName: string;
  mirrorId: string;
  spiritualPlace: string;
  onClose: () => void;
  onComplete: () => void;
  onFocusAreasSaved?: () => void;
  onShare?: () => void;
}

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

const sanitizeText = (text: string) => {
  if (!text) return text;
  return text
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/…/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
};

export const Step5MiniMirror: React.FC<Step5MiniMirrorProps> = ({
  userId,
  userName,
  mirrorId,
  spiritualPlace,
  onClose,
  onComplete,
  onFocusAreasSaved,
  onShare,
}) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [mirrorContent, setMirrorContent] = useState<any>(null);
  const [mirrorCreatedAt, setMirrorCreatedAt] = useState<string | null>(null);
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
      setMirrorCreatedAt(result.mirror?.created_at || null);
    } else {
      Alert.alert('Error', 'Failed to load your mirror. Please try again.');
    }
    setLoading(false);
  };

  const getTitle = () => {
    const screen2Data = mirrorContent?.screen_2_biblical || mirrorContent?.screen2_biblical;
    return screen2Data?.parallel_story?.character || '';
  };

  const formatDate = () => {
    if (!mirrorCreatedAt) return '';
    const date = new Date(mirrorCreatedAt);
    const month = date.toLocaleString('en-US', { month: 'long' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day} ${year}`;
  };

  const handleInputFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();

    if (!focusAreasText.trim()) {
      Alert.alert('Input Required', 'Please share where you want to focus before continuing.');
      return;
    }

    setSubmitting(true);

    const saveResult = await saveFocusAreas(userId, mirrorId, focusAreasText);

    if (!saveResult.success) {
      Alert.alert('Save Error', saveResult.error || 'Failed to save your focus areas.');
      setSubmitting(false);
      return;
    }

    onFocusAreasSaved?.();

    console.log('🔄 Extracting focus theme...');
    try {
      const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const edgeFunctionUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/extract-focus-theme`;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({ focusText: focusAreasText }),
      });

      const data = await response.json();
      const focusTheme = data.success ? data.theme : 'Growth';
      console.log('✅ Focus theme:', focusTheme);
      await updateFocusTheme(userId, focusTheme);
    } catch (error) {
      console.error('❌ Theme extraction error (non-blocking):', error);
      await updateFocusTheme(userId, 'Growth');
    }

    console.log('🎉 Focus saved, closing Day 1');
    onComplete();
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

  const biblical = mirrorContent.screen_2_biblical || mirrorContent.screen2_biblical;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View style={styles.heroSection}>
          <ImageBackground
            source={SPIRITUAL_PLACE_IMAGES[spiritualPlace] || SPIRITUAL_PLACE_IMAGES['Resting']}
            style={styles.heroImage}
            resizeMode="cover"
          >
            <View style={styles.heroOverlay} />

            {/* Controls — share + close grouped on the right */}
            <View style={[styles.topNav, { top: insets.top + 14 }]}>
              <View style={styles.topNavRight}>
                {onShare && (
                  <TouchableOpacity style={styles.navButton} onPress={onShare}>
                    <MaterialIcons name="ios-share" size={26} color={colors.text.white} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.navButton} onPress={onClose}>
                  <Image
                    source={require('../../assets/images/icons/Close.png')}
                    style={styles.closeIcon}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Title and Date */}
            <View style={[styles.titleOverlay, { top: insets.top + 112 }]}>
              <Text style={styles.titleText}>{sanitizeText(getTitle())}</Text>
              <Text style={styles.dateText}>{formatDate()}</Text>
            </View>
          </ImageBackground>
        </View>

        {/* Welcome Section */}
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

        {/* Mirror Section */}
        <View style={styles.mirrorSection}>
          <View style={styles.sectionTagContainer}>
            <Text style={styles.sectionTag}>Mirror</Text>
          </View>

          {/* Biblical Parallel */}
          {biblical?.parallel_story && (
            <View style={styles.subsection}>
              <Text style={styles.mirrorTitle}>
                {sanitizeText(biblical.parallel_story.character)}
              </Text>
              <Text style={styles.mirrorDescription}>
                {sanitizeText(biblical.parallel_story.story)}
                {'\n\n'}
                {sanitizeText(biblical.parallel_story.connection)}
              </Text>
            </View>
          )}

          {/* Encouraging Word */}
          {biblical?.encouraging_verse && (
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Encouraging Word</Text>
              <Text style={styles.verseReference}>
                {biblical.encouraging_verse.reference}
              </Text>
              <View style={styles.verseContainer}>
                <View style={styles.verseBar} />
                <Text style={styles.verseText}>
                  {sanitizeText(biblical.encouraging_verse.text)}
                </Text>
              </View>
              <Text style={styles.applicationText}>
                {sanitizeText(biblical.encouraging_verse.application)}
              </Text>
            </View>
          )}

          {/* Invitation to Growth */}
          {(biblical?.invitation_to_growth || biblical?.challenging_verse) && (
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Invitation to Growth</Text>
              <Text style={styles.verseReference}>
                {(biblical.invitation_to_growth || biblical.challenging_verse).reference}
              </Text>
              <View style={styles.verseContainer}>
                <View style={styles.verseBar} />
                <Text style={styles.verseText}>
                  {sanitizeText((biblical.invitation_to_growth || biblical.challenging_verse).text)}
                </Text>
              </View>
              <Text style={styles.applicationText}>
                {sanitizeText((biblical.invitation_to_growth || biblical.challenging_verse).invitation)}
              </Text>
            </View>
          )}
        </View>

        {/* Reflection Section */}
        <View style={styles.reflectionSection}>
          <View style={styles.reflectionTagContainer}>
            <Text style={styles.reflectionTag}>Reflection</Text>
          </View>

          <Text style={styles.reflectionQuestion}>
            Where is God inviting you to focus?
          </Text>

          <TextInput
            ref={inputRef}
            style={styles.reflectionInput}
            placeholder="Share your thoughts..."
            placeholderTextColor={colors.text.bodyLight}
            multiline
            numberOfLines={4}
            value={focusAreasText}
            onChangeText={setFocusAreasText}
            onFocus={handleInputFocus}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[
              styles.finishButton,
              (!focusAreasText.trim() || submitting) && styles.finishButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!focusAreasText.trim() || submitting}
          >
            <Text style={styles.finishButtonText}>
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
    backgroundColor: colors.background.white,
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
    ...typography.body.default,
    color: colors.text.bodyLight,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.body.default,
    color: colors.text.bodyLight,
  },
  // Hero
  heroSection: {
    width: '100%',
    height: 426,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  topNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 2,
    paddingHorizontal: spacing.xl,
  },
  topNavRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.m,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    width: 28,
    height: 28,
    tintColor: colors.text.white,
  },
  titleOverlay: {
    position: 'absolute',
    left: spacing.xl,
    zIndex: 2,
  },
  titleText: {
    ...typography.heading.xl,
    fontWeight: '900',
    color: colors.text.white,
    marginBottom: spacing.s,
  },
  dateText: {
    fontFamily: fontFamily.primary,
    fontSize: 15,
    fontWeight: '400',
    color: '#F6F6F6',
  },
  // Welcome
  welcomeSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxxl,
    gap: spacing.l,
  },
  greetingText: {
    ...typography.heading.l,
    color: colors.text.body,
    fontStyle: 'italic',
  },
  welcomeTitle: {
    ...typography.heading.s,
    color: colors.text.body,
  },
  letterBody: {
    fontFamily: fontFamily.primary,
    fontSize: 17,
    fontWeight: '400',
    color: colors.text.bodyLight,
    lineHeight: 24,
  },
  // Mirror content
  mirrorSection: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xxxl,
  },
  sectionTagContainer: {
    backgroundColor: colors.background.tag,
    borderRadius: borderRadius.tag,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTag: {
    ...typography.heading.xs,
    fontWeight: '700',
    color: colors.text.body,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  subsection: {
    gap: spacing.l,
  },
  mirrorTitle: {
    ...typography.heading.xl,
    color: colors.text.body,
  },
  mirrorDescription: {
    fontFamily: fontFamily.primary,
    fontSize: 17,
    fontWeight: '400',
    color: colors.text.body,
    lineHeight: 24,
  },
  subsectionTitle: {
    ...typography.heading.l,
    color: colors.text.body,
  },
  verseReference: {
    ...typography.heading.s,
    color: colors.text.accent,
  },
  verseContainer: {
    flexDirection: 'row',
    gap: spacing.l,
  },
  verseBar: {
    width: 2,
    backgroundColor: colors.text.accent,
    borderRadius: 1,
    alignSelf: 'stretch',
  },
  verseText: {
    flex: 1,
    fontFamily: fontFamily.primary,
    fontSize: 17,
    fontWeight: '500',
    fontStyle: 'italic',
    color: colors.text.body,
    lineHeight: 24,
  },
  applicationText: {
    fontFamily: fontFamily.primary,
    fontSize: 17,
    fontWeight: '400',
    color: colors.text.body,
    lineHeight: 24,
  },
  // Reflection
  reflectionSection: {
    backgroundColor: colors.background.defaultLight,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: 60,
    gap: spacing.l,
  },
  reflectionTagContainer: {
    backgroundColor: colors.background.white,
    borderRadius: borderRadius.tag,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reflectionTag: {
    ...typography.heading.xs,
    fontWeight: '700',
    color: colors.text.bodyLight,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  reflectionQuestion: {
    ...typography.heading.l,
    color: colors.text.body,
  },
  reflectionInput: {
    backgroundColor: colors.background.white,
    borderRadius: borderRadius.card,
    padding: spacing.xl,
    fontFamily: fontFamily.primary,
    fontSize: 17,
    fontWeight: '400',
    color: colors.text.body,
    lineHeight: 24,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border.divider,
  },
  finishButton: {
    backgroundColor: colors.background.accent,
    height: 66,
    borderRadius: borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishButtonDisabled: {
    backgroundColor: colors.background.disabled,
  },
  finishButtonText: {
    ...typography.heading.l,
    color: colors.text.black,
  },
});
