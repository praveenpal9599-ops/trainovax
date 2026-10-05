import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import ChatIcon from '@mui/icons-material/Chat';
import AlarmIcon from '@mui/icons-material/Alarm';
import CampaignIcon from '@mui/icons-material/Campaign';
import MonitorWeightIcon from '@mui/icons-material/MonitorWeight';
import BusinessIcon from '@mui/icons-material/Business';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CelebrationIcon from '@mui/icons-material/Celebration';

const META = {
  workout_plan: { icon: FitnessCenterIcon, color: 'primary' },
  diet_plan: { icon: RestaurantIcon, color: 'success' },
  message: { icon: ChatIcon, color: 'info' },
  reminder: { icon: AlarmIcon, color: 'warning' },
  announcement: { icon: CampaignIcon, color: 'secondary' },
  progress: { icon: MonitorWeightIcon, color: 'primary' },
  organization: { icon: BusinessIcon, color: 'primary' },
  subscription: { icon: CardMembershipIcon, color: 'success' },
  welcome: { icon: CelebrationIcon, color: 'secondary' },
};
export const notificationMeta = (type) => META[type] || { icon: NotificationsIcon, color: 'primary' };
