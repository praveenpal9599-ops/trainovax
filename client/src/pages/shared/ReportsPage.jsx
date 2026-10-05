import { useMemo, useState } from 'react';
import { Button, LinearProgress, ToggleButton, ToggleButtonGroup } from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import FitnessCenterOutlinedIcon from '@mui/icons-material/FitnessCenterOutlined';
import RestaurantMenuOutlinedIcon from '@mui/icons-material/RestaurantMenuOutlined';
import MonitorWeightOutlinedIcon from '@mui/icons-material/MonitorWeightOutlined';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import ChartCard from '../../components/charts/ChartCard';
import BarChartView from '../../components/charts/BarChartView';
import DonutChart from '../../components/charts/DonutChart';
import DataTable from '../../components/table/DataTable';
import StatusChip from '../../components/common/StatusChip';
import ErrorState from '../../components/common/ErrorState';
import useFetch from '../../hooks/useFetch';
import { reportService } from '../../services';
import { useAuth } from '../../features/auth/AuthContext';
import { GOALS, labelOf } from '../../utils/constants';
import { signed } from '../../utils/format';
import { exportCsv } from '../../utils/exportCsv';
import './ReportsPage.css';

const pctCell = (v) => (v == null ? '—' : (
  <div className="reports-page__pct">
    <LinearProgress variant="determinate" value={v} className="progress--thin reports-page__pct-bar" color={v >= 75 ? 'success' : v >= 50 ? 'primary' : 'warning'} />
    <span className="reports-page__pct-value">{v}%</span>
  </div>
));

