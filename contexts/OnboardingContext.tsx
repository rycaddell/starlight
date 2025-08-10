import React, { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';

export type OnboardingStep = 
  | 'how-it-works'
  | 'microphone-permission'
  | 'notification-permission'
  | 'current-state'
  | 'complete';

export interface SpiritualState {
  id: string;
  title: string;
  description: string;
  image: string;
  color: string;
}

export const SPIRITUAL_STATES: SpiritualState[] = [
  {
    id: 'seeking',
    title: 'Seeking',
    description: 'Exploring faith and asking questions',
    image: '🔍',
    color: '#3b82f6'
  },
  {
    id: 'growing',
    title: 'Growing',
    description: 'Actively developing spiritual practices',
    image: '🌱',
    color: '#10b981'
  },
  {
    id: 'struggling',
    title: 'Struggling',
    description: 'Going through a difficult season',
    image: '⛈️',
    color: '#f59e0b'
  },
  {
    id: 'thriving',
    title: 'Thriving',
    description: 'Feeling connected and purposeful',
    image: '🌟',
    color: '#8b5cf6'
  },
  {
    id: 'dry-season',
    title: 'Dry Season',
    description: 'Feeling distant or disconnected',
    image: '🏜️',
    color: '#6b7280'
  },
  {
    id: 'transition',
    title: 'In Transition',
    description: 'Major life changes happening',
    image: '🚪',
    color: '#ef4444'
  }
];

interface OnboardingContextType {
  currentStep: OnboardingStep;
  isOnboardingComplete: boolean;
  selectedSpiritualState: SpiritualState | null;
  hasMicrophonePermission: boolean;
  hasNotificationPermission: boolean;
  setCurrentStep: (step: OnboardingStep) => void;
  selectSpiritualState: (state: SpiritualState) => void;
  setMicrophonePermission: (granted: boolean) => void;
  setNotificationPermission: (granted: boolean) => void;
  completeOnboarding: () => Promise<void>;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  canProceed: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const STEP_ORDER: OnboardingStep[] = [
  'how-it-works',
  'microphone-permission',
  'notification-permission',
  'current-state',
  'complete'
];

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('how-it-works');
  const [selectedSpiritualState, setSelectedSpiritualState] = useState<SpiritualState | null>(null);
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);

  const canProceed = (() => {
    switch (currentStep) {
      case 'how-it-works':
        return true;
      case 'microphone-permission':
        return hasMicrophonePermission;
      case 'notification-permission':
        return hasNotificationPermission;
      case 'current-state':
        return selectedSpiritualState !== null;
      case 'complete':
        return true;
      default:
        return false;
    }
  })();

  const isOnboardingComplete = currentStep === 'complete';

  function goToNextStep() {
    if (!canProceed) return;
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      setCurrentStep(STEP_ORDER[currentIndex + 1]);
    }
  }

  function goToPreviousStep() {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEP_ORDER[currentIndex - 1]);
    }
  }

  function selectSpiritualState(state: SpiritualState) {
    setSelectedSpiritualState(state);
  }

  function setMicrophonePermission(granted: boolean) {
    setHasMicrophonePermission(granted);
  }

  function setNotificationPermission(granted: boolean) {
    setHasNotificationPermission(granted);
  }

  async function completeOnboarding() {
    if (!user || !selectedSpiritualState) return;
    try {
      setCurrentStep('complete');
      console.log('✅ Onboarding completed for user:', user.display_name);
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
    }
  }

  const contextValue: OnboardingContextType = {
    currentStep,
    isOnboardingComplete,
    selectedSpiritualState,
    hasMicrophonePermission,
    hasNotificationPermission,
    setCurrentStep,
    selectSpiritualState,
    setMicrophonePermission,
    setNotificationPermission,
    completeOnboarding,
    goToNextStep,
    goToPreviousStep,
    canProceed
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}