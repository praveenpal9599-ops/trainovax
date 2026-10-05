import { useCallback, useState } from 'react';
import { Button, Chip, Collapse, InputAdornment, Skeleton, Tab, Tabs, TextField } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchIcon from '@mui/icons-material/Search';
import MobilePageHeader from '../../features/mobile/MobilePageHeader';
import ExerciseThumb from '../../features/masters/ExerciseThumb';
import ExerciseFormDialog from '../../features/masters/ExerciseFormDialog';
import FoodFormDialog from '../../features/masters/FoodFormDialog';
import VegDot from '../../features/diet/VegDot';
import EmptyState from '../../components/common/EmptyState';
import usePagedList from '../../hooks/usePagedList';
import { exerciseService, foodService } from '../../services';
import { useLookups } from '../../features/lookups/LookupsContext';
import { num } from '../../utils/format';
import '../../features/mobile/mobile.css';
import './TrainerLibrary.css';

function Exercises() {
  const { exerciseCategories } = useLookups();
  const list = usePagedList(useCallback((p) => exerciseService.list(p), []), { pageSize: 100, sortBy: 'name', sortDir: 'asc' });
  const [open, setOpen] = useState(null);
  const [add, setAdd] = useState(false);
  return (
    <>
      <div className="mobile-filter-row mobile-filter-row--tight">
        <Chip label="All" onClick={() => list.setFilter('categoryId', '')} color={!list.filters.categoryId ? 'primary' : 'default'} />
        {exerciseCategories.map((c) => <Chip key={c.id} label={c.name} onClick={() => list.setFilter('categoryId', c.id)} color={list.filters.categoryId === c.id ? 'primary' : 'default'} variant={list.filters.categoryId === c.id ? 'filled' : 'outlined'} />)}
      </div>
      <TextField value={list.search} onChange={(e) => list.setSearch(e.target.value)} placeholder="Search exercises…" InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} className="mobile-search" />
      <Button fullWidth variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => setAdd(true)} className="trainer-library__add">Add custom exercise</Button>
      {list.loading && [1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={64} className="trainer-library__skeleton" />)}
      {!list.loading && !list.rows.length && <EmptyState compact title="No exercises found" />}
      <div className="trainer-library__list">
        {list.rows.map((e) => (
          <div key={e.id} className="card trainer-library__item" onClick={() => setOpen(open === e.id ? null : e.id)}>
            <div className="trainer-library__row">
              <ExerciseThumb category={e.category} image={e.image_url} />
              <div className="flex-1"><p className="trainer-library__name">{e.name}</p><span className="trainer-library__meta">{[e.primary_muscle, e.equipment, e.difficulty].filter(Boolean).join(' · ')}</span></div>
            </div>
            <Collapse in={open === e.id} unmountOnExit>
              <p className="trainer-library__desc">{e.description}</p>
              <ol className="trainer-library__steps">{(e.instructions || '').split('\n').filter(Boolean).map((l) => <li key={l}>{l}</li>)}</ol>
            </Collapse>
          </div>
        ))}
      </div>
      <ExerciseFormDialog open={add} exercise={null} onClose={() => setAdd(false)} onSaved={() => { setAdd(false); list.reload({ silent: true }); }} />
    </>
  );
}

function Foods() {
  const { foodCategories } = useLookups();
  const list = usePagedList(useCallback((p) => foodService.list(p), []), { pageSize: 100, sortBy: 'name', sortDir: 'asc' });
  const [add, setAdd] = useState(false);
  return (
    <>
      <div className="mobile-filter-row mobile-filter-row--tight">
        <Chip label="All" onClick={() => list.setFilter('categoryId', '')} color={!list.filters.categoryId ? 'primary' : 'default'} />
        {foodCategories.map((c) => <Chip key={c.id} label={c.name} onClick={() => list.setFilter('categoryId', c.id)} color={list.filters.categoryId === c.id ? 'primary' : 'default'} variant={list.filters.categoryId === c.id ? 'filled' : 'outlined'} />)}
      </div>
      <TextField value={list.search} onChange={(e) => list.setSearch(e.target.value)} placeholder="Search foods…" InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} className="mobile-search" />
      <Button fullWidth variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => setAdd(true)} className="trainer-library__add">Add custom food</Button>
      {list.loading && [1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={64} className="trainer-library__skeleton" />)}
      {!list.loading && !list.rows.length && <EmptyState compact title="No foods found" />}
      <div className="trainer-library__list">
        {list.rows.map((f) => (
          <div key={f.id} className="card trainer-library__item">
            <div className="trainer-library__row trainer-library__row--tight">
              <VegDot veg={!!f.is_vegetarian} vegan={!!f.is_vegan} />
              <div className="flex-1"><p className="trainer-library__name">{f.name}</p><span className="trainer-library__meta">per {num(f.serving_size, 0)} {f.serving_unit} · {f.category}</span></div>
              <div className="text-right"><p className="trainer-library__kcal">{num(f.calories, 0)} kcal</p><span className="trainer-library__meta">P {num(f.protein_g)} · C {num(f.carbs_g)} · F {num(f.fat_g)}</span></div>
            </div>
          </div>
        ))}
      </div>
      <FoodFormDialog open={add} food={null} onClose={() => setAdd(false)} onSaved={() => { setAdd(false); list.reload({ silent: true }); }} />
    </>
  );
}

/** Trainer app: searchable exercise & food library with custom entries. Styles: TrainerLibrary.css */
export default function TrainerLibrary() {
  const [tab, setTab] = useState('exercises');
  return (
    <div className="trainer-library">
      <MobilePageHeader title="Library" subtitle="Exercises & foods used in your plans" back="/trainer/dashboard" />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" className="trainer-library__tabs">
        <Tab value="exercises" label="Exercises" /><Tab value="foods" label="Foods" />
      </Tabs>
      {tab === 'exercises' ? <Exercises /> : <Foods />}
    </div>
  );
}
