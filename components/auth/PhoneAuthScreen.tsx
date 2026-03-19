import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  InputAccessoryView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { colors, typography, spacing, borderRadius, fontFamily } from '../../theme/designTokens';

const { width, height } = Dimensions.get('window');
const PHONE_INPUT_ACCESSORY_ID = 'phone-auth-input';

// Format raw digits (up to 10) as (555) 123-4567
function formatPhoneDisplay(digits: string): string {
  const d = digits.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

interface PhoneAuthScreenProps {
  onPhoneSubmit: (e164Phone: string) => Promise<{ success: boolean; error?: string }>;
}

export const PhoneAuthScreen: React.FC<PhoneAuthScreenProps> = ({ onPhoneSubmit }) => {
  const [digits, setDigits] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const videoRef = useRef(null);
  const inputRef = useRef<TextInput>(null);

  const isValid = digits.length === 10;

  const handleChangeText = (text: string) => {
    let raw = text.replace(/\D/g, '');
    // Strip leading US country code if iOS autofill inserted +1XXXXXXXXXX
    if (raw.length === 11 && raw.startsWith('1')) {
      raw = raw.slice(1);
    }
    setDigits(raw.slice(0, 10));
    setErrorMessage('');
  };

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const e164 = `+1${digits}`;
      const result = await onPhoneSubmit(e164);
      if (!result.success) {
        setErrorMessage(result.error || 'Failed to send code. Please try again.');
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    } catch {
      setErrorMessage('Something went wrong. Please try again.');
      setTimeout(() => inputRef.current?.focus(), 50);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <InputAccessoryView nativeID={PHONE_INPUT_ACCESSORY_ID}>
      <View />
    </InputAccessoryView>
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Video
          ref={videoRef}
          source={require('../../assets/background-video.mp4')}
          style={styles.backgroundVideo}
          resizeMode={ResizeMode.COVER}
          isLooping
          isMuted
          shouldPlay
        />
        <View style={styles.overlay} />
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={styles.contentContainer}>
            <View style={styles.content}>
              <View style={styles.headerSection}>
                <Text style={styles.title}>Oxbow Journal</Text>
                <Text style={styles.subtitle}>a spiritual attention app</Text>
              </View>
              <View style={styles.bottomSection}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Sign up or log in</Text>
                  <View style={styles.phoneRow}>
                    <View style={styles.countryPrefix}>
                      <Text style={styles.countryPrefixText}>+1</Text>
                    </View>
                    <TextInput
                      ref={inputRef}
                      style={styles.input}
                      value={formatPhoneDisplay(digits)}
                      onChangeText={handleChangeText}
                      placeholder="(555) 123-4567"
                      placeholderTextColor="rgba(255, 255, 255, 0.35)"
                      keyboardType="phone-pad"
                      textContentType="telephoneNumber"
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                      editable={!isSubmitting}
                      inputAccessoryViewID={PHONE_INPUT_ACCESSORY_ID}
                    />
                  </View>
                </View>
                {!!errorMessage && (
                  <Text style={styles.errorText}>{errorMessage}</Text>
                )}
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!isValid || isSubmitting) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!isValid || isSubmitting}
                >
                  <Text style={styles.submitButtonText}>
                    {isSubmitting ? 'Sending...' : 'Send code'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width,
    height,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  keyboardAvoidingView: { flex: 1 },
  contentContainer: { flex: 1 },
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
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  countryPrefix: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.3)',
  },
  countryPrefixText: {
    fontFamily: fontFamily.primary,
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.white,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    fontFamily: fontFamily.primary,
    fontSize: 17,
    fontWeight: '400',
    color: colors.text.white,
  },
  errorText: {
    fontFamily: fontFamily.primary,
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: colors.text.primary,
    borderRadius: borderRadius.button,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  submitButtonText: {
    ...typography.heading.s,
    color: colors.text.white,
    textAlign: 'center',
  },
});
