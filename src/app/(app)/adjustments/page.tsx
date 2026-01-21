import { getDrugs } from '@/lib/google-sheets';
import AdjustmentsClientPage from './client';

export default async function AdjustmentsPage() {
  const drugs = await getDrugs();
  return <AdjustmentsClientPage drugs={drugs} />;
}
