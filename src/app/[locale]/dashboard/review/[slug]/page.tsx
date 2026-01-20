import { getTranslations } from 'next-intl/server';
import { isAdmin } from '@/lib/auth';
import { getConstructionForReview } from '@/actions/admin';
import { PublishButton } from '@/components/features/PublishButton';
import { getPublicUrl } from '@/lib/storage';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/card';

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
 * 
 * Phase 5.9.20.5: Comprehensive Admin Review Page
 * - Section A: Location & ID
 * - Section B: Technical Specs
 * - Section C: Architecture
 * - Section D: Observations
 * - Section E: Media
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
  const galleryUrls = construction.galleryImages?.map(img => getPublicUrl(img)) || [];

  // Build stone types array
  const stoneTypes: string[] = [];
  if (construction.stoneTypeGranite) stoneTypes.push(t('taxonomy.stoneType.granite'));
  if (construction.stoneTypeSchist) stoneTypes.push(t('taxonomy.stoneType.schist'));
  if (construction.stoneTypeOther) stoneTypes.push(t('taxonomy.stoneType.other'));

  return (
    <div className="container mx-auto py-8 max-w-6xl">
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
      <p className="text-muted-foreground mb-8">
        {t('review.detail.subtitle')} • {construction.status}
      </p>

      {/* Structured Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section A: Location & ID */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">{t('mill.detail.location')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('common.title')}</p>
                <p className="font-medium">{construction.title || construction.slug}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Slug</p>
                <p className="font-medium font-mono text-sm">{construction.slug}</p>
              </div>
              {construction.legacyId && (
                <div>
                  <p className="text-sm text-muted-foreground">Legacy ID</p>
                  <p className="font-medium">{construction.legacyId}</p>
                </div>
              )}
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
              <div>
                <p className="text-sm text-muted-foreground">{t('mill.detail.coordinates')}</p>
                <p className="font-medium font-mono text-sm">{construction.lat.toFixed(6)}, {construction.lng.toFixed(6)}</p>
              </div>
            </div>
          </Card>

          {/* Section B: Technical Specs */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">{t('mill.sidebar.technicalSpecs')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dimensions */}
              {(construction.length !== null || construction.width !== null || construction.height !== null) && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground mb-2">{t('mill.detail.dimensionsTitle')}</p>
                  <div className="flex gap-4">
                    {construction.length !== null && (
                      <div>
                        <span className="text-sm text-muted-foreground">{t('mill.sidebar.length')}: </span>
                        <span className="font-medium">{construction.length}m</span>
                      </div>
                    )}
                    {construction.width !== null && (
                      <div>
                        <span className="text-sm text-muted-foreground">{t('mill.sidebar.width')}: </span>
                        <span className="font-medium">{construction.width}m</span>
                      </div>
                    )}
                    {construction.height !== null && (
                      <div>
                        <span className="text-sm text-muted-foreground">{t('mill.sidebar.height')}: </span>
                        <span className="font-medium">{construction.height}m</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Stone Types */}
              {stoneTypes.length > 0 && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground mb-2">{t('mill.sidebar.stoneMaterials')}</p>
                  <div className="flex flex-wrap gap-2">
                    {stoneTypes.map((type, idx) => (
                      <span key={idx} className="inline-block px-2 py-1 rounded bg-blue-100 text-blue-800 text-sm">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
          </Card>

          {/* Section C: Architecture */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">{t('add.form.technical.architecture.title')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {construction.planShape && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('add.form.technical.architecture.planShape')}</p>
                  <p className="font-medium">{getTranslatedValue('planShape', construction.planShape)}</p>
                </div>
              )}
              {construction.roofShape && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('mill.detail.roofShape')}</p>
                  <p className="font-medium">{getTranslatedValue('roofShape', construction.roofShape)}</p>
                </div>
              )}
              {construction.roofMaterial && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('mill.detail.roofMaterial')}</p>
                  <p className="font-medium">{getTranslatedValue('roofMaterial', construction.roofMaterial)}</p>
                </div>
              )}
              {construction.volumetry && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('add.form.technical.architecture.volumetry')}</p>
                  <p className="font-medium">{getTranslatedValue('volumetry', construction.volumetry)}</p>
                </div>
              )}
              {construction.constructionTechnique && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('mill.detail.constructionTechnique')}</p>
                  <p className="font-medium">{getTranslatedValue('constructionTechnique', construction.constructionTechnique)}</p>
                </div>
              )}
              {construction.exteriorFinish && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('add.form.technical.architecture.exteriorFinish')}</p>
                  <p className="font-medium">{getTranslatedValue('exteriorFinish', construction.exteriorFinish)}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Section D: Observations */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">{t('mill.detail.conservation')}</h2>
            <div className="space-y-4">
              {/* Conservation Ratings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {construction.ratingStructure && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('mill.detail.structure')}</p>
                    <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${getRatingColor(construction.ratingStructure)}`}>
                      {getTranslatedValue('conservation', construction.ratingStructure)}
                    </span>
                  </div>
                )}
                {construction.ratingRoof && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('mill.detail.roof')}</p>
                    <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${getRatingColor(construction.ratingRoof)}`}>
                      {getTranslatedValue('conservation', construction.ratingRoof)}
                    </span>
                  </div>
                )}
                {construction.ratingHydraulic && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('add.form.conservation.ratingHydraulic')}</p>
                    <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${getRatingColor(construction.ratingHydraulic)}`}>
                      {getTranslatedValue('conservation', construction.ratingHydraulic)}
                    </span>
                  </div>
                )}
                {construction.ratingMechanism && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('add.form.conservation.ratingMechanism')}</p>
                    <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${getRatingColor(construction.ratingMechanism)}`}>
                      {getTranslatedValue('conservation', construction.ratingMechanism)}
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

              {/* Observation Fields */}
              {construction.observationsStructure && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('mill.sidebar.observationsStructure')}</p>
                  <p className="text-sm whitespace-pre-wrap">{construction.observationsStructure}</p>
                </div>
              )}
              {construction.observationsRoof && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('mill.sidebar.observationsRoof')}</p>
                  <p className="text-sm whitespace-pre-wrap">{construction.observationsRoof}</p>
                </div>
              )}
              {construction.observationsHydraulic && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('mill.sidebar.observationsHydraulic')}</p>
                  <p className="text-sm whitespace-pre-wrap">{construction.observationsHydraulic}</p>
                </div>
              )}
              {construction.observationsMechanism && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('mill.sidebar.observationsMechanism')}</p>
                  <p className="text-sm whitespace-pre-wrap">{construction.observationsMechanism}</p>
                </div>
              )}
              {construction.observationsGeneral && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('mill.sidebar.observationsGeneral')}</p>
                  <p className="text-sm whitespace-pre-wrap">{construction.observationsGeneral}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Section E: Media */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">{t('add.form.images.gallery')}</h2>
            <div className="space-y-4">
              {/* Main Image */}
              {imageUrl && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t('add.form.images.mainImage')}</p>
                  <img
                    src={imageUrl}
                    alt={construction.title || construction.slug}
                    className="w-full h-auto rounded-lg border border-input"
                  />
                </div>
              )}
              {/* Gallery Images */}
              {galleryUrls.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('add.form.images.gallery')} ({galleryUrls.length})
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    {galleryUrls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`${construction.title || construction.slug} - Gallery ${idx + 1}`}
                        className="w-full h-auto rounded-lg border border-input"
                      />
                    ))}
                  </div>
                </div>
              )}
              {!imageUrl && galleryUrls.length === 0 && (
                <p className="text-sm text-muted-foreground">{t('mill.detail.noImage')}</p>
              )}
            </div>
          </Card>

          {/* Additional Info */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">{t('mill.detail.characterization')}</h2>
            <div className="space-y-4">
              {construction.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('mill.detail.description')}</p>
                  <p className="text-sm whitespace-pre-wrap">{construction.description}</p>
                </div>
              )}
              {construction.access && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('add.form.technical.access')}</p>
                  <p className="font-medium">{getTranslatedValue('access', construction.access)}</p>
                </div>
              )}
              {construction.legalProtection && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('add.form.technical.legalProtection')}</p>
                  <p className="font-medium">{getTranslatedValue('legalProtection', construction.legalProtection)}</p>
                </div>
              )}
              {construction.propertyStatus && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('add.form.technical.propertyStatus')}</p>
                  <p className="font-medium">{getTranslatedValue('propertyStatus', construction.propertyStatus)}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Mechanism Info */}
          {(construction.captationType || construction.millstoneQuantity !== null) && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">{t('mill.detail.mechanism')}</h2>
              <div className="space-y-4">
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
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
