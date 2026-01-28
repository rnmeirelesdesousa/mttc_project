'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  FileText,
  Home,
  ChevronRight,
  ChevronDown,
  Factory,
  Droplets,
  CircleDot,
  Book
} from 'lucide-react';

// Utility function to merge class names
function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface DashboardSidebarProps {
  locale: string;
  isAdmin?: boolean;
}

export function DashboardSidebar({ locale, isAdmin = false }: DashboardSidebarProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);

  const navItems = [
    {
      href: `/${locale}/dashboard`,
      label: t('dashboard.nav.home'),
      icon: Home,
      exact: true,
    },
    {
      href: `/${locale}/dashboard/inventory`,
      label: t('dashboard.nav.inventory'),
      icon: Package,
    },
    {
      href: `/${locale}/dashboard/review`,
      label: t('dashboard.nav.reviewQueue'),
      icon: FileText,
      adminOnly: true,
    },
  ].filter((item) => !item.adminOnly || isAdmin);

  const newEntrySubmenu = [
    {
      href: `/${locale}/dashboard/add`,
      label: t('dashboard.nav.newEntrySubmenu.mill'),
      icon: Factory,
    },
    {
      href: `/${locale}/dashboard/water-lines/new`,
      label: t('dashboard.nav.newEntrySubmenu.waterLine'),
      icon: Droplets,
    },
    {
      href: `/${locale}/dashboard/pocas/new`,
      label: t('dashboard.nav.newEntrySubmenu.poca'),
      icon: CircleDot,
    },
    {
      href: `/${locale}/dashboard/bibliography`,
      label: t('sidebar.bibliography') || "Bibliography",
      icon: Book,
    },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  // Check if any new entry submenu item is active
  const isNewEntryActive = newEntrySubmenu.some((item) => isActive(item.href));

  // Auto-open submenu if one of its items is active
  useEffect(() => {
    if (isNewEntryActive) {
      setIsNewEntryOpen(true);
    }
  }, [isNewEntryActive, pathname]);

  return (
    <aside className="w-64 border-r bg-card min-h-[calc(100vh-4rem)]">
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="h-4 w-4" />}
            </Link>
          );
        })}

        {/* New Entry Button with Submenu */}
        <div className="space-y-1">
          <button
            onClick={() => setIsNewEntryOpen(!isNewEntryOpen)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isNewEntryActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Plus className="h-4 w-4" />
            <span className="flex-1 text-left">{t('dashboard.nav.newEntry')}</span>
            {isNewEntryOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {/* Submenu */}
          {isNewEntryOpen && (
            <div className="ml-4 space-y-1 border-l-2 border-muted pl-2">
              {newEntrySubmenu.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
