import { getDrugs, getServices, getDistributions } from '@/lib/google-sheets';
import DashboardClientPage from './client';

// Make sure to set the Goolge Sheet integration environment variables in .env
// otherwise the app will crash
export default async function DashboardPage() {
  // Fetch data in parallel
  const [drugs, services, distributions] = await Promise.all([
    getDrugs(),
    getServices(),
    getDistributions()
  ]);

  return <DashboardClientPage drugs={drugs} services={services} distributions={distributions} />;
}
