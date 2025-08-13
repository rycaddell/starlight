import { supabase, openai } from './client';

// Generate Mirror prompt from journal entries (UPDATED)
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
    "title": "Themes",
    "subtitle": "Patterns across your journals",
    "themes": [
      {
        "name": "Theme Name",
        "description": "Brief description of this theme",
        "frequency": "Present in journals from March 15, March 22, and April 3"
      }
    ]
  },
  "screen2_biblical": {
    "title": "Biblical Mirror", 
    "subtitle": "Pattern matches in Scripture",
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
    "title": "Observations",
    "subtitle": "Patterns in your framing",
    "self_perception": {
      "observation": "How they tend to view themselves spiritually, with specific journal date references"
    },
    "god_perception": {
      "observation": "How they tend to relate to or view God, with specific journal date references"
    },
    "others_perception": {
      "observation": "How they tend to view or relate to others, with specific journal date references"
    },
    "blind_spots": {
      "observation": "Pattern they may not be aware of that could benefit from attention, with journal date references"
    }
  },
  "screen4_suggestions": {
    "title": "Next Steps",
    "subtitle": "",
    "respond_section": {
      "title": "Respond to the Mirror output",
      "description": "Take 15mins to reflect more deeply",
      "button_text": "Get started",
      "action": "coming_soon"
    },
    "share_section": {
      "title": "Share what you're learning with someone else",
      "description": "Spiritual formation isn't an isolated exercise. We do it in community."
    }
  }
}

IMPORTANT REQUIREMENTS:
- For screen1_themes: Generate exactly 4 themes maximum, no more
- For theme frequency references: Use actual journal dates (e.g., "Present in journals from March 15, March 22, and April 3") instead of entry numbers
- Do NOT include an "insight" field in screen1_themes
- For screen3_observations: Focus only on observations without recommendations. Each section should contain ONLY the observation field with specific journal date references. Do not include growth edges, invitations, challenges, or growth opportunities - just neutral observations of patterns. If no clear evidence exists in the journals for a particular area (self, God, others, blind spots), omit that section entirely rather than making generic observations.
- For screen4_suggestions: Use the EXACT structure provided - do not modify the titles, descriptions, or content. This should be identical for every Mirror generation.
- Reference specific dates from the journal entries provided above

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
    
    // Try primary model first
    const response = await openai.chat.completions.create({
      model: "gpt-5", // Fixed model name
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 10000, // Fixed parameter name
      // Removed temperature and response_format for compatibility
    });

    console.log('🤖 OpenAI response received');
    
    const rawContent = response.choices[0].message.content;
    console.log('📏 Raw response length:', rawContent?.length);
    console.log('🤖 Raw response preview:', rawContent?.substring(0, 200) + '...');
    
    // Clean the response before parsing
    const cleanedContent = rawContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    console.log('🧹 Cleaned content preview:', cleanedContent.substring(0, 200) + '...');
    
    const mirrorContent = JSON.parse(cleanedContent);
    
    console.log('✅ Mirror content parsed successfully');
    return { success: true, content: mirrorContent };
    
  } catch (error) {
    console.error('❌ Primary generation failed:', error.message);
    
    // Fallback to more compatible model
    console.log('🔄 Trying fallback with gpt-4o-mini...');
    try {
      const prompt = generateMirrorPrompt(journalEntries);
      
      const fallbackResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 4000,
        temperature: 0.7,
      });

      const rawContent = fallbackResponse.choices[0].message.content;
      console.log('🔄 Fallback raw response:', rawContent);
      
      // Try multiple parsing strategies
      let mirrorContent;
      
      // Strategy 1: Direct parse
      try {
        mirrorContent = JSON.parse(rawContent);
        console.log('✅ Direct parse successful');
      } catch {
        // Strategy 2: Extract JSON from response
        console.log('🔍 Trying JSON extraction...');
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          mirrorContent = JSON.parse(jsonMatch[0]);
          console.log('✅ JSON extraction successful');
        } else {
          throw new Error('No valid JSON found in response');
        }
      }
      
      return { success: true, content: mirrorContent };
      
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError.message);
      return { 
        success: false, 
        error: `Mirror generation failed: ${fallbackError.message}` 
      };
    }
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

// NEW: Get existing Mirror by ID
export const getMirrorById = async (mirrorId) => {
  try {
    console.log('🔍 Loading Mirror:', mirrorId);
    
    const { data: mirror, error } = await supabase
      .from('mirrors')
      .select('*')
      .eq('id', mirrorId)
      .single();

    if (error) {
      console.error('❌ Error loading Mirror:', error);
      return { success: false, error: error.message };
    }

    if (!mirror) {
      return { success: false, error: 'Mirror not found' };
    }

    // Reconstruct the Mirror content in the expected format
    const mirrorContent = {
      screen1_themes: mirror.screen_1_themes,
      screen2_biblical: mirror.screen_2_biblical,
      screen3_observations: mirror.screen_3_observations,
      screen4_suggestions: mirror.screen_4_suggestions
    };

    console.log('✅ Mirror loaded successfully');
    return { 
      success: true, 
      mirror: mirror,
      content: mirrorContent 
    };

  } catch (error) {
    console.error('❌ Error in getMirrorById:', error);
    return { success: false, error: error.message };
  }
};