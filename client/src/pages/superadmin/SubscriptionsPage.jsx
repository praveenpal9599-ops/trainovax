import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button, IconButton, Tab, Tabs, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CardMembershipOutlinedIcon from '@mui/icons-material/CardMembershipOutlined';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/table/DataTable';
import TableToolbar from '../../components/table/TableToolbar';
import FilterSelect from '../../components/table/FilterSelect';
import StatusChip from '../../components/common/StatusChip';
import FormDialog from '../../components/common/FormDialog';
import EmptyState from '../../components/common/EmptyState';
import { FormAutocomplete, FormSelect, FormSwitch, FormTextField } from '../../components/form/FormFields';
import { requiredNumber, requiredString, optionalNumber } from '../../components/form/zod';
import usePagedList from '../../hooks/usePagedList';
import useFetch from '../../hooks/useFetch';
import { subscriptionPlanService, subscriptionService } from '../../services';
import { useLookups } from '../../features/lookups/LookupsContext';
import { useFeedback } from '../../features/feedback/FeedbackProvider';
import { currency, formatDate, todayISO } from '../../utils/format';
import { exportCsv } from '../../utils/exportCsv';
import './superadmin.css';
import './SubscriptionsPage.css';

const SUB_STATUSES = ['trial', 'active', 'past_due', 'cancelled', 'expired'].map((s) => ({ value: s, label: s.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase()) }));

function PlanDialog({ open, plan, onClose, onSaved }) {
  const { notify } = useFeedback();
  const [error, setError] = useState(null);
  const blank = { name: '', description: '', price_monthly: 0, price_yearly: 0, max_trainers: 1, max_clients: 25, status: 'active' };
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    resolver: zodResolver(z.object({ name: requiredString('Plan name', 80), description: z.string().max(255).optional().nullable(), price_monthly: requiredNumber(0, 1e7, 'Monthly price'), price_yearly: requiredNumber(0, 1e8, 'Yearly price'), max_trainers: requiredNumber(1, 10000, 'Max trainers'), max_clients: requiredNumber(1, 1e6, 'Max clients'), status: z.string() })),
    defaultValues: blank,
  });
  useEffect(() => { if (open) { setError(null); reset(plan ? { ...blank, ...Object.fromEntries(Object.entries(plan).filter(([k]) => k in blank)) } : blank); } }, [open, plan]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = handleSubmit(async (v) => { try { const s = plan ? await subscriptionPlanService.update(plan.id, v) : await subscriptionPlanService.create(v); notify('Plan saved'); onSaved(s); } catch (e) { setError(e.message); } });
  return (
    <FormDialog open={open} onClose={onClose} title={plan ? 'Edit plan' : 'New subscription plan'} onSubmit={submit} loading={isSubmitting}>
      {error && <Alert severity="error" className="sa-dialog__alert">{error}</Alert>}
      <div className="sa-form-grid">
        <div className="sa-col--sm-8"><FormTextField control={control} name="name" label="Plan name" required /></div>
        <div className="sa-col--sm-4"><FormSelect control={control} name="status" label="Status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /></div>
        <div><FormTextField control={control} name="description" label="Description" /></div>
        <div className="sa-col--half"><FormTextField control={control} name="price_monthly" label="Monthly price" type="number" unit="₹" required /></div>
        <div className="sa-col--half"><FormTextField control={control} name="price_yearly" label="Yearly price" type="number" unit="₹" required /></div>
        <div className="sa-col--half"><FormTextField control={control} name="max_trainers" label="Max trainers" type="number" required /></div>
        <div className="sa-col--half"><FormTextField control={control} name="max_clients" label="Max clients" type="number" required /></div>
      </div>
    </FormDialog>
  );
}

