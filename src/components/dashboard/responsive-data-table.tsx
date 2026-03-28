'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/dashboard/data-table';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { SearchInput } from '@/components/dashboard/search-input';
import { Separator } from '@/components/ui/separator';

export interface MobileField<TData> {
  label: string;
  accessor: (row: TData) => ReactNode;
}

interface FacetFilter {
  columnId: string;
  title: string;
}

interface ResponsiveDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  enableRowSelection?: boolean;
  onRowSelectionChange?: (selectedRows: TData[]) => void;
  globalSearch?: boolean;
  facetFilters?: FacetFilter[];
  mobileFields: MobileField<TData>[];
  mobileActions?: (row: TData) => ReactNode;
}

export function ResponsiveDataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  pageSize,
  enableRowSelection,
  onRowSelectionChange,
  globalSearch,
  facetFilters,
  mobileFields,
  mobileActions,
}: ResponsiveDataTableProps<TData, TValue>) {
  const isMobile = useIsMobile();
  const [searchValue, setSearchValue] = useState('');

  const filteredData = useMemo(() => {
    if (!searchValue) return data;

    const query = searchValue.toLowerCase();

    if (globalSearch) {
      return data.filter((row) => {
        const rowRecord = row as Record<string, unknown>;
        return Object.values(rowRecord).some((value) =>
          String(value ?? '').toLowerCase().includes(query)
        );
      });
    }

    if (searchKey) {
      return data.filter((row) => {
        const rowRecord = row as Record<string, unknown>;
        const value = rowRecord[searchKey];
        return String(value ?? '').toLowerCase().includes(query);
      });
    }

    return data;
  }, [data, searchValue, searchKey, globalSearch]);

  if (!isMobile) {
    return (
      <DataTable
        columns={columns}
        data={data}
        searchKey={searchKey}
        searchPlaceholder={searchPlaceholder}
        pageSize={pageSize}
        enableRowSelection={enableRowSelection}
        onRowSelectionChange={onRowSelectionChange}
        globalSearch={globalSearch}
        facetFilters={facetFilters}
      />
    );
  }

  return (
    <div className="space-y-4">
      {(globalSearch || searchKey) && (
        <SearchInput
          value={searchValue}
          onChange={setSearchValue}
          placeholder={searchPlaceholder}
        />
      )}

      <div className="space-y-3" role="list" aria-label="Data list">
        {filteredData.length > 0 ? (
          filteredData.map((row, index) => (
            <Card key={index} size="sm" role="listitem">
              <CardContent className="space-y-0 py-0">
                {mobileFields.map((field) => (
                  <div
                    key={field.label}
                    className="flex justify-between py-1.5 text-sm"
                  >
                    <span className="text-muted-foreground">{field.label}</span>
                    <span className="text-right">{field.accessor(row)}</span>
                  </div>
                ))}
                {mobileActions && (
                  <>
                    <Separator className="my-1" />
                    <div className="flex justify-end py-1.5">
                      {mobileActions(row)}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No results found.
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {filteredData.length} item{filteredData.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
