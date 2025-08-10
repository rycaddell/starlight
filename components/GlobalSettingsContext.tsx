import React, { createContext, useContext, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { SettingsFeedbackModal } from './SettingsFeedbackModal';  // Same directory
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../contexts/OnboardingContext';

interface GlobalSettingsContextType {
  showSettings: () => void;
}

const GlobalSettingsContext = createContext<GlobalSettingsContextType | undefined>(undefined);

interface GlobalSettingsProviderProps {
  children: React.ReactNode;
}

export function GlobalSettingsProvider({ children }: GlobalSettingsProviderProps) {
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const { isAuthenticated } = useAuth();
  const { isOnboardingComplete } = useOnboarding();

  const showSettings = () => {
    setIsSettingsVisible(true);
  };

  const hideSettings = () => {
    setIsSettingsVisible(false);
  };

  const contextValue: GlobalSettingsContextType = {
    showSettings,
  };

  // Only show settings button when authenticated AND onboarding is complete
  const shouldShowSettings = isAuthenticated && isOnboardingComplete;

  return (
    <GlobalSettingsContext.Provider value={contextValue}>
      <View style={styles.container}>
        {children}
        
        {/* Floating Settings Button - Only show when authenticated and onboarding complete */}
        {shouldShowSettings && (
          <TouchableOpacity 
            style={styles.floatingButton}
            onPress={showSettings}
            activeOpacity={0.8}
          >
            <View style={styles.buttonInner}>
              <Text style={styles.buttonText}>⚙️</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Settings Modal */}
        <SettingsFeedbackModal 
          visible={isSettingsVisible}
          onClose={hideSettings}
        />
      </View>
    </GlobalSettingsContext.Provider>
  );
}

export function useGlobalSettings() {
  const context = useContext(GlobalSettingsContext);
  if (context === undefined) {
    throw new Error('useGlobalSettings must be used within a GlobalSettingsProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  floatingButton: {
    position: 'absolute',
    top: 60, // Higher up, below status bar
    right: 20,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  buttonInner: {
    width: 36, // Smaller
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Semi-transparent dark
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18, // Smaller icon
    color: '#ffffff',
  },
});