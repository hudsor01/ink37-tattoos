'use client';

import { useState, useEffect } from 'react';
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/dashboard/search-input';
import { Input } from '@/components/ui/input';
import { exportToCsv } from '@/lib/utils/csv-export';
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, SlidersHorizontal, X } from 'lucide-react';

interface FacetFilter {
  columnId: string;
  title: string;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  enableRowSelection?: boolean;
  onRowSelectionChange?: (selectedRows: TData[]) => void;
  globalSearch?: boolean;
  facetFilters?: FacetFilter[];
  enableCsvExport?: boolean;
  csvFilename?: string;
  csvTransform?: (data: TData[]) => Record<string, unknown>[];
  enableShowAll?: boolean;
  enablePageJump?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  pageSize = 10,
  enableRowSelection,
  onRowSelectionChange,
  globalSearch,
  facetFilters,
  enableCsvExport,
  csvFilename = 'export.csv',
  csvTransform,
  enableShowAll,
  enablePageJump,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [pageJumpValue, setPageJumpValue] = useState('');

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    enableRowSelection: enableRowSelection ?? false,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      ...(enableRowSelection ? { rowSelection } : {}),
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  useEffect(() => {
    if (onRowSelectionChange && enableRowSelection) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map(r => r.original);
      onRowSelectionChange(selectedRows);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        {globalSearch ? (
          <SearchInput
            value={globalFilter}
            onChange={setGlobalFilter}
            placeholder={searchPlaceholder}
          />
        ) : searchKey ? (
          <SearchInput
            value={
              (table.getColumn(searchKey)?.getFilterValue() as string) ?? ''
            }
            onChange={(value) =>
              table.getColumn(searchKey)?.setFilterValue(value)
            }
            placeholder={searchPlaceholder}
          />
        ) : null}
        {facetFilters && facetFilters.length > 0 && (
          <div className="flex items-center gap-2">
            {facetFilters.map((filter) => {
              const column = table.getColumn(filter.columnId);
              const facetedValues = column?.getFacetedUniqueValues();
              const selectedValues = new Set(
                (column?.getFilterValue() as string[] | undefined) ?? []
              );
              return (
                <DropdownMenu key={filter.columnId}>
                  <DropdownMenuTrigger
                    render={<Button variant="outline" size="sm" aria-label={`Filter by ${filter.title}`} />}
                  >
                    {filter.title}
                    {selectedValues.size > 0 && (
                      <Badge variant="secondary" className="ml-1 px-1 text-xs">
                        {selectedValues.size}
                      </Badge>
                    )}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {facetedValues &&
                      Array.from(facetedValues.entries())
                        .sort(([, a], [, b]) => b - a)
                        .map(([value, count]) => {
                          const isSelected = selectedValues.has(String(value));
                          return (
                            <DropdownMenuCheckboxItem
                              key={String(value)}
                              checked={isSelected}
                              onCheckedChange={() => {
                                const next = new Set(selectedValues);
                                if (isSelected) next.delete(String(value));
                                else next.add(String(value));
                                column?.setFilterValue(
                                  next.size ? Array.from(next) : undefined
                                );
                              }}
                            >
                              {String(value)} ({count})
                            </DropdownMenuCheckboxItem>
                          );
                        })}
                    {selectedValues.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => column?.setFilterValue(undefined)}
                      >
                        <X className="mr-2 h-3 w-3" />
                        Clear
                      </Button>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {enableCsvExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const filteredRows = table.getFilteredRowModel().rows.map(r => r.original);
                if (csvTransform) {
                  exportToCsv(csvFilename, csvTransform(filteredRows));
                } else {
                  const visibleColumns = table.getVisibleFlatColumns()
                    .filter(col => col.id !== 'select' && col.id !== 'actions');
                  const rows = filteredRows.map(row => {
                    const record: Record<string, unknown> = {};
                    for (const col of visibleColumns) {
                      const key = col.columnDef.header && typeof col.columnDef.header === 'string'
                        ? col.columnDef.header
                        : col.id;
                      const accessorKey = (col.columnDef as { accessorKey?: string }).accessorKey;
                      record[key] = accessorKey
                        ? (row as Record<string, unknown>)[accessorKey]
                        : '';
                    }
                    return record;
                  });
                  exportToCsv(csvFilename, rows);
                }
              }}
              aria-label="Export to CSV"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" aria-label="Toggle column visibility" />}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              View
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table.getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {typeof column.columnDef.header === 'string'
                      ? column.columnDef.header
                      : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => header.column.toggleSorting()}
                        aria-label={`Sort by ${typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header : header.column.id}`}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
                      </Button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {enableRowSelection && (
              <span>{table.getFilteredSelectedRowModel().rows.length} of{' '}</span>
            )}
            {table.getFilteredRowModel().rows.length} row(s) total
          </p>
          {enableShowAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (showAll) {
                  table.setPageSize(pageSize);
                  setShowAll(false);
                } else {
                  table.setPageSize(data.length);
                  setShowAll(true);
                }
              }}
            >
              {showAll
                ? 'Paginate'
                : `Show All${data.length > 500 ? ` (${data.length} rows)` : ''}`}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </span>
          {enablePageJump && table.getPageCount() > 1 && (
            <div className="flex items-center gap-1">
              <label htmlFor="page-jump" className="text-sm text-muted-foreground">
                Go to:
              </label>
              <Input
                id="page-jump"
                type="number"
                min={1}
                max={table.getPageCount()}
                value={pageJumpValue}
                onChange={(e) => setPageJumpValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const page = Number(pageJumpValue);
                    if (page >= 1 && page <= table.getPageCount()) {
                      table.setPageIndex(page - 1);
                      setPageJumpValue('');
                    }
                  }
                }}
                className="w-16 h-8"
              />
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export { type ColumnDef } from '@tanstack/react-table';
