# Oxbow - Development Guide

Complete guide for development workflows, configuration, testing, and deployment.

---

## 🚀 Development Setup

### Prerequisites

- **Node.js:** 18.x or higher
- **npm:** 9.x or higher
- **Expo CLI:** Installed globally or via npx
- **iOS Development:** Xcode 14+ (Mac only)
- **Android Development:** Android Studio with SDK 33+

### Initial Setup
```bash
# Clone repository
git clone [repo-url]
cd starlight

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env  # or your preferred editor
```

### Environment Variables

Create a `.env` file in the project root:
```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# OpenAI Configuration
EXPO_PUBLIC_OPENAI_API_KEY=sk-your-openai-key-here
```

**⚠️ Security Notes:**
- Never commit `.env` to git (already in `.gitignore`)
- Use `EXPO_PUBLIC_` prefix for client-accessible variables
- Rotate keys regularly
- Use different keys for dev/staging/production

---

## 🛠️ Development Commands

### Start Development Server
```bash
# Start Expo dev server
npx expo start

# Or use npm scripts
npm start
```

**Available Options:**
- Press `i` - Open iOS simulator
- Press `a` - Open Android emulator
- Press `w` - Open in web browser
- Press `r` - Reload app
- Press `m` - Toggle menu

### Platform-Specific Development
```bash
# iOS (requires Mac + Xcode)
npm run ios

# Android (requires Android Studio)
npm run android

# Web
npm run web
```

### Type Checking
```bash
# Run TypeScript compiler
npx tsc --noEmit

# Watch mode
npx tsc --noEmit --watch
```

### Linting
```bash
# Run ESLint (if configured)
npm run lint

# Auto-fix issues
npm run lint:fix
```

---

## 📱 Platform-Specific Setup

### iOS Development

**Requirements:**
- macOS with Xcode 14+
- iOS Simulator or physical device
- Apple Developer account (for device testing)

**Setup Steps:**
1. Install Xcode from App Store
2. Install Command Line Tools:
```bash
   xcode-select --install
```
3. Accept Xcode license:
```bash
   sudo xcodebuild -license accept
```
4. Install iOS simulator (via Xcode → Preferences → Components)

**Running on Device:**
```bash
npx expo run:ios --device
```

### Android Development

**Requirements:**
- Android Studio
- Android SDK 33+
- Android Emulator or physical device

