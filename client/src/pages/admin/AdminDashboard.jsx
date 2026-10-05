import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, List, ListItemButton, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton, ToggleButtonGroup } from '@mui/material';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import FitnessCenterOutlinedIcon from '@mui/icons-material/FitnessCenterOutlined';
import RestaurantMenuOutlinedIcon from '@mui/icons-material/RestaurantMenuOutlined';
import MonitorWeightOutlinedIcon from '@mui/icons-material/MonitorWeightOutlined';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import AddIcon from '@mui/icons-material/Add';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import SectionCard from '../../components/common/SectionCard';
import ChartCard from '../../components/charts/ChartCard';
import TrendChart from '../../components/charts/TrendChart';
import BarChartView from '../../components/charts/BarChartView';
import DonutChart from '../../components/charts/DonutChart';
import ProgressRing from '../../components/common/ProgressRing';
import UserAvatar from '../../components/common/UserAvatar';
import StatusChip from '../../components/common/StatusChip';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import TasksWidget from '../../features/clients/TasksWidget';
import useFetch from '../../hooks/useFetch';
import { dashboardService } from '../../services';
import { useAuth } from '../../features/auth/AuthContext';
import { GOALS, labelOf } from '../../utils/constants';
import { formatMonth, formatShortDate, greeting, num, signed, timeAgo } from '../../utils/format';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [weightView, setWeightView] = useState('trend');
  const { data, loading, error, reload } = useFetch(() => dashboardService.admin(), []);
  const s = data?.stats || {};
  const dayLabel = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' });

  return (
    <>
      <PageHeader title={`${greeting()}, ${user.name.split(' ')[0]}`} subtitle="Here's your fitness business overview."
        actions={(
          <>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => navigate('/admin/workouts/new')}>Create workout</Button>
            <Button variant="contained" startIcon={<PersonAddAlt1OutlinedIcon />} onClick={() => navigate('/admin/clients')}>Add client</Button>
          </>
        )} />
      <ErrorState error={error} onRetry={reload} />

      <div className="admin-dash__stats">
        <StatCard loading={loading} icon={PeopleAltOutlinedIcon} label="Total clients" value={s.total_clients ?? 0} hint={s.new_this_month ? `+${s.new_this_month} this month` : 'all time'} onClick={() => navigate('/admin/clients')} />
        <StatCard loading={loading} icon={HowToRegOutlinedIcon} label="Active" value={s.active_clients ?? 0} color="success" hint={s.total_clients ? `${Math.round((100 * s.active_clients) / s.total_clients)}% of clients` : undefined} />
        <StatCard loading={loading} icon={PersonOffOutlinedIcon} label="Inactive" value={s.inactive_clients ?? 0} color="warning" />
        <StatCard loading={loading} icon={FitnessCenterOutlinedIcon} label="Workout plans" value={s.workout_plans ?? 0} hint="active" onClick={() => navigate('/admin/workouts')} />
        <StatCard loading={loading} icon={RestaurantMenuOutlinedIcon} label="Diet plans" value={s.diet_plans ?? 0} hint="active" color="info" onClick={() => navigate('/admin/diets')} />
        <StatCard loading={loading} icon={MonitorWeightOutlinedIcon} label="Progress updates" value={s.progress_updates ?? 0} hint="last 30 days" color="secondary" onClick={() => navigate('/admin/progress')} />
      </div>

      <div className="admin-dash__row admin-dash__row--wide-narrow">
        <div>
          <ChartCard title="Client weight progress" subtitle={weightView === 'trend' ? 'Average change from starting weight (kg)' : 'Change since start, per client'} loading={loading} height={290}
            empty={weightView === 'trend' ? !data?.weightTrend?.some((w) => w.avg_change_kg != null) : !data?.clientWeightChange?.length}
            action={<ToggleButtonGroup size="small" exclusive value={weightView} onChange={(_, v) => v && setWeightView(v)}><ToggleButton value="trend">Trend</ToggleButton><ToggleButton value="clients">By client</ToggleButton></ToggleButtonGroup>}>
            {weightView === 'trend'
              ? <TrendChart data={data?.weightTrend || []} xKey="month" xFormatter={formatMonth} series={[{ key: 'avg_change_kg', label: 'Avg change' }]} unit="kg" referenceY={0} />
              : <BarChartView layout="vertical" data={(data?.clientWeightChange || []).map((c) => ({ ...c, name: c.name.split(' ')[0] }))} xKey="name" series={[{ key: 'change_kg', label: 'Change' }]} unit="kg" colorByValue={(v) => (v < 0 ? '#1565C0' : '#42A5F5')} />}
          </ChartCard>
        </div>
        <div>
          <ChartCard title="Workout completion" subtitle="Last 7 days · all active clients" loading={loading} height={290} empty={!data?.adherence?.some((d) => d.workout_scheduled)}>
            <div className="admin-dash__completion">
              <div className="admin-dash__completion-ring"><ProgressRing value={s.workout_completion_pct} size={110} sublabel="completed" /></div>
              <div className="admin-dash__completion-chart">
                <BarChartView data={data?.adherence || []} xKey="date" xFormatter={dayLabel}
                  series={[{ key: 'workout_completed', label: 'Completed', stackId: 'a', color: '#1565C0' }, { key: 'workout_skipped', label: 'Skipped', stackId: 'a', color: '#FFA726' }]} />
              </div>
            </div>
          </ChartCard>
        </div>
      </div>

      <div className="admin-dash__row admin-dash__row--thirds">
        <div>
          <ChartCard title="Diet adherence" subtitle={`${s.diet_adherence_pct ?? 0}% of scheduled meals followed (7 days)`} loading={loading} height={220} empty={!data?.adherence?.some((d) => d.diet_scheduled)}>
            <TrendChart data={data?.adherence || []} xFormatter={dayLabel} series={[{ key: 'diet_pct', label: 'Adherence', color: '#26A69A' }]} unit="%" domain={[0, 100]} />
          </ChartCard>
        </div>
        <div>
          <ChartCard title="Clients by goal" loading={loading} height={220} empty={!data?.goals?.length}>
            <DonutChart height={140} data={(data?.goals || []).map((g) => ({ name: labelOf(GOALS, g.goal), value: g.count }))} centerLabel="clients" />
          </ChartCard>
        </div>
        <div className="admin-dash__attention">
          <SectionCard title="Needs attention" subtitle="No progress update in 14+ days">
            {(data?.attention || []).length === 0 ? <EmptyState compact title="Everyone is up to date" /> : (
              <List disablePadding>
                {data.attention.map((c) => (
                  <ListItemButton key={c.id} onClick={() => navigate(`/admin/clients/${c.id}?tab=progress`)} className="admin-dash__attention-item">
                    <UserAvatar name={c.full_name} src={c.photo_url} size={32} />
                    <div className="flex-1"><p className="admin-dash__name">{c.full_name}</p><span className="text-caption text-warning">{c.last_progress_date ? `Last update ${timeAgo(c.last_progress_date)}` : 'No measurements yet'}</span></div>
                    <WarningAmberRoundedIcon fontSize="small" color="warning" />
                  </ListItemButton>
                ))}
              </List>
            )}
          </SectionCard>
        </div>
      </div>

      <div className="admin-dash__row admin-dash__row--wide-narrow">
        <div>
          <SectionCard title="Recent clients" action={<Button size="small" onClick={() => navigate('/admin/clients')}>View all</Button>} noPadding>
            <div className="admin-dash__table-wrap">
              <Table size="small">
                <TableHead><TableRow><TableCell>Client</TableCell><TableCell>Goal</TableCell><TableCell align="right">Weight</TableCell><TableCell>Status</TableCell><TableCell className="admin-dash__col-sm">Last update</TableCell></TableRow></TableHead>
                <TableBody>
                  {(data?.recentClients || []).map((c) => (
                    <TableRow key={c.id} hover className="admin-dash__row-link" onClick={() => navigate(`/admin/clients/${c.id}`)}>
                      <TableCell><div className="admin-dash__client"><UserAvatar name={c.full_name} src={c.photo_url} size={30} /><span className="admin-dash__name nowrap">{c.full_name}</span></div></TableCell>
                      <TableCell><span className="nowrap">{labelOf(GOALS, c.fitness_goal)}</span></TableCell>
                      <TableCell align="right"><p className="admin-dash__name">{num(c.current_weight_kg)} kg</p><span className="text-caption text-muted">{signed(c.current_weight_kg - c.starting_weight_kg, 'kg')}</span></TableCell>
                      <TableCell><StatusChip status={c.status} /></TableCell>
                      <TableCell className="admin-dash__col-sm">{c.last_progress_date ? formatShortDate(c.last_progress_date) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!loading && !data?.recentClients?.length && <EmptyState compact title="No clients yet" action={<Button variant="contained" onClick={() => navigate('/admin/clients')}>Add client</Button>} />}
            </div>
          </SectionCard>
        </div>
        <div>
          <TasksWidget tasks={data?.tasks || []} onChange={() => reload({ silent: true })} />
        </div>
      </div>
    </>
  );
}
