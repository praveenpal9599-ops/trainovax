import { Drawer, List, ListItemButton, Skeleton } from '@mui/material';
import useFetch from '../../hooks/useFetch';
import { dietService, workoutService } from '../../services';
import { GOALS, labelOf } from '../../utils/constants';
import './mobile.css';

/** Bottom sheet listing workout or diet templates. Styles: mobile.css */
export default function TemplateSheet({ open, kind, onClose, onPick }) {
  const svc = kind === 'diet' ? dietService : workoutService;
  const { data, loading } = useFetch(() => svc.templates.list({ all: 'true' }).then((r) => r.data), [kind], { enabled: open });
  return (
    <Drawer anchor="bottom" open={open} onClose={onClose}>
      <div className="template-sheet__head">
        <div className="template-sheet__handle" />
        <h2 className="template-sheet__title">Start from a template</h2>
        <p className="template-sheet__desc">Loads the template — you can customise everything afterwards.</p>
      </div>
      <List className="template-sheet__list">
        {loading && [1, 2, 3].map((i) => <Skeleton key={i} height={64} className="template-sheet__skeleton" />)}
        {(data || []).map((t) => (
          <ListItemButton key={t.id} onClick={() => onPick(t.id)} className="template-sheet__item">
            <p className="template-sheet__name">{t.name}</p>
            <span className="template-sheet__meta">
              {labelOf(GOALS, t.goal)} · {kind === 'diet' ? `${t.meals_count} meals · ${t.total_calories ?? 0} kcal · ${t.total_protein ?? 0} g protein` : `${t.days_count} days · ${t.exercises_count} exercises`}
            </span>
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}
