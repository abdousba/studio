'use client';

import { FirebaseProvider } from './provider';

// This component wraps the FirebaseProvider and ensures it's only rendered on the client.
export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  return <FirebaseProvider>{children}</FirebaseProvider>;
}
