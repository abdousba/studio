import { getDrugs, getServices, getDistributions } from '@/lib/google-sheets';
import DistributionClientPage from './client';

export default async function DistributionPage() {
  const [drugs, services, distributions] = await Promise.all([
    getDrugs(),
    getServices(),
    getDistributions(),
  ]);

  return (
    <DistributionClientPage
      initialDrugs={drugs}
      initialServices={services}
      initialDistributions={distributions}
    />
  );
}
