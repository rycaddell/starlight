// components/mirror/MirrorScreen1.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MirrorScreen1Props {
  data: any;
}

export const MirrorScreen1: React.FC<MirrorScreen1Props> = ({ data }) => (
  <View style={styles.screenContent}>
    <Text style={styles.screenTitle}>{data.title}</Text>
    <Text style={styles.screenSubtitle}>{data.subtitle}</Text>
    
    <View style={styles.themesContainer}>
      {data.themes && data.themes.map((theme: any, index: number) => (
        <View key={index} style={styles.themeCard}>
          <Text style={styles.themeName}>{theme.name}</Text>
          <Text style={styles.themeDescription}>{theme.description}</Text>
          <Text style={styles.themeFrequency}>{theme.frequency}</Text>
        </View>
      ))}
    </View>
    
    <View style={styles.insightContainer}>
      <Text style={styles.insightText}>{data.insight}</Text>
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
  themesContainer: {
    gap: 16,
    marginBottom: 30,
  },
  themeCard: {
    backgroundColor: '#334155',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#fbbf24',
  },
  themeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 8,
  },
  themeDescription: {
    fontSize: 16,
    color: '#cbd5e1',
    marginBottom: 4,
    lineHeight: 22,
  },
  themeFrequency: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  insightContainer: {
    backgroundColor: '#0f172a',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  insightText: {
    fontSize: 18,
    color: '#fbbf24',
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '500',
  },
});