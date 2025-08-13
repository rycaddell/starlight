import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { completeUserOnboarding } from '../lib/supabase/auth';

export type OnboardingStep = 
  | 'how-it-works'
  | 'microphone-permission'
  | 'notification-permission'
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

const STEP_ORDER: OnboardingStep[] = [
  'how-it-works',
  'microphone-permission',
  'notification-permission',
  'complete'
];

interface OnboardingProviderProps {
  children: React.ReactNode;
}

// Helper function to check if user completed onboarding
const hasUserCompletedOnboarding = (user: any) => {
  return user && user.onboarding_completed_at !== null;
};

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('how-it-works');
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
        console.log('🎯 User has already completed onboarding');
      } else {
        setCurrentStep('how-it-works');
        // Reset all permission states for new users
        setMicrophonePermission(false);
        setNotificationPermission(false);
        console.log('🚀 New user - starting fresh onboarding flow');
      }
    } else {
      // Reset everything when no user
      setIsOnboardingComplete(false);
      setCurrentStep('how-it-works');
      setMicrophonePermission(false);
      setNotificationPermission(false);
    }
  }, [user]);

  const canProceed = (() => {
    switch (currentStep) {
      case 'how-it-works':
        return true;
      case 'microphone-permission':
        return hasMicrophonePermission;
      case 'notification-permission':
        return hasNotificationPermission;
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
      console.error('❌ Cannot complete onboarding: missing user');
      return;
    }
    
    try {
      console.log('🎯 Completing onboarding for user:', user.display_name);
      
      // Update database to mark onboarding as complete (no spiritual state needed)
      const result = await completeUserOnboarding(user.id, null);
      
      if (result.success) {
        setCurrentStep('complete');
        setIsOnboardingComplete(true);
        console.log('✅ Onboarding completed successfully');
        
        // Force a small delay to ensure state updates
        setTimeout(() => {
          console.log('✅ Onboarding completion finalized');
        }, 100);
      } else {
        console.error('❌ Failed to complete onboarding:', result.error);
      }
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
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