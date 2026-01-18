'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { getInventoryItems, type InventoryItem } from '@/actions/admin';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, Edit, Search } from 'lucide-react';
import Link from 'next/link';

/**
 * Inventory Master-List Page
 * 
 * Displays all constructions (mills) and water lines (levadas) in a unified table.
 * Features:
 * - Filter by type (Mill vs. Levada) and Status (Draft, Review, Published)
 * - Debounced text search by Name/Title
 * - View and Edit buttons for each row
 * 
 * Security: Requires researcher or admin role (enforced by server action)
 */
export default function InventoryPage() {
  const t = useTranslations();
  const locale = useLocale() as 'pt' | 'en';
  const router = useRouter();

  // State
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<'MILL' | 'LEVADA' | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'draft' | 'review' | 'published' | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch inventory items
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getInventoryItems(
        locale,
        {
          type: typeFilter,
          status: statusFilter,
        },
        debouncedSearchQuery || undefined
      );

      if (result.success) {
        setItems(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('[InventoryPage]: Error fetching items:', err);
      setError('An error occurred while fetching inventory items');
    } finally {
      setLoading(false);
    }
  }, [locale, typeFilter, statusFilter, debouncedSearchQuery]);

  // Fetch items when filters or search change
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Get public URL for viewing
  const getPublicUrl = (item: InventoryItem): string => {
    if (item.type === 'MILL') {
      return `/${locale}/mill/${item.slug}`;
    } else {
      return `/${locale}/levada/${item.slug}`;
    }
  };

  // Get edit URL
  const getEditUrl = (item: InventoryItem): string => {
    return `/${locale}/dashboard/edit/${item.id}`;
  };

  // Get status display text
  const getStatusText = (status: string): string => {
    return t(`common.${status}`);
  };

  // Get type display text
  const getTypeText = (type: string): string => {
    if (type === 'MILL') {
      return t('inventory.type.mill');
    } else {
      return t('inventory.type.levada');
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('inventory.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('inventory.description')}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        {/* Top Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Type Filter */}
          <div className="space-y-2">
            <Label htmlFor="typeFilter">{t('inventory.filters.type')}</Label>
            <select
              id="typeFilter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'MILL' | 'LEVADA' | 'ALL')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="ALL">{t('inventory.filters.allTypes')}</option>
              <option value="MILL">{t('inventory.type.mill')}</option>
              <option value="LEVADA">{t('inventory.type.levada')}</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="statusFilter">{t('inventory.filters.status')}</Label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'draft' | 'review' | 'published' | 'ALL')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="ALL">{t('inventory.filters.allStatuses')}</option>
              <option value="draft">{t('common.draft')}</option>
              <option value="review">{t('common.review')}</option>
              <option value="published">{t('common.published')}</option>
            </select>
          </div>
        </div>

        {/* Text Search */}
        <div className="space-y-2">
          <Label htmlFor="search">{t('inventory.filters.search')}</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('inventory.filters.searchPlaceholder')}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          {t('common.loading')}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t('common.noItems')}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.title')}</TableHead>
                <TableHead>{t('common.type')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('common.updatedAt')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.title || item.slug}
                  </TableCell>
                  <TableCell>{getTypeText(item.type)}</TableCell>
                  <TableCell>{getStatusText(item.status)}</TableCell>
                  <TableCell>
                    {new Date(item.updatedAt).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                      >
                        <Link href={getPublicUrl(item)}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t('inventory.actions.view')}
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                      >
                        <Link href={getEditUrl(item)}>
                          <Edit className="mr-2 h-4 w-4" />
                          {t('inventory.actions.edit')}
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
