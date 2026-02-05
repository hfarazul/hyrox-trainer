# HYROX Trainer Mobile App Plan

## Overview

Convert the existing Next.js web application into native iOS and Android apps using **Capacitor**. This approach wraps the web app in a native shell, allowing ~90% code reuse while enabling app store distribution and native device features.

---

## Goals

- [x] Research mobile app approaches
- [ ] iOS app running on physical iPhone
- [ ] Android app running on physical Android device
- [ ] App store ready builds (future)

---

## System Requirements

### Your Current Setup
| Spec | Status |
|------|--------|
| MacBook Air M1 | ✅ |
| 16GB RAM | ✅ |
| macOS 15.3.2 | ✅ |
| iPhone | ✅ |
| Android Phone | ✅ |
| Disk Space | ⚠️ Need ~25GB free |

### Required Software
| Tool | Size | Purpose |
|------|------|---------|
| Xcode | ~12-15 GB | iOS builds |
| Android Studio | ~4 GB | Android builds |
| Android SDK | ~4-6 GB | Android toolchain |
| Capacitor | ~50 MB | Native bridge |

---

## Disk Space Strategy

### Option A: Free Up Internal Storage
```bash
# Clear caches (~6GB)
rm -rf ~/Library/Caches/*
npm cache clean --force

# Clean Homebrew
brew autoremove && brew cleanup
```

### Option B: Use External SSD
Move to external SSD (Thunderbolt/USB-C recommended):
- Android SDK & Emulators
- iOS Simulators
- Docker data
- Project files

Keep on internal:
- Xcode (must be in /Applications)
- Android Studio app

---

## Implementation Plan

### Phase 0: Prerequisites & Backend Setup

Before starting mobile development, ensure the backend is ready to serve the mobile app.

#### 0.1 Verify Railway Deployment

The web app is hosted on Railway. The mobile app will call this API.

```bash
# Verify your Railway deployment is running
# Get your Railway URL (e.g., https://hyrox-trainer-production.up.railway.app)
railway status
```

**Checklist:**
- [ ] Railway deployment is live and accessible
- [ ] Note your production URL: `https://your-app.up.railway.app`
- [ ] All API routes working (`/api/sessions`, `/api/user-program`, etc.)
- [ ] Google OAuth callback URL updated in Google Console for mobile

#### 0.2 Verify Disk Space

```bash
# Check available disk space (need ~25GB free)
df -h /

# If insufficient, run cleanup:
rm -rf ~/Library/Caches/*
npm cache clean --force
brew autoremove && brew cleanup
```

#### 0.3 Configure Google OAuth for Mobile

Add deep link callback URLs in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

```
# Add these to Authorized redirect URIs:
com.hyroxtrainer.app://oauth/callback
https://your-app.up.railway.app/api/auth/callback/google
```

---

### Phase 1: Environment Setup

#### 1.1 Install Xcode
```bash
# Install from App Store, then:
xcode-select --install
sudo xcodebuild -license accept
```

#### 1.2 Install Android Studio
```bash
brew install --cask android-studio

# After installation, open Android Studio and:
# 1. Complete setup wizard
# 2. Install Android SDK (API 34 recommended)
# 3. Accept licenses:
sdkmanager --licenses
```

#### 1.3 Configure Environment Variables
Add to `~/.zshrc`:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Optional: External SSD paths
# export ANDROID_HOME=/Volumes/DevSSD/AndroidSDK
# export ANDROID_AVD_HOME=/Volumes/DevSSD/AndroidAVD
```

---

### Phase 2: Project Configuration

#### 2.1 Update Next.js for Static Export

**File: `next.config.ts`**
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',           // Static export for Capacitor
  images: {
    unoptimized: true,        // Required for static export
  },
  // Disable features incompatible with static export
  trailingSlash: true,
};

export default nextConfig;
```

#### 2.2 Install Capacitor Dependencies
```bash
# Core packages
npm install @capacitor/core @capacitor/cli

# Platform packages
npm install @capacitor/ios @capacitor/android

# Useful plugins
npm install @capacitor/haptics          # Vibration feedback
npm install @capacitor/status-bar       # Status bar control
npm install @capacitor/splash-screen    # Launch screen
npm install @capacitor/preferences      # Key-value storage (auth tokens + offline data)
npm install @capacitor/app              # App lifecycle events
npm install @capacitor/keyboard         # Keyboard events

# Mobile-specific plugins (critical for workout app)
npm install @capacitor/push-notifications  # Workout reminders
npm install @capacitor-community/keep-awake # Screen on during workouts
npm install @capacitor/local-notifications # Timer alerts when backgrounded
npm install @capacitor/network             # Offline detection
```

#### 2.3 Initialize Capacitor

```bash
npx cap init "HYROX Trainer" com.hyroxtrainer.app --web-dir=out
```

#### 2.4 Create Capacitor Config

**File: `capacitor.config.ts`**
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hyroxtrainer.app',
  appName: 'HYROX Trainer',
  webDir: 'out',

  // Server config for development
  server: {
    // Uncomment for live reload during development:
    // url: 'http://YOUR_LOCAL_IP:3000',
    // cleartext: true,

    // Handle navigation properly
    androidScheme: 'https',
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
```

#### 2.5 Add Native Platforms
```bash
# Build web assets first
npm run build

# Add platforms
npx cap add ios
npx cap add android

# Sync web code to native projects
npx cap sync
```

---

### Phase 3: Code Modifications

#### 3.1 Remove/Replace Spline 3D (Landing Page)

The Spline 3D background is too heavy for mobile. Replace with a static gradient or lightweight animation.

**File: `src/app/page.tsx`**
```typescript
// Before: Dynamic import of Spline
// After: Mobile-friendly alternative

const isMobile = typeof window !== 'undefined' &&
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Use lighter background for mobile
{!isMobile && <SplineBackground />}
{isMobile && <MobileGradientBackground />}
```

#### 3.2 Add Safe Area Handling

**File: `src/app/layout.tsx`**
```typescript
// Add viewport meta for safe areas
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

**CSS additions:**
```css
/* Safe area padding for notch/home indicator */
.safe-area-top {
  padding-top: env(safe-area-inset-top);
}
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
```

#### 3.3 Add Haptic Feedback (Timers/Workouts)

**File: `src/lib/haptics.ts`**
```typescript
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export const haptic = {
  light: async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
  },
  medium: async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
  },
  heavy: async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    }
  },
  success: async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.notification({ type: 'success' });
    }
  },
};
```

#### 3.4 Handle Back Button (Android)

**File: `src/components/Providers.tsx`** (or create new)
```typescript
import { App } from '@capacitor/app';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useAndroidBackButton() {
  const router = useRouter();

  useEffect(() => {
    const listener = App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        router.back();
      } else {
        App.exitApp();
      }
    });

    return () => {
      listener.remove();
    };
  }, [router]);
}
```

#### 3.5 Touch Target Sizing

Ensure all interactive elements are at least 48x48px:
```css
/* Minimum touch targets */
button, a, [role="button"] {
  min-height: 48px;
  min-width: 48px;
}
```

#### 3.6 Keep Screen Awake During Workouts

Critical for race simulator - screen must stay on during timed workouts.

**File: `src/lib/screen.ts`**
```typescript
import { KeepAwake } from '@capacitor-community/keep-awake';
import { Capacitor } from '@capacitor/core';

export const screen = {
  async keepAwake() {
    if (Capacitor.isNativePlatform()) {
      await KeepAwake.keepAwake();
    }
  },
  async allowSleep() {
    if (Capacitor.isNativePlatform()) {
      await KeepAwake.allowSleep();
    }
  },
};
```

**Usage in `RaceSimulator.tsx`:**
```typescript
// When workout starts
useEffect(() => {
  if (isRunning) {
    screen.keepAwake();
  }
  return () => {
    screen.allowSleep();
  };
}, [isRunning]);
```

#### 3.7 Background Timer Notifications

iOS kills JavaScript timers when app is backgrounded. Use local notifications.

**File: `src/lib/timer-notifications.ts`**
```typescript
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const timerNotifications = {
  async requestPermission() {
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.requestPermissions();
    }
  },

  async scheduleStationComplete(stationName: string, secondsFromNow: number) {
    if (!Capacitor.isNativePlatform()) return;

    await LocalNotifications.schedule({
      notifications: [{
        id: Date.now(),
        title: 'Station Complete!',
        body: `${stationName} finished. Move to next station.`,
        schedule: { at: new Date(Date.now() + secondsFromNow * 1000) },
        sound: 'default',
      }],
    });
  },

  async cancelAll() {
    if (Capacitor.isNativePlatform()) {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel(pending);
      }
    }
  },
};
```

#### 3.8 Push Notifications for Workout Reminders (Optional)

**File: `src/lib/push-notifications.ts`**
```typescript
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export const setupPushNotifications = async () => {
  if (!Capacitor.isNativePlatform()) return;

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return;

  await PushNotifications.register();

  PushNotifications.addListener('registration', (token) => {
    // Send token to your server for workout reminders
    console.log('Push token:', token.value);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received:', notification);
  });
};
```

---

### Phase 4: API & Authentication Changes

#### 4.1 API Base URL Configuration

The mobile app calls your Railway-hosted API (static export has no server).

**File: `src/lib/api.ts`**
```typescript
import { Capacitor } from '@capacitor/core';

const getApiBaseUrl = () => {
  // Native app: use Railway production API
  if (Capacitor.isNativePlatform()) {
    return 'https://your-app.up.railway.app';  // ← Replace with your Railway URL
  }
  // Web: use relative URLs (same origin)
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

// Update all fetch calls to use this:
// fetch(`${API_BASE_URL}/api/sessions`, ...)
```

#### 4.2 Mobile Authentication with Token Storage

Cookies don't work reliably in native WebViews. Store JWT tokens in Capacitor Preferences.

**File: `src/lib/auth-mobile.ts`**
```typescript
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const TOKEN_KEY = 'auth_token';

export const mobileAuth = {
  async saveToken(token: string) {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: TOKEN_KEY, value: token });
    }
  },

  async getToken(): Promise<string | null> {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key: TOKEN_KEY });
      return value;
    }
    return null;
  },

  async clearToken() {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key: TOKEN_KEY });
    }
  },

  // Add token to API requests
  async getAuthHeaders(): Promise<HeadersInit> {
    const token = await this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
};
```

#### 4.3 Deep Linking for OAuth

Configure URL schemes so Google OAuth can redirect back to the app.

**iOS: `ios/App/App/Info.plist`** (add inside `<dict>`):
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.hyroxtrainer.app</string>
    </array>
  </dict>
</array>
```

**Android: `android/app/src/main/AndroidManifest.xml`** (add inside `<activity>`):
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="com.hyroxtrainer.app" />
</intent-filter>
```

**Handle deep link in app:**
```typescript
import { App } from '@capacitor/app';

App.addListener('appUrlOpen', ({ url }) => {
  // Handle OAuth callback
  if (url.includes('oauth/callback')) {
    const token = new URL(url).searchParams.get('token');
    if (token) {
      mobileAuth.saveToken(token);
      // Navigate to app
    }
  }
});
```

#### 4.4 Offline Support Strategy

Gyms often have poor connectivity. Cache workouts for offline use.

**File: `src/lib/offline-storage.ts`**
```typescript
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';

export const offlineStorage = {
  // Cache current program for offline access
  async cacheProgram(program: UserProgram) {
    await Preferences.set({
      key: 'cached_program',
      value: JSON.stringify(program),
    });
  },

  async getCachedProgram(): Promise<UserProgram | null> {
    const { value } = await Preferences.get({ key: 'cached_program' });
    return value ? JSON.parse(value) : null;
  },

  // Queue workout completions for sync when online
  async queueWorkoutCompletion(data: WorkoutCompletion) {
    const { value } = await Preferences.get({ key: 'pending_syncs' });
    const pending = value ? JSON.parse(value) : [];
    pending.push({ ...data, timestamp: Date.now() });
    await Preferences.set({ key: 'pending_syncs', value: JSON.stringify(pending) });
  },

  // Sync queued data when online
  async syncPendingData() {
    const status = await Network.getStatus();
    if (!status.connected) return;

    const { value } = await Preferences.get({ key: 'pending_syncs' });
    if (!value) return;

    const pending = JSON.parse(value);
    for (const item of pending) {
      try {
        await fetch(`${API_BASE_URL}/api/user-program/complete-workout`, {
          method: 'POST',
          headers: await mobileAuth.getAuthHeaders(),
          body: JSON.stringify(item),
        });
      } catch (e) {
        // Keep in queue if sync fails
        return;
      }
    }
    await Preferences.remove({ key: 'pending_syncs' });
  },
};

// Listen for network changes and sync
Network.addListener('networkStatusChange', (status) => {
  if (status.connected) {
    offlineStorage.syncPendingData();
  }
});
```

---

### Phase 5: Build & Test

#### 5.1 Development Workflow

```bash
# One-time setup
npm run build && npx cap sync

# For live reload development:
# 1. Edit capacitor.config.ts, uncomment server.url with your IP
# 2. Run:
npm run dev

# 3. Then run app from Xcode/Android Studio
#    (it loads from your dev server)
```

#### 5.2 Run on iOS (iPhone)

```bash
# Open Xcode
npx cap open ios
```

In Xcode:
1. Connect iPhone via USB
2. Select your iPhone from device dropdown
3. **Signing & Capabilities** → Select your Apple ID team
4. Click **Run** (▶️) or `Cmd+R`
5. Trust the developer on iPhone: Settings → General → VPN & Device Management

#### 5.3 Run on Android

```bash
# Open Android Studio
npx cap open android
```

In Android Studio:
1. Enable USB Debugging on phone (Settings → Developer Options)
2. Connect phone via USB
3. Select device from dropdown
4. Click **Run** (▶️)

#### 5.4 Build Commands Reference

```bash
# Sync after any web code changes
npm run build && npx cap sync

# Sync only (no rebuild)
npx cap sync

# Copy web assets only (faster)
npx cap copy

# Update native plugins
npx cap update

# Open IDEs
npx cap open ios
npx cap open android
```

---

### Phase 6: Polish & Production

#### 6.1 App Icons & Splash Screens

Generate app icons (1024x1024 source):
- Use https://appicon.co or capacitor-assets package
- Place in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Place in `android/app/src/main/res/mipmap-*/`

```bash
# Or use capacitor-assets
npm install -D @capacitor/assets
npx capacitor-assets generate
```

#### 6.2 Splash Screen

Create splash screen images and configure in:
- iOS: `ios/App/App/Assets.xcassets/Splash.imageset/`
- Android: `android/app/src/main/res/drawable/splash.png`

#### 6.3 Production Builds

**iOS (App Store):**
```bash
# In Xcode:
# Product → Archive → Distribute App
```

**Android (Play Store):**
```bash
# Generate signed APK/AAB
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

---

## Component Changes Summary

| Component | Change Needed | Priority |
|-----------|---------------|----------|
| `src/app/page.tsx` | Remove/replace Spline 3D | High |
| `src/app/layout.tsx` | Add safe area viewport meta | High |
| `src/lib/api.ts` | Add Railway API base URL for native | High |
| `RaceSimulator.tsx` | Add haptics, keep awake, background notifications | High |
| `WeeklyCalendar.tsx` | Ensure touch targets 48px+ | Medium |
| `WorkoutDisplay.tsx` | Add haptic on completion | Medium |
| Auth flow | Store tokens in Preferences, add deep linking | High |
| All components | Test on actual devices | High |

---

## New Files to Create

| File | Purpose |
|------|---------|
| `capacitor.config.ts` | Capacitor configuration |
| `src/lib/haptics.ts` | Haptic feedback utilities |
| `src/lib/native.ts` | Native platform detection & utilities |
| `src/lib/screen.ts` | Keep screen awake during workouts |
| `src/lib/auth-mobile.ts` | Token storage for mobile auth |
| `src/lib/offline-storage.ts` | Offline data caching & sync queue |
| `src/lib/timer-notifications.ts` | Background timer alerts |
| `src/lib/push-notifications.ts` | Workout reminder notifications |
| `src/hooks/useBackButton.ts` | Android back button handler |

---

## Package.json Scripts

Add to `package.json`:
```json
{
  "scripts": {
    "cap:sync": "npm run build && npx cap sync",
    "cap:ios": "npx cap open ios",
    "cap:android": "npx cap open android",
    "cap:build": "npm run build && npx cap sync && npx cap copy"
  }
}
```

---

## Timeline Estimate

| Phase | Tasks | Status |
|-------|-------|--------|
| Phase 0 | Prerequisites & Railway verification | Not started |
| Phase 1 | Environment setup (Xcode, Android Studio) | Not started |
| Phase 2 | Project configuration (Capacitor setup) | Not started |
| Phase 3 | Code modifications (Spline, safe areas, keep awake) | Not started |
| Phase 4 | API & auth adjustments (Railway URL, token storage, offline) | Not started |
| Phase 5 | Build & test on devices | Not started |
| Phase 6 | Polish (icons, splash, production builds) | Not started |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Disk space insufficient | Can't install Xcode | Use external SSD or clear caches |
| OAuth redirect issues | Auth broken on mobile | Implement deep linking (Phase 4.3) |
| Performance on older devices | Slow/laggy UI | Remove Spline, optimize images |
| Static export limitations | API routes unavailable | Point to Railway-hosted API |
| Cookies not working | Auth fails on mobile | Use Capacitor Preferences for tokens |
| Timer stops in background | Workout tracking breaks | Use local notifications (Phase 3.7) |
| No internet at gym | Can't log workouts | Offline queue with auto-sync |
| Screen dims during workout | User can't see timer | Keep awake plugin (Phase 3.6) |

---

## Future Enhancements (Post-MVP)

| Feature | Plugin | Notes |
|---------|--------|-------|
| Apple Health / Google Fit | `@anthropic/capacitor-health` or `capacitor-health-connect` | Log workouts to health apps |
| Apple Watch companion | Native watchOS app | Show timer on wrist during workouts |
| Wearable HR integration | Bluetooth LE plugin | Real-time heart rate during training |
| Social sharing | `@capacitor/share` | Share workout completions |
| App widgets | Native development | Quick workout start from home screen |

---

## Testing Checklist

Before releasing to app stores, verify:

- [ ] App launches without crash on iOS and Android
- [ ] Google OAuth login works (deep link returns to app)
- [ ] Email/password login works
- [ ] Workouts load from Railway API
- [ ] Race simulator keeps screen awake
- [ ] Timer continues when app is backgrounded (notifications work)
- [ ] Offline mode: can view cached program
- [ ] Offline mode: workout completion queues and syncs when online
- [ ] Haptic feedback triggers on timer events
- [ ] All touch targets are 48px minimum
- [ ] Safe areas respected on notched devices
- [ ] Android back button navigates correctly
- [ ] No Spline 3D loading on landing page

---

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Apple Developer](https://developer.apple.com)
- [Android Developer](https://developer.android.com)
- [Railway Deployment](https://railway.app)
- [Capacitor Community Plugins](https://github.com/capacitor-community)
