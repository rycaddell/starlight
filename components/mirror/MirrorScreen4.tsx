// components/mirror/MirrorScreen4.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';

interface MirrorScreen4Props {
  data: any;
  onClose?: () => void;
  onClosedForFeedback?: () => void; // New optional prop
}

export const MirrorScreen4: React.FC<MirrorScreen4Props> = ({ 
  data, 
  onClose, 
  onClosedForFeedback 
}) => {

  // Debug logging
  console.log('🔍 MirrorScreen4 props:', {
    hasOnClose: !!onClose,
    hasOnClosedForFeedback: !!onClosedForFeedback
  });

  const handleGetStarted = () => {
    // Show coming soon dialog and track interest
    Alert.alert(
      'Coming Soon!',
      'We\'re working on this feature. Thanks for your interest!',
      [{ text: 'OK' }]
    );
    
    // TODO: Store user interest in this feature
    console.log('📝 User showed interest in Mirror reflection feature');
  };

  const handleFeedback = () => {
    console.log('💬 Closing Mirror to open feedback modal');
    console.log('🔍 Available callbacks:', {
      hasOnClosedForFeedback: !!onClosedForFeedback,
      hasOnClose: !!onClose
    });
    
    // Use the feedback-specific callback if available, otherwise fall back to regular close
    if (onClosedForFeedback) {
      console.log('✅ Using onClosedForFeedback callback');
      onClosedForFeedback();
    } else if (onClose) {
      console.log('⚠️ Falling back to onClose callback');
      onClose();
    } else {
      console.log('❌ No callbacks available!');
    }
  };

  return (
    <View style={styles.screenContent}>
      <Text style={styles.screenTitle}>{data.title}</Text>
      
      {/* Vertically centered content */}
      <View style={styles.centeredContent}>
        {/* Respond to Mirror Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{data.respond_section.title}</Text>
          <Text style={styles.sectionDescription}>{data.respond_section.description}</Text>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={handleGetStarted}
          >
            <Text style={styles.secondaryButtonText}>{data.respond_section.button_text}</Text>
          </TouchableOpacity>
        </View>
        
        {/* Share Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{data.share_section.title}</Text>
          <Text style={styles.sectionDescription}>{data.share_section.description}</Text>
        </View>

        {/* Feedback Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Give feedback on your Mirror</Text>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={handleFeedback}
          >
            <Text style={styles.secondaryButtonText}>Share feedback</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 40,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 48, // Increased spacing between sections
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fbbf24',
    marginBottom: 12,
    textAlign: 'center',
  },
  sectionDescription: {
    fontSize: 16,
    color: '#cbd5e1',
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#64748b',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '600',
  },
});