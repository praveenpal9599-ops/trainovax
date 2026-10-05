import {
  Checkbox, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Paper, Skeleton, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow, TableSortLabel, Tooltip,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useState } from 'react';
import EmptyState from '../common/EmptyState';
import './DataTable.css';

/**
 * Reusable server-driven data table.
 *
 * columns: [{ field, header, sortKey?, render?(row), align?, width?, hideBelow?: 'sm'|'md'|'lg' }]
 * rowActions(row) -> [{ label, icon, onClick, color?, hidden?, divider? }]
 */
export default function DataTable({
  columns, rows, loading, total = 0, page = 0, pageSize = 10, onPageChange, onPageSizeChange, sort, onSortChange,
  selectable, selected = [], onSelectionChange, rowActions, onRowClick, empty, toolbar, getRowId = (r) => r.id, dense, pagination = true,
}) {
  const [menu, setMenu] = useState(null);
  const allOnPage = rows.map(getRowId);
  const allSelected = allOnPage.length > 0 && allOnPage.every((id) => selected.includes(id));
  const someSelected = allOnPage.some((id) => selected.includes(id)) && !allSelected;
  const toggleAll = () => onSelectionChange?.(allSelected ? selected.filter((id) => !allOnPage.includes(id)) : [...new Set([...selected, ...allOnPage])]);
  const toggle = (id) => onSelectionChange?.(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const cellClass = (c) => (c.hideBelow ? `data-table__cell--hide-below-${c.hideBelow}` : undefined);
  const colCount = columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);
  const menuActions = menu ? rowActions(menu.row).filter((a) => !a.hidden) : [];

  return (
    <Paper variant="outlined" className="data-table">
      {toolbar}
      <TableContainer>
        <Table size={dense ? 'small' : 'medium'} className="data-table__table">
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox size="small" indeterminate={someSelected} checked={allSelected} onChange={toggleAll} inputProps={{ 'aria-label': 'Select all rows' }} />
                </TableCell>
              )}
              {columns.map((c) => (
                <TableCell key={c.field} align={c.align} className={cellClass(c)} style={c.width ? { width: c.width } : undefined} sortDirection={sort?.sortBy === c.sortKey ? sort.sortDir : false}>
                  {c.sortKey && onSortChange ? (
                    <TableSortLabel active={sort?.sortBy === c.sortKey} direction={sort?.sortBy === c.sortKey ? sort.sortDir : 'asc'}
                      onClick={() => onSortChange({ sortBy: c.sortKey, sortDir: sort?.sortBy === c.sortKey && sort.sortDir === 'asc' ? 'desc' : 'asc' })}>
                      {c.header}
                    </TableSortLabel>
                  ) : c.header}
                </TableCell>
              ))}
              {rowActions && <TableCell align="right" className="data-table__actions-col"><span className="sr-only">Actions</span></TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
              <TableRow key={`sk-${i}`}>
                {Array.from({ length: colCount }).map((__, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}
              </TableRow>
            ))}
            {!loading && rows.length === 0 && (
              <TableRow><TableCell colSpan={colCount} className="data-table__empty">{empty || <EmptyState title="No records found" description="Try adjusting your search or filters." />}</TableCell></TableRow>
            )}
            {!loading && rows.map((row) => {
              const id = getRowId(row);
              const isSel = selected.includes(id);
              return (
                <TableRow key={id} hover selected={isSel} onClick={onRowClick ? () => onRowClick(row) : undefined} className={`data-table__row ${onRowClick ? 'data-table__row--clickable' : ''}`}>
                  {selectable && (
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox size="small" checked={isSel} onChange={() => toggle(id)} inputProps={{ 'aria-label': 'Select row' }} />
                    </TableCell>
                  )}
                  {columns.map((c) => <TableCell key={c.field} align={c.align} className={cellClass(c)}>{c.render ? c.render(row) : (row[c.field] ?? '—')}</TableCell>)}
                  {rowActions && (
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Actions"><IconButton size="small" aria-label="Row actions" onClick={(e) => setMenu({ anchor: e.currentTarget, row })}><MoreVertIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {pagination && (
        <TablePagination component="div" count={total} page={Math.min(page, Math.max(0, Math.ceil(total / pageSize) - 1))} rowsPerPage={pageSize}
          onPageChange={(_, p) => onPageChange?.(p)} onRowsPerPageChange={(e) => onPageSizeChange?.(parseInt(e.target.value, 10))}
          rowsPerPageOptions={[10, 25, 50]} className="data-table__pagination" />
      )}
      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { className: 'data-table__menu' } }}>
        {menuActions.map((a) => (
          <MenuItem key={a.label} divider={a.divider} onClick={() => { setMenu(null); a.onClick(menu.row); }} className={a.color ? `menu-item--${a.color}` : undefined}>
            {a.icon && <ListItemIcon><a.icon fontSize="small" /></ListItemIcon>}
            <ListItemText>{a.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </Paper>
  );
}