**Setup Steps:**
1. Install [Android Studio](https://developer.android.com/studio)
2. Install Android SDK via SDK Manager
3. Create virtual device (AVD) via AVD Manager
4. Add to `.bashrc` or `.zshrc`:
```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
```
5. Restart terminal

**Running on Emulator:**
```bash
# Start emulator first
emulator -avd Pixel_5_API_33

# Then run app
npx expo run:android
```

**Running on Device:**
1. Enable Developer Options on device
2. Enable USB Debugging
3. Connect via USB
4. ```bash
   npx expo run:android --device

🧪 Testing
Manual Testing Checklist
Authentication Flow

 Sign in with valid access code
 Sign in with invalid access code (should fail)
 Sign out and verify session cleared
 Close app and reopen (should auto sign-in)
 Test on fresh install (onboarding should appear)

Text Journaling

 Create text journal entry
 Verify entry appears on Mirror screen
 Check entry saved in database
 Test with empty text (should fail)
 Test with very long text (8000+ characters)

Voice Journaling

 Request microphone permissions (first time)
 Start recording
 Speak for 10 seconds
 Stop recording
 Verify transcription appears
 Verify entry saved to database
 Test pause/resume functionality
 Test 8-minute limit (should stop automatically)
 Test recording without microphone permission (should prompt)

Mirror Generation

 Create 9 journals
 Verify progress shows 9/10 (or appropriate threshold)
 Create 10th journal
 Verify "Unlock Mirror" button appears
 Tap unlock
 Verify polling starts (check logs: "🔄 Starting to poll...")
 Verify loading state while generating
 Verify polling completes (check logs: "📊 Generation status: completed")
 Verify Mirror modal opens
 Swipe through all 4 screens
 Verify mirror marked as viewed (has_been_viewed: true)
 Close and reopen Mirror from history
 Create 10 more journals and generate second Mirror

Friend Invites

 Open Friends tab (should show pitch if no friends)
 Tap "Create Invite Link"
 Verify native share sheet opens
 Verify deep link format: oxbow://friend-invite/[token]
 Copy link and paste in notes app
 Open link from another device/test account
 Verify app opens to friend-invite route
 Verify token validation (not expired, not already used)
 Verify friendship created (bi-directional)
 Verify both users see each other in Friends screen
 Test expired invite (72+ hours old) - should fail
 Test already-accepted invite - should fail
 Verify friend slots update correctly (max 5 friends)

Mirror Sharing

 Generate a mirror (10+ journals)
 Ensure at least one friend exists
 Navigate to Mirror screen
 Scroll to past mirrors section
 Tap "Share" button on a completed mirror
 Verify FriendPickerModal opens
 Select one or more friends
 Tap "Share"
 Verify success message
 Verify shares created in database
 On recipient's device:
   - Verify Friends tab badge shows unread count
   - Open Friends tab
   - Verify shared mirror appears with "NEW" badge
   - Tap to view shared mirror
   - Verify MirrorViewer opens with 3 screens (not 4)
   - Verify screens shown: themes, biblical, observations
   - Verify screen 4 (reflection questions) is excluded
   - Verify share marked as viewed (viewed_at timestamp)
   - Verify badge changes from "NEW" to "VIEW"
   - Close and reopen - badge should still say "VIEW"
 Test sharing same mirror with multiple friends
 Test viewing shared mirror multiple times

Edge Cases

 Airplane mode (offline behavior)
 Low battery warning during recording
 Incoming call during recording
 App backgrounded during recording
 Device locked during recording
 Force quit app mid-recording
 App backgrounded during mirror generation
 App force-quit during mirror generation
 Deep link opened when app already running
 Deep link opened when app is not running
 Accept invite from user who is already a friend
 Share mirror with friend who already has it shared

Testing Deep Linking

Test deep links on real devices (simulators may not handle deep links correctly):

**iOS:**
```bash
# Connect iPhone via USB
# Trust computer on device
npx expo run:ios --device

# Test deep link
# Send invite link via Messages or Notes app
# Tap link to open app
```

**Android:**
```bash
# Enable USB debugging on device
# Connect via USB
adb devices  # Verify device shows up
npx expo run:android --device

# Test deep link via ADB
adb shell am start -W -a android.intent.action.VIEW \
  -d "oxbow://friend-invite/test-token-here" \
  com.caddell.oxbow
```

**Manual Testing:**
1. Create invite link on Device A
2. Send link via Messages/Email to Device B
3. Open link on Device B
4. Verify app opens to friend-invite route
5. Verify friendship created

Testing with Real Devices
iOS:
```bash
# Connect iPhone via USB
# Trust computer on device
npx expo run:ios --device
```
Android:
```bash
# Enable USB debugging on device
# Connect via USB
adb devices  # Verify device shows up
npx expo run:android --device
```
Debugging Tools
React Native Debugger:
bash# Install
brew install --cask react-native-debugger

# Use Cmd+D (iOS) or Cmd+M (Android) in app
# Select "Debug with Chrome"
Flipper:
bash# Install
brew install --cask flipper

# Auto-connects to running apps
# View logs, network, database, etc.
Expo Dev Tools:
bash# Automatically opens when running npx expo start
# View logs, device list, QR code

🏗️ Build & Deployment
EAS Build (Recommended)
Setup:
bash# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure project
eas build:configure
Build for iOS:
bash# Development build
eas build --platform ios --profile development

# Preview build (TestFlight)
eas build --platform ios --profile preview

# Production build
eas build --platform ios --profile production
Build for Android:
bash# Development build
eas build --platform android --profile development

# Preview build (internal testing)
eas build --platform android --profile preview

# Production build (Google Play)
eas build --platform android --profile production
Build Configuration:
eas.json:
json{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  }
}
Local Builds
iOS:
bashnpx expo run:ios --configuration Release
Android:
bashnpx expo run:android --variant release

🔧 Configuration Files
app.config.js
Main app configuration:
javascriptexport default {
  expo: {
    name: "Oxbow",
    slug: "oxbow",
    version: "1.0.0",
    scheme: "oxbow",
    platforms: ["ios", "android", "web"],
    
    // Icons & Splash
    icon: "./assets/images/icon.png",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    
    // iOS Config
    ios: {
      bundleIdentifier: "com.caddell.oxbow",
      supportsTablet: true,
      infoPlist: {
        NSMicrophoneUsageDescription: "Oxbow needs microphone access for voice journaling."
      }
    },
    
    // Android Config
    android: {
      package: "com.caddell.oxbow",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: ["RECORD_AUDIO"]
    },
    
    // Web Config
    web: {
      favicon: "./assets/images/favicon.png",
      bundler: "metro"
    },
    
    // Plugins
    plugins: [
      "expo-router",
      [
        "expo-av",
        {
          microphonePermission: "Allow Oxbow to access your microphone for voice journaling."
        }
      ]
    ]
  }
}
package.json Scripts
json{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "jest",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  }
}
tsconfig.json
TypeScript configuration:
json{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}

📝 Code Style Guidelines
File Naming

Components: PascalCase - VoiceRecordingTab.tsx
Hooks: camelCase with 'use' prefix - useAudioRecording.tsx
Services: camelCase - whisperService.ts
Types: PascalCase - database.ts (exports PascalCase types)
Constants: PascalCase - Colors.ts

Component Structure
typescriptimport React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';

// 1. Type definitions
interface Props {
  title: string;
  onPress: () => void;
}

// 2. Component definition
export default function MyComponent({ title, onPress }: Props) {
  // 3. Hooks
  const [state, setState] = useState('');
  
  useEffect(() => {
    // Side effects
  }, []);
  
  // 4. Event handlers
  const handlePress = () => {
    onPress();
  };
  
  // 5. Render
  return (
    <View>
      <Text>{title}</Text>
    </View>
  );
}
Hook Structure
typescriptimport { useState, useEffect, useRef } from 'react';

export function useMyHook(initialValue: string) {
  // 1. State
  const [value, setValue] = useState(initialValue);
  const ref = useRef<string | null>(null);
  
  // 2. Effects
  useEffect(() => {
    // Setup
    return () => {
      // Cleanup
    };
  }, []);
  
  // 3. Functions
  const updateValue = (newValue: string) => {
    setValue(newValue);
  };
  
  // 4. Return API
  return {
    value,
    updateValue,
  };
}
Service Layer Pattern
typescript// lib/supabase/myService.js
import { supabase } from './client';

export async function fetchData(userId) {
  try {
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}
Error Handling
typescript// ✅ Good - Specific error handling
try {
  await someAsyncOperation();
} catch (error) {
  if (error instanceof NetworkError) {
    Alert.alert('Network Error', 'Please check your connection');
  } else {
    Alert.alert('Error', 'Something went wrong');
  }
  console.error('Operation failed:', error);
}

// ❌ Bad - Silent failures
try {
  await someAsyncOperation();
} catch (error) {
  // Nothing
}

🐛 Troubleshooting
Common Issues
"Metro bundler not starting"
bash# Clear Metro cache
npx expo start -c

# Or
rm -rf node_modules
npm install
npx expo start
"Module not found" errors
bash# Clear watchman (Mac)
watchman watch-del-all

# Clear Metro + npm
rm -rf node_modules
npm install
npx expo start -c
"Microphone permissions not working"

iOS: Check Settings → Oxbow → Microphone
Android: Check Settings → Apps → Oxbow → Permissions
Rebuild app after changing Info.plist/AndroidManifest

"Supabase connection failing"

Verify .env file exists and has correct values
Check EXPO_PUBLIC_ prefix on environment variables
Restart dev server after changing .env
Verify Supabase project is not paused

"TypeScript errors in IDE but builds fine"
bash# Restart TypeScript server in VS Code
Cmd+Shift+P → "TypeScript: Restart TS Server"

# Or regenerate types
npx expo customize tsconfig.json
"iOS build fails with provisioning error"

Check Apple Developer account status
Verify bundle identifier matches
Update provisioning profiles in Xcode
Clean build folder: Xcode → Product → Clean Build Folder

"Android build fails with Gradle error"
```bash
# Clear Gradle cache
cd android
./gradlew clean

# Or full clean
rm -rf android/.gradle
rm -rf android/build
```

**"Deep link not opening app"**
- **iOS:** Verify `scheme: "oxbow"` in app.config.js
- **Android:** Verify intent filter in AndroidManifest.xml
- Rebuild app after changing scheme configuration
- Test on real device (simulators may not handle deep links)
- Check that app is installed and not just in Expo Go

**"Friend invite token expired"**
- Tokens expire after 72 hours
- Check `friend_invites.created_at` timestamp
- Generate new invite link

**"Friendship already exists"**
- Check `friend_links` table for existing relationship
-友情 records use ordered IDs (user_a_id < user_b_id)
- Accepting duplicate invite should fail gracefully

**"Friends tab badge not updating"**
- Verify `UnreadSharesContext` is initialized in root layout
- Check `refreshUnreadCount()` is called after viewing shares
- Verify `getUnviewedSharesCount()` query is correct

**"Shared mirror showing 4 screens instead of 3"**
- Verify `isSharedMirror={true}` prop passed to MirrorViewer
- Check MirrorViewer conditional rendering logic
- Screen 4 should only show when `!isSharedMirror`

**"Mirror generation card disappearing"**
- Check polling logic in `hooks/useMirrorData.ts`
- Polling should only restart if `mirrorState === 'generating'`
- Verify `mirrorStateRef.current` is up-to-date (not stale closure)
- Check logs for polling status messages

🔍 Debugging Techniques
Console Logging
typescript// Basic logging
console.log('Value:', value);

// Structured logging
console.log('📝 Journal created:', {
  id: journal.id,
  userId: journal.user_id,
  length: journal.content.length
});

// Error logging
console.error('❌ Failed to save:', error);

// Warning logging
console.warn('⚠️ Deprecated feature used');
React Native Debugger
typescript// Add debugger statement
const handlePress = () => {
  debugger; // Execution pauses here
  doSomething();
};

// Network inspection
// Open React Native Debugger
// Network tab shows all fetch/axios requests
Expo DevTools
bash# View console logs
npx expo start
# Logs appear in terminal

# View device logs
# Shake device → "Show Developer Menu" → "Debug Remote JS"
Performance Profiling
typescript// Measure render performance
import { Profiler } from 'react';

<Profiler id="MyComponent" onRender={(id, phase, actualDuration) => {
  console.log(`${id} took ${actualDuration}ms`);
}}>
  <MyComponent />
</Profiler>

🔐 Security Best Practices
Environment Variables

✅ Use EXPO_PUBLIC_ prefix for client variables
❌ Never commit API keys to git
✅ Use different keys for dev/staging/prod
✅ Rotate keys regularly

API Keys

✅ Store Supabase anon key in env (safe for client)
❌ Never expose Supabase service role key in client
✅ OpenAI key should ideally be server-side (if possible)

User Data

✅ Use Supabase RLS policies
✅ Validate user_id matches authenticated user
❌ Never trust client-side user_id without verification

Authentication

✅ Store access codes securely in AsyncStorage
✅ Clear AsyncStorage on sign out
❌ Never log access codes or tokens


📚 Useful Resources
Documentation

Expo Docs
React Native Docs
Expo Router
Supabase Docs
NativeWind

Tools

Expo Snack - Online playground
React Native Directory - Package search
EAS Build Dashboard

Community

Expo Forums
React Native Community Discord
Supabase Discord


🚢 Release Checklist
Before releasing a new version:

 Update version in app.config.js
 Update version in package.json
 Test on both iOS and Android devices
 Verify all environment variables are correct
 Test offline functionality
 Test app backgrounding/foregrounding
 Verify microphone permissions work
 Test voice recording end-to-end
 Test Mirror generation with 10+ journals
 Test server-side mirror generation polling
 Test friend invite creation and acceptance
 Test deep linking on real devices
 Test mirror sharing (sender and recipient)
 Verify unread badge updates correctly
 Test shared mirror shows 3 screens (not 4)
 Check for console warnings/errors
 Run type checking: npx tsc --noEmit
 Build preview version: eas build --profile preview
 Test preview build on devices
 Update changelog/release notes
 Build production: eas build --profile production
 Submit to App Store / Google Play


💡 Tips & Tricks
Fast Refresh

Saves time - changes appear instantly
Preserves component state
Press r in Expo CLI to manually refresh

Remote Debugging

Chrome DevTools for debugging
Network tab for API inspection
Console for logs

Expo Go vs Development Build

Expo Go: Quick testing, limited native modules
Development Build: Full native module support, requires build

Hot Reloading vs Live Reloading

Hot Reload: Injects changes without full reload
Live Reload: Full app restart on file change