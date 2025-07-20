import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function JournalScreen() {
  const router = useRouter();

  // Navigate to Mirror tab with test data
  const handleNavigateToMirror = () => {
    router.push({
      pathname: '/(tabs)/mirror',
      params: {
        journalText: 'This is a test journal entry for navigation testing.',
        mirrorReflection: 'This is a sample mirror reflection based on your journal.'
      }
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 justify-center items-center p-4">
      <Text className="text-3xl font-bold text-slate-800 mb-2">
        ✨ Starlight
      </Text>
      <Text className="text-lg text-slate-600 mb-8 text-center">
        Your spiritual formation journal
      </Text>
      
      <Text className="text-slate-600 text-center mb-8">
        This is a placeholder for the journal input component.
      </Text>
      
      {/* Test navigation button */}
      <TouchableOpacity 
        onPress={handleNavigateToMirror}
        style={{
          backgroundColor: '#2563eb',
          paddingHorizontal: 32,
          paddingVertical: 16,
          borderRadius: 12,
          shadowColor: '#1e40af',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Text style={{
          color: 'white',
          fontWeight: 'bold',
          fontSize: 18,
          textAlign: 'center'
        }}>
          Test Navigation to Mirror
        </Text>
      </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}