// components/onboarding/LoadingReflectionScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ImageBackground, Animated, Easing } from 'react-native';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useAuth } from '../../contexts/AuthContext';
import { generateOnboardingPreview } from '../../lib/supabase/mirrors';
import { saveJournalEntry } from '../../lib/supabase/journals';

export const LoadingReflectionScreen: React.FC = () => {
  const { journalContent, journalEntryType, setAIPreviewData, setCurrentStep } = useOnboarding();
  const { user } = useAuth();
  const [hasStarted, setHasStarted] = useState(false);
  
  // Animation values for three dots
  const dot1Opacity = useRef(new Animated.Value(0)).current;
  const dot2Opacity = useRef(new Animated.Value(0)).current;
  const dot3Opacity = useRef(new Animated.Value(0)).current;

  // Ellipsis animation
  useEffect(() => {
    const animateDot = (dotOpacity: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dotOpacity, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.delay(300),
          Animated.timing(dotOpacity, {
            toValue: 0,
            duration: 400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.delay(1900 - delay),
        ])
      );
    };

    const dot1Animation = animateDot(dot1Opacity, 0);
    const dot2Animation = animateDot(dot2Opacity, 300);
    const dot3Animation = animateDot(dot3Opacity, 600);

    dot1Animation.start();
    dot2Animation.start();
    dot3Animation.start();

    return () => {
      dot1Animation.stop();
      dot2Animation.stop();
      dot3Animation.stop();
    };
  }, []);

  // AI generation logic
  useEffect(() => {
    if (hasStarted) return;
    setHasStarted(true);

    const generatePreview = async () => {
      try {
        console.log('🎯 Starting onboarding preview generation...');
        
        const aiResult = await generateOnboardingPreview(journalContent);
        
        if (aiResult.success) {
          console.log('✅ AI preview generated successfully');
          setAIPreviewData(aiResult.content);
        } else {
          console.log('⚠️ Using fallback preview');
          setAIPreviewData(aiResult.fallback);
        }

        if (user) {
          console.log('💾 Saving onboarding journal to database...');
          const saveResult = await saveJournalEntry(
            journalContent, 
            user.id, 
            journalEntryType || 'text'
          );
          
          if (saveResult.success) {
            console.log('✅ Journal saved, counts as 1/10 toward Mirror');
          } else {
            console.error('❌ Failed to save journal:', saveResult.error);
          }
        }

        setTimeout(() => {
          console.log('➡️ Advancing to Mirror preview...');
          setCurrentStep('mirror');
        }, 3000); // Increased from 2000ms to 3000ms (3 seconds)

      } catch (error) {
        console.error('❌ Error in preview generation:', error);
        setTimeout(() => {
          setCurrentStep('mirror');
        }, 3000); // Increased from 2000ms to 3000ms
      }
    };

    generatePreview();
  }, [hasStarted, journalContent, journalEntryType, user, setAIPreviewData, setCurrentStep]);

  return (
    <ImageBackground
      source={require('../../assets/reflection.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Header at top */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>The habit of reflection</Text>
            <Text style={styles.subtitle}>
              Every ten journals, Oxbow builds a Mirror—a reflection drawn from your own words and moments.
            </Text>
          </View>

          {/* Animated loading text in center */}
          <View style={styles.animationContainer}>
            <View style={styles.loadingTextContainer}>
              <Text style={styles.loadingText}>Building your first Mirror</Text>
              <View style={styles.ellipsisContainer}>
                <Animated.Text style={[styles.dot, { opacity: dot1Opacity }]}>.</Animated.Text>
                <Animated.Text style={[styles.dot, { opacity: dot2Opacity }]}>.</Animated.Text>
                <Animated.Text style={[styles.dot, { opacity: dot3Opacity }]}>.</Animated.Text>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  headerSection: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  animationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTextContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  loadingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  ellipsisContainer: {
    flexDirection: 'row',
    marginLeft: 2,
  },
  dot: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginHorizontal: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});