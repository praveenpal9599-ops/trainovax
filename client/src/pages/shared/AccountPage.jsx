import PageHeader from '../../components/common/PageHeader';
import ProfileSettings from '../../features/settings/ProfileSettings';
export default function AccountPage() {
  return (
    <>
      <PageHeader title="Account settings" subtitle="Manage your profile and password." />
      <ProfileSettings />
    </>
  );
}
