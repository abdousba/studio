'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { PackageSearch, Loader2 } from 'lucide-react';
import type { Drug, Service, Distribution } from '@/lib/types';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { doc, runTransaction, collection, addDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';


const formSchema = z.object({
  barcode: z.string().min(1, 'Le code-barres est requis.'),
  quantity: z.coerce.number().min(1, 'La quantité doit être au moins de 1.'),
  service: z.string().min(1, 'Le service/section est requis.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function DistributionPage() {
  const { firestore, user, isUserLoading } = useFirebase();
  
  const drugsQuery = useMemoFirebase(() => (firestore && !isUserLoading) ? collection(firestore, 'drugs') : null, [firestore, isUserLoading]);
  const { data: initialDrugs, isLoading: drugsLoading } = useCollection<Drug>(drugsQuery);
  
  const servicesQuery = useMemoFirebase(() => (firestore && !isUserLoading) ? collection(firestore, 'services') : null, [firestore, isUserLoading]);
  const { data: initialServices, isLoading: servicesLoading } = useCollection<Service>(servicesQuery);

  const distributionsQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(collection(firestore, 'distributions'), orderBy('date', 'desc'), limit(10));
  }, [firestore, isUserLoading]);
  const { data: initialDistributions, isLoading: distributionsLoading } = useCollection<Distribution>(distributionsQuery);
  
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      barcode: '',
      quantity: 1,
      service: '',
    },
  });

  const barcodeValue = form.watch('barcode');

  useMemo(() => {
    const drug = initialDrugs?.find((d) => d.barcode === barcodeValue);
    setSelectedDrug(drug || null);
  }, [barcodeValue, initialDrugs]);

  async function onSubmit(values: FormValues) {
    if (!firestore || !user) {
        toast({ title: "Erreur", description: "Utilisateur non authentifié ou base de données non disponible.", variant: "destructive" });
        return;
    }
    if (!selectedDrug) {
      form.setError('barcode', { message: 'Code-barres invalide. Médicament non trouvé.' });
      return;
    }
    if (values.quantity > selectedDrug.currentStock) {
      form.setError('quantity', {
        message: `Stock insuffisant. Seulement ${selectedDrug.currentStock} disponible.`,
      });
      return;
    }

    setIsSubmitting(true);
    const selectedService = initialServices?.find(s => s.id === values.service);

    try {
      const drugRef = doc(firestore, 'drugs', selectedDrug.id);
      
      await runTransaction(firestore, async (transaction) => {
        const drugDoc = await transaction.get(drugRef);
        if (!drugDoc.exists()) {
          throw new Error("Le médicament n'existe pas !");
        }
        
        const newStock = drugDoc.data().currentStock - values.quantity;
        if (newStock < 0) {
          throw new Error("Stock insuffisant.");
        }
        
        transaction.update(drugRef, { currentStock: newStock });

        const distributionRef = collection(firestore, 'distributions');
        transaction.set(doc(distributionRef), {
            barcode: values.barcode,
            itemName: selectedDrug.designation,
            quantityDistributed: values.quantity,
            service: selectedService?.name ?? 'Inconnu',
            serviceId: values.service,
            date: new Date().toISOString(),
            userId: user.uid,
        });
      });

      toast({
        title: 'Distribution réussie',
        description: `${values.quantity} unités de ${selectedDrug.designation} distribuées.`,
      });
      form.reset({ barcode: '', quantity: 1, service: ''});
      setSelectedDrug(null);

    } catch (error: any) {
        console.error("Distribution failed: ", error);
        toast({ title: "Erreur de distribution", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const isLoading = drugsLoading || servicesLoading || distributionsLoading || isUserLoading;

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Nouvelle Distribution</CardTitle>
            <CardDescription>
              Scannez un code-barres et entrez la quantité à distribuer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code-barres</FormLabel>
                      <FormControl>
                        <Input autoFocus placeholder="Scannez ou entrez le code-barres" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {selectedDrug && (
                  <div className="p-4 rounded-md bg-muted text-sm text-muted-foreground flex items-center gap-2">
                    <PackageSearch className="h-4 w-4" />
                    <div>
                        <span className='font-semibold'>{selectedDrug.designation}</span>
                        <p>En stock: {selectedDrug.currentStock}</p>
                    </div>
                  </div>
                )}
                
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantité</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="service"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service/Section</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={servicesLoading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un service" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {initialServices?.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isSubmitting || isLoading}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Distribuer
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Distributions Récentes</CardTitle>
            <CardDescription>
              Un journal des distributions de médicaments les plus récentes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom de l'article</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    Array.from({length: 5}).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Loader2 className="h-4 w-4 animate-spin"/></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    ))
                ) : initialDistributions?.map((dist) => (
                  <TableRow key={dist.id}>
                    <TableCell className="font-medium">{dist.itemName}</TableCell>
                    <TableCell>{dist.quantityDistributed}</TableCell>
                    <TableCell>{dist.service}</TableCell>
                    <TableCell>{new Date(dist.date).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
