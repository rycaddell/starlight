# Narrative Onboarding - Feature Specification

**Branch:** `feature/narrative-onboarding`
**Status:** In Development
**Last Updated:** 2025-12-17

---

## 🎯 Overview

Complete redesign of onboarding to tell a narrative story about how Oxbow helps users understand God's leading by connecting individual moments into a coherent pattern.

**Key Metaphor:** River journey from close-up moments → zoomed-out aerial view revealing the oxbow pattern

**Goal:** Users leave onboarding thinking: *"Oh this is better than journaling... I wonder what my Mirror will be. This app is going to help me understand where God is leading me."*

---

## 📖 The Story Arc

### Act 1: Individual Moments (Steps 1-4)
- Introduce user by name (personalization)
- Establish that we live moment-by-moment
- Show a single journal entry (Dec 12 - gratitude)
- Raise the question: How do moments fit together?

### Act 2: Accumulating Experiences (Steps 5-7)
- Show diverse journal entries appearing one at a time
- Dec 18: Striving/work ("I'm seeing progress, but I have so much work to do still")
- Dec 21: Connection ("Dinner with friends was exactly what I needed tonight")
- Dec 27: Doubt/pain ("Why hasn't he been healed yet? Does God care?")
- Build tension: These moments seem disconnected

### Act 3: Revelation (Steps 8-9)
- **Step 8:** "If we step back..." → ZOOM OUT animation reveals aerial oxbow view
- **Step 9:** "We can see God's leading across our moments" → Product screenshot overlay showing the Mirror feature
- The "aha" moment: Individual moments form a pattern when viewed from above

### Act 4: Invitation (Step 10)
- "So where is God leading you?" → Call to action
- Button: "Get started"
- User enters main app

---

## 📱 Screen-by-Screen Specification

