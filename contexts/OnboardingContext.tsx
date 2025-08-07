import React, { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';

export type OnboardingStep = 
  | 'splash'
  | 'welcome'
  | 'how-it-works'
  | 'permissions'
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
  setCurrentStep: (step: OnboardingStep) => void;
  selectSpiritualState: (state: SpiritualState) => void;
  setMicrophonePermission: (granted: boolean) => void;
  completeOnboarding: () => Promise<void>;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  canProceed: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const STEP_ORDER: OnboardingStep[] = ['splash', 'welcome', 'how-it-works', 'permissions', 'current-state', 'complete'];

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [selectedSpiritualState, setSelectedSpiritualState] = useState<SpiritualState | null>(null);
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState(false);

  const canProceed = (() => {
    switch (currentStep) {
      case 'splash':
      case 'welcome':
      case 'how-it-works':
        return true;
      case 'permissions':
        return hasMicrophonePermission;
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
    if (currentIndex > 1) {
      setCurrentStep(STEP_ORDER[currentIndex - 1]);
    }
  }

  function selectSpiritualState(state: SpiritualState) {
    setSelectedSpiritualState(state);
  }

  function setMicrophonePermission(granted: boolean) {
    setHasMicrophonePermission(granted);
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

  const value: OnboardingContextType = {
    currentStep,
    isOnboardingComplete,
    selectedSpiritualState,
    hasMicrophonePermission,
    setCurrentStep,
    selectSpiritualState,
    setMicrophonePermission,
    completeOnboarding,
    goToNextStep,
    goToPreviousStep,
    canProceed
  };

  return React.createElement(OnboardingContext.Provider, { value }, children);
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}