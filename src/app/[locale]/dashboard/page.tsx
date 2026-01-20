import { getTranslations } from 'next-intl/server';
import { getCurrentUserRole } from '@/lib/auth';
import { getDashboardStats } from '@/actions/admin';
import Link from 'next/link';
import { Package, Droplets, FileText, Edit } from 'lucide-react';

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function DashboardPage({ params }: PageProps) {
  const t = await getTranslations();
  const role = await getCurrentUserRole();

  // Translate role display value
  const roleDisplay = role === 'public' 
    ? t('dashboard.notAuthenticated')
    : role === 'admin'
    ? t('taxonomy.role.admin')
    : role === 'researcher'
    ? t('taxonomy.role.researcher')
    : t('dashboard.notAuthenticated');

  // Fetch comprehensive dashboard statistics (only for authenticated users)
  let stats: {
    totalMills: number;
    totalLevadas: number;
    pendingReviews: number;
    draftCount: number;
    publishedCount: number;
  } | null = null;
  
  if (role === 'researcher' || role === 'admin') {
    const statsResult = await getDashboardStats();
    if (statsResult.success) {
      stats = statsResult.data;
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">
          {t('dashboard.welcome')} <strong>{roleDisplay}</strong>
        </p>
      </div>

      {/* Quick Stats for Researchers and Admins */}
      {(role === 'researcher' || role === 'admin') && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-6 border rounded-lg bg-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                {t('dashboard.stats.totalMills')}
              </h3>
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold">{stats.totalMills}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('dashboard.stats.totalMillsDescription')}
            </p>
          </div>

          <div className="p-6 border rounded-lg bg-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                {t('dashboard.stats.totalLevadas')}
              </h3>
              <Droplets className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold">{stats.totalLevadas}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('dashboard.stats.totalLevadasDescription')}
            </p>
          </div>

          {role === 'admin' && (
            <div className="p-6 border rounded-lg bg-card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t('dashboard.stats.pendingReviews')}
                </h3>
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-3xl font-bold text-orange-600">{stats.pendingReviews}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('dashboard.stats.pendingReviewsDescription')}
              </p>
            </div>
          )}

          <div className="p-6 border rounded-lg bg-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                {t('dashboard.stats.draft')}
              </h3>
              <Edit className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold text-muted-foreground">{stats.draftCount}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('dashboard.stats.draftDescription')}
            </p>
          </div>
        </div>
      )}

      {/* Admin Instructions */}
      {role === 'admin' && stats && stats.pendingReviews > 0 && (
        <div className="p-4 border rounded-lg bg-muted/50 mb-6">
          <p className="text-sm">
            {t('dashboard.adminInstructions')}{' '}
            <Link 
              href={`/${params.locale}/dashboard/review`} 
              className="text-primary hover:underline font-medium"
            >
              {t('dashboard.adminInstructionsLink')}
            </Link>{' '}
            {t('dashboard.adminInstructionsSuffix')}
          </p>
        </div>
      )}
    </div>
  );
}

