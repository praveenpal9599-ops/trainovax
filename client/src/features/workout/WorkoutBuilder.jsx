import { useState } from 'react';
import {
  Button, Chip, Collapse, IconButton, InputAdornment, Link, MenuItem, TextField, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import EventRepeatOutlinedIcon from '@mui/icons-material/EventRepeatOutlined';
import OndemandVideoOutlinedIcon from '@mui/icons-material/OndemandVideoOutlined';
import ExercisePickerDialog from './ExercisePickerDialog';
import ExerciseThumb from '../masters/ExerciseThumb';
import EmptyState from '../../components/common/EmptyState';
import { WEEKDAYS } from '../../utils/constants';
import { estimateMinutes, exerciseFromMaster, key, move } from './workoutUtils';
import './WorkoutBuilder.css';

const numField = (label, value, onChange, unit, props = {}) => (
  <TextField label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)} type="number" size="small"
    inputProps={{ min: 0, step: 'any', inputMode: 'decimal' }} InputProps={unit ? { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> } : undefined} {...props} />
);

function ExerciseRow({ ex, index, count, onChange, onRemove, onDuplicate, onMove, dragHandlers, dragging }) {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false); // only the handle starts a drag, so inputs stay selectable
  const set = (field) => (v) => onChange({ ...ex, [field]: v });
  const timeBased = ex.exercise_type === 'time' || (!ex.reps && ex.duration_sec);
  return (
    <div {...dragHandlers} draggable={armed} onDragEnd={(e) => { setArmed(false); dragHandlers.onDragEnd?.(e); }} className={`workout-builder__ex${dragging ? ' workout-builder__ex--dragging' : ''}`}>
      <div className="workout-builder__ex-head">
        <Tooltip title="Drag to reorder"><DragIndicatorIcon className="workout-builder__drag" aria-hidden onMouseDown={() => setArmed(true)} onMouseUp={() => setArmed(false)} /></Tooltip>
        <span className="workout-builder__ex-index">{index + 1}</span>
        <ExerciseThumb category={ex.category} image={ex.image_url} size={36} />
        <div className="flex-1">
          <div className="workout-builder__ex-name truncate">{ex.exercise_name}</div>
          <div className="workout-builder__ex-meta truncate">{[ex.muscle_group, ex.equipment].filter(Boolean).join(' · ')}</div>
        </div>
        <div className="workout-builder__ex-actions">
          <Tooltip title="Move up"><span><IconButton size="small" disabled={index === 0} onClick={() => onMove(index - 1)} aria-label="Move exercise up"><ArrowUpwardIcon fontSize="small" /></IconButton></span></Tooltip>
          <Tooltip title="Move down"><span><IconButton size="small" disabled={index === count - 1} onClick={() => onMove(index + 1)} aria-label="Move exercise down"><ArrowDownwardIcon fontSize="small" /></IconButton></span></Tooltip>
          <Tooltip title="Duplicate"><IconButton size="small" onClick={onDuplicate} aria-label="Duplicate exercise"><ContentCopyOutlinedIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Remove"><IconButton size="small" onClick={onRemove} aria-label="Remove exercise"><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title={open ? 'Hide details' : 'Notes, tempo & instructions'}><IconButton size="small" onClick={() => setOpen((o) => !o)} aria-label="Toggle details" className={`workout-builder__expand${open ? ' workout-builder__expand--open' : ''}`}><ExpandMoreIcon fontSize="small" /></IconButton></Tooltip>
        </div>
      </div>
      <div className="workout-builder__ex-fields">
        {numField('Sets', ex.sets, set('sets'))}
        <TextField label="Reps" size="small" value={ex.reps ?? ''} onChange={(e) => set('reps')(e.target.value)} placeholder={timeBased ? '—' : '8-12'} />
        {numField('Duration', ex.duration_sec, set('duration_sec'), 's')}
        {numField('Weight', ex.weight_kg, set('weight_kg'), 'kg')}
        {numField('Rest', ex.rest_sec, set('rest_sec'), 's')}
        <TextField label="Tempo" size="small" value={ex.tempo ?? ''} onChange={(e) => set('tempo')(e.target.value)} placeholder="3-1-1" />
      </div>
      <Collapse in={open} unmountOnExit>
        <div className="workout-builder__ex-details">
          <TextField label="Notes for the client" size="small" value={ex.notes ?? ''} onChange={(e) => set('notes')(e.target.value)} multiline placeholder="e.g. Keep elbows tucked; slow eccentric" className="workout-builder__ex-notes" />
          {ex.instructions && (
            <div className="workout-builder__instructions">
              <span className="workout-builder__instructions-label">INSTRUCTIONS</span>
              <ol className="workout-builder__instructions-list">{ex.instructions.split('\n').filter(Boolean).map((l) => <li key={l}>{l}</li>)}</ol>
              {ex.video_url && <Link href={ex.video_url} target="_blank" rel="noopener" className="workout-builder__video" variant="body2"><OndemandVideoOutlinedIcon fontSize="small" />Watch demo</Link>}
            </div>
          )}
        </div>
      </Collapse>
    </div>
  );
}

/**
 * Workout builder: Plan → Days → Exercises.
 * Supports add/remove/reorder (drag or arrows)/duplicate for exercises and days.
 * Styles: WorkoutBuilder.css
 */
