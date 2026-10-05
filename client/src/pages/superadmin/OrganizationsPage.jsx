import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined';
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/table/DataTable';
import TableToolbar from '../../components/table/TableToolbar';
import FilterSelect from '../../components/table/FilterSelect';
import StatusChip from '../../components/common/StatusChip';
import UserAvatar from '../../components/common/UserAvatar';
import FormDialog from '../../components/common/FormDialog';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import { FormSelect, FormTextField } from '../../components/form/FormFields';
import { optionalEmail, requiredString } from '../../components/form/zod';
import usePagedList from '../../hooks/usePagedList';
import { organizationService } from '../../services';
import { useFeedback } from '../../features/feedback/FeedbackProvider';
import { useLookups } from '../../features/lookups/LookupsContext';
import { formatDate } from '../../utils/format';
import { exportCsv } from '../../utils/exportCsv';
import './superadmin.css';

const schema = z.object({ name: requiredString('Organization name', 150), email: optionalEmail, phone: z.string().max(30).optional().nullable(), address: z.string().max(255).optional().nullable(), city: z.string().max(100).optional().nullable(), country: z.string().max(100).optional().nullable(), status: z.string() });
const blank = { name: '', email: '', phone: '', address: '', city: '', country: 'India', status: 'active' };

function OrgDialog({ open, org, onClose, onSaved }) {
  const { notify } = useFeedback();
  const [error, setError] = useState(null);
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: blank });
  useEffect(() => { if (open) { setError(null); reset(org ? { ...blank, ...Object.fromEntries(Object.entries(org).filter(([k, v]) => k in blank && v !== null)) } : blank); } }, [open, org, reset]);
  const submit = handleSubmit(async (v) => {
    try { const saved = org ? await organizationService.update(org.id, { ...v, email: v.email || null }) : await organizationService.create({ ...v, email: v.email || null }); notify(org ? 'Organization updated' : 'Organization created'); onSaved(saved); } catch (e) { setError(e.message); }
  });
  return (
    <FormDialog open={open} onClose={onClose} title={org ? 'Edit organization' : 'New organization'} onSubmit={submit} loading={isSubmitting}>
      {error && <Alert severity="error" className="sa-dialog__alert">{error}</Alert>}
      <div className="sa-form-grid">
        <div><FormTextField control={control} name="name" label="Organization / gym name" required autoFocus placeholder="e.g. Iron Pulse Gym" /></div>
        <div className="sa-col--sm-6"><FormTextField control={control} name="email" label="Email" type="email" /></div>
        <div className="sa-col--sm-6"><FormTextField control={control} name="phone" label="Phone" /></div>
        <div><FormTextField control={control} name="address" label="Address" /></div>
        <div className="sa-col--half"><FormTextField control={control} name="city" label="City" /></div>
        <div className="sa-col--half"><FormTextField control={control} name="country" label="Country" /></div>
        <div className="sa-col--sm-6"><FormSelect control={control} name="status" label="Status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /></div>
      </div>
    </FormDialog>
  );
}

export default function OrganizationsPage() {
  const navigate = useNavigate();
  const { confirm, notify, notifyError } = useFeedback();
  const { reload: reloadLookups } = useLookups();
  const list = usePagedList(useCallback((p) => organizationService.list(p), []), { sortBy: 'name', sortDir: 'asc' });
  const [dialog, setDialog] = useState({ open: false, org: null });
  const act = async (fn, msg) => { try { await fn(); notify(msg); list.reload({ silent: true }); reloadLookups(); } catch (e) { notifyError(e); } };
  const columns = [
    { field: 'name', header: 'Organization', sortKey: 'name', render: (r) => <div className="sa-person"><UserAvatar name={r.name} src={r.logo_url} /><div><div className="sa-person__name">{r.name}</div><span className="sa-person__meta">{r.email || '—'}</span></div></div> },
    { field: 'city', header: 'City', sortKey: 'city', hideBelow: 'sm' },
    { field: 'trainer_count', header: 'Trainers', align: 'right', hideBelow: 'md' },
    { field: 'client_count', header: 'Clients', sortKey: 'clients', align: 'right' },
    { field: 'plan_name', header: 'Plan', hideBelow: 'md', render: (r) => (r.plan_name ? <div className="sa-cell-inline"><span>{r.plan_name}</span><StatusChip status={r.subscription_status} /></div> : '—') },
    { field: 'status', header: 'Status', sortKey: 'status', render: (r) => <StatusChip status={r.status} /> },
    { field: 'created_at', header: 'Created', sortKey: 'created', hideBelow: 'lg', render: (r) => formatDate(r.created_at) },
  ];
  const actions = (r) => [
    { label: 'Edit', icon: EditOutlinedIcon, onClick: () => setDialog({ open: true, org: r }) },
    { label: 'View trainers', icon: BadgeOutlinedIcon, onClick: () => navigate(`/super-admin/trainers?organizationId=${r.id}`) },
    { label: 'View clients', icon: PeopleAltOutlinedIcon, onClick: () => navigate(`/super-admin/clients?organizationId=${r.id}`) },
    { label: r.status === 'active' ? 'Deactivate' : 'Activate', icon: r.status === 'active' ? ToggleOffOutlinedIcon : ToggleOnOutlinedIcon, onClick: () => act(() => organizationService.setStatus(r.id, r.status === 'active' ? 'inactive' : 'active'), 'Status updated'), divider: true },
    { label: 'Delete', icon: DeleteOutlineIcon, color: 'error', onClick: async () => { if (await confirm({ title: `Delete ${r.name}?`, message: 'The organization will be removed. Trainers and clients remain but lose their organization link.', confirmText: 'Delete', danger: true })) act(() => organizationService.remove(r.id), 'Organization deleted'); } },
  ];
  const doExport = async () => { const all = await list.fetchAll(); exportCsv('organizations', [{ header: 'Name', value: (r) => r.name }, { header: 'Email', value: (r) => r.email }, { header: 'Phone', value: (r) => r.phone }, { header: 'City', value: (r) => r.city }, { header: 'Trainers', value: (r) => r.trainer_count }, { header: 'Clients', value: (r) => r.client_count }, { header: 'Plan', value: (r) => r.plan_name }, { header: 'Status', value: (r) => r.status }], all.data); };
  return (
    <>
      <PageHeader title="Organizations / Gyms" subtitle="Every studio and gym using the platform." breadcrumbs={[{ label: 'Dashboard', to: '/super-admin/dashboard' }, { label: 'Organizations' }]}
        actions={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ open: true, org: null })}>New organization</Button>} />
      <ErrorState error={list.error} onRetry={list.reload} />
      <DataTable columns={columns} rows={list.rows} loading={list.loading} total={list.total} page={list.page} pageSize={list.pageSize} onPageChange={list.setPage} onPageSizeChange={list.setPageSize}
        sort={list.sort} onSortChange={list.setSort} rowActions={actions} onRowClick={(r) => setDialog({ open: true, org: r })}
        empty={<EmptyState icon={BusinessOutlinedIcon} title="No organizations" description="Create an organization, then add trainers to it." />}
        toolbar={<TableToolbar search={list.search} onSearch={list.setSearch} placeholder="Search organizations" onExport={doExport}
          filters={<FilterSelect label="Status" value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />} />} />
      <OrgDialog open={dialog.open} org={dialog.org} onClose={() => setDialog({ open: false, org: null })} onSaved={() => { setDialog({ open: false, org: null }); list.reload({ silent: true }); reloadLookups(); }} />
    </>
  );
}
