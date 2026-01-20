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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Eye, Edit, Search } from 'lucide-react';
import Link from 'next/link';
import { DeleteButton } from '@/components/features/DeleteButton';
import { getCurrentUserInfo } from '@/actions/admin';

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
  const [activeTab, setActiveTab] = useState<'all' | 'myProjects'>('all');
  const [userInfo, setUserInfo] = useState<{ userId: string; role: 'admin' | 'researcher' | 'public' } | null>(null);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<'MILL' | 'LEVADA' | 'POCA' | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'draft' | 'review' | 'published' | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Fetch user info for permission checks
  useEffect(() => {
    const fetchUserInfo = async () => {
      const result = await getCurrentUserInfo();
      if (result.success) {
        setUserInfo(result.data);
      }
    };
    fetchUserInfo();
  }, []);

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
      // Phase 5.9.7.1: "My Projects" tab shows only drafts where created_by matches session ID
      const filters = activeTab === 'myProjects' 
        ? {
            type: typeFilter,
            status: 'draft' as const, // Force draft status for "My Projects"
            myProjects: true, // Flag to filter by current user
          }
        : {
            type: typeFilter,
            status: statusFilter,
          };

      const result = await getInventoryItems(
        locale,
        filters,
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
  }, [locale, typeFilter, statusFilter, debouncedSearchQuery, activeTab]);

  // Fetch items when filters or search change
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Get public URL for viewing
  const getPublicUrl = (item: InventoryItem): string => {
    if (item.type === 'MILL') {
      return `/${locale}/mill/${item.slug}`;
    } else if (item.type === 'POCA') {
      return `/${locale}/poca/${item.slug}`; // TODO: Create public poca page if needed
    } else {
      return `/${locale}/levada/${item.slug}`;
    }
  };

  // Get edit URL
  const getEditUrl = (item: InventoryItem): string => {
    return `/${locale}/dashboard/edit/${item.id}`;
  };

  // Get status badge variant
  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (status === 'published') return 'default';
    if (status === 'review') return 'secondary';
    if (status === 'draft') return 'outline';
    return 'outline';
  };

  // Get status display text
  const getStatusText = (status: string): string => {
    return t(`common.${status}`);
  };

  // Get type display text
  const getTypeText = (type: string): string => {
    if (type === 'MILL') {
      return t('inventory.type.mill');
    } else if (type === 'POCA') {
      return t('inventory.type.poca');
    } else {
      return t('inventory.type.levada');
    }
  };

  // Phase 5.9.7.2: Check if user can delete an item
  const canDeleteItem = (item: InventoryItem): boolean => {
    if (!userInfo) return false;
    
    // Admins can delete any item
    if (userInfo.role === 'admin') {
      return true;
    }
    
    // Researchers can delete only if status === 'draft' AND they are the author
    if (userInfo.role === 'researcher') {
      return item.status === 'draft' && item.createdBy === userInfo.userId;
    }
    
    return false;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('inventory.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('inventory.description')}
        </p>
      </div>

      {/* Tabs: All Items / My Projects */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'myProjects')} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">{t('inventory.tabs.all')}</TabsTrigger>
          <TabsTrigger value="myProjects">{t('inventory.tabs.myProjects')}</TabsTrigger>
        </TabsList>
      </Tabs>

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
              onChange={(e) => setTypeFilter(e.target.value as 'MILL' | 'LEVADA' | 'POCA' | 'ALL')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="ALL">{t('inventory.filters.allTypes')}</option>
              <option value="MILL">{t('inventory.type.mill')}</option>
              <option value="LEVADA">{t('inventory.type.levada')}</option>
              <option value="POCA">{t('inventory.type.poca')}</option>
            </select>
          </div>

          {/* Status Filter - Hidden in "My Projects" tab */}
          {activeTab === 'all' && (
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
          )}
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
                  <TableCell>
                    <Badge variant={getStatusVariant(item.status)}>
                      {getStatusText(item.status)}
                    </Badge>
                  </TableCell>
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
                      <DeleteButton
                        constructionId={item.id}
                        canDelete={canDeleteItem(item)}
                      />
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
