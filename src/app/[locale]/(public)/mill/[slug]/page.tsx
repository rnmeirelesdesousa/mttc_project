import { getMillBySlug } from '@/actions/public';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { getPublicUrl } from '@/lib/storage';

interface PageProps {
  params: {
    locale: string;
    slug: string;
  };
}

/**
 * Mill Detail Page
 * 
 * Displays comprehensive scientific inventory data for a single mill.
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

  // Helper function to get translated enum value
  const getTranslatedValue = (category: string, key: string | null | undefined): string => {
    if (!key) return t('mill.detail.notAvailable');
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

  // Get image URL from storage helper
  const imageUrl = getPublicUrl(mill.mainImage);

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      {/* Breadcrumbs */}
      <Link
        href={`/${params.locale}/map`}
        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('map.backToMap')}
      </Link>

      {/* Hero Image Section */}
      {imageUrl ? (
        <div className="mb-8 rounded-lg overflow-hidden bg-gray-100">
          <Image
            src={imageUrl}
            alt={mill.title || mill.slug}
            width={1200}
            height={600}
            className="w-full h-auto object-cover"
            priority
          />
        </div>
      ) : (
        <div className="mb-8 rounded-lg overflow-hidden bg-gray-200 h-64 flex items-center justify-center">
          <p className="text-gray-500 text-sm">{t('mill.detail.noImage')}</p>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">
          {mill.title || mill.slug}
        </h1>
        
        {/* Location */}
        <div className="text-gray-600 mb-2">
          {mill.municipality && (
            <span>
              {mill.municipality}
              {mill.district && `, ${mill.district}`}
            </span>
          )}
          {mill.parish && mill.municipality && ' • '}
          {mill.parish && <span>{mill.parish}</span>}
        </div>

        {/* Coordinates */}
        <div className="text-sm text-gray-500">
          {t('mill.detail.coordinates')}: {formatCoordinates(mill.lat, mill.lng)}
        </div>
      </div>

      {/* Description */}
      {mill.description && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">{t('mill.detail.description')}</h2>
          <p className="text-gray-700 leading-relaxed">{mill.description}</p>
        </div>
      )}

      {/* Data Grid - 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Characterization Section */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">{t('mill.detail.characterization')}</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-600">{t('mill.detail.typology')}</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {getTranslatedValue('typology', mill.typology)}
              </dd>
            </div>
            {mill.epoch && (
              <div>
                <dt className="text-sm font-medium text-gray-600">{t('mill.detail.epoch')}</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {getTranslatedValue('epoch', mill.epoch)}
                </dd>
              </div>
            )}
            {mill.currentUse && (
              <div>
                <dt className="text-sm font-medium text-gray-600">{t('mill.detail.currentUse')}</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {getTranslatedValue('currentUse', mill.currentUse)}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Mechanism Section */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">{t('mill.detail.mechanism')}</h2>
          <dl className="space-y-3">
            {mill.millstonesPairs !== null && (
              <div>
                <dt className="text-sm font-medium text-gray-600">
                  {t('mill.detail.millstonesPairs')}
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{mill.millstonesPairs}</dd>
              </div>
            )}
            {mill.typology === 'rodizio' && mill.rodizioQty !== null && (
              <div>
                <dt className="text-sm font-medium text-gray-600">{t('mill.detail.wheelType')}</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {t('taxonomy.typology.rodizio')} ({mill.rodizioQty} {mill.rodizioQty === 1 ? t('mill.detail.wheel') : t('mill.detail.wheels')})
                </dd>
              </div>
            )}
            {mill.typology === 'azenha' && (
              <div>
                <dt className="text-sm font-medium text-gray-600">{t('mill.detail.wheelType')}</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {t('taxonomy.typology.azenha')}
                </dd>
              </div>
            )}
            {mill.waterCaptation && (
              <div>
                <dt className="text-sm font-medium text-gray-600">{t('mill.detail.waterCaptation')}</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {getTranslatedValue('waterCaptation', mill.waterCaptation)}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Materiality Section */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">{t('mill.detail.materiality')}</h2>
          <dl className="space-y-3">
            {mill.constructionTechnique && (
              <div>
                <dt className="text-sm font-medium text-gray-600">
                  {t('mill.detail.constructionTechnique')}
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {getTranslatedValue('constructionTechnique', mill.constructionTechnique)}
                </dd>
              </div>
            )}
            {mill.roofMaterial && (
              <div>
                <dt className="text-sm font-medium text-gray-600">
                  {t('mill.detail.roofMaterial')}
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{mill.roofMaterial}</dd>
              </div>
            )}
            {mill.roofShape && (
              <div>
                <dt className="text-sm font-medium text-gray-600">{t('mill.detail.roofShape')}</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {getTranslatedValue('roofShape', mill.roofShape)}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Conservation Section */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">{t('mill.detail.conservation')}</h2>
          <dl className="space-y-3">
            {mill.ratingOverall && (
              <div>
                <dt className="text-sm font-medium text-gray-600 mb-2">
                  {t('mill.detail.overallRating')}
                </dt>
                <dd className="mt-1">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRatingColor(mill.ratingOverall)}`}
                  >
                    {getTranslatedValue('conservation', mill.ratingOverall)}
                  </span>
                </dd>
              </div>
            )}
            {mill.ratingStructure && (
              <div>
                <dt className="text-sm font-medium text-gray-600">{t('mill.detail.structure')}</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {getTranslatedValue('conservation', mill.ratingStructure)}
                </dd>
              </div>
            )}
            {mill.ratingRoof && (
              <div>
                <dt className="text-sm font-medium text-gray-600">{t('mill.detail.roof')}</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {getTranslatedValue('conservation', mill.ratingRoof)}
                </dd>
              </div>
            )}
            {mill.ratingMechanism && (
              <div>
                <dt className="text-sm font-medium text-gray-600">{t('mill.detail.mechanismRating')}</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {getTranslatedValue('conservation', mill.ratingMechanism)}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}

