import { Button, InputAdornment, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import './DataTable.css';

/** Search + filters + export, switching to bulk actions when rows are selected. Styles: DataTable.css */
export default function TableToolbar({ search, onSearch, placeholder = 'Search…', filters, onExport, selectedCount = 0, bulkActions, children }) {
  if (selectedCount > 0 && bulkActions) {
    return (
      <div className="table-toolbar table-toolbar--bulk">
        <span className="table-toolbar__count">{selectedCount} selected</span>
        {bulkActions}
      </div>
    );
  }
  return (
    <div className="table-toolbar">
      {onSearch && (
        <TextField value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} className="table-toolbar__search"
          inputProps={{ 'aria-label': placeholder }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment> }} />
      )}
      <div className="table-toolbar__filters">{filters}</div>
      <div className="table-toolbar__actions">
        {children}
        {onExport && <Button variant="outlined" color="inherit" className="table-toolbar__export" startIcon={<FileDownloadOutlinedIcon />} onClick={onExport}>Export</Button>}
      </div>
    </div>
  );
}
