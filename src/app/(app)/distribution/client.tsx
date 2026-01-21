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
import { PackageSearch } from 'lucide-react';
import type { Drug, Service, Distribution } from '@/lib/types';


const formSchema = z.object({
  barcode: z.string().min(1, 'Le code-barres est requis.'),
  quantity: z.coerce.number().min(1, 'La quantité doit être au moins de 1.'),
  service: z.string().min(1, 'Le service/section est requis.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function DistributionClientPage({
  initialDrugs,
  initialServices,
  initialDistributions,
}: {
  initialDrugs: Drug[];
  initialServices: Service[];
  initialDistributions: Distribution[];
}) {
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [distributions, setDistributions] = useState(initialDistributions);
  const [drugs, setDrugs] = useState(initialDrugs);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      barcode: '',
      quantity: 0,
      service: '',
    },
  });

  const barcodeValue = form.watch('barcode');

  useMemo(() => {
    const drug = drugs.find((d) => d.barcode === barcodeValue);
    setSelectedDrug(drug || null);
  }, [barcodeValue, drugs]);

  function onSubmit(values: FormValues) {
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

    const newDistribution = {
      id: `dist_${new Date().getTime()}`,
      barcode: values.barcode,
      itemName: selectedDrug.designation,
      quantityDistributed: values.quantity,
      service: initialServices.find(s => s.id === values.service)?.name ?? 'Inconnu',
      date: new Date().toISOString().split('T')[0],
    };

    setDistributions(prev => [newDistribution, ...prev]);

    // NOTE: This only updates the state in the browser.
    // It does not write back to the Google Sheet.
    setDrugs(prevDrugs => prevDrugs.map(d => 
        d.barcode === values.barcode 
            ? { ...d, currentStock: d.currentStock - values.quantity }
            : d
    ));

    toast({
      title: 'Distribution réussie',
      description: `${values.quantity} unités de ${selectedDrug.designation} distribuées.`,
    });
    form.reset();
    setSelectedDrug(null);
  }

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
                        <Input placeholder="Scannez ou entrez le code-barres" {...field} />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un service" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {initialServices.map((service) => (
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

                <Button type="submit" className="w-full">Distribuer</Button>
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
                {distributions.slice(0, 10).map((dist) => (
                  <TableRow key={dist.id}>
                    <TableCell className="font-medium">{dist.itemName}</TableCell>
                    <TableCell>{dist.quantityDistributed}</TableCell>
                    <TableCell>{dist.service}</TableCell>
                    <TableCell>{dist.date}</TableCell>
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
