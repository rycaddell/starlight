import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { MIRROR_THRESHOLD } from '../../lib/config/constants';

interface MirrorTestPanelProps {
  journalCount: number;
  totalJournals: number;
  onInsertTestData: () => Promise<{ success: boolean; data?: any; error?: string }>;
}

export const MirrorTestPanel: React.FC<MirrorTestPanelProps> = ({
  journalCount,
  totalJournals,
  onInsertTestData
}) => {
  const [testLoading, setTestLoading] = useState(false);

  const handleInsertTestData = async () => {
    setTestLoading(true);
    try {
      const result = await onInsertTestData();
      if (result.success) {
        Alert.alert('Success', `Inserted ${result.data.length} test journal entries!`);
      } else {
        Alert.alert('Error', `Failed to insert test data: ${result.error}`);
      }
    } catch (error) {
      Alert.alert('Error', `Unexpected error: ${error.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <View style={styles.testSection}>
      <Text style={styles.testTitle}>🧪 Testing (Remove Later)</Text>
      
      <TouchableOpacity 
        style={styles.testButton}
        onPress={handleInsertTestData}
        disabled={testLoading}
      >
        <Text style={styles.testButtonText}>
          {testLoading ? 'Inserting...' : '📝 Insert 10 Test Journals'}
        </Text>
      </TouchableOpacity>
      
      <Text style={styles.testNote}>
        Current unassigned journals: {journalCount}/{MIRROR_THRESHOLD}
      </Text>
      <Text style={styles.testNote}>
        Total journals: {totalJournals}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  testSection: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  testTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 12,
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  testNote: {
    fontSize: 12,
    color: '#92400e',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
