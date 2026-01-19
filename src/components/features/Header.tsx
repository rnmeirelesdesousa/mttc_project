'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Map, LogOut, User, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { handleLogout } from '@/actions/auth';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface HeaderProps {
  locale: string;
}

/**
 * Global Persistent Header Component
 * 
 * Displays navigation and authentication controls:
 * - Left: Project name linking to home
 * - Center: Map link
 * - Right: Login button (if not authenticated) or Dashboard link + Logout button (if authenticated)
 * 
 * Uses browser Supabase client to check session state reactively.
 */
export const Header = ({ locale }: HeaderProps) => {
  const t = useTranslations();
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const localeRef = useRef(locale);
  const userRef = useRef<SupabaseUser | null>(null);

  // Keep locale ref up to date
  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let isMounted = true;

    // Get initial session - try multiple methods for reliability
    const checkSession = async () => {
      try {
        // First try getSession (most reliable for cookie-based sessions)
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted && session?.user) {
          userRef.current = session.user;
          setUser(session.user);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.warn('[Header] getSession failed:', error);
      }

      try {
        // Fallback to getUser
        const { data: { user }, error } = await supabase.auth.getUser();
        if (isMounted) {
          if (user && !error) {
            userRef.current = user;
            setUser(user);
          } else {
            userRef.current = null;
            setUser(null);
          }
          setLoading(false);
        }
      } catch (error) {
        console.warn('[Header] getUser failed:', error);
        if (isMounted) {
          userRef.current = null;
          setUser(null);
          setLoading(false);
        }
      }
    };

    checkSession();

    // Re-check session after a short delay to catch delayed session availability
    // This is especially important after login when session might not be immediately available
    const recheckTimer = setTimeout(() => {
      if (isMounted && !userRef.current) {
        checkSession();
      }
    }, 200);

    // Listen for auth state changes with specific event handling
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN') {
        // Hard sync: Set loading state at start of event
        setLoading(true);
        // Set user immediately from session - this triggers UI update to show Dashboard/Logout
        if (session?.user) {
          userRef.current = session.user;
          setUser(session.user);
        } else {
          // If session.user is not available, re-fetch to ensure we have the user
          const { data: { user } } = await supabase.auth.getUser();
          if (isMounted) {
            userRef.current = user;
            setUser(user);
          }
        }
        // Force router refresh to update server-side rendered content
        // Note: Navigation is handled by LoginForm, we just need to refresh here
        router.refresh();
        // Set loading to false after state is updated
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED') {
        // Token refreshed - update user state
        userRef.current = session?.user ?? null;
        setUser(session?.user ?? null);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        // User signed out - clear user state and refresh router
        userRef.current = null;
        setUser(null);
        setLoading(false);
        // Force full page refresh to update server-side rendered content (e.g., Edit buttons)
        router.refresh();
      } else {
        // Other events (e.g., USER_UPDATED) - update user state
        userRef.current = session?.user ?? null;
        setUser(session?.user ?? null);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(recheckTimer);
      subscription.unsubscribe();
    };
  }, [router]);

  const handleLogoutClick = async () => {
    await handleLogout(locale);
    // Force full page refresh to ensure server-side rendered content (Edit buttons) is updated
    // Using window.location.href ensures a complete page reload, not just a client-side navigation
    window.location.href = `/${locale}`;
  };

  const isAuthenticated = !!user;
  const homePath = `/${locale}`;
  const mapPath = `/${locale}/map`;
  const loginPath = `/${locale}/login`;
  const dashboardPath = `/${locale}/dashboard`;

  return (
    <header className="fixed top-0 z-[1001] w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Left: Project Name */}
        <Link
          href={homePath}
          className="flex items-center space-x-2 text-lg font-semibold hover:text-primary transition-colors"
        >
          <span>{t('home.title')}</span>
        </Link>

        {/* Center: Map Link (Desktop) */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link
            href={mapPath}
            className="flex items-center space-x-2 text-sm font-medium hover:text-primary transition-colors"
          >
            <Map className="h-4 w-4" />
            <span>{t('header.map')}</span>
          </Link>
        </nav>

        {/* Right: Auth Actions (Desktop) */}
        <div className="hidden md:flex items-center space-x-4">
          {loading ? (
            // Neutral placeholder to prevent hydration flicker
            <div className="h-9 w-20 bg-transparent" />
          ) : isAuthenticated ? (
            <>
              <Link href={dashboardPath}>
                <Button variant="ghost" size="sm">
                  <User className="mr-2 h-4 w-4" />
                  {t('header.dashboard')}
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogoutClick}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('header.logout')}
              </Button>
            </>
          ) : (
            <Link href={loginPath}>
              <Button size="sm">
                {t('header.login')}
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-accent transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container mx-auto px-4 py-4 space-y-3">
            <Link
              href={mapPath}
              className="flex items-center space-x-2 text-sm font-medium hover:text-primary transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Map className="h-4 w-4" />
              <span>{t('header.map')}</span>
            </Link>
            {loading ? (
              // Neutral placeholder to prevent hydration flicker
              <div className="h-9 w-full bg-transparent" />
            ) : isAuthenticated ? (
              <>
                <Link
                  href={dashboardPath}
                  className="flex items-center space-x-2 text-sm font-medium hover:text-primary transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-4 w-4" />
                  <span>{t('header.dashboard')}</span>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    handleLogoutClick();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('header.logout')}
                </Button>
              </>
            ) : (
              <Link href={loginPath} onClick={() => setMobileMenuOpen(false)}>
                <Button size="sm" className="w-full">
                  {t('header.login')}
                </Button>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
