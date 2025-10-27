// components/journal/GuidedPromptCarousel.tsx
import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Text, Dimensions } from 'react-native';
import { GuidedPromptCard } from './GuidedPromptCard';
import { GuidedPrompt } from '../../lib/constants/guidedPrompts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GuidedPromptCarouselProps {
  prompts: GuidedPrompt[];
  onPromptSelect: (prompt: GuidedPrompt) => void;
}

export const GuidedPromptCarousel: React.FC<GuidedPromptCarouselProps> = ({
  prompts,
  onPromptSelect,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const onScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / SCREEN_WIDTH);
    setCurrentIndex(Math.min(Math.max(index, 0), prompts.length - 1));
  };

  if (prompts.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <FlatList
          data={prompts}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          onScroll={onScroll}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <GuidedPromptCard 
              prompt={item} 
              onPress={() => onPromptSelect(item)} 
            />
          )}
          keyExtractor={(item) => item.id}
        />
      </View>
      
      {/* Pagination dots */}
      <View style={styles.paginationContainer}>
        <View style={styles.pagination}>
          {prompts.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
        <Text style={styles.swipeHint}>swipe for more</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 24,
  },
  container: {
    // No padding - cards handle their own inset
  },
  paginationContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  dotActive: {
    backgroundColor: '#2563eb',
    width: 24,
  },
  swipeHint: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 6,
  },
});