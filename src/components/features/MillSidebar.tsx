'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getPublicUrl } from '@/lib/storage';
import { getMillById, getConnectedMills, type MillDetail, type PublishedMill } from '@/actions/public';

interface MillSidebarProps {
  millId: string | null;
  locale: string;
  onClose?: () => void;
}

/**
 * MillSidebar Component (Floating Postal Card)
 * 
 * Displays a floating ID card for a selected mill with scientific layout.
 * Positioned at bottom-4 right-4 of the map container.
 * 
 * @param millId - UUID of the mill to display (null to hide)
 * @param locale - Current locale for i18n
 * @param onClose - Optional callback when sidebar is closed
 */
export const MillSidebar = ({ millId, locale, onClose }: MillSidebarProps) => {
  const t = useTranslations();
  const [mill, setMill] = useState<MillDetail | null>(null);
  const [connectedMills, setConnectedMills] = useState<PublishedMill[]>([]);
  const [loading, setLoading] = useState(false);

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
    return (
      <div className="fixed bottom-4 right-4 max-w-[420px] max-h-[85vh] bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border overflow-y-auto p-4">
        <p className="text-xs text-gray-600">{t('common.loading')}</p>
      </div>
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

  return (
    <div className="fixed bottom-4 right-4 max-w-[420px] max-h-[85vh] bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border overflow-y-auto z-50">
      {/* General Info Section */}
      <div className="border-b">
        {imageUrl && (
          <div className="relative w-full h-48">
            <Image
              src={imageUrl}
              alt={millTitle}
              fill
              className="object-cover rounded-t-lg"
            />
          </div>
        )}
        <div className="p-3">
          <h2 className="text-sm font-semibold mb-2">{millTitle}</h2>
          {mill.description && (
            <p className="text-xs text-gray-700 leading-relaxed">{mill.description}</p>
          )}
        </div>
      </div>

      <div className="p-3 space-y-4">
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
            <div className="col-span-2">
              <span className="text-[10px] text-gray-500">{t('mill.sidebar.coordinates')}:</span>
              <p className="font-medium text-xs">
                {mill.lat.toFixed(6)}, {mill.lng.toFixed(6)}
              </p>
            </div>
          </div>
        </div>

        {/* Classification Section */}
        <div>
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase mb-2">
            {t('mill.sidebar.classification')}
          </h3>
          <div className="space-y-1.5 text-xs">
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
              <div>
                <span className="text-[10px] text-gray-500">{t('mill.sidebar.conservationRating')}:</span>
                <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${getConservationColor(mill.ratingOverall)}`}>
                  {t(`taxonomy.conservation.${mill.ratingOverall}`)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Construction Technique Section */}
        {mill.constructionTechnique && (
          <div>
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase mb-2">
              {t('mill.sidebar.constructionTechnique')}
            </h3>
            <div className="space-y-1.5 text-xs">
              <p className="font-medium">{t(`taxonomy.constructionTechnique.${mill.constructionTechnique}`)}</p>
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
          </div>
        )}

        {/* Roof Detail Section */}
        {mill.roofShape && (
          <div>
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase mb-2">
              {t('mill.sidebar.roofDetail')}
            </h3>
            <div className="space-y-1.5 text-xs">
              <p className="font-medium">{t(`taxonomy.roofShape.${mill.roofShape}`)}</p>
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
          </div>
        )}

        {/* Dimensions Section */}
        {(mill.length || mill.width || mill.height) && (
          <div>
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase mb-2">
              {t('mill.sidebar.dimensions')}
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded p-2">
              <p className="text-xs font-bold text-blue-900">
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
      </div>

      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-gray-600 hover:text-gray-800 shadow-sm"
          aria-label="Close"
        >
          ×
        </button>
      )}
    </div>
  );
};
