'use client';
import { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
  Query,
  DocumentData,
  orderBy,
  limit,
  where,
  QueryConstraint,
} from 'firebase/firestore';
import { useFirestore } from '../provider';

interface UseCollectionOptions {
  orderBy?: [string, 'asc' | 'desc'];
  limit?: number;
  where?: [string, '==' | '!=' | '<' | '<=' | '>' | '>=', any];
}

export function useCollection<T extends DocumentData>(
  collectionName: string,
  options?: UseCollectionOptions
) {
  const { firestore } = useFirestore();
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firestore) {
      setIsLoading(false);
      return;
    }

    try {
      const collectionRef = collection(firestore, collectionName);
      
      const constraints: QueryConstraint[] = [];
      if (options?.orderBy) {
        constraints.push(orderBy(options.orderBy[0], options.orderBy[1]));
      }
      if (options?.where) {
        constraints.push(where(options.where[0], options.where[1], options.where[2]));
      }
      if (options?.limit) {
        constraints.push(limit(options.limit));
      }

      const q = query(collectionRef, ...constraints);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const documents = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as T[];
          setData(documents);
          setIsLoading(false);
        },
        (err) => {
          console.error(`Error fetching collection ${collectionName}:`, err);
          setError(err);
          setIsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
        console.error(`Error setting up collection listener ${collectionName}:`, err);
        setError(err);
        setIsLoading(false);
    }
  }, [firestore, collectionName, options?.limit, options?.orderBy?.toString(), options?.where?.toString()]);

  return { data, isLoading, error };
}
