'use client';
import AdjustmentsClientPage from './client';
import { useCollection } from '@/firebase';
import { Drug } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function AdjustmentsPage() {
  const { data: drugs, isLoading } = useCollection<Drug>('drugs');
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>
  }

  return <AdjustmentsClientPage drugs={drugs || []} />;
}
