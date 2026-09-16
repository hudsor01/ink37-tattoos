// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const exportToCsvSpy = vi.fn();
vi.mock('@/lib/utils/csv-export', () => ({
  exportToCsv: (...args: unknown[]) => exportToCsvSpy(...args),
}));

const { DataTable } = await import('@/components/dashboard/data-table');
// v9 constrains TData to RowData; the local alias has to carry it through.
type ColumnDef<
  TData extends import('@tanstack/react-table').RowData,
  TValue = unknown,
> = import('@/components/dashboard/data-table').ColumnDef<TData, TValue>;

/**
 * Behavioral baseline for the shared DataTable.
 *
 * Written against the KNOWN-GOOD TanStack Table v8 behavior so it can serve as
 * the safety net for the v9 migration (#105). v9 is not a version bump -- it
 * renames every row-model factory (`getCoreRowModel` -> `createCoreRowModel`),
 * removes exported types like `VisibilityState`, and threads a new `TFeatures`
 * generic through the whole API. TanStack ships a `stockFeatures` bundle that
 * preserves v8 semantics through the move, so the contract asserted here
 * should hold identically before and after.
 *
 * These assertions deliberately describe USER-VISIBLE behavior (rows on
 * screen, order after a sort click, what survives a search) rather than table
 * internals -- internals are exactly what v9 rewrites.
 *
 * DataTable and its 8 consumer screens previously had zero coverage, which is
 * why the migration was deferred.
 */

interface Row {
  name: string;
  email: string;
  amount: number;
}

const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'amount', header: 'Amount' },
];

const data: Row[] = [
  { name: 'Charlie', email: 'charlie@example.com', amount: 30 },
  { name: 'Alice', email: 'alice@example.com', amount: 10 },
  { name: 'Bob', email: 'bob@example.com', amount: 20 },
];

/** Body rows only -- excludes the header row. */
function bodyRows() {
  const all = screen.getAllByRole('row');
  return all.slice(1);
}

function firstColumnValues() {
  return bodyRows().map((r) => within(r).getAllByRole('cell')[0]?.textContent?.trim());
}

