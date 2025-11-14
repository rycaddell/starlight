// lib/constants/guidedPrompts.ts

export interface GuidedPrompt {
  id: string;
  text: string;
}

// All 19 guided journal prompts
export const GUIDED_PROMPTS: GuidedPrompt[] = [
  {
    id: 'guided-1',
    text: 'Is there someone you are struggling to forgive?  Why?',
  },
  {
    id: 'guided-2',
    text: 'What do you sense God asking you to let go of?',
  },
  {
    id: 'guided-3',
    text: 'What change do you feel led to make but are afraid to trust God with?',
  },
  {
    id: 'guided-4',
    text: 'If your life right now were a book chapter, what would the theme or title be?',
  },
  {
    id: 'guided-5',
    text: 'Describe a time you felt deeply seen by the Lord.',
  },
  {
    id: 'guided-6',
    text: 'How would you describe your relationship with God as Father?',
  },
  {
    id: 'guided-7',
    text: 'What do you ask God for most often?',
  },
  {
    id: 'guided-8',
    text: 'Who do you admire deeply, and what about them inspires you?',
  },
  {
    id: 'guided-9',
    text: 'What feels most mysterious or hard to understand about God?',
  },
  {
    id: 'guided-10',
    text: 'How do you believe God feels about you?',
  },
  {
    id: 'guided-11',
    text: "Is there a vision or desire for your life hasn't happened yet?  What is it?",
  },
  {
    id: 'guided-12',
    text: 'Was there a moment or season that dramatically changed the direction of your life?',
  },
  {
    id: 'guided-13',
    text: 'What are your favorite things about how God made you?',
  },
  {
    id: 'guided-14',
    text: 'What has been on your mind the most lately?',
  },
  {
    id: 'guided-15',
    text: 'How would you describe your life purpose?',
  },
  {
    id: 'guided-16',
    text: 'Where do you feel peace - or resistance - about the direction your life is heading?',
  },
  {
    id: 'guided-17',
    text: 'What lie have you believed or told yourself that has been hard to untangle?',
  },
  {
    id: 'guided-18',
    text: 'Has God ever given you a dream or word (prophecy)?  What did it mean then or now?',
  },
  {
    id: 'guided-19',
    text: 'If you could be stronger in one area of your faith, what would it be?',
  },
];

/**
 * Simple hash function to convert a string to a number
 * Used for deterministic shuffling based on user ID
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Deterministic shuffle using a seed (user ID)
 * Same seed always produces the same shuffle order
 */
export function deterministicShuffle<T>(array: T[], seed: string): T[] {
  const shuffled = [...array];
  let currentSeed = hashString(seed);
  
  // Seeded random number generator
  const seededRandom = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };
  
  // Fisher-Yates shuffle with seeded random
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Get deterministically shuffled prompts for a user
 * Same user ID always gets the same order
 */
export function getShuffledPromptsForUser(userId: string): GuidedPrompt[] {
  return deterministicShuffle(GUIDED_PROMPTS, userId);
}