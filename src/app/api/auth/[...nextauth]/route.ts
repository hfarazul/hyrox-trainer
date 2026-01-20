import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

// Log cookies from request header for debugging
async function wrappedHandler(req: Request) {
  const url = new URL(req.url);

  if (url.pathname.includes('callback')) {
    const cookieHeader = req.headers.get('cookie') || '';
    console.log('[OAuth Debug] Callback URL:', url.pathname);
    console.log('[OAuth Debug] Cookie header:', cookieHeader);
  }

  return handler(req);
}

export { wrappedHandler as GET, wrappedHandler as POST };
