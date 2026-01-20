import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cookies } from 'next/headers';

const handler = NextAuth(authOptions);

// Wrapper to log cookies for debugging OAuth issues
async function wrappedHandler(req: Request) {
  const url = new URL(req.url);
  const isCallback = url.pathname.includes('callback');

  if (isCallback) {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log('[OAuth Debug] Callback received');
    console.log('[OAuth Debug] URL:', url.pathname + url.search);
    console.log('[OAuth Debug] Cookies received:', allCookies.map(c => c.name));
    console.log('[OAuth Debug] State cookie:', cookieStore.get('next-auth.state')?.value?.slice(0, 20) + '...');
    console.log('[OAuth Debug] __Secure state cookie:', cookieStore.get('__Secure-next-auth.state')?.value?.slice(0, 20) + '...');
  }

  return handler(req);
}

export { wrappedHandler as GET, wrappedHandler as POST };
