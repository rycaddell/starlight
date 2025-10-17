// components/onboarding/LoadingReflectionScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, SafeAreaView, ImageBackground } from 'react-native';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useAuth } from '../../contexts/AuthContext';
import { generateOnboardingPreview } from '../../lib/supabase/mirrors';
import { saveJournalEntry } from '../../lib/supabase/journals';

export const LoadingReflectionScreen: React.FC = () => {
  const { journalContent, journalEntryType, setAIPreviewData, setCurrentStep } = useOnboarding();
  const { user } = useAuth();
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    // Only run once
    if (hasStarted) return;
    setHasStarted(true);

    const generatePreview = async () => {
      try {
        console.log('🎯 Starting onboarding preview generation...');
        
        // Generate AI preview
        const aiResult = await generateOnboardingPreview(journalContent);
        
        if (aiResult.success) {
          console.log('✅ AI preview generated successfully');
          setAIPreviewData(aiResult.content);
        } else {
          console.log('⚠️ Using fallback preview');
          setAIPreviewData(aiResult.fallback);
        }

        // Save journal to database (counts as 1/10)
        if (user) {
          console.log('💾 Saving onboarding journal to database...');
          const saveResult = await saveJournalEntry(
            journalContent, 
            user.id, 
            journalEntryType || 'text' // Use tracked type, default to text
          );
          
          if (saveResult.success) {
            console.log('✅ Journal saved, counts as 1/10 toward Mirror');
          } else {
            console.error('❌ Failed to save journal:', saveResult.error);
          }
        }

        // Small delay for better UX (let them read the message)
        setTimeout(() => {
          console.log('➡️ Advancing to Mirror preview...');
          setCurrentStep('mirror');
        }, 2000);

      } catch (error) {
        console.error('❌ Error in preview generation:', error);
        // Still advance even on error
        setTimeout(() => {
          setCurrentStep('mirror');
        }, 2000);
      }
    };

    generatePreview();
  }, [hasStarted, journalContent, user, setAIPreviewData, setCurrentStep]);

  return (
    <ImageBackground
      source={require('../../assets/reflection.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#059669" style={styles.spinner} />
          <View style={styles.textContainer}>
            <Text style={styles.subtitle}>
              After 10 journals, we'll produce a Mirror reflection for you like this...
            </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  spinner: {
    marginBottom: 32,
  },
  textContainer: {
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    maxWidth: '90%',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 24,
  },
});