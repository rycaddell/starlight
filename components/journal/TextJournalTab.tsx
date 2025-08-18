import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Dimensions } from 'react-native';

const { height } = Dimensions.get('window');

interface TextJournalTabProps {
  journalText: string;
  setJournalText: (text: string) => void;
  onSubmit: (text: string, timestamp: string) => void;
}

function TextJournalTab(props: TextJournalTabProps) {
  const { journalText, setJournalText, onSubmit } = props;
  const isSubmitDisabled = !journalText.trim();

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

      onSubmit(journalText.trim(), timestamp);
      setJournalText(''); // Clear input after submission
    }
  };

  return (
    <>
      {/* Text Input Field - Fixed height with internal scrolling */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          multiline={true}
          placeholder="What did you learn or hear today?"
          placeholderTextColor="#64748b"
          value={journalText}
          onChangeText={setJournalText}
          returnKeyType="default"
          scrollEnabled={true}
          showsVerticalScrollIndicator={true}
          textAlignVertical="top"
        />
      </View>

      {/* Submit Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          onPress={handleSubmit}
          disabled={isSubmitDisabled}
          style={[
            styles.submitButton,
            isSubmitDisabled ? styles.submitButtonDisabled : styles.submitButtonActive
          ]}
        >
          <Text style={[
            styles.submitButtonText,
            isSubmitDisabled ? styles.submitButtonTextDisabled : styles.submitButtonTextActive
          ]}>
            Submit
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    padding: 5,
    width: '100%',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    minHeight: 120,
    maxHeight: Math.min(height * 0.3, 170), // Reduced from 200px to 170px to scroll one line earlier
    textAlignVertical: 'top',
    borderWidth: 2,
    borderColor: '#94a3b8',
  },
  buttonContainer: {
    padding: 5,
    width: '100%',
  },
  submitButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
  },
  submitButtonActive: {
    backgroundColor: '#2563eb',
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  submitButtonText: {
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
  },
  submitButtonTextActive: {
    color: '#ffffff',
  },
  submitButtonTextDisabled: {
    color: '#64748b',
  },
});

export { TextJournalTab };
export default TextJournalTab;