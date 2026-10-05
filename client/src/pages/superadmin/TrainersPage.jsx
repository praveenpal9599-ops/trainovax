import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button } from '@mui/material';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined';
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/table/DataTable';
import TableToolbar from '../../components/table/TableToolbar';
import FilterSelect from '../../components/table/FilterSelect';
import StatusChip from '../../components/common/StatusChip';
import UserAvatar from '../../components/common/UserAvatar';
import FormDialog from '../../components/common/FormDialog';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import { FormAutocomplete, FormSelect, FormTextField } from '../../components/form/FormFields';
import { optionalNumber, requiredString } from '../../components/form/zod';
import usePagedList from '../../hooks/usePagedList';
import { userService } from '../../services';
import { useFeedback } from '../../features/feedback/FeedbackProvider';
import { useLookups } from '../../features/lookups/LookupsContext';
import { useAuth } from '../../features/auth/AuthContext';
import { timeAgo } from '../../utils/format';
import { exportCsv } from '../../utils/exportCsv';
import './superadmin.css';

const ROLE_OPTIONS = [{ value: 'trainer', label: 'Trainer (mobile app)' }, { value: 'admin', label: 'Admin (gym / studio)' }, { value: 'super_admin', label: 'Super Admin' }];
const blank = { role: 'trainer', name: '', email: '', phone: '', organization_id: null, password: '', status: 'active', specialization: '', experience_years: null, certifications: '', bio: '' };

function UserDialog({ open, user, onClose, onSaved }) {
  const { organizations } = useLookups();
  const { user: me } = useAuth();
  const orgAdmin = me.role === 'admin';
  const { notify } = useFeedback();
  const [error, setError] = useState(null);
  const editing = !!user;
  const schema = z.object({
    role: z.string(), name: requiredString('Full name', 120), email: z.string().trim().email('Enter a valid email'), phone: z.string().max(30).optional().nullable(),
    organization_id: z.number().nullable().optional(), status: z.string(), specialization: z.string().max(150).optional().nullable(), experience_years: optionalNumber(0, 80, 'Experience'),
    certifications: z.string().max(255).optional().nullable(), bio: z.string().max(2000).optional().nullable(),
    password: editing ? z.string().optional().refine((v) => !v || (v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v)), 'Min 8 characters incl. a letter and a number')
      : z.string().min(8, 'At least 8 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number'),
  }).refine((d) => orgAdmin || d.role === 'super_admin' || d.organization_id, { message: 'Select an organization', path: ['organization_id'] });
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: blank });
  const role = useWatch({ control, name: 'role' });
  useEffect(() => { if (open) { setError(null); reset(user ? { ...blank, ...Object.fromEntries(Object.entries(user).filter(([k, v]) => k in blank && v !== null)), password: '' } : blank); } }, [open, user, reset]);
  const submit = handleSubmit(async (v) => {
    try { const saved = editing ? await userService.update(user.id, v) : await userService.create(v); notify(editing ? 'User updated' : 'Account created'); onSaved(saved); } catch (e) { setError(e.message); }
  });
  return (
    <FormDialog open={open} onClose={onClose} title={editing ? `Edit ${user.name}` : orgAdmin ? 'Add trainer' : 'Add admin / trainer'} maxWidth="md" onSubmit={submit} loading={isSubmitting}>
      {error && <Alert severity="error" className="sa-dialog__alert">{error}</Alert>}
      <div className="sa-form-grid">
        {!orgAdmin && <div className="sa-col--sm-4"><FormSelect control={control} name="role" label="Role" required disabled={editing} options={ROLE_OPTIONS} /></div>}
        {!orgAdmin && <div className="sa-col--sm-8">{role !== 'super_admin' && <FormAutocomplete control={control} name="organization_id" label="Organization" required options={organizations.map((o) => ({ value: o.id, label: o.name }))} />}</div>}
        <div className="sa-col--sm-6"><FormTextField control={control} name="name" label="Full name" required autoFocus /></div>
        <div className="sa-col--sm-6"><FormTextField control={control} name="email" label="Email" type="email" required /></div>
        <div className="sa-col--sm-6"><FormTextField control={control} name="phone" label="Phone" /></div>
        <div className="sa-col--sm-6"><FormTextField control={control} name="password" label={editing ? 'New password (optional)' : 'Password'} type="password" required={!editing} helperText="Min 8 characters incl. a letter and a number" autoComplete="new-password" /></div>
        {role !== 'super_admin' && (
          <>
            <div className="sa-col--sm-8"><FormTextField control={control} name="specialization" label="Specialization" placeholder="e.g. Fat loss, strength & conditioning" /></div>
            <div className="sa-col--sm-4"><FormTextField control={control} name="experience_years" label="Experience" type="number" unit="years" /></div>
            <div><FormTextField control={control} name="certifications" label="Certifications" placeholder="e.g. ACE-CPT, NASM" /></div>
            <div><FormTextField control={control} name="bio" label="Bio" multiline minRows={2} helperText="Shown to clients on their dashboard" /></div>
          </>
        )}
        <div className="sa-col--sm-4"><FormSelect control={control} name="status" label="Status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /></div>
      </div>
    </FormDialog>
  );
}

