// components/mirror/MirrorLoadingAnimation.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface MirrorLoadingAnimationProps {
  isComplete?: boolean;
  onComplete?: () => void;
}

export const MirrorLoadingAnimation: React.FC<MirrorLoadingAnimationProps> = ({ 
  isComplete = false, 
  onComplete 
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [currentStep, setCurrentStep] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);

  const steps = [
    "🔍 Reading your journal entries...",
    "🤖 Analyzing patterns and themes...",
    "📖 Finding biblical connections...",
    "💭 Generating spiritual insights...",
    "✨ Crafting your Mirror..."
  ];

  useEffect(() => {
    // Start animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Cycle through steps
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(stepInterval);
          setAnimationComplete(true);
          return prev;
        }
      });
    }, 1500);

    return () => clearInterval(stepInterval);
  }, []);

  // Trigger completion when both animation and AI are done
  useEffect(() => {
    if (animationComplete && isComplete) {
      setTimeout(() => {
        onComplete?.();
      }, 1000);
    }
  }, [animationComplete, isComplete]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.loadingCard,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Animated Mirror Icon */}
        <View style={styles.mirrorIconContainer}>
          <Animated.Text
            style={[
              styles.mirrorIcon,
              {
                transform: [
                  {
                    rotate: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            🪞
          </Animated.Text>
        </View>

        {/* Loading Title */}
        <Text style={styles.loadingTitle}>Creating Your Mirror</Text>
        <Text style={styles.loadingSubtitle}>
          {animationComplete && !isComplete 
            ? 'Finalizing your spiritual insights...' 
            : 'Processing your journals with AI'
          }
        </Text>

        {/* Progress Steps */}
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View
                style={[
                  styles.stepIndicator,
                  index === currentStep
                    ? styles.stepIndicatorActive
                    : index < currentStep
                    ? styles.stepIndicatorComplete
                    : styles.stepIndicatorPending,
                ]}
              />
              <Text
                style={[
                  styles.stepText,
                  index === currentStep
                    ? styles.stepTextActive
                    : index < currentStep
                    ? styles.stepTextComplete
                    : styles.stepTextPending,
                ]}
              >
                {step}
              </Text>
            </View>
          ))}
        </View>

        {/* Animated Dots */}
        <View style={styles.dotsContainer}>
          {[0, 1, 2].map((dot, index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  opacity: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0, -10, 0],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  loadingCard: {
    backgroundColor: '#1e293b',
    padding: 32,
    borderRadius: 20,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  mirrorIconContainer: {
    marginBottom: 20,
  },
  mirrorIcon: {
    fontSize: 64,
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 30,
    textAlign: 'center',
  },
  stepsContainer: {
    width: '100%',
    marginBottom: 30,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  stepIndicatorActive: {
    backgroundColor: '#fbbf24',
  },
  stepIndicatorComplete: {
    backgroundColor: '#10b981',
  },
  stepIndicatorPending: {
    backgroundColor: '#374151',
  },
  stepText: {
    fontSize: 16,
    flex: 1,
  },
  stepTextActive: {
    color: '#fbbf24',
    fontWeight: '600',
  },
  stepTextComplete: {
    color: '#10b981',
  },
  stepTextPending: {
    color: '#6b7280',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    backgroundColor: '#fbbf24',
    borderRadius: 4,
  },
});