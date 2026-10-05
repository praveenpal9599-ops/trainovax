import { useEffect, useState } from 'react';
import { Autocomplete, CircularProgress, InputAdornment, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import useDebounce from '../../hooks/useDebounce';
import './mobile.css';

/**
 * Search-as-you-type field with a dropdown of results (e.g. exercises / foods).
 * Selecting an item calls onSelect(item) and clears the field so the next item can be added. Styles: mobile.css
 */
export default function InlineSearch({ placeholder, fetcher, onSelect, getLabel = (o) => o.name, getSubtitle, renderAdornment }) {
  const [input, setInput] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const q = useDebounce(input, 200);
  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setLoading(true);
    fetcher(q).then((r) => alive && setOptions(r)).catch(() => alive && setOptions([])).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [q, open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Autocomplete
      open={open} onOpen={() => setOpen(true)} onClose={() => setOpen(false)}
      options={options} loading={loading} filterOptions={(x) => x} value={null} inputValue={input}
      onInputChange={(_, v, reason) => reason !== 'reset' && setInput(v)}
      onChange={(_, v) => { if (v) { onSelect(v); setInput(''); } }}
      getOptionLabel={getLabel} isOptionEqualToValue={(a, b) => a.id === b.id} blurOnSelect clearOnBlur={false}
      noOptionsText={input ? 'No matches — add a custom one below' : 'Type to search'}
      renderOption={(props, o) => (
        <li {...props} key={o.id} className={`${props.className || ''} inline-search__option`}>
          {renderAdornment?.(o)}
          <div className="inline-search__text">
            <p className="inline-search__name">{getLabel(o)}</p>
            {getSubtitle && <span className="inline-search__sub">{getSubtitle(o)}</span>}
          </div>
        </li>
      )}
      renderInput={(params) => (
        <TextField {...params} placeholder={placeholder}
          InputProps={{ ...params.InputProps, startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>, endAdornment: loading ? <CircularProgress size={18} /> : null }} />
      )}
    />
  );
}
