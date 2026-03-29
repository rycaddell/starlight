// lib/constants/guidedPrompts.ts

export interface GuidedPrompt {
  id: string;
  text: string;
}

// Guided journal prompts
export const GUIDED_PROMPTS: GuidedPrompt[] = [
  {
    id: 'guided-2',
    text: 'Is there something God is asking you to let go of?',
  },
  {
    id: 'guided-3',
    text: 'Is there a change you feel led to make but are afraid to trust God with?',
  },
  {
    id: 'guided-4',
    text: 'If your life right now were a book chapter, what would the theme or title be?',
  },
  {
    id: 'guided-7',
    text: 'What do you ask God for most often?',
  },
  {
    id: 'guided-10',
    text: 'How do you believe God feels about you?',
  },
{
    id: 'guided-14',
    text: 'What has been on your mind the most lately?',
  },
  {
    id: 'guided-16',
    text: 'Where do you feel peace - or resistance - about the direction your life is heading?',
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