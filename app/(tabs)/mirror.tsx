import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MirrorCard from '../../components/MirrorCard';

export default function MirrorScreen() {
  const router = useRouter();
  const { journalText, timestamp, mirrorReflection } = useLocalSearchParams();

  const handleGoBack = () => {
    // Navigate back to Journal tab
    router.push('/(tabs)/');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1">
        <View className="p-4">
          <Text className="text-2xl font-bold text-slate-800 mb-4 text-center">
            ✨ Your Mirror
          </Text>
          
          {/* Combined Journal Entry, Timestamp, and Mirror Reflection in MirrorCard */}
          <MirrorCard 
            journalText={journalText as string} 
            mirrorText={mirrorReflection as string}
            timestamp={timestamp as string}
          />

          {/* Back to Journal button */}
          <TouchableOpacity 
            onPress={handleGoBack}
            style={{
              backgroundColor: '#475569',
              paddingHorizontal: 24,
              paddingVertical: 16,
              borderRadius: 12,
              marginTop: 16,
            }}
          >
            <Text style={{
              color: 'white',
              fontWeight: '600',
              textAlign: 'center',
              fontSize: 18,
            }}>
              Back to Journal
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}