import { getTranslations } from 'next-intl/server';
import { BookOpen } from 'lucide-react';

export default async function GlossaryPage() {
    const t = await getTranslations();

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                        <BookOpen className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {t('glossary.title')}
                        </h1>
                        <p className="text-gray-600 mt-1">
                            {t('glossary.description')}
                        </p>
                    </div>
                </div>

                <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">{t('glossary.underConstruction')}</p>
                </div>
            </div>
        </div>
    );
}
