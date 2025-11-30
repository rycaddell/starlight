# Oxbow - Architecture Overview

Technical documentation for understanding the codebase structure and design patterns.

## Tech Stack

### Core Technologies
- **Expo SDK ~53.0** - Cross-platform mobile framework
- **React Native 0.79.5** - Native mobile runtime
- **TypeScript** - Type-safe development
- **Expo Router** - File-based routing system
- **React 19** - Latest React with concurrent features

### Styling & UI
- **NativeWind** - Tailwind CSS for React Native
- **React Navigation** - Tab and stack navigation
- **Expo Symbols** - SF Symbols integration

### Backend & Services
- **Supabase** - Backend-as-a-Service (database, custom auth)
- **OpenAI Whisper API** - Voice transcription
- **AsyncStorage** - Local data persistence

### Key Expo Modules
- `expo-av` - Audio recording
- `expo-notifications` - Push notifications
- `expo-haptics` - Haptic feedback
- `expo-blur` - Blur effects

---

## Directory Structure
```
starlight/
├── app/                          # File-based routing (Expo Router)
│   ├── _layout.tsx              # Root layout with providers
│   ├── (tabs)/                  # Tab navigation group
│   │   ├── _layout.tsx         # Tab bar configuration
│   │   ├── index.tsx           # Journal screen (main entry point)
│   │   ├── mirror.tsx          # Mirror reflection screen
│   │   └── friends.tsx         # Friends & sharing screen
│   ├── friend-invite/           # Deep link routes
│   │   └── [token].tsx         # Accept friend invite
│   └── +not-found.tsx          # 404 page
│
├── components/                   # Reusable UI components
│   ├── auth/                    # Authentication UI
│   ├── journal/                 # Journal components (tabs, text input)
│   ├── mirror/                  # Mirror screens & viewer
│   ├── onboarding/              # Onboarding flow screens
│   ├── voice/                   # Voice recording UI
│   ├── friends/                 # Friends & sharing components
│   │   ├── FriendSlots.tsx     # Friend slot UI with invite button
│   │   └── SharePromptCard.tsx # Mirror sharing prompt
│   ├── navigation/              # Auth navigator
│   └── ui/                      # Generic UI components
│
├── contexts/                     # React Context providers
│   ├── AuthContext.tsx          # Authentication state
│   ├── OnboardingContext.tsx    # Onboarding state
│   └── UnreadSharesContext.tsx  # Unread mirror shares tracking
│
├── hooks/                        # Custom React hooks
│   ├── useAudioPermissions.tsx  # Audio permission logic
│   ├── useAudioRecording.tsx    # Recording state & controls
│   ├── useMirrorData.ts         # Mirror data fetching
│   └── useColorScheme.ts        # Theme management
│
├── lib/                          # Utility libraries & services
│   ├── supabase/                # Supabase service layer
│   │   ├── client.js           # Supabase client init
│   │   ├── auth.js             # Auth operations
│   │   ├── journals.js         # Journal CRUD
│   │   ├── mirrors.js          # Mirror CRUD
│   │   ├── friends.js          # Friend invite & linking
│   │   ├── mirrorShares.js     # Mirror sharing operations
│   │   └── feedback.js         # Feedback handling
│   └── whisperService.ts        # OpenAI Whisper integration
│
├── types/                        # TypeScript definitions
│   └── database.ts              # Database schema types
│
├── constants/                    # App constants
│   └── Colors.ts                # Color palette
│
├── assets/                       # Static assets (images, fonts)
└── scripts/                      # Utility scripts
```

---

## Architecture Patterns

### 1. File-Based Routing (Expo Router)

Routes are automatically created from the `app/` directory structure:

**Conventions:**
- `(tabs)` - Route group for tab navigation (parentheses prevent route segment in URL)
- `_layout.tsx` - Defines layout and providers for nested routes
- `+not-found.tsx` - Catch-all 404 route

**Example:**
```
app/
  (tabs)/
    index.tsx        → /
    mirror.tsx       → /mirror
```

### 2. Context + Custom Hooks Pattern

**State Management Strategy:**
- **Contexts** provide global state (auth, onboarding, settings)
- **Custom hooks** encapsulate complex logic and side effects
- Components consume contexts via hooks

