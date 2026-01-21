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
import { Loader2, CalendarX, Pencil, Download } from "lucide-react";
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
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
  label: "En Stock" | "Stock Faible" | "Expiré";
  variant: "default" | "destructive" | "secondary";
} {
  if (drug.expiryDate && drug.expiryDate !== 'N/A') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parts = drug.expiryDate.split('-').map(p => parseInt(p, 10));
    const expiryDate = new Date(parts[0], parts[1] - 1, parts[2]);
    
    if (expiryDate < today) {
        return { label: "Expiré", variant: "destructive" };
    }
  }

  if (drug.currentStock < drug.lowStockThreshold) {
    return { label: "Stock Faible", variant: "secondary" };
  }
  
  return { label: "En Stock", variant: "default" };
}

const editDrugSchema = z.object({
  designation: z.string().min(1, "La désignation est requise."),
  lowStockThreshold: z.coerce.number().min(0, "Le seuil ne peut pas être négatif."),
});

type EditDrugFormValues = z.infer<typeof editDrugSchema>;


export default function InventoryPage() {
  const { firestore, isUserLoading } = useFirebase();
  const drugsQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(collection(firestore, 'drugs'), orderBy('designation', 'asc'));
  }, [firestore, isUserLoading]);
  const { data: drugs, isLoading: drugsAreLoading } = useCollection<Drug>(drugsQuery);

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
    if (!drugs) return;

    const headers = [
      "Désignation",
      "Statut",
      "Lot",
      "Qté. Initiale",
      "Stock actuel",
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

    drugs.forEach(drug => {
      const status = getStockStatus(drug);
      const row = [
        drug.designation,
        status.label,
        drug.lotNumber,
        drug.initialStock,
        drug.currentStock,
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
      link.setAttribute('download', `inventaire_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    toast({
        title: "Exportation réussie",
        description: "Le fichier CSV de l'inventaire a été téléchargé.",
    });
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Inventaire des médicaments</CardTitle>
            <CardDescription>
              Une liste complète de tous les médicaments actuellement dans la pharmacie.
            </CardDescription>
          </div>
          <Button onClick={handleExportCSV} disabled={isLoading || !drugs || drugs.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exporter en CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                Statut
              </TableHead>
              <TableHead>Désignation</TableHead>
              <TableHead>Lot</TableHead>
              <TableHead className="hidden md:table-cell">Qté. Initiale</TableHead>
              <TableHead className="hidden md:table-cell">Stock actuel</TableHead>
              <TableHead>Date d'expiration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
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
                  <TableCell>{drug.lotNumber ?? 'N/A'}</TableCell>
                  <TableCell className="hidden md:table-cell">{drug.initialStock ?? 'N/A'}</TableCell>
                  <TableCell className="hidden md:table-cell">{drug.currentStock}</TableCell>
                  <TableCell className={cn(isExpired && "text-destructive")}>
                    <div className="flex items-center gap-2">
                        {isExpired && <CalendarX className="h-4 w-4" />}
                        <span>{drug.expiryDate}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditingDrug(drug)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
             {!isLoading && drugs?.length === 0 && (
                <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Aucun médicament trouvé.
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
