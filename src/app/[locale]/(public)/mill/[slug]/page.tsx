import { getMillBySlug } from '@/actions/public';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, FileText, Download } from 'lucide-react';
import Image from 'next/image';
import { getPublicUrl } from '@/lib/storage';
import { isResearcherOrAdmin } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PageProps {
  params: {
    locale: string;
    slug: string;
  };
}

/**
 * Mill Detail Page - Academic Record Sheet
 * 
 * High-end academic/museum catalog entry design
 * 
 * Security: Only displays published mills. Returns 404 if mill doesn't exist or is not published.
 */
export default async function MillDetailPage({ params }: PageProps) {
  const t = await getTranslations();

  // Fetch mill data by slug
  const mill = await getMillBySlug(params.slug, params.locale);

  // Return 404 if mill doesn't exist or is not published
  if (!mill) {
    notFound();
  }

  // Check if user can edit (researcher or admin)
  const canEdit = await isResearcherOrAdmin();

  // Helper function to get translated enum value
  const getTranslatedValue = (category: string, key: string | null | undefined): string => {
    if (!key) return '';
    try {
      return t(`taxonomy.${category}.${key}`);
    } catch {
      return key;
    }
  };

  // Format coordinates
  const formatCoordinates = (lat: number, lng: number): string => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  // Get image and document URLs
  const mainImageUrl = mill.mainImage ? getPublicUrl(mill.mainImage) : null;
  const galleryUrls = mill.galleryImages?.map(img => getPublicUrl(img)).filter((url): url is string => url !== null) || [];

  const documentUrls = mill.documentPaths?.map(path => {
    const url = getPublicUrl(path);
    if (!url) return null;
    // Extract filename from path
    const name = path.split('/').pop() || 'Document';
    return { name, url };
  }).filter((doc): doc is { name: string; url: string } => doc !== null) || [];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <div className="border-b border-gray-300 bg-white sticky top-0 z-10">
        <div className="container mx-auto max-w-7xl px-8 py-3">
          <div className="flex items-center justify-between">
            <Link
              href={`/${params.locale}/map`}
              className="inline-flex items-center text-xs text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="mr-1.5 h-3 w-3" />
              {t('map.backToMap')}
            </Link>

            {canEdit && (
              <Button asChild variant="ghost" size="sm" className="text-xs h-7">
                <Link href={`/${params.locale}/dashboard/edit/${mill.id}`}>
                  <Edit className="mr-1.5 h-3 w-3" />
                  {t('mill.detail.editEntry')}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-12">
          {/* Left Column: Header & Description */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Header Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-normal text-gray-900 mb-1 tracking-tight">
                {mill.title || mill.slug}
              </h1>
              <p className="text-xs text-gray-400 font-mono uppercase mb-3">
                {t('common.published')}
              </p>
              {mill.legacyId && (
                <p className="text-xs font-mono text-gray-400 mb-1.5">
                  {t('add.form.general.legacyId')}: {mill.legacyId}
                </p>
              )}
              {(mill.municipality || mill.district || mill.parish || mill.place || mill.address) && (
                <p className="text-xs text-gray-500 mb-1">
                  {mill.municipality && mill.municipality}
                  {mill.district && mill.municipality && ', '}
                  {mill.district && mill.district}
                  {mill.parish && (mill.municipality || mill.district) && ' • '}
                  {mill.parish && mill.parish}
                  {mill.place && (mill.parish || mill.municipality || mill.district) && ' • '}
                  {mill.place && mill.place}
                  {mill.address && (mill.place || mill.parish || mill.municipality || mill.district) && ' • '}
                  {mill.address && mill.address}
                </p>
              )}
              <p className="text-xs text-gray-400 font-mono">
                {formatCoordinates(mill.lat, mill.lng)}
              </p>
            </div>

            {/* Description */}
            {mill.description && (
              <div>
                <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                  {t('mill.detail.description')}
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed font-normal whitespace-pre-wrap">
                  {mill.description}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Main Image */}
          <div className="lg:col-span-5">
            {mainImageUrl && (
              <div className="relative w-full aspect-[4/3] bg-gray-200 overflow-hidden border border-gray-300">
                <Image
                  src={mainImageUrl}
                  alt={mill.title || mill.slug}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
              </div>
            )}
          </div>
        </div>

        {/* Technical Data - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Left Column */}
          <div className="space-y-10">
            {/* Identification & Location */}
            <section>
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-5 border-b border-gray-300 pb-1.5">
                I. {t('mill.detail.characterization')}
              </h2>
              <dl className="space-y-3.5">
                <div>
                  <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                    {t('mill.detail.typology')}
                  </dt>
                  <dd className="text-xs text-gray-700 font-normal">
                    {getTranslatedValue('typology', mill.typology)}
                  </dd>
                </div>
                {mill.epoch && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('mill.detail.epoch')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {getTranslatedValue('epoch', mill.epoch)}
                    </dd>
                  </div>
                )}
                {mill.setting && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('add.form.technical.setting')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {getTranslatedValue('setting', mill.setting)}
                    </dd>
                  </div>
                )}
                {mill.currentUse && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('mill.detail.currentUse')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {getTranslatedValue('currentUse', mill.currentUse)}
                    </dd>
                  </div>
                )}
                {mill.access && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('add.form.technical.access')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {getTranslatedValue('access', mill.access)}
                    </dd>
                  </div>
                )}
                {mill.legalProtection && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('add.form.technical.legalProtection')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {getTranslatedValue('legalProtection', mill.legalProtection)}
                    </dd>
                  </div>
                )}
                {mill.propertyStatus && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('add.form.technical.propertyStatus')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {getTranslatedValue('propertyStatus', mill.propertyStatus)}
                    </dd>
                  </div>
                )}
                {mill.drainageBasin && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('add.form.location.drainageBasin')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {mill.drainageBasin}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Architecture */}
            <section>
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-5 border-b border-gray-300 pb-1.5">
                II. {t('add.form.technical.architecture.title')}
              </h2>
              <dl className="space-y-3.5">
                {(mill.length !== null || mill.width !== null || mill.height !== null) && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('mill.detail.dimensionsTitle')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal font-mono">
                      {[
                        mill.length !== null ? `${mill.length}m` : null,
                        mill.width !== null ? `${mill.width}m` : null,
                        mill.height !== null ? `${mill.height}m` : null,
                      ]
                        .filter(Boolean)
                        .join(' × ')}
                    </dd>
                  </div>
                )}
                {mill.planShape && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('add.form.technical.architecture.planShape')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {getTranslatedValue('planShape', mill.planShape)}
                    </dd>
                  </div>
                )}
                {mill.volumetry && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('add.form.technical.architecture.volumetry')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {getTranslatedValue('volumetry', mill.volumetry)}
                    </dd>
                  </div>
                )}
                {mill.constructionTechnique && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('mill.detail.constructionTechnique')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {getTranslatedValue('constructionTechnique', mill.constructionTechnique)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-1.5">
                    {t('add.form.technical.architecture.stoneType')}
                  </dt>
                  <dd className="flex flex-wrap gap-1.5">
                    <span className={`text-xs px-1.5 py-0.5 border ${mill.stoneTypeGranite ? 'border-gray-400 bg-gray-50' : 'border-gray-300 text-gray-400'}`}>
                      {t('taxonomy.stoneType.granite')}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 border ${mill.stoneTypeSchist ? 'border-gray-400 bg-gray-50' : 'border-gray-300 text-gray-400'}`}>
                      {t('taxonomy.stoneType.schist')}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 border ${mill.stoneTypeOther ? 'border-gray-400 bg-gray-50' : 'border-gray-300 text-gray-400'}`}>
                      {t('taxonomy.stoneType.other')}
                    </span>
                  </dd>
                  {mill.stoneTypeOther && mill.stoneMaterialDescription && (
                    <dd className="text-xs text-gray-500 mt-1.5">
                      {mill.stoneMaterialDescription}
                    </dd>
                  )}
                </div>
                {mill.exteriorFinish && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('add.form.technical.architecture.exteriorFinish')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {getTranslatedValue('exteriorFinish', mill.exteriorFinish)}
                    </dd>
                  </div>
                )}
                {mill.roofShape && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('mill.detail.roofShape')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {getTranslatedValue('roofShape', mill.roofShape)}
                    </dd>
                  </div>
                )}
                {mill.roofMaterial && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('mill.detail.roofMaterial')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {getTranslatedValue('roofMaterial', mill.roofMaterial)}
                    </dd>
                  </div>
                )}
                {mill.roofShape === 'gable' && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-1.5">
                      {t('add.form.technical.architecture.gableRoofMaterials')}
                    </dt>
                    <dd className="flex flex-wrap gap-1.5">
                      <span className={`text-xs px-1.5 py-0.5 border ${mill.gableMaterialLusa ? 'border-gray-400 bg-gray-50' : 'border-gray-300 text-gray-400'}`}>
                        {t('taxonomy.gableMaterial.lusa')}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 border ${mill.gableMaterialMarselha ? 'border-gray-400 bg-gray-50' : 'border-gray-300 text-gray-400'}`}>
                        {t('taxonomy.gableMaterial.marselha')}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 border ${mill.gableMaterialMeiaCana ? 'border-gray-400 bg-gray-50' : 'border-gray-300 text-gray-400'}`}>
                        {t('taxonomy.gableMaterial.meiaCana')}
                      </span>
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Mechanism */}
            <section>
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-5 border-b border-gray-300 pb-1.5">
                III. {t('mill.detail.mechanism')}
              </h2>
              <dl className="space-y-3.5">
                {mill.motiveApparatus && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('add.form.mechanism.wind.motiveApparatus')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {getTranslatedValue('motiveApparatus', mill.motiveApparatus)}
                    </dd>
                  </div>
                )}
                {mill.captationType && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('add.form.mechanism.hydraulic.captationType')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {getTranslatedValue('captationType', mill.captationType)}
                    </dd>
                  </div>
                )}
                {mill.conductionType && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('add.form.mechanism.hydraulic.conductionType')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {getTranslatedValue('conductionType', mill.conductionType)}
                    </dd>
                  </div>
                )}
                {mill.conductionState && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('add.form.mechanism.hydraulic.conductionState')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {getTranslatedValue('conductionState', mill.conductionState)}
                    </dd>
                  </div>
                )}
                {mill.admissionRodizio && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('add.form.mechanism.hydraulic.admissionRodizio')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {getTranslatedValue('admissionRodizio', mill.admissionRodizio)}
                    </dd>
                  </div>
                )}
                {mill.admissionAzenha && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('add.form.mechanism.hydraulic.admissionAzenha')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {getTranslatedValue('admissionAzenha', mill.admissionAzenha)}
                    </dd>
                  </div>
                )}
                {mill.wheelTypeRodizio && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('add.form.mechanism.hydraulic.wheelTypeRodizio')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {getTranslatedValue('wheelTypeRodizio', mill.wheelTypeRodizio)}
                    </dd>
                  </div>
                )}
                {mill.wheelTypeAzenha && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('add.form.mechanism.hydraulic.wheelTypeAzenha')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {getTranslatedValue('wheelTypeAzenha', mill.wheelTypeAzenha)}
                    </dd>
                  </div>
                )}
                {mill.rodizioQty !== null && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('add.form.mechanism.hydraulic.rodizioQty')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal font-mono">
                      {mill.rodizioQty}
                    </dd>
                  </div>
                )}
                {mill.azenhaQty !== null && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('add.form.mechanism.hydraulic.azenhaQty')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal font-mono">
                      {mill.azenhaQty}
                    </dd>
                  </div>
                )}
                {mill.millstoneQuantity !== null && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('add.form.mechanism.grinding.millstoneQuantity')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal font-mono">
                      {mill.millstoneQuantity}
                    </dd>
                  </div>
                )}
                {mill.millstoneDiameter && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('add.form.mechanism.grinding.millstoneDiameter')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal font-mono">
                      {mill.millstoneDiameter} cm
                    </dd>
                  </div>
                )}
                {mill.millstoneState && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('add.form.mechanism.grinding.millstoneState')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {getTranslatedValue('millstoneState', mill.millstoneState)}
                    </dd>
                  </div>
                )}
                {(mill.hasTremonha || mill.hasQuelha || mill.hasUrreiro ||
                  mill.hasAliviadouro || mill.hasFarinaleiro) && (
                    <div>
                      <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-1.5">
                        {t('add.form.mechanism.grinding.components')}
                      </dt>
                      <dd className="flex flex-wrap gap-1.5">
                        {mill.hasTremonha && (
                          <span className="text-xs px-1.5 py-0.5 border border-gray-300">
                            {t('taxonomy.grindingComponent.tremonha')}
                          </span>
                        )}
                        {mill.hasQuelha && (
                          <span className="text-xs px-1.5 py-0.5 border border-gray-300">
                            {t('taxonomy.grindingComponent.quelha')}
                          </span>
                        )}
                        {mill.hasUrreiro && (
                          <span className="text-xs px-1.5 py-0.5 border border-gray-300">
                            {t('taxonomy.grindingComponent.urreiro')}
                          </span>
                        )}
                        {mill.hasAliviadouro && (
                          <span className="text-xs px-1.5 py-0.5 border border-gray-300">
                            {t('taxonomy.grindingComponent.aliviadouro')}
                          </span>
                        )}
                        {mill.hasFarinaleiro && (
                          <span className="text-xs px-1.5 py-0.5 border border-gray-300">
                            {t('taxonomy.grindingComponent.farinaleiro')}
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                {mill.waterLineName && (
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('add.form.mechanism.hydraulic.infrastructure.waterLine')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {mill.waterLineSlug ? (
                        <Link
                          href={`/${params.locale}/levada/${mill.waterLineSlug}`}
                          className="underline"
                        >
                          {mill.waterLineName}
                        </Link>
                      ) : (
                        mill.waterLineName
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-10">
            {/* Conservation */}
            {(mill.ratingStructure || mill.ratingRoof || mill.ratingHydraulic ||
              mill.ratingMechanism || mill.ratingOverall) && (
                <section>
                  <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-5 border-b border-gray-300 pb-1.5">
                    IV. {t('mill.detail.conservation')}
                  </h2>
                  <dl className="space-y-3.5">
                    {mill.ratingOverall && (
                      <div>
                        <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                          {t('mill.detail.overallRating')}
                        </dt>
                        <dd className="text-xs text-gray-700 font-normal">
                          {getTranslatedValue('conservation', mill.ratingOverall)}
                        </dd>
                      </div>
                    )}
                    {mill.ratingStructure && (
                      <div>
                        <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                          {t('mill.detail.structure')}
                        </dt>
                        <dd className="text-xs text-gray-700 font-normal">
                          {getTranslatedValue('conservation', mill.ratingStructure)}
                        </dd>
                      </div>
                    )}
                    {mill.ratingRoof && (
                      <div>
                        <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                          {t('mill.detail.roof')}
                        </dt>
                        <dd className="text-xs text-gray-700 font-normal">
                          {getTranslatedValue('conservation', mill.ratingRoof)}
                        </dd>
                      </div>
                    )}
                    {mill.ratingHydraulic && (
                      <div>
                        <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                          {t('add.form.conservation.ratingHydraulic')}
                        </dt>
                        <dd className="text-xs text-gray-700 font-normal">
                          {getTranslatedValue('conservation', mill.ratingHydraulic)}
                        </dd>
                      </div>
                    )}
                    {mill.ratingMechanism && (
                      <div>
                        <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                          {t('add.form.conservation.ratingMechanism')}
                        </dt>
                        <dd className="text-xs text-gray-700 font-normal">
                          {getTranslatedValue('conservation', mill.ratingMechanism)}
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>
              )}

            {/* Epigraphy */}
            {(mill.epigraphyPresence || mill.epigraphyLocation || mill.epigraphyType || mill.epigraphyDescription) && (
              <section>
                <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-5 border-b border-gray-300 pb-1.5">
                  V. {t('add.form.epigraphy.title')}
                </h2>
                <dl className="space-y-3.5">
                  <div>
                    <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                      {t('add.form.epigraphy.presence')}
                    </dt>
                    <dd className="text-xs text-gray-700 font-normal">
                      {mill.epigraphyPresence ? 'Yes' : 'No'}
                    </dd>
                  </div>
                  {mill.epigraphyLocation && (
                    <div>
                      <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                        {t('add.form.epigraphy.location')}
                      </dt>
                      <dd className="text-xs text-gray-700 font-normal">
                        {getTranslatedValue('epigraphyLocation', mill.epigraphyLocation)}
                      </dd>
                    </div>
                  )}
                  {mill.epigraphyType && (
                    <div>
                      <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                        {t('add.form.epigraphy.type')}
                      </dt>
                      <dd className="text-xs text-gray-700 font-normal">
                        {getTranslatedValue('epigraphyType', mill.epigraphyType)}
                      </dd>
                    </div>
                  )}
                  {mill.epigraphyDescription && (
                    <div>
                      <dt className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-0.5">
                        {t('add.form.epigraphy.description')}
                      </dt>
                      <dd className="text-xs text-gray-600 font-normal leading-relaxed whitespace-pre-wrap">
                        {mill.epigraphyDescription}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            )}

            {/* Annexes */}
            {(mill.hasOven || mill.hasMillerHouse || mill.hasStable || mill.hasFullingMill) && (
              <section>
                <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-5 border-b border-gray-300 pb-1.5">
                  VI. {t('add.form.annexes.title')}
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {mill.hasOven && (
                    <span className="text-xs px-1.5 py-0.5 border border-gray-300">
                      {t('taxonomy.annex.oven')}
                    </span>
                  )}
                  {mill.hasMillerHouse && (
                    <span className="text-xs px-1.5 py-0.5 border border-gray-300">
                      {t('taxonomy.annex.miller_house')}
                    </span>
                  )}
                  {mill.hasStable && (
                    <span className="text-xs px-1.5 py-0.5 border border-gray-300">
                      {t('taxonomy.annex.stable')}
                    </span>
                  )}
                  {mill.hasFullingMill && (
                    <span className="text-xs px-1.5 py-0.5 border border-gray-300">
                      {t('taxonomy.annex.fulling_mill')}
                    </span>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Field Observations */}
        {(mill.observationsStructure || mill.observationsRoof || mill.observationsHydraulic ||
          mill.observationsMechanism || mill.observationsGeneral) && (
            <section className="mb-12 max-w-4xl">
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-5 border-b border-gray-300 pb-1.5">
                Field Observations
              </h2>
              <div className="space-y-6">
                {mill.observationsStructure && (
                  <div>
                    <h3 className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-2">
                      {t('mill.sidebar.observationsStructure')}
                    </h3>
                    <p className="text-xs text-gray-600 font-normal leading-relaxed whitespace-pre-wrap">
                      {mill.observationsStructure}
                    </p>
                  </div>
                )}
                {mill.observationsRoof && (
                  <div>
                    <h3 className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-2">
                      {t('mill.sidebar.observationsRoof')}
                    </h3>
                    <p className="text-xs text-gray-600 font-normal leading-relaxed whitespace-pre-wrap">
                      {mill.observationsRoof}
                    </p>
                  </div>
                )}
                {mill.observationsHydraulic && (
                  <div>
                    <h3 className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-2">
                      {t('mill.sidebar.observationsHydraulic')}
                    </h3>
                    <p className="text-xs text-gray-600 font-normal leading-relaxed whitespace-pre-wrap">
                      {mill.observationsHydraulic}
                    </p>
                  </div>
                )}
                {mill.observationsMechanism && (
                  <div>
                    <h3 className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-2">
                      {t('mill.sidebar.observationsMechanism')}
                    </h3>
                    <p className="text-xs text-gray-600 font-normal leading-relaxed whitespace-pre-wrap">
                      {mill.observationsMechanism}
                    </p>
                  </div>
                )}
                {mill.observationsGeneral && (
                  <div>
                    <h3 className="text-xs font-normal text-gray-400 uppercase tracking-wide mb-2">
                      {t('mill.sidebar.observationsGeneral')}
                    </h3>
                    <p className="text-xs text-gray-600 font-normal leading-relaxed whitespace-pre-wrap">
                      {mill.observationsGeneral}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

        {/* Technical Documents */}
        {documentUrls.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-5 border-b border-gray-300 pb-1.5">
              {t('mill.detail.documents')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documentUrls.map((doc, idx) => (
                <a
                  key={idx}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-4 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors group"
                >
                  <FileText className="w-5 h-5 text-gray-400 group-hover:text-gray-600 mr-3" />
                  <span className="text-sm text-gray-700 font-medium truncate flex-1">
                    {doc.name}
                  </span>
                  <Download className="w-4 h-4 text-gray-400 group-hover:text-gray-600 ml-2" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Gallery Images - Bottom */}
        {galleryUrls.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-5 border-b border-gray-300 pb-1.5">
              Additional Documentation
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {galleryUrls.map((url, idx) => (
                <div key={idx} className="relative aspect-square bg-gray-200 overflow-hidden border border-gray-300">
                  <Image
                    src={url}
                    alt={`${mill.title || mill.slug} - Documentation ${idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
