# Oxbow - New Engineer Onboarding Guide

Welcome to Oxbow! This guide will help you understand the core features, workflows, and key insights to get you productive quickly.

---

## 🎯 What is Oxbow?

Oxbow is a **spiritual journaling mobile app** that:
1. Lets users capture journal entries via **text or voice**
2. Transcribes voice recordings automatically using **OpenAI Whisper**
3. Generates **AI-powered spiritual reflections** ("Mirrors") after 15 journal entries
4. Provides a progression system that encourages regular journaling

**Target Platforms:** iOS, Android, Web

---

## 🚀 Getting Started

### First-Time Setup

1. **Clone and install:**
```bash
   git clone [repo-url]
   cd starlight
   npm install
```

2. **Set up environment:**
```bash
   cp .env.example .env
   # Add your Supabase and OpenAI credentials
```

3. **Run the app:**
```bash
   npx expo start
   # Press 'i' for iOS, 'a' for Android, 'w' for web
```

4. **Get an access code:**
   - Ask your team lead for a test access code
   - Access codes are pre-created in the `custom_users` table

---

## 🏗️ Core Features

### 1. Journal Entry System

**Location:** `app/(tabs)/index.tsx`

Users can create journal entries in two ways:

#### Text Journaling
- Traditional text input with submit button
- Simple, familiar UX
- Instant submission

#### Voice Journaling
- Tap microphone to start recording
- Speak naturally (up to 8 minutes)
- Automatic transcription via Whisper API
- Auto-submit after transcription

**Flow:**
```
User Input → Save to Supabase → Navigate to Mirror Screen → Track Progress
```

**Key Files:**
- `app/(tabs)/index.tsx` - Main journal screen orchestration
- `components/journal/JournalTabs.tsx` - Tab switcher (text/voice)
- `components/journal/TextJournalInput.tsx` - Text input UI
- `components/voice/VoiceRecordingTab.tsx` - Voice recording UI
- `hooks/useAudioRecording.tsx` - Recording logic
- `lib/supabase/journals.js` - Database operations

---

### 2. Voice Recording System

**Hook:** `hooks/useAudioRecording.tsx`

This is one of the most critical pieces of the app. It manages:

#### States
```typescript
isRecording: boolean    // Is recording active?
isPaused: boolean       // Is recording paused?
recordingDuration: number // Current duration in seconds
recording: Audio.Recording | null // The recording object
```

#### Control Functions
- `handleStartRecording()` - Creates recording instance
- `handlePauseRecording()` - Pauses recording
- `handleResumeRecording()` - Resumes from pause
- `handleStopRecording()` - Stops, saves, and initiates transcription

#### Recording Flow
```
Start → Configure Audio Mode → Create Recording → Track Duration
  ↓
Pause (optional) → Store current state
  ↓
Resume (optional) → Continue recording
  ↓
Stop → Extract URI → Send to Whisper → Save to Database
```

**Important Notes:**
- 8-minute maximum recording length (enforced)
- Automatic cleanup on errors
- Duration tracking via 1-second interval
- Permissions checked before recording

---

### 3. Voice Transcription

**Service:** `lib/whisperService.ts`

Uses OpenAI's Whisper API to convert audio to text:
```typescript
const transcription = await transcribeAudio(recordingUri);
// Returns transcribed text or throws error
```

**Flow:**
1. Recording stopped → URI extracted
2. Audio file sent to Whisper API
3. Transcription received
4. Text used to create journal entry
5. User navigated to Mirror screen

**Error Handling:**
- Network failures show user alert
- Recording preserved even if transcription fails
- User can retry or manually enter text

---

### 4. Mirror Generation System

**Location:** `app/(tabs)/mirror.tsx`

Mirrors are **AI-generated spiritual reflections** based on 15 journal entries.

#### The Mirror Concept
After collecting 15 journals, users can "unlock" a Mirror containing:
- **Screen 1:** Identified themes from their journals
- **Screen 2:** Relevant biblical references
- **Screen 3:** Observations about their journey
- **Screen 4:** Suggestions for spiritual growth

#### Technical Implementation
```typescript
// Mirror structure in database
{
  id: string
  user_id: string
  screen_1_themes: JSON
  screen_2_biblical: JSON
  screen_3_observations: JSON
  screen_4_suggestions: JSON
  created_at: string
  journal_count: number  // Should be 15
}
```

