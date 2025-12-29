import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getCurrentUserRole } from '@/lib/auth';
import { FileText, Home } from 'lucide-react';

interface DashboardNavProps {
  locale: string;
}

export const DashboardNav = async ({ locale }: DashboardNavProps) => {
  const t = await getTranslations();
  const role = await getCurrentUserRole();
  const isAdmin = role === 'admin';

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center space-x-8">
          <Link href={`/${locale}/dashboard`} className="flex items-center space-x-2">
            <Home className="h-5 w-5" />
            <span className="font-semibold">{t('dashboard.title')}</span>
          </Link>
          
          {isAdmin && (
            <Link
              href={`/${locale}/dashboard/review`}
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <FileText className="h-4 w-4" />
              <span>{t('dashboard.reviewQueue')}</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

