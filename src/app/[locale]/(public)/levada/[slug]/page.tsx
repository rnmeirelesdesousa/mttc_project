import { getWaterLineBySlug } from '@/actions/public';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { getPublicUrl } from '@/lib/storage';
import { isResearcherOrAdmin } from '@/lib/auth';
import { Button } from '@/components/ui/button';

// Dynamically import LevadaMap to avoid SSR issues with Leaflet
const DynamicLevadaMap = dynamic(
  () => import('@/components/features/LevadaMap').then((mod) => ({ default: mod.LevadaMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[400px] bg-gray-100 rounded-lg">
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
 * Levada (Water Line) Detail Page
 * 
 * Displays information about a single Levada, including its path on a map
 * and a list of all published mills connected to it.
 * 
 * Security: Only displays published mills. Returns 404 if levada doesn't exist.
 */
export default async function LevadaDetailPage({ params }: PageProps) {
  const t = await getTranslations();

  // Fetch levada data by slug
  const levada = await getWaterLineBySlug(params.slug, params.locale);

  // Return 404 if levada doesn't exist
  if (!levada) {
    notFound();
  }

  // Check if user can edit (researcher or admin)
  const canEdit = await isResearcherOrAdmin();

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      {/* Breadcrumbs and Edit Button */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href={`/${params.locale}/map`}
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('map.backToMap')}
        </Link>
        
        {/* Edit Button - Only visible to Researchers/Admins */}
        {canEdit && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/${params.locale}/dashboard/edit/${levada.id}`}>
              <Edit className="mr-2 h-4 w-4" />
              {t('levadaDetails.editEntry')}
            </Link>
          </Button>
        )}
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          {/* Color indicator */}
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: levada.color }}
          />
          <h1 className="text-3xl font-bold">{levada.name}</h1>
        </div>
        
        {/* Description */}
        {levada.description && (
          <p className="text-gray-700 leading-relaxed text-lg">{levada.description}</p>
        )}
      </div>

      {/* Map Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">{t('levadaDetails.map')}</h2>
        <div className="h-[400px] w-full rounded-lg overflow-hidden border border-gray-300">
          <DynamicLevadaMap
            mills={levada.connectedMills}
            waterLines={[{
              id: levada.id,
              slug: levada.slug,
              path: levada.path,
              color: levada.color,
              name: levada.name,
            }]}
            locale={params.locale}
          />
        </div>
      </div>

      {/* Connected Mills Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {t('levadaDetails.fedMills')} ({levada.connectedMills.length})
        </h2>
        
        {levada.connectedMills.length === 0 ? (
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <p className="text-gray-600">{t('levadaDetails.noMillsConnected')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {levada.connectedMills.map((mill) => {
              const millTitle = mill.title || mill.slug;
              const imageUrl = getPublicUrl(mill.mainImage);
              
              return (
                <Link
                  key={mill.id}
                  href={`/${params.locale}/mill/${mill.slug}`}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Thumbnail */}
                  {imageUrl ? (
                    <div className="relative w-full h-48 bg-gray-100">
                      <Image
                        src={imageUrl}
                        alt={millTitle}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400 text-sm">—</span>
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">{millTitle}</h3>
                    {mill.municipality && (
                      <p className="text-sm text-gray-600">
                        {mill.municipality}
                        {mill.district && `, ${mill.district}`}
                      </p>
                    )}
                    {mill.description && (
                      <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                        {mill.description}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
