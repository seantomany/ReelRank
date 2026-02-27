export default {
    expo: {
        name: 'ReelRank',
        slug: 'reelrank',
        version: '1.0.0',
        orientation: 'portrait',
        icon: './assets/icon.png',
        userInterfaceStyle: 'dark',
        splash: {
            backgroundColor: '#0F0F1A',
        },
        ios: {
            supportsTablet: true,
            bundleIdentifier: 'com.reelrank.app',
        },
        android: {
            adaptiveIcon: {
                backgroundColor: '#0F0F1A',
            },
            package: 'com.reelrank.app',
        },
        extra: {
            firebaseApiKey: process.env.FIREBASE_API_KEY,
            firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
            firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
            firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
            firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
            firebaseAppId: process.env.FIREBASE_APP_ID,
            apiUrl: process.env.API_URL ?? 'http://localhost:3001',
            ablyKey: process.env.ABLY_KEY,
        },
        plugins: [],
    },
};