function SubDialog({ open, sub, plans, onClose, onSaved }) {
  const { organizations } = useLookups();
  const { notify } = useFeedback();
  const [error, setError] = useState(null);
  const blank = { organization_id: null, plan_id: null, billing_cycle: 'monthly', amount: null, status: 'active', start_date: todayISO(), end_date: '', auto_renew: true };
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    resolver: zodResolver(z.object({ organization_id: z.number({ invalid_type_error: 'Select an organization' }), plan_id: z.number({ invalid_type_error: 'Select a plan' }), billing_cycle: z.string(), amount: optionalNumber(0, 1e8, 'Amount'), status: z.string(), start_date: z.string().min(1, 'Start date is required'), end_date: z.string().optional().nullable(), auto_renew: z.boolean() })),
    defaultValues: blank,
  });
  useEffect(() => { if (open) { setError(null); reset(sub ? { ...blank, ...Object.fromEntries(Object.entries(sub).filter(([k, v]) => k in blank && v !== null)), auto_renew: !!sub.auto_renew } : blank); } }, [open, sub]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = handleSubmit(async (v) => {
    const plan = plans.find((p) => p.id === v.plan_id);
    const amount = v.amount ?? (v.billing_cycle === 'yearly' ? plan?.price_yearly : plan?.price_monthly) ?? 0;
    try { const s = sub ? await subscriptionService.update(sub.id, { ...v, amount, end_date: v.end_date || null }) : await subscriptionService.create({ ...v, amount, end_date: v.end_date || null }); notify('Subscription saved'); onSaved(s); } catch (e) { setError(e.message); }
  });
  return (
    <FormDialog open={open} onClose={onClose} title={sub ? 'Edit subscription' : 'New subscription'} onSubmit={submit} loading={isSubmitting}>
      {error && <Alert severity="error" className="sa-dialog__alert">{error}</Alert>}
      <div className="sa-form-grid">
        <div><FormAutocomplete control={control} name="organization_id" label="Organization" required options={organizations.map((o) => ({ value: o.id, label: o.name }))} /></div>
        <div className="sa-col--sm-6"><FormSelect control={control} name="plan_id" label="Plan" required options={plans.map((p) => ({ value: p.id, label: `${p.name} · ${currency(p.price_monthly)}/mo` }))} /></div>
        <div className="sa-col--sm-6"><FormSelect control={control} name="billing_cycle" label="Billing cycle" options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} /></div>
        <div className="sa-col--half"><FormTextField control={control} name="amount" label="Amount" type="number" unit="₹" helperText="Leave blank to use the plan price" /></div>
        <div className="sa-col--half"><FormSelect control={control} name="status" label="Status" options={SUB_STATUSES} /></div>
        <div className="sa-col--half"><FormTextField control={control} name="start_date" label="Start date" type="date" required InputLabelProps={{ shrink: true }} /></div>
        <div className="sa-col--half"><FormTextField control={control} name="end_date" label="Renews / ends" type="date" InputLabelProps={{ shrink: true }} /></div>
        <div><FormSwitch control={control} name="auto_renew" label="Auto-renew" /></div>
      </div>
    </FormDialog>
  );
}

