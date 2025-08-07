import { supabase } from './client';

// Test journal entries - Modern Jeremiah at car dealership (unchanged)
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

// Insert test data for development/testing (UPDATED FOR CUSTOM USERS)
export const insertTestJournalData = async (customUserId) => {
  try {
    const testEntries = testJournalEntries.map(entry => ({
      ...entry,
      custom_user_id: customUserId,  // NEW: Use custom_user_id
      mirror_id: null
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