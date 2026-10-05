/**
 * React Hook Form bound inputs. Each shows label, required marker, placeholder,
 * helper text and validation errors consistently.
 */
import { Controller } from 'react-hook-form';
import { Autocomplete, FormControlLabel, InputAdornment, MenuItem, Switch, TextField, Checkbox, FormHelperText } from '@mui/material';

const toInput = (v) => (v === null || v === undefined ? '' : v);

export function FormTextField({ control, name, label, required, helperText, unit, type = 'text', transform, ...props }) {
  return (
    <Controller name={name} control={control} render={({ field, fieldState }) => (
      <TextField {...field} value={toInput(field.value)} type={type}
        onChange={(e) => field.onChange(transform ? transform(e.target.value) : type === 'number' ? (e.target.value === '' ? null : e.target.value) : e.target.value)}
        label={label} required={required} error={!!fieldState.error} helperText={fieldState.error?.message || helperText}
        InputProps={unit ? { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> } : undefined}
        inputProps={type === 'number' ? { step: 'any', inputMode: 'decimal' } : undefined}
        {...props} />
    )} />
  );
}

export function FormSelect({ control, name, label, options, required, helperText, emptyLabel, ...props }) {
  return (
    <Controller name={name} control={control} render={({ field, fieldState }) => (
      <TextField {...field} value={toInput(field.value)} select label={label} required={required}
        onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
        error={!!fieldState.error} helperText={fieldState.error?.message || helperText} {...props}>
        {emptyLabel && <MenuItem value=""><em>{emptyLabel}</em></MenuItem>}
        {options.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
      </TextField>
    )} />
  );
}

export function FormSwitch({ control, name, label, helperText }) {
  return (
    <Controller name={name} control={control} render={({ field }) => (
      <div className="form-switch">
        <FormControlLabel control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />} label={label} />
        {helperText && <FormHelperText className="form-switch__help">{helperText}</FormHelperText>}
      </div>
    )} />
  );
}

export function FormCheckbox({ control, name, label }) {
  return (
    <Controller name={name} control={control} render={({ field }) => (
      <FormControlLabel control={<Checkbox checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />} label={label} />
    )} />
  );
}

/** Autocomplete that stores the option's value (id) in the form. */
export function FormAutocomplete({ control, name, label, options, required, helperText, getOptionLabel = (o) => o.label, ...props }) {
  return (
    <Controller name={name} control={control} render={({ field, fieldState }) => (
      <Autocomplete options={options} value={options.find((o) => o.value === field.value) || null}
        onChange={(_, v) => field.onChange(v ? v.value : null)} getOptionLabel={getOptionLabel}
        isOptionEqualToValue={(a, b) => a.value === b.value}
        renderInput={(params) => <TextField {...params} label={label} required={required} error={!!fieldState.error} helperText={fieldState.error?.message || helperText} />}
        {...props} />
    )} />
  );
}
