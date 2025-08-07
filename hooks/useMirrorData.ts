import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { 
  getUserJournals, 
  getUserJournalCount, 
  checkAndGenerateMirror,
  insertTestJournalData 
} from '../lib/supabase';

type MirrorState = 'progress' | 'ready' | 'generating' | 'viewing';

export const useMirrorData = () => {
  const { user, isAuthenticated } = useAuth();
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [journalCount, setJournalCount] = useState(0);
  const [mirrorState, setMirrorState] = useState<MirrorState>('progress');
  const [generatedMirror, setGeneratedMirror] = useState(null);

  const loadJournals = async () => {
    if (!user) {
      console.error('No authenticated user found');
      return;
    }
    
    setLoading(true);
    try {
      const [journalsResult, countResult] = await Promise.all([
        getUserJournals(user.id),
        getUserJournalCount(user.id)
      ]);
      
      if (journalsResult.success) {
        setJournals(journalsResult.data);
      } else {
        console.error('Failed to load journals:', journalsResult.error);
        Alert.alert('Error', 'Failed to load journal entries. Please try again.');
      }
      
      if (countResult.success) {
        setJournalCount(countResult.count);
        setMirrorState(countResult.count >= 15 ? 'ready' : 'progress');
      }
    } catch (error) {
      console.error('Error loading journals:', error);
      Alert.alert('Error', 'Something went wrong loading your journals.');
    } finally {
      setLoading(false);
    }
  };

  const generateMirror = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to generate a Mirror.');
      return;
    }
    
    setMirrorState('generating');
    try {
      const result = await checkAndGenerateMirror(user.id);
      
      if (result.success) {
        console.log('✅ Mirror generation successful!');
        setGeneratedMirror(result.content);
      } else {
        console.error('❌ Mirror generation failed:', result.error);
        Alert.alert('Mirror Generation Failed', result.error);
        setMirrorState('ready');
      }
    } catch (error) {
      console.error('💥 Error during Mirror generation:', error);
      Alert.alert('Error', `Unexpected error: ${error.message}`);
      setMirrorState('ready');
    }
  };

  const insertTestData = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to insert test data.');
      return { success: false };
    }
    
    try {
      const result = await insertTestJournalData(user.id);
      
      if (result.success) {
        await loadJournals();
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return {
    // State
    journals,
    loading,
    journalCount,
    mirrorState,
    generatedMirror,
    
    // Actions
    loadJournals,
    generateMirror,
    insertTestData,
    setMirrorState,
    setGeneratedMirror,
    
    // Computed
    isReady: mirrorState === 'ready',
    isGenerating: mirrorState === 'generating',
    isViewing: mirrorState === 'viewing' && generatedMirror
  };
};