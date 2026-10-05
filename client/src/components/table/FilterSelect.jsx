import { MenuItem, TextField } from '@mui/material';
import './DataTable.css';

/** Compact select used in table toolbars. options: [{ value, label }] */
export default function FilterSelect({ label, value, onChange, options, allLabel = 'All', className = '' }) {
  return (
    <TextField select label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={`filter-select ${className}`.trim()}>
      <MenuItem value="">{allLabel}</MenuItem>
      {options.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
    </TextField>
  );
}