export default function SubscriptionsPage() {
  const [tab, setTab] = useState('subscriptions');
  const { confirm, notify, notifyError } = useFeedback();
  const { data: plans, reload: reloadPlans } = useFetch(() => subscriptionPlanService.list({ all: 'true' }).then((r) => r.data), []);
  const list = usePagedList(useCallback((p) => subscriptionService.list(p), []), { sortBy: 'start' });
  const [planDlg, setPlanDlg] = useState({ open: false, plan: null });
  const [subDlg, setSubDlg] = useState({ open: false, sub: null });
  const act = async (fn, msg) => { try { await fn(); notify(msg); list.reload({ silent: true }); reloadPlans({ silent: true }); } catch (e) { notifyError(e); } };
  const columns = [
    { field: 'organization_name', header: 'Organization', sortKey: 'organization', render: (r) => <span className="sa-cell-strong">{r.organization_name}</span> },
    { field: 'plan_name', header: 'Plan', sortKey: 'plan' },
    { field: 'billing_cycle', header: 'Cycle', hideBelow: 'sm', render: (r) => <span className="text-capitalize">{r.billing_cycle}</span> },
    { field: 'amount', header: 'Amount', sortKey: 'amount', align: 'right', render: (r) => currency(r.amount) },
    { field: 'status', header: 'Status', sortKey: 'status', render: (r) => <StatusChip status={r.status} /> },
    { field: 'start_date', header: 'Started', sortKey: 'start', hideBelow: 'md', render: (r) => formatDate(r.start_date) },
    { field: 'end_date', header: 'Renews / ends', sortKey: 'end', hideBelow: 'md', render: (r) => formatDate(r.end_date) },
  ];
  const actions = (r) => [
    { label: 'Edit', icon: EditOutlinedIcon, onClick: () => setSubDlg({ open: true, sub: r }) },
    { label: 'Delete', icon: DeleteOutlineIcon, color: 'error', onClick: async () => { if (await confirm({ title: 'Delete subscription?', message: `${r.organization_name} · ${r.plan_name}`, confirmText: 'Delete', danger: true })) act(() => subscriptionService.remove(r.id), 'Subscription deleted'); } },
  ];
  return (
    <>
      <PageHeader title="Subscriptions" subtitle="Billing plans and each organization's subscription." breadcrumbs={[{ label: 'Dashboard', to: '/super-admin/dashboard' }, { label: 'Subscriptions' }]}
        actions={tab === 'plans' ? <Button variant="contained" startIcon={<AddIcon />} onClick={() => setPlanDlg({ open: true, plan: null })}>New plan</Button>
          : <Button variant="contained" startIcon={<AddIcon />} onClick={() => setSubDlg({ open: true, sub: null })}>New subscription</Button>} />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} className="subs-tabs"><Tab value="subscriptions" label="Subscriptions" /><Tab value="plans" label="Plans & pricing" /></Tabs>
      {tab === 'plans' && (
        <div className="subs-plans">
          {(plans || []).map((p) => (
            <article className="card subs-plan" key={p.id}>
              <div className="subs-plan__head"><h3 className="subs-plan__name">{p.name}</h3><div className="subs-plan__tools"><StatusChip status={p.status} /><Tooltip title="Edit"><IconButton size="small" onClick={() => setPlanDlg({ open: true, plan: p })} aria-label="Edit plan"><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip></div></div>
              <p className="subs-plan__desc">{p.description}</p>
              <p className="subs-plan__price">{currency(p.price_monthly)}<span className="subs-plan__per"> / month</span></p>
              <span className="text-caption text-muted">or {currency(p.price_yearly)} / year</span>
              <ul className="subs-plan__features">
                {[`Up to ${p.max_trainers} trainer${p.max_trainers > 1 ? 's' : ''}`, `Up to ${p.max_clients.toLocaleString('en-IN')} clients`, 'Workout & diet builders', 'Client app & messaging'].map((f) => (
                  <li key={f} className="subs-plan__feature"><CheckCircleOutlineIcon fontSize="small" color="primary" /><span>{f}</span></li>
                ))}
              </ul>
              <div className="subs-plan__foot"><b>{p.active_subscriptions}</b> active / trial subscriptions</div>
            </article>
          ))}
        </div>
      )}
      {tab === 'subscriptions' && (
        <DataTable columns={columns} rows={list.rows} loading={list.loading} total={list.total} page={list.page} pageSize={list.pageSize} onPageChange={list.setPage} onPageSizeChange={list.setPageSize}
          sort={list.sort} onSortChange={list.setSort} rowActions={actions} onRowClick={(r) => setSubDlg({ open: true, sub: r })}
          empty={<EmptyState icon={CardMembershipOutlinedIcon} title="No subscriptions" />}
          toolbar={<TableToolbar search={list.search} onSearch={list.setSearch} placeholder="Search organization or plan"
            onExport={async () => { const all = await list.fetchAll(); exportCsv('subscriptions', [{ header: 'Organization', value: (r) => r.organization_name }, { header: 'Plan', value: (r) => r.plan_name }, { header: 'Cycle', value: (r) => r.billing_cycle }, { header: 'Amount', value: (r) => r.amount }, { header: 'Status', value: (r) => r.status }, { header: 'Start', value: (r) => r.start_date }, { header: 'End', value: (r) => r.end_date }], all.data); }}
            filters={<FilterSelect label="Status" value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={SUB_STATUSES} />} />} />
      )}
      <PlanDialog open={planDlg.open} plan={planDlg.plan} onClose={() => setPlanDlg({ open: false, plan: null })} onSaved={() => { setPlanDlg({ open: false, plan: null }); reloadPlans(); }} />
      <SubDialog open={subDlg.open} sub={subDlg.sub} plans={plans || []} onClose={() => setSubDlg({ open: false, sub: null })} onSaved={() => { setSubDlg({ open: false, sub: null }); list.reload({ silent: true }); }} />
    </>
  );
}
