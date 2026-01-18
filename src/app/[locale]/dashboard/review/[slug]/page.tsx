import { getTranslations } from 'next-intl/server';
import { isAdmin } from '@/lib/auth';
import { getConstructionForReview } from '@/actions/admin';
import { PublishButton } from '@/components/features/PublishButton';
import { getPublicUrl } from '@/lib/storage';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';
import { notFound } from 'next/navigation';

interface PageProps {
  params: {
    locale: string;
    slug: string;
  };
}

/**
 * Admin Review Detail Page
 * 
 * Security: Verifies admin role before rendering
 * Displays full construction data for review and approval
 */
export default async function ReviewDetailPage({ params }: PageProps) {
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

  // Fetch construction data
  const result = await getConstructionForReview(params.slug, params.locale);
  
  if (!result.success) {
    notFound();
  }

  const construction = result.data;

  // Helper function to get translated enum value
  const getTranslatedValue = (category: string, key: string | null | undefined): string => {
    if (!key) return t('mill.detail.notAvailable');
    try {
      return t(`taxonomy.${category}.${key}`);
    } catch {
      return key;
    }
  };

  // Get conservation rating badge color
  const getRatingColor = (rating: string | null): string => {
    if (!rating) return 'bg-gray-200 text-gray-800';
    switch (rating) {
      case 'very_good':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'reasonable':
        return 'bg-yellow-100 text-yellow-800';
      case 'bad':
        return 'bg-orange-100 text-orange-800';
      case 'very_bad_ruin':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  // Get image URL
  const imageUrl = getPublicUrl(construction.mainImage);

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Header with back button, edit, and publish action */}
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/${params.locale}/dashboard/review`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('review.backToQueue')}
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
          >
            <Link href={`/${params.locale}/dashboard/edit/${construction.id}`}>
              <Edit className="mr-2 h-4 w-4" />
              {t('review.editDraft')}
            </Link>
          </Button>
          <PublishButton
            constructionId={construction.id}
            currentStatus={construction.status as 'draft' | 'review' | 'published'}
          />
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-2">
        {construction.title || construction.slug}
      </h1>
      <p className="text-muted-foreground mb-6">
        {t('review.detail.subtitle')} • {construction.status}
      </p>

      {/* Main Image */}
      {imageUrl && (
        <div className="mb-6">
          <img
            src={imageUrl}
            alt={construction.title || construction.slug}
            className="w-full h-auto rounded-lg border border-input"
          />
        </div>
      )}

      {/* General Information */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">{t('mill.detail.characterization')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('mill.detail.typology')}</p>
            <p className="font-medium">{getTranslatedValue('typology', construction.typology)}</p>
          </div>
          {construction.epoch && (
            <div>
              <p className="text-sm text-muted-foreground">{t('mill.detail.epoch')}</p>
              <p className="font-medium">{getTranslatedValue('epoch', construction.epoch)}</p>
            </div>
          )}
          {construction.setting && (
            <div>
              <p className="text-sm text-muted-foreground">{t('add.form.technical.setting')}</p>
              <p className="font-medium">{getTranslatedValue('setting', construction.setting)}</p>
            </div>
          )}
          {construction.currentUse && (
            <div>
              <p className="text-sm text-muted-foreground">{t('mill.detail.currentUse')}</p>
              <p className="font-medium">{getTranslatedValue('currentUse', construction.currentUse)}</p>
            </div>
          )}
        </div>
        {construction.description && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">{t('mill.detail.description')}</p>
            <p className="mt-1">{construction.description}</p>
          </div>
        )}
      </section>

      {/* Location */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">{t('mill.detail.location')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('mill.detail.coordinates')}</p>
            <p className="font-medium">{construction.lat.toFixed(6)}, {construction.lng.toFixed(6)}</p>
          </div>
          {construction.district && (
            <div>
              <p className="text-sm text-muted-foreground">{t('add.form.location.district')}</p>
              <p className="font-medium">{construction.district}</p>
            </div>
          )}
          {construction.municipality && (
            <div>
              <p className="text-sm text-muted-foreground">{t('add.form.location.municipality')}</p>
              <p className="font-medium">{construction.municipality}</p>
            </div>
          )}
          {construction.parish && (
            <div>
              <p className="text-sm text-muted-foreground">{t('add.form.location.parish')}</p>
              <p className="font-medium">{construction.parish}</p>
            </div>
          )}
        </div>
      </section>

      {/* Mechanism */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">{t('mill.detail.mechanism')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {construction.captationType && (
            <div>
              <p className="text-sm text-muted-foreground">{t('add.form.mechanism.hydraulic.captationType')}</p>
              <p className="font-medium">{getTranslatedValue('captationType', construction.captationType)}</p>
            </div>
          )}
          {construction.millstoneQuantity !== null && (
            <div>
              <p className="text-sm text-muted-foreground">{t('add.form.mechanism.grinding.millstoneQuantity')}</p>
              <p className="font-medium">{construction.millstoneQuantity}</p>
            </div>
          )}
        </div>
      </section>

      {/* Conservation */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">{t('mill.detail.conservation')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {construction.ratingStructure && (
            <div>
              <p className="text-sm text-muted-foreground">{t('mill.detail.structure')}</p>
              <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${getRatingColor(construction.ratingStructure)}`}>
                {getTranslatedValue('conservation', construction.ratingStructure)}
              </span>
            </div>
          )}
          {construction.ratingOverall && (
            <div>
              <p className="text-sm text-muted-foreground">{t('mill.detail.overallRating')}</p>
              <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${getRatingColor(construction.ratingOverall)}`}>
                {getTranslatedValue('conservation', construction.ratingOverall)}
              </span>
            </div>
          )}
        </div>
        {construction.observationsGeneral && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">{t('add.form.conservation.observationsGeneral')}</p>
            <p className="mt-1">{construction.observationsGeneral}</p>
          </div>
        )}
      </section>
    </div>
  );
}
