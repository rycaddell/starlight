// components/mirror/MirrorScreen4.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MirrorScreen4Props {
  data: any;
}

export const MirrorScreen4: React.FC<MirrorScreen4Props> = ({ data }) => (
  <View style={styles.screenContent}>
    <Text style={styles.screenTitle}>{data.title}</Text>
    <Text style={styles.screenSubtitle}>{data.subtitle}</Text>
    
    {/* Prayer Focus */}
    <View style={styles.suggestionSection}>
      <Text style={styles.suggestionTitle}>🙏 Prayer Focus</Text>
      {data.prayer_focus.map((item: string, index: number) => (
        <Text key={index} style={styles.suggestionItem}>• {item}</Text>
      ))}
    </View>
    
    {/* Journaling Prompts */}
    <View style={styles.suggestionSection}>
      <Text style={styles.suggestionTitle}>📝 Journaling Prompts</Text>
      {data.journaling_prompts.map((item: string, index: number) => (
        <Text key={index} style={styles.suggestionItem}>• {item}</Text>
      ))}
    </View>
    
    {/* Spiritual Practices */}
    <View style={styles.suggestionSection}>
      <Text style={styles.suggestionTitle}>🕊️ Spiritual Practices</Text>
      {data.spiritual_practices.map((item: string, index: number) => (
        <Text key={index} style={styles.suggestionItem}>• {item}</Text>
      ))}
    </View>
    
    {/* Final Encouragement */}
    <View style={styles.finalEncouragement}>
      <Text style={styles.encouragementFinalText}>{data.encouragement}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 8,
  },
  screenSubtitle: {
    fontSize: 18,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 30,
    fontStyle: 'italic',
  },
  suggestionSection: {
    marginBottom: 24,
  },
  suggestionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fbbf24',
    marginBottom: 12,
  },
  suggestionItem: {
    fontSize: 16,
    color: '#cbd5e1',
    marginBottom: 8,
    lineHeight: 22,
    paddingLeft: 8,
  },
  finalEncouragement: {
    backgroundColor: '#0f172a',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fbbf24',
    marginTop: 20,
  },
  encouragementFinalText: {
    fontSize: 18,
    color: '#fbbf24',
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '500',
  },
});