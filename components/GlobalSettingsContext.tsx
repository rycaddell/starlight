import React, { createContext, useContext, useState } from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
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
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Image
              source={require('../assets/images/icons/Settings.png')}
              style={styles.buttonIcon}
              resizeMode="contain"
            />
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
    top: 60,
    right: 20,
    zIndex: 9999,
  },
  buttonIcon: {
    width: 28,
    height: 28,
  },
});