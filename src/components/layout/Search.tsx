'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Drug } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { Search as SearchIcon, Loader2, Package } from 'lucide-react';

export function Search() {
  const router = useRouter();
  const { firestore, isUserLoading } = useFirebase();
  const drugsQuery = useMemoFirebase(() => (firestore && !isUserLoading) ? collection(firestore, 'drugs') : null, [firestore, isUserLoading]);
  const { data: drugs, isLoading: drugsAreLoading } = useCollection<Drug>(drugsQuery);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Drug[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchQuery.length > 1 && drugs) {
      const filteredDrugs = drugs.filter(drug => 
        drug.designation.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setResults(filteredDrugs.slice(0, 5)); // Limit to 5 results
      setIsPopoverOpen(filteredDrugs.length > 0);
    } else {
      setResults([]);
      setIsPopoverOpen(false);
    }
  }, [searchQuery, drugs]);
  
  const handleSelectDrug = (drugId: string) => {
    setSearchQuery('');
    setResults([]);
    setIsPopoverOpen(false);
    inputRef.current?.blur();
    router.push(`/inventory?view=${drugId}&highlight=${drugId}`);
  };
  
  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverAnchor asChild>
        <div className="relative">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                ref={inputRef}
                type="search"
                placeholder="Rechercher des médicaments..."
                className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                    if (searchQuery.length > 1 && results.length > 0) setIsPopoverOpen(true);
                }}
            />
            {drugsAreLoading && searchQuery.length > 1 && (
                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
            )}
        </div>
      </PopoverAnchor>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1">
        <div className="flex flex-col gap-0.5">
            {results.map(drug => (
                <button
                    key={drug.id}
                    onClick={() => handleSelectDrug(drug.id)}
                    className="flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-sm text-left hover:bg-accent"
                >
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 overflow-hidden">
                        <p className="font-medium truncate">{drug.designation}</p>
                        <p className="text-xs text-muted-foreground truncate">Lot: {drug.lotNumber ?? 'N/A'} | Stock: {drug.currentStock}</p>
                    </div>
                </button>
            ))}
            {searchQuery.length > 1 && !drugsAreLoading && results.length === 0 && (
                 <div className="p-4 text-center text-sm text-muted-foreground">
                    Aucun médicament trouvé.
                </div>
            )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
