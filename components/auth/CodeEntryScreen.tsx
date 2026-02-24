import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { colors, typography, spacing, borderRadius, fontFamily } from '../../theme/designTokens';

const { width, height } = Dimensions.get('window');

// Add this preloading function with better caching strategy
const preloadOnboardingImages = async () => {
  try {
    console.log('🖼️ Starting image preload from CodeEntryScreen...');
    
    const images = [
      require('../../assets/reflection.png'),
      require('../../assets/share.png'),
    ];
    
    const startTime = Date.now();
    
    const preloadPromises = images.map(async (imageSource, index) => {
      try {
        const uri = Image.resolveAssetSource(imageSource).uri;
        console.log(`📥 Preloading image ${index + 1}: ${uri}`);
        
        const imageStartTime = Date.now();
        
        // Try multiple caching strategies
        await Promise.all([
          Image.prefetch(uri),
          // Also resolve the asset to ensure it's in the bundle cache
          Image.resolveAssetSource(imageSource),
          // Get size to trigger another cache layer
          new Promise((resolve, reject) => {
            Image.getSize(uri, 
              (width, height) => {
                console.log(`📐 Image ${index + 1} size: ${width}x${height}`);
                resolve({ width, height });
              },
              reject
            );
          })
        ]);
        
        const imageEndTime = Date.now();
        console.log(`✅ Image ${index + 1} fully cached in ${imageEndTime - imageStartTime}ms`);
        return true;
      } catch (error) {
        console.error(`❌ Failed to preload image ${index + 1}:`, error);
        return false;
      }
    });
    
    await Promise.all(preloadPromises);
    const totalTime = Date.now() - startTime;
    console.log(`✅ All images aggressively cached in ${totalTime}ms`);
  } catch (error) {
    console.error('❌ Error preloading images:', error);
  }
};

interface CodeEntryScreenProps {
  onCodeSubmit: (code: string) => Promise<{ success: boolean; error?: string }>;
  loading?: boolean;
}

export const CodeEntryScreen: React.FC<CodeEntryScreenProps> = ({ 
  onCodeSubmit, 
  loading = false 
}) => {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const videoRef = useRef(null);

  // Add this useEffect to preload images when component mounts
  useEffect(() => {
    // Start preloading images immediately when code entry screen shows
    preloadOnboardingImages();
  }, []);

  const handleSubmit = async () => {
    if (!code.trim()) {
      Alert.alert('Invalid Code', 'Please enter an access code.');
      return;
    }

    setIsSubmitting(true);
    console.log('🔑 handleSubmit called with code:', code);

    try {
      console.log('🚀 Calling onCodeSubmit...');
      const result = await onCodeSubmit(code.trim());
      console.log('✅ onCodeSubmit result:', result);

      if (!result.success) {
        Alert.alert('Access Denied', result.error || 'Invalid access code. Please try again.');
      }
    } catch (error) {
      console.error('💥 Error in handleSubmit:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.container}>
        {/* Background Video */}
        <Video
          ref={videoRef}
          source={require('../../assets/background-video.mp4')} // Update this path to your video
          style={styles.backgroundVideo}
          resizeMode={ResizeMode.COVER}
          isLooping
          isMuted
          shouldPlay
        />
        
        {/* Overlay */}
        <View style={styles.overlay} />
        
        {/* Content with Keyboard Avoiding */}
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={styles.contentContainer}>
            <View style={styles.content}>
              {/* Title at top */}
              <View style={styles.headerSection}>
                <Text style={styles.title}>Oxbow</Text>
                <Text style={styles.subtitle}>a spiritual attention app</Text>
              </View>
              
              {/* Input and button at bottom */}
              <View style={styles.bottomSection}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Enter your access code</Text>
                  <TextInput
                    style={styles.input}
                    value={code}
                    onChangeText={setCode}
                    placeholder="e.g. test123"
                    placeholderTextColor={colors.text.bodyLight}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    returnKeyType="go"
                    onSubmitEditing={handleSubmit}
                    editable={!isSubmitting && !loading}
                  />
                </View>
                
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (isSubmitting || loading || !code.trim()) && styles.submitButtonDisabled
                  ]}
                  onPress={handleSubmit}
                  disabled={isSubmitting || loading || !code.trim()}
                >
                  <Text style={styles.submitButtonText}>
                    {isSubmitting || loading ? 'Loading...' : 'Get Started'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: width,
    height: height,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxxl,
    paddingTop: 32,
    paddingBottom: 32,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 60,
  },
  title: {
    fontFamily: fontFamily.primary,
    fontSize: 48,
    fontWeight: '900',
    color: colors.text.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: spacing.m,
  },
  subtitle: {
    fontFamily: fontFamily.primary,
    fontSize: 17,
    fontWeight: '400',
    fontStyle: 'italic',
    color: colors.text.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    opacity: 0.9,
  },
  bottomSection: {
    justifyContent: 'flex-end',
    gap: spacing.xxxl,
  },
  inputContainer: {
    gap: spacing.l,
  },
  inputLabel: {
    ...typography.heading.s,
    color: colors.text.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: borderRadius.button,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    fontFamily: fontFamily.primary,
    fontSize: 17,
    fontWeight: '400',
    color: colors.text.body,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: colors.text.primary,
    borderRadius: borderRadius.button,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  submitButtonText: {
    ...typography.heading.s,
    color: colors.text.white,
    textAlign: 'center',
  },
});