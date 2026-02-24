// components/day1/Step1SpiritualPlace.tsx
// Step 1: Spiritual place selection with image preview

import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { saveSpiritualPlace } from '../../lib/supabase/day1';
import { colors, typography, spacing, borderRadius } from '../../theme/designTokens';

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
    backgroundColor: colors.background.defaultLight,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  bottomHalf: {
    flex: 1,
    backgroundColor: colors.background.white,
    borderTopLeftRadius: borderRadius.sheet,
    borderTopRightRadius: borderRadius.sheet,
    marginTop: -30,
  },
  scrollContent: {
    padding: spacing.xxxl,
  },
  question: {
    ...typography.heading.l,
    color: colors.text.body,
    textAlign: 'left',
    marginBottom: spacing.xxxl,
  },
  subtext: {
    ...typography.body.default,
    color: colors.text.bodyLight,
    textAlign: 'left',
    marginBottom: spacing.xxxl,
  },
  choicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.m,
    justifyContent: 'space-between',
    marginBottom: spacing.xxxl,
  },
  choiceButton: {
    width: '48%',
    paddingVertical: spacing.l,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.background.white,
    borderWidth: 1.5,
    borderColor: colors.border.outline,
    alignItems: 'center',
  },
  choiceButtonSelected: {
    backgroundColor: colors.text.primary,
    borderColor: colors.text.primary,
  },
  choiceText: {
    ...typography.heading.s,
    color: colors.text.primary,
  },
  choiceTextSelected: {
    color: colors.text.white,
  },
  nextButton: {
    backgroundColor: colors.text.primary,
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.button,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: colors.background.disabled,
  },
  nextButtonText: {
    ...typography.heading.default,
    color: colors.text.white,
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
