import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Map, Database } from 'lucide-react';

interface RootLocalePageProps {
  params: {
    locale: string;
  };
}

/**
 * Portal Home Page
 * 
 * Hero-style landing page for the Portuguese Stonework Database.
 * Provides primary navigation to the map and researcher portal.
 */
export default async function RootLocalePage({ params }: RootLocalePageProps) {
  const t = await getTranslations();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-50">
        <div className="container mx-auto px-4 py-16 text-center max-w-4xl">
          {/* Title */}
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            {t('home.title')}
          </h1>
          
          {/* Mission Statement */}
          <p className="text-xl md:text-2xl text-gray-700 mb-4 leading-relaxed">
            {t('home.mission')}
          </p>
          
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
            {t('home.description')}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              asChild
              size="lg"
              className="text-lg px-8 py-6"
            >
              <Link href={`/${params.locale}/map`}>
                <Map className="mr-2 h-5 w-5" />
                {t('home.exploreMap')}
              </Link>
            </Button>
            
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6"
            >
              <Link href={`/${params.locale}/dashboard`}>
                <Database className="mr-2 h-5 w-5" />
                {t('home.researcherPortal')}
              </Link>
            </Button>
          </div>

          {/* Additional Info */}
          <div className="mt-16 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              {t('home.footer')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
