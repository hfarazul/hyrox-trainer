import type { CapacitorConfig } from '@capacitor/cli';

// Railway deployment URL
const RAILWAY_URL = 'https://hyrox-trainer-staging.up.railway.app';

const config: CapacitorConfig = {
  appId: 'com.hytrain.ios',
  appName: 'HYROX Trainer',
  webDir: 'out',

  server: {
    // Load from Railway server (allows API routes to work)
    url: RAILWAY_URL,
    androidScheme: 'https',
    // Keep OAuth flows within the app WebView
    allowNavigation: ['accounts.google.com', '*.google.com', 'hyrox-trainer-staging.up.railway.app'],
  },

  ios: {
    contentInset: 'automatic',
    backgroundColor: '#000000',
    preferredContentMode: 'mobile',
  },

  android: {
    allowMixedContent: true,
    backgroundColor: '#000000',
  },

  plugins: {
    SocialLogin: {
      google: {
        webClientId: '478957254664-lmk81te9npi4qqfsbb2g99bs66lnet3g.apps.googleusercontent.com',
        iOSClientId: '478957254664-2n5bfvht1f29lgjr50eksj084f1tcu77.apps.googleusercontent.com',
        iOSServerClientId: '478957254664-lmk81te9npi4qqfsbb2g99bs66lnet3g.apps.googleusercontent.com',
      },
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#000000',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#000000',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#FF6B00',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
