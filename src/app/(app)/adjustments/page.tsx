'use client';
import AdjustmentsClientPage from './client';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Drug } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { collection } from 'firebase/firestore';

export default function AdjustmentsPage() {
  const firestore = useFirestore();
  const drugsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'drugs') : null, [firestore]);
  const { data: drugs, isLoading } = useCollection<Drug>(drugsQuery);
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>
  }

  return <AdjustmentsClientPage drugs={drugs || []} />;
}