#### Mirror Flow
```
15 Journals Collected
  ↓
"Unlock Mirror" button appears
  ↓
User taps unlock
  ↓
Loading animation
  ↓
Server generates Mirror (AI processing)
  ↓
Mirror saved to database
  ↓
Associated journals marked with mirror_id
  ↓
User views 4-screen immersive experience
  ↓
Mirror saved to history for re-viewing
```

**Key Files:**
- `app/(tabs)/mirror.tsx` - Mirror screen orchestration
- `components/mirror/MirrorModal.tsx` - Full-screen mirror viewer
- `components/mirror/ScreenOne.tsx` through `ScreenFour.tsx` - Individual screens
- `lib/supabase/mirrors.js` - Database operations
- `hooks/useMirrorData.ts` - Data fetching and state

---

### 5. Authentication System

**Context:** `contexts/AuthContext.tsx`  
**Service:** `lib/supabase/auth.js`

#### How Auth Works

**⚠️ Important:** Oxbow uses **access codes**, NOT email/password.

**Why?**
- Simpler onboarding (no email verification)
- Better for group-based or invitation-based access
- Pre-created user records mapped to codes

**User Flow:**
1. User enters access code on sign-in screen
2. Code validated against `custom_users` table
3. If valid, user data stored in AsyncStorage
4. User automatically signed in on next app launch

**User Properties:**
```typescript
{
  id: string
  access_code: string
  display_name: string
  status: string
  group_name?: string
  invited_by?: string
}
```

**Session Persistence:**
- Access code stored in AsyncStorage
- Auto sign-in on app launch if code exists
- Sign out clears AsyncStorage

---

### 6. Onboarding Flow

**Context:** `contexts/OnboardingContext.tsx`  
**Components:** `components/onboarding/`

New users go through a multi-step wizard:

1. **Welcome Screen** - Explains the app's purpose
2. **Microphone Permission** - Requests audio recording access
3. **Notification Permission** - Requests push notification access
4. **How It Works** - Explains journaling → Mirror flow

**Implementation Notes:**
- Onboarding shown only once (tracked in AsyncStorage)
- Can be reset for testing
- Permissions can be skipped but are requested again when needed

---

## 🔑 Key Workflows

### Complete Journaling Workflow
```
1. App Launch
   ↓ (AuthContext checks AsyncStorage)
2. Auto Sign-In (if access code exists)
   ↓
3. Land on Journal Screen (app/(tabs)/index.tsx)
   ↓
4. User chooses Text or Voice input
   ↓
5a. TEXT PATH:
    - Type journal entry
    - Tap submit
    - Save to Supabase
    
5b. VOICE PATH:
    - Check microphone permissions
    - Tap record button
    - Speak (up to 8 minutes)
    - Tap stop
    - Send to Whisper API
    - Receive transcription
    - Save to Supabase
   ↓
6. Navigate to Mirror Screen
   ↓
7. Show progress (X/15 journals)
   ↓
8. If 15th journal → Show "Unlock Mirror" button
```

### Complete Mirror Generation Workflow
```
1. User reaches 15 journals
   ↓
2. "Unlock Mirror" button appears on Mirror screen
   ↓
3. User taps unlock
   ↓
4. Loading animation plays
   ↓
5. API call to generate Mirror
   ↓
6. Server processes journals with AI (OpenAI)
   ↓
7. Mirror content generated (4 screens of insights)
   ↓
8. Mirror saved to database
   ↓
9. Associated 15 journals marked with mirror_id
   ↓
10. Modal opens with swipeable 4-screen experience
    ↓
11. User can swipe through all 4 screens
    ↓
12. Mirror saved to history
    ↓
13. User can re-view past mirrors anytime
```

---

## 💡 Key Insights for New Engineers

### 1. No Traditional Auth = By Design
This app doesn't use email/password authentication. Access codes map to pre-created user records. This is **intentional** for the product's use case (likely group-based or invitation-based access model).

**Don't try to add email/password auth without discussing with the team first.**

---

### 2. Voice is First-Class, Not Secondary
Voice journaling isn't a "nice-to-have" feature added later. The entire UX is designed around making voice input as seamless as text input.

