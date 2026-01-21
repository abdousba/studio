'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Barcode, Camera, Hospital, Plus, Minus, ArrowLeft } from 'lucide-react';
import type { Drug, Service } from '@/lib/types';

type Mode = 'selection' | 'pch' | 'distribution';

const pchFormSchema = z.object({
  barcode: z.string().min(1, 'Le code-barres est requis.'),
  lotNumber: z.string().min(1, 'Le numéro de lot est requis.'),
  quantity: z.coerce.number().min(1, 'La quantité doit être au moins de 1.'),
});
type PchFormValues = z.infer<typeof pchFormSchema>;

const distributionFormSchema = z.object({
    barcode: z.string().min(1, 'Le code-barres est requis.'),
    quantity: z.coerce.number().min(1, 'La quantité doit être au moins de 1.'),
    service: z.string().min(1, 'Le service est requis.'),
});
type DistributionFormValues = z.infer<typeof distributionFormSchema>;

export default function ScanClientPage({ 
    initialDrugs, 
    initialServices 
}: { 
    initialDrugs: Drug[],
    initialServices: Service[] 
}) {
  const [mode, setMode] = useState<Mode>('selection');
  const [drugs, setDrugs] = useState<Drug[]>(initialDrugs);
  const { toast } = useToast();

  const pchForm = useForm<PchFormValues>({
    resolver: zodResolver(pchFormSchema),
    defaultValues: { barcode: '', lotNumber: '', quantity: 1 },
  });

  const distributionForm = useForm<DistributionFormValues>({
      resolver: zodResolver(distributionFormSchema),
      defaultValues: { barcode: '', quantity: 1, service: '' },
  });

  const pchBarcode = pchForm.watch('barcode');
  const selectedDrugForPch = useMemo(() => {
      const drug = drugs.find(d => d.barcode === pchBarcode);
      if (drug) pchForm.clearErrors('barcode');
      return drug;
  }, [pchBarcode, drugs, pchForm]);

  const distributionBarcode = distributionForm.watch('barcode');
  const selectedDrugForDistribution = useMemo(() => {
      const drug = drugs.find(d => d.barcode === distributionBarcode);
      if (drug) distributionForm.clearErrors('barcode');
      return drug;
  }, [distributionBarcode, drugs, distributionForm]);

  const handlePchSubmit = (values: PchFormValues) => {
    if (!selectedDrugForPch) {
        pchForm.setError('barcode', { message: "Médicament non trouvé dans l'inventaire." });
        return;
    }

    // NOTE: This only updates the state in the browser.
    // It does not write back to the Google Sheet.
    setDrugs(prevDrugs => prevDrugs.map(d => 
        d.barcode === values.barcode 
            ? { ...d, currentStock: d.currentStock + values.quantity }
            : d
    ));
    
    toast({
        title: 'Entrée de stock réussie',
        description: `${values.quantity} unités de ${selectedDrugForPch.designation} ajoutées au stock.`,
    });

    pchForm.reset({ barcode: '', lotNumber: '', quantity: 1 });
    setMode('selection');
  };

  const handleDistributionSubmit = (values: DistributionFormValues) => {
    if (!selectedDrugForDistribution) {
      distributionForm.setError('barcode', { message: 'Code-barres invalide. Médicament non trouvé.' });
      return;
    }
    if (values.quantity > selectedDrugForDistribution.currentStock) {
      distributionForm.setError('quantity', {
        message: `Stock insuffisant. Seulement ${selectedDrugForDistribution.currentStock} disponible.`,
      });
      return;
    }

    // NOTE: This only updates the state in the browser.
    // It does not write back to the Google Sheet.
    setDrugs(prevDrugs => prevDrugs.map(d => 
        d.barcode === values.barcode 
            ? { ...d, currentStock: d.currentStock - values.quantity }
            : d
    ));

    toast({
      title: 'Distribution réussie',
      description: `${values.quantity} unités de ${selectedDrugForDistribution.designation} distribuées.`,
    });

    distributionForm.reset({ barcode: '', quantity: 1, service: '' });
    setMode('selection');
  };

  const QuantityInput = ({ form, fieldName }: { form: any, fieldName: "quantity" }) => (
    <div className="flex items-center gap-4">
      <Button type="button" variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={() => form.setValue(fieldName, Math.max(1, form.getValues(fieldName) - 1))}>
        <Minus className="h-6 w-6" />
      </Button>
      <span className="text-4xl font-bold w-20 text-center">{form.watch(fieldName)}</span>
      <Button type="button" variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={() => form.setValue(fieldName, form.getValues(fieldName) + 1)}>
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );


  if (mode === 'pch') {
    return (
      <Card className="max-w-lg mx-auto relative">
        <CardHeader>
            <Button variant="ghost" size="icon" className="absolute left-2 top-2" onClick={() => setMode('selection')}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
          <CardTitle className="text-center pt-8">Entrée de Stock (PCH)</CardTitle>
          <CardDescription className="text-center">
            Augmenter la quantité en stock d'un médicament.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...pchForm}>
            <form onSubmit={pchForm.handleSubmit(handlePchSubmit)} className="space-y-6">
               <FormField
                control={pchForm.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code-barres</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input autoFocus placeholder="Scannez ou entrez le code-barres" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    {selectedDrugForPch && (
                        <p className='text-sm text-muted-foreground pt-1'>
                            Médicament: <span className='font-bold text-foreground'>{selectedDrugForPch.designation}</span> (Stock: {selectedDrugForPch.currentStock})
                        </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={pchForm.control}
                name="lotNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de Lot</FormLabel>
                    <FormControl>
                      <Input placeholder="Entrez le numéro de lot" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={pchForm.control}
                name="quantity"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-center block">Quantité à ajouter</FormLabel>
                    <FormControl>
                       <div className="flex justify-center pt-2">
                            <QuantityInput form={pchForm} fieldName="quantity" />
                       </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full">Ajouter au Stock</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  if (mode === 'distribution') {
    return (
      <Card className="max-w-lg mx-auto relative">
        <CardHeader>
            <Button variant="ghost" size="icon" className="absolute left-2 top-2" onClick={() => setMode('selection')}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
          <CardTitle className="text-center pt-8">Distribution aux Services</CardTitle>
          <CardDescription className="text-center">
            Diminuer la quantité en stock d'un médicament.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...distributionForm}>
            <form onSubmit={distributionForm.handleSubmit(handleDistributionSubmit)} className="space-y-6">
                <FormField
                control={distributionForm.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code-barres</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input autoFocus placeholder="Scannez ou entrez le code-barres" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                     {selectedDrugForDistribution && (
                        <p className='text-sm text-muted-foreground pt-1'>
                            Médicament: <span className='font-bold text-foreground'>{selectedDrugForDistribution.designation}</span> (Stock: {selectedDrugForDistribution.currentStock})
                        </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

               <FormField
                control={distributionForm.control}
                name="service"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Service/Section</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un service de destination" />
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

              <FormField
                control={distributionForm.control}
                name="quantity"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-center block">Quantité à distribuer</FormLabel>
                    <FormControl>
                        <div className="flex justify-center pt-2">
                            <QuantityInput form={distributionForm} fieldName="quantity" />
                        </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full">Valider la Distribution</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex w-full flex-col items-center justify-center p-4">
        <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">Scanner un produit</h1>
            <p className="text-muted-foreground">Choisissez une action à effectuer.</p>
        </div>
        <div className="grid w-full max-w-2xl grid-cols-1 gap-8 md:grid-cols-2">
            <Card 
                className="flex cursor-pointer flex-col items-center justify-center p-8 text-center transition-colors hover:bg-muted"
                onClick={() => setMode('pch')}
            >
                <Barcode className="h-20 w-20 text-foreground" />
                <Camera className="mb-2 mt-4 h-10 w-10 text-muted-foreground" />
                <p className="text-lg font-semibold text-foreground">PCH</p>
            </Card>

            <Card 
                className="flex cursor-pointer flex-col items-center justify-center p-8 text-center transition-colors hover:bg-muted"
                onClick={() => setMode('distribution')}
            >
                <Hospital className="h-20 w-20 text-foreground" />
                <Camera className="mb-2 mt-4 h-10 w-10 text-muted-foreground" />
                <p className="text-lg font-semibold text-foreground">Distribution</p>
            </Card>
        </div>
    </div>
  );
}
