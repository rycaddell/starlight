import React from 'react';
import { View, Text } from 'react-native';

interface MirrorCardProps {
  journalText?: string;
  mirrorText?: string;
  timestamp?: string;
}

export default function MirrorCard({ journalText, mirrorText, timestamp }: MirrorCardProps) {
  return (
    <View 
      className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg mb-6 shadow-sm"
      style={{
        borderWidth: 1,
        borderColor: '#bfdbfe', // blue-200 equivalent
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <View className="p-6">
        {/* Journal Entry Section */}
        {journalText && (
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <Text className="text-xl mr-2">📝</Text>
              <Text className="text-lg font-semibold text-slate-700">
                Your Journal Entry
              </Text>
            </View>
            
            {/* Timestamp */}
            {timestamp && (
              <Text className="text-sm text-slate-500 mb-3">
                {timestamp}
              </Text>
            )}
            
            <Text className="text-slate-600 leading-6 text-base">
              {journalText}
            </Text>
          </View>
        )}
        
        {/* Divider if both sections exist */}
        {journalText && (
          <View 
            className="mb-6"
            style={{
              borderBottomWidth: 1,
              borderBottomColor: '#cbd5e1', // slate-300
            }}
          />
        )}
        
        {/* Mirror Reflection Section */}
        <View>
          {mirrorText && (
            <Text className="text-blue-700 leading-7 text-base">
              {mirrorText}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}