**Example:**
```typescript
// Context provides state
<AuthContext.Provider value={{ user, signIn, signOut }}>
  {children}
</AuthContext.Provider>

// Hook consumes it
const { user, signIn } = useAuth();
```

**Key Contexts:**
- `AuthContext` - User authentication state
- `OnboardingContext` - First-time user flow state
- `UnreadSharesContext` - Unread mirror shares tracking
- `GlobalSettingsContext` - App-wide settings

### 3. Service Layer Pattern

All backend operations are abstracted into `lib/supabase/` modules:
```typescript
// lib/supabase/journals.js
export async function createJournal(userId, content) {
  const { data, error } = await supabase
    .from('journals')
    .insert({ user_id: userId, content });
  return { data, error };
}

// Component uses the service
import { createJournal } from '@/lib/supabase/journals';
await createJournal(user.id, journalText);
```

**Benefits:**
- Clean separation between UI and data layer
- Consistent error handling
- Easy to test and mock
- Single source of truth for API calls

### 4. Component-Driven Development

**Principles:**
- Components organized by feature domain
- Small, focused, reusable components
- Props-based composition over inheritance
- Container/Presentational pattern

**Example Structure:**
```
components/
  journal/
    JournalTabs.tsx          # Container (logic)
    TextJournalInput.tsx     # Presentational (UI)
    JournalSubmitButton.tsx  # Presentational (UI)
```

---

## Key Design Decisions

### 1. No Traditional Auth System

**Why:** Access code-based authentication instead of email/password
- Simpler onboarding (no email verification)
- Better for group/invitation-based access
- Pre-created user records mapped to codes

**Implementation:** `lib/supabase/auth.js` + `contexts/AuthContext.tsx`

### 2. Voice as First-Class Input

**Why:** Voice journaling is a core feature, not an add-on
- Entire UX designed around voice parity with text
- Dedicated `useAudioRecording` hook
- Whisper integration for transcription

**Implementation:** `hooks/useAudioRecording.tsx` + `lib/whisperService.ts`

### 3. Modal-Based Mirror Experience

**Why:** Immersive reflection experience separate from main app
- Full-screen modals with swipeable screens
- Creates focused spiritual reflection moment
- Easy to revisit past mirrors

**Implementation:** `components/mirror/MirrorModal.tsx`

### 4. 10-Journal Threshold (Configurable)

**Why:** Core progression mechanic
- Ensures sufficient content for meaningful AI reflection
- Creates anticipation and engagement
- Natural chunking of journaling journey
- Default threshold is 10 journals (configurable server-side)

**Implementation:** Progress tracking in `app/(tabs)/mirror.tsx`

### 5. Friends & Mirror Sharing

**Why:** Social accountability and spiritual growth together
- Users can connect with friends via invite links
- Share specific mirrors for mutual encouragement
- 3-screen view for shared mirrors (vs 4 screens for own)
- Reflection privacy preserved (questions/actions not shared)
- Deep linking for seamless friend invites

**Implementation:**
- `app/(tabs)/friends.tsx` - Friends screen with conditional UI
- `app/friend-invite/[token].tsx` - Deep link invite acceptance
- `lib/supabase/friends.js` + `lib/supabase/mirrorShares.js` - Service layer
- `contexts/UnreadSharesContext.tsx` - Tab badge tracking
- Server-side mirror generation with polling

### 6. Deep Linking for Friend Invites

**Why:** Seamless friend connection experience
- Users share custom invite links via native share sheet
- Recipients tap link to accept invite automatically
- Links expire after 72 hours
- Custom URL scheme: `oxbow://friend-invite/[token]`

**Implementation:**
- `app.config.js` - Custom scheme configuration
- `app/friend-invite/[token].tsx` - Invite acceptance route
- Expo Router handles deep link navigation

---

## Data Flow

### Journaling Flow
```
User Input (Text/Voice)
    ↓
useAudioRecording hook (if voice)
    ↓
Whisper API (transcription)
    ↓
lib/supabase/journals.createJournal()
    ↓
Supabase Database
    ↓
UI Update (navigation to mirror screen)
```

