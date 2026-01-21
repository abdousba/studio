'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { AlertCircle, Boxes, Package, Truck } from 'lucide-react';
import { useMemo } from 'react';
import type { Drug, Service, Distribution } from '@/lib/types';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query } from 'firebase/firestore';
import Link from 'next/link';

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-4">
      <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-12" /><Skeleton className="h-3 w-full mt-1" /></CardContent></Card>
      <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-12" /><Skeleton className="h-3 w-full mt-1" /></CardContent></Card>
      <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-12" /><Skeleton className="h-3 w-full mt-1" /></CardContent></Card>
      <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-12" /><Skeleton className="h-3 w-full mt-1" /></CardContent></Card>
      <Card className="xl:col-span-4">
        <CardHeader>
          <CardTitle>Aperçu de la distribution</CardTitle>
          <CardDescription>
            Quantité totale de médicaments distribués par service.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


export default function DashboardPage() {
  const { firestore, isUserLoading: isAuthLoading } = useFirebase();

  const drugsQuery = useMemoFirebase(() => (firestore && !isAuthLoading) ? collection(firestore, 'drugs') : null, [firestore, isAuthLoading]);
  const { data: drugs, isLoading: drugsLoading } = useCollection<Drug>(drugsQuery);

  const servicesQuery = useMemoFirebase(() => (firestore && !isAuthLoading) ? collection(firestore, 'services') : null, [firestore, isAuthLoading]);
  const { data: services, isLoading: servicesLoading } = useCollection<Service>(servicesQuery);

  const distributionsQuery = useMemoFirebase(() => (firestore && !isAuthLoading) ? collection(firestore, 'distributions') : null, [firestore, isAuthLoading]);
  const { data: distributions, isLoading: distributionsLoading } = useCollection<Distribution>(distributionsQuery);
  
  const isLoading = drugsLoading || servicesLoading || distributionsLoading || isAuthLoading;

  const totalDrugs = drugs?.length ?? 0;
  const lowStockItems = useMemo(() => drugs?.filter(d => d.currentStock < d.lowStockThreshold).length ?? 0, [drugs]);
  const nearingExpiryItems = useMemo(() => {
    if (!drugs) return 0;
    const today = new Date();
    const next3Months = new Date();
    next3Months.setMonth(today.getMonth() + 3);
    return drugs.filter(d => {
      if (!d.expiryDate || d.expiryDate === 'N/A') return false;
      try {
        const expiryDate = new Date(d.expiryDate);
        return expiryDate > today && expiryDate <= next3Months;
      } catch {
        return false;
      }
    }).length;
  }, [drugs]);
  
  const recentDistributions = useMemo(() => {
     if (!distributions) return 0;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return distributions.filter(d => new Date(d.date) >= sevenDaysAgo).length;
  }, [distributions]);


  const distributionByService = useMemo(() => {
    if (!services || !distributions) return [];
    const serviceCounts: { [key: string]: number } = {};
    for (const service of services) {
      serviceCounts[service.name] = 0;
    }
    for (const dist of distributions) {
      if (serviceCounts[dist.service] !== undefined) {
        serviceCounts[dist.service] += dist.quantityDistributed;
      }
    }
    return Object.entries(serviceCounts).map(([name, total]) => ({ name, total }));
  }, [services, distributions]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Lots de médicaments au total</CardTitle>
          <Boxes className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalDrugs}</div>
          <p className="text-xs text-muted-foreground">
            Lots de médicaments uniques en inventaire
          </p>
        </CardContent>
      </Card>
      <Link href="/inventory?filter=low_stock">
        <Card className="hover:border-primary/80 hover:bg-muted transition-colors cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Articles en stock faible</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Articles en dessous de leur seuil
            </p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/inventory?filter=nearing_expiry">
        <Card className="hover:border-primary/80 hover:bg-muted transition-colors cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proche de l'expiration</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nearingExpiryItems}</div>
            <p className="text-xs text-muted-foreground">
              Expirant dans les 3 prochains mois
            </p>
          </CardContent>
        </Card>
      </Link>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Distributions récentes</CardTitle>
          <Truck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+{recentDistributions}</div>
          <p className="text-xs text-muted-foreground">
            Au cours des 7 derniers jours
          </p>
        </CardContent>
      </Card>

      <Card className="xl:col-span-4">
        <CardHeader>
          <CardTitle>Aperçu de la distribution</CardTitle>
          <CardDescription>
            Quantité totale de médicaments distribués par service.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[300px] w-full">
            <BarChart data={distributionByService} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} angle={-35} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip cursor={{ fill: 'hsl(var(--accent))', radius: 'var(--radius)' }} content={<ChartTooltipContent />} />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
