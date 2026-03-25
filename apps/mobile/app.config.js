export default {
  expo: {
    name: 'ReelRank',
    slug: 'reelrank',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.reelrank.app',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#000000',
      },
      package: 'com.reelrank.app',
    },
    web: {
      bundler: 'metro',
    },
    extra: {
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      apiUrl: process.env.API_URL ?? 'http://localhost:3001',
      eas: {
        projectId: '1ab5830b-ef5e-4dbe-8808-a269399e6155',
      },
    },
    plugins: ['expo-dev-client', 'expo-font'],
  },
};
