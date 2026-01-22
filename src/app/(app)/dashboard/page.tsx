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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { useMemo } from 'react';
import type { Drug, Service, Distribution } from '@/lib/types';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query } from 'firebase/firestore';
import Link from 'next/link';

function DashboardSkeleton() {
  return (
    <div className="space-y-4 md:space-y-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-2 md:gap-8 xl:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent className="p-3 pt-2"><Skeleton className="h-8 w-12" /><Skeleton className="h-3 w-full mt-1" /></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent className="p-3 pt-2"><Skeleton className="h-8 w-12" /><Skeleton className="h-3 w-full mt-1" /></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent className="p-3 pt-2"><Skeleton className="h-8 w-12" /><Skeleton className="h-3 w-full mt-1" /></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent className="p-3 pt-2"><Skeleton className="h-8 w-12" /><Skeleton className="h-3 w-full mt-1" /></CardContent></Card>
      </div>
       <div className="grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Aperçu de la distribution</CardTitle>
            <CardDescription>
              Quantité totale de médicaments distribués par service.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full flex items-center justify-center sm:h-[300px]">
              <Skeleton className="h-full w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Top 5 des médicaments</CardTitle>
                <CardDescription>Les plus distribués</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex justify-between gap-4">
                            <Skeleton className="h-5 w-3/5" />
                            <Skeleton className="h-5 w-1/5" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
      </div>
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
      const serviceName = services.find(s => s.id === dist.serviceId)?.name || dist.service;
      if (serviceName in serviceCounts) {
        serviceCounts[serviceName] += dist.quantityDistributed;
      } else {
        // Handle case where service might have been deleted but distributions remain
        serviceCounts[serviceName] = dist.quantityDistributed;
      }
    }
    return Object.entries(serviceCounts)
      .map(([name, total]) => ({ name, total }))
      .filter(item => item.total > 0) // Only show services with distributions
      .sort((a,b) => b.total - a.total); // Sort by total
  }, [services, distributions]);

  const topDistributedDrugs = useMemo(() => {
    if (!distributions) return [];
    
    const drugCounts: { [name: string]: number } = {};

    for (const dist of distributions) {
        drugCounts[dist.itemName] = (drugCounts[dist.itemName] || 0) + dist.quantityDistributed;
    }

    return Object.entries(drugCounts)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
  }, [distributions]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-4 md:space-y-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-2 md:gap-8 xl:grid-cols-4">
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm font-medium">Lots de médicaments</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-2">
            <div className="text-2xl font-bold">{totalDrugs}</div>
            <p className="text-xs text-muted-foreground">
              Lots de médicaments uniques
            </p>
          </CardContent>
        </Card>
        <Link href="/inventory?filter=low_stock">
          <Card className="hover:border-primary/80 hover:bg-muted transition-colors cursor-pointer">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm font-medium">Articles en stock faible</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-2">
              <div className="text-2xl font-bold">{lowStockItems}</div>
              <p className="text-xs text-muted-foreground">
                Articles sous le seuil
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/inventory?filter=nearing_expiry">
          <Card className="hover:border-primary/80 hover:bg-muted transition-colors cursor-pointer">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm font-medium">Proche de l'expiration</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-2">
              <div className="text-2xl font-bold">{nearingExpiryItems}</div>
              <p className="text-xs text-muted-foreground">
                Expire dans les 3 mois
              </p>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm font-medium">Distributions récentes</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-2">
            <div className="text-2xl font-bold">+{recentDistributions}</div>
            <p className="text-xs text-muted-foreground">
              Pendant 7 derniers jours
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Aperçu de la distribution par Service</CardTitle>
            <CardDescription>
              Quantité totale de médicaments distribués par service.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2 pr-6">
            {/* Desktop Chart */}
            <div className="hidden h-[300px] w-full sm:block">
              <ChartContainer config={{}} className="h-full w-full">
                <BarChart data={distributionByService} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} angle={-35} textAnchor="end" height={60} interval={0} />
                  <YAxis />
                  <Tooltip cursor={{ fill: 'hsl(var(--accent))', radius: 'var(--radius)' }} content={<ChartTooltipContent />} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ChartContainer>
            </div>
            {/* Mobile Chart */}
            <div className="h-[400px] w-full sm:hidden">
              <ChartContainer config={{}} className="h-full w-full">
                  <BarChart data={distributionByService} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={5} width={80} interval={0} />
                      <Tooltip cursor={{ fill: 'hsl(var(--accent))', radius: 'var(--radius)' }} content={<ChartTooltipContent />} />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={4} />
                  </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Top 5 des médicaments</CardTitle>
                <CardDescription>Les plus distribués</CardDescription>
            </CardHeader>
            <CardContent>
                {topDistributedDrugs.length > 0 ? (
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Médicament</TableHead>
                              <TableHead className="text-right">Quantité</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {topDistributedDrugs.map((drug) => (
                              <TableRow key={drug.name}>
                                  <TableCell className="font-medium p-2">{drug.name}</TableCell>
                                  <TableCell className="text-right p-2">{drug.total}</TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    Aucune donnée de distribution pour le moment.
                  </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
