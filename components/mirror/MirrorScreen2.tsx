// components/mirror/MirrorScreen2.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MirrorScreen2Props {
  data: any;
}

export const MirrorScreen2: React.FC<MirrorScreen2Props> = ({ data }) => (
  <View style={styles.screenContent}>
    <Text style={styles.screenTitle}>{data.title}</Text>
    <Text style={styles.screenSubtitle}>{data.subtitle}</Text>
    
    {/* Biblical Parallel */}
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Your Biblical Mirror</Text>
      <Text style={styles.characterName}>{data.parallel_story.character}</Text>
      <Text style={styles.storyText}>{data.parallel_story.story}</Text>
      <Text style={styles.connectionText}>{data.parallel_story.connection}</Text>
    </View>
    
    {/* Encouraging Verse */}
    <View style={styles.verseCard}>
      <Text style={styles.verseLabel}>Encouraging Word</Text>
      <Text style={styles.verseReference}>{data.encouraging_verse.reference}</Text>
      <Text style={styles.verseText}>"{data.encouraging_verse.text}"</Text>
      <Text style={styles.verseApplication}>{data.encouraging_verse.application}</Text>
    </View>
    
    {/* Challenging Verse */}
    <View style={styles.verseCard}>
      <Text style={styles.verseLabel}>Invitation to Growth</Text>
      <Text style={styles.verseReference}>{data.challenging_verse.reference}</Text>
      <Text style={styles.verseText}>"{data.challenging_verse.text}"</Text>
      <Text style={styles.verseInvitation}>{data.challenging_verse.invitation}</Text>
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
  sectionCard: {
    backgroundColor: '#334155',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fbbf24',
    marginBottom: 12,
  },
  characterName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  storyText: {
    fontSize: 16,
    color: '#cbd5e1',
    marginBottom: 12,
    lineHeight: 22,
  },
  connectionText: {
    fontSize: 16,
    color: '#fbbf24',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  verseCard: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  verseLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 8,
  },
  verseReference: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  verseText: {
    fontSize: 16,
    color: '#cbd5e1',
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 22,
  },
  verseApplication: {
    fontSize: 16,
    color: '#94a3b8',
    lineHeight: 22,
  },
  verseInvitation: {
    fontSize: 16,
    color: '#94a3b8',
    lineHeight: 22,
  },
});