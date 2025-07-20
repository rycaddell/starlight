import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function JournalScreen() {
  const router = useRouter();
  const [journalText, setJournalText] = useState('');

  // Navigate to Mirror tab with journal data and timestamp
  const handleSubmit = () => {
    if (journalText.trim()) {
      const timestamp = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      router.push({
        pathname: '/(tabs)/mirror',
        params: {
          journalText: journalText.trim(),
          timestamp: timestamp
        }
      });

      // Clear the text input after submission
      setJournalText('');
    }
  };

  const isSubmitDisabled = !journalText.trim();

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1">
        <View className="flex-1 justify-center items-center p-4 min-h-screen">
          <Text className="text-3xl font-bold text-slate-800 mb-2">
            ✨ Starlight
          </Text>
          <Text className="text-lg text-slate-600 mb-8 text-center">
            Your spiritual formation journal
          </Text>
          
          <Text className="text-lg text-slate-700 mb-4 self-start w-full">
            What's on your heart today?
          </Text>
          
          {/* Text Input Field - 4 lines minimum, grows as needed */}
          <TextInput
            className="bg-white rounded-lg p-4 text-base text-slate-800 mb-6 w-full"
            style={{
              minHeight: 120, // Approximately 4 lines
              textAlignVertical: 'top',
              borderWidth: 2,
              borderColor: '#94a3b8', // slate-400 equivalent
            }}
            multiline={true}
            placeholder="Share your thoughts, reflections, or prayers..."
            placeholderTextColor="#64748b"
            value={journalText}
            onChangeText={setJournalText}
            returnKeyType="default"
          />

          {/* Submit Button */}
          <TouchableOpacity 
            onPress={handleSubmit}
            disabled={isSubmitDisabled}
            style={{
              backgroundColor: isSubmitDisabled ? '#cbd5e1' : '#2563eb',
              paddingHorizontal: 32,
              paddingVertical: 16,
              borderRadius: 12,
              shadowColor: isSubmitDisabled ? 'transparent' : '#1e40af',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isSubmitDisabled ? 0 : 0.3,
              shadowRadius: 8,
              elevation: isSubmitDisabled ? 0 : 8,
              width: '100%',
            }}
          >
            <Text style={{
              color: isSubmitDisabled ? '#64748b' : 'white',
              fontWeight: 'bold',
              fontSize: 18,
              textAlign: 'center'
            }}>
              Submit
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}