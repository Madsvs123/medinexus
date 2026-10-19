import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Box,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';
import type { Paginated } from '@/types/api';
import EmptyState from './EmptyState';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  totalCount?: number;
  /** Alias for `totalCount` (used by some feature pages). */
  count?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onSortChange?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  rowKey?: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyHint?: string;
  /** Custom empty-state node rendered when there are no rows (replaces the default). */
  emptyState?: ReactNode;
  toolbar?: ReactNode;
  pageSizeOptions?: number[];
}

const defaultRowKey = <T,>(row: T, index: number): string | number =>
  ((row as Record<string, unknown>).id as number | undefined) ?? index;

export default function DataTable<T>({
  columns,
  rows,
  loading = false,
  totalCount,
  count: countProp,
  page = 0,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  sortKey,
  sortDirection = 'asc',
  rowKey = defaultRowKey,
  onRowClick,
  emptyTitle = 'No records found',
  emptyHint = 'Try adjusting your filters or create a new record.',
  emptyState,
  toolbar,
  pageSizeOptions = [10, 20, 50],
}: DataTableProps<T>) {
  const [internalSort, setInternalSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  const activeSortKey = sortKey ?? internalSort?.key ?? null;
  const activeSortDir = sortDirection ?? internalSort?.dir ?? 'asc';

  const handleSort = (key: string) => {
    if (onSortChange) {
      const nextDir = activeSortKey === key && activeSortDir === 'asc' ? 'desc' : 'asc';
      onSortChange(key, nextDir);
      return;
    }
    setInternalSort((prev) => {
      if (prev && prev.key === key) {
        return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { key, dir: 'asc' };
    });
  };

  const sortedRows = (() => {
    if (onSortChange || !internalSort) return rows;
    const { key, dir } = internalSort;
    const col = columns.find((c) => c.key === key);
    if (!col) return rows;
    const factor = dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = (a as Record<string, unknown>)[key];
      const bv = (b as Record<string, unknown>)[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
      return String(av).localeCompare(String(bv)) * factor;
    });
  })();

  const count = totalCount ?? countProp ?? sortedRows.length;

  return (
    <Paper variant="outlined" sx={{ width: '100%', overflow: 'hidden' }}>
      {toolbar && (
        <Box sx={{ p: 2, pb: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
            {toolbar}
          </Stack>
        </Box>
      )}
      <TableContainer sx={{ maxHeight: 'calc(100vh - 320px)' }}>
        <Table size="small" stickyHeader aria-label="Data table">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  align={col.align ?? 'left'}
                  sx={{ width: col.width, fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  {col.sortable ? (
                    <TableSortLabel
                      active={activeSortKey === col.key}
                      direction={activeSortKey === col.key ? activeSortDir : 'asc'}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} sx={{ p: 0 }}>
                  <LinearProgress />
                </TableCell>
              </TableRow>
            ) : sortedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} sx={{ border: 0, py: 6 }}>
                  {emptyState ?? <EmptyState title={emptyTitle} hint={emptyHint} />}
                </TableCell>
              </TableRow>
            ) : (
              sortedRows.map((row, index) => (
                <TableRow
                  key={rowKey(row, index)}
                  hover
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  sx={onRowClick ? { cursor: 'pointer' } : undefined}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} align={col.align ?? 'left'}>
                      {col.render
                        ? col.render(row)
                        : ((row as Record<string, unknown>)[col.key] as ReactNode) ?? '—'}
                      {typeof (row as Record<string, unknown>)[col.key] === 'string' && !col.render && (
                        <Typography variant="body2" component="span" sx={{ display: 'none' }}>
                          {(row as Record<string, unknown>)[col.key] as string}
                        </Typography>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {(onPageChange || onPageSizeChange) && count > 0 && (
        <TablePagination
          component="div"
          count={count}
          page={page}
          onPageChange={(_, next) => onPageChange?.(next)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => {
            onPageSizeChange?.(Number(e.target.value));
            onPageChange?.(0);
          }}
          rowsPerPageOptions={pageSizeOptions}
        />
      )}
    </Paper>
  );
}
