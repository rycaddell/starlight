import { supabase, openai } from './client';
import { MIRROR_THRESHOLD } from '../config/constants';

// Performance Timer Class
class PerformanceTimer {
  constructor(processName) {
    this.processName = processName;
    this.startTime = Date.now();
    this.checkpoints = [];
    
    console.log(`\n⏱️  [${this.processName}] Started at ${new Date().toLocaleTimeString()}`);
  }
  
  checkpoint(label) {
    const now = Date.now();
    const duration = now - this.startTime;
    const lastCheckpoint = this.checkpoints.length > 0 
      ? this.checkpoints[this.checkpoints.length - 1].timestamp 
      : this.startTime;
    const sinceLast = now - lastCheckpoint;
    
    this.checkpoints.push({
      label,
      timestamp: now,
      totalDuration: duration,
      sinceLast: sinceLast
    });
    
    console.log(`  ⏱️  [${this.processName}] ${label}: +${sinceLast}ms (total: ${duration}ms)`);
    
    return duration;
  }
  
  end() {
    const totalDuration = Date.now() - this.startTime;
    
    console.log(`\n✅ [${this.processName}] COMPLETED in ${totalDuration}ms (${(totalDuration/1000).toFixed(2)}s)`);
    console.log('📊 Breakdown:');
    
    this.checkpoints.forEach((cp, index) => {
      const percentage = ((cp.sinceLast / totalDuration) * 100).toFixed(1);
      console.log(`  ${index + 1}. ${cp.label}: ${cp.sinceLast}ms (${percentage}%)`);
    });
    
    return {
      totalDuration,
      checkpoints: this.checkpoints,
      processName: this.processName
    };
  }
}

// Generate Mirror prompt from journal entries
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

// Generate Mirror using OpenAI with performance logging
export const generateMirrorWithAI = async (journalEntries) => {
  const timer = new PerformanceTimer('AI Generation');
  
  try {
    timer.checkpoint('Creating prompt');
    const prompt = generateMirrorPrompt(journalEntries);
    
    timer.checkpoint('Prompt created, calling OpenAI API');
    console.log(`📏 Prompt length: ${prompt.length} characters`);
    
    // Try primary model first
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 10000
    });

    timer.checkpoint('OpenAI response received');
    
    const rawContent = response.choices[0].message.content;
    console.log('📏 Response length:', rawContent?.length, 'characters');
    console.log('🎯 Completion tokens:', response.usage?.completion_tokens || 'unknown');
    console.log('📝 Prompt tokens:', response.usage?.prompt_tokens || 'unknown');
    console.log('💰 Total tokens:', response.usage?.total_tokens || 'unknown');
    
    // Calculate cost (update rates based on your model)
    if (response.usage?.total_tokens) {
      const costPer1M = 5; // $5 per 1M tokens for gpt-4o (adjust for your model)
      const estimatedCost = (response.usage.total_tokens / 1000000) * costPer1M;
      console.log('💵 Estimated cost: $' + estimatedCost.toFixed(4));
    }
    
    timer.checkpoint('Parsing JSON response');
    
    // Clean the response before parsing
    const cleanedContent = rawContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const mirrorContent = JSON.parse(cleanedContent);
    
    timer.checkpoint('JSON parsed successfully');
    
    const results = timer.end();
    
    return { 
      success: true, 
      content: mirrorContent,
      performance: results,
      usage: response.usage
    };
    
  } catch (error) {
    console.error('❌ Primary generation failed:', error.message);
    timer.checkpoint(`Failed: ${error.message}`);
    
    // Fallback to more compatible model
    console.log('🔄 Trying fallback with gpt-4o-mini...');
    try {
      const prompt = generateMirrorPrompt(journalEntries);
      
      const fallbackResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 3000,
        temperature: 0.7,
      });

      const rawContent = fallbackResponse.choices[0].message.content;
      console.log('🔄 Fallback response received');
      
      // Try multiple parsing strategies
      let mirrorContent;
      
      // Strategy 1: Direct parse
      try {
        const cleanedContent = rawContent
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        mirrorContent = JSON.parse(cleanedContent);
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
      
      timer.checkpoint('Fallback completed');
      const results = timer.end();
      
      return { 
        success: true, 
        content: mirrorContent,
        performance: results,
        usage: fallbackResponse.usage
      };
      
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError.message);
      timer.end();
      return { 
        success: false, 
        error: `Mirror generation failed: ${fallbackError.message}` 
      };
    }
  }
};

