// contexts/OnboardingContext.tsx - Updated version
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Image } from 'react-native';
import { useAuth } from './AuthContext';
import { completeUserOnboarding } from '../lib/supabase/auth';

export type OnboardingStep = 
  | 'microphone-permission'
  | 'notification-permission'
  | 'share'
  | 'complete';

interface OnboardingContextType {
  currentStep: OnboardingStep;
  isOnboardingComplete: boolean;
  hasMicrophonePermission: boolean;
  hasNotificationPermission: boolean;
  setCurrentStep: (step: OnboardingStep) => void;
  setMicrophonePermission: (granted: boolean) => void;
  setNotificationPermission: (granted: boolean) => void;
  completeOnboarding: () => Promise<void>;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  canProceed: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Updated step order - removed 'how-it-works', added 'share'
const STEP_ORDER: OnboardingStep[] = [
  'microphone-permission',
  'notification-permission', 
  'share',
  'complete'
];

interface OnboardingProviderProps {
  children: React.ReactNode;
}

// Helper function to preload images more aggressively
const preloadOnboardingImages = async () => {
  try {
    const images = [
      require('../assets/reflection.png'),
      require('../assets/share.png'),
    ];
    
    const preloadPromises = images.map(async (imageSource) => {
      try {
        const uri = Image.resolveAssetSource(imageSource).uri;
        await Image.prefetch(uri);
        Image.getSize(uri, () => {}, (error) => {});
        return true;
      } catch (error) {
        return false;
      }
    });
    
    await Promise.all(preloadPromises);
  } catch (error) {
    console.error('Error preloading images:', error);
  }
};

// Helper function to check if user completed onboarding
const hasUserCompletedOnboarding = (user: any) => {
  return user && user.onboarding_completed_at !== null;
};

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { user, refreshUser } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('microphone-permission');
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  // Check onboarding completion status when user changes
  useEffect(() => {
    if (user) {
      const completed = hasUserCompletedOnboarding(user);
      setIsOnboardingComplete(completed);
      
      if (completed) {
        setCurrentStep('complete');
      } else {
        setCurrentStep('microphone-permission');
        setMicrophonePermission(false);
        setNotificationPermission(false);
        // Images will already be preloaded from CodeEntryScreen
      }
    } else {
      setIsOnboardingComplete(false);
      setCurrentStep('microphone-permission');
      setMicrophonePermission(false);
      setNotificationPermission(false);
    }
  }, [user]);

  const canProceed = (() => {
    switch (currentStep) {
      case 'microphone-permission':
        // Allow proceeding regardless of permission granted - user can skip
        return true;
      case 'notification-permission':
        // Allow proceeding regardless of permission granted - user can skip
        return true;
      case 'share':
        // Share screen should always allow proceeding
        return true;
      case 'complete':
        return true;
      default:
        return false;
    }
  })();

  function goToNextStep() {
    if (!canProceed) return;
    
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      const nextStep = STEP_ORDER[currentIndex + 1];
      if (nextStep === 'complete') {
        // If the next step is complete, trigger the completion process
        completeOnboarding();
      } else {
        setCurrentStep(nextStep);
      }
    }
  }

  function goToPreviousStep() {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEP_ORDER[currentIndex - 1]);
    }
  }

  function setMicrophonePermission(granted: boolean) {
    setHasMicrophonePermission(granted);
  }

  function setNotificationPermission(granted: boolean) {
    setHasNotificationPermission(granted);
  }

  async function completeOnboarding() {
    if (!user) {
      console.error('Cannot complete onboarding: missing user');
      return;
    }
    
    try {
      const result = await completeUserOnboarding(user.id, null);
      
      if (result.success) {
        setCurrentStep('complete');
        setIsOnboardingComplete(true);
      } else {
        console.error('Failed to complete onboarding:', result.error);
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }

  const contextValue: OnboardingContextType = {
    currentStep,
    isOnboardingComplete,
    hasMicrophonePermission,
    hasNotificationPermission,
    setCurrentStep,
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