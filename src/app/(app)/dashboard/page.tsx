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
import { distributions, drugs, services } from '@/lib/data';
import { AlertCircle, Boxes, CheckCircle, Package, Truck } from 'lucide-react';
import { useMemo } from 'react';

export default function DashboardPage() {
  const totalDrugs = drugs.length;
  const lowStockItems = useMemo(() => drugs.filter(d => d.currentStock < d.lowStockThreshold).length, []);
  const nearingExpiryItems = useMemo(() => {
    const today = new Date();
    const next3Months = new Date();
    next3Months.setMonth(today.getMonth() + 3);
    return drugs.filter(d => {
      const expiryDate = new Date(d.expiryDate);
      return expiryDate > today && expiryDate <= next3Months;
    }).length;
  }, []);
  const recentDistributions = distributions.length;

  const distributionByService = useMemo(() => {
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
  }, []);

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
      <Card>
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
      <Card>
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
