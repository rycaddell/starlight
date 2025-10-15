# Oxbow

A spiritual journaling mobile app that helps users capture their thoughts through text or voice, and receive AI-powered reflections after 15 journal entries.

## Quick Start
```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on specific platform
npm run ios        # iOS simulator
npm run android    # Android emulator
npm run web        # Web browser
```

## Tech Stack

- **Framework:** Expo SDK ~53.0 + React Native 0.79.5
- **Language:** TypeScript
- **Backend:** Supabase (database, auth)
- **AI Services:** OpenAI Whisper (voice transcription)
- **Styling:** NativeWind (Tailwind for React Native)
- **Routing:** Expo Router (file-based)

## Environment Setup

1. Copy `.env.example` to `.env`
2. Add your credentials:
```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   EXPO_PUBLIC_OPENAI_API_KEY=your_openai_key
```

## Project Structure
```
starlight/
├── app/              # File-based routing (Expo Router)
├── components/       # Reusable UI components
├── hooks/            # Custom React hooks
├── lib/              # Services & utilities
├── contexts/         # React Context providers
└── types/            # TypeScript definitions
```

## Key Features

- **Dual Input Modes:** Text or voice journaling
- **Voice Transcription:** Automatic transcription via OpenAI Whisper
- **AI Reflections:** "Mirrors" generated after 15 journal entries
- **Access Code Auth:** Simple code-based authentication system
- **Cross-Platform:** iOS, Android, and Web support

## Documentation

- 📖 [Architecture Overview](docs/ARCHITECTURE.md) - Technical deep-dive
- 🚀 [Onboarding Guide](docs/ONBOARDING.md) - New engineer onboarding
- 🗄️ [Database Schema](docs/DATABASE.md) - Supabase table structure
- 🔧 [Development Guide](docs/DEVELOPMENT.md) - Configuration & workflows

## Development

### File-Based Routing
Routes are automatically generated from the `app/` directory:
- `app/(tabs)/index.tsx` → Main journal screen
- `app/(tabs)/mirror.tsx` → Mirror reflection screen

### State Management
- **Contexts:** `AuthContext`, `OnboardingContext`
- **Custom Hooks:** `useAudioRecording`, `useMirrorData`
- **Services:** All Supabase operations in `lib/supabase/`

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Submit a pull request

## License
All rights reserved. This is proprietary software.