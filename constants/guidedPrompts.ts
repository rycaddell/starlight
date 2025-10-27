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
    text: 'Is there a vision or desire for your life hasn’t happened yet?  What is it?',
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
    text: 'Where do you feel peace — or resistance — about the direction your life is heading?',
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
 * Shuffles an array using the Fisher-Yates algorithm
 * Returns a new array without modifying the original
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get a randomized list of guided prompts
 * Call this each time you want to display the carousel with a fresh order
 */
export function getRandomizedPrompts(): GuidedPrompt[] {
  return shuffleArray(GUIDED_PROMPTS);
}

/**
 * Get a specific number of random prompts
 * @param count - Number of prompts to return (default: 3)
 * @returns Array of random prompts
 */
export function getRandomPrompts(count: number = 5): GuidedPrompt[] {
  const shuffled = shuffleArray(GUIDED_PROMPTS);
  return shuffled.slice(0, count);
}