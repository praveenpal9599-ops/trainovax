import { useCallback, useState } from 'react';
import { Button, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined';
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined';
import EggAltOutlinedIcon from '@mui/icons-material/EggAltOutlined';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/table/DataTable';
import TableToolbar from '../../components/table/TableToolbar';
import FilterSelect from '../../components/table/FilterSelect';
import StatusChip from '../../components/common/StatusChip';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import VegDot from '../../features/diet/VegDot';
import FoodFormDialog from '../../features/masters/FoodFormDialog';
import usePagedList from '../../hooks/usePagedList';
import { foodService } from '../../services';
import { useAuth } from '../../features/auth/AuthContext';
import { useLookups } from '../../features/lookups/LookupsContext';
import { useFeedback } from '../../features/feedback/FeedbackProvider';
import { num } from '../../utils/format';
import { exportCsv } from '../../utils/exportCsv';
import './FoodsPage.css';

export default function FoodsPage() {
  const { user, basePath } = useAuth();
  const isSuper = user.role === 'super_admin';
  const { foodCategories } = useLookups();
  const { confirm, notify, notifyError } = useFeedback();
  const list = usePagedList(useCallback((p) => foodService.list(p), []), { sortBy: 'name', sortDir: 'asc' });
  const [form, setForm] = useState({ open: false, food: null });
  const canEdit = (r) => isSuper || r.created_by === user.id;
  const act = async (fn, msg) => { try { await fn(); notify(msg); list.reload({ silent: true }); } catch (e) { notifyError(e); } };
  const actions = (r) => [
    { label: 'Edit', icon: EditOutlinedIcon, hidden: !canEdit(r), onClick: () => setForm({ open: true, food: r }) },
    { label: r.status === 'active' ? 'Deactivate' : 'Activate', icon: r.status === 'active' ? ToggleOffOutlinedIcon : ToggleOnOutlinedIcon, hidden: !canEdit(r), onClick: () => act(() => foodService.setStatus(r.id, r.status === 'active' ? 'inactive' : 'active'), 'Status updated') },
    { label: 'Delete', icon: DeleteOutlineIcon, color: 'error', hidden: !canEdit(r), onClick: async () => { if (await confirm({ title: `Delete "${r.name}"?`, message: 'Existing diet plans keep this food, but it will not be available for new plans.', confirmText: 'Delete', danger: true })) act(() => foodService.remove(r.id), 'Food deleted'); } },
  ];
  const macro = (v) => <span className="foods__macro">{num(v)}<span className="foods__unit"> g</span></span>;
  const columns = [
    { field: 'name', header: 'Food', sortKey: 'name', render: (r) => <div className="foods__name-cell"><VegDot veg={!!r.is_vegetarian} vegan={!!r.is_vegan} /><div><p className="foods__name">{r.name}</p><span className="foods__serving">per {num(r.serving_size, 0)} {r.serving_unit}</span></div></div> },
    { field: 'category', header: 'Category', sortKey: 'category', hideBelow: 'sm', render: (r) => <Chip size="small" label={r.category} variant="outlined" /> },
    { field: 'calories', header: 'Calories', sortKey: 'calories', align: 'right', render: (r) => <span className="foods__calories">{num(r.calories, 0)}</span> },
    { field: 'protein_g', header: 'Protein', sortKey: 'protein', align: 'right', render: (r) => macro(r.protein_g) },
    { field: 'carbs_g', header: 'Carbs', align: 'right', hideBelow: 'md', render: (r) => macro(r.carbs_g) },
    { field: 'fat_g', header: 'Fat', align: 'right', hideBelow: 'md', render: (r) => macro(r.fat_g) },
    { field: 'fiber_g', header: 'Fiber', align: 'right', hideBelow: 'lg', render: (r) => macro(r.fiber_g) },
    { field: 'sugar_g', header: 'Sugar', align: 'right', hideBelow: 'lg', render: (r) => macro(r.sugar_g) },
    { field: 'sodium_mg', header: 'Sodium', align: 'right', hideBelow: 'lg', render: (r) => `${num(r.sodium_mg, 0)} mg` },
    { field: 'allergens', header: 'Allergens', hideBelow: 'lg', render: (r) => r.allergens ? <span className="foods__allergens">{r.allergens}</span> : '—' },
    { field: 'status', header: 'Status', sortKey: 'status', render: (r) => <StatusChip status={r.status} /> },
  ];
  const doExport = async () => {
    const all = await list.fetchAll();
    exportCsv('food-master', [
      { header: 'Name', value: (r) => r.name }, { header: 'Category', value: (r) => r.category }, { header: 'Serving', value: (r) => `${r.serving_size} ${r.serving_unit}` },
      ...['calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'sodium_mg'].map((k) => ({ header: k, value: (r) => r[k] })),
      { header: 'Vegetarian', value: (r) => (r.is_vegetarian ? 'Yes' : 'No') }, { header: 'Vegan', value: (r) => (r.is_vegan ? 'Yes' : 'No') }, { header: 'Allergens', value: (r) => r.allergens }, { header: 'Status', value: (r) => r.status },
    ], all.data);
  };
  return (
    <>
      <PageHeader title={isSuper ? 'Food / Nutrition Master' : 'Food Library'} subtitle="Nutrition values per serving — used to calculate diet plan totals automatically."
        breadcrumbs={[{ label: 'Dashboard', to: `${basePath}/dashboard` }, { label: isSuper ? 'Food Master' : 'Food Library' }]}
        actions={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setForm({ open: true, food: null })}>Add food</Button>} />
      <ErrorState error={list.error} onRetry={list.reload} />
      <DataTable columns={columns} rows={list.rows} loading={list.loading} total={list.total} page={list.page} pageSize={list.pageSize} onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize} sort={list.sort} onSortChange={list.setSort} rowActions={actions} onRowClick={(r) => canEdit(r) && setForm({ open: true, food: r })}
        empty={<EmptyState icon={EggAltOutlinedIcon} title="No foods found" description="Adjust the filters or add a new food item." />}
        toolbar={(
          <TableToolbar search={list.search} onSearch={list.setSearch} placeholder="Search foods" onExport={doExport}
            filters={(
              <>
                <FilterSelect label="Category" value={list.filters.categoryId} onChange={(v) => list.setFilter('categoryId', v)} options={foodCategories.map((c) => ({ value: c.id, label: c.name }))} />
                <FilterSelect label="Diet" value={list.filters.isVegan ? 'vegan' : (list.filters.isVegetarian || '')} onChange={(v) => list.setFilters((f) => ({ ...f, isVegetarian: v === '1' || v === '0' ? v : '', isVegan: v === 'vegan' ? '1' : '' }))}
                  options={[{ value: '1', label: 'Vegetarian' }, { value: 'vegan', label: 'Vegan' }, { value: '0', label: 'Non-vegetarian' }]} />
                {isSuper && <FilterSelect label="Status" value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />}
              </>
            )} />
        )} />
      <FoodFormDialog open={form.open} food={form.food} onClose={() => setForm({ open: false, food: null })} onSaved={() => { setForm({ open: false, food: null }); list.reload({ silent: true }); }} />
    </>
  );
}
