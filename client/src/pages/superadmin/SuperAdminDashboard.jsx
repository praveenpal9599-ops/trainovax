import { useNavigate } from 'react-router-dom';
import { Button, List, ListItem, ListItemButton } from '@mui/material';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import CurrencyRupeeOutlinedIcon from '@mui/icons-material/CurrencyRupeeOutlined';
import SportsGymnasticsOutlinedIcon from '@mui/icons-material/SportsGymnasticsOutlined';
import EggAltOutlinedIcon from '@mui/icons-material/EggAltOutlined';
import ViewQuiltOutlinedIcon from '@mui/icons-material/ViewQuiltOutlined';
import CardMembershipOutlinedIcon from '@mui/icons-material/CardMembershipOutlined';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import SectionCard from '../../components/common/SectionCard';
import ChartCard from '../../components/charts/ChartCard';
import TrendChart from '../../components/charts/TrendChart';
import BarChartView from '../../components/charts/BarChartView';
import DonutChart from '../../components/charts/DonutChart';
import StatusChip from '../../components/common/StatusChip';
import ErrorState from '../../components/common/ErrorState';
import useFetch from '../../hooks/useFetch';
import { dashboardService } from '../../services';
import { useAuth } from '../../features/auth/AuthContext';
import { GOALS, labelOf } from '../../utils/constants';
import { currency, formatMonth, greeting, timeAgo } from '../../utils/format';
import './SuperAdminDashboard.css';

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useFetch(() => dashboardService.superAdmin(), []);
  const s = data?.stats || {};
  return (
    <>
      <PageHeader title={`${greeting()}, ${user.name.split(' ')[0]}`} subtitle="Platform health across every organization, trainer and client."
        actions={<Button variant="contained" startIcon={<BusinessOutlinedIcon />} onClick={() => navigate('/super-admin/organizations')}>Manage organizations</Button>} />
      <ErrorState error={error} onRetry={reload} />
      <div className="sa-dash__stats sa-dash__stats--main">
        <StatCard loading={loading} icon={BusinessOutlinedIcon} label="Organizations" value={s.organizations ?? 0} hint={`${s.active_organizations ?? 0} active`} onClick={() => navigate('/super-admin/organizations')} />
        <StatCard loading={loading} icon={BadgeOutlinedIcon} label="Trainers" value={s.trainers ?? 0} color="secondary" onClick={() => navigate('/super-admin/trainers')} />
        <StatCard loading={loading} icon={PeopleAltOutlinedIcon} label="Clients" value={s.clients ?? 0} hint={`${s.active_clients ?? 0} active`} color="success" onClick={() => navigate('/super-admin/clients')} />
        <StatCard loading={loading} icon={CurrencyRupeeOutlinedIcon} label="Monthly recurring revenue" value={currency(s.mrr)} hint={`${s.active_subscriptions ?? 0} active / trial subscriptions`} color="info" onClick={() => navigate('/super-admin/subscriptions')} />
      </div>
      <div className="sa-dash__stats sa-dash__stats--library">
        <StatCard loading={loading} icon={SportsGymnasticsOutlinedIcon} label="Exercises" value={s.exercises ?? 0} onClick={() => navigate('/super-admin/exercises')} />
        <StatCard loading={loading} icon={EggAltOutlinedIcon} label="Foods" value={s.foods ?? 0} onClick={() => navigate('/super-admin/foods')} />
        <StatCard loading={loading} icon={ViewQuiltOutlinedIcon} label="Templates" value={s.templates ?? 0} hint="workout + diet" onClick={() => navigate('/super-admin/workout-templates')} />
        <StatCard loading={loading} icon={CardMembershipOutlinedIcon} label="Active plans" value={(s.active_workout_plans ?? 0) + (s.active_diet_plans ?? 0)} hint={`${s.active_workout_plans ?? 0} workout · ${s.active_diet_plans ?? 0} diet`} />
      </div>
      <div className="sa-dash__row sa-dash__row--wide-narrow">
        <div>
          <ChartCard title="Platform growth" subtitle="Cumulative clients and new sign-ups — last 12 months" loading={loading} height={290} empty={!data?.growth?.length}>
            <TrendChart data={data?.growth || []} xKey="month" xFormatter={formatMonth} area={false} series={[{ key: 'cumulative_clients', label: 'Total clients' }, { key: 'clients', label: 'New clients' }, { key: 'organizations', label: 'New organizations' }]} />
          </ChartCard>
        </div>
        <div>
          <ChartCard title="Subscriptions by plan" loading={loading} height={290} empty={!data?.byPlan?.length}>
            <BarChartView data={data?.byPlan || []} xKey="plan" series={[{ key: 'count', label: 'Subscriptions' }]} />
          </ChartCard>
        </div>
      </div>
      <div className="sa-dash__row sa-dash__row--thirds">
        <div>
          <ChartCard title="Clients by goal" loading={loading} height={230} empty={!data?.goals?.length}>
            <DonutChart height={150} data={(data?.goals || []).map((g) => ({ name: labelOf(GOALS, g.goal), value: g.count }))} centerLabel="clients" />
          </ChartCard>
        </div>
        <div>
          <SectionCard title="Top organizations" subtitle="By number of clients" action={<Button size="small" onClick={() => navigate('/super-admin/organizations')}>All</Button>}>
            <List disablePadding>
              {(data?.topOrgs || []).map((o, i) => (
                <ListItemButton key={o.id} className="sa-dash__org" onClick={() => navigate('/super-admin/organizations')}>
                  <span className="sa-dash__rank">{i + 1}</span>
                  <div className="flex-1"><p className="sa-dash__org-name">{o.name}</p><span className="text-caption text-muted">{o.city}</span></div>
                  <span className="sa-dash__org-count">{o.clients}</span>
                </ListItemButton>
              ))}
            </List>
          </SectionCard>
        </div>
        <div className="sa-dash__activity">
          <SectionCard title="Recent activity" action={<Button size="small" onClick={() => navigate('/super-admin/audit-logs')}>Audit log</Button>}>
            <List disablePadding>
              {(data?.activity || []).map((a) => (
                <ListItem key={a.id} disableGutters className="sa-dash__activity-item">
                  <div className="sa-dash__activity-body">
                    <div className="row"><StatusChip status="open" label={a.action} /><span className="text-caption text-muted">{timeAgo(a.created_at)}</span></div>
                    <p className="sa-dash__activity-desc truncate" title={a.description}>{a.description}</p>
                    <span className="text-caption text-muted">{a.user_name || 'System'}</span>
                  </div>
                </ListItem>
              ))}
            </List>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
