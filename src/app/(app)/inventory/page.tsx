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
import { Loader2, CalendarX, Pencil, Download, AlertTriangle, CalendarClock, FileText, Filter, Calendar as CalendarIcon } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DRUG_CATEGORIES } from "@/lib/categories";


type DrugStatus = {
  label: "En Stock" | "Stock Faible" | "Péremption Proche" | "Expiré" | "Surstock" | "À commander";
  variant: "success" | "secondary" | "outline" | "destructive" | "info" | "warning";
  icon: React.ElementType;
};

function getStockStatuses(drug: Drug): DrugStatus[] {
    const statuses: DrugStatus[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let isExpired = false;
    if (drug.expiryDate && drug.expiryDate !== 'N/A') {
        const expiryDate = new Date(drug.expiryDate);
        if (expiryDate < today) {
            statuses.push({ label: "Expiré", variant: "destructive", icon: CalendarX });
            isExpired = true;
        }
        
        const next3Months = new Date();
        next3Months.setMonth(today.getMonth() + 3);
        if (!isExpired && expiryDate <= next3Months) {
            statuses.push({ label: "Péremption Proche", variant: "outline", icon: CalendarClock });
        }
    }
    
    if (!isExpired) {
      if (drug.currentStock === 0) {
          statuses.push({ label: "À commander", variant: "warning", icon: AlertTriangle });
      } else if (drug.currentStock < drug.lowStockThreshold) {
          statuses.push({ label: "Stock Faible", variant: "secondary", icon: AlertTriangle });
      } else if (drug.lowStockThreshold > 0 && drug.currentStock > drug.lowStockThreshold * 3) {
          statuses.push({ label: "Surstock", variant: "info", icon: AlertTriangle });
      }
    }
    
    if (statuses.length === 0) {
        statuses.push({ label: "En Stock", variant: "success", icon: () => null });
    }

    return statuses;
}

const editDrugSchema = z.object({
  designation: z.string().min(1, "La désignation est requise."),
  initialStock: z.coerce.number().min(0, "Le stock initial ne peut pas être négatif.").optional(),
  lowStockThreshold: z.coerce.number().min(0, "Le seuil ne peut pas être négatif."),
  category: z.string().optional(),
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
  
  const highlightedRowRef = useRef<HTMLTableRowElement | HTMLDivElement>(null);
  
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    category: '',
    minQty: '',
    maxQty: '',
    dateAddedFrom: undefined as Date | undefined,
    dateAddedTo: undefined as Date | undefined,
    dateUpdatedFrom: undefined as Date | undefined,
    dateUpdatedTo: undefined as Date | undefined,
    rotation: '',
  });

  const handleFilterChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', value);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleAdvancedFilterChange = (key: keyof typeof advancedFilters, value: string | Date | undefined) => {
    setAdvancedFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetAdvancedFilters = () => {
    setAdvancedFilters({
      category: '',
      minQty: '',
      maxQty: '',
      dateAddedFrom: undefined,
      dateAddedTo: undefined,
      dateUpdatedFrom: undefined,
      dateUpdatedTo: undefined,
      rotation: '',
    });
    setShowAdvancedFilters(false);
  };
  
  const categories = useMemo(() => {
    if (!drugs) return [];
    const allCategories = drugs.map(d => d.category).filter(Boolean);
    return [...new Set(allCategories)] as string[];
  }, [drugs]);

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

    let intermediateResults: Drug[];

    // 1. Apply main button filter (from URL)
    switch (activeFilter) {
      case 'low_stock':
        intermediateResults = drugs.filter(d => d.currentStock > 0 && d.currentStock < d.lowStockThreshold && !isExpired(d));
        break;
      case 'nearing_expiry':
        intermediateResults = drugs.filter(isNearingExpiry);
        break;
      case 'expired':
        intermediateResults = drugs.filter(isExpired);
        break;
      case 'a_commander':
        intermediateResults = drugs.filter(d => d.currentStock === 0 && !isExpired(d));
        break;
      case 'surstock':
        intermediateResults = drugs.filter(d => d.lowStockThreshold > 0 && d.currentStock > (d.lowStockThreshold * 3) && !isExpired(d));
        break;
      default:
        intermediateResults = drugs;
    }
    
    // Sort results based on filter
    if (activeFilter === 'nearing_expiry') {
      intermediateResults.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    } else if (activeFilter === 'expired') {
      intermediateResults.sort((a, b) => new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime());
    }

    // 2. Apply advanced filters from state
    let finalResults = intermediateResults;
    if (advancedFilters.category) {
      finalResults = finalResults.filter(d => d.category === advancedFilters.category);
    }
    if (advancedFilters.minQty) {
      const min = parseInt(advancedFilters.minQty, 10);
      if (!isNaN(min)) {
        finalResults = finalResults.filter(d => d.currentStock >= min);
      }
    }
    if (advancedFilters.maxQty) {
      const max = parseInt(advancedFilters.maxQty, 10);
      if (!isNaN(max)) {
        finalResults = finalResults.filter(d => d.currentStock <= max);
      }
    }

    // Date filters
    if (advancedFilters.dateAddedFrom) {
        const fromDate = new Date(advancedFilters.dateAddedFrom);
        fromDate.setHours(0, 0, 0, 0);
        finalResults = finalResults.filter(d => d.createdAt && new Date(d.createdAt) >= fromDate);
    }
    if (advancedFilters.dateAddedTo) {
        const toDate = new Date(advancedFilters.dateAddedTo);
        toDate.setHours(23, 59, 59, 999);
        finalResults = finalResults.filter(d => d.createdAt && new Date(d.createdAt) <= toDate);
    }
    if (advancedFilters.dateUpdatedFrom) {
        const fromDate = new Date(advancedFilters.dateUpdatedFrom);
        fromDate.setHours(0, 0, 0, 0);
        finalResults = finalResults.filter(d => d.updatedAt && new Date(d.updatedAt) >= fromDate);
    }
    if (advancedFilters.dateUpdatedTo) {
        const toDate = new Date(advancedFilters.dateUpdatedTo);
        toDate.setHours(23, 59, 59, 999);
        finalResults = finalResults.filter(d => d.updatedAt && new Date(d.updatedAt) <= toDate);
    }
    
    // Rotation filter
    if (advancedFilters.rotation) {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(today.getDate() - 90);

        finalResults = finalResults.filter(d => {
            if (!d.updatedAt) return false;
            const updatedAtDate = new Date(d.updatedAt);

            switch (advancedFilters.rotation) {
                case 'fast':
                    return updatedAtDate >= thirtyDaysAgo;
                case 'slow':
                    return updatedAtDate < thirtyDaysAgo && updatedAtDate >= ninetyDaysAgo;
                case 'inactive':
                    return updatedAtDate < ninetyDaysAgo;
                default:
                    return true;
            }
        });
    }

    return finalResults;
  }, [drugs, activeFilter, advancedFilters]);


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
              initialStock: editingDrug.initialStock,
              lowStockThreshold: editingDrug.lowStockThreshold,
              category: editingDrug.category || '',
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
              initialStock: values.initialStock,
              lowStockThreshold: values.lowStockThreshold,
              category: values.category || '',
              updatedAt: new Date().toISOString(),
          });
          toast({
              variant: "success",
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
      "Catégorie",
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
      const statuses = getStockStatuses(drug);
      const statusLabels = statuses.map(s => s.label).join(' / ');
      const row = [
        drug.designation,
        statusLabels,
        drug.category,
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
        variant: "success",
        title: "Exportation réussie",
        description: `Le fichier CSV de la vue "${activeFilter}" a été téléchargé.`,
    });
  };

  const handleExportPDF = () => {
    if (!filteredDrugs || filteredDrugs.length === 0) return;

    const doc = new jsPDF();
    doc.setFont('helvetica', 'normal');

    const tableColumns = [
      "Désignation",
      "Statut",
      "Lot",
      "Catégorie",
      "Stock actuel",
      "Date d'expiration"
    ];
    const tableRows: (string | number | undefined | null)[][] = [];

    filteredDrugs.forEach(drug => {
      const statuses = getStockStatuses(drug);
      const statusLabels = statuses.map(s => s.label).join(' / ');
      const drugData = [
        drug.designation,
        statusLabels,
        drug.lotNumber ?? 'N/A',
        drug.category ?? 'N/A',
        drug.currentStock,
        drug.expiryDate,
      ];
      tableRows.push(drugData);
    });

    doc.text(`Inventaire - Vue: ${activeFilter}`, 14, 15);
    
    autoTable(doc, {
      head: [tableColumns],
      body: tableRows,
      startY: 20,
      styles: { font: 'helvetica' },
    });

    doc.save(`inventaire_${activeFilter}_${new Date().toISOString().split('T')[0]}.pdf`);

    toast({
        variant: "success",
        title: "Exportation PDF réussie",
        description: `Le fichier PDF de la vue "${activeFilter}" a été téléchargé.`,
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
            {!isLoading && (
              <div className="text-sm text-muted-foreground mt-1">
                <strong>{filteredDrugs?.length ?? 0}</strong> produits affichés.
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
              <Sheet open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtres
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filtres Avancés</SheetTitle>
                    <SheetDescription>
                      Affinez votre recherche dans l'inventaire.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="category-filter" className="text-right">
                        Catégorie
                      </Label>
                      <Select
                        value={advancedFilters.category}
                        onValueChange={(value) => handleAdvancedFilterChange('category', value === 'all' ? '' : value)}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Toutes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les catégories</SelectItem>
                          {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="rotation-filter" className="text-right">
                        Rotation
                      </Label>
                      <Select
                        value={advancedFilters.rotation}
                        onValueChange={(value) => handleAdvancedFilterChange('rotation', value === 'all' ? '' : value)}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Toutes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les rotations</SelectItem>
                          <SelectItem value="fast">Rotation rapide (30j)</SelectItem>
                          <SelectItem value="slow">Rotation lente (30-90j)</SelectItem>
                          <SelectItem value="inactive">Produits inactifs (&gt;90j)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Quantité</Label>
                      <Input
                        id="min-qty"
                        type="number"
                        placeholder="Min"
                        className="col-span-1"
                        value={advancedFilters.minQty}
                        onChange={(e) => handleAdvancedFilterChange('minQty', e.target.value)}
                      />
                       <span className="text-center text-muted-foreground">-</span>
                      <Input
                        id="max-qty"
                        type="number"
                        placeholder="Max"
                        className="col-span-1"
                        value={advancedFilters.maxQty}
                        onChange={(e) => handleAdvancedFilterChange('maxQty', e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Date d'ajout</Label>
                        <div className="col-span-3 grid grid-cols-2 gap-2">
                           <Popover>
                              <PopoverTrigger asChild>
                                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !advancedFilters.dateAddedFrom && "text-muted-foreground")}>
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {advancedFilters.dateAddedFrom ? format(advancedFilters.dateAddedFrom, 'dd/MM/yy') : <span>Début</span>}
                                  </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                  <Calendar mode="single" selected={advancedFilters.dateAddedFrom} onSelect={(date) => handleAdvancedFilterChange('dateAddedFrom', date)} initialFocus />
                              </PopoverContent>
                          </Popover>
                          <Popover>
                              <PopoverTrigger asChild>
                                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !advancedFilters.dateAddedTo && "text-muted-foreground")}>
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {advancedFilters.dateAddedTo ? format(advancedFilters.dateAddedTo, 'dd/MM/yy') : <span>Fin</span>}
                                  </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                  <Calendar mode="single" selected={advancedFilters.dateAddedTo} onSelect={(date) => handleAdvancedFilterChange('dateAddedTo', date)} initialFocus />
                              </PopoverContent>
                          </Popover>
                        </div>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Date de MàJ</Label>
                        <div className="col-span-3 grid grid-cols-2 gap-2">
                           <Popover>
                              <PopoverTrigger asChild>
                                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !advancedFilters.dateUpdatedFrom && "text-muted-foreground")}>
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {advancedFilters.dateUpdatedFrom ? format(advancedFilters.dateUpdatedFrom, 'dd/MM/yy') : <span>Début</span>}
                                  </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                  <Calendar mode="single" selected={advancedFilters.dateUpdatedFrom} onSelect={(date) => handleAdvancedFilterChange('dateUpdatedFrom', date)} initialFocus />
                              </PopoverContent>
                          </Popover>
                          <Popover>
                              <PopoverTrigger asChild>
                                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !advancedFilters.dateUpdatedTo && "text-muted-foreground")}>
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {advancedFilters.dateUpdatedTo ? format(advancedFilters.dateUpdatedTo, 'dd/MM/yy') : <span>Fin</span>}
                                  </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                  <Calendar mode="single" selected={advancedFilters.dateUpdatedTo} onSelect={(date) => handleAdvancedFilterChange('dateUpdatedTo', date)} initialFocus />
                              </PopoverContent>
                          </Popover>
                        </div>
                    </div>
                  </div>
                  <SheetFooter>
                    <Button variant="outline" onClick={resetAdvancedFilters}>Réinitialiser</Button>
                    <Button onClick={() => setShowAdvancedFilters(false)}>Appliquer</Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            <Button onClick={handleExportCSV} variant="secondary" size="sm" disabled={isLoading || !filteredDrugs || filteredDrugs.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button onClick={handleExportPDF} variant="secondary" size="sm" disabled={isLoading || !filteredDrugs || filteredDrugs.length === 0}>
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4">
            <Button onClick={() => handleFilterChange('all')} variant={activeFilter === 'all' ? 'default' : 'secondary'} size="sm">Tout</Button>
            <Button onClick={() => handleFilterChange('low_stock')} variant={activeFilter === 'low_stock' ? 'default' : 'secondary'} size="sm" className={cn(activeFilter === 'low_stock' && 'bg-yellow-500 hover:bg-yellow-600 text-white')}>Stock Faible</Button>
            <Button onClick={() => handleFilterChange('nearing_expiry')} variant={activeFilter === 'nearing_expiry' ? 'default' : 'secondary'} size="sm" className={cn(activeFilter === 'nearing_expiry' && 'bg-orange-500 hover:bg-orange-600 text-white')}>Péremption Proche</Button>
            <Button onClick={() => handleFilterChange('expired')} variant={activeFilter === 'expired' ? 'destructive' : 'secondary'} size="sm">Expiré</Button>
            <Button onClick={() => handleFilterChange('a_commander')} variant={activeFilter === 'a_commander' ? 'default' : 'secondary'} size="sm" className={cn(activeFilter === 'a_commander' && 'bg-purple-600 hover:bg-purple-700 text-white')}>À commander</Button>
            <Button onClick={() => handleFilterChange('surstock')} variant={activeFilter === 'surstock' ? 'default' : 'secondary'} size="sm" className={cn(activeFilter === 'surstock' && 'bg-sky-600 hover:bg-sky-700 text-white')}>Surstock</Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Desktop view */}
        <div className="hidden sm:block">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Statut</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Lot</TableHead>
                <TableHead>Stock actuel</TableHead>
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
                {!isLoading && filteredDrugs?.map((drug) => {
                const statuses = getStockStatuses(drug);
                const isExpired = statuses.some(s => s.label === 'Expiré');
                const isHighlighted = drug.id === highlightedDrugId;
                return (
                    <TableRow 
                    key={drug.id} 
                    ref={isHighlighted ? highlightedRowRef as React.Ref<HTMLTableRowElement> : null}
                    className={cn(
                        isExpired && 'bg-red-50',
                        isHighlighted && 'bg-primary/20 motion-safe:animate-pulse'
                    )}
                    >
                    <TableCell>
                        <div className="flex flex-wrap gap-1">
                            {statuses.map((status) => (
                                <Badge key={status.label} variant={status.variant} className={cn(
                                    'flex items-center',
                                    status.variant === 'success' && 'border-transparent bg-green-100 text-green-800 hover:bg-green-100/80',
                                    status.variant === 'secondary' && 'border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80',
                                    status.variant === 'outline' && 'border-transparent bg-orange-100 text-orange-800 hover:bg-orange-100/80',
                                    status.variant === 'destructive' && 'border-transparent bg-red-100 text-red-800 hover:bg-red-100/80',
                                    status.variant === 'warning' && 'border-transparent bg-purple-100 text-purple-800 hover:bg-purple-100/80',
                                    status.variant === 'info' && 'border-transparent bg-sky-100 text-sky-800 hover:bg-sky-100/80'
                                )}>
                                    {status.icon && <status.icon className="mr-1 h-3 w-3" />}
                                    {status.label}
                                </Badge>
                            ))}
                        </div>
                    </TableCell>
                    <TableCell className="font-medium">
                        {drug.designation}
                    </TableCell>
                    <TableCell>{drug.category ?? 'N/A'}</TableCell>
                    <TableCell>{drug.lotNumber ?? 'N/A'}</TableCell>
                    <TableCell>{drug.currentStock}</TableCell>
                    <TableCell className={cn(isExpired && "text-red-700 font-semibold")}>
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
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                            Aucun médicament ne correspond à ces filtres.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
            </Table>
        </div>

        {/* Mobile view */}
        <Accordion type="single" collapsible className="space-y-3 sm:hidden" ref={highlightedDrugId ? highlightedRowRef as React.Ref<HTMLDivElement> : null}>
             {isLoading && (
                <div className="col-span-2 flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            )}
            {!isLoading && filteredDrugs?.map((drug) => {
                const statuses = getStockStatuses(drug);
                const isExpired = statuses.some(s => s.label === 'Expiré');
                const isHighlighted = drug.id === highlightedDrugId;
                return (
                    <AccordionItem 
                        value={drug.id} 
                        key={drug.id}
                        className={cn(
                            'border-b-0 rounded-lg border',
                            isExpired && 'bg-red-50/80 border-red-200',
                            isHighlighted && 'bg-primary/20 motion-safe:animate-pulse ring-2 ring-primary'
                        )}
                    >
                        <AccordionTrigger className="p-3 text-sm hover:no-underline [&[data-state=open]>svg]:-rotate-90">
                           <div className="flex flex-col items-start gap-2 text-left w-full">
                                <p className="font-semibold text-base break-words">{drug.designation}</p>
                                <div className="flex justify-between w-full items-center">
                                    <span className="text-muted-foreground text-xs">Stock: <span className="font-semibold text-foreground text-sm">{drug.currentStock}</span></span>
                                    <div className="flex flex-wrap gap-1 justify-end max-w-[70%]">
                                        {statuses.map((status) => (
                                            <Badge key={status.label} variant={status.variant as any} className={cn(
                                                'flex items-center text-[10px] px-1.5 py-0.5',
                                                status.variant === 'success' && 'border-transparent bg-green-100 text-green-800 hover:bg-green-100/80',
                                                status.variant === 'secondary' && 'border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80',
                                                status.variant === 'outline' && 'border-transparent bg-orange-100 text-orange-800 hover:bg-orange-100/80',
                                                status.variant === 'destructive' && 'border-transparent bg-red-100 text-red-800 hover:bg-red-100/80',
                                                status.variant === 'warning' && 'border-transparent bg-purple-100 text-purple-800 hover:bg-purple-100/80',
                                                status.variant === 'info' && 'border-transparent bg-sky-100 text-sky-800 hover:bg-sky-100/80'
                                            )}>
                                                {status.icon && <status.icon className="mr-0.5 h-2.5 w-2.5" />}
                                                {status.label}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-3 pt-0">
                            <div className="space-y-2 text-xs border-t pt-3 mt-2">
                                <p><span className="font-medium text-muted-foreground">Catégorie:</span> {drug.category ?? 'N/A'}</p>
                                <p><span className="font-medium text-muted-foreground">Lot:</span> {drug.lotNumber ?? 'N/A'}</p>
                                <p className={cn(isExpired && "text-red-700 font-semibold")}>
                                <span className="font-medium text-muted-foreground">Expire le:</span> {drug.expiryDate}
                                </p>
                                <div className="flex justify-end pt-2">
                                    <Button variant="outline" size="sm" onClick={() => setEditingDrug(drug)}>
                                        <Pencil className="mr-2 h-3 w-3" />
                                        Modifier
                                    </Button>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                );
            })}
            {!isLoading && filteredDrugs?.length === 0 && (
                <div className="col-span-2 text-center text-muted-foreground py-10">
                    Aucun médicament ne correspond à ce filtre.
                </div>
            )}
        </Accordion>
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
                              name="initialStock"
                              render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Stock initial</FormLabel>
                                      <FormControl>
                                          <Input type="number" placeholder="Quantité initiale à la réception" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                           <FormField
                              control={form.control}
                              name="category"
                              render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Catégorie</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionnez une catégorie" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {DRUG_CATEGORIES.map(cat => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
