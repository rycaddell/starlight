import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function MirrorScreen() {
  const router = useRouter();
  const { journalText, mirrorReflection } = useLocalSearchParams();

  const handleGoBack = () => {
    // Navigate back to Journal tab
    router.push('/(tabs)/');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1">
        <View className="p-4">
          <Text className="text-2xl font-bold text-slate-800 mb-4 text-center">
            ✨ Mirror Reflection
          </Text>
          
          <Text className="text-slate-600 mb-6 text-center">
            This is a placeholder for the mirror reflection component.
          </Text>

          {/* Display passed journal text */}
          {journalText && (
            <View className="bg-white p-4 rounded-lg mb-4 shadow-sm border border-slate-200">
              <Text className="text-sm font-semibold text-slate-700 mb-2">
                📝 Your Journal Entry:
              </Text>
              <Text className="text-slate-600 leading-6">{journalText}</Text>
            </View>
          )}

          {/* Display mirror reflection */}
          {mirrorReflection && (
            <View className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg mb-6 shadow-sm border border-blue-200">
              <Text className="text-sm font-semibold text-blue-700 mb-2">
                🪞 Mirror Reflection:
              </Text>
              <Text className="text-blue-600 leading-6">{mirrorReflection}</Text>
            </View>
          )}

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