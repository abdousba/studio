'use client';
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Drug } from "@/lib/types";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { Loader2, CalendarX } from "lucide-react";
import { collection, query, orderBy } from 'firebase/firestore';
import { cn } from "@/lib/utils";


function getStockStatus(drug: Drug): {
  label: "En Stock" | "Stock Faible" | "Expiré";
  variant: "default" | "destructive" | "secondary";
} {
  const expiryDate = new Date(drug.expiryDate);
  if (drug.expiryDate !== 'N/A' && expiryDate < new Date()) {
    return { label: "Expiré", variant: "destructive" };
  }
  if (drug.currentStock < drug.lowStockThreshold) {
    return { label: "Stock Faible", variant: "secondary" };
  }
  return { label: "En Stock", variant: "default" };
}

export default function InventoryPage() {
  const { firestore, isUserLoading } = useFirebase();
  const drugsQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(collection(firestore, 'drugs'), orderBy('designation', 'asc'));
  }, [firestore, isUserLoading]);
  const { data: drugs, isLoading: drugsAreLoading } = useCollection<Drug>(drugsQuery);

  const isLoading = drugsAreLoading || isUserLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventaire des médicaments</CardTitle>
        <CardDescription>
          Une liste complète de tous les médicaments actuellement dans la pharmacie.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                Statut
              </TableHead>
              <TableHead>Désignation</TableHead>
              <TableHead>Code-barres</TableHead>
              <TableHead className="hidden md:table-cell">Stock actuel</TableHead>
              <TableHead>Date d'expiration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && drugs?.map((drug) => {
              const status = getStockStatus(drug);
              const isExpired = status.label === 'Expiré';
              return (
                <TableRow key={drug.id}>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={status.variant} className={status.variant === 'default' ? 'bg-green-100 text-green-800' : ''}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {drug.designation}
                  </TableCell>
                  <TableCell>{drug.barcode}</TableCell>
                  <TableCell className="hidden md:table-cell">{drug.currentStock}</TableCell>
                  <TableCell className={cn(isExpired && "text-destructive")}>
                    <div className="flex items-center gap-2">
                        {isExpired && <CalendarX className="h-4 w-4" />}
                        <span>{drug.expiryDate}</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
             {!isLoading && drugs?.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Aucun médicament trouvé.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
