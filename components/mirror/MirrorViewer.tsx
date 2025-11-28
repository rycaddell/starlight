// components/mirror/MirrorViewer.tsx
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MirrorScreen1 } from './MirrorScreen1';
import { MirrorScreen2 } from './MirrorScreen2';
import { MirrorScreen3 } from './MirrorScreen3';
import { ReflectionJournal } from './ReflectionJournal';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface MirrorViewerProps {
  mirrorContent: any;
  mirrorId: string;
  onClose: () => void;
  onClosedForFeedback?: () => void;
}

export const MirrorViewer: React.FC<MirrorViewerProps> = ({
  mirrorContent,
  mirrorId,
  onClose,
  onClosedForFeedback
}) => {
  const { user } = useAuth();
  const [currentScreen, setCurrentScreen] = useState(0);
  const totalScreens = 4; // Screens: Themes, Biblical, Observations, Reflection

  const scrollViewRef = useRef<ScrollView>(null);

  // State for reflection data
  const [reflectionFocus, setReflectionFocus] = useState(
    mirrorContent.reflection_focus || ''
  );
  const [reflectionAction, setReflectionAction] = useState(
    mirrorContent.reflection_action || ''
  );

  // Handle form changes from ReflectionJournal
  const handleReflectionFormChange = (focus: string, action: string) => {
    setReflectionFocus(focus);
    setReflectionAction(action);
  };

  // Reset scroll position when screen changes
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentScreen]);

  console.log('🪞 MirrorViewer loaded with props:', {
    hasOnClose: !!onClose,
    hasOnClosedForFeedback: !!onClosedForFeedback
  });

  const handleNext = () => {
    if (currentScreen < totalScreens - 1) {
      setCurrentScreen(currentScreen + 1);
    }
  };

  const handleBack = () => {
    if (currentScreen > 0) {
      setCurrentScreen(currentScreen - 1);
    }
  };

  // Handler for when user completes reflection journal
  const handleReflectionComplete = async (focus: string, action: string) => {
    console.log('💾 Saving reflection to Mirror ID:', mirrorId);
    
    // 1. Update local state
    setReflectionFocus(focus);
    setReflectionAction(action);
    
    // 2. Save to database
    const { error } = await supabase
      .from('mirrors')
      .update({
        reflection_focus: focus,
        reflection_action: action,
        reflection_completed_at: new Date().toISOString()
      })
      .eq('id', mirrorId);

    if (error) {
      console.error('❌ Error saving reflection:', error);
      // TODO: Show error toast to user
    } else {
      console.log('✅ Reflection saved successfully');
      onClose(); // Close the mirror - reflection is the final step
    }
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 0:
        return <MirrorScreen1 data={mirrorContent.screen_1_themes || mirrorContent.screen1_themes} />;
      case 1:
        return <MirrorScreen2 data={mirrorContent.screen_2_biblical || mirrorContent.screen2_biblical} />;
      case 2:
        return <MirrorScreen3 data={mirrorContent.screen_3_observations || mirrorContent.screen3_observations} />;
      case 3: // Reflection Journal - FINAL SCREEN
        const hasCompletedReflection = Boolean(mirrorContent.reflection_focus && mirrorContent.reflection_action);
        return (
          <ReflectionJournal
            onComplete={handleReflectionComplete}
            initialFocus={reflectionFocus}
            initialAction={reflectionAction}
            isReadOnly={hasCompletedReflection}
            completedAt={mirrorContent.reflection_completed_at}
            onFormChange={handleReflectionFormChange}
          />
        );
      default:
        return <MirrorScreen1 data={mirrorContent.screen_1_themes || mirrorContent.screen1_themes} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Right Close Button */}
      <View style={styles.topRightButtons}>
        <TouchableOpacity style={styles.closeIconButton} onPress={onClose}>
          <Text style={styles.closeIconText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Dots */}
      <View style={styles.progressContainer}>
        {Array.from({ length: totalScreens }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index === currentScreen ? styles.progressDotActive : styles.progressDotInactive
            ]}
          />
        ))}
      </View>

      {/* Screen Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.screenContainer}
        contentContainerStyle={styles.screenContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderCurrentScreen()}
      </ScrollView>

      {/* Navigation - Fixed at bottom */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[styles.navButton, currentScreen === 0 && styles.navButtonDisabled]}
          onPress={handleBack}
          disabled={currentScreen === 0}
        >
          <Text style={[styles.navButtonText, currentScreen === 0 && styles.navButtonTextDisabled]}>
            ← Back
          </Text>
        </TouchableOpacity>

        {/* On final screen - show appropriate button */}
        {currentScreen === totalScreens - 1 ? (
          // If reflection already completed, show Close button
          mirrorContent.reflection_focus && mirrorContent.reflection_action ? (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          ) : (
            // If reflection not completed, show Skip button
            <TouchableOpacity style={styles.skipButton} onPress={onClose}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          )
        ) : (
          // On other screens, show Next button
          <TouchableOpacity style={styles.navButton} onPress={handleNext}>
            <Text style={styles.navButtonText}>Next →</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  topRightButtons: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  closeIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIconText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '300',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressDotActive: {
    backgroundColor: '#fbbf24',
  },
  progressDotInactive: {
    backgroundColor: '#374151',
  },
  screenContainer: {
    flex: 1,
  },
  screenContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  navButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#6b7280',
  },
  navButtonDisabled: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  navButtonText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '500',
  },
  navButtonTextDisabled: {
    color: '#6b7280',
  },
  closeButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#fbbf24',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  closeButtonText: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#6b7280',
  },
  skipButtonText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '500',
  },
});