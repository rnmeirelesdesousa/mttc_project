'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogoutClick = async () => {
    await handleLogout(locale);
    router.refresh();
  };

  const isAuthenticated = !!user;
  const homePath = `/${locale}`;
  const mapPath = `/${locale}/map`;
  const loginPath = `/${locale}/login`;
  const dashboardPath = `/${locale}/dashboard`;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
            <div className="h-9 w-20 animate-pulse bg-muted rounded-md" />
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
              <div className="h-9 w-full animate-pulse bg-muted rounded-md" />
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
