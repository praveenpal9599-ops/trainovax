import { useMemo, useState } from 'react';
import { Button, IconButton, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Table, TableBody, TableCell, TableHead, TableRow, TableContainer } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MonitorWeightOutlinedIcon from '@mui/icons-material/MonitorWeightOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import useFetch from '../../hooks/useFetch';
import { progressService } from '../../services';
import ChartCard from '../../components/charts/ChartCard';
import TrendChart from '../../components/charts/TrendChart';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import SectionCard from '../../components/common/SectionCard';
import MeasurementDialog from './MeasurementDialog';
import { useFeedback } from '../feedback/FeedbackProvider';
import { MEASUREMENTS, RANGE_PRESETS } from '../../utils/constants';
import { formatDate, formatShortDate, num, signed, todayISO, addDaysISO } from '../../utils/format';
import { exportCsv } from '../../utils/exportCsv';
import { chartColors } from '../../theme/theme';
import './ProgressDashboard.css';

const CHARTS = [
  { key: 'weight_kg', title: 'Weight progress', unit: 'kg', color: chartColors[0] },
  { key: 'body_fat_pct', title: 'Body fat progress', unit: '%', color: chartColors[3] },
  { key: 'chest_cm', title: 'Chest progress', unit: 'cm', color: chartColors[1] },
  { key: 'waist_cm', title: 'Waist progress', unit: 'cm', color: chartColors[2] },
  { key: 'arms_cm', title: 'Arms progress', unit: 'cm', color: chartColors[4] },
  { key: 'thighs_cm', title: 'Thigh progress', unit: 'cm', color: chartColors[5] },
];
const LOWER_IS_BETTER = new Set(['weight_kg', 'body_fat_pct', 'waist_cm', 'hips_cm', 'bmi']);

/** Summary delta tile — colour reflects whether the change moves toward the goal. */
function DeltaTile({ label, unit, s, goal }) {
  const lowerBetter = LOWER_IS_BETTER.has(label.key) && !(goal === 'muscle_gain' && label.key === 'weight_kg');
  const good = s?.change == null || s.change === 0 ? null : lowerBetter ? s.change < 0 : s.change > 0;
  const tone = good == null ? 'text-muted' : good ? 'text-success' : 'text-error';
  return (
    <div className="card progress-dash__tile">
      <span className="progress-dash__tile-label">{label.label}</span>
      <p className="progress-dash__tile-value">{num(s?.current)}<span className="progress-dash__tile-unit"> {unit}</span></p>
      <div className="progress-dash__tile-foot">
        <span className={`progress-dash__tile-change ${tone}`}>{signed(s?.change, unit)}</span>
        <span className="text-caption text-disabled">from {num(s?.start)}</span>
      </div>
    </div>
  );
}

