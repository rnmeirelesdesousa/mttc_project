import { getTranslations } from 'next-intl/server';
import { getCurrentUserRole } from '@/lib/auth';
import { getUserConstructionStats } from '@/actions/admin';
import Link from 'next/link';

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

  // Fetch user construction statistics (only for authenticated users)
  let stats: { draft: number; published: number } | null = null;
  if (role === 'researcher' || role === 'admin') {
    const statsResult = await getUserConstructionStats();
    if (statsResult.success) {
      stats = statsResult.data;
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">{t('dashboard.title')}</h1>
      <div className="space-y-6">
        <p className="text-muted-foreground">
          {t('dashboard.welcome')} <strong>{roleDisplay}</strong>
        </p>

        {/* Statistics for Researchers and Admins */}
        {(role === 'researcher' || role === 'admin') && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 border rounded-lg bg-card">
              <h3 className="text-lg font-semibold mb-2">{t('dashboard.stats.draft')}</h3>
              <p className="text-3xl font-bold text-muted-foreground">{stats.draft}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('dashboard.stats.draftDescription')}
              </p>
            </div>
            <div className="p-6 border rounded-lg bg-card">
              <h3 className="text-lg font-semibold mb-2">{t('dashboard.stats.published')}</h3>
              <p className="text-3xl font-bold text-primary">{stats.published}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('dashboard.stats.publishedDescription')}
              </p>
            </div>
          </div>
        )}

        {/* Admin Instructions */}
        {role === 'admin' && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <p className="text-sm">
              {t('dashboard.adminInstructions')}{' '}
              <Link 
                href={`/${params.locale}/dashboard/review`} 
                className="text-primary hover:underline"
              >
                {t('dashboard.adminInstructionsLink')}
              </Link>{' '}
              {t('dashboard.adminInstructionsSuffix')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

