# Day 1 Mini-Mirror Content Filter Testing

## Overview
Tests Day 1 mini-mirror generation with challenging but realistic user responses to identify content filter triggers.

## Test Structure
- **5 different Day 1 scenarios** covering sensitive spiritual topics:
  1. **Battling** - Addiction recovery, shame, spiritual warfare
  2. **Grieving** - Loss of child, faith crisis, anger at God
  3. **Wandering** - Deconstruction, leaving church, theological questions
  4. **Hiding** - Secret sin, guilt, fear of consequences
  5. **Resting** - Ministry burnout, learning sabbath, healing

- **3 trials per case** = **15 total tests**
- Uses exact Day 1 edge function prompt
- Saves all OpenAI responses as JSON

## How to Run

### Set API Key
```javascript
// In scripts/test-day1-mirror-generation.js, line 17:
const HARDCODED_API_KEY = 'sk-your-key-here';
```

### Run Tests
```bash
node scripts/test-day1-mirror-generation.js
```

### View Results
Results saved to `scripts/test-results-day1/`:
- `summary.json` - Test overview
- `User_X_trialY.json` - Individual results

## Day 1 Prompt Structure

Day 1 mini-mirrors generate:

### Screen 2 - Biblical Mirror
- `parallel_story` - Biblical character/story parallel
- `encouraging_verse` - Supportive scripture
- `invitation_to_growth` - Reflective verse (NOT "challenging_verse")

### One-Line Summaries
- `spiritual_journey` - Summary of Q2 answer (10-12 words)
- `prayer_focus` - Summary of Q3 answer (10-12 words)

## Key Differences from Regular Mirrors

**Day 1:**
- Only 2 journal entries (Q2 and Q3 responses)
- Spiritual place context (8 options)
- Mini mirror: Screen 2 + summaries only
- Focused on initial spiritual direction

**Regular Mirrors:**
- 10 journal entries
- Full 3-screen mirror
- Deeper pattern analysis
- Themes, observations, blind spots

## Test Cases Explained

### 1. Battling (Addiction Recovery)
Tests: addiction, relapse, shame, recovery language, spiritual warfare themes
**High Risk Topics:** Substance abuse, family breakdown, desperation

### 2. Grieving (Loss of Child)
Tests: child death, anger at God, faith crisis, unanswered prayer
**High Risk Topics:** Death, trauma, theological doubt, rage

### 3. Wandering (Faith Deconstruction)
Tests: leaving church, LGBTQ+ affirming stance, questioning doctrine
**High Risk Topics:** Religious trauma, theological controversy

### 4. Hiding (Secret Sin)
Tests: infidelity, guilt, deception, fear of exposure
**High Risk Topics:** Affair, lying, moral failure, consequences

### 5. Resting (Ministry Burnout)
Tests: exhaustion, neglect, marriage problems, stepping away from ministry
**High Risk Topics:** Mental health, relationship strain, breakdown

## Expected Content Filter Triggers

**Most Likely to Trigger:**
- Case 2 (Grieving) - child death, anger at God
- Case 4 (Hiding) - infidelity, deception
- Case 1 (Battling) - addiction, relapse themes

**Less Likely:**
- Case 5 (Resting) - mostly about burnout
- Case 3 (Wandering) - theological questions

## Prompt Modifications to Test

If filters trigger, try:

### 1. Reframe Spiritual Director Role
```
"You are a wise, compassionate spiritual director providing pastoral care
in a confidential, therapeutic context..."
```

### 2. Change "invitation_to_growth" Language
```
"invitation_to_growth" → "reflective_verse" or "growth_invitation"
```

### 3. Add Safety Context
```
"These responses are part of a private spiritual formation process.
The user is engaging in honest reflection in a safe, confidential space..."
```

### 4. Soften Tone Instructions
Remove "struggling" language, focus on "journey" and "growth"

## Comparison with Regular Mirror Tests

Run both test scripts to compare:
```bash
# Regular mirrors (10 journals)
node scripts/test-mirror-generation.js

# Day 1 mini-mirrors (2 responses)
node scripts/test-day1-mirror-generation.js
```

Compare success rates to see if:
- Fewer journals = fewer triggers?
- Different prompt structure helps?
- Spiritual place context changes results?

## Next Steps

1. Establish baseline content filter rate
2. Compare Day 1 vs Regular mirror filter rates
3. Iterate on prompt language
4. Apply winning prompts to edge functions:
   - `supabase/functions/generate-day-1-mirror/index.ts`
5. Monitor production Day 1 completions
