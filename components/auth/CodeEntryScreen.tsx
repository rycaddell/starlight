// components/auth/CodeEntryScreen.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CodeEntryScreenProps {
  onCodeSubmit: (code: string) => Promise<{ success: boolean; error?: string }>;
  loading?: boolean;
}

export function CodeEntryScreen({ onCodeSubmit, loading = false }: CodeEntryScreenProps) {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedCode = code.trim().toLowerCase();
    
    console.log('🔑 handleSubmit called with code:', trimmedCode);
    
    if (!trimmedCode) {
      Alert.alert('Missing Code', 'Please enter your access code to continue.');
      return;
    }

    if (trimmedCode.length < 3) {
      Alert.alert('Invalid Code', 'Access codes must be at least 3 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('🚀 Calling onCodeSubmit...');
      const result = await onCodeSubmit(trimmedCode);
      console.log('✅ onCodeSubmit result:', result);
      
      if (!result.success) {
        Alert.alert('Sign In Failed', result.error || 'Invalid access code. Please try again.');
      }
    } catch (error) {
      console.error('Code submission error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = loading || isSubmitting;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>✨ Starlight</Text>
            <Text style={styles.subtitle}>Your spiritual formation companion</Text>
          </View>

          {/* Code Entry Form */}
          <View style={styles.form}>
            <Text style={styles.label}>Enter your access code</Text>
            
            <TextInput
              style={[styles.input, isDisabled && styles.inputDisabled]}
              value={code}
              onChangeText={(text) => {
                console.log('📝 Text input changed:', text);
                setCode(text);
              }}
              placeholder="e.g. test123"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              autoFocus={true}
              selectTextOnFocus={true}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              editable={!isDisabled}
              blurOnSubmit={false}
              onFocus={() => console.log('🔍 Input focused')}
              onBlur={() => console.log('💨 Input blurred')}
            />

            <TouchableOpacity
              style={[styles.button, isDisabled && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isDisabled}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Help Text */}
          <View style={styles.help}>
            <Text style={styles.helpText}>
              Don't have a code? Contact your group leader.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 26,
  },
  form: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    color: '#1e293b',
    backgroundColor: 'white',
    marginBottom: 20,
    minHeight: 56,
  },
  inputDisabled: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
  },
  button: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  help: {
    alignItems: 'center',
  },
  helpText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});