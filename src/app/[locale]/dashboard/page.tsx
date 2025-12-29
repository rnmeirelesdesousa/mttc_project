import { getTranslations } from 'next-intl/server';
import { getCurrentUserRole } from '@/lib/auth';

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function DashboardPage({ params }: PageProps) {
  const t = await getTranslations();
  const role = await getCurrentUserRole();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">{t('dashboard.title')}</h1>
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Welcome to the dashboard. Your role: <strong>{role ?? 'Not authenticated'}</strong>
        </p>
        {role === 'admin' && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <p className="text-sm">
              As an admin, you can access the{' '}
              <a href={`/${params.locale}/dashboard/review`} className="text-primary hover:underline">
                Review Queue
              </a>{' '}
              to approve constructions for publication.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

