// components/mirror/MirrorViewer.tsx
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ImageBackground, TextInput, KeyboardAvoidingView, Platform, Alert, Keyboard } from 'react-native';
import { ShareMirrorSheet } from './ShareMirrorSheet';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography, spacing, borderRadius } from '@/theme/designTokens';
import { saveReflectionFocus } from '@/lib/supabase/mirrors';

interface MirrorViewerProps {
  mirrorContent: any;
  mirrorId: string;
  onClose: () => void;
  onClosedForFeedback?: () => void;
  isSharedMirror?: boolean;
}

type TabName = 'Mirror' | 'Themes' | 'Observations' | 'Reflection';

export const MirrorViewer: React.FC<MirrorViewerProps> = ({
  mirrorContent,
  mirrorId,
  onClose,
  onClosedForFeedback,
  isSharedMirror = false,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('Mirror');
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showReflectionInput, setShowReflectionInput] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const [savingReflection, setSavingReflection] = useState(false);
  const [existingReflection, setExistingReflection] = useState<string | null>(null);

  // Load existing reflection if present
  React.useEffect(() => {
    if (mirrorContent?.reflection_focus) {
      setExistingReflection(mirrorContent.reflection_focus);
    }
  }, [mirrorContent]);


  // Sanitize AI-generated text to fix iOS rendering issues with special Unicode characters
  const sanitizeText = (text: string) => {
    if (!text) return text;
    return text
      .replace(/['']/g, "'")      // Curly single quotes
      .replace(/[""]/g, '"')      // Curly double quotes
      .replace(/—/g, '-')         // Em dash
      .replace(/–/g, '-')         // En dash
      .replace(/…/g, '...')       // Ellipsis
      .replace(/\u00A0/g, ' ')    // Non-breaking space
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');  // Remove control chars but keep \t (09), \n (0A), \r (0D)
  };

  const handleSaveReflection = async () => {
    Keyboard.dismiss();

    if (!reflectionText.trim()) {
      return;
    }

    setSavingReflection(true);

    const result = await saveReflectionFocus(mirrorId, reflectionText.trim());

    if (result.success) {
      setExistingReflection(reflectionText.trim());
      setSavingReflection(false);
      setShowReflectionInput(false);
      Alert.alert('Saved', 'Your reflection has been saved.');
    } else {
      setSavingReflection(false);
      Alert.alert('Error', result.error || 'Failed to save your reflection. Please try again.');
    }
  };

  const handleInputFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  const scrollViewRef = useRef<ScrollView>(null);
  const mirrorSectionRef = useRef<View>(null);
  const themesSectionRef = useRef<View>(null);
  const observationsSectionRef = useRef<View>(null);
  const reflectionSectionRef = useRef<View>(null);

  // Track section positions for scroll-based tab updates
  const [sectionPositions, setSectionPositions] = useState<{
    Mirror: number;
    Themes: number;
    Observations: number;
    Reflection: number;
  }>({
    Mirror: 0,
    Themes: 0,
    Observations: 0,
    Reflection: 0,
  });

  // Format date from mirrorContent
  const formatDate = () => {
    const createdAt = mirrorContent.created_at;
    if (!createdAt) return '';

    const date = new Date(createdAt);
    const month = date.toLocaleString('en-US', { month: 'long' });
    const day = date.getDate();
    const year = date.getFullYear();

    return `${month} ${day} ${year}`;
  };

  // Extract title from biblical parallel character name
  const getTitle = () => {
    const screen2Data = mirrorContent.screen_2_biblical || mirrorContent.screen2_biblical;
    return screen2Data?.parallel_story?.character || 'Mirror';
  };

  // Handle tab press - scroll to section
  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);

    let targetRef;
    switch (tab) {
      case 'Mirror':
        targetRef = mirrorSectionRef;
        break;
      case 'Themes':
        targetRef = themesSectionRef;
        break;
      case 'Observations':
        targetRef = observationsSectionRef;
        break;
      case 'Reflection':
        targetRef = reflectionSectionRef;
        break;
    }

    if (targetRef.current) {
      targetRef.current.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          // Offset by 30pt to keep section tags below safe area
          scrollViewRef.current?.scrollTo({ y: y - 30, animated: true });
        },
        () => {}
      );
    }
  };

  // Handle scroll event to update active tab based on scroll position
  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;

    // Determine which section is currently in view
    // We use a threshold of 100px from the top to determine the active section
    const threshold = 100;

    if (scrollY >= sectionPositions.Reflection - threshold && !isSharedMirror) {
      if (activeTab !== 'Reflection') setActiveTab('Reflection');
    } else if (scrollY >= sectionPositions.Observations - threshold) {
      if (activeTab !== 'Observations') setActiveTab('Observations');
    } else if (scrollY >= sectionPositions.Themes - threshold) {
      if (activeTab !== 'Themes') setActiveTab('Themes');
    } else {
      if (activeTab !== 'Mirror') setActiveTab('Mirror');
    }
  };

  // Capture section positions on layout
  const handleSectionLayout = (section: TabName) => (event: any) => {
    const { y } = event.nativeEvent.layout;
    setSectionPositions(prev => ({ ...prev, [section]: y }));
  };

  const screen1Data = mirrorContent.screen_1_themes || mirrorContent.screen1_themes;
  const screen2Data = mirrorContent.screen_2_biblical || mirrorContent.screen2_biblical;
  const screen3Data = mirrorContent.screen_3_observations || mirrorContent.screen3_observations;
  const limitedThemes = screen1Data?.themes ? screen1Data.themes.slice(0, 4) : [];

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
      {/* Hero Image Section with Overlays */}
      <View style={styles.heroSection}>
        <ImageBackground
          source={require('@/assets/images/spiritual-places/default.jpg')}
          style={styles.heroImage}
          resizeMode="cover"
        >
          {/* Dark overlay for better text readability */}
          <View style={styles.heroOverlay} />

          {/* Top Navigation Buttons */}
          <View style={styles.topNav}>
            <TouchableOpacity style={styles.backButton} onPress={onClose}>
              <Image
                source={require('@/assets/images/icons/Back.png')}
                style={styles.backIcon}
              />
            </TouchableOpacity>
            {!isSharedMirror && (
              <TouchableOpacity style={styles.shareButton} onPress={() => setShowShareSheet(true)}>
                <Image
                  source={require('@/assets/images/icons/Share.png')}
                  style={styles.shareIcon}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Title and Date Overlay */}
          <View style={styles.titleOverlay}>
            <Text style={styles.titleOverlayText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>{getTitle()}</Text>
            <Text style={styles.subtitleOverlayText}>{formatDate()}</Text>
          </View>

          {/* Tab Bar at Bottom of Image */}
          <View style={styles.tabBarOverlay}>
            {(['Mirror', 'Themes', 'Observations', 'Reflection'] as TabName[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={styles.tabButton}
                onPress={() => handleTabPress(tab)}
              >
                <Text style={[
                  styles.tabLabel,
                  activeTab === tab && styles.tabLabelActive
                ]}>
                  {tab}
                </Text>
                {activeTab === tab && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            ))}
          </View>
        </ImageBackground>
      </View>

      {/* All Sections */}
        {/* MIRROR SECTION */}
        <View
          ref={mirrorSectionRef}
          style={[styles.section, styles.mirrorSection]}
          onLayout={handleSectionLayout('Mirror')}
        >
          <View style={styles.sectionTagContainer}>
            <Text style={styles.sectionTag}>Mirror</Text>
          </View>

          {/* Biblical Mirror Story */}
          {screen2Data?.parallel_story && (
            <View style={styles.subsection}>
              <Text style={styles.mirrorTitle}>{sanitizeText(screen2Data.parallel_story.character)}</Text>
              <Text style={styles.mirrorDescription}>
                {sanitizeText(screen2Data.parallel_story.story)}
                {'\n\n'}
                {sanitizeText(screen2Data.parallel_story.connection)}
              </Text>
            </View>
          )}

          {/* Encouraging Word */}
          {screen2Data?.encouraging_verse && (
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Encouraging Word</Text>
              <Text style={styles.verseReference}>
                {screen2Data.encouraging_verse.reference}
              </Text>
              <View style={styles.verseContainer}>
                <View style={styles.verseBar} />
                <Text style={styles.verseText}>
                  {sanitizeText(screen2Data.encouraging_verse.text)}
                </Text>
              </View>
              <Text style={styles.applicationText}>
                {sanitizeText(screen2Data.encouraging_verse.application || screen2Data.encouraging_verse.why_it_fits)}
              </Text>
            </View>
          )}

          {/* Invitation to Growth */}
          {(screen2Data?.invitation_to_growth || screen2Data?.challenging_verse) && (
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Invitation to Growth</Text>
              <Text style={styles.verseReference}>
                {(screen2Data.invitation_to_growth || screen2Data.challenging_verse).reference}
              </Text>
              <View style={styles.verseContainer}>
                <View style={styles.verseBar} />
                <Text style={styles.verseText}>
                  {sanitizeText((screen2Data.invitation_to_growth || screen2Data.challenging_verse).text)}
                </Text>
              </View>
              <Text style={styles.applicationText}>
                {sanitizeText((screen2Data.invitation_to_growth || screen2Data.challenging_verse).invitation)}
              </Text>
            </View>
          )}
        </View>

        {/* THEMES SECTION */}
        <View
          ref={themesSectionRef}
          style={[styles.section, styles.themesSection]}
          onLayout={handleSectionLayout('Themes')}
        >
          <View style={[styles.sectionTagContainer, styles.themesTagContainer]}>
            <Text style={[styles.sectionTag, styles.themesTag]}>Themes</Text>
          </View>

          <View style={styles.themesContainer}>
            {limitedThemes.map((theme: any, index: number) => (
              <View key={index} style={styles.themeCard}>
                <Text style={styles.themeName}>{sanitizeText(theme.name)}</Text>
                <Text style={styles.themeDescription}>{sanitizeText(theme.description)}</Text>
                {theme.frequency && (() => {
                  const frequencyText = theme.frequency;
                  // Strip out any variation of "Present in journals" from the AI response
                  const cleanedText = frequencyText
                    .replace(/^Present in journals:?\s*/i, '')
                    .replace(/^from\s+/i, '');

                  return (
                    <Text style={styles.themeFrequency}>
                      <Text style={styles.themeFrequencyLabel}>Present in Journals </Text>
                      {sanitizeText(cleanedText)}
                    </Text>
                  );
                })()}
              </View>
            ))}
          </View>

          {screen1Data?.insight && screen1Data.insight.trim().length > 0 && (
            <View style={styles.insightContainer}>
              <Text style={styles.insightText}>{sanitizeText(screen1Data.insight)}</Text>
            </View>
          )}
        </View>

        {/* OBSERVATIONS SECTION */}
        <View
          ref={observationsSectionRef}
          style={styles.section}
          onLayout={handleSectionLayout('Observations')}
        >
          <View style={styles.sectionTagContainer}>
            <Text style={styles.sectionTag}>Observations</Text>
          </View>

          <View style={styles.observationsContainer}>
            {screen3Data?.self_perception && (
              <View style={styles.observationCard}>
                <Text style={styles.observationTitle}>How You See Yourself</Text>
                <Text style={styles.observationText}>
                  {sanitizeText(screen3Data.self_perception.observation)}
                </Text>
              </View>
            )}

            {screen3Data?.god_perception && (
              <View style={styles.observationCard}>
                <Text style={styles.observationTitle}>Your Relationship with God</Text>
                <Text style={styles.observationText}>
                  {sanitizeText(screen3Data.god_perception.observation)}
                </Text>
              </View>
            )}

            {screen3Data?.others_perception && (
              <View style={styles.observationCard}>
                <Text style={styles.observationTitle}>How You View Others</Text>
                <Text style={styles.observationText}>
                  {sanitizeText(screen3Data.others_perception.observation)}
                </Text>
              </View>
            )}

            {screen3Data?.blind_spots && (
              <View style={styles.observationCard}>
                <Text style={styles.observationTitle}>Patterns You May Not Notice</Text>
                <Text style={styles.observationText}>
                  {sanitizeText(screen3Data.blind_spots.observation)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* REFLECTION SECTION */}
        {!isSharedMirror && (
          <View
            ref={reflectionSectionRef}
            style={[styles.section, styles.reflectionSection]}
            onLayout={handleSectionLayout('Reflection')}
          >
            <View style={[styles.sectionTagContainer, styles.reflectionTagContainer]}>
              <Text style={[styles.sectionTag, styles.reflectionTag]}>Reflection</Text>
            </View>

            <View style={styles.reflectionContent}>
              {existingReflection ? (
                // Show saved reflection
                <>
                  <Text style={styles.reflectionQuestion}>
                    Where is God inviting you to focus?
                  </Text>
                  <View style={styles.savedReflectionContainer}>
                    <Text style={styles.savedReflectionText}>{existingReflection}</Text>
                  </View>
                </>
              ) : !showReflectionInput ? (
                // Show prompt to add reflection
                <>
                  <Image
                    source={require('@/assets/images/icons/Reflection.png')}
                    style={styles.reflectionIcon}
                  />
                  <Text style={styles.reflectionDescription}>
                    Take a moment to reflect on what God is showing you through this Mirror.
                  </Text>
                  <TouchableOpacity
                    style={styles.reflectionButton}
                    onPress={() => setShowReflectionInput(true)}
                  >
                    <Text style={styles.reflectionButtonText}>Add Reflection</Text>
                  </TouchableOpacity>
                </>
              ) : (
                // Show input form
                <>
                  <Text style={styles.reflectionQuestion}>
                    Where is God inviting you to focus?
                  </Text>
                  <TextInput
                    style={styles.reflectionInput}
                    value={reflectionText}
                    onChangeText={setReflectionText}
                    multiline
                    textAlignVertical="top"
                    autoFocus
                    onFocus={handleInputFocus}
                  />
                  <TouchableOpacity
                    style={[
                      styles.reflectionButton,
                      (!reflectionText.trim() || savingReflection) && styles.reflectionButtonDisabled
                    ]}
                    onPress={handleSaveReflection}
                    disabled={!reflectionText.trim() || savingReflection}
                  >
                    <Text style={styles.reflectionButtonText}>
                      {savingReflection ? 'Saving...' : 'Save Reflection'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}
    </ScrollView>
      </KeyboardAvoidingView>

      {/* Share Mirror Sheet */}
      <ShareMirrorSheet
        visible={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        userId={user?.id || ''}
        mirrorId={mirrorId}
        onShareSuccess={() => {
          setShowShareSheet(false);
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.white,
  },
  heroSection: {
    width: 488,
    height: 476,
    overflow: 'hidden',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  topNav: {
    position: 'absolute',
    top: 114,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  backButton: {
    position: 'absolute',
    left: 4,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 40,
    height: 40,
    tintColor: colors.text.white,
  },
  shareButton: {
    position: 'absolute',
    left: 346,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIcon: {
    width: 17,
    height: 21,
    tintColor: colors.text.white,
  },
  titleOverlay: {
    position: 'absolute',
    top: 172,
    left: spacing.xl,
    right: spacing.xl,
    zIndex: 2,
  },
  titleOverlayText: {
    ...typography.heading.xl,
    fontWeight: '900',
    color: colors.text.white,
    marginBottom: spacing.s,
  },
  subtitleOverlayText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#F6F6F6',
  },
  tabBarOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    zIndex: 2,
  },
  tabButton: {
    marginRight: spacing.xxxl,
    paddingBottom: spacing.m,
  },
  tabLabel: {
    fontSize: 19,
    fontWeight: '500',
    color: '#F2F4F7',
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: colors.text.white,
    borderRadius: borderRadius.tabHighlight,
  },
  scrollContent: {
    paddingBottom: 0,  // Remove padding so grey background extends to bottom
    flexGrow: 1,  // Allow content to grow properly
  },
  section: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    gap: spacing.xxxl,
  },
  mirrorSection: {
    paddingBottom: spacing.xxxl,
  },
  themesSection: {
    backgroundColor: colors.background.defaultLight,
    paddingBottom: spacing.xxxl,
  },
  reflectionSection: {
    backgroundColor: '#ECEFF3',
    marginTop: 40,
    paddingTop: 40,
    paddingBottom: 60,  // Half of previous - end page here
    gap: spacing.xl, // Override section gap - less space between tag and icon
  },
  sectionTagContainer: {
    backgroundColor: colors.background.tag,
    borderRadius: borderRadius.tag,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    alignSelf: 'flex-start',
    justifyContent: 'center',  // Vertically center text
    alignItems: 'center',  // Horizontally center text
  },
  sectionTag: {
    ...typography.heading.xs,
    fontWeight: '700',
    color: colors.text.body,
    textAlignVertical: 'center',  // Android vertical centering
    includeFontPadding: false,  // Android: remove extra padding
  },
  themesTagContainer: {
    backgroundColor: '#FFFFFF',
  },
  themesTag: {
    color: '#505970',
  },
  reflectionTagContainer: {
    backgroundColor: '#FFFFFF',
  },
  reflectionTag: {
    color: '#505970',
  },
  sectionDescription: {
    ...typography.body.default,
    color: colors.text.bodyLight,
    fontStyle: 'italic',
    marginTop: -spacing.xl,
  },
  subsection: {
    gap: spacing.l,
    alignSelf: 'stretch',  // Match observations layout
  },
  mirrorTitle: {
    ...typography.heading.xl,
    color: colors.text.body,
  },
  mirrorDescription: {
    fontFamily: 'Satoshi Variable',
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
    fontSize: 17,
    fontWeight: '500',
    fontStyle: 'italic',
    color: '#273047',
    lineHeight: 24,
  },
  applicationText: {
    fontFamily: 'Satoshi Variable',
    fontSize: 17,
    fontWeight: '400',
    color: colors.text.body,
    lineHeight: 24,
  },
  themesContainer: {
    gap: 32,
    alignItems: 'flex-start',  // Align cards to left edge like observations
  },
  themeCard: {
    alignSelf: 'stretch',  // Fill container width instead of fixed 370px
    gap: spacing.l,
  },
  themeName: {
    ...typography.heading.l,
    lineHeight: 24,
    color: colors.text.body,
  },
  themeDescription: {
    fontFamily: 'Satoshi Variable',
    fontSize: 17,
    fontWeight: '400',
    color: colors.text.body,
    lineHeight: 24,
  },
  themeFrequency: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.text.bodyLight,
  },
  themeFrequencyLabel: {
    fontWeight: '700',
  },
  insightContainer: {
    backgroundColor: colors.background.tag,
    padding: spacing.xl,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.text.accent,
  },
  insightText: {
    ...typography.body.default,
    color: colors.text.accent,
    textAlign: 'center',
    lineHeight: 24,
  },
  observationsContainer: {
    gap: 24,
    alignItems: 'flex-start',  // Align cards to left edge
  },
  observationCard: {
    alignSelf: 'stretch',  // Fill container width
    gap: spacing.m,
  },
  observationTitle: {
    ...typography.heading.l,
    lineHeight: 24,
    color: colors.text.body,
  },
  observationText: {
    fontFamily: 'Satoshi Variable',
    fontSize: 17,
    fontWeight: '400',
    color: colors.text.body,
    lineHeight: 24,
  },
  reflectionContent: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: spacing.xl,
  },
  reflectionIcon: {
    width: 120,
    height: 120,
    tintColor: colors.text.bodyLight,
  },
  reflectionDescription: {
    ...typography.special.promptBody,
    color: colors.text.body,
    textAlign: 'center',
    width: 227,
    lineHeight: 24,
    marginTop: spacing.ml,  // ~1/3 less space between icon and description (10pt)
    marginBottom: 40,  // More space between description and button
  },
  reflectionQuestion: {
    ...typography.heading.l,
    color: colors.text.body,
    textAlign: 'left',
    width: 370,
    marginBottom: spacing.l,  // Match section heading spacing (12pt)
  },
  reflectionInput: {
    width: 370,
    minHeight: 120,
    backgroundColor: colors.background.white,
    borderRadius: borderRadius.card,
    padding: spacing.xl,
    ...typography.body.default,
    color: colors.text.body,
    lineHeight: 24,
    marginBottom: spacing.xxxl,
    borderWidth: 1,
    borderColor: colors.border.divider,
  },
  reflectionButton: {
    width: 370,
    height: 66,
    backgroundColor: colors.background.accent,
    borderRadius: borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reflectionButtonDisabled: {
    backgroundColor: colors.background.disabled,
    opacity: 0.6,
  },
  reflectionButtonText: {
    ...typography.heading.l,
    color: colors.text.black,
  },
  savedReflectionContainer: {
    width: 370,
    backgroundColor: colors.background.white,
    borderRadius: borderRadius.card,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border.divider,
  },
  savedReflectionText: {
    ...typography.body.default,
    color: colors.text.body,
    lineHeight: 24,
  },
});
