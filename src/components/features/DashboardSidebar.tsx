'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  Package, 
  Plus, 
  Droplets, 
  FileText, 
  Home,
  ChevronRight
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
      href: `/${locale}/dashboard/add`,
      label: t('dashboard.nav.newEntry'),
      icon: Plus,
    },
    {
      href: `/${locale}/dashboard/water-lines/new`,
      label: t('dashboard.nav.waterLines'),
      icon: Droplets,
    },
    {
      href: `/${locale}/dashboard/review`,
      label: t('dashboard.nav.reviewQueue'),
      icon: FileText,
      adminOnly: true,
    },
  ].filter((item) => !item.adminOnly || isAdmin);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

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
      </nav>
    </aside>
  );
}
