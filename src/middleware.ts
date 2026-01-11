import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { createServerClient } from '@supabase/ssr';

/**
 * Integrated Middleware: next-intl + Security
 * 
 * 1. First, next-intl middleware handles locale detection and redirection
 * 2. Then, security middleware guards /dashboard/* routes:
 *    - Checks for Supabase session (authentication)
 *    - Redirects unauthenticated users to /login
 *    - Allows public routes and login page to pass through
 * 
 * Note: RBAC (Role-Based Access Control) for /dashboard/review is enforced
 * at the Layout/Page level using Server Components, as Edge Runtime
 * doesn't support database drivers.
 */

// Create the next-intl middleware
const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // First, let next-intl handle locale detection and redirection
  const response = intlMiddleware(request);
  
  // If next-intl returned a redirect, handle it first
  if (response.status === 307 || response.status === 308) {
    // Let the locale redirect complete, then apply security on the next request
    return response;
  }
  
  // Extract pathname (after locale processing)
  const pathname = request.nextUrl.pathname;

  // Allow public routes and login page to pass through
  const isLoginRoute = /^\/[a-z]{2}\/login/.test(pathname) || pathname === '/login';
  const isRootRoute = /^\/[a-z]{2}$/.test(pathname) || pathname === '/';
  
  if (isLoginRoute || isRootRoute) {
    return response;
  }

  // Check if accessing dashboard routes (with locale prefix)
  const isDashboardRoute = /^\/[a-z]{2}\/dashboard/.test(pathname);
  
  if (isDashboardRoute) {
    // Create Supabase client to check session
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Check for authenticated session
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // If no session exists, redirect to login
    if (error || !user) {
      // Extract locale from pathname
      const localeMatch = pathname.match(/^\/([a-z]{2})\//);
      const locale = localeMatch ? localeMatch[1] : 'en';
      const loginUrl = new URL(`/${locale}/login`, request.url);
      // Preserve the intended destination for redirect after login
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Session exists - allow through (return the intl response)
    // RBAC (admin check for /dashboard/review) is handled in Server Components
    return response;
  }

  // Allow all other routes to pass through (return the intl response)
  return response;
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

