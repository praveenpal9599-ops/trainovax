import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute, { HomeRedirect } from './ProtectedRoute';
import DashboardLayout from '../layouts/DashboardLayout';
import MobileAppLayout from '../layouts/MobileAppLayout';
import LoadingScreen from '../components/common/LoadingScreen';
import { ADMIN_NAV, SUPER_ADMIN_NAV, TRAINER_TABS, TRAINER_MENU, CLIENT_TABS, CLIENT_MENU } from './navConfig';

const L = (f) => lazy(f);
// Auth
const LoginPage = L(() => import('../pages/auth/LoginPage'));
const RegisterPage = L(() => import('../pages/auth/RegisterPage'));
const ForgotPasswordPage = L(() => import('../pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = L(() => import('../pages/auth/ResetPasswordPage'));
// Shared
const ClientsPage = L(() => import('../pages/shared/ClientsPage'));
const ClientProfilePage = L(() => import('../pages/shared/ClientProfilePage'));
const ExercisesPage = L(() => import('../pages/shared/ExercisesPage'));
const FoodsPage = L(() => import('../pages/shared/FoodsPage'));
const TemplatesPage = L(() => import('../pages/shared/TemplatesPage'));
const PlansPage = L(() => import('../pages/shared/PlansPage'));
const WorkoutEditorPage = L(() => import('../pages/shared/WorkoutEditorPage'));
const DietEditorPage = L(() => import('../pages/shared/DietEditorPage'));
const ProgressPage = L(() => import('../pages/shared/ProgressPage'));
const MessagesPage = L(() => import('../pages/shared/MessagesPage'));
const NotificationsPage = L(() => import('../pages/shared/NotificationsPage'));
const ReportsPage = L(() => import('../pages/shared/ReportsPage'));
const AccountPage = L(() => import('../pages/shared/AccountPage'));
const NotFoundPage = L(() => import('../pages/shared/NotFoundPage'));
// Super admin
const SuperAdminDashboard = L(() => import('../pages/superadmin/SuperAdminDashboard'));
const OrganizationsPage = L(() => import('../pages/superadmin/OrganizationsPage'));
const TrainersPage = L(() => import('../pages/superadmin/TrainersPage'));
const SubscriptionsPage = L(() => import('../pages/superadmin/SubscriptionsPage'));
const SystemSettingsPage = L(() => import('../pages/superadmin/SystemSettingsPage'));
const AuditLogsPage = L(() => import('../pages/superadmin/AuditLogsPage'));
// Admin / trainer
const AdminDashboard = L(() => import('../pages/admin/AdminDashboard'));
const AdminSettingsPage = L(() => import('../pages/admin/AdminSettingsPage'));
// Trainer (mobile app)
const TrainerHome = L(() => import('../pages/trainer/TrainerHome'));
const TrainerClients = L(() => import('../pages/trainer/TrainerClients'));
const TrainerClientDetail = L(() => import('../pages/trainer/TrainerClientDetail'));
const TrainerPlans = L(() => import('../pages/trainer/TrainerPlans'));
const MobileWorkoutEditor = L(() => import('../pages/trainer/MobileWorkoutEditor'));
const MobileDietEditor = L(() => import('../pages/trainer/MobileDietEditor'));
const TrainerProgress = L(() => import('../pages/trainer/TrainerProgress'));
const TrainerLibrary = L(() => import('../pages/trainer/TrainerLibrary'));
// Client
const ClientDashboard = L(() => import('../pages/client/ClientDashboard'));
const MyWorkoutPage = L(() => import('../pages/client/MyWorkoutPage'));
const MyDietPage = L(() => import('../pages/client/MyDietPage'));
const MyProgressPage = L(() => import('../pages/client/MyProgressPage'));
const MyPhotosPage = L(() => import('../pages/client/MyPhotosPage'));
const MyProfilePage = L(() => import('../pages/client/MyProfilePage'));

/** Routes shared by the Super Admin and Admin panels (content + client management). */
const sharedRoutes = (
  <>
    <Route path="clients" element={<ClientsPage />} />
    <Route path="clients/:id" element={<ClientProfilePage />} />
    <Route path="exercises" element={<ExercisesPage />} />
    <Route path="foods" element={<FoodsPage />} />
    <Route path="workout-templates" element={<TemplatesPage kind="workout" />} />
    <Route path="workout-templates/new" element={<WorkoutEditorPage mode="template" />} />
    <Route path="workout-templates/:id" element={<WorkoutEditorPage mode="template" />} />
    <Route path="diet-templates" element={<TemplatesPage kind="diet" />} />
    <Route path="diet-templates/new" element={<DietEditorPage mode="template" />} />
    <Route path="diet-templates/:id" element={<DietEditorPage mode="template" />} />
    <Route path="workouts/new" element={<WorkoutEditorPage mode="plan" />} />
    <Route path="workouts/:id" element={<WorkoutEditorPage mode="plan" />} />
    <Route path="diets/new" element={<DietEditorPage mode="plan" />} />
    <Route path="diets/:id" element={<DietEditorPage mode="plan" />} />
    <Route path="reports" element={<ReportsPage />} />
    <Route path="messages" element={<MessagesPage />} />
    <Route path="notifications" element={<NotificationsPage />} />
    <Route path="account" element={<AccountPage />} />
  </>
);

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen fullScreen />}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute roles={['super_admin']} />}>
          <Route path="/super-admin" element={<DashboardLayout nav={SUPER_ADMIN_NAV} subtitle="Super Admin" basePath="/super-admin" />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="organizations" element={<OrganizationsPage />} />
            <Route path="trainers" element={<TrainersPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="settings" element={<SystemSettingsPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
            {sharedRoutes}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="/admin" element={<DashboardLayout nav={ADMIN_NAV} subtitle="Admin Panel" basePath="/admin" />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="workouts" element={<PlansPage kind="workout" />} />
            <Route path="diets" element={<PlansPage kind="diet" />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="trainers" element={<TrainersPage />} />
            {sharedRoutes}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['trainer']} />}>
          <Route path="/trainer" element={<MobileAppLayout tabs={TRAINER_TABS} menu={TRAINER_MENU} subtitle="Trainer" settingsPath="/trainer/settings" />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<TrainerHome />} />
            <Route path="clients" element={<TrainerClients />} />
            <Route path="clients/:id" element={<TrainerClientDetail />} />
            <Route path="workouts" element={<TrainerPlans kind="workout" />} />
            <Route path="workouts/new" element={<MobileWorkoutEditor />} />
            <Route path="workouts/:id" element={<MobileWorkoutEditor />} />
            <Route path="diets" element={<TrainerPlans kind="diet" />} />
            <Route path="diets/new" element={<MobileDietEditor />} />
            <Route path="diets/:id" element={<MobileDietEditor />} />
            <Route path="progress" element={<TrainerProgress />} />
            <Route path="library" element={<TrainerLibrary />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<AccountPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['client']} />}>
          <Route path="/client" element={<MobileAppLayout tabs={CLIENT_TABS} menu={CLIENT_MENU} subtitle="Member" settingsPath="/client/settings" />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ClientDashboard />} />
            <Route path="workout" element={<MyWorkoutPage />} />
            <Route path="diet" element={<MyDietPage />} />
            <Route path="progress" element={<MyProgressPage />} />
            <Route path="photos" element={<MyPhotosPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<MyProfilePage />} />
            <Route path="settings" element={<AccountPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage standalone />} />
      </Routes>
    </Suspense>
  );
}
