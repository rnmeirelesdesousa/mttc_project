'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { getPublicUrl } from '@/lib/storage';
import { getMillById, getConnectedMills, type MillDetail, type PublishedMill } from '@/actions/public';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface MillSidebarProps {
  millId: string | null;
  locale: string;
  onClose?: () => void;
  millCoords?: { lat: number; lng: number } | null;
  cardPosition?: { top: number; left: number } | null;
}

/**
 * MillSidebar Component (Floating Postal Card - Scientist's Command Center)
 * 
 * Displays a floating ID card for a selected mill with scientific layout.
 * Positioned spatially adjacent to the clicked mill marker.
 * 
 * @param millId - UUID of the mill to display (null to hide)
 * @param locale - Current locale for i18n
 * @param onClose - Optional callback when sidebar is closed
 * @param millCoords - Coordinates of the mill marker for spatial positioning
 * @param mapContainerRef - Reference to the map container for coordinate conversion
 */
export const MillSidebar = ({ millId, locale, onClose, cardPosition }: MillSidebarProps) => {
  const t = useTranslations();
  const [mill, setMill] = useState<MillDetail | null>(null);
  const [connectedMills, setConnectedMills] = useState<PublishedMill[]>([]);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!millId) {
      setMill(null);
      setConnectedMills([]);
      return;
    }

    const fetchMillData = async () => {
      setLoading(true);
      try {
        const millData = await getMillById(millId, locale);
        setMill(millData);

        if (millData) {
          // Fetch connected mills
          const connectedResult = await getConnectedMills(millId, locale);
          if (connectedResult.success) {
            setConnectedMills(connectedResult.data);
          }
        }
      } catch (error) {
        console.error('[MillSidebar]: Error fetching mill data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMillData();
  }, [millId, locale]);

  if (!millId || !mill) {
    return null;
  }

  if (loading) {
    const positionStyle = cardPosition
      ? { top: `${cardPosition.top}px`, left: `${cardPosition.left}px` }
      : { top: '20px', left: '20px' };
    
    return (
      <Card
        ref={cardRef}
        className="absolute w-[600px] max-h-[80vh] bg-white/95 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-l-4 border-l-blue-600 overflow-y-auto z-[1000]"
        style={positionStyle}
      >
        <CardContent className="p-6">
          <p className="text-xs text-gray-600">{t('common.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  const imageUrl = getPublicUrl(mill.mainImage);
  const millTitle = mill.title || mill.slug;

  // Get conservation rating color
  const getConservationColor = (rating: string | null) => {
    if (!rating) return 'bg-gray-100 text-gray-700';
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
        return 'bg-gray-100 text-gray-700';
    }
  };

  const positionStyle = cardPosition
    ? { top: `${cardPosition.top}px`, left: `${cardPosition.left}px` }
    : { top: '20px', left: '20px' };

  return (
    <Card
      ref={cardRef}
      className="absolute w-[600px] max-h-[80vh] bg-white/95 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-l-4 border-l-blue-600 overflow-y-auto z-[1000]"
      style={positionStyle}
    >
      {/* General Info Section */}
      <CardHeader className="p-0 border-b">
        {imageUrl && (
          <div className="relative w-full" style={{ aspectRatio: '3/2' }}>
            <Image
              src={imageUrl}
              alt={millTitle}
              fill
              className="object-cover rounded-t-lg"
            />
          </div>
        )}
        <div className="p-6">
          <h2 className="text-sm font-semibold mb-2">{millTitle}</h2>
          {mill.description && (
            <p className="text-xs text-gray-700 leading-relaxed">{mill.description}</p>
          )}
          {/* See Details Button */}
          <Link
            href={`/${locale}/mill/${mill.slug}`}
            className="inline-block mt-2 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors"
          >
            {t('map.viewDetails')}
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* Coordinates - Prominent display near top with mono font */}
        <div className="bg-blue-50 border border-blue-200 rounded p-2.5">
          <span className="text-[10px] font-semibold text-gray-600 uppercase">{t('mill.sidebar.coordinates')}:</span>
          <p className="font-mono text-sm font-bold text-blue-900 mt-1">
            {mill.lat.toFixed(6)}, {mill.lng.toFixed(6)}
          </p>
        </div>

        {/* Location Info Section */}
        <div>
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase mb-2">
            {t('mill.sidebar.locationInfo')}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {mill.district && (
              <div>
                <span className="text-[10px] text-gray-500">{t('mill.sidebar.district')}:</span>
                <p className="font-medium">{mill.district}</p>
              </div>
            )}
            {mill.municipality && (
              <div>
                <span className="text-[10px] text-gray-500">{t('mill.sidebar.municipality')}:</span>
                <p className="font-medium">{mill.municipality}</p>
              </div>
            )}
            {mill.parish && (
              <div>
                <span className="text-[10px] text-gray-500">{t('mill.sidebar.parish')}:</span>
                <p className="font-medium">{mill.parish}</p>
              </div>
            )}
            {mill.drainageBasin && (
              <div>
                <span className="text-[10px] text-gray-500">{t('mill.sidebar.drainageBasin')}:</span>
                <p className="font-medium">{mill.drainageBasin}</p>
              </div>
            )}
          </div>
        </div>

        {/* Classification Section - 2-column grid */}
        <div>
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase mb-2">
            {t('mill.sidebar.classification')}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {mill.typology && (
              <div>
                <span className="text-[10px] text-gray-500">{t('mill.sidebar.typology')}:</span>
                <p className="font-medium">{t(`taxonomy.typology.${mill.typology}`)}</p>
              </div>
            )}
            {mill.currentUse && (
              <div>
                <span className="text-[10px] text-gray-500">{t('mill.sidebar.currentUse')}:</span>
                <p className="font-medium">{t(`taxonomy.currentUse.${mill.currentUse}`)}</p>
              </div>
            )}
            {mill.ratingOverall && (
              <div className="col-span-2">
                <span className="text-[10px] text-gray-500">{t('mill.sidebar.conservationRating')}:</span>
                <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${getConservationColor(mill.ratingOverall)}`}>
                  {t(`taxonomy.conservation.${mill.ratingOverall}`)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Technical Section - Construction Technique & Roof Detail in 2-column grid */}
        {(mill.constructionTechnique || mill.roofShape) && (
          <div>
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase mb-2">
              {t('mill.sidebar.constructionTechnique')} / {t('mill.sidebar.roofDetail')}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Construction Technique Column */}
              {mill.constructionTechnique && (
                <div>
                  <span className="text-[10px] text-gray-500">{t('mill.sidebar.constructionTechnique')}:</span>
                  <p className="font-medium mt-0.5">{t(`taxonomy.constructionTechnique.${mill.constructionTechnique}`)}</p>
                  {/* Show stone materials if a stone technique is selected */}
                  {(mill.constructionTechnique === 'dry_stone' || mill.constructionTechnique === 'mortared_stone') && (
                    <div className="mt-1.5">
                      <span className="text-[10px] text-gray-500">{t('mill.sidebar.stoneMaterials')}:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {mill.stoneTypeGranite && (
                          <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">
                            {t('taxonomy.stoneType.granite')}
                          </span>
                        )}
                        {mill.stoneTypeSchist && (
                          <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">
                            {t('taxonomy.stoneType.schist')}
                          </span>
                        )}
                        {mill.stoneTypeOther && (
                          <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">
                            {t('taxonomy.stoneType.other')}
                          </span>
                        )}
                      </div>
                      {mill.stoneTypeOther && mill.stoneMaterialDescription && (
                        <p className="text-[10px] text-gray-600 mt-1 italic">{mill.stoneMaterialDescription}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* Roof Detail Column */}
              {mill.roofShape && (
                <div>
                  <span className="text-[10px] text-gray-500">{t('mill.sidebar.roofDetail')}:</span>
                  <p className="font-medium mt-0.5">{t(`taxonomy.roofShape.${mill.roofShape}`)}</p>
                  {/* Show gable materials if Gable is selected */}
                  {mill.roofShape === 'gable' && (
                    <div className="mt-1.5">
                      <span className="text-[10px] text-gray-500">{t('mill.sidebar.gableMaterials')}:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {mill.gableMaterialLusa && (
                          <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">
                            {t('taxonomy.gableMaterial.lusa')}
                          </span>
                        )}
                        {mill.gableMaterialMarselha && (
                          <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">
                            {t('taxonomy.gableMaterial.marselha')}
                          </span>
                        )}
                        {mill.gableMaterialMeiaCana && (
                          <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">
                            {t('taxonomy.gableMaterial.meiaCana')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dimensions Section - Full width Metric Profile */}
        {(mill.length || mill.width || mill.height) && (
          <div>
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase mb-2">
              {t('mill.sidebar.dimensions')}
            </h3>
            <div className="bg-slate-50/50 border border-slate-200 rounded p-3 w-full">
              <p className="text-xs font-bold text-slate-900">
                {t('mill.sidebar.metricProfile')}:{' '}
                {mill.length && `${t('mill.sidebar.length')}: ${mill.length}m`}
                {mill.length && mill.width && ' | '}
                {mill.width && `${t('mill.sidebar.width')}: ${mill.width}m`}
                {(mill.length || mill.width) && mill.height && ' | '}
                {mill.height && `${t('mill.sidebar.height')}: ${mill.height}m`}
              </p>
            </div>
          </div>
        )}

        {/* Connectivity Section */}
        <div>
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase mb-2">
            {t('mill.sidebar.connectivity')}
          </h3>
          <div className="space-y-1.5 text-xs">
            {mill.waterLineName && mill.waterLineSlug ? (
              <div>
                <span className="text-[10px] text-gray-500">{t('mill.sidebar.linkedLevada')}:</span>
                <Link
                  href={`/${locale}/levada/${mill.waterLineSlug}`}
                  className="font-medium text-blue-600 hover:text-blue-800 underline ml-1"
                >
                  {mill.waterLineName}
                </Link>
              </div>
            ) : (
              <p className="text-[10px] text-gray-500">{t('mill.sidebar.linkedLevada')}: -</p>
            )}
            <div>
              <span className="text-[10px] text-gray-500">{t('mill.sidebar.connectedMills')}:</span>
              {connectedMills.length > 0 ? (
                <ul className="mt-1 space-y-1">
                  {connectedMills.map((connectedMill) => (
                    <li key={connectedMill.id}>
                      <Link
                        href={`/${locale}/mill/${connectedMill.slug}`}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        {connectedMill.title || connectedMill.slug}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[10px] text-gray-500 mt-1">{t('mill.sidebar.noConnectedMills')}</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      {/* Close button - Professional software suite styling */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-md bg-white/90 hover:bg-white text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 shadow-sm transition-all duration-150 z-10"
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </Card>
  );
};
