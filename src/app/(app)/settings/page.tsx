import { getServices } from '@/lib/google-sheets';
import SettingsClientPage from './client';

export default async function SettingsPage() {
  const services = await getServices();
  return <SettingsClientPage initialServices={services} />;
}
