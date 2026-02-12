// utils/preloadImages.ts
// Utility to preload Day 1 spiritual place images for faster loading

import { Image } from 'react-native';
import { Asset } from 'expo-asset';

// Spiritual place images (optimized JPGs)
const SPIRITUAL_PLACE_IMAGES = [
  require('../assets/images/spiritual-places/adventuring.jpg'),
  require('../assets/images/spiritual-places/battling.jpg'),
  require('../assets/images/spiritual-places/hiding.jpg'),
  require('../assets/images/spiritual-places/resting.jpg'),
  require('../assets/images/spiritual-places/working.jpg'),
  require('../assets/images/spiritual-places/wandering.jpg'),
  require('../assets/images/spiritual-places/grieving.jpg'),
  require('../assets/images/spiritual-places/celebrating.jpg'),
  require('../assets/images/spiritual-places/default.jpg'),
];

/**
 * Preload all Day 1 spiritual place images
 * Call this after onboarding completes to ensure smooth experience
 */
export async function preloadDay1Images(): Promise<void> {
  try {
    console.log('📸 Preloading Day 1 images...');

    const imageAssets = SPIRITUAL_PLACE_IMAGES.map(image => {
      if (typeof image === 'string') {
        return Image.prefetch(image);
      } else {
        return Asset.fromModule(image).downloadAsync();
      }
    });

    await Promise.all(imageAssets);
    console.log('✅ Day 1 images preloaded successfully');
  } catch (error) {
    console.error('❌ Error preloading Day 1 images:', error);
    // Don't throw - this is a performance optimization, not critical
  }
}
