import { useEffect, useState } from 'react';
import { Checkbox, Chip, InputAdornment, List, ListItemButton, MenuItem, Skeleton, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FormDialog from '../../components/common/FormDialog';
import EmptyState from '../../components/common/EmptyState';
import ExerciseThumb from '../masters/ExerciseThumb';
import useDebounce from '../../hooks/useDebounce';
import useFetch from '../../hooks/useFetch';
import { exerciseService } from '../../services';
import { useLookups } from '../lookups/LookupsContext';
import './ExercisePickerDialog.css';

/** Search the Exercise Master and pick one or more exercises. Styles: ExercisePickerDialog.css */
export default function ExercisePickerDialog({ open, onClose, onPick, dayName }) {
  const { exerciseCategories, muscleGroups } = useLookups();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [muscleId, setMuscleId] = useState('');
  const [picked, setPicked] = useState([]);
  const q = useDebounce(search, 250);
  useEffect(() => { if (open) { setPicked([]); setSearch(''); } }, [open]);
  const { data, loading } = useFetch(() => exerciseService.list({ search: q, categoryId, muscleId, status: 'active', pageSize: 100, sortBy: 'name', sortDir: 'asc' }), [q, categoryId, muscleId], { enabled: open });
  const rows = data?.data || [];
  const toggle = (ex) => setPicked((p) => (p.some((x) => x.id === ex.id) ? p.filter((x) => x.id !== ex.id) : [...p, ex]));

  return (
    <FormDialog open={open} onClose={onClose} title={`Add exercises${dayName ? ` to ${dayName}` : ''}`} maxWidth="md" submitText={picked.length ? `Add ${picked.length} exercise${picked.length > 1 ? 's' : ''}` : 'Add'}
      submitDisabled={!picked.length} onSubmit={() => onPick(picked)}>
      <div className="exercise-picker">
        <div className="exercise-picker__filters">
          <TextField autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search exercises…" inputProps={{ 'aria-label': 'Search exercises' }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
          <TextField select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="exercise-picker__select">
            <MenuItem value="">All</MenuItem>{exerciseCategories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          <TextField select label="Muscle" value={muscleId} onChange={(e) => setMuscleId(e.target.value)} className="exercise-picker__select">
            <MenuItem value="">All</MenuItem>{muscleGroups.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
        </div>
        {picked.length > 0 && <div className="row row--wrap exercise-picker__picked">{picked.map((p) => <Chip key={p.id} label={p.name} onDelete={() => toggle(p)} color="primary" size="small" />)}</div>}
        <div className="exercise-picker__list">
          {loading && [1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={60} className="exercise-picker__skeleton" />)}
          {!loading && rows.length === 0 && <EmptyState compact title="No exercises found" description="Try a different search or filter." />}
          <List disablePadding>
            {rows.map((ex) => {
              const checked = picked.some((p) => p.id === ex.id);
              return (
                <ListItemButton key={ex.id} onClick={() => toggle(ex)} selected={checked} className="exercise-picker__item">
                  <Checkbox edge="start" checked={checked} tabIndex={-1} size="small" inputProps={{ 'aria-label': ex.name }} />
                  <ExerciseThumb category={ex.category} image={ex.image_url} />
                  <div className="flex-1">
                    <div className="exercise-picker__name">{ex.name}</div>
                    <span className="exercise-picker__meta">{[ex.primary_muscle, ex.equipment, ex.difficulty].filter(Boolean).join(' · ')}</span>
                  </div>
                  <Chip size="small" label={ex.category} variant="outlined" className="exercise-picker__category" />
                </ListItemButton>
              );
            })}
          </List>
        </div>
      </div>
    </FormDialog>
  );
}
