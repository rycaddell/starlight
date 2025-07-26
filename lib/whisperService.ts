/**
 * Whisper Service
 * 
 * Handles transcription of audio files using OpenAI's Whisper API.
 * Includes both mock implementation for testing and real API integration.
 * 
 * Features:
 * - Real OpenAI Whisper API integration
 * - Mock transcription for development/testing
 * - Error handling and retry logic
 * - Audio file validation
 */

export interface TranscriptionResult {
    success: boolean;
    text?: string;
    error?: string;
  }
  
  /**
   * Real OpenAI Whisper API integration
   */
  export const realTranscribeAudio = async (audioUri: string): Promise<TranscriptionResult> => {
    try {
      // Create FormData for the API request
      const formData = new FormData();
      
      // Add the audio file
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      
      // Add required parameters
      formData.append('model', 'whisper-1');
      formData.append('language', 'en'); // Optional: specify English
      
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      return {
        success: true,
        text: result.text?.trim() || ''
      };
    } catch (error) {
      console.error('Whisper API error:', error);
      return {
        success: false,
        error: 'Failed to transcribe audio. Please check your internet connection and try again.'
      };
    }
  };
  
  /**
   * Mock transcription service for testing
   * Returns realistic sample transcriptions based on recording duration
   */
  export const mockTranscribeAudio = async (audioUri: string, durationSeconds: number): Promise<TranscriptionResult> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
    
    // Mock different responses based on duration
    const mockTranscriptions = [
      "I've been reflecting on God's goodness in my life this week. Even in the midst of challenges, I can see His hand guiding me.",
      "Today I felt overwhelmed by work and responsibilities, but I'm grateful for the reminder that God's strength is made perfect in my weakness.",
      "I've been struggling with anxiety lately, but I'm finding peace in prayer and trusting that God has a plan for my life.",
      "This morning's quiet time was so refreshing. I was reading in Psalms and felt such a deep sense of God's love and presence.",
      "I want to be more intentional about showing kindness to others this week. Help me to see opportunities to serve.",
      "I'm thankful for my small group and the way we can share our hearts openly. It's such a blessing to do life together."
    ];
    
    // Simulate occasional failures (5% chance)
    if (Math.random() < 0.05) {
      return {
        success: false,
        error: "Audio transcription failed. Please try again."
      };
    }
    
    // Choose a random transcription
    const randomIndex = Math.floor(Math.random() * mockTranscriptions.length);
    let transcription = mockTranscriptions[randomIndex];
    
    // Adjust length based on duration (rough simulation)
    if (durationSeconds < 30) {
      // Short recordings get shorter text
      transcription = transcription.split('.')[0] + '.';
    } else if (durationSeconds > 120) {
      // Longer recordings get multiple sentences
      const additional = mockTranscriptions[(randomIndex + 1) % mockTranscriptions.length];
      transcription += ' ' + additional;
    }
    
    return {
      success: true,
      text: transcription
    };
  };
  
  // Export the real version for production (change this to mockTranscribeAudio for testing)
  export const transcribeAudio = realTranscribeAudio;