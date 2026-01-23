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
    sidebarRef?: React.RefObject<HTMLDivElement>;
}

/**
 * MillSidebar Component (Horizontal ID Card - Scientist's Command Center)
 * 
 * Displays a horizontal ID card for a selected mill with scientific layout.
 * Positioned as a fixed floating card at the bottom-center of the screen.
 * Layout: Image (left) | Identity & Location (right) | Technical Details (bottom) | Action Button (bottom-right)
 * 
 * @param millId - UUID of the mill to display (null to hide)
 * @param locale - Current locale for i18n
 * @param onClose - Optional callback when sidebar is closed
 */
export const MillSidebar = ({ millId, locale, onClose, sidebarRef: externalRef }: MillSidebarProps) => {
    const t = useTranslations();
    const [mill, setMill] = useState<MillDetail | null>(null);
    const [connectedMills, setConnectedMills] = useState<PublishedMill[]>([]);
    const [loading, setLoading] = useState(false);
    const internalRef = useRef<HTMLDivElement>(null);
    const cardRef = externalRef || internalRef;

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

    if (!millId) {
        return null;
    }

    // Get border color from mill's water line color, fallback to blue (matching marker default)
    // Same logic as marker: use waterLineColor if available, otherwise use blue-500 (#3b82f6)
    const markerColor = mill?.waterLineColor || '#3b82f6'; // blue-500 to match marker default

    // Helper function to convert hex to rgba with opacity
    const hexToRgba = (hex: string, opacity: number): string => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    // Helper function to darken a hex color (for hover states)
    // percent: 0-1, where 0.2 means darken by 20% (multiply by 0.8)
    const darkenHex = (hex: string, percent: number): string => {
        const num = parseInt(hex.replace('#', ''), 16);
        const factor = 1 - percent;
        const r = Math.max(0, Math.min(255, Math.floor((num >> 16) * factor)));
        const g = Math.max(0, Math.min(255, Math.floor(((num >> 8) & 0x00FF) * factor)));
        const b = Math.max(0, Math.min(255, Math.floor((num & 0x0000FF) * factor)));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    };

    // Color variations using the marker color
    const colorBg50 = hexToRgba(markerColor, 0.1); // Very light background (like blue-50)
    const colorBg100 = hexToRgba(markerColor, 0.2); // Light background (like blue-100)
    const colorBorder200 = hexToRgba(markerColor, 0.3); // Border color (like blue-200)
    const colorText600 = markerColor; // Main text color (like blue-600)
    const colorText800 = darkenHex(markerColor, 0.2); // Darker text for hover (like blue-800)
    const colorText900 = darkenHex(markerColor, 0.3); // Darkest text (like blue-900)

    if (loading) {
        return (
            <div
                className="absolute bottom-5 left-[75%] -translate-x-1/2 z-[999] w-[calc(100vw-2rem)] md:w-[400px] lg:w-[500px] max-w-[500px] pointer-events-auto"
                style={{
                    animation: 'slideInFromMarker 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                }}
            >
                <Card
                    className="w-full bg-white/95 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-b-4"
                    style={{ borderBottomColor: markerColor }}
                >
                    <CardContent className="!p-3">
                        <p className="text-xs text-gray-600">{t('common.loading')}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!mill) {
        return null;
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
        <div
            ref={cardRef}
            className="absolute bottom-5 left-[75%] -translate-x-1/2 z-[999] w-[calc(100vw-2rem)] md:w-[400px] lg:w-[500px] max-w-[500px] max-h-[90vh] overflow-y-auto pointer-events-auto no-scrollbar"
            style={{
                animation: 'slideInFromMarker 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}
        >
            <Card
                className="w-full bg-white/95 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-b-4 relative"
                style={{ borderBottomColor: markerColor }}
            >
                <CardContent className="!p-3 relative">
                    {/* Close button - Professional software suite styling */}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-md bg-white/90 hover:bg-white text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 shadow-sm transition-all duration-150 z-10"
                            aria-label="Close"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                    {/* Top Row: Identity Section (Horizontal Layout) */}
                    <div className="flex gap-2 mb-2">
                        {/* Left: Image */}
                        <div className="flex-shrink-0 w-32 h-32 md:w-40 md:h-40">
                            {imageUrl ? (
                                <div className="relative w-full h-full rounded-md overflow-hidden border border-gray-200">
                                    <Image
                                        src={imageUrl}
                                        alt={millTitle}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="w-full h-full rounded-md bg-gray-200 border border-gray-300 flex items-center justify-center">
                                    <p className="text-xs text-gray-500 text-center px-2">No Picture</p>
                                </div>
                            )}
                        </div>

                        {/* Right: Title, Coordinates, Location */}
                        <div className="flex-1 min-w-0">
                            <h2 className="text-sm md:text-base font-semibold mb-1 truncate">{millTitle}</h2>

                            {/* Coordinates */}
                            <div
                                className="border rounded p-1 mb-1"
                                style={{
                                    backgroundColor: colorBg50,
                                    borderColor: colorBorder200
                                }}
                            >
                                <span className="text-[10px] font-semibold text-gray-600 uppercase">{t('mill.sidebar.coordinates')}:</span>
                                <p
                                    className="font-mono text-[10px] md:text-xs font-bold mt-0"
                                    style={{ color: colorText900 }}
                                >
                                    {mill.lat.toFixed(6)}, {mill.lng.toFixed(6)}
                                </p>
                            </div>

                            {/* Location Info - All available location fields */}
                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                                {mill.district && (
                                    <div>
                                        <span className="text-[10px] text-gray-500">{t('mill.sidebar.district')}:</span>
                                        <p className="font-medium truncate">{mill.district}</p>
                                    </div>
                                )}
                                {mill.municipality && (
                                    <div>
                                        <span className="text-[10px] text-gray-500">{t('mill.sidebar.municipality')}:</span>
                                        <p className="font-medium truncate">{mill.municipality}</p>
                                    </div>
                                )}
                                {mill.parish && (
                                    <div>
                                        <span className="text-[10px] text-gray-500">{t('mill.sidebar.parish')}:</span>
                                        <p className="font-medium truncate">{mill.parish}</p>
                                    </div>
                                )}
                                {mill.place && (
                                    <div>
                                        <span className="text-[10px] text-gray-500">{t('mill.sidebar.place')}:</span>
                                        <p className="font-medium truncate">{mill.place}</p>
                                    </div>
                                )}
                                {mill.address && (
                                    <div>
                                        <span className="text-[10px] text-gray-500">{t('mill.sidebar.address')}:</span>
                                        <p className="font-medium truncate">{mill.address}</p>
                                    </div>
                                )}
                                {mill.drainageBasin && (
                                    <div>
                                        <span className="text-[10px] text-gray-500">{t('mill.sidebar.drainageBasin')}:</span>
                                        <p className="font-medium truncate">{mill.drainageBasin}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Section: Technical Details */}
                    <div className="border-t border-gray-200 pt-2">
                        {/* Technical Details Grid - Compact 3-column layout */}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            {/* Typology */}
                            <div>
                                <span className="text-[10px] text-gray-500">{t('mill.sidebar.typology')}:</span>
                                <p className="font-medium mt-0.5">
                                    {mill.typology ? t(`taxonomy.typology.${mill.typology}`) : '-'}
                                </p>
                            </div>

                            {/* Construction Technique */}
                            <div>
                                <span className="text-[10px] text-gray-500">{t('mill.sidebar.constructionTechnique')}:</span>
                                <div className="mt-0.5">
                                    {mill.constructionTechnique ? (
                                        <>
                                            <p className="font-medium">{t(`taxonomy.constructionTechnique.${mill.constructionTechnique}`)}</p>
                                            {/* Show stone materials if dry_stone or mortared_stone */}
                                            {(mill.constructionTechnique === 'dry_stone' || mill.constructionTechnique === 'mortared_stone') && (
                                                (mill.stoneTypeGranite || mill.stoneTypeSchist || mill.stoneTypeOther) && (
                                                    <div className="flex flex-col mt-0.5">
                                                        {mill.stoneTypeGranite && (
                                                            <span className="font-medium text-gray-900">
                                                                - {t('taxonomy.stoneType.granite')}
                                                            </span>
                                                        )}
                                                        {mill.stoneTypeSchist && (
                                                            <span className="font-medium text-gray-900">
                                                                - {t('taxonomy.stoneType.schist')}
                                                            </span>
                                                        )}
                                                        {mill.stoneTypeOther && (
                                                            <span className="font-medium text-gray-900">
                                                                - {t('taxonomy.stoneType.other')}
                                                            </span>
                                                        )}
                                                    </div>
                                                )
                                            )}
                                            {/* Show other technique description if mixed_other */}
                                            {mill.constructionTechnique === 'mixed_other' && mill.observationsStructure && (
                                                <p className="text-[9px] text-gray-600 mt-0.5 line-clamp-1">
                                                    {mill.observationsStructure.startsWith('Construction Technique (Other):')
                                                        ? mill.observationsStructure.replace('Construction Technique (Other):', '').trim()
                                                        : mill.observationsStructure}
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <p className="font-medium text-gray-400">-</p>
                                    )}
                                </div>
                            </div>

                            {/* Roof */}
                            <div>
                                <span className="text-[10px] text-gray-500">{t('mill.sidebar.roofDetail')}:</span>
                                <div className="mt-0.5">
                                    {mill.roofShape === 'false_dome' ? (
                                        <p className="font-medium">{t('taxonomy.roofShape.false_dome')}</p>
                                    ) : mill.roofMaterial === 'stone' ? (
                                        <p className="font-medium">{t('taxonomy.roofMaterial.stone')}</p>
                                    ) : mill.roofShape === 'gable' ? (
                                        <>
                                            <p className="font-medium">{t('taxonomy.roofShape.gable')}</p>
                                            {(mill.gableMaterialLusa || mill.gableMaterialMarselha || mill.gableMaterialMeiaCana) && (
                                                <div className="flex flex-col mt-0.5">
                                                    {mill.gableMaterialLusa && (
                                                        <span className="font-medium text-gray-900">
                                                            - {t('taxonomy.gableMaterial.lusa')}
                                                        </span>
                                                    )}
                                                    {mill.gableMaterialMarselha && (
                                                        <span className="font-medium text-gray-900">
                                                            - {t('taxonomy.gableMaterial.marselha')}
                                                        </span>
                                                    )}
                                                    {mill.gableMaterialMeiaCana && (
                                                        <span className="font-medium text-gray-900">
                                                            - {t('taxonomy.gableMaterial.meiaCana')}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    ) : mill.roofShape ? (
                                        <p className="font-medium">{t(`taxonomy.roofShape.${mill.roofShape}`)}</p>
                                    ) : (
                                        <p className="font-medium text-gray-400">-</p>
                                    )}
                                </div>
                            </div>

                            {/* Dimensions */}
                            <div>
                                <span className="text-[10px] text-gray-500">{t('mill.sidebar.dimensions')}:</span>
                                <p className="font-medium mt-0.5 text-slate-900">
                                    {(mill.length || mill.width || mill.height) ? (
                                        <>
                                            {mill.length && `${mill.length}m`}
                                            {mill.length && mill.width && ' × '}
                                            {mill.width && `${mill.width}m`}
                                            {(mill.length || mill.width) && mill.height && ' × '}
                                            {mill.height && `${mill.height}m`}
                                        </>
                                    ) : (
                                        <span className="text-gray-400">-</span>
                                    )}
                                </p>
                            </div>

                            {/* Current Use */}
                            <div>
                                <span className="text-[10px] text-gray-500">{t('mill.sidebar.currentUse')}:</span>
                                <p className="font-medium mt-0.5">
                                    {mill.currentUse ? t(`taxonomy.currentUse.${mill.currentUse}`) : '-'}
                                </p>
                            </div>

                            {/* Conservation Rating */}
                            <div>
                                <span className="text-[10px] text-gray-500">{t('mill.sidebar.conservationRating')}:</span>
                                {mill.ratingOverall ? (
                                    <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${getConservationColor(mill.ratingOverall)}`}>
                                        {t(`taxonomy.conservation.${mill.ratingOverall}`)}
                                    </span>
                                ) : (
                                    <p className="font-medium mt-0.5 text-gray-400">-</p>
                                )}
                            </div>
                        </div>

                        {/* Connectivity Section - Compact inline layout */}
                        <div className="border-t border-gray-200 pt-2 mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <span className="text-[10px] text-gray-500">{t('mill.sidebar.linkedLevada')}:</span>
                                {mill.waterLineName && mill.waterLineSlug ? (
                                    <Link
                                        href={`/${locale}/levada/${mill.waterLineSlug}`}
                                        className="font-medium underline ml-1 text-[10px] transition-colors"
                                        style={{
                                            color: colorText600
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.color = colorText800}
                                        onMouseLeave={(e) => e.currentTarget.style.color = colorText600}
                                    >
                                        {mill.waterLineName}
                                    </Link>
                                ) : (
                                    <span className="text-gray-400 ml-1 text-[10px]">-</span>
                                )}
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-500">{t('mill.sidebar.connectedMills')}:</span>
                                {connectedMills.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                        {connectedMills.slice(0, 3).map((connectedMill) => (
                                            <Link
                                                key={connectedMill.id}
                                                href={`/${locale}/mill/${connectedMill.slug}`}
                                                className="text-[9px] underline transition-colors"
                                                style={{ color: colorText600 }}
                                                onMouseEnter={(e) => e.currentTarget.style.color = colorText800}
                                                onMouseLeave={(e) => e.currentTarget.style.color = colorText600}
                                            >
                                                {connectedMill.title || connectedMill.slug}
                                            </Link>
                                        ))}
                                        {connectedMills.length > 3 && (
                                            <span className="text-[9px] text-gray-500">+{connectedMills.length - 3}</span>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-gray-400 ml-1 text-[10px]">-</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* View Details Button - Bottom Right */}
                    <div className="mt-3 flex justify-end">
                        <Link
                            href={`/${locale}/mill/${mill.slug}`}
                            className="px-4 py-2 text-xs font-medium rounded-md transition-colors"
                            style={{
                                color: colorText600,
                                backgroundColor: colorBg50,
                                borderColor: colorBorder200,
                                borderWidth: '1px',
                                borderStyle: 'solid'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = colorBg100;
                                e.currentTarget.style.color = colorText800;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = colorBg50;
                                e.currentTarget.style.color = colorText600;
                            }}
                        >
                            {t('map.viewDetails')}
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};