import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useMirrorData } from '../../hooks/useMirrorData';
import { MirrorProgress } from '../../components/journal/MirrorProgress';
import { MirrorUnlockButton } from '../../components/mirror/MirrorUnlockButton';
import { MirrorLoadingAnimation } from '../../components/mirror/MirrorLoadingAnimation';
import { MirrorViewer } from '../../components/mirror/MirrorViewer';
import { MirrorTestPanel } from '../../components/mirror/MirrorTestPanel';
import { JournalHistory } from '../../components/mirror/JournalHistory';

export default function MirrorScreen() {
  const router = useRouter();
  const { user, signOut, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const {
    journals,
    loading,
    journalCount,
    mirrorState,
    generatedMirror,
    loadJournals,
    generateMirror,
    insertTestData,
    setMirrorState,
    setGeneratedMirror,
    isReady,
    isGenerating,
    isViewing
  } = useMirrorData();

  // Load journals when component mounts or user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      loadJournals();
    }
  }, [isAuthenticated, user]);

  // Reload journals when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && user) {
        loadJournals();
      }
    }, [isAuthenticated, user])
  );

  const handleTempLogout = () => {
    Alert.alert(
      '🚪 Test Logout',
      'This will sign you out to test the code entry screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut }
      ]
    );
  };

  const handleLoadingComplete = () => {
    if (generatedMirror) {
      setMirrorState('viewing');
    }
  };

  const handleCloseMirror = () => {
    setMirrorState('progress');
    setGeneratedMirror(null);
    loadJournals();
  };

  const handleGoBack = () => {
    router.push('/(tabs)/');
  };

  // Loading states
  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your spiritual journey...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Please sign in to view your Mirror.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Modal states
  if (isViewing) {
    return (
      <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
        <MirrorViewer 
          mirrorContent={generatedMirror} 
          onClose={handleCloseMirror}
        />
      </Modal>
    );
  }

  if (isGenerating) {
    return (
      <Modal visible={true} animationType="fade" presentationStyle="overFullScreen">
        <MirrorLoadingAnimation 
          isComplete={!!generatedMirror} 
          onComplete={handleLoadingComplete} 
        />
      </Modal>
    );
  }

  // Main UI
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Mirror</Text>
          
          <Text style={styles.greeting}>
            Welcome back, {user.display_name}! ✨
          </Text>
          
          <View style={styles.progressSection}>
            <MirrorProgress currentCount={journalCount} />
          </View>

          {isReady && (
            <View style={styles.mirrorReadySection}>
              <MirrorUnlockButton 
                onPress={generateMirror}
                disabled={false}
              />
            </View>
          )}

          <MirrorTestPanel 
            journalCount={journalCount}
            totalJournals={journals.length}
            onInsertTestData={insertTestData}
          />

          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>
              Journal History ({journals.length} {journals.length === 1 ? 'entry' : 'entries'})
            </Text>
            
            <JournalHistory 
              journals={journals}
              loading={loading}
            />
          </View>

          <TouchableOpacity 
            onPress={handleGoBack}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>
              ← Back to Journal
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Add this at the very end of your mirror.tsx file

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  greeting: {
    fontSize: 18,
    color: '#059669',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  tempLogoutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 16,
    alignSelf: 'center',
  },
  tempLogoutButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressSection: {
    marginBottom: 32,
  },
  mirrorReadySection: {
    marginBottom: 32,
  },
  historySection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  backButton: {
    backgroundColor: '#475569',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 18,
  },
});