export default function WorkoutBuilder({ days, onChange }) {
  const [picker, setPicker] = useState(null); // day index
  const [drag, setDrag] = useState(null); // { day, index }

  const updateDay = (i, patch) => onChange(days.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  const usedDows = new Set(days.map((d) => d.day_of_week).filter(Boolean));
  const addDay = () => {
    const next = WEEKDAYS.find((w) => !usedDows.has(w.value));
    onChange([...days, { _key: key(), name: next ? next.label : `Day ${days.length + 1}`, day_of_week: next?.value ?? null, focus: '', exercises: [] }]);
  };
  const duplicateDay = (i) => {
    const src = days[i];
    const next = WEEKDAYS.find((w) => !usedDows.has(w.value));
    const copy = { ...src, _key: key(), id: undefined, name: `${src.name} (copy)`, day_of_week: next?.value ?? null, exercises: src.exercises.map((e) => ({ ...e, _key: key(), id: undefined })) };
    onChange([...days.slice(0, i + 1), copy, ...days.slice(i + 1)]);
  };
  const setExercises = (i, exercises) => updateDay(i, { exercises });

  if (!days.length) {
    return (
      <div className="card"><EmptyState icon={EventRepeatOutlinedIcon} title="No workout days yet" description="Add a day (e.g. Monday – Lower body), then add exercises from the Exercise Master."
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={addDay}>Add first workout day</Button>} /></div>
    );
  }

  return (
    <div className="workout-builder">
      <div className="stack">
        {days.map((day, di) => (
          <section key={day._key} className="card workout-builder__day">
            <div className="workout-builder__day-head">
              <div className="workout-builder__day-weekday">
                <TextField select label="Weekday" size="small" value={day.day_of_week ?? ''} onChange={(e) => updateDay(di, { day_of_week: e.target.value || null, name: day.name === (WEEKDAYS.find((w) => w.value === day.day_of_week)?.label) ? (WEEKDAYS.find((w) => w.value === e.target.value)?.label || day.name) : day.name })}>
                  <MenuItem value="">Flexible (any day)</MenuItem>
                  {WEEKDAYS.map((w) => <MenuItem key={w.value} value={w.value} disabled={usedDows.has(w.value) && w.value !== day.day_of_week}>{w.label}</MenuItem>)}
                </TextField>
              </div>
              <TextField label="Day name" size="small" required value={day.name} onChange={(e) => updateDay(di, { name: e.target.value })} error={!day.name.trim()} />
              <TextField label="Focus" size="small" value={day.focus ?? ''} onChange={(e) => updateDay(di, { focus: e.target.value })} placeholder="e.g. Upper body" />
              <div className="workout-builder__day-actions">
                <Chip size="small" icon={<TimerOutlinedIcon />} label={`~${estimateMinutes(day.exercises)} min`} className="workout-builder__time-chip" />
                <Tooltip title="Move day up"><span><IconButton size="small" disabled={di === 0} onClick={() => onChange(move(days, di, di - 1))} aria-label="Move day up"><ArrowUpwardIcon fontSize="small" /></IconButton></span></Tooltip>
                <Tooltip title="Move day down"><span><IconButton size="small" disabled={di === days.length - 1} onClick={() => onChange(move(days, di, di + 1))} aria-label="Move day down"><ArrowDownwardIcon fontSize="small" /></IconButton></span></Tooltip>
                <Tooltip title="Duplicate day"><IconButton size="small" onClick={() => duplicateDay(di)} aria-label="Duplicate day"><ContentCopyOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Delete day"><IconButton size="small" onClick={() => onChange(days.filter((_, i) => i !== di))} aria-label="Delete day"><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
              </div>
            </div>
            <div className="workout-builder__day-body">
              {day.exercises.length === 0 && <p className="workout-builder__empty">No exercises yet — add some from the Exercise Master.</p>}
              {day.exercises.map((ex, ei) => (
                <ExerciseRow key={ex._key} ex={ex} index={ei} count={day.exercises.length}
                  dragging={drag?.day === di && drag.index === ei}
                  onChange={(v) => setExercises(di, day.exercises.map((x, i) => (i === ei ? v : x)))}
                  onRemove={() => setExercises(di, day.exercises.filter((_, i) => i !== ei))}
                  onDuplicate={() => setExercises(di, [...day.exercises.slice(0, ei + 1), { ...ex, _key: key(), id: undefined }, ...day.exercises.slice(ei + 1)])}
                  onMove={(to) => setExercises(di, move(day.exercises, ei, to))}
                  dragHandlers={{
                    draggable: true,
                    onDragStart: (e) => { setDrag({ day: di, index: ei }); e.dataTransfer.effectAllowed = 'move'; },
                    onDragOver: (e) => { if (drag?.day === di) e.preventDefault(); },
                    onDrop: (e) => { e.preventDefault(); if (drag?.day === di && drag.index !== ei) setExercises(di, move(day.exercises, drag.index, ei)); setDrag(null); },
                    onDragEnd: () => setDrag(null),
                  }} />
              ))}
              <Button startIcon={<PlaylistAddIcon />} onClick={() => setPicker(di)} className="workout-builder__add-exercise">Add exercise</Button>
            </div>
          </section>
        ))}
      </div>
      <hr className="divider" />
      <Button variant="outlined" startIcon={<AddIcon />} onClick={addDay} disabled={days.length >= 14}>Add workout day</Button>
      <ExercisePickerDialog open={picker !== null} dayName={days[picker]?.name} onClose={() => setPicker(null)}
        onPick={(list) => { setExercises(picker, [...days[picker].exercises, ...list.map(exerciseFromMaster)]); setPicker(null); }} />
    </div>
  );
}
