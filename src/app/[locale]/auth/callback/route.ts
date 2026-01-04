import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Auth Callback Route
 * 
 * Handles the OAuth/magic link callback from Supabase.
 * After successful authentication, redirects the user to the dashboard
 * or the originally intended destination.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  // Extract locale from the pathname
  const pathname = requestUrl.pathname;
  const localeMatch = pathname.match(/^\/([a-z]{2})\//);
  const locale = localeMatch ? localeMatch[1] : 'en';

  if (code) {
    const supabase = await createClient();
    
    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[auth/callback]:', error);
      // Redirect to login with error
      const loginUrl = new URL(`/${locale}/login`, requestUrl);
      loginUrl.searchParams.set('error', 'auth_failed');
      return NextResponse.redirect(loginUrl);
    }

    // Success - redirect to the intended destination or dashboard
    const redirectUrl = new URL(`/${locale}${next}`, requestUrl);
    return NextResponse.redirect(redirectUrl);
  }

  // No code parameter - redirect to login
  const loginUrl = new URL(`/${locale}/login`, requestUrl);
  return NextResponse.redirect(loginUrl);
}