describe('DataTable', () => {
  it('renders a row per record plus a header row', () => {
    render(<DataTable columns={columns} data={data} />);
    expect(bodyRows()).toHaveLength(3);
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('bob@example.com')).toBeDefined();
  });

  it('renders column headers from the column defs', () => {
    render(<DataTable columns={columns} data={data} />);
    for (const h of ['Name', 'Email', 'Amount']) {
      expect(screen.getAllByText(h).length).toBeGreaterThan(0);
    }
  });

  /**
   * Sorting is a row-model feature -- `getSortedRowModel` becomes
   * `createSortedRowModel` and moves into `tableFeatures()` in v9, so this is
   * one of the most likely things to silently break.
   */
  it('sorts rows when a sortable header is activated', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={data} />);

    // Unsorted: insertion order.
    expect(firstColumnValues()).toEqual(['Charlie', 'Alice', 'Bob']);

    await user.click(screen.getByRole('button', { name: /sort by name/i }));
    await waitFor(() => {
      expect(firstColumnValues()).toEqual(['Alice', 'Bob', 'Charlie']);
    });
  });

  it('reverses order on a second sort activation', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={data} />);
    const sortBtn = screen.getByRole('button', { name: /sort by name/i });

    await user.click(sortBtn);
    await waitFor(() => expect(firstColumnValues()).toEqual(['Alice', 'Bob', 'Charlie']));
    await user.click(sortBtn);
    await waitFor(() => expect(firstColumnValues()).toEqual(['Charlie', 'Bob', 'Alice']));
  });

  /**
   * Global filtering uses `globalFilterFn: 'includesString'` plus
   * `getFilteredRowModel`. Both move in v9.
   */
  it('filters rows by the global search box', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={data} globalSearch searchPlaceholder="Search..." />);

    await user.type(screen.getByPlaceholderText('Search...'), 'alice');
    await waitFor(() => {
      expect(bodyRows()).toHaveLength(1);
      expect(screen.getByText('Alice')).toBeDefined();
    });
  });

  it('shows an empty state when a filter matches nothing', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={data} globalSearch searchPlaceholder="Search..." />);

    await user.type(screen.getByPlaceholderText('Search...'), 'zzzznomatch');
    await waitFor(() => expect(bodyRows()).toHaveLength(1)); // the "no results" row
    expect(screen.queryByText('Alice')).toBeNull();
  });

  /**
   * Pagination comes from `getPaginationRowModel` and the `initialState`
   * pagination slot -- both relocate in v9.
   */
  it('paginates and advances with the Next control', async () => {
    const user = userEvent.setup();
    const many: Row[] = Array.from({ length: 12 }, (_, i) => ({
      name: `Person${String(i).padStart(2, '0')}`,
      email: `p${i}@example.com`,
      amount: i,
    }));
    render(<DataTable columns={columns} data={many} pageSize={5} />);

    expect(bodyRows()).toHaveLength(5);
    expect(screen.getByText('Person00')).toBeDefined();

    await user.click(screen.getByRole('button', { name: /next page/i }));
    await waitFor(() => {
      expect(screen.getByText('Person05')).toBeDefined();
      expect(screen.queryByText('Person00')).toBeNull();
    });
  });

  it('disables Previous on the first page', () => {
    const many: Row[] = Array.from({ length: 12 }, (_, i) => ({
      name: `P${i}`, email: `p${i}@e.com`, amount: i,
    }));
    render(<DataTable columns={columns} data={many} pageSize={5} />);
    expect(screen.getByRole('button', { name: /previous page/i })).toHaveProperty('disabled', true);
  });

  it('renders without a pagination overflow when data fits one page', () => {
    render(<DataTable columns={columns} data={data} pageSize={10} />);
    expect(bodyRows()).toHaveLength(3);
    expect(screen.getByRole('button', { name: /next page/i })).toHaveProperty('disabled', true);
  });

  /**
   * Row selection and CSV export were the two paths this file did not cover
   * when the v9 migration landed. Both lean on exactly what v9 relocated:
   * selection on `rowSelectionFeature` + `getFilteredSelectedRowModel()`, CSV
   * on `getFilteredRowModel()` + `getVisibleFlatColumns()`.
   */
  describe('row selection', () => {
    const selectableColumns: ColumnDef<Row>[] = [
      {
        id: 'select',
        header: 'Select',
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Select ${row.original.name}`}
            checked={row.getIsSelected()}
            onChange={(e) => row.toggleSelected(e.target.checked)}
          />
        ),
      },
      ...columns,
    ];

    it('reports the selected row through onRowSelectionChange', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(
        <DataTable
          columns={selectableColumns}
          data={data}
          enableRowSelection
          onRowSelectionChange={onSelect}
        />
      );

      await user.click(screen.getByRole('checkbox', { name: 'Select Alice' }));

      await waitFor(() => {
        const last = onSelect.mock.calls.at(-1)?.[0] as Row[] | undefined;
        expect(last?.map((r) => r.name)).toEqual(['Alice']);
      });
    });

    it('accumulates and then clears selections', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(
        <DataTable
          columns={selectableColumns}
          data={data}
          enableRowSelection
          onRowSelectionChange={onSelect}
        />
      );

      await user.click(screen.getByRole('checkbox', { name: 'Select Alice' }));
      await user.click(screen.getByRole('checkbox', { name: 'Select Bob' }));
      await waitFor(() => {
        const names = (onSelect.mock.calls.at(-1)?.[0] as Row[]).map((r) => r.name);
        expect(names.sort()).toEqual(['Alice', 'Bob']);
      });

      await user.click(screen.getByRole('checkbox', { name: 'Select Alice' }));
      await waitFor(() => {
        const names = (onSelect.mock.calls.at(-1)?.[0] as Row[]).map((r) => r.name);
        expect(names).toEqual(['Bob']);
      });
    });
  });

  describe('CSV export', () => {
    beforeEach(() => exportToCsvSpy.mockClear());

    it('exports every row when nothing is filtered', async () => {
      const user = userEvent.setup();
      render(
        <DataTable columns={columns} data={data} enableCsvExport csvFilename="rows.csv" />
      );

      await user.click(screen.getByRole('button', { name: /export to csv/i }));

      expect(exportToCsvSpy).toHaveBeenCalledTimes(1);
      const [filename, rows] = exportToCsvSpy.mock.calls[0] as [string, Record<string, unknown>[]];
      expect(filename).toBe('rows.csv');
      expect(rows).toHaveLength(3);
    });

    /**
     * The export reads getFilteredRowModel(), so it must follow the active
     * search rather than dumping the raw data array.
     */
    it('exports only the filtered rows', async () => {
      const user = userEvent.setup();
      render(
        <DataTable
          columns={columns}
          data={data}
          globalSearch
          searchPlaceholder="Search..."
          enableCsvExport
        />
      );

      await user.type(screen.getByPlaceholderText('Search...'), 'alice');
      await waitFor(() => expect(bodyRows()).toHaveLength(1));

      await user.click(screen.getByRole('button', { name: /export to csv/i }));

      const rows = exportToCsvSpy.mock.calls.at(-1)?.[1] as Record<string, unknown>[];
      expect(rows).toHaveLength(1);
      expect(JSON.stringify(rows)).toContain('Alice');
    });

    it('routes through csvTransform when one is supplied', async () => {
      const user = userEvent.setup();
      const csvTransform = vi.fn((rows: Row[]) => rows.map((r) => ({ who: r.name })));
      render(
        <DataTable columns={columns} data={data} enableCsvExport csvTransform={csvTransform} />
      );

      await user.click(screen.getByRole('button', { name: /export to csv/i }));

      expect(csvTransform).toHaveBeenCalledTimes(1);
      const rows = exportToCsvSpy.mock.calls[0][1] as Record<string, unknown>[];
      expect(rows[0]).toHaveProperty('who');
    });
  });
});
