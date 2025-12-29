import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Pure Mock Security Middleware
 * 
 * Guards /dashboard/* routes by:
 * 1. Checking for mock-session cookie (authentication)
 * 2. Redirecting unauthenticated users to /login
 * 3. Allowing public routes and login page to pass through
 * 
 * Note: RBAC (Role-Based Access Control) for /dashboard/review is enforced
 * at the Layout/Page level using Server Components, as Edge Runtime
 * doesn't support database drivers.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes and login page to pass through
  const publicRoutes = ['/', '/login'];
  const isPublicRoute = publicRoutes.some((route) => pathname === route);
  
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check if accessing dashboard routes (with or without locale prefix)
  const isDashboardRoute = pathname.startsWith('/dashboard') || 
    /^\/[a-z]{2}\/dashboard/.test(pathname);
  
  if (isDashboardRoute) {
    // Extract mock-session cookie
    const sessionCookie = request.cookies.get('mock-session');
    
    // If no session cookie, redirect to login
    if (!sessionCookie || !sessionCookie.value) {
      const loginUrl = new URL('/login', request.url);
      // Preserve the intended destination for redirect after login
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Session exists - allow through
    // RBAC (admin check for /dashboard/review) is handled in Server Components
    return NextResponse.next();
  }

  // Allow all other routes to pass through
  return NextResponse.next();
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

