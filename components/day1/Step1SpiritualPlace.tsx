// components/day1/Step1SpiritualPlace.tsx
// Step 1: Spiritual place selection with image preview

import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { saveSpiritualPlace } from '../../lib/supabase/day1';

interface Step1SpiritualPlaceProps {
  userId: string;
  initialSelection: string | null;
  onComplete: (spiritualPlace: string) => void;
}

const SPIRITUAL_PLACES = [
  'Adventuring',
  'Battling',
  'Hiding',
  'Resting',
  'Working',
  'Wandering',
  'Grieving',
  'Celebrating',
];

// Spiritual place images (optimized JPGs)
const SPIRITUAL_PLACE_IMAGES: { [key: string]: any } = {
  'Adventuring': require('../../assets/images/spiritual-places/adventuring.jpg'),
  'Battling': require('../../assets/images/spiritual-places/battling.jpg'),
  'Hiding': require('../../assets/images/spiritual-places/hiding.jpg'),
  'Resting': require('../../assets/images/spiritual-places/resting.jpg'),
  'Working': require('../../assets/images/spiritual-places/working.jpg'),
  'Wandering': require('../../assets/images/spiritual-places/wandering.jpg'),
  'Grieving': require('../../assets/images/spiritual-places/grieving.jpg'),
  'Celebrating': require('../../assets/images/spiritual-places/celebrating.jpg'),
};

// Default image when nothing is selected
const DEFAULT_IMAGE = require('../../assets/images/spiritual-places/default.jpg');

export const Step1SpiritualPlace: React.FC<Step1SpiritualPlaceProps> = ({
  userId,
  initialSelection,
  onComplete,
}) => {
  const [selectedPlace, setSelectedPlace] = useState<string | null>(initialSelection);
  const [saving, setSaving] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(false);

  const handleSelectPlace = (place: string) => {
    console.log('📍 Selected spiritual place:', place);
    setSelectedPlace(place);
  };

  const handleNext = async () => {
    if (!selectedPlace) {
      Alert.alert('Selection Required', 'Please choose a spiritual place before continuing.');
      return;
    }

    setSaving(true);

    const result = await saveSpiritualPlace(userId, selectedPlace);

    if (result.success) {
      console.log('✅ Spiritual place saved');
      onComplete(selectedPlace);
    } else {
      Alert.alert('Save Error', result.error || 'Failed to save your selection. Please try again.');
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top half: Image preview */}
      <TouchableOpacity
        style={styles.imageContainer}
        onPress={() => setFullscreenImage(true)}
        activeOpacity={0.9}
      >
        <Image
          source={selectedPlace ? SPIRITUAL_PLACE_IMAGES[selectedPlace] : DEFAULT_IMAGE}
          style={styles.image}
          resizeMode="cover"
        />
      </TouchableOpacity>

      {/* Fullscreen Image Modal */}
      <Modal
        visible={fullscreenImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullscreenImage(false)}
      >
        <TouchableOpacity
          style={styles.fullscreenContainer}
          activeOpacity={1}
          onPress={() => setFullscreenImage(false)}
        >
          <Image
            source={selectedPlace ? SPIRITUAL_PLACE_IMAGES[selectedPlace] : DEFAULT_IMAGE}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Modal>

      {/* Bottom half: Question and choices */}
      <ScrollView style={styles.bottomHalf} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.question}>Where are you?</Text>

        {/* Choice buttons - 2x4 grid */}
        <View style={styles.choicesGrid}>
          {SPIRITUAL_PLACES.map((place) => (
            <TouchableOpacity
              key={place}
              style={[
                styles.choiceButton,
                selectedPlace === place && styles.choiceButtonSelected,
              ]}
              onPress={() => handleSelectPlace(place)}
            >
              <Text
                style={[
                  styles.choiceText,
                  selectedPlace === place && styles.choiceTextSelected,
                ]}
              >
                {place}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Next button */}
        <TouchableOpacity
          style={[
            styles.nextButton,
            (!selectedPlace || saving) && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!selectedPlace || saving}
        >
          <Text style={styles.nextButtonText}>
            {saving ? 'Saving...' : 'Next'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    flex: 1,
    backgroundColor: '#e2e8f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  bottomHalf: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  scrollContent: {
    padding: 24,
  },
  question: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'left',
    marginBottom: 24,
  },
  subtext: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'left',
    marginBottom: 24,
  },
  choicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  choiceButton: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#2563eb',
    alignItems: 'center',
  },
  choiceButtonSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  choiceText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563eb',
  },
  choiceTextSelected: {
    color: '#ffffff',
  },
  nextButton: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
});
