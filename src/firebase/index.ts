import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigValid } from './config';

// This file is the single entry point for all Firebase-related functionality.
// It initializes Firebase and exports the necessary services and hooks.

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let isInitialized = false;

function initializeFirebase() {
  if (isInitialized) {
    return { app, auth, firestore };
  }
  
  // This function should only be called on the client-side.
  if (typeof window !== 'undefined') {
    if (isFirebaseConfigValid() && !getApps().length) {
      try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        firestore = getFirestore(app);
        isInitialized = true;
      } catch (e) {
        console.error('Failed to initialize Firebase', e);
      }
    } else if (getApps().length) {
      app = getApp();
      auth = getAuth(app);
      firestore = getFirestore(app);
      isInitialized = true;
    }
  }

  return { app, auth, firestore };
}


// Export the initialization function
export { initializeFirebase };

// Export hooks and providers
export * from './provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/utils';
