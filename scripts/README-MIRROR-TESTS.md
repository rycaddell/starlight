# Mirror Generation Content Filter Testing

## Overview
This test suite helps identify and resolve OpenAI content filter issues in mirror generation by systematically testing different journal sets.

## Test Structure
- **5 different journal sets** with varying themes:
  1. Modern Jeremiah (Car Sales) - Workplace ethics struggles
  2. Grateful & Joyful - Positive spiritual journey
  3. Struggling with Doubt - Faith questions and theodicy
  4. Work-Life Balance - Career and family tensions
  5. Spiritual Growth - Deepening practices

- **3 trials per set** = **15 total tests**
- Uses the exact same prompt as production
- Saves all OpenAI responses as JSON for review

## How to Run

### Prerequisites

**Option 1: Hardcode for quick testing (recommended for iteration)**
```javascript
// In scripts/test-mirror-generation.js, line 12:
const HARDCODED_API_KEY = 'sk-your-key-here'; // Paste your key here
```
⚠️ Just remember to clear it before committing!

**Option 2: Environment variable**
```bash
export OPENAI_API_KEY="your-key-here"
```

### Run Tests
```bash
node scripts/test-mirror-generation.js
```

### View Results
Results are saved to `scripts/test-results/`:
- `summary.json` - Overview of all tests
- `Set_X_trialY.json` - Individual test results with full OpenAI responses

## What Gets Logged

### Console Output
- Real-time progress for each test
- Finish reason (stop, content_filter, length)
- Token usage
- Summary statistics by set

### Saved Files
Each test result includes:
```json
{
  "success": true/false,
  "contentFilterTriggered": true/false,
  "finishReason": "stop" | "content_filter" | "length",
  "content": "...the generated mirror JSON...",
  "usage": { "total_tokens": 1234 },
  "fullResponse": { ...complete OpenAI response... }
}
```

## Iterating on the Prompt

1. **Run initial tests** to establish baseline
2. **Identify problematic sets** - which journal themes trigger filters?
3. **Modify the prompt** in the script (line 28)
4. **Re-run tests** to measure improvement
5. **Repeat** until 0% content filter rate
6. **Apply winning prompt** to edge function

## Prompt Modification Strategy

If content filters trigger, try:

### 1. Soften Sensitive Terminology
- Change "blind spots" → "growth areas" or "opportunities for awareness"
- Change "challenging verse" → "reflective verse" or "invitation verse"
- Change "struggles" → "challenges" or "seasons"

### 2. Add Context Framing
```
You are analyzing spiritual journal entries in a safe, therapeutic context.
These reflections may contain difficult emotions or experiences as part
of the user's spiritual growth journey. Respond with compassionate,
non-judgmental spiritual guidance.
```

### 3. Be More Explicit About Intent
```
The user is engaging in private spiritual reflection. Your role is to
provide encouraging biblical insights, not to judge or evaluate the
content of their experiences.
```

### 4. Remove Potentially Triggering Instructions
- Avoid asking AI to identify "negative" patterns
- Focus on "growth" and "transformation" language
- Emphasize "hope" and "encouragement"

## Expected Outcomes

**Baseline (current prompt):**
- Some content filter triggers expected with Set 1 (workplace ethics), Set 3 (doubt/suffering)
- Minimal issues with Set 2 (joyful), Set 5 (growth)

**Target:**
- 0% content filter rate across all sets
- Consistent JSON output quality
- Maintained spiritual depth and authenticity

## Next Steps After Testing

1. Review individual failed test JSON files to see partial outputs
2. Identify common trigger points (specific words, themes, patterns)
3. Test prompt variations until achieving 100% success rate
4. Update production edge functions:
   - `supabase/functions/generate-mirror/index.ts`
   - `supabase/functions/generate-day-1-mirror/index.ts`
5. Deploy and monitor production results

## Adding Custom Journal Sets

To test with your own journal data:

```javascript
{
  name: 'Set 6: Custom Test',
  journals: [
    {
      content: "Your journal text here...",
      created_at: "2025-07-01T10:00:00Z"
    },
    // ... 10 total entries
  ]
}
```

Add to the `journalSets` array in the script (line 237).
