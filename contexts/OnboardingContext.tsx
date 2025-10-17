// contexts/OnboardingContext.tsx - Updated for new onboarding flow
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Image } from 'react-native';
import { useAuth } from './AuthContext';
import { completeUserOnboarding } from '../lib/supabase/auth';

export type OnboardingStep = 
  | 'microphone-permission'
  | 'journal-entry'
  | 'loading-reflection'
  | 'ai-preview'
  | 'understanding-info'
  | 'act-info'
  | 'complete';

interface OnboardingContextType {
  currentStep: OnboardingStep;
  isOnboardingComplete: boolean;
  hasMicrophonePermission: boolean;
  hasNotificationPermission: boolean;
  journalContent: string;
  journalEntryType: 'text' | 'voice' | null;
  aiPreviewData: any;
  rhythmData: {
    activity: string;
    day: string;
    time: string;
  };
  setCurrentStep: (step: OnboardingStep) => void;
  setMicrophonePermission: (granted: boolean) => void;
  setNotificationPermission: (granted: boolean) => void;
  setJournalContent: (content: string) => void;
  setJournalEntryType: (type: 'text' | 'voice') => void;
  setAIPreviewData: (data: any) => void;
  setRhythmData: (data: { activity: string; day: string; time: string }) => void;
  completeOnboarding: () => Promise<void>;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  canProceed: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Updated step order with new onboarding flow
const STEP_ORDER: OnboardingStep[] = [
  'microphone-permission',
  'journal-entry',
  'loading-reflection',
  'mirror',
  'rhythm-of-life',
  'journey-together',
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
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('microphone-permission');
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [journalContent, setJournalContent] = useState('');
  const [journalEntryType, setJournalEntryType] = useState<'text' | 'voice' | null>(null);
  const [aiPreviewData, setAIPreviewData] = useState<any>(null);
  const [rhythmData, setRhythmData] = useState({
    activity: '',
    day: '',
    time: ''
  });

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
        setJournalContent('');
        setJournalEntryType(null);
        setAIPreviewData(null);
        setRhythmData({ activity: '', day: '', time: '' });
      }
    } else {
      setIsOnboardingComplete(false);
      setCurrentStep('microphone-permission');
      setMicrophonePermission(false);
      setNotificationPermission(false);
      setJournalContent('');
      setJournalEntryType(null);
      setAIPreviewData(null);
      setRhythmData({ activity: '', day: '', time: '' });
    }
  }, [user]);

  const canProceed = (() => {
    switch (currentStep) {
      case 'microphone-permission':
        return true; // Can skip mic permission
      case 'journal-entry':
        return journalContent.trim().length > 0; // Must have content to proceed
      case 'loading-reflection':
        return true; // Auto-advances via timer
      case 'mirror':
        return true; // Can always proceed
      case 'rhythm-of-life':
        return hasNotificationPermission; // MUST grant notification permission
      case 'journey-together':
        return true; // Can always proceed
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

  function setMicrophonePermission(granted: boolean) {
    console.log('🎤 Microphone permission:', granted);
    setHasMicrophonePermission(granted);
  }

  function setNotificationPermission(granted: boolean) {
    console.log('🔔 Notification permission:', granted);
    setHasNotificationPermission(granted);
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
    journalContent,
    journalEntryType,
    aiPreviewData,
    rhythmData,
    setCurrentStep,
    setMicrophonePermission,
    setNotificationPermission,
    setJournalContent,
    setJournalEntryType,
    setAIPreviewData,
    setRhythmData,
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