**When working on journal features, always consider both input modes equally.**

---

### 3. The 15-Journal Threshold is Sacred
The "15 journals = 1 Mirror" mechanic is a **core product decision**, not arbitrary:
- Creates progression system and anticipation
- Ensures sufficient content for meaningful AI reflection
- Natural chunking of the journaling journey

**Don't change this number without product team approval.**

---

### 4. Mirrors are Immersive Experiences
Mirrors render as full-screen modals with swipeable screens, not as part of the main navigation flow. This is intentional to create a focused, contemplative moment separate from the daily journaling routine.

**Respect the modal pattern - don't try to inline Mirror content.**

---

### 5. Expo Router Conventions Matter
Understanding Expo Router patterns is critical:
```
(tabs)/           # Parentheses = layout group (not in URL)
_layout.tsx       # Underscore = layout file
+not-found.tsx    # Plus = catch-all route
index.tsx         # Default route for a directory
```

**Don't rename these files without understanding routing implications.**

---

### 6. Service Layer is Your Friend
All Supabase operations are abstracted into `lib/supabase/`. **Always use these service functions** rather than calling Supabase directly from components.
```typescript
// ❌ Don't do this in components
const { data } = await supabase.from('journals').select('*');

// ✅ Do this instead
import { fetchJournals } from '@/lib/supabase/journals';
const journals = await fetchJournals(userId);
```

---

### 7. Context + Hooks Pattern
State management follows a consistent pattern:
- **Contexts** provide global state
- **Custom hooks** encapsulate logic
- **Components** consume via hooks

**Follow this pattern for new features.**

---

## 🧪 Testing Your Changes

### Testing Journaling
1. Sign in with a test access code
2. Try creating a text journal entry
3. Try creating a voice journal entry (requires microphone)
4. Verify both appear on Mirror screen with correct progress

### Testing Voice Recording
1. Grant microphone permissions when prompted
2. Start recording, speak for 10 seconds, stop
3. Verify transcription appears
4. Test pause/resume functionality
5. Test 8-minute limit enforcement

### Testing Mirrors
1. Create 14 journal entries (or use existing test account)
2. Create 15th journal
3. Verify "Unlock Mirror" button appears
4. Tap unlock and verify loading state
5. Verify Mirror modal opens with 4 swipeable screens
6. Verify Mirror appears in history

### Testing Auth
1. Sign out completely
2. Close and reopen app
3. Enter valid access code
4. Verify auto sign-in on subsequent launches

---

## 🐛 Common Gotchas

### 1. Permissions Not Granted
**Problem:** Voice recording fails silently  
**Solution:** Check `useAudioPermissions.tsx` - permissions must be granted before recording

### 2. Stale Closures in Hooks
**Problem:** State updates don't reflect in callbacks  
**Solution:** Use refs for values accessed in async callbacks or event listeners

### 3. AsyncStorage Not Clearing
**Problem:** Auth persists after sign out in dev  
**Solution:** Manually clear AsyncStorage or reinstall app

### 4. Whisper API Timeout
**Problem:** Long recordings time out during transcription  
**Solution:** This is expected for 8-minute recordings - add retry logic

### 5. Mirror Not Unlocking at 15
**Problem:** User has 15 journals but no unlock button  
**Solution:** Check that journals have `mirror_id: null` (not already used)

---

## 📚 Where to Go Next

### Learn More About:
- **Architecture:** See [ARCHITECTURE.md](ARCHITECTURE.md) for technical deep-dive
- **Database:** See [DATABASE.md](DATABASE.md) for schema details
- **Development:** See [DEVELOPMENT.md](DEVELOPMENT.md) for workflows

### Explore the Codebase:
Start with these files in order:
1. `app/_layout.tsx` - App entry point and providers
2. `contexts/AuthContext.tsx` - How auth works
3. `app/(tabs)/index.tsx` - Main journal screen
4. `hooks/useAudioRecording.tsx` - Voice recording logic
5. `lib/supabase/journals.js` - Database operations

---

## 🤝 Need Help?

- **Questions about features?** Ask the product team
- **Technical questions?** Check the documentation or ask senior engineers
- **Found a bug?** Create an issue in the tracker
- **Want to contribute?** See CONTRIBUTING.md

---

Welcome to the team! Happy coding! 🎉