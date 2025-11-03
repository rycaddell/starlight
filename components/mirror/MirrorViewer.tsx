// components/mirror/MirrorViewer.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MirrorScreen1 } from './MirrorScreen1';
import { MirrorScreen2 } from './MirrorScreen2';
import { MirrorScreen3 } from './MirrorScreen3';
import PausePray from './PausePray';
import { ReflectionJournal } from './ReflectionJournal';
import { MirrorScreen4 } from './MirrorScreen4';
import { supabase } from '../../lib/supabase/client';

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
  const [currentScreen, setCurrentScreen] = useState(0);
  const totalScreens = 6; // Updated from 5 to 6

  // State for reflection data
  const [reflectionFocus, setReflectionFocus] = useState(
    mirrorContent.reflection_focus || ''
  );
  const [reflectionAction, setReflectionAction] = useState(
    mirrorContent.reflection_action || ''
  );

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
    
    // 1. Update local state (so user sees it if they go back)
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
      // TODO: Show error toast to user (optional - add later)
    } else {
      console.log('✅ Reflection saved successfully');
      handleNext(); // Move to next screen (Next Steps)
    }
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 0:
        return <MirrorScreen1 data={mirrorContent.screen1_themes} />;
      case 1:
        return <MirrorScreen2 data={mirrorContent.screen2_biblical} />;
      case 2:
        return <MirrorScreen3 data={mirrorContent.screen3_observations} />;
      case 3:
        return <PausePray />;
      case 4: // NEW: Reflection Journal
        return (
          <ReflectionJournal
            onComplete={handleReflectionComplete}
            initialFocus={reflectionFocus}
            initialAction={reflectionAction}
          />
        );
      case 5: // Next Steps (moved from case 4)
        console.log('🪞 Rendering MirrorScreen4 with props:', {
          hasOnClose: !!onClose,
          hasOnClosedForFeedback: !!onClosedForFeedback
        });
        return (
          <MirrorScreen4 
            data={mirrorContent.screen4_suggestions} 
            onClose={onClose}
            onClosedForFeedback={onClosedForFeedback}
          />
        );
      default:
        return <MirrorScreen1 data={mirrorContent.screen1_themes} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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

        {currentScreen === 3 ? (
          <TouchableOpacity style={styles.navButton} onPress={handleNext}>
            <Text style={styles.navButtonText}>Ready to Continue →</Text>
          </TouchableOpacity>
        ) : currentScreen === totalScreens - 1 ? (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✨ Complete</Text>
          </TouchableOpacity>
        ) : (
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
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
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
});