// Save generated Mirror to database with performance logging
export const saveMirrorToDatabase = async (customUserId, mirrorContent, journalIds) => {
  const timer = new PerformanceTimer('Database Save');
  
  try {
    timer.checkpoint('Inserting Mirror record');
    
    // Insert the Mirror
    const { data: mirrorData, error: mirrorError } = await supabase
      .from('mirrors')
      .insert([
        {
          custom_user_id: customUserId,
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
      console.error('❌ Error saving Mirror:', mirrorError);
      timer.end();
      return { success: false, error: mirrorError.message };
    }

    timer.checkpoint('Mirror saved, updating journal links');

    // Update journals to link them to this Mirror
    const { error: updateError } = await supabase
      .from('journals')
      .update({ mirror_id: mirrorData.id })
      .in('id', journalIds);

    if (updateError) {
      console.error('❌ Error linking journals to Mirror:', updateError);
      timer.end();
      return { success: false, error: updateError.message };
    }

    timer.checkpoint('Journal links updated');
    
    const results = timer.end();

    return { 
      success: true, 
      mirror: mirrorData,
      performance: results
    };
    
  } catch (error) {
    console.error('❌ Error saving Mirror to database:', error);
    timer.end();
    return { success: false, error: error.message };
  }
};

// Check and generate Mirror with comprehensive performance logging
export const checkAndGenerateMirror = async (customUserId) => {
  const timer = new PerformanceTimer('Full Mirror Generation');
  
  try {
    timer.checkpoint('Fetching unassigned journals');
    
    // Get ALL unassigned journals (where mirror_id is null)
    const { data: journals, error: journalsError } = await supabase
      .from('journals')
      .select('*')
      .eq('custom_user_id', customUserId)
      .is('mirror_id', null)
      .order('created_at', { ascending: true });

    if (journalsError) {
      timer.end();
      return { success: false, error: journalsError.message };
    }

    timer.checkpoint(`Fetched ${journals.length} journals`);

    // Check if we have at least 10 journals
    if (journals.length < MIRROR_THRESHOLD) {
      timer.end();
      return { 
        success: false, 
        error: `Need at least ${MIRROR_THRESHOLD} journals for Mirror generation. Currently have ${journals.length}.` 
      };
    }

    console.log(`🎉 ${journals.length} journals found! Generating Mirror...`);
    timer.checkpoint('Starting AI generation');

    // Generate Mirror with AI using ALL unassigned journals
    const aiResult = await generateMirrorWithAI(journals);
    
    if (!aiResult.success) {
      timer.end();
      return { success: false, error: `AI generation failed: ${aiResult.error}` };
    }

    timer.checkpoint('AI generation complete, saving to database');

    // Save Mirror to database with ALL journal IDs
    const journalIds = journals.map(j => j.id);
    const saveResult = await saveMirrorToDatabase(customUserId, aiResult.content, journalIds);
    
    if (!saveResult.success) {
      timer.end();
      return { success: false, error: `Database save failed: ${saveResult.error}` };
    }

    timer.checkpoint('Database save complete');
    
    const results = timer.end();

    console.log(`✨ Mirror generated successfully using all ${journals.length} journals!`);
    
    return { 
      success: true, 
      mirror: saveResult.mirror,
      content: aiResult.content,
      journalsUsed: journals.length,
      journalsRemaining: 0,
      performance: {
        total: results,
        aiGeneration: aiResult.performance,
        databaseSave: saveResult.performance
      },
      usage: aiResult.usage
    };

  } catch (error) {
    console.error('❌ Error in checkAndGenerateMirror:', error);
    timer.end();
    return { success: false, error: error.message };
  }
};

// Get existing Mirror by ID
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

// Generate onboarding preview prompt
export const generateOnboardingPreviewPrompt = (journalContent) => {
  return `You are a wise, compassionate spiritual director. Someone has just written their first spiritual journal entry. Create a brief encouraging preview to show them what ongoing journaling might reveal.

THEIR JOURNAL ENTRY:
${journalContent}

Generate a JSON response with this structure:

{
  "biblical_profile": {
    "character": "Biblical character name that resonates with their entry",
    "connection": "2-3 sentences connecting their spiritual journey to this biblical figure"
  },
  "encouraging_verse": {
    "reference": "Bible verse reference",
    "text": "Full verse text",
    "application": "2-3 sentences about how this verse speaks to their current situation"
  }
}

IMPORTANT:
- Be specific to their actual journal content
- Warm, encouraging, non-judgmental tone
- Find genuine hope even in struggles
- Use accessible, modern language
- Keep it brief - this is just a preview

Generate only the JSON response with no additional text.`;
};

// Generate onboarding preview
export const generateOnboardingPreview = async (journalContent) => {
  try {
    const prompt = generateOnboardingPreviewPrompt(journalContent);
    
    console.log('🎯 Generating onboarding preview...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Fast and cheap for onboarding
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 800,
      temperature: 0.7,
    });

    console.log('✅ AI response received');
    
    const rawContent = response.choices[0].message.content;
    console.log('📏 Raw response preview:', rawContent?.substring(0, 150) + '...');
    
    // Clean and parse
    const cleanedContent = rawContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const previewContent = JSON.parse(cleanedContent);
    
    console.log('✅ Preview content parsed successfully');
    return { success: true, content: previewContent };
    
  } catch (error) {
    console.error('❌ Onboarding preview generation failed:', error.message);
    
    // Return generic fallback
    return { 
      success: false, 
      error: error.message,
      fallback: {
        biblical_profile: {
          character: "David",
          connection: "Like David in the Psalms, you're bringing your honest thoughts and feelings to God. David didn't hide his struggles or doubts - he brought them into the light through writing and prayer. Your willingness to reflect like this is already a step toward spiritual growth."
        },
        encouraging_verse: {
          reference: "Psalm 139:23-24",
          text: "Search me, God, and know my heart; test me and know my anxious thoughts. See if there is any offensive way in me, and lead me in the way everlasting.",
          application: "This verse reminds us that honest self-reflection before God is not just acceptable - it's invited. As you continue journaling, you're creating space for God to reveal patterns, growth areas, and His leading in your life."
        }
      }
    };
  }
};