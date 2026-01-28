'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Loader2, BookOpen } from 'lucide-react';
import { createBibliographyEntry, deleteBibliographyEntry, getBibliography } from '@/actions/bibliography';

interface BibliographyEntry {
    id: string;
    title: string;
    author: string;
    year: number | null;
    publisher: string | null;
    url: string | null;
}

export default function BibliographyDashboard({ params: { locale } }: { params: { locale: string } }) {
    const t = useTranslations();
    const [entries, setEntries] = useState<BibliographyEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const loadEntries = async () => {
        setLoading(true);
        const res = await getBibliography();
        if (res.success && res.data) {
            setEntries(res.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadEntries();
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        const formData = new FormData(e.currentTarget);

        const res = await createBibliographyEntry(formData);

        if (res.success) {
            alert(t('bibliography.alerts.added'));
            (e.target as HTMLFormElement).reset();
            loadEntries();
        } else {
            alert(res.error || t('bibliography.alerts.addFailed'));
        }
        setSubmitting(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('bibliography.alerts.confirmDelete'))) return;

        const res = await deleteBibliographyEntry(id);
        if (res.success) {
            alert(t('bibliography.alerts.deleted'));
            loadEntries();
        } else {
            alert(t('bibliography.alerts.deleteFailed'));
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-5xl">
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
                <BookOpen className="h-8 w-8 text-primary" />
                {t('bibliography.management')}
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add Form */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 h-fit">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        {t('bibliography.addNew')}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="title">{t('bibliography.form.title')} *</Label>
                            <Input id="title" name="title" required placeholder={t('bibliography.form.placeholders.title')} />
                        </div>
                        <div>
                            <Label htmlFor="author">{t('bibliography.form.author')} *</Label>
                            <Input id="author" name="author" required placeholder={t('bibliography.form.placeholders.author')} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="year">{t('bibliography.form.year')}</Label>
                                <Input id="year" name="year" type="number" placeholder={t('bibliography.form.placeholders.year')} />
                            </div>
                            <div>
                                <Label htmlFor="publisher">{t('bibliography.form.publisher')}</Label>
                                <Input id="publisher" name="publisher" placeholder={t('bibliography.form.placeholders.publisher')} />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="url">{t('bibliography.form.url')}</Label>
                            <Input id="url" name="url" type="url" placeholder={t('bibliography.form.placeholders.url')} />
                        </div>
                        <Button type="submit" className="w-full" disabled={submitting}>
                            {submitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                            {t('bibliography.form.submit')}
                        </Button>
                    </form>
                </div>

                {/* List View */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-semibold mb-4">{t('bibliography.currentEntries')} ({entries.length})</h2>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="animate-spin h-8 w-8 text-primary" />
                        </div>
                    ) : entries.length === 0 ? (
                        <p className="text-gray-500 italic">{t('bibliography.noEntries')}</p>
                    ) : (
                        <div className="space-y-3">
                            {entries.map((entry) => (
                                <div key={entry.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-start group hover:border-primary/30 transition-colors">
                                    <div>
                                        <h3 className="font-bold text-gray-900">{entry.title}</h3>
                                        <p className="text-gray-700">{entry.author} {entry.year && `(${entry.year})`}</p>
                                        <div className="text-sm text-gray-500 flex gap-2 flex-wrap mt-1">
                                            {entry.publisher && <span>{entry.publisher}</span>}
                                            {entry.url && (
                                                <a href={entry.url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                                    Link ↗
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(entry.id)}
                                        className="text-gray-400 hover:text-red-500 -mt-1 -mr-1"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
