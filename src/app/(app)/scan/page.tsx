import { getDrugs, getServices } from '@/lib/google-sheets';
import ScanClientPage from './client';

export default async function ScanPage() {
  const [drugs, services] = await Promise.all([
    getDrugs(),
    getServices()
  ]);
  return <ScanClientPage initialDrugs={drugs} initialServices={services} />;
}
