import { getTranslations } from 'next-intl/server';
import { isAdmin } from '@/lib/auth';
import { getConstructionForReview, getWaterLineByIdForEdit } from '@/actions/admin';
import { PublishButton } from '@/components/features/PublishButton';
import { getPublicUrl } from '@/lib/storage';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/db';
import { constructions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import dynamic from 'next/dynamic';

// Dynamically import LevadaMap to avoid SSR issues with Leaflet
const DynamicLevadaMap = dynamic(
  () => import('@/components/features/LevadaMap').then((mod) => ({ default: mod.LevadaMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[400px] bg-gray-100 rounded-md border border-input">
        <p className="text-gray-600">Loading map...</p>
      </div>
    ),
  }
);

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
 * 
 * Phase 5.9.7.1: Now handles both mills and water lines
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

  // First, check the construction type by slug
  const constructionType = await db
    .select({
      id: constructions.id,
      typeCategory: constructions.typeCategory,
    })
    .from(constructions)
    .where(eq(constructions.slug, params.slug))
    .limit(1);

  if (constructionType.length === 0) {
    notFound();
  }

  const { id: constructionId, typeCategory } = constructionType[0]!;

  // Handle water lines differently
  if (typeCategory === 'water_line') {
    const waterLineResult = await getWaterLineByIdForEdit(constructionId, params.locale);
    
    if (!waterLineResult.success) {
      notFound();
    }

    const waterLine = waterLineResult.data;

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
              <Link href={`/${params.locale}/dashboard/edit/${constructionId}`}>
                <Edit className="mr-2 h-4 w-4" />
                {t('review.editDraft')}
              </Link>
            </Button>
            <PublishButton
              constructionId={constructionId}
              currentStatus={waterLine.status as 'draft' | 'review' | 'published'}
            />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2">
          {waterLine.name || waterLine.slug}
        </h1>
        <p className="text-muted-foreground mb-8">
          {t('review.detail.subtitle')} • {waterLine.status}
        </p>

        {/* Water Line Review Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section A: Basic Information */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">{t('waterLines.form.name')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('common.title')}</p>
                  <p className="font-medium">{waterLine.name || waterLine.slug}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Slug</p>
                  <p className="font-medium font-mono text-sm">{waterLine.slug}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('waterLines.form.color')}</p>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: waterLine.color }}
                    />
                    <p className="font-medium font-mono text-sm">{waterLine.color}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Section B: Description */}
            {waterLine.description && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">{t('waterLines.form.description')}</h2>
                <p className="text-sm whitespace-pre-wrap">{waterLine.description}</p>
              </Card>
            )}

            {/* Section C: Map */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">{t('waterLines.form.map')}</h2>
              <div className="h-[400px] rounded-md overflow-hidden border border-input">
                <DynamicLevadaMap
                  mills={[]}
                  waterLines={[{
                    id: waterLine.id,
                    slug: waterLine.slug,
                    path: waterLine.path.map(([lng, lat]) => [lat, lng] as [number, number]), // Convert to [lat, lng] for Leaflet
                    color: waterLine.color,
                    name: waterLine.name,
                  }]}
                  locale={params.locale}
                />
              </div>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Status Info */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">{t('common.status')}</h2>
              <Badge variant={waterLine.status === 'published' ? 'default' : waterLine.status === 'review' ? 'secondary' : 'outline'}>
                {t(`common.${waterLine.status}`)}
              </Badge>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Handle mills (existing logic)
  const result = await getConstructionForReview(params.slug, params.locale);
  
  if (!result.success) {
    notFound();
  }

  const construction = result.data;

  // Debug: Log construction data to verify stone types and gable materials
  console.log('[ReviewDetailPage] Construction data:', {
    slug: construction.slug,
    stoneTypeGranite: construction.stoneTypeGranite,
    stoneTypeSchist: construction.stoneTypeSchist,
    stoneTypeOther: construction.stoneTypeOther,
    roofShape: construction.roofShape,
    gableMaterialLusa: construction.gableMaterialLusa,
    gableMaterialMarselha: construction.gableMaterialMarselha,
    gableMaterialMeiaCana: construction.gableMaterialMeiaCana,
  });

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
              {construction.address && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('add.form.location.address')}</p>
                  <p className="font-medium">{construction.address}</p>
                </div>
              )}
              {construction.drainageBasin && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('add.form.location.drainageBasin')}</p>
                  <p className="font-medium">{construction.drainageBasin}</p>
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
              {/* Gable Materials - Show ALL options when roofShape is 'gable', even if false */}
              {construction.roofShape === 'gable' && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground mb-2">{t('add.form.technical.architecture.gableRoofMaterials')}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={construction.gableMaterialLusa ? "secondary" : "outline"}>
                      {t('taxonomy.gableMaterial.lusa')} {construction.gableMaterialLusa ? '✓' : ''}
                    </Badge>
                    <Badge variant={construction.gableMaterialMarselha ? "secondary" : "outline"}>
                      {t('taxonomy.gableMaterial.marselha')} {construction.gableMaterialMarselha ? '✓' : ''}
                    </Badge>
                    <Badge variant={construction.gableMaterialMeiaCana ? "secondary" : "outline"}>
                      {t('taxonomy.gableMaterial.meiaCana')} {construction.gableMaterialMeiaCana ? '✓' : ''}
                    </Badge>
                  </div>
                </div>
              )}
              {construction.constructionTechnique && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('mill.detail.constructionTechnique')}</p>
                  <p className="font-medium">{getTranslatedValue('constructionTechnique', construction.constructionTechnique)}</p>
                </div>
              )}
              {/* Stone Types - Show ALL options, even if false */}
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground mb-2">{t('add.form.technical.architecture.stoneType')}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={construction.stoneTypeGranite ? "secondary" : "outline"}>
                    {t('taxonomy.stoneType.granite')} {construction.stoneTypeGranite ? '✓' : ''}
                  </Badge>
                  <Badge variant={construction.stoneTypeSchist ? "secondary" : "outline"}>
                    {t('taxonomy.stoneType.schist')} {construction.stoneTypeSchist ? '✓' : ''}
                  </Badge>
                  <Badge variant={construction.stoneTypeOther ? "secondary" : "outline"}>
                    {t('taxonomy.stoneType.other')} {construction.stoneTypeOther ? '✓' : ''}
                  </Badge>
                </div>
                {/* Stone Material Description if "Other" is selected */}
                {construction.stoneTypeOther && construction.stoneMaterialDescription && (
                  <p className="text-sm text-muted-foreground mt-2 italic">
                    {t('add.form.technical.architecture.stoneMaterialDescription')}: {construction.stoneMaterialDescription}
                  </p>
                )}
              </div>
              {construction.volumetry && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('add.form.technical.architecture.volumetry')}</p>
                  <p className="font-medium">{getTranslatedValue('volumetry', construction.volumetry)}</p>
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

          {/* Mechanism Info - Comprehensive Display */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">{t('mill.detail.mechanism')}</h2>
            <div className="space-y-4">
              {/* Hydraulic System */}
              {(construction.captationType || construction.conductionType || construction.conductionState || 
                construction.admissionRodizio || construction.admissionAzenha || 
                construction.wheelTypeRodizio || construction.wheelTypeAzenha ||
                construction.rodizioQty !== null || construction.azenhaQty !== null) && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">{t('add.form.mechanism.hydraulic.title')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                    {construction.captationType && (
                      <div>
                        <p className="text-sm text-muted-foreground">{t('add.form.mechanism.hydraulic.captationType')}</p>
                        <p className="font-medium">{getTranslatedValue('captationType', construction.captationType)}</p>
                      </div>
                    )}
                    {construction.conductionType && (
                      <div>
                        <p className="text-sm text-muted-foreground">{t('add.form.mechanism.hydraulic.conductionType')}</p>
                        <p className="font-medium">{getTranslatedValue('conductionType', construction.conductionType)}</p>
                      </div>
                    )}
                    {construction.conductionState && (
                      <div>
                        <p className="text-sm text-muted-foreground">{t('add.form.mechanism.hydraulic.conductionState')}</p>
                        <p className="font-medium">{getTranslatedValue('conductionState', construction.conductionState)}</p>
                      </div>
                    )}
                    {construction.admissionRodizio && (
                      <div>
                        <p className="text-sm text-muted-foreground">{t('add.form.mechanism.hydraulic.admissionRodizio')}</p>
                        <p className="font-medium">{getTranslatedValue('admissionRodizio', construction.admissionRodizio)}</p>
                      </div>
                    )}
                    {construction.admissionAzenha && (
                      <div>
                        <p className="text-sm text-muted-foreground">{t('add.form.mechanism.hydraulic.admissionAzenha')}</p>
                        <p className="font-medium">{getTranslatedValue('admissionAzenha', construction.admissionAzenha)}</p>
                      </div>
                    )}
                    {construction.wheelTypeRodizio && (
                      <div>
                        <p className="text-sm text-muted-foreground">{t('add.form.mechanism.hydraulic.wheelTypeRodizio')}</p>
                        <p className="font-medium">{getTranslatedValue('wheelTypeRodizio', construction.wheelTypeRodizio)}</p>
                      </div>
                    )}
                    {construction.wheelTypeAzenha && (
                      <div>
                        <p className="text-sm text-muted-foreground">{t('add.form.mechanism.hydraulic.wheelTypeAzenha')}</p>
                        <p className="font-medium">{getTranslatedValue('wheelTypeAzenha', construction.wheelTypeAzenha)}</p>
                      </div>
                    )}
                    {construction.rodizioQty !== null && (
                      <div>
                        <p className="text-sm text-muted-foreground">{t('add.form.mechanism.hydraulic.rodizioQty')}</p>
                        <p className="font-medium">{construction.rodizioQty}</p>
                      </div>
                    )}
                    {construction.azenhaQty !== null && (
                      <div>
                        <p className="text-sm text-muted-foreground">{t('add.form.mechanism.hydraulic.azenhaQty')}</p>
                        <p className="font-medium">{construction.azenhaQty}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Wind System */}
              {construction.motiveApparatus && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">{t('add.form.mechanism.wind.title')}</h3>
                  <div className="pl-4">
                    <p className="text-sm text-muted-foreground">{t('add.form.mechanism.wind.motiveApparatus')}</p>
                    <p className="font-medium">{getTranslatedValue('motiveApparatus', construction.motiveApparatus)}</p>
                  </div>
                </div>
              )}

              {/* Grinding Mechanism */}
              {(construction.millstoneQuantity !== null || construction.millstoneDiameter || construction.millstoneState ||
                construction.hasTremonha || construction.hasQuelha || construction.hasUrreiro || 
                construction.hasAliviadouro || construction.hasFarinaleiro) && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">{t('add.form.mechanism.grinding.title')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                    {construction.millstoneQuantity !== null && (
                      <div>
                        <p className="text-sm text-muted-foreground">{t('add.form.mechanism.grinding.millstoneQuantity')}</p>
                        <p className="font-medium">{construction.millstoneQuantity}</p>
                      </div>
                    )}
                    {construction.millstoneDiameter && (
                      <div>
                        <p className="text-sm text-muted-foreground">{t('add.form.mechanism.grinding.millstoneDiameter')}</p>
                        <p className="font-medium">{construction.millstoneDiameter} cm</p>
                      </div>
                    )}
                    {construction.millstoneState && (
                      <div>
                        <p className="text-sm text-muted-foreground">{t('add.form.mechanism.grinding.millstoneState')}</p>
                        <p className="font-medium">{getTranslatedValue('millstoneState', construction.millstoneState)}</p>
                      </div>
                    )}
                    {/* Grinding Components */}
                    {(construction.hasTremonha || construction.hasQuelha || construction.hasUrreiro || 
                      construction.hasAliviadouro || construction.hasFarinaleiro) && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-muted-foreground mb-2">{t('add.form.mechanism.grinding.components')}</p>
                        <div className="flex flex-wrap gap-2">
                          {construction.hasTremonha && (
                            <Badge variant="secondary">{t('taxonomy.grindingComponent.tremonha')}</Badge>
                          )}
                          {construction.hasQuelha && (
                            <Badge variant="secondary">{t('taxonomy.grindingComponent.quelha')}</Badge>
                          )}
                          {construction.hasUrreiro && (
                            <Badge variant="secondary">{t('taxonomy.grindingComponent.urreiro')}</Badge>
                          )}
                          {construction.hasAliviadouro && (
                            <Badge variant="secondary">{t('taxonomy.grindingComponent.aliviadouro')}</Badge>
                          )}
                          {construction.hasFarinaleiro && (
                            <Badge variant="secondary">{t('taxonomy.grindingComponent.farinaleiro')}</Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Epigraphy Section */}
          {(construction.epigraphyPresence || construction.epigraphyLocation || construction.epigraphyType || construction.epigraphyDescription) && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">{t('add.form.epigraphy.title')}</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('add.form.epigraphy.presence')}</p>
                  <p className="font-medium">{construction.epigraphyPresence ? 'Yes' : 'No'}</p>
                </div>
                {construction.epigraphyLocation && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('add.form.epigraphy.location')}</p>
                    <p className="font-medium">{getTranslatedValue('epigraphyLocation', construction.epigraphyLocation)}</p>
                  </div>
                )}
                {construction.epigraphyType && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('add.form.epigraphy.type')}</p>
                    <p className="font-medium">{getTranslatedValue('epigraphyType', construction.epigraphyType)}</p>
                  </div>
                )}
                {construction.epigraphyDescription && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('add.form.epigraphy.description')}</p>
                    <p className="text-sm whitespace-pre-wrap">{construction.epigraphyDescription}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Annexes Section */}
          {(construction.hasOven || construction.hasMillerHouse || construction.hasStable || construction.hasFullingMill) && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">{t('add.form.annexes.title')}</h2>
              <div className="flex flex-wrap gap-2">
                {construction.hasOven && (
                  <Badge variant="secondary">{t('taxonomy.annex.oven')}</Badge>
                )}
                {construction.hasMillerHouse && (
                  <Badge variant="secondary">{t('taxonomy.annex.miller_house')}</Badge>
                )}
                {construction.hasStable && (
                  <Badge variant="secondary">{t('taxonomy.annex.stable')}</Badge>
                )}
                {construction.hasFullingMill && (
                  <Badge variant="secondary">{t('taxonomy.annex.fulling_mill')}</Badge>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
