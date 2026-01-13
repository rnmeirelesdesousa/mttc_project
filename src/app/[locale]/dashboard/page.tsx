import { getTranslations } from 'next-intl/server';
import { getCurrentUserRole } from '@/lib/auth';
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

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">{t('dashboard.title')}</h1>
      <div className="space-y-4">
        <p className="text-muted-foreground">
          {t('dashboard.welcome')} <strong>{roleDisplay}</strong>
        </p>
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

