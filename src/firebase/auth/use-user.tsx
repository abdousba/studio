'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { useFirebase } from '../provider';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useFirestore } from '../provider';

interface UserContextType {
  user: User | null;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { auth } = useFirebase();
  const { firestore } = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!auth) {
        setIsLoading(false);
        if (pathname !== '/login') {
            // router.push('/login');
        }
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);

      if (firebaseUser) {
        // User is signed in.
        // Update user profile in Firestore
        if (firestore) {
            const userRef = doc(firestore, "users", firebaseUser.uid);
            const userDoc = await getDoc(userRef);
            if (!userDoc.exists()) {
                await setDoc(userRef, {
                    displayName: firebaseUser.displayName,
                    email: firebaseUser.email,
                    photoURL: firebaseUser.photoURL,
                });
            }
        }
        
        // If user is on login page, redirect to dashboard
        if (pathname === '/login') {
          router.replace('/dashboard');
        }
      } else {
        // User is signed out.
        // Redirect to login page if not already there.
        if (pathname !== '/login') {
          router.replace('/login');
        }
      }
    });

    return () => unsubscribe();
  }, [auth, pathname, router, firestore]);

  return (
    <UserContext.Provider value={{ user, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
