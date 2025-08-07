import { supabase, openai } from './client';

// Generate Mirror prompt from journal entries (unchanged)
export const generateMirrorPrompt = (journalEntries) => {
  const journalText = journalEntries.map((entry, index) => 
    `Entry ${index + 1} (${new Date(entry.created_at).toLocaleDateString()}): ${entry.content}`
  ).join('\n\n');

  return `You are a wise, compassionate spiritual director analyzing someone's journal entries to provide encouraging spiritual formation insights. 

JOURNAL ENTRIES TO ANALYZE:
${journalText}

Please generate a "Mirror" - a 4-screen spiritual reflection in JSON format with exactly this structure:

{
  "screen1_themes": {
    "title": "Your Spiritual Themes",
    "subtitle": "What patterns emerged in your journey",
    "themes": [
      {
        "name": "Theme Name",
        "description": "Brief description of this theme",
        "frequency": "How often this appeared"
      }
    ],
    "insight": "One encouraging insight about their spiritual patterns"
  },
  "screen2_biblical": {
    "title": "Biblical Mirror", 
    "subtitle": "Scripture that speaks to your journey",
    "parallel_story": {
      "character": "Biblical character name",
      "story": "Brief story summary that parallels their experience",
      "connection": "How this connects to their journey"
    },
    "encouraging_verse": {
      "reference": "Bible verse reference",
      "text": "Verse text",
      "application": "How this verse speaks to their situation"
    },
    "challenging_verse": {
      "reference": "Bible verse reference", 
      "text": "Verse text",
      "invitation": "Gentle invitation for deeper reflection"
    }
  },
  "screen3_observations": {
    "title": "What I Notice",
    "subtitle": "Patterns in how you see yourself and God",
    "self_perception": {
      "observation": "How they tend to view themselves spiritually",
      "growth_edge": "Area for gentle growth"
    },
    "god_perception": {
      "observation": "How they tend to relate to or view God",
      "invitation": "Invitation to explore this relationship further"
    },
    "growth_pattern": {
      "observation": "Overall growth or change pattern observed",
      "encouragement": "Encouraging word about their spiritual development"
    }
  },
  "screen4_suggestions": {
    "title": "Your Next Steps",
    "subtitle": "Invitations for continued growth",
    "prayer_focus": [
      "Specific area for prayer attention",
      "Another prayer focus area"
    ],
    "journaling_prompts": [
      "Thoughtful question for future journaling",
      "Another reflective prompt"
    ],
    "spiritual_practices": [
      "Suggested spiritual discipline or practice",
      "Another practice suggestion"
    ],
    "encouragement": "Final encouraging word for their continued journey"
  }
}

TONE GUIDELINES:
- Warm, encouraging, and non-judgmental
- Acknowledge struggles without being dismissive
- Find genuine hope and growth even in difficult seasons
- Use accessible, modern language while remaining spiritually grounded
- Be specific to their actual journal content, not generic
- Balance affirmation with gentle invitations for growth

Generate only the JSON response with no additional text.`;
};

// Generate Mirror using OpenAI GPT-4 (unchanged)
export const generateMirrorWithAI = async (journalEntries) => {
  try {
    const prompt = generateMirrorPrompt(journalEntries);
    
    console.log('🤖 Calling OpenAI API...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000
    });

    console.log('🤖 OpenAI response received');
    
    const mirrorContent = JSON.parse(response.choices[0].message.content);
    
    console.log('✅ Mirror content parsed successfully');
    return { success: true, content: mirrorContent };
  } catch (error) {
    console.error('Error generating Mirror with AI:', error);
    
    if (error.message.includes('response_format')) {
      console.log('🔄 Falling back to regular mode without JSON format...');
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 2000
        });

        const responseText = response.choices[0].message.content;
        console.log('🤖 Raw response:', responseText);
        
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const mirrorContent = JSON.parse(jsonMatch[0]);
          return { success: true, content: mirrorContent };
        } else {
          return { success: false, error: 'Could not extract JSON from response' };
        }
      } catch (fallbackError) {
        return { success: false, error: `Fallback failed: ${fallbackError.message}` };
      }
    }
    
    return { success: false, error: error.message };
  }
};

// Save generated Mirror to database (UPDATED FOR CUSTOM USERS)
export const saveMirrorToDatabase = async (customUserId, mirrorContent, journalIds) => {
  try {
    // Insert the Mirror
    const { data: mirrorData, error: mirrorError } = await supabase
      .from('mirrors')
      .insert([
        {
          custom_user_id: customUserId,  // NEW: Use custom_user_id
          screen_1_themes: mirrorContent.screen1_themes,
          screen_2_biblical: mirrorContent.screen2_biblical,
          screen_3_observations: mirrorContent.screen3_observations,
          screen_4_suggestions: mirrorContent.screen4_suggestions,
          journal_count: journalIds.length,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (mirrorError) {
      console.error('Error saving Mirror:', mirrorError);
      return { success: false, error: mirrorError.message };
    }

    // Update journals to link them to this Mirror
    const { error: updateError } = await supabase
      .from('journals')
      .update({ mirror_id: mirrorData.id })
      .in('id', journalIds);

    if (updateError) {
      console.error('Error linking journals to Mirror:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true, mirror: mirrorData };
  } catch (error) {
    console.error('Error saving Mirror to database:', error);
    return { success: false, error: error.message };
  }
};

// Check and generate Mirror (UPDATED FOR CUSTOM USERS)
export const checkAndGenerateMirror = async (customUserId) => {
  try {
    // Get ALL unassigned journals (where mirror_id is null)
    const { data: journals, error: journalsError } = await supabase
      .from('journals')
      .select('*')
      .eq('custom_user_id', customUserId)  // NEW: Use custom_user_id
      .is('mirror_id', null)
      .order('created_at', { ascending: true });

    if (journalsError) {
      return { success: false, error: journalsError.message };
    }

    // Check if we have at least 15 journals
    if (journals.length < 15) {
      return { 
        success: false, 
        error: `Need at least 15 journals for Mirror generation. Currently have ${journals.length}.` 
      };
    }

    console.log(`🎉 ${journals.length} journals found! Generating Mirror with all ${journals.length} entries...`);

    // Generate Mirror with AI using ALL unassigned journals
    const aiResult = await generateMirrorWithAI(journals);
    if (!aiResult.success) {
      return { success: false, error: `AI generation failed: ${aiResult.error}` };
    }

    // Save Mirror to database with ALL journal IDs
    const journalIds = journals.map(j => j.id);
    const saveResult = await saveMirrorToDatabase(customUserId, aiResult.content, journalIds);
    if (!saveResult.success) {
      return { success: false, error: `Database save failed: ${saveResult.error}` };
    }

    console.log(`✨ Mirror generated successfully using all ${journals.length} journals! Counter resets to 0.`);
    return { 
      success: true, 
      mirror: saveResult.mirror,
      content: aiResult.content,
      journalsUsed: journals.length,
      journalsRemaining: 0
    };

  } catch (error) {
    console.error('Error in checkAndGenerateMirror:', error);
    return { success: false, error: error.message };
  }
};