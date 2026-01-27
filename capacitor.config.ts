import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.avcpp.salestracker',
  appName: 'SalesTracker',
  webDir: 'out',
  
  // For development: load from local dev server
  // For production: use the deployed Firebase App Hosting URL
  server: {
    // Production URL - the app loads from your deployed server
    url: 'https://prod-lead-tracker--antigrav-tracking-final.us-central1.hosted.app',
    // Allow loading from this URL
    cleartext: false,
  },
  
  // iOS specific
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'SalesTracker',
  },
  
  // Android specific  
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // Set true for dev
  },
  
  // Plugins config
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0b1121',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0b1121',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
