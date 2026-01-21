'use client';
import AdjustmentsClientPage from './client';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { Drug } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { collection } from 'firebase/firestore';

export default function AdjustmentsPage() {
  const { firestore, isUserLoading } = useFirebase();
  const drugsQuery = useMemoFirebase(() => (firestore && !isUserLoading) ? collection(firestore, 'drugs') : null, [firestore, isUserLoading]);
  const { data: drugs, isLoading: drugsAreLoading } = useCollection<Drug>(drugsQuery);

  const isLoading = drugsAreLoading || isUserLoading;
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>
  }

  return <AdjustmentsClientPage drugs={drugs || []} />;
}
