import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { constructions, constructionTranslations } from '@/db/schema';
import { eq, or, and, desc } from 'drizzle-orm';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PublishButton } from '@/components/features/PublishButton';

interface PageProps {
  params: {
    locale: string;
  };
}

/**
 * Admin Review Page
 * 
 * Security: Verifies admin role before rendering
 * Data: Fetches constructions with draft or review status
 * UI: Displays constructions in a table with publish action
 */
export default async function ReviewPage({ params }: PageProps) {
  const t = await getTranslations();
  
  // Security: Verify admin role
  const hasAdminAccess = await isAdmin();
  if (!hasAdminAccess) {
    redirect(`/${params.locale}/dashboard`);
  }

  // Fetch constructions with draft or review status
  // Include translations for display
  const pendingConstructions = await db
    .select({
      id: constructions.id,
      slug: constructions.slug,
      typeCategory: constructions.typeCategory,
      status: constructions.status,
      updatedAt: constructions.updatedAt,
      // Get English translation (fallback to first available)
      title: constructionTranslations.title,
    })
    .from(constructions)
    .leftJoin(
      constructionTranslations,
      and(
        eq(constructionTranslations.constructionId, constructions.id),
        eq(constructionTranslations.langCode, 'en')
      )
    )
    .where(
      or(
        eq(constructions.status, 'draft'),
        eq(constructions.status, 'review')
      )
    )
    .orderBy(desc(constructions.updatedAt));

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('review.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('review.description')}
        </p>
      </div>

      {pendingConstructions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t('common.noItems')}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.title')}</TableHead>
                <TableHead>{t('common.type')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('common.updatedAt')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingConstructions.map((construction) => (
                <TableRow key={construction.id}>
                  <TableCell className="font-medium">
                    {construction.title || construction.slug}
                  </TableCell>
                  <TableCell>{construction.typeCategory}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800">
                      {t(`common.${construction.status}`)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {construction.updatedAt
                      ? new Date(construction.updatedAt).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <PublishButton
                      constructionId={construction.id}
                      currentStatus={construction.status as 'draft' | 'review' | 'published'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

