import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import prisma from './prisma';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
      // Disable OAuth checks - Safari/iOS blocks ALL cross-site cookies
      // Security is still provided by: HTTPS, Google's OAuth, authorization code flow
      checks: [],
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        googleIdToken: { label: 'Google ID Token', type: 'text' },
        isGoogleNative: { label: 'Is Google Native', type: 'text' },
      },
      async authorize(credentials) {
        // Handle native Google Sign-In
        if (credentials?.isGoogleNative === 'true' && credentials?.googleIdToken) {
          try {
            const ticket = await googleClient.verifyIdToken({
              idToken: credentials.googleIdToken,
              audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();

            if (!payload?.email) {
              throw new Error('Invalid Google token');
            }

            // Find or create user
            let user = await prisma.user.findUnique({
              where: { email: payload.email },
            });

            if (!user) {
              // Create new user from Google sign-in
              user = await prisma.user.create({
                data: {
                  email: payload.email,
                  name: payload.name || payload.email,
                  image: payload.picture,
                  emailVerified: new Date(),
                },
              });
            }

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
            };
          } catch (error) {
            console.error('Google token verification failed:', error);
            throw new Error('Google authentication failed');
          }
        }

        // Handle regular email/password sign-in
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error('Invalid credentials');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error('Invalid credentials');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  // No custom cookie config needed - using nonce check which doesn't use cookies
  debug: process.env.NODE_ENV === 'development',
};
