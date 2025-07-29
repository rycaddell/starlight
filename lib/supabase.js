/**
 * Supabase Client Configuration
 * 
 * Handles connection to Supabase database and provides helper functions
 * for journal storage, user authentication, and data retrieval.
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai'; // ADD THIS IMPORT

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize OpenAI client (ADD THIS)
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

/**
 * Journal Database Functions
 */

// Save a new journal entry
export const saveJournalEntry = async (content, userId) => {
  try {
    const { data, error } = await supabase
      .from('journals')
      .insert([
        {
          content: content,
          user_id: userId,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Error saving journal:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error saving journal:', error);
    return { success: false, error: 'Failed to save journal entry' };
  }
};

// Get user's journal entries (most recent first)
export const getUserJournals = async (userId, limit = null) => {
  try {
    let query = supabase
      .from('journals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching journals:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching journals:', error);
    return { success: false, error: 'Failed to fetch journals' };
  }
};

// Count user's journal entries (for progress tracking)
export const getUserJournalCount = async (userId) => {
  try {
    const { count, error } = await supabase
      .from('journals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('mirror_id', null); // Only count journals not yet assigned to a Mirror

    if (error) {
      console.error('Error counting journals:', error);
      return { success: false, error: error.message };
    }

    return { success: true, count: count || 0 };
  } catch (error) {
    console.error('Error counting journals:', error);
    return { success: false, error: 'Failed to count journals' };
  }
};

/**
 * Authentication Helper Functions
 */

// Get current user
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting user:', error);
      return { success: false, error: error.message };
    }

    return { success: true, user };
  } catch (error) {
    console.error('Error getting user:', error);
    return { success: false, error: 'Failed to get user' };
  }
};

// Sign in anonymously (for MVP - no login required)
export const signInAnonymously = async () => {
  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    
    if (error) {
      console.error('Error signing in anonymously:', error);
      return { success: false, error: error.message };
    }

    return { success: true, user: data.user };
  } catch (error) {
    console.error('Error signing in anonymously:', error);
    return { success: false, error: 'Failed to sign in' };
  }
};

/**
 * ========================================
 * MIRROR GENERATION FUNCTIONS (NEW)
 * ========================================
 */

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

