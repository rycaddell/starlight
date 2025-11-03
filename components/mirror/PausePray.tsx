// components/mirror/MirrorScreen4PausePray.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

function PausePray() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pause & Pray</Text>
      
      <Text style={styles.heading}>What do you want to say to God?</Text>
      
      <Text style={styles.body}>
        Take a minute in silence to breathe and listen. Then ask God what he wants for you.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 32,
    textAlign: 'center',
  },
  heading: {
    fontSize: 24,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 24,
    textAlign: 'center',
  },
  body: {
    fontSize: 18,
    lineHeight: 28,
    color: '#94a3b8',
    textAlign: 'center',
    maxWidth: 500,
  },
});

export default PausePray;