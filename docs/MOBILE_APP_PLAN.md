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
npm install @capacitor/preferences      # Key-value storage
npm install @capacitor/app              # App lifecycle events
npm install @capacitor/keyboard         # Keyboard events
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

---

### Phase 4: API & Authentication Changes

#### 4.1 API Base URL Configuration

The app needs to call your deployed API, not localhost.

**File: `src/lib/api.ts`**
```typescript
const getApiBaseUrl = () => {
  // Native app: use production API
  if (typeof window !== 'undefined' &&
      (window as any).Capacitor?.isNativePlatform()) {
    return 'https://your-production-url.vercel.app';
  }
  // Web: use relative URLs (same origin)
  return '';
};

export const API_BASE_URL = getApiBaseUrl();
```

#### 4.2 Authentication Considerations

NextAuth.js works but needs adjustments:
- OAuth redirects need deep linking setup
- Consider storing tokens in Capacitor Preferences instead of cookies for mobile

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
| `RaceSimulator.tsx` | Add haptic feedback on timer | Medium |
| `WeeklyCalendar.tsx` | Ensure touch targets 48px+ | Medium |
| `WorkoutDisplay.tsx` | Add haptic on completion | Low |
| `src/lib/api.ts` | Add API base URL for native | High |
| All components | Test on actual devices | High |

---

## New Files to Create

| File | Purpose |
|------|---------|
| `capacitor.config.ts` | Capacitor configuration |
| `src/lib/haptics.ts` | Haptic feedback utilities |
| `src/lib/native.ts` | Native platform detection & utilities |
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
| Phase 1 | Environment setup (Xcode, Android Studio) | Not started |
| Phase 2 | Project configuration (Capacitor setup) | Not started |
| Phase 3 | Code modifications (Spline, safe areas) | Not started |
| Phase 4 | API & auth adjustments | Not started |
| Phase 5 | Build & test on devices | Not started |
| Phase 6 | Polish (icons, splash, production builds) | Not started |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Disk space insufficient | Can't install Xcode | Use external SSD or clear caches |
| OAuth redirect issues | Auth broken on mobile | Implement deep linking |
| Performance on older devices | Slow/laggy UI | Remove Spline, optimize images |
| Static export limitations | Some features break | Use client-side data fetching |

---

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Apple Developer](https://developer.apple.com)
- [Android Developer](https://developer.android.com)