### Screen 1: Name Input
**Background:** Close-up river view from canoe (image #1)
**Overlay:** Dark transparent grey (rgba(0, 0, 0, 0.4))
**Content:**
- Title: "What's your name?"
- Text input field (light border, white text)
- Auto-focus on mount
- Continue button (disabled until name entered)

**Technical:**
- Store name in `custom_users.display_name` on continue
- Validate: minimum 1 character, trim whitespace
- Keyboard: capitalizedWords

---

### Screen 2: Welcome
**Background:** River view from canoe (image #2)
**Overlay:** Dark transparent grey (rgba(0, 0, 0, 0.4))
**Content:**
- Title: "Hey, [Name]."
- Subtitle: "Welcome to Oxbow"
- Auto-advance after 2.5 seconds OR tap to continue

**Technical:**
- Use stored display_name
- Fade in text animation
- Tap anywhere to skip timer

---

### Screen 3: One Moment at a Time
**Background:** River view from canoe (image #3)
**Overlay:** Dark transparent grey (rgba(0, 0, 0, 0.4))
**Content:**
- Header: "We experience our lives one moment at a time."
- Journal card (bottom 1/3 of screen):
  - Label: "Journal Entry - Dec 12"
  - Text: "I felt so seen reading Psalm 25 just now! Thank you, God."
  - Styled as card with slight elevation

**Technical:**
- Journal card slides up from bottom with spring animation
- Sample only - NOT saved to database
- Tap to continue (no auto-advance)

---

### Screen 4: How Do Moments Fit Together?
**Background:** River view from canoe (image #4)
**Overlay:** Dark transparent grey (rgba(0, 0, 0, 0.4))
**Content:**
- Header: "But how do these moments fit together into a sensible story?"
- NO journal card on this screen

**Technical:**
- Text fade in
- Tap to continue

---

### Screen 5: Second Journal Entry
**Background:** River view from canoe (image #5)
**Overlay:** Dark transparent grey (rgba(0, 0, 0, 0.4))
**Content:**
- Journal card (bottom 1/3):
  - Label: "Journal Entry - Dec 18"
  - Text: "I'm seeing progress, but I have so much work to do still."

**Technical:**
- Previous journal entry from step 3 is GONE (not accumulating)
- New card slides up from bottom
- Tap to continue

---

### Screen 6: Third Journal Entry
**Background:** River view from canoe (image #6)
**Overlay:** Dark transparent grey (rgba(0, 0, 0, 0.4))
**Content:**
- Journal card (bottom 1/3):
  - Label: "Journal Entry - Dec 21"
  - Text: "Dinner with friends was exactly what I needed tonight."

**Technical:**
- Same behavior as screen 5
- Single card only

---

### Screen 7: Fourth Journal Entry
**Background:** River view from canoe (image #7)
**Overlay:** Dark transparent grey (rgba(0, 0, 0, 0.4))
**Content:**
- Journal card (bottom 1/3):
  - Label: "Journal Entry - Dec 27"
  - Text: "Why hasn't he been healed yet? Does God care?"

**Technical:**
- Same behavior as screens 5-6
- Darkest/most challenging entry (emotional climax before revelation)

---

### Screen 8: Step Back (THE KEY TRANSITION)
**Background:** Starts with close-up (image #7), zooms/scales to aerial oxbow view (image #8)
**Overlay:** Dark transparent grey (rgba(0, 0, 0, 0.4))
**Content:**
- Header: "If we step back..."
- NO journal card

**Animation:**
- Background image smoothly scales from close-up to aerial view
- Duration: 2-3 seconds
- Easing: easeInOut or spring
- Can be: scale transform, image crossfade, or position-based zoom
- Journal card (if still visible) fades out during transition

**Technical:**
- This is THE critical moment - needs to feel smooth and revelatory
- Consider using React Native Reanimated for performance
- May need to experiment with different techniques:
  - Option A: Scale transform (scale: 1 → 0.3)
  - Option B: Two images with opacity crossfade
  - Option C: Shared element transition
- Auto-advance to screen 9 after animation completes

---

### Screen 9: Pattern Revealed
**Background Layer 1:** Aerial oxbow view (image #9)
**Background Layer 2:** Product screenshot of Mirror feature (centered, elevated)
**Overlay on Layer 1:** Dark transparent grey (rgba(0, 0, 0, 0.4))
**Content:**
- Header: "We can see God's leading across our moments"
- Product screenshot shows sample Mirror with themes/biblical connections

**Technical:**
- Two-layer image composition:
  - Base: Aerial river background
  - Foreground: Phone screenshot with shadow/elevation
- Screenshot slides in from bottom or fades in
- Tap to continue

**Design Notes:**
- Product screenshot should look like a phone mockup
- Position it prominently but don't cover the oxbow in background
- Consider subtle drop shadow on screenshot for depth

---

### Screen 10: Call to Action
**Background:** Aerial oxbow view (image #10 - can reuse #9 if same)
**Overlay:** Dark transparent grey (rgba(0, 0, 0, 0.4))
**Content:**
- Header: "So where is God leading you?"
- Button: "Get started" (primary green #059669)
- Button has elevation/shadow

**Technical:**
- Button press triggers `completeOnboarding()`
- Navigate to main app (journal screen)
- Mark `onboarding_completed_at` in database

---

## 🎨 Design System

### Typography
- **Header:** 28-32px, bold (700), white, center-aligned
- **Subheader:** 18-20px, regular (400), white, center-aligned
- **Journal Label:** 12px, semibold (600), white/80% opacity
- **Journal Text:** 16px, regular (400), white, italic or regular

### Colors
- **Text:** #FFFFFF (white)
- **Overlay:** rgba(0, 0, 0, 0.4) - dark transparent grey
- **Button Primary:** #059669 (brand green)
- **Button Text:** #FFFFFF

### Spacing
- **Screen padding:** 32px horizontal, 60px top, 48px bottom
- **Header margin:** 16px bottom
- **Journal card:** Bottom 1/3 of screen (~200-250px from bottom)

### Shadows
- **Journal card:** subtle elevation
  ```javascript
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 6,
  ```
- **Product screenshot:** more prominent
  ```javascript
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.4,
  shadowRadius: 16,
  elevation: 10,
  ```

---

## 🎬 Animations & Transitions

### Between Screens (Steps 1-7, 9-10)
- **Fade transition:** 350ms
- Simple, unobtrusive
- Alternative: Slide left/right

### Journal Card Entrance
- **Slide up from bottom:**
  - Start: translateY(300)
  - End: translateY(0)
  - Duration: 400ms
  - Easing: spring or easeOut

### Step 8 Zoom Out (Critical Moment)
- **Scale animation:**
  - Duration: 2000-3000ms
  - Scale: 1.0 → 0.25 (or image crossfade)
  - Easing: easeInOut
- **Alternative:** Ken Burns effect (scale + subtle pan)

### Step 9 Screenshot Entrance
- **Slide up + fade:**
  - Duration: 600ms
  - TranslateY(200) + opacity(0) → TranslateY(0) + opacity(1)

---

## 📷 Image Assets

### Requirements
- **Total:** 10 background images
- **Aspect Ratio:** Mobile portrait (9:16 or similar)
- **Resolution:** 2x and 3x for iOS (@2x, @3x)
- **Format:** PNG or JPG (optimized for mobile)
- **Compression:** Balanced quality/size
- **Naming Convention:**
  - `onboarding-bg-01.jpg` (name input)
  - `onboarding-bg-02.jpg` (welcome)
  - `onboarding-bg-03.jpg` (first journal)
  - ...
  - `onboarding-bg-08.jpg` (aerial oxbow for zoom reveal)
  - `onboarding-bg-09.jpg` (aerial oxbow for pattern)
  - `onboarding-bg-10.jpg` (aerial oxbow for CTA)

### Optimization Tasks
1. Resize to appropriate mobile dimensions (1080x1920 or similar)
2. Compress using ImageOptim or similar
3. Generate @2x and @3x variants
4. Test dark overlay readability
5. Ensure smooth zoom transition between #7 and #8

### Product Screenshot (Screen 9)
- **Asset:** Sample Mirror screen showing themes/biblical connections
- **Format:** PNG with transparency OR with phone mockup frame
- **Size:** Approx 300-400px width (scaled for screen)
- **Can generate from:** Existing Mirror screen screenshot

---

## 🗄️ Data Model Changes

### Updated: `custom_users` table
```sql
-- display_name already exists, just needs to be populated during onboarding
-- No schema changes needed
```

### Context Updates: `OnboardingContext.tsx`

**New State:**
```typescript
userName: string;
setUserName: (name: string) => void;
```

**New Step Flow:**
```typescript
type OnboardingStep =
  | 'name-input'          // Step 1
  | 'welcome'             // Step 2
  | 'moment-one'          // Step 3
  | 'moments-question'    // Step 4
  | 'moment-two'          // Step 5
  | 'moment-three'        // Step 6
  | 'moment-four'         // Step 7
  | 'step-back'           // Step 8 (zoom animation)
  | 'pattern-revealed'    // Step 9 (product screenshot)
  | 'call-to-action'      // Step 10
  | 'complete';
```

**Remove:**
- `hasMicrophonePermission`
- `hasNotificationPermission`
- `journalContent` (no real journal entry during onboarding)
- `journalEntryType`
- `aiPreviewData`

---

## 🧩 Component Structure

### New Components to Create

1. **`NarrativeOnboardingScreen.tsx`**
   - Single component handling all 10 steps
   - Props: `step`, `userName`, `onContinue`, `onNameSubmit`
   - Renders different content based on step
   - Manages background images
   - Manages overlay

2. **`JournalSampleCard.tsx`**
   - Reusable card for displaying sample journal entries
   - Props: `date`, `text`
   - Slide-up animation
   - Consistent styling

3. **`ZoomTransition.tsx`** (optional)
   - Dedicated component for step 8 zoom animation
   - Could be integrated into main screen or standalone

### Updated Components

1. **`OnboardingNavigator.tsx`**
   - Replace entire flow with new narrative screens
   - Remove old screen imports
   - Simple switch statement for 10 steps

2. **`OnboardingContext.tsx`**
   - Update step types
   - Add userName state
   - Remove permission/journal states
   - Update STEP_ORDER array

---

## 🔄 User Flow

```
┌─────────────────────────────────────────────────────────┐
│ AUTH SCREEN (separate from onboarding)                 │
│ User enters access code → authenticated                │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 1: Name Input                                      │
│ - "What's your name?"                                   │
│ - Text input                                            │
│ - Save to custom_users.display_name                     │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 2: Welcome                                         │
│ - "Hey, [Name]. Welcome to Oxbow"                       │
│ - Auto-advance after 2.5s                               │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 3: One Moment at a Time                            │
│ - "We experience our lives one moment at a time"        │
│ - Journal Dec 12 (gratitude)                            │
│ - Tap to continue                                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 4: The Question                                    │
│ - "But how do these moments fit together into a         │
│    sensible story?"                                     │
│ - No journal card                                       │
│ - Tap to continue                                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 5: Second Moment                                   │
│ - Journal Dec 18 (striving)                             │
│ - Previous journal gone                                 │
│ - Tap to continue                                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 6: Third Moment                                    │
│ - Journal Dec 21 (connection)                           │
│ - Tap to continue                                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 7: Fourth Moment (darkest)                         │
│ - Journal Dec 27 (doubt/pain)                           │
│ - Tap to continue                                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 8: Step Back (KEY TRANSITION)                      │
│ - "If we step back..."                                  │
│ - Background ZOOMS OUT from close-up to aerial          │
│ - 2-3 second animation                                  │
│ - Auto-advances to step 9                               │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 9: Pattern Revealed                                │
│ - "We can see God's leading across our moments"         │
│ - Aerial background + product screenshot overlay        │
│ - Shows sample Mirror                                   │
│ - Tap to continue                                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 10: Call to Action                                 │
│ - "So where is God leading you?"                        │
│ - "Get started" button                                  │
│ - Triggers completeOnboarding()                         │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ MAIN APP (Journal Screen)                               │
│ - User begins journaling                                │
│ - Permissions requested in context (future feature)     │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Acceptance Criteria

### Must Have
- ✅ All 10 screens render correctly
- ✅ Name input saves to `custom_users.display_name`
- ✅ Name appears on welcome screen
- ✅ Journal cards are sample data only (not saved)
- ✅ Each journal screen shows only ONE card (not accumulating)
- ✅ Dark overlay makes text readable on all backgrounds
- ✅ Step 8 zoom animation is smooth and revelatory
- ✅ Step 9 shows two-layer composition (background + screenshot)
- ✅ "Get started" button completes onboarding and navigates to main app
- ✅ No microphone permission request
- ✅ No journal entry creation during onboarding
- ✅ Entire flow can be completed in 60-90 seconds

### Nice to Have
- 🎯 Tap anywhere to skip auto-advance timers
- 🎯 Subtle sound effects on transitions (optional)
- 🎯 Progress dots at bottom (1-10)
- 🎯 Gesture-based navigation (swipe left/right)
- 🎯 Skip/back buttons (if user wants to review)

### Won't Have (Out of Scope)
- ❌ Microphone permission request
- ❌ Real journal entry creation
- ❌ AI preview generation
- ❌ Notification permission request
- ❌ Friends/sharing pitch

---

## 🎨 Image Optimization Plan

### Current State
- 10 raw background images (not optimized for mobile)

### Optimization Steps

1. **Resize for Mobile**
   - Target dimensions: 1080px width × 1920px height (9:16 ratio)
   - Alternative: 1125px × 2436px (iPhone X+ resolution)
   - Maintain aspect ratio, crop if needed

2. **Compression**
   - Use ImageOptim, TinyPNG, or similar
   - Target: < 300KB per image
   - Balance quality vs. file size

3. **Generate @2x and @3x**
   - Base size: 375×667 logical pixels
   - @2x: 750×1334 (1x the target)
   - @3x: 1125×2001 (1.5x the target)

4. **Test Readability**
   - Apply dark overlay (rgba(0, 0, 0, 0.4))
   - Ensure white text is readable
   - Adjust overlay opacity if needed (0.3-0.5 range)

5. **Organize Assets**
   ```
   assets/onboarding/
   ├── onboarding-bg-01.jpg
   ├── onboarding-bg-01@2x.jpg
   ├── onboarding-bg-01@3x.jpg
   ├── onboarding-bg-02.jpg
   ├── ...
   └── mirror-screenshot.png
   ```

6. **Product Screenshot**
   - Capture sample Mirror screen
   - Dimensions: ~375×812 (iPhone mockup size)
   - Add phone frame mockup (optional)
   - PNG with transparency OR with background

---

## 🧪 Testing Plan

### Manual Testing
1. **Flow completion:** Complete all 10 steps start to finish
2. **Name persistence:** Verify name saves and displays correctly
3. **Journal cards:** Each screen shows correct journal entry
4. **Zoom animation:** Smooth transition on step 8
5. **Image layering:** Step 9 correctly shows background + screenshot
6. **Onboarding completion:** User reaches main app after "Get started"

### Edge Cases
- Very long names (> 50 characters)
- Empty name submission (should be blocked)
- Rapid tapping during animations
- Backgrounding app during onboarding
- Network interruption during name save

### Device Testing
- iPhone SE (small screen)
- iPhone 14 Pro (notch)
- Android (various sizes)
- Tablet (if supported)

---

## 📋 Implementation Checklist

### Phase 1: Setup & Assets
- [ ] Optimize 10 background images
- [ ] Generate @2x and @3x variants
- [ ] Capture/create product screenshot for step 9
- [ ] Add images to `assets/onboarding/` directory
- [ ] Update image references in code

### Phase 2: Context & Data
- [ ] Update `OnboardingContext.tsx` with new step types
- [ ] Add `userName` state to context
- [ ] Remove unused permission/journal states
- [ ] Update STEP_ORDER array

### Phase 3: UI Components
- [ ] Create `NarrativeOnboardingScreen.tsx`
- [ ] Create `JournalSampleCard.tsx`
- [ ] Implement step switching logic
- [ ] Add dark overlay to all screens
- [ ] Style text according to design system

### Phase 4: Animations
- [ ] Add fade transitions between screens
- [ ] Implement journal card slide-up animation
- [ ] Build step 8 zoom animation (critical)
- [ ] Add step 9 screenshot slide-in

### Phase 5: Integration
- [ ] Update `OnboardingNavigator.tsx`
- [ ] Wire up name submission to database
- [ ] Wire up "Get started" to `completeOnboarding()`
- [ ] Test complete flow end-to-end

### Phase 6: Polish
- [ ] Test on multiple devices
- [ ] Adjust overlay opacity if needed
- [ ] Fine-tune animation timings
- [ ] Add progress indicators (optional)
- [ ] Handle edge cases

---

## 🚀 Success Metrics

After implementation, we expect users to:
1. ✅ Complete onboarding in < 90 seconds
2. ✅ Understand the "moments → pattern" metaphor
3. ✅ Feel excited to journal and see their Mirror
4. ✅ Comprehend that Oxbow reveals God's leading
5. ✅ Not be confused about permissions (handled later)

**Key Phrase Users Should Think:** *"I wonder what my Mirror will be."*

---

## 🔗 Related Documents

- [Current Onboarding Docs](./ONBOARDING.md) - Will be replaced
- [Architecture Docs](./ARCHITECTURE.md) - Context system
- [Database Schema](./DATABASE.md) - custom_users table

---

## 📝 Notes

- This completely replaces the existing 5-step onboarding
- Microphone permission will be requested in-context later (separate feature)
- No real journal entries are created during onboarding
- All journal cards are sample data for storytelling
- The zoom animation on step 8 is the most critical piece - worth extra attention

---

**Ready to Build!** All specifications are complete. Implementation can begin.
