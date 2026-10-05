import { useCallback, useState } from 'react';
import { TextField } from '@mui/material';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/table/DataTable';
import TableToolbar from '../../components/table/TableToolbar';
import FilterSelect from '../../components/table/FilterSelect';
import StatusChip from '../../components/common/StatusChip';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import usePagedList from '../../hooks/usePagedList';
import { auditService } from '../../services';
import { formatDateTime } from '../../utils/format';
import { exportCsv } from '../../utils/exportCsv';
import './superadmin.css';

const ACTION_COLOR = { create: 'success', delete: 'error', bulk_delete: 'error', update: 'primary', login: 'info', logout: 'default', deactivate: 'warning', activate: 'success' };

export default function AuditLogsPage() {
  const list = usePagedList(useCallback((p) => auditService.list(p), []), { pageSize: 25, sortBy: 'created' });
  const [range, setRange] = useState({ from: '', to: '' });
  const facets = list.extra?.facets || { actions: [], entities: [] };
  const columns = [
    { field: 'created_at', header: 'When', sortKey: 'created', render: (r) => <span className="nowrap">{formatDateTime(r.created_at)}</span> },
    { field: 'user_name', header: 'User', sortKey: 'user', render: (r) => <div><div className="sa-person__name">{r.user_name || 'System'}</div><span className="sa-person__meta">{r.user_role || ''}</span></div> },
    { field: 'action', header: 'Action', sortKey: 'action', render: (r) => <StatusChip status="x" label={r.action.replace(/_/g, ' ')} color={ACTION_COLOR[r.action] || 'secondary'} /> },
    { field: 'entity_type', header: 'Entity', sortKey: 'entity', hideBelow: 'md', render: (r) => (r.entity_type ? `${r.entity_type.replace(/_/g, ' ')}${r.entity_id ? ` #${r.entity_id}` : ''}` : '—') },
    { field: 'description', header: 'Description', render: (r) => <p className="sa-audit__desc">{r.description}</p> },
    { field: 'ip_address', header: 'IP', hideBelow: 'lg', render: (r) => <span className="sa-audit__ip">{r.ip_address || '—'}</span> },
  ];
  const doExport = async () => { const all = await list.fetchAll(); exportCsv('audit-logs', [{ header: 'When', value: (r) => r.created_at }, { header: 'User', value: (r) => r.user_email }, { header: 'Action', value: (r) => r.action }, { header: 'Entity', value: (r) => r.entity_type }, { header: 'Entity ID', value: (r) => r.entity_id }, { header: 'Description', value: (r) => r.description }, { header: 'IP', value: (r) => r.ip_address }], all.data); };
  return (
    <>
      <PageHeader title="Audit logs" subtitle="Security and change history across the platform." breadcrumbs={[{ label: 'Dashboard', to: '/super-admin/dashboard' }, { label: 'Audit Logs' }]} />
      <ErrorState error={list.error} onRetry={list.reload} />
      <DataTable dense columns={columns} rows={list.rows} loading={list.loading} total={list.total} page={list.page} pageSize={list.pageSize} onPageChange={list.setPage} onPageSizeChange={list.setPageSize}
        sort={list.sort} onSortChange={list.setSort} empty={<EmptyState icon={HistoryOutlinedIcon} title="No audit entries" />}
        toolbar={<TableToolbar search={list.search} onSearch={list.setSearch} placeholder="Search description, user or IP" onExport={doExport}
          filters={(
            <>
              <FilterSelect label="Action" value={list.filters.action} onChange={(v) => list.setFilter('action', v)} options={facets.actions.map((a) => ({ value: a, label: a.replace(/_/g, ' ') }))} />
              <FilterSelect label="Entity" value={list.filters.entity} onChange={(v) => list.setFilter('entity', v)} options={facets.entities.map((a) => ({ value: a, label: a.replace(/_/g, ' ') }))} />
              <div className="sa-audit__range">
                <TextField type="date" label="From" value={range.from} onChange={(e) => { setRange((r) => ({ ...r, from: e.target.value })); list.setFilter('from', e.target.value); }} InputLabelProps={{ shrink: true }} className="sa-audit__date" />
                <TextField type="date" label="To" value={range.to} onChange={(e) => { setRange((r) => ({ ...r, to: e.target.value })); list.setFilter('to', e.target.value); }} InputLabelProps={{ shrink: true }} className="sa-audit__date" />
              </div>
            </>
          )} />} />
    </>
  );
}
