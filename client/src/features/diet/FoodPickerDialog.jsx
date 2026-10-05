import { useEffect, useState } from 'react';
import { Checkbox, Chip, InputAdornment, List, ListItemButton, MenuItem, Skeleton, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FormDialog from '../../components/common/FormDialog';
import EmptyState from '../../components/common/EmptyState';
import VegDot from './VegDot';
import useDebounce from '../../hooks/useDebounce';
import useFetch from '../../hooks/useFetch';
import { foodService } from '../../services';
import { useLookups } from '../lookups/LookupsContext';
import { num } from '../../utils/format';
import './FoodPickerDialog.css';

/** Search the Food Master and add foods to a meal. Styles: FoodPickerDialog.css */
export default function FoodPickerDialog({ open, onClose, onPick, mealName }) {
  const { foodCategories } = useLookups();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [diet, setDiet] = useState('');
  const [picked, setPicked] = useState([]);
  const q = useDebounce(search, 250);
  useEffect(() => { if (open) { setPicked([]); setSearch(''); } }, [open]);
  const { data, loading } = useFetch(() => foodService.list({ search: q, categoryId, status: 'active', pageSize: 100, sortBy: 'name', sortDir: 'asc', ...(diet === 'veg' ? { isVegetarian: 1 } : diet === 'vegan' ? { isVegan: 1 } : {}) }), [q, categoryId, diet], { enabled: open });
  const rows = data?.data || [];
  const toggle = (f) => setPicked((p) => (p.some((x) => x.id === f.id) ? p.filter((x) => x.id !== f.id) : [...p, f]));

  return (
    <FormDialog open={open} onClose={onClose} title={`Add foods${mealName ? ` to ${mealName}` : ''}`} maxWidth="md" submitText={picked.length ? `Add ${picked.length} food${picked.length > 1 ? 's' : ''}` : 'Add'} submitDisabled={!picked.length} onSubmit={() => onPick(picked)}>
      <div className="food-picker">
        <div className="food-picker__filters">
          <TextField autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search foods… e.g. paneer, oats" inputProps={{ 'aria-label': 'Search foods' }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
          <TextField select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="food-picker__select food-picker__select--category">
            <MenuItem value="">All</MenuItem>{foodCategories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          <TextField select label="Diet" value={diet} onChange={(e) => setDiet(e.target.value)} className="food-picker__select food-picker__select--diet">
            <MenuItem value="">Any</MenuItem><MenuItem value="veg">Vegetarian</MenuItem><MenuItem value="vegan">Vegan</MenuItem>
          </TextField>
        </div>
        {picked.length > 0 && <div className="row row--wrap food-picker__picked">{picked.map((p) => <Chip key={p.id} label={p.name} onDelete={() => toggle(p)} color="primary" size="small" />)}</div>}
        <div className="food-picker__list">
          {loading && [1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={56} className="food-picker__skeleton" />)}
          {!loading && rows.length === 0 && <EmptyState compact title="No foods found" description="Try a different search or filter." />}
          <List disablePadding>
            {rows.map((f) => {
              const checked = picked.some((p) => p.id === f.id);
              return (
                <ListItemButton key={f.id} onClick={() => toggle(f)} selected={checked} className="food-picker__item">
                  <Checkbox edge="start" checked={checked} tabIndex={-1} size="small" inputProps={{ 'aria-label': f.name }} />
                  <VegDot veg={!!f.is_vegetarian} vegan={!!f.is_vegan} />
                  <div className="flex-1">
                    <div className="food-picker__name">{f.name}</div>
                    <span className="food-picker__meta">{f.category} · per {num(f.serving_size, 0)} {f.serving_unit}</span>
                  </div>
                  <div className="text-right">
                    <div className="food-picker__kcal">{num(f.calories, 0)} kcal</div>
                    <span className="food-picker__meta">P {num(f.protein_g)} · C {num(f.carbs_g)} · F {num(f.fat_g)}</span>
                  </div>
                </ListItemButton>
              );
            })}
          </List>
        </div>
      </div>
    </FormDialog>
  );
}
