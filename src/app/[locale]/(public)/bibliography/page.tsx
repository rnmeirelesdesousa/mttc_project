import { getBibliography } from '@/actions/bibliography';
import { getTranslations } from 'next-intl/server';
import { BookOpen, Globe, Calendar, User } from 'lucide-react';
import Link from 'next/link';

export default async function BibliographyPage({ params: { locale } }: { params: { locale: string } }) {
    const t = await getTranslations();
    const { data: entries } = await getBibliography();

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                        <BookOpen className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {t('bibliography.title')}
                        </h1>
                        <p className="text-gray-600 mt-1">
                            {t('bibliography.description')}
                        </p>
                    </div>
                </div>

                {!entries || entries.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">{t('bibliography.noEntriesPublic')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {entries.map((entry) => (
                            <div key={entry.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <h2 className="text-xl font-bold text-gray-900 mb-2">
                                    {entry.url ? (
                                        <Link href={entry.url} target="_blank" className="hover:text-primary transition-colors">
                                            {entry.title}
                                        </Link>
                                    ) : (
                                        entry.title
                                    )}
                                </h2>

                                <div className="flex flex-wrap gap-4 text-gray-600 text-sm">
                                    <div className="flex items-center gap-1.5">
                                        <User className="h-4 w-4 text-primary/70" />
                                        <span className="font-medium">{entry.author}</span>
                                    </div>

                                    {entry.year && (
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-4 w-4 text-primary/70" />
                                            <span>{entry.year}</span>
                                        </div>
                                    )}

                                    {entry.publisher && (
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 rounded-md">
                                            <span>{entry.publisher}</span>
                                        </div>
                                    )}
                                </div>

                                {entry.url && (
                                    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-end">
                                        <Link
                                            href={entry.url}
                                            target="_blank"
                                            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            <Globe className="h-4 w-4" />
                                            {t('bibliography.viewResource')}
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
