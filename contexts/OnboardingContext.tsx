// contexts/OnboardingContext.tsx - Updated for new onboarding flow
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Image } from 'react-native';
import { useAuth } from './AuthContext';
import { completeUserOnboarding } from '../lib/supabase/auth';
import { preloadDay1Images } from '../utils/preloadImages';

export type OnboardingStep =
  | 'name-input'          // Step 1
  | 'welcome'             // Step 2
  | 'moment-one'          // Step 3
  | 'moments-question'    // Step 4
  | 'moment-two'          // Step 5
  | 'moment-three'        // Step 6
  | 'moment-four'         // Step 7
  | 'step-back'           // Step 8 (zoom animation)
  | 'pattern-revealed'    // Step 9 (product screenshot)
  | 'call-to-action'      // Step 10
  | 'complete';

interface OnboardingContextType {
  currentStep: OnboardingStep;
  isOnboardingComplete: boolean;
  userName: string;
  setUserName: (name: string) => void;
  setCurrentStep: (step: OnboardingStep) => void;
  completeOnboarding: () => Promise<void>;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  canProceed: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Narrative onboarding step order
const STEP_ORDER: OnboardingStep[] = [
  'name-input',
  'welcome',
  'moment-one',
  'moments-question',
  'moment-two',
  'moment-three',
  'moment-four',
  'step-back',
  'pattern-revealed',
  'call-to-action',
  'complete'
];

interface OnboardingProviderProps {
  children: React.ReactNode;
}

// Helper function to preload images
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
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('name-input');
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [userName, setUserName] = useState('');

  // Check onboarding completion status when user changes
  useEffect(() => {
    if (user) {
      const completed = hasUserCompletedOnboarding(user);
      setIsOnboardingComplete(completed);

      if (completed) {
        setCurrentStep('complete');
      } else {
        setCurrentStep('name-input');
        setUserName(user.display_name || '');
      }
    } else {
      setIsOnboardingComplete(false);
      setCurrentStep('name-input');
      setUserName('');
    }
  }, [user]);

  const canProceed = (() => {
    switch (currentStep) {
      case 'name-input':
        return userName.trim().length > 0; // Must have name
      case 'welcome':
      case 'moment-one':
      case 'moments-question':
      case 'moment-two':
      case 'moment-three':
      case 'moment-four':
      case 'step-back':
      case 'pattern-revealed':
      case 'call-to-action':
      case 'complete':
        return true;
      default:
        return false;
    }
  })();

  function goToNextStep() {
    if (!canProceed) {
      console.log('⚠️ Cannot proceed from step:', currentStep);
      return;
    }
    
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      const nextStep = STEP_ORDER[currentIndex + 1];
      console.log('➡️ Moving to next step:', nextStep);
      
      if (nextStep === 'complete') {
        completeOnboarding();
      } else {
        setCurrentStep(nextStep);
      }
    }
  }

  function goToPreviousStep() {
    // Onboarding does not allow going back
    console.log('⬅️ Back navigation disabled during onboarding');
  }

  async function completeOnboarding() {
    if (!user) {
      console.error('❌ Cannot complete onboarding: missing user');
      return;
    }

    try {
      console.log('✅ Completing onboarding for user:', user.id);
      const result = await completeUserOnboarding(user.id, null);

      if (result.success) {
        setCurrentStep('complete');
        setIsOnboardingComplete(true);
        console.log('✅ Onboarding completed successfully');

        // Preload Day 1 images in background for better UX when user starts Day 1
        preloadDay1Images().catch(error => {
          console.error('❌ Failed to preload Day 1 images:', error);
        });
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
    userName,
    setUserName,
    setCurrentStep,
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