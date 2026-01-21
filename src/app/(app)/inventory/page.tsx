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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Drug } from "@/lib/types";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { Loader2, CalendarX, Pencil, Download, AlertTriangle, CalendarClock } from "lucide-react";
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo, Suspense, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";


function getStockStatus(drug: Drug): {
  label: "En Stock" | "Stock Faible" | "Péremption Proche" | "Expiré";
  variant: "success" | "secondary" | "outline" | "destructive";
  icon: React.ElementType;
} {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (drug.expiryDate && drug.expiryDate !== 'N/A') {
        const expiryDate = new Date(drug.expiryDate);
        if (expiryDate < today) {
            return { label: "Expiré", variant: "destructive", icon: CalendarX };
        }
        
        const next3Months = new Date();
        next3Months.setMonth(today.getMonth() + 3);
        if (expiryDate <= next3Months) {
            return { label: "Péremption Proche", variant: "outline", icon: CalendarClock };
        }
    }

    if (drug.currentStock < drug.lowStockThreshold) {
        return { label: "Stock Faible", variant: "secondary", icon: AlertTriangle };
    }
    
    // Return a function that returns null for the icon when not needed to be a valid component
    return { label: "En Stock", variant: "success", icon: () => null };
}

const editDrugSchema = z.object({
  designation: z.string().min(1, "La désignation est requise."),
  lowStockThreshold: z.coerce.number().min(0, "Le seuil ne peut pas être négatif."),
});

type EditDrugFormValues = z.infer<typeof editDrugSchema>;

function InventoryPageComponent() {
  const { firestore, isUserLoading } = useFirebase();
  const drugsQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(collection(firestore, 'drugs'), orderBy('designation', 'asc'));
  }, [firestore, isUserLoading]);
  const { data: drugs, isLoading: drugsAreLoading } = useCollection<Drug>(drugsQuery);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeFilter = searchParams.get('filter') || 'all';
  const highlightedDrugId = searchParams.get('highlight');
  
  const highlightedRowRef = useRef<HTMLTableRowElement>(null);

  const handleFilterChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', value);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const filteredDrugs = useMemo(() => {
    if (!drugs) return [];

    const isExpired = (drug: Drug) => {
        if (!drug.expiryDate || drug.expiryDate === 'N/A') return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiryDate = new Date(drug.expiryDate);
        return expiryDate < today;
    };

    const isNearingExpiry = (drug: Drug) => {
        if (!drug.expiryDate || drug.expiryDate === 'N/A' || isExpired(drug)) return false;
        const today = new Date();
        const next3Months = new Date();
        next3Months.setMonth(today.getMonth() + 3);
        const expiryDate = new Date(drug.expiryDate);
        return expiryDate >= today && expiryDate <= next3Months;
    };

    switch (activeFilter) {
      case 'low_stock':
        return drugs.filter(d => d.currentStock < d.lowStockThreshold && !isExpired(d));
      case 'nearing_expiry':
        return drugs.filter(isNearingExpiry);
      case 'expired':
        return drugs.filter(isExpired);
      default:
        return drugs;
    }
  }, [drugs, activeFilter]);


  useEffect(() => {
    if (highlightedDrugId && highlightedRowRef.current) {
        highlightedRowRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
        // Remove highlight from URL after a short delay to allow scroll to finish
        const timer = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete('highlight');
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }, 3000); // 3 second highlight
        return () => clearTimeout(timer);
    }
  }, [highlightedDrugId, filteredDrugs, pathname, router, searchParams]);


  const isLoading = drugsAreLoading || isUserLoading;

  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditDrugFormValues>({
      resolver: zodResolver(editDrugSchema),
  });

  useEffect(() => {
      if (editingDrug) {
          form.reset({
              designation: editingDrug.designation,
              lowStockThreshold: editingDrug.lowStockThreshold,
          });
      }
  }, [editingDrug, form]);

  const handleUpdateDrug = async (values: EditDrugFormValues) => {
      if (!firestore || !editingDrug) return;
      setIsSubmitting(true);
      const drugRef = doc(firestore, 'drugs', editingDrug.id);
      try {
          await updateDoc(drugRef, {
              designation: values.designation,
              lowStockThreshold: values.lowStockThreshold,
          });
          toast({
              title: "Médicament mis à jour",
              description: "Les informations du médicament ont été enregistrées.",
          });
          setEditingDrug(null);
      } catch (error) {
          console.error("Error updating drug:", error);
          toast({
              variant: "destructive",
              title: "Erreur",
              description: "Impossible de mettre à jour le médicament.",
          });
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleExportCSV = () => {
    if (!filteredDrugs) return;

    const headers = [
      "Désignation",
      "Statut",
      "Lot",
      "Qté. Initiale",
      "Stock actuel",
      "Seuil (Faible)",
      "Date d'expiration"
    ];
    
    const toCsvRow = (items: (string | number | undefined | null)[]) => {
      return items.map(item => {
        const str = String(item ?? 'N/A');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',');
    };

    const csvRows = [headers.join(',')];

    filteredDrugs.forEach(drug => {
      const status = getStockStatus(drug);
      const row = [
        drug.designation,
        status.label,
        drug.lotNumber,
        drug.initialStock,
        drug.currentStock,
        drug.lowStockThreshold,
        drug.expiryDate,
      ];
      csvRows.push(toCsvRow(row));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `inventaire_${activeFilter}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    toast({
        title: "Exportation réussie",
        description: `Le fichier CSV de la vue "${activeFilter}" a été téléchargé.`,
    });
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle>Inventaire des médicaments</CardTitle>
            <CardDescription>
              Une liste complète de tous les médicaments actuellement dans la pharmacie.
            </CardDescription>
          </div>
          <Button onClick={handleExportCSV} disabled={isLoading || !filteredDrugs || filteredDrugs.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exporter la vue en CSV
          </Button>
        </div>
        <Tabs value={activeFilter} onValueChange={handleFilterChange} className="mt-4">
          <TabsList>
            <TabsTrigger value="all">Tout</TabsTrigger>
            <TabsTrigger value="low_stock">Stock Faible</TabsTrigger>
            <TabsTrigger value="nearing_expiry">Péremption Proche</TabsTrigger>
            <TabsTrigger value="expired">Expiré</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Statut</TableHead>
              <TableHead>Désignation</TableHead>
              <TableHead className="hidden sm:table-cell">Lot</TableHead>
              <TableHead className="hidden lg:table-cell">Qté. Initiale</TableHead>
              <TableHead>Stock actuel</TableHead>
              <TableHead className="hidden lg:table-cell">Seuil (Faible)</TableHead>
              <TableHead>Date d'expiration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filteredDrugs?.map((drug) => {
              const status = getStockStatus(drug);
              const isExpired = status.label === 'Expiré';
              const isHighlighted = drug.id === highlightedDrugId;
              return (
                <TableRow 
                  key={drug.id} 
                  ref={isHighlighted ? highlightedRowRef : null}
                  className={cn(
                    isExpired && 'bg-destructive/10',
                    isHighlighted && 'bg-primary/20 motion-safe:animate-pulse'
                  )}
                >
                  <TableCell>
                    <Badge variant={status.variant} className={cn(
                        'flex items-center w-fit',
                        status.variant === 'success' && 'bg-green-100 text-green-800',
                        status.variant === 'secondary' && 'bg-yellow-100 text-yellow-800',
                        status.variant === 'outline' && 'text-blue-800 border-blue-300'
                    )}>
                        {status.icon && <status.icon className="mr-1 h-3 w-3" />}
                        {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {drug.designation}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{drug.lotNumber ?? 'N/A'}</TableCell>
                  <TableCell className="hidden lg:table-cell">{drug.initialStock ?? 'N/A'}</TableCell>
                  <TableCell>{drug.currentStock}</TableCell>
                  <TableCell className="hidden lg:table-cell">{drug.lowStockThreshold}</TableCell>
                  <TableCell className={cn(isExpired && "text-destructive font-semibold")}>
                    {drug.expiryDate}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditingDrug(drug)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
             {!isLoading && filteredDrugs?.length === 0 && (
                <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                        Aucun médicament ne correspond à ce filtre.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
       {editingDrug && (
          <Dialog open={!!editingDrug} onOpenChange={(isOpen) => !isOpen && setEditingDrug(null)}>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Modifier le médicament</DialogTitle>
                      <DialogDescription>
                          Mettez à jour les informations pour {editingDrug.designation}.
                      </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleUpdateDrug)} className="space-y-4 py-4">
                          <FormField
                              control={form.control}
                              name="designation"
                              render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Désignation</FormLabel>
                                      <FormControl>
                                          <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                          <FormField
                              control={form.control}
                              name="lowStockThreshold"
                              render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Seuil de stock faible</FormLabel>
                                      <FormControl>
                                          <Input type="number" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                          <DialogFooter>
                              <Button type="button" variant="outline" onClick={() => setEditingDrug(null)}>Annuler</Button>
                              <Button type="submit" disabled={isSubmitting}>
                                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Enregistrer
                              </Button>
                          </DialogFooter>
                      </form>
                  </Form>
              </DialogContent>
          </Dialog>
      )}
    </Card>
  );
}


// Add a Suspense boundary as useSearchParams is used.
export default function InventoryPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
            <InventoryPageComponent />
        </Suspense>
    );
}
