/**
 * JournalTabs Component
 * 
 * Handles the tab navigation interface for switching between text and voice journaling.
 * Provides visual feedback for active/inactive states and smooth tab switching.
 * 
 * Features:
 * - Text and Voice tab buttons with icons
 * - Active/inactive visual states
 * - Proper touch targets for easy interaction
 * - Clean, accessible design
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type TabType = 'text' | 'voice';

interface JournalTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const JournalTabs: React.FC<JournalTabsProps> = ({
  activeTab,
  onTabChange
}) => {
  return (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'text' ? styles.activeTab : styles.inactiveTab
        ]}
        onPress={() => onTabChange('text')}
      >
        <Text style={[
          styles.tabText,
          activeTab === 'text' ? styles.activeTabText : styles.inactiveTabText
        ]}>
          📝 Text
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'voice' ? styles.activeTab : styles.inactiveTab
        ]}
        onPress={() => onTabChange('voice')}
      >
        <Text style={[
          styles.tabText,
          activeTab === 'voice' ? styles.activeTabText : styles.inactiveTabText
        ]}>
          🎤 Voice
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 24,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
  },
  activeTab: {
    backgroundColor: '#2563eb', // blue-600
    borderColor: '#2563eb',
  },
  inactiveTab: {
    backgroundColor: '#ffffff',
    borderColor: '#94a3b8', // slate-400
  },
  tabText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
  },
  inactiveTabText: {
    color: '#64748b', // slate-600
  },
});