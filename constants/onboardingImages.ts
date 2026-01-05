// constants/onboardingImages.ts
// Background images for narrative onboarding flow

export const ONBOARDING_BACKGROUNDS = {
  // Step 1: Name input (close-up)
  nameInput: require('@/assets/onboarding/onboarding-bg-01.jpg'),

  // Steps 2-4: Welcome, first moment, question (same image)
  welcome: require('@/assets/onboarding/onboarding-bg-02.jpg'),
  momentOne: require('@/assets/onboarding/onboarding-bg-02.jpg'),
  momentsQuestion: require('@/assets/onboarding/onboarding-bg-02.jpg'),

  // Step 5: Second journal entry
  momentTwo: require('@/assets/onboarding/onboarding-bg-05.jpg'),

  // Step 6: Third journal entry
  momentThree: require('@/assets/onboarding/onboarding-bg-06.jpg'),

  // Step 7: Fourth journal entry (pre-zoom close-up)
  momentFour: require('@/assets/onboarding/onboarding-bg-07.jpg'),

  // Step 8: Step back / zoom transition (aerial)
  stepBack: require('@/assets/onboarding/onboarding-bg-08.jpg'),

  // Steps 9-10: Pattern revealed & CTA (same aerial image)
  patternRevealed: require('@/assets/onboarding/onboarding-bg-09.jpg'),
  callToAction: require('@/assets/onboarding/onboarding-bg-09.jpg'),
} as const;

// Product screenshot for Mirror feature (step 9 overlay)
export const PRODUCT_SCREENSHOT = require('@/assets/onboarding/product-screenshot.png');

// Sample journal entries for storytelling
export const SAMPLE_JOURNAL_ENTRIES = {
  momentOne: {
    date: 'Dec 12',
    text: 'I felt so seen reading Psalm 25 just now! Thank you, God.',
  },
  momentTwo: {
    date: 'Dec 18',
    text: "I'm seeing progress, but I still have so much work to do.",
  },
  momentThree: {
    date: 'Dec 21',
    text: 'Dinner with friends was exactly what I needed tonight.',
  },
  momentFour: {
    date: 'Dec 27',
    text: "Why hasn't he been healed yet? Does God care?",
  },
} as const;