export default function ReportsPage() {
  const { user, basePath } = useAuth();
  const [days, setDays] = useState(30);
  const [sort, setSort] = useState({ sortBy: 'weight', sortDir: 'asc' });
  const { data, loading, error, reload } = useFetch(() => reportService.overview(days), [days]);
  const rows = useMemo(() => {
    const key = { weight: 'weight_change_kg', attendance: 'attendance_pct', workout: 'workout_completion_pct', diet: 'diet_adherence_pct', name: 'name' }[sort.sortBy];
    return [...(data?.clients || [])].sort((a, b) => {
      const x = a[key]; const y = b[key];
      if (x == null) return 1; if (y == null) return -1;
      return (typeof x === 'string' ? x.localeCompare(y) : x - y) * (sort.sortDir === 'asc' ? 1 : -1);
    });
  }, [data, sort]);
  const s = data?.summary || {};

  const doExport = () => exportCsv(`client-outcomes-${days}d`, [
    { header: 'Client', value: (r) => r.name }, { header: 'Goal', value: (r) => labelOf(GOALS, r.goal) }, { header: 'Status', value: (r) => r.status },
    { header: 'Trainer', value: (r) => r.trainer }, { header: 'Weight change (kg)', value: (r) => r.weight_change_kg }, { header: 'Body fat change (%)', value: (r) => r.body_fat_change },
    { header: 'Waist change (cm)', value: (r) => r.waist_change_cm }, { header: 'Attendance %', value: (r) => r.attendance_pct }, { header: 'Workout completion %', value: (r) => r.workout_completion_pct },
    { header: 'Diet adherence %', value: (r) => r.diet_adherence_pct }, { header: 'Progress updates', value: (r) => r.progress_updates },
  ], rows);

  const columns = [
    { field: 'name', header: 'Client', sortKey: 'name', render: (r) => <div><div className="reports-page__client-name">{r.name}</div><span className="reports-page__client-meta">{labelOf(GOALS, r.goal)}{user.role === 'super_admin' && r.trainer ? ` · ${r.trainer}` : ''}</span></div> },
    { field: 'status', header: 'Status', hideBelow: 'md', render: (r) => <StatusChip status={r.status} /> },
    { field: 'weight', header: 'Weight Δ', sortKey: 'weight', align: 'right', render: (r) => <span className={`reports-page__weight reports-page__weight--${r.weight_change_kg == null ? 'none' : (r.goal === 'muscle_gain' ? r.weight_change_kg > 0 : r.weight_change_kg < 0) ? 'good' : 'neutral'}`}>{signed(r.weight_change_kg, 'kg')}</span> },
    { field: 'bf', header: 'Body fat Δ', align: 'right', hideBelow: 'sm', render: (r) => signed(r.body_fat_change, '%') },
    { field: 'waist', header: 'Waist Δ', align: 'right', hideBelow: 'lg', render: (r) => signed(r.waist_change_cm, 'cm') },
    { field: 'attendance', header: 'Attendance', sortKey: 'attendance', hideBelow: 'md', render: (r) => pctCell(r.attendance_pct) },
    { field: 'workout', header: 'Workout', sortKey: 'workout', hideBelow: 'sm', render: (r) => pctCell(r.workout_completion_pct) },
    { field: 'diet', header: 'Diet', sortKey: 'diet', hideBelow: 'md', render: (r) => pctCell(r.diet_adherence_pct) },
  ];

  return (
    <>
      <PageHeader title="Reports" subtitle={user.role === 'super_admin' ? 'Platform-wide client outcomes and engagement.' : 'Client outcomes, attendance and plan adherence.'}
        breadcrumbs={[{ label: 'Dashboard', to: `${basePath}/dashboard` }, { label: 'Reports' }]}
        actions={(
          <>
            <ToggleButtonGroup size="small" exclusive value={days} onChange={(_, v) => v && setDays(v)} className="reports-page__period" aria-label="Report period">
              {[7, 30, 90, 180, 365].map((d) => <ToggleButton key={d} value={d}>{d === 365 ? '1y' : `${d}d`}</ToggleButton>)}
            </ToggleButtonGroup>
            <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={doExport} disabled={!rows.length}>Export CSV</Button>
          </>
        )} />
      <ErrorState error={error} onRetry={reload} />
      <div className="reports-page__stats">
        <StatCard loading={loading} icon={PeopleAltOutlinedIcon} label="Clients" value={s.clients ?? 0} hint={`${s.active ?? 0} active`} />
        <StatCard loading={loading} icon={EventAvailableOutlinedIcon} label="Avg attendance" value={s.avg_attendance_pct != null ? `${s.avg_attendance_pct}%` : '—'} color="success" />
        <StatCard loading={loading} icon={FitnessCenterOutlinedIcon} label="Workout completion" value={s.avg_workout_completion_pct != null ? `${s.avg_workout_completion_pct}%` : '—'} color="primary" />
        <StatCard loading={loading} icon={RestaurantMenuOutlinedIcon} label="Diet adherence" value={s.avg_diet_adherence_pct != null ? `${s.avg_diet_adherence_pct}%` : '—'} color="info" />
        <StatCard loading={loading} icon={MonitorWeightOutlinedIcon} label="Total weight change" value={signed(s.total_weight_change_kg, 'kg')} hint="all clients, since start" color="secondary" />
      </div>
      <div className="reports-page__charts">
        <div>
          <ChartCard title="Average weight change by goal" subtitle="Since each client's first measurement" loading={loading} empty={!data?.byGoal?.length} height={260}>
            <BarChartView data={(data?.byGoal || []).map((g) => ({ ...g, goal: labelOf(GOALS, g.goal) }))} xKey="goal" series={[{ key: 'avg_weight_change_kg', label: 'Avg change' }]} unit="kg"
              colorByValue={(v) => (v < 0 ? '#1565C0' : '#42A5F5')} />
          </ChartCard>
        </div>
        <div>
          <ChartCard title="Clients by goal" loading={loading} empty={!data?.byGoal?.length} height={260}>
            <DonutChart height={180} data={(data?.byGoal || []).map((g) => ({ name: labelOf(GOALS, g.goal), value: g.clients }))} centerLabel="clients" />
          </ChartCard>
        </div>
      </div>
      <h2 className="reports-page__table-title">Client outcomes</h2>
      <DataTable columns={columns} rows={rows} loading={loading} pagination={false} sort={sort} onSortChange={setSort} dense />
    </>
  );
}