// Generate Mirror using OpenAI GPT-4
export const generateMirrorWithAI = async (journalEntries) => {
  try {
    const prompt = generateMirrorPrompt(journalEntries);
    
    console.log('🤖 Calling OpenAI API...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use gpt-4o-mini which supports JSON mode
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
    
    // If JSON mode still doesn't work, fall back to regular mode
    if (error.message.includes('response_format')) {
      console.log('🔄 Falling back to regular mode without JSON format...');
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 2000
        });

        // Try to extract JSON from the response
        const responseText = response.choices[0].message.content;
        console.log('🤖 Raw response:', responseText);
        
        // Look for JSON in the response
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

// Save generated Mirror to database
export const saveMirrorToDatabase = async (userId, mirrorContent, journalIds) => {
  try {
    // Insert the Mirror
    const { data: mirrorData, error: mirrorError } = await supabase
      .from('mirrors')
      .insert([
        {
          user_id: userId,
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

// Check if user has exactly 15 unassigned journals and generate Mirror
export const checkAndGenerateMirror = async (userId) => {
  try {
    // Get unassigned journals (where mirror_id is null)
    const { data: journals, error: journalsError } = await supabase
      .from('journals')
      .select('*')
      .eq('user_id', userId)
      .is('mirror_id', null)
      .order('created_at', { ascending: true });

    if (journalsError) {
      return { success: false, error: journalsError.message };
    }

    // Check if we have exactly 15 journals
    if (journals.length !== 15) {
      return { 
        success: false, 
        error: `Need exactly 15 journals for Mirror generation. Currently have ${journals.length}.` 
      };
    }

    console.log('🎉 15 journals found! Generating Mirror...');

    // Generate Mirror with AI
    const aiResult = await generateMirrorWithAI(journals);
    if (!aiResult.success) {
      return { success: false, error: `AI generation failed: ${aiResult.error}` };
    }

    // Save Mirror to database
    const journalIds = journals.map(j => j.id);
    const saveResult = await saveMirrorToDatabase(userId, aiResult.content, journalIds);
    if (!saveResult.success) {
      return { success: false, error: `Database save failed: ${saveResult.error}` };
    }

    console.log('✨ Mirror generated and saved successfully!');
    return { 
      success: true, 
      mirror: saveResult.mirror,
      content: aiResult.content
    };

  } catch (error) {
    console.error('Error in checkAndGenerateMirror:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test Data Functions
 */

// Test journal entries - Modern Jeremiah at car dealership
export const testJournalEntries = [
  {
    content: "Another month of missing my sales quota. I watch my coworkers lie to customers about 'last day specials' and extended warranties they don't need. How can I be honest in this business and still pay my rent? God, where are you in all this manipulation?",
    created_at: "2025-07-01T09:30:00Z"
  },
  {
    content: "Spent my lunch break sitting in my car reading Jeremiah. 'Is there no balm in Gilead?' hits different when you're struggling to make ends meet. Feel like a prophet crying out in a wilderness of financing deals and trade-ins.",
    created_at: "2025-07-03T12:15:00Z"
  },
  {
    content: "Had to sell a car to a single mom today who could barely afford it. Manager pressured me to push the extended warranty. I didn't. She thanked me for being honest. Lost commission but kept my soul. Still feel heavy about this whole industry.",
    created_at: "2025-07-05T18:45:00Z"
  },
  {
    content: "Why does following Jesus feel so much harder in the marketplace? My pastor preaches about prosperity, but I see families going into debt for cars they can't afford. The whole system feels broken. Am I supposed to just accept this?",
    created_at: "2025-07-07T20:30:00Z"
  },
  {
    content: "Coworker got fired today for refusing to push predatory loans. Good man, has three kids. Management called it 'not being a team player.' I'm next if I keep being honest. God, provide for those who choose integrity over profit.",
    created_at: "2025-07-09T17:20:00Z"
  },
  {
    content: "Couldn't sleep last night. Keep thinking about Jeremiah weeping over Jerusalem. I feel like I'm weeping over American consumer culture. People trading their financial future for status symbols. Lord, how long?",
    created_at: "2025-07-11T07:00:00Z"
  },
  {
    content: "Manager pulled me aside today. Said my numbers are too low, attitude too 'preachy.' Told me to smile more, push harder. Feel like I'm being asked to choose between my faith and my livelihood. This shouldn't be so hard.",
    created_at: "2025-07-13T19:15:00Z"
  },
  {
    content: "Prayed for wisdom during my break. Old customer came back just to thank me for not overselling him last year. His car is still running great. Maybe integrity has its own rewards, even if they're not always financial.",
    created_at: "2025-07-15T14:30:00Z"
  },
  {
    content: "Reading about economic justice in the Old Testament. The prophets had a lot to say about exploiting the poor. Wonder what they'd think of modern financing terms. Feel called to be different, but man, it's lonely.",
    created_at: "2025-07-17T21:45:00Z"
  },
  {
    content: "Young couple came in today, clearly struggling financially. Instead of the usual sales pitch, I helped them find a reliable used car within their actual budget. Felt like ministry. Maybe this is where God has me for such a time as this.",
    created_at: "2025-07-19T16:00:00Z"
  },
  {
    content: "Tension at work is getting worse. Other salespeople avoiding me because I won't play their games. Eating lunch alone most days. Jeremiah was lonely too. Sometimes following God means walking a narrow path.",
    created_at: "2025-07-21T12:45:00Z"
  },
  {
    content: "Rent is due next week and I'm short again. Tempted to compromise, to sell like everyone else sells. God, you promised to provide for those who seek your kingdom first. I'm seeking, but the providing feels scarce.",
    created_at: "2025-07-23T22:30:00Z"
  },
  {
    content: "Had a breakthrough conversation with a coworker today. He asked why I'm different, why I don't push customers harder. Got to share about faith and integrity. Plant seeds, trust God for the harvest.",
    created_at: "2025-07-25T13:20:00Z"
  },
  {
    content: "Pastor preached on Jeremiah 29:11 today. 'Plans to prosper you and not to harm you.' Still wrestling with what prosperity means when you work in an industry built on consumer debt. Maybe prosperity isn't just financial?",
    created_at: "2025-07-27T15:10:00Z"
  },
  {
    content: "Fifteen journal entries of struggle and questions. But looking back, I see God's fingerprints. The customers who thanked me, the conversations about faith, the peace that comes with integrity. Maybe being a prophet in the marketplace isn't about success by worldly standards.",
    created_at: "2025-07-28T11:00:00Z"
  }
];

// Insert test data for development/testing
export const insertTestJournalData = async (userId) => {
  try {
    const testEntries = testJournalEntries.map(entry => ({
      ...entry,
      user_id: userId,
      mirror_id: null // Ensure they're unassigned
    }));

    const { data, error } = await supabase
      .from('journals')
      .insert(testEntries)
      .select();

    if (error) {
      console.error('Error inserting test data:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Inserted ${data.length} test journal entries`);
    return { success: true, data };
  } catch (error) {
    console.error('Error inserting test data:', error);
    return { success: false, error: error.message };
  }
};