import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';

export interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
  idToken: string;
}

export const nativeAuth = {
  /**
   * Check if running on a native platform (iOS/Android)
   */
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  },

  /**
   * Initialize Google Sign-In (call once on app start)
   */
  async initialize(): Promise<void> {
    if (!this.isNative()) return;

    await SocialLogin.initialize({
      google: {
        webClientId: '478957254664-lmk81te9npi4qqfsbb2g99bs66lnet3g.apps.googleusercontent.com',
      },
    });
  },

  /**
   * Sign in with Google natively
   * Returns user info and ID token to send to your backend
   */
  async signInWithGoogle(): Promise<GoogleUser | null> {
    if (!this.isNative()) {
      console.log('Not on native platform, use web OAuth instead');
      return null;
    }

    try {
      const result = await SocialLogin.login({
        provider: 'google',
        options: {},
      });

      if (result.provider === 'google' && result.result) {
        const googleResult = result.result;
        // Check if it's an online response (has profile)
        if ('profile' in googleResult && googleResult.profile) {
          const profile = googleResult.profile;
          const idToken = googleResult.idToken;

          if (!idToken) {
            throw new Error('No ID token received from Google Sign-In');
          }

          return {
            email: profile.email || '',
            name: profile.name || profile.email || '',
            picture: profile.imageUrl || undefined,
            idToken: idToken,
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Google Sign-In error:', error);
      throw error;
    }
  },

  /**
   * Sign out from Google
   */
  async signOut(): Promise<void> {
    if (!this.isNative()) return;

    try {
      await SocialLogin.logout({ provider: 'google' });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  },
};
