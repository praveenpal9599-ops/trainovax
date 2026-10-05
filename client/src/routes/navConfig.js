import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import FitnessCenterOutlinedIcon from '@mui/icons-material/FitnessCenterOutlined';
import RestaurantMenuOutlinedIcon from '@mui/icons-material/RestaurantMenuOutlined';
import ViewQuiltOutlinedIcon from '@mui/icons-material/ViewQuiltOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import CardMembershipOutlinedIcon from '@mui/icons-material/CardMembershipOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import MonitorWeightOutlinedIcon from '@mui/icons-material/MonitorWeightOutlined';
import SportsGymnasticsOutlinedIcon from '@mui/icons-material/SportsGymnasticsOutlined';
import EggAltOutlinedIcon from '@mui/icons-material/EggAltOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined';

export const SUPER_ADMIN_NAV = [
  { section: 'Overview', items: [{ label: 'Dashboard', to: '/super-admin/dashboard', icon: DashboardOutlinedIcon }] },
  {
    section: 'Platform', items: [
      { label: 'Organizations', to: '/super-admin/organizations', icon: BusinessOutlinedIcon },
      { label: 'Admins & Trainers', to: '/super-admin/trainers', icon: BadgeOutlinedIcon },
      { label: 'Clients', to: '/super-admin/clients', icon: PeopleAltOutlinedIcon },
      { label: 'Subscriptions', to: '/super-admin/subscriptions', icon: CardMembershipOutlinedIcon },
    ],
  },
  {
    section: 'Content', items: [
      { label: 'Exercise Master', to: '/super-admin/exercises', icon: SportsGymnasticsOutlinedIcon },
      { label: 'Food Master', to: '/super-admin/foods', icon: EggAltOutlinedIcon },
      { label: 'Workout Templates', to: '/super-admin/workout-templates', icon: ViewQuiltOutlinedIcon },
      { label: 'Diet Templates', to: '/super-admin/diet-templates', icon: MenuBookOutlinedIcon },
    ],
  },
  {
    section: 'Insights & system', items: [
      { label: 'Reports', to: '/super-admin/reports', icon: AssessmentOutlinedIcon },
      { label: 'Notifications', to: '/super-admin/notifications', icon: NotificationsNoneOutlinedIcon },
      { label: 'Messages', to: '/super-admin/messages', icon: ChatBubbleOutlineIcon, badge: 'messages' },
      { label: 'System Settings', to: '/super-admin/settings', icon: SettingsOutlinedIcon },
      { label: 'Audit Logs', to: '/super-admin/audit-logs', icon: HistoryOutlinedIcon },
    ],
  },
];

export const ADMIN_NAV = [
  { section: 'Overview', items: [{ label: 'Dashboard', to: '/admin/dashboard', icon: DashboardOutlinedIcon }] },
  {
    section: 'Coaching', items: [
      { label: 'Clients', to: '/admin/clients', icon: PeopleAltOutlinedIcon },
      { label: 'Trainers', to: '/admin/trainers', icon: BadgeOutlinedIcon },
      { label: 'Workout Plans', to: '/admin/workouts', icon: FitnessCenterOutlinedIcon },
      { label: 'Diet Plans', to: '/admin/diets', icon: RestaurantMenuOutlinedIcon },
      { label: 'Progress Tracking', to: '/admin/progress', icon: MonitorWeightOutlinedIcon },
      { label: 'Messages', to: '/admin/messages', icon: ChatBubbleOutlineIcon, badge: 'messages' },
    ],
  },
  {
    section: 'Library', items: [
      { label: 'Exercise Library', to: '/admin/exercises', icon: SportsGymnasticsOutlinedIcon },
      { label: 'Food Library', to: '/admin/foods', icon: EggAltOutlinedIcon },
      { label: 'Workout Templates', to: '/admin/workout-templates', icon: ViewQuiltOutlinedIcon },
      { label: 'Diet Templates', to: '/admin/diet-templates', icon: MenuBookOutlinedIcon },
    ],
  },
  {
    section: 'Business', items: [
      { label: 'Reports', to: '/admin/reports', icon: AssessmentOutlinedIcon },
      { label: 'Notifications', to: '/admin/notifications', icon: NotificationsNoneOutlinedIcon },
      { label: 'Settings', to: '/admin/settings', icon: SettingsOutlinedIcon },
    ],
  },
];

export const CLIENT_NAV = [
  { label: 'Home', to: '/client/dashboard', icon: HomeOutlinedIcon, mobile: true },
  { label: 'Workout', to: '/client/workout', icon: FitnessCenterOutlinedIcon, mobile: true },
  { label: 'Diet', to: '/client/diet', icon: RestaurantMenuOutlinedIcon, mobile: true },
  { label: 'Progress', to: '/client/progress', icon: TimelineOutlinedIcon, mobile: true },
  { label: 'Photos', to: '/client/photos', icon: PhotoLibraryOutlinedIcon },
  { label: 'Messages', to: '/client/messages', icon: ChatBubbleOutlineIcon, badge: 'messages' },
  { label: 'Profile', to: '/client/profile', icon: PersonOutlineIcon },
];

import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined';
import MonitorWeightOutlined from '@mui/icons-material/MonitorWeightOutlined';

/** Bottom tab bar + avatar menu for the Trainer mobile app. */
export const TRAINER_TABS = [
  { label: 'Home', to: '/trainer/dashboard', icon: HomeOutlinedIcon },
  { label: 'Clients', to: '/trainer/clients', icon: PeopleAltOutlinedIcon },
  { label: 'Workouts', to: '/trainer/workouts', icon: FitnessCenterOutlinedIcon },
  { label: 'Diet', to: '/trainer/diets', icon: RestaurantMenuOutlinedIcon },
  { label: 'Chat', to: '/trainer/messages', icon: ChatBubbleOutlineIcon, badge: 'messages' },
];
export const TRAINER_MENU = [
  { label: 'Progress tracking', to: '/trainer/progress', icon: MonitorWeightOutlined },
  { label: 'Exercise & food library', to: '/trainer/library', icon: MenuBookOutlined },
  { label: 'Notifications', to: '/trainer/notifications', icon: NotificationsNoneOutlined },
];

/** Bottom tab bar + avatar menu for the Client mobile app. */
export const CLIENT_TABS = [
  { label: 'Home', to: '/client/dashboard', icon: HomeOutlinedIcon },
  { label: 'Workout', to: '/client/workout', icon: FitnessCenterOutlinedIcon },
  { label: 'Diet', to: '/client/diet', icon: RestaurantMenuOutlinedIcon },
  { label: 'Progress', to: '/client/progress', icon: TimelineOutlinedIcon },
  { label: 'Chat', to: '/client/messages', icon: ChatBubbleOutlineIcon, badge: 'messages' },
];
export const CLIENT_MENU = [
  { label: 'My profile', to: '/client/profile', icon: PersonOutlineIcon },
  { label: 'Progress photos', to: '/client/photos', icon: PhotoLibraryOutlinedIcon },
  { label: 'Notifications', to: '/client/notifications', icon: NotificationsNoneOutlined },
];