### Mirror Generation Flow
```
10+ Journals Collected (configurable threshold)
    ↓
User taps "Unlock Mirror"
    ↓
lib/supabase/mirrors.generateMirror()
    ↓
Server-side Edge Function (mirror-generation-request)
    ↓
Client polls status every 3 seconds
    ↓
Server processes journals with OpenAI
    ↓
Mirror saved to database
    ↓
Associated journals marked with mirror_id
    ↓
Polling detects completion
    ↓
User views 4-screen Mirror experience
    ↓
Mirror marked as viewed (has_been_viewed: true)
```

### Friend Invite Flow
```
User A taps "Create Invite Link"
    ↓
lib/supabase/friends.createInviteLink()
    ↓
Generate unique token + deep link (oxbow://friend-invite/[token])
    ↓
Save invite record (inviter_user_id, token, expires 72h)
    ↓
Open native share sheet with invite message
    ↓
User B receives link and taps it
    ↓
Deep link opens app → app/friend-invite/[token].tsx
    ↓
Token validated (not expired, not already accepted)
    ↓
lib/supabase/friends.acceptFriendInvite()
    ↓
Create friend_link record (bi-directional, ordered IDs)
    ↓
Update invite record (accepted_at, accepted_by_user_id)
    ↓
User B sees success message
    ↓
Both users see each other in Friends screen
```

### Mirror Sharing Flow
```
User A views completed mirror
    ↓
Taps "Share" button
    ↓
Friend picker modal appears (shows all friends)
    ↓
User A selects friend(s) to share with
    ↓
lib/supabase/mirrorShares.shareMirrorWithFriend()
    ↓
Create mirror_share record for each recipient
    ↓
User B's tab badge updates (UnreadSharesContext)
    ↓
User B opens Friends tab
    ↓
Sees shared mirror with "NEW" badge
    ↓
Taps to view → lib/supabase/mirrorShares.getSharedMirrorDetails()
    ↓
MirrorViewer opens with isSharedMirror={true}
    ↓
Shows 3 screens (themes, biblical, observations)
    ↓
Reflection questions/actions excluded for privacy
    ↓
Share marked as viewed (viewed_at timestamp)
    ↓
Badge changes from "NEW" to "VIEW"
```

---

## Configuration

### App Config (`app.config.js`)
- **Bundle ID:** `com.caddell.oxbow`
- **Display Name:** "Oxbow"
- **EAS Project ID:** `5bd0cede-3ebf-4efe-8b38-706e792e5b20`
- **Platforms:** iOS, Android, Web
- **Custom Scheme:** `oxbow://` (for deep linking)

### Deep Linking Configuration

**Scheme:** `oxbow://`

**Routes:**
- `oxbow://friend-invite/[token]` - Accept friend invite

**Implementation:**
```javascript
// app.config.js
{
  expo: {
    scheme: "oxbow",
    // ...
  }
}
```

**Usage:**
```typescript
// Deep link URL format
const deepLink = `oxbow://friend-invite/${token}`;

// Expo Router automatically handles navigation
// Route: app/friend-invite/[token].tsx
```

### Environment Variables
Required in `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_key
```

---

## Performance Considerations

### Audio Recording
- 8-minute maximum recording length
- Automatic cleanup on stop/error
- Duration tracking via interval

### Transcription
- Async processing (doesn't block UI)
- Error handling for API failures
- Progress indication during transcription

### Database Queries
- Optimistic UI updates where possible
- Error boundaries for failed loads
- Pagination for journal history (if implemented)

---

## Platform-Specific Notes

### iOS
- SF Symbols via `expo-symbols`
- Microphone permissions via Info.plist
- Haptic feedback available

### Android
- Material Design components where appropriate
- Microphone permissions via AndroidManifest.xml
- Haptic feedback available

### Web
- Limited audio recording support
- Graceful degradation for unsupported features
- Responsive design via NativeWind

---

## Resources

- [Expo Documentation](https://docs.expo.dev)
- [Expo Router Guide](https://docs.expo.dev/router/introduction)
- [NativeWind Docs](https://www.nativewind.dev)
- [Supabase Docs](https://supabase.com/docs)
- [React Native Docs](https://reactnative.dev)