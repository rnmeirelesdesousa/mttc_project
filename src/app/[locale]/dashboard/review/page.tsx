import { getTranslations } from 'next-intl/server';
import { isAdmin } from '@/lib/auth';
import { getReviewQueue } from '@/actions/admin';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PublishButton } from '@/components/features/PublishButton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

interface PageProps {
  params: {
    locale: string;
  };
}

/**
 * Admin Review Page
 * 
 * Security: Verifies admin role before rendering
 * Data: Fetches constructions with draft status using getReviewQueue action
 * UI: Displays constructions in a table with review and publish actions
 */
export default async function ReviewPage({ params }: PageProps) {
  const t = await getTranslations();
  
  // Security: Verify admin role
  const hasAdminAccess = await isAdmin();
  if (!hasAdminAccess) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-12">
          <p className="text-lg text-destructive">{t('review.unauthorized')}</p>
        </div>
      </div>
    );
  }

  // Fetch constructions with draft status using server action
  const result = await getReviewQueue(params.locale);
  
  if (!result.success) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-12">
          <p className="text-lg text-destructive">{result.error}</p>
        </div>
      </div>
    );
  }

  const drafts = result.data;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('review.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('review.description')}
        </p>
      </div>

      {drafts.length === 0 ? (
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
                <TableHead>{t('common.createdAt')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drafts.map((draft) => (
                <TableRow key={draft.id}>
                  <TableCell className="font-medium">
                    {draft.title || draft.slug}
                  </TableCell>
                  <TableCell>{draft.typeCategory}</TableCell>
                  <TableCell>
                    {draft.createdAt
                      ? new Date(draft.createdAt).toLocaleDateString(params.locale)
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                      >
                        <Link href={`/${params.locale}/dashboard/review/${draft.slug}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t('common.review')}
                        </Link>
                      </Button>
                      <PublishButton
                        constructionId={draft.id}
                        currentStatus="draft"
                      />
                    </div>
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

