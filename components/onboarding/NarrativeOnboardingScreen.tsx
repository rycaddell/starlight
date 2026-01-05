// components/onboarding/NarrativeOnboardingScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Image,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useAuth } from '../../contexts/AuthContext';
import { ONBOARDING_BACKGROUNDS, SAMPLE_JOURNAL_ENTRIES, PRODUCT_SCREENSHOT } from '../../constants/onboardingImages';
import { supabase } from '../../lib/supabase';

interface JournalCardProps {
  date: string;
  text: string;
}

const JournalCard: React.FC<JournalCardProps> = ({ date, text }) => {
  return (
    <Animated.View
      entering={FadeIn.duration(600).delay(1000)}
      style={styles.journalCard}
    >
      <Text style={styles.journalLabel}>Journal Entry - {date}</Text>
      <Text style={styles.journalText}>"{text}"</Text>
    </Animated.View>
  );
};

export const NarrativeOnboardingScreen: React.FC = () => {
  const { currentStep, userName, setUserName, goToNextStep, completeOnboarding, canProceed } =
    useOnboarding();
  const { user } = useAuth();
  const [nameInput, setNameInput] = useState(userName);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<NodeJS.Timeout | null>(null);
  const [stepStartTime, setStepStartTime] = useState<number>(Date.now());

  // Track when step changes
  useEffect(() => {
    const now = Date.now();
    setStepStartTime(now);
    console.log(`⏱️ [${new Date().toISOString().substr(11, 12)}] Step changed to: ${currentStep}`);
  }, [currentStep]);

  // Get background image based on current step
  const getBackgroundImage = () => {
    switch (currentStep) {
      case 'name-input':
        return ONBOARDING_BACKGROUNDS.nameInput;
      case 'welcome':
        return ONBOARDING_BACKGROUNDS.welcome;
      case 'moment-one':
        return ONBOARDING_BACKGROUNDS.momentOne;
      case 'moments-question':
        return ONBOARDING_BACKGROUNDS.momentsQuestion;
      case 'moment-two':
        return ONBOARDING_BACKGROUNDS.momentTwo;
      case 'moment-three':
        return ONBOARDING_BACKGROUNDS.momentThree;
      case 'moment-four':
        return ONBOARDING_BACKGROUNDS.momentFour;
      case 'step-back':
        return ONBOARDING_BACKGROUNDS.stepBack;
      case 'pattern-revealed':
        return ONBOARDING_BACKGROUNDS.patternRevealed;
      case 'call-to-action':
        return ONBOARDING_BACKGROUNDS.callToAction;
      default:
        return ONBOARDING_BACKGROUNDS.nameInput;
    }
  };

  // Handle name submission
  const handleNameSubmit = async () => {
    if (nameInput.trim().length === 0) return;

    const trimmedName = nameInput.trim();
    setUserName(trimmedName);

    // Save to database
    if (!user) {
      console.error('❌ No user found when saving display name');
      // Still proceed even if save fails
      goToNextStep();
      return;
    }

    try {
      console.log('💾 Attempting to save display name for user:', user.id);

      const { data, error } = await supabase
        .from('users')
        .update({ display_name: trimmedName })
        .eq('id', user.id)
        .select();

      if (error) {
        console.error('❌ Error saving display name:', error);
      } else {
        console.log('✅ Display name saved:', data);
        // Update local storage with new display name
        const updatedUser = { ...user, display_name: trimmedName };
        await AsyncStorage.setItem('starlight_current_user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('❌ Exception saving display name:', error);
    }

    goToNextStep();
  };

  // Auto-advance for welcome screen only
  useEffect(() => {
    if (currentStep === 'welcome') {
      const timer = setTimeout(() => {
        goToNextStep();
      }, 2500);
      setAutoAdvanceTimer(timer);

      return () => {
        if (timer) clearTimeout(timer);
      };
    }

    return () => {
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
        setAutoAdvanceTimer(null);
      }
    };
  }, [currentStep]);


  // Handle tap to skip auto-advance or continue
  const handleTap = () => {
    if (currentStep === 'welcome' && autoAdvanceTimer) {
      // Skip timer
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
      goToNextStep();
    } else if (currentStep === 'name-input') {
      // Do nothing, user must submit via button
      return;
    } else if (currentStep === 'call-to-action') {
      // Do nothing, user must tap "Get started" button
      return;
    } else {
      // Regular tap to continue
      goToNextStep();
    }
  };

  // Render content based on current step
  const renderContent = () => {
    switch (currentStep) {
      case 'name-input':
        return (
          <Animated.View entering={FadeIn.duration(400)} style={styles.contentContainer}>
            <Text style={styles.header}>What is your name?</Text>
            <Text style={styles.inputHint}>First name</Text>
            <TextInput
              style={styles.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleNameSubmit}
            />
            <TouchableOpacity
              style={[styles.button, canProceed && styles.buttonActive]}
              onPress={handleNameSubmit}
              disabled={!canProceed}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        );

      case 'welcome':
        return (
          <Animated.View entering={FadeIn.duration(400)} style={styles.contentContainer}>
            <Text style={styles.header}>Hey, {userName}.</Text>
            <Text style={styles.subheader}>Welcome to Oxbow.</Text>
          </Animated.View>
        );

      case 'moment-one':
        return (
          <Animated.View entering={FadeIn.duration(400)} style={styles.contentContainer}>
            <Text style={styles.header}>We experience our lives one moment at a time.</Text>
            <JournalCard
              date={SAMPLE_JOURNAL_ENTRIES.momentOne.date}
              text={SAMPLE_JOURNAL_ENTRIES.momentOne.text}
            />
          </Animated.View>
        );

      case 'moments-question':
        return (
          <Animated.View entering={FadeIn.duration(400)} style={styles.contentContainer}>
            <Text style={styles.header}>
              But how do these moments fit together into a sensible story?
            </Text>
          </Animated.View>
        );

      case 'moment-two':
        return (
          <Animated.View entering={FadeIn.duration(400)} style={styles.contentContainer}>
            <JournalCard
              date={SAMPLE_JOURNAL_ENTRIES.momentTwo.date}
              text={SAMPLE_JOURNAL_ENTRIES.momentTwo.text}
            />
          </Animated.View>
        );

      case 'moment-three':
        return (
          <Animated.View entering={FadeIn.duration(400)} style={styles.contentContainer}>
            <JournalCard
              date={SAMPLE_JOURNAL_ENTRIES.momentThree.date}
              text={SAMPLE_JOURNAL_ENTRIES.momentThree.text}
            />
          </Animated.View>
        );

      case 'moment-four':
        return (
          <Animated.View entering={FadeIn.duration(400)} style={styles.contentContainer}>
            <JournalCard
              date={SAMPLE_JOURNAL_ENTRIES.momentFour.date}
              text={SAMPLE_JOURNAL_ENTRIES.momentFour.text}
            />
          </Animated.View>
        );

      case 'step-back':
        return (
          <Animated.View entering={FadeIn.duration(400)} style={styles.contentContainer}>
            <Text style={styles.header}>If we step back...</Text>
            {/* Journal date waypoints */}
            <Text style={[styles.waypointDate, { left: '47%', top: '99%' }]}>Dec 12</Text>
            <Text style={[styles.waypointDate, { left: '84%', top: '73%' }]}>Dec 18</Text>
            <Text style={[styles.waypointDate, { left: '48%', top: '51%' }]}>Dec 21</Text>
            <Text style={[styles.waypointDate, { left: '25%', top: '35%' }]}>Dec 27</Text>
          </Animated.View>
        );

      case 'pattern-revealed':
        return (
          <Animated.View entering={FadeIn.duration(400)} style={styles.contentContainer}>
            <Text style={styles.header}>We can see God's leading across our moments</Text>
            <Animated.Image
              source={PRODUCT_SCREENSHOT}
              style={styles.productScreenshot}
              entering={FadeIn.duration(600).delay(400)}
              resizeMode="contain"
            />
          </Animated.View>
        );

      case 'call-to-action':
        return (
          <Animated.View entering={FadeIn.duration(400)} style={styles.ctaContainer}>
            <Text style={styles.header}>So where is God leading you?</Text>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={completeOnboarding}
            >
              <Text style={styles.buttonText}>Get started</Text>
            </TouchableOpacity>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  const backgroundImage = getBackgroundImage();
  const getTimestamp = () => new Date().toISOString().substr(11, 12);
  const getElapsed = () => `+${Date.now() - stepStartTime}ms`;

  return (
    <Pressable style={styles.container} onPress={handleTap}>
      <Animated.View
        key={currentStep}
        entering={FadeIn.duration(600)}
        exiting={FadeOut.duration(600)}
        style={StyleSheet.absoluteFill}
      >
        <ImageBackground
          source={backgroundImage}
          style={styles.background}
          resizeMode="cover"
          onLoadStart={() => console.log(`🖼️ [${getTimestamp()}] [${getElapsed()}] Load START: ${currentStep}`)}
          onLoad={() => console.log(`✅ [${getTimestamp()}] [${getElapsed()}] Load SUCCESS: ${currentStep}`)}
          onError={(error) => console.error(`❌ [${getTimestamp()}] [${getElapsed()}] Load ERROR: ${currentStep}:`, error.nativeEvent)}
        >
          <View style={styles.overlay} />
        </ImageBackground>
      </Animated.View>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {renderContent()}
      </KeyboardAvoidingView>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 100,
    paddingBottom: 48,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  ctaContainer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 100,
    paddingBottom: 80,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  header: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'left',
    marginBottom: 16,
    width: '100%',
  },
  subheader: {
    fontSize: 20,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'left',
    width: '100%',
  },
  inputHint: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 24,
    marginBottom: 8,
  },
  nameInput: {
    width: '70%',
    height: 56,
    backgroundColor: 'transparent',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 255, 255, 0.5)',
    paddingHorizontal: 0,
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 40,
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5,
  },
  buttonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    opacity: 1,
  },
  buttonPrimary: {
    backgroundColor: '#059669',
    opacity: 1,
    marginTop: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  journalCard: {
    position: 'absolute',
    bottom: 100,
    left: 32,
    right: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  journalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  journalText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#FFFFFF',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  productScreenshot: {
    width: 280,
    height: 606, // Maintains iPhone aspect ratio (375:812)
    marginTop: 40,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  waypointDate: {
    position: 'absolute',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