export default function TrainersPage() {
  const [params] = useSearchParams();
  const { user: me } = useAuth();
  const { organizations, reload: reloadLookups } = useLookups();
  const { confirm, notify, notifyError } = useFeedback();
  const list = usePagedList(useCallback((p) => userService.list(p), []), { sortBy: 'name', sortDir: 'asc', filters: { organizationId: params.get('organizationId') || '' } });
  const [dialog, setDialog] = useState({ open: false, user: null });
  const act = async (fn, msg) => { try { await fn(); notify(msg); list.reload({ silent: true }); reloadLookups(); } catch (e) { notifyError(e); } };
  const columns = [
    { field: 'name', header: 'Name', sortKey: 'name', render: (r) => <div className="sa-person"><UserAvatar name={r.name} src={r.avatar_url} /><div><div className="sa-person__name">{r.name}</div><span className="sa-person__meta">{r.email}</span></div></div> },
    { field: 'role_label', header: 'Role', render: (r) => <StatusChip status="role" label={r.role_label} color={r.role === 'super_admin' ? 'secondary' : r.role === 'admin' ? 'info' : 'primary'} /> },
    { field: 'invite_code', header: 'Client code', hideBelow: 'md', render: (r) => (r.invite_code ? <span className="sa-invite-code">{r.invite_code}</span> : '—') },
    { field: 'organization_name', header: 'Organization', sortKey: 'organization', hideBelow: 'sm', render: (r) => r.organization_name || '—' },
    { field: 'specialization', header: 'Specialization', hideBelow: 'lg', render: (r) => <div className="sa-specialization truncate">{r.specialization || '—'}</div> },
    { field: 'client_count', header: 'Clients', sortKey: 'clients', align: 'right', hideBelow: 'md' },
    { field: 'status', header: 'Status', sortKey: 'status', render: (r) => <StatusChip status={r.status} /> },
    { field: 'last_login_at', header: 'Last login', sortKey: 'lastLogin', hideBelow: 'lg', render: (r) => (r.last_login_at ? timeAgo(r.last_login_at) : 'Never') },
  ];
  const actions = (r) => [
    { label: 'Edit', icon: EditOutlinedIcon, onClick: () => setDialog({ open: true, user: r }) },
    { label: r.status === 'active' ? 'Deactivate account' : 'Activate account', icon: r.status === 'active' ? ToggleOffOutlinedIcon : ToggleOnOutlinedIcon, hidden: r.id === me.id, onClick: () => act(() => userService.setStatus(r.id, r.status === 'active' ? 'inactive' : 'active'), 'Account status updated') },
    { label: 'Delete', icon: DeleteOutlineIcon, color: 'error', hidden: r.id === me.id, onClick: async () => { if (await confirm({ title: `Delete ${r.name}?`, message: 'Their clients will become unassigned. This cannot be undone.', confirmText: 'Delete', danger: true })) act(() => userService.remove(r.id), 'User deleted'); } },
  ];
  const doExport = async () => { const all = await list.fetchAll(); exportCsv('admins-trainers', [{ header: 'Name', value: (r) => r.name }, { header: 'Email', value: (r) => r.email }, { header: 'Role', value: (r) => r.role_label }, { header: 'Organization', value: (r) => r.organization_name }, { header: 'Clients', value: (r) => r.client_count }, { header: 'Status', value: (r) => r.status }, { header: 'Last login', value: (r) => r.last_login_at }], all.data); };
  return (
    <>
      <PageHeader title={me.role === 'admin' ? 'Trainers' : 'Admins & Trainers'}
        subtitle={me.role === 'admin' ? 'Trainers in your studio use the TrainovaX mobile app to coach their clients.' : 'Create admin and trainer accounts, assign them to organizations and control access.'}
        breadcrumbs={[{ label: 'Dashboard', to: me.role === 'admin' ? '/admin/dashboard' : '/super-admin/dashboard' }, { label: me.role === 'admin' ? 'Trainers' : 'Admins & Trainers' }]}
        actions={<Button variant="contained" startIcon={<PersonAddAlt1OutlinedIcon />} onClick={() => setDialog({ open: true, user: null })}>Add trainer</Button>} />
      <ErrorState error={list.error} onRetry={list.reload} />
      <DataTable columns={columns} rows={list.rows} loading={list.loading} total={list.total} page={list.page} pageSize={list.pageSize} onPageChange={list.setPage} onPageSizeChange={list.setPageSize}
        sort={list.sort} onSortChange={list.setSort} rowActions={actions} onRowClick={(r) => setDialog({ open: true, user: r })}
        empty={<EmptyState icon={BadgeOutlinedIcon} title="No trainers found" />}
        toolbar={<TableToolbar search={list.search} onSearch={list.setSearch} placeholder="Search name, email or organization" onExport={doExport}
          filters={(
            <>
              {me.role !== 'admin' && <FilterSelect label="Role" value={list.filters.role} onChange={(v) => list.setFilter('role', v)} options={ROLE_OPTIONS} />}
              {me.role !== 'admin' && <FilterSelect label="Organization" value={list.filters.organizationId} onChange={(v) => list.setFilter('organizationId', v)} options={organizations.map((o) => ({ value: String(o.id), label: o.name }))} />}
              <FilterSelect label="Status" value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
            </>
          )} />} />
      <UserDialog open={dialog.open} user={dialog.user} onClose={() => setDialog({ open: false, user: null })} onSaved={() => { setDialog({ open: false, user: null }); list.reload({ silent: true }); reloadLookups(); }} />
    </>
  );
}
