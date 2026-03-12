import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { colors, typography, spacing, borderRadius, fontFamily } from '../../theme/designTokens';

const { width, height } = Dimensions.get('window');
const RESEND_COOLDOWN_SECONDS = 30;

function getLastFourDigits(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  return digits.slice(-4);
}

interface OTPVerifyScreenProps {
  phone: string; // E.164 format
  onVerify: (token: string) => Promise<{ success: boolean; error?: string }>;
  onResend: () => Promise<{ success: boolean; error?: string }>;
}

export const OTPVerifyScreen: React.FC<OTPVerifyScreenProps> = ({
  phone,
  onVerify,
  onResend,
}) => {
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  const inputRef = useRef<TextInput>(null);
  const videoRef = useRef(null);

  // Auto-focus the hidden input on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleChangeText = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    setErrorMessage('');
    if (digits.length === 6) {
      handleVerify(digits);
    }
  };

  const handleVerify = async (token: string) => {
    if (isVerifying) return;
    setIsVerifying(true);
    try {
      const result = await onVerify(token);
      if (!result.success) {
        setErrorMessage(result.error || 'Invalid code. Please try again.');
        setOtp('');
        inputRef.current?.focus();
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage('');
    try {
      const result = await onResend();
      if (result.success) {
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        setOtp('');
        inputRef.current?.focus();
      } else {
        setErrorMessage(result.error || 'Failed to resend. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  const lastFour = getLastFourDigits(phone);

  return (
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
              <Text style={styles.title}>Enter your code</Text>
              <Text style={styles.subtitle}>
                To verify it&apos;s you, we sent a 6-digit code to the number ending in {lastFour}
              </Text>
            </View>

            <View style={styles.bottomSection}>
              {/* Digit boxes — tap anywhere to focus the hidden input */}
              <View style={styles.boxRow}>
                {Array.from({ length: 6 }, (_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.digitBox,
                      i === otp.length && !isVerifying && styles.digitBoxActive,
                      errorMessage ? styles.digitBoxError : null,
                    ]}
                  >
                    <Text style={styles.digitText}>{otp[i] ?? ''}</Text>
                  </View>
                ))}
              </View>

              {/* Hidden input that actually receives keystrokes and autofill */}
              <TextInput
                ref={inputRef}
                style={styles.hiddenInput}
                value={otp}
                onChangeText={handleChangeText}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                maxLength={6}
                editable={!isVerifying}
                caretHidden
              />

              {!!errorMessage && (
                <Text style={styles.errorText}>{errorMessage}</Text>
              )}

              {isVerifying && (
                <Text style={styles.statusText}>Verifying...</Text>
              )}

              <TouchableOpacity
                onPress={handleResend}
                disabled={resendCooldown > 0 || isResending}
              >
                <Text style={[
                  styles.resendText,
                  (resendCooldown > 0 || isResending) && styles.resendTextDisabled,
                ]}>
                  {isResending
                    ? 'Resending...'
                    : resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : 'Resend code'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
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
    paddingBottom: 48,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 60,
  },
  title: {
    fontFamily: fontFamily.primary,
    fontSize: 36,
    fontWeight: '700',
    color: colors.text.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: spacing.l,
  },
  subtitle: {
    fontFamily: fontFamily.primary,
    fontSize: 17,
    fontWeight: '400',
    color: colors.text.white,
    textAlign: 'center',
    opacity: 0.85,
    lineHeight: 24,
  },
  bottomSection: {
    alignItems: 'center',
    gap: spacing.xl,
  },
  boxRow: {
    flexDirection: 'row',
    gap: spacing.m,
  },
  digitBox: {
    width: 46,
    height: 56,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  digitBoxActive: {
    borderColor: colors.text.white,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  digitBoxError: {
    borderColor: '#FF6B6B',
  },
  digitText: {
    fontFamily: fontFamily.primary,
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.white,
  },
  // Fully transparent — only here to receive keystrokes and iOS autofill
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
  errorText: {
    fontFamily: fontFamily.primary,
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
  },
  statusText: {
    fontFamily: fontFamily.primary,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  resendText: {
    ...typography.heading.s,
    color: colors.text.white,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  resendTextDisabled: {
    opacity: 0.45,
    textDecorationLine: 'none',
  },
});
