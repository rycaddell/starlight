// components/mirror/MirrorScreen3.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MirrorScreen3Props {
  data: any;
}

export const MirrorScreen3: React.FC<MirrorScreen3Props> = ({ data }) => (
  <View style={styles.screenContent}>
    <Text style={styles.screenTitle}>Observations</Text>
    <Text style={styles.screenSubtitle}>Patterns in your framing</Text>
    
    {/* How You See Yourself */}
    {data.self_perception && (
      <View style={styles.observationCard}>
        <Text style={styles.observationTitle}>How You See Yourself</Text>
        <Text style={styles.observationText}>{data.self_perception.observation}</Text>
      </View>
    )}
    
    {/* Your Relationship with God */}
    {data.god_perception && (
      <View style={styles.observationCard}>
        <Text style={styles.observationTitle}>Your Relationship with God</Text>
        <Text style={styles.observationText}>{data.god_perception.observation}</Text>
      </View>
    )}
    
    {/* How You View Others */}
    {data.others_perception && (
      <View style={styles.observationCard}>
        <Text style={styles.observationTitle}>How You View Others</Text>
        <Text style={styles.observationText}>{data.others_perception.observation}</Text>
      </View>
    )}
    
    {/* Growth Opportunities / Blind Spots */}
    {data.blind_spots && (
      <View style={styles.observationCard}>
        <Text style={styles.observationTitle}>Patterns You May Not Notice</Text>
        <Text style={styles.observationText}>{data.blind_spots.observation}</Text>
      </View>
    )}
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
  observationCard: {
    backgroundColor: '#334155',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  observationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fbbf24',
    marginBottom: 12,
  },
  observationText: {
    fontSize: 16,
    color: '#cbd5e1',
    marginBottom: 8,
    lineHeight: 22,
  },
  growthEdge: {
    fontSize: 16,
    color: '#94a3b8',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  invitationText: {
    fontSize: 16,
    color: '#94a3b8',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  challengeText: {
    fontSize: 16,
    color: '#f59e0b',
    fontWeight: '500',
    lineHeight: 22,
  },
  growthOpportunityText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '500',
    lineHeight: 22,
  },
});