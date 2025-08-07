import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useOnboarding, SPIRITUAL_STATES, SpiritualState } from '../../contexts/OnboardingContext';

interface StateOptionProps {
  state: SpiritualState;
  isSelected: boolean;
  onSelect: () => void;
}

const StateOption: React.FC<StateOptionProps> = ({ state, isSelected, onSelect }) => (
  <TouchableOpacity 
    style={[
      styles.stateOption,
      isSelected && styles.stateOptionSelected,
      { borderColor: isSelected ? state.color : '#e2e8f0' }
    ]}
    onPress={onSelect}
  >
    <View style={styles.stateHeader}>
      <View style={[styles.stateIcon, { backgroundColor: state.color + '20' }]}>
        <Text style={styles.stateIconText}>{state.image}</Text>
      </View>
      <View style={styles.stateTitleContainer}>
        <Text style={[styles.stateTitle, isSelected && { color: state.color }]}>
          {state.title}
        </Text>
        {isSelected && (
          <View style={[styles.selectedIndicator, { backgroundColor: state.color }]}>
            <Text style={styles.selectedIndicatorText}>✓</Text>
          </View>
        )}
      </View>
    </View>
    <Text style={styles.stateDescription}>{state.description}</Text>
  </TouchableOpacity>
);

export const CurrentStateScreen: React.FC = () => {
  const { 
    goToNextStep, 
    goToPreviousStep, 
    selectedSpiritualState, 
    selectSpiritualState,
    completeOnboarding,
    canProceed 
  } = useOnboarding();

  const handleContinue = async () => {
    await completeOnboarding();
    // Navigation to main app will be handled by AuthNavigator
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Where are you right now?</Text>
          <Text style={styles.subtitle}>
            Help us understand your current spiritual season so we can provide more personalized insights
          </Text>
        </View>

        {/* State Options */}
        <View style={styles.statesContainer}>
          {SPIRITUAL_STATES.map((state) => (
            <StateOption
              key={state.id}
              state={state}
              isSelected={selectedSpiritualState?.id === state.id}
              onSelect={() => selectSpiritualState(state)}
            />
          ))}
        </View>

        {/* Additional Context */}
        <View style={styles.contextSection}>
          <Text style={styles.contextTitle}>Remember</Text>
          <Text style={styles.contextText}>
            This is just a starting point. Your spiritual journey is unique and can change over time. You can always update this later as you grow and change.
          </Text>
        </View>

        {/* Selection Reminder */}
        {!selectedSpiritualState && (
          <View style={styles.reminderSection}>
            <Text style={styles.reminderText}>
              Please select the option that best describes your current spiritual state
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={goToPreviousStep}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.continueButton,
            !canProceed && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!canProceed}
        >
          <Text style={[
            styles.continueButtonText,
            !canProceed && styles.continueButtonTextDisabled
          ]}>
            Complete Setup
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  statesContainer: {
    marginBottom: 32,
  },
  stateOption: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stateOptionSelected: {
    shadowOpacity: 0.15,
    elevation: 6,
  },
  stateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stateIconText: {
    fontSize: 20,
  },
  stateTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicatorText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stateDescription: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginLeft: 64,
  },
  contextSection: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  contextTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0c4a6e',
    marginBottom: 8,
  },
  contextText: {
    fontSize: 14,
    color: '#0369a1',
    lineHeight: 20,
  },
  reminderSection: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  reminderText: {
    fontSize: 14,
    color: '#92400e',
    textAlign: 'center',
    fontWeight: '500',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  backButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  continueButton: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    color: '#9ca3af',
  },
});