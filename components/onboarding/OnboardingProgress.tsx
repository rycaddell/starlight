import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding, OnboardingStep } from '../../contexts/OnboardingContext';

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'how-it-works', 
  'permissions',
  'current-state'
];

export const OnboardingProgress: React.FC = () => {
  const { currentStep } = useOnboarding();
  
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  const totalSteps = STEP_ORDER.length;
  
  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${((currentIndex + 1) / totalSteps) * 100}%` }
            ]}
          />
        </View>
        <View style={styles.dotsContainer}>
          {STEP_ORDER.map((step, index) => (
            <View
              key={step}
              style={[
                styles.dot,
                index <= currentIndex ? styles.dotActive : styles.dotInactive
              ]}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#059669',
  },
  dotInactive: {
    backgroundColor: '#d1d5db',
  },
});