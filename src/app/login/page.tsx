'use client';

import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirebase } from '@/firebase';
import { Hospital, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { auth, isLoading } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    if (!auth) {
      toast({
        title: 'Erreur',
        description: 'Le service d\'authentification n\'est pas disponible.',
        variant: 'destructive',
      });
      return;
    }
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({
        title: 'Connexion réussie',
        description: 'Vous êtes maintenant connecté.',
      });
      router.push('/dashboard');
    } catch (error) {
      console.error('Error signing in with Google: ', error);
      toast({
        title: 'Erreur de connexion',
        description: 'Impossible de se connecter avec Google. Veuillez réessayer.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
                <Hospital className="h-10 w-10 text-primary" />
                <h1 className="text-3xl font-bold">PharmaSuivi</h1>
            </div>
          <CardTitle>Bienvenue</CardTitle>
          <CardDescription>Veuillez vous connecter pour accéder à votre tableau de bord.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGoogleSignIn} className="w-full">
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 21.2 172.9 56.6l-66.8 66.8C313.3 97.2 282.3 80 248 80c-73.2 0-132.3 59.1-132.3 132.3s59.1 132.3 132.3 132.3c76.9 0 111.4-53.7 114.9-81.9H248v-69h239.5c1.4 8.2 2.5 16.9 2.5 26.1z"></path></svg>
            Se connecter avec Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
