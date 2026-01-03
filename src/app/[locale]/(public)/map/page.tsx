import { getPublishedMills } from '@/actions/public';

interface PageProps {
  params: {
    locale: string;
  };
}

/**
 * Public Map Page
 * 
 * This page displays published mills on a map.
 * For now, it simply verifies the data pipeline by showing the count.
 * 
 * Security: Public route - no authentication required
 */
export default async function MapPage({ params }: PageProps) {
  // Fetch published mills for the current locale
  const result = await getPublishedMills(params.locale);

  if (!result.success) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Map</h1>
        <p className="text-red-600">Error: {result.error}</p>
      </div>
    );
  }

  const millsCount = result.data.length;

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Map</h1>
      <div className="bg-gray-100 p-4 rounded">
        <p className="text-lg">
          Found <strong>{millsCount}</strong> published mill{millsCount !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}

