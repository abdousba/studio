'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { initializeFirebase } from './index';
import { Loader2 } from 'lucide-react';

interface FirebaseContextType {
  app: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
  isLoading: boolean;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [firebase, setFirebase] = useState<Omit<FirebaseContextType, 'isLoading'>>({
    app: null,
    auth: null,
    firestore: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { app, auth, firestore } = initializeFirebase();
    setFirebase({ app, auth, firestore });
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!firebase.app) {
    return (
        <div className="flex h-screen w-full items-center justify-center p-4">
            <div className="text-center bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Firebase Configuration Error!</strong>
                <span className="block sm:inline"> Please check your `.env` file and ensure all `NEXT_PUBLIC_FIREBASE_*` variables are set correctly.</span>
            </div>
        </div>
    )
  }

  return (
    <FirebaseContext.Provider value={{ ...firebase, isLoading }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

export const useFirestore = () => {
  const { firestore } = useFirebase();
  return { firestore };
}

export const useAuth = () => {
    const { auth } = useFirebase();
    return { auth };
}
