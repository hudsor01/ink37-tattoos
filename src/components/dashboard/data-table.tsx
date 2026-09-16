'use client';

import { useState, useEffect } from 'react';
import {
  type ColumnDef as TanstackColumnDef,
  type RowData,
  type TableState,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
  flexRender,
  filterFns,
  tableFeatures,
  stockFeatures,
  createCoreRowModel,
  createSortedRowModel,
  createFilteredRowModel,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createPaginatedRowModel,
  useTable,
} from '@tanstack/react-table';

/**
 * TanStack Table v9 requires features to be declared explicitly -- v8 shipped
 * them all automatically. `stockFeatures` is the compatibility bundle: every
 * feature enabled, matching v8 semantics at the cost of a larger bundle than
 * a hand-picked set.
 *
 * Declared at module scope, not inside the component: `tableFeatures()`
 * returns a new object each call, and a fresh `features` identity on every
 * render would rebuild the table instance and drop its state.
 *
 * `typeof tableFeats` is what the generics below thread through -- in v9
 * `ColumnDef` and friends take TFeatures as their FIRST type parameter.
 */
const tableFeats = tableFeatures({
  ...stockFeatures,
  // Row models are slots on the features object in v9, not table options.
  // Note the pagination factory is `createPaginatedRowModel` -- the
  // symmetrical `createPaginationRowModel` does not exist (verified against
  // the package's exports).
  coreRowModel: createCoreRowModel(),
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  paginatedRowModel: createPaginatedRowModel(),
});

/**
 * v9 replaced `VisibilityState` with a feature-scoped type. Column visibility
 * is a plain id -> boolean map in both versions, so declaring it locally keeps
 * this file independent of that rename.
 */
type ColumnVisibilityState = Record<string, boolean>;
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

interface DataTableProps<TData extends RowData, TValue> {
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

export function DataTable<TData extends RowData, TValue>({
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
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [pageJumpValue, setPageJumpValue] = useState('');

  const table = useTable<typeof tableFeats, TData, TableState<typeof tableFeats>>({
    features: tableFeats,
    data,
    // Widened at the boundary: v9's table instance types column values as
    // `unknown` because a column set is heterogeneous by nature. DataTable's
    // TValue exists only so callers can keep the v8-style two-arg ColumnDef.
    columns: columns as ColumnDef<TData, unknown>[],
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: filterFns.includesString,
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
        // v9 requires the full PaginationState; v8 allowed a partial.
        pageIndex: 0,
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
            Page {table.state.pagination.pageIndex + 1} of{' '}
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

/**
 * Re-exported with TFeatures PRE-BOUND, so consumers keep the v8-style
 * two-argument call: `ColumnDef<PaymentRow, unknown>`.
 *
 * v9 made TFeatures the first generic (`ColumnDef<TFeatures, TData, TValue>`).
 * Binding it here means the 10 files that define columns did not have to
 * change at all -- without this, every one of the 22 ColumnDef sites would
 * need to import `tableFeats` and spell out three type arguments, for no
 * benefit: they all use the same feature set anyway.
 */
export type ColumnDef<TData extends RowData, TValue = unknown> = TanstackColumnDef<
  typeof tableFeats,
  TData,
  TValue
>;
