// app.config.js - Complete configuration (DELETE app.json after creating this)

export default {
    expo: {
      name: "Oxbow",
      slug: "starlight",
      version: "1.0.0",
      orientation: "portrait",
      icon: "./assets/images/oxbow_app_icon.png",
      scheme: "oxbow",
      userInterfaceStyle: "automatic",
      newArchEnabled: true,
      ios: {
        supportsTablet: true,
        bundleIdentifier: "com.caddell.starlight",
        infoPlist: {
          ITSAppUsesNonExemptEncryption: false,
          NSMicrophoneUsageDescription: "Oxbow uses microphone access for voice journaling to enhance your spiritual reflection experience.",
          NSUserNotificationUsageDescription: "Oxbow sends gentle reminders to help maintain your consistent journaling practice.",
          NSPhotoLibraryUsageDescription: "Oxbow needs access to your photo library so you can add a profile picture that your friends will see when they pray for you."
        }
      },
      android: {
        adaptiveIcon: {
          foregroundImage: "./assets/images/adaptive-icon.png",
          backgroundColor: "#ffffff"
        },
        edgeToEdgeEnabled: true
      },
      web: {
        bundler: "metro",
        output: "static",
        favicon: "./assets/images/favicon.png"
      },
      plugins: [
        "expo-router",
        [
          "expo-splash-screen",
          {
            image: "./assets/images/splash-icon.png",
            imageWidth: 200,
            resizeMode: "contain",
            backgroundColor: "#ffffff"
          }
        ],
        [
          "expo-image-picker",
          {
            "photosPermission": "Oxbow needs access to your photo library so you can add a profile picture that your friends will see when they pray for you."
          }
        ]
      ],
      experiments: {
        typedRoutes: true
      },
      // 🔧 CRITICAL: Environment variables for production
      extra: {
        // These will be available as Constants.expoConfig.extra.*
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        
        router: {},
        eas: {
          projectId: "5bd0cede-3ebf-4efe-8b38-706e792e5b20"
        }
      }
    }
  };