export default function ProgressDashboard({ clientId, heightCm, goal, canEdit = true, showTable = true, onChanged }) {
  const { confirm, notify, notifyError } = useFeedback();
  const [range, setRange] = useState('6m');
  const [custom, setCustom] = useState({ from: addDaysISO(todayISO(), -90), to: todayISO() });
  const [dialog, setDialog] = useState({ open: false, record: null });
  const params = range === 'all' ? {} : range === 'custom' ? { range, ...custom } : { range };
  const { data, loading, error, reload } = useFetch(() => progressService.list(clientId, params), [clientId, range, custom.from, custom.to], { enabled: !!clientId });
  const rows = data?.data || [];
  const chartData = useMemo(() => rows.map((r) => ({ ...r, date: r.record_date })), [rows]);
  const effectiveGoal = goal || data?.client?.fitness_goal;

  const remove = async (r) => {
    if (!(await confirm({ title: 'Delete measurement?', message: `The measurement from ${formatDate(r.record_date)} will be removed.`, confirmText: 'Delete', danger: true }))) return;
    try { await progressService.remove(r.id); notify('Measurement deleted'); reload(); onChanged?.(); } catch (e) { notifyError(e); }
  };
  const doExport = () => exportCsv(`progress-${data?.client?.full_name || clientId}`, [
    { header: 'Date', value: (r) => r.record_date }, ...MEASUREMENTS.map((m) => ({ header: `${m.label}${m.unit ? ` (${m.unit})` : ''}`, value: (r) => r[m.key] })), { header: 'Notes', value: (r) => r.notes },
  ], rows);

  return (
    <div className="progress-dash">
      <div className="progress-dash__toolbar">
        <div className="progress-dash__ranges">
          <ToggleButtonGroup size="small" exclusive value={range} onChange={(_, v) => v && setRange(v)} aria-label="Date range">
            {RANGE_PRESETS.map((r) => <ToggleButton key={r.value} value={r.value} className="progress-dash__range">{r.label}</ToggleButton>)}
          </ToggleButtonGroup>
        </div>
        <div className="row row--wrap">
          {range === 'custom' && (
            <>
              <TextField type="date" label="From" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} InputLabelProps={{ shrink: true }} className="progress-dash__date" />
              <TextField type="date" label="To" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} InputLabelProps={{ shrink: true }} className="progress-dash__date" />
            </>
          )}
          {rows.length > 0 && <Button variant="outlined" color="inherit" startIcon={<FileDownloadOutlinedIcon />} onClick={doExport} className="progress-dash__export">Export</Button>}
          {canEdit && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ open: true, record: null })}>Add measurement</Button>}
        </div>
      </div>

      <ErrorState error={error} onRetry={reload} />

      {!loading && rows.length === 0 ? (
        <div className="card"><EmptyState icon={MonitorWeightOutlinedIcon} title="No measurements in this period" description="Record weight, body-fat and body measurements to start seeing progress charts."
          action={canEdit && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ open: true, record: null })}>Add first measurement</Button>} /></div>
      ) : (
        <>
          <div className="progress-dash__tiles">
            {['weight_kg', 'body_fat_pct', 'bmi', 'waist_cm', 'chest_cm', 'arms_cm'].map((k) => {
              const m = MEASUREMENTS.find((x) => x.key === k);
              return <DeltaTile key={k} label={m} unit={m.unit} s={data?.summary?.[k]} goal={effectiveGoal} />;
            })}
          </div>
          <div className="progress-dash__charts">
            {CHARTS.map((c) => {
              const has = chartData.filter((d) => d[c.key] != null).length;
              return (
                <ChartCard key={c.key} title={c.title} subtitle={data?.summary?.[c.key]?.change != null ? `${signed(data.summary[c.key].change, c.unit)} in selected period` : undefined}
                  loading={loading} empty={has < 1} height={230}>
                  <TrendChart data={chartData} series={[{ key: c.key, label: c.title.replace(' progress', ''), color: c.color }]} unit={c.unit} xFormatter={formatShortDate} />
                </ChartCard>
              );
            })}
          </div>

          {showTable && (
            <div className="progress-dash__history">
              <SectionCard title="Measurement history" subtitle={`${rows.length} record${rows.length === 1 ? '' : 's'}`} noPadding>
                <TableContainer className="progress-dash__table-wrap">
                  <Table size="small" className="progress-dash__table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        {MEASUREMENTS.map((m) => <TableCell key={m.key} align="right">{m.label}{m.unit ? ` (${m.unit})` : ''}</TableCell>)}
                        <TableCell>Notes</TableCell>
                        {canEdit && <TableCell align="right" />}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[...rows].reverse().map((r) => (
                        <TableRow key={r.id} hover>
                          <TableCell className="progress-dash__cell-date">{formatDate(r.record_date)}</TableCell>
                          {MEASUREMENTS.map((m) => <TableCell key={m.key} align="right">{num(r[m.key])}</TableCell>)}
                          <TableCell className="progress-dash__cell-notes"><span className="truncate progress-dash__notes" title={r.notes || ''}>{r.notes || '—'}</span></TableCell>
                          {canEdit && (
                            <TableCell align="right" className="nowrap">
                              <Tooltip title="Edit"><IconButton size="small" onClick={() => setDialog({ open: true, record: r })} aria-label="Edit measurement"><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                              <Tooltip title="Delete"><IconButton size="small" onClick={() => remove(r)} aria-label="Delete measurement"><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </SectionCard>
            </div>
          )}
        </>
      )}

      <MeasurementDialog open={dialog.open} record={dialog.record} clientId={clientId} heightCm={heightCm ?? data?.client?.height_cm}
        onClose={() => setDialog({ open: false, record: null })} onSaved={() => { setDialog({ open: false, record: null }); reload(); onChanged?.(); }} />
    </div>
  );
}
