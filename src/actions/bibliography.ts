'use server';

import { db } from '@/lib/db';
import { bibliography } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { isResearcherOrAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Validation Schema
const bibliographySchema = z.object({
    title: z.string().min(1, "Title is required"),
    author: z.string().min(1, "Author is required"),
    year: z.coerce.number().optional(),
    publisher: z.string().optional(),
    url: z.string().url("Invalid URL").optional().or(z.literal('')),
});

/**
 * Fetch all bibliography entries (public)
 */
export async function getBibliography() {
    try {
        const entries = await db
            .select()
            .from(bibliography)
            .orderBy(desc(bibliography.year), desc(bibliography.createdAt));

        return { success: true, data: entries };
    } catch (error) {
        console.error('Error fetching bibliography:', error);
        return { success: false, error: 'Failed to fetch bibliography' };
    }
}

/**
 * Create a new bibliography entry (admin/researcher)
 */
export async function createBibliographyEntry(formData: FormData) {
    try {
        const hasPermission = await isResearcherOrAdmin();
        if (!hasPermission) {
            return { success: false, error: 'Unauthorized' };
        }

        const rawData = {
            title: formData.get('title'),
            author: formData.get('author'),
            year: formData.get('year'),
            publisher: formData.get('publisher'),
            url: formData.get('url'),
        };

        const validated = bibliographySchema.safeParse(rawData);

        if (!validated.success) {
            return { success: false, error: validated.error.errors[0].message };
        }

        const { title, author, year, publisher, url } = validated.data;

        await db.insert(bibliography).values({
            title,
            author,
            year: year || null,
            publisher: publisher || null,
            url: url || null,
        });

        revalidatePath('/[locale]/bibliography');
        revalidatePath('/[locale]/dashboard/bibliography');
        return { success: true };

    } catch (error) {
        console.error('Error creating bibliography entry:', error);
        return { success: false, error: 'Failed to create entry' };
    }
}

/**
 * Delete a bibliography entry (admin/researcher)
 */
export async function deleteBibliographyEntry(id: string) {
    try {
        const hasPermission = await isResearcherOrAdmin();
        if (!hasPermission) {
            return { success: false, error: 'Unauthorized' };
        }

        await db.delete(bibliography).where(eq(bibliography.id, id));

        revalidatePath('/[locale]/bibliography');
        revalidatePath('/[locale]/dashboard/bibliography');
        return { success: true };
    } catch (error) {
        console.error('Error deleting bibliography entry:', error);
        return { success: false, error: 'Failed to delete entry' };
    }
}
