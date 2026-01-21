'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Barcode, Camera, Plus, Minus, ArrowLeft, X, Loader2 } from 'lucide-react';
import type { Drug, Service } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, setDoc, updateDoc, collection, addDoc, runTransaction } from 'firebase/firestore';


type Mode = 'selection' | 'pch' | 'distribution';

const pchFormSchema = z.object({
  barcode: z.string().min(1, 'Le code-barres est requis.'),
  designation: z.string().min(1, 'Le nom du médicament est requis.'),
  lotNumber: z.string().min(1, 'Le numéro de lot est requis.'),
  quantity: z.coerce.number().min(1, 'La quantité doit être au moins de 1.'),
});
type PchFormValues = z.infer<typeof pchFormSchema>;

const distributionFormSchema = z.object({
    barcode: z.string().min(1, 'Le code-barres est requis.'),
    lotNumber: z.string().min(1, 'Le numéro de lot est requis.'),
    quantity: z.coerce.number().min(1, 'La quantité doit être au moins de 1.'),
    service: z.string().min(1, 'Le service est requis.'),
});
type DistributionFormValues = z.infer<typeof distributionFormSchema>;

export default function ScanClientPage() {
    const { firestore } = useFirestore();
    const { user } = useUser();

    const drugsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'drugs') : null, [firestore]);
    const { data: drugs, isLoading: drugsLoading } = useCollection<Drug>(drugsQuery);

    const servicesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'services') : null, [firestore]);
    const { data: services, isLoading: servicesLoading } = useCollection<Service>(servicesQuery);
    
    const [mode, setMode] = useState<Mode>('selection');
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isScanning, setIsScanning] = useState(false);
    const [activeFormForScan, setActiveFormForScan] = useState<'pch' | 'distribution' | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const pchForm = useForm<PchFormValues>({
        resolver: zodResolver(pchFormSchema),
        defaultValues: { barcode: '', designation: '', lotNumber: '', quantity: 1 },
    });

    const distributionForm = useForm<DistributionFormValues>({
        resolver: zodResolver(distributionFormSchema),
        defaultValues: { barcode: '', lotNumber: '', quantity: 1, service: '' },
    });

    const pchBarcode = pchForm.watch('barcode');
    const selectedDrugForPch = useMemo(() => {
        const drug = drugs?.find(d => d.barcode === pchBarcode);
        if (drug) pchForm.clearErrors('barcode');
        return drug;
    }, [pchBarcode, drugs, pchForm]);

    useEffect(() => {
        if (selectedDrugForPch) {
            pchForm.setValue('designation', selectedDrugForPch.designation);
        } else if(pchBarcode) {
            pchForm.setValue('designation', '');
        }
    }, [selectedDrugForPch, pchBarcode, pchForm]);


    const distributionBarcode = distributionForm.watch('barcode');
    const selectedDrugForDistribution = useMemo(() => {
        const drug = drugs?.find(d => d.barcode === distributionBarcode);
        if (drug) distributionForm.clearErrors('barcode');
        return drug;
    }, [distributionBarcode, drugs, distributionForm]);
  
    const startScan = (formType: 'pch' | 'distribution') => {
        // @ts-ignore
        if (!('BarcodeDetector' in window)) {
        toast({
            variant: 'destructive',
            title: 'Non supporté',
            description: "La détection de codes-barres n'est pas supportée par ce navigateur.",
        });
        return;
        }
        setActiveFormForScan(formType);
        setIsScanning(true);
    };

    const stopScan = useCallback(() => {
        setIsScanning(false);
        if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
        }
    }, []);

    useEffect(() => {
    if (!isScanning) return;

    let intervalId: NodeJS.Timeout | null = null;
    let detector: any; // BarcodeDetector

    const initScanner = async () => {
      try {
        // @ts-ignore
        detector = new window.BarcodeDetector({ formats: ['ean_13', 'code_128', 'qr_code', 'upc_a', 'upc_e'] });
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          intervalId = setInterval(async () => {
            if (!videoRef.current || videoRef.current.paused || videoRef.current.readyState !== 4) return;
            
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const barcodeValue = barcodes[0].rawValue;
                
                if (activeFormForScan === 'pch') {
                  pchForm.setValue('barcode', barcodeValue, { shouldValidate: true });
                } else if (activeFormForScan === 'distribution') {
                  distributionForm.setValue('barcode', barcodeValue, { shouldValidate: true });
                }
                
                audioRef.current?.play();
                toast({ title: "Code-barres scanné!", description: `Code: ${barcodeValue}` });
                stopScan();
              }
            } catch (detectError) {
              // Ignore detection errors, they happen if the frame isn't ready
            }
          }, 300);
        }
      } catch (err) {
        console.error('Camera/Scanner init error:', err);
        let description = "Impossible d'accéder à la caméra. Veuillez vérifier les autorisations.";
        if (err instanceof DOMException) {
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            description = "L'accès à la caméra a été refusé. Veuillez l'autoriser dans les paramètres de votre navigateur.";
          } else if (err.name === "NotFoundError" || err.name === 'DevicesNotFoundError') {
            description = "Aucune caméra n'a été trouvée sur cet appareil.";
          }
        }
        toast({ variant: 'destructive', title: 'Erreur Caméra', description });
        stopScan();
      }
    };

    initScanner();

    return () => {
      if (intervalId) clearInterval(intervalId);
      stopScan();
    };
  }, [isScanning, activeFormForScan, stopScan, pchForm, distributionForm, toast]);

    const handlePchSubmit = async (values: PchFormValues) => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'La base de données n\'est pas connectée.' });
            return;
        }
        setIsSubmitting(true);
        const drugRef = doc(firestore, 'drugs', values.barcode);
        
        try {
            await runTransaction(firestore, async (transaction) => {
                const drugDoc = await transaction.get(drugRef);
                if (drugDoc.exists()) {
                    const currentStock = drugDoc.data().currentStock || 0;
                    const newStock = currentStock + values.quantity;
                    transaction.update(drugRef, { 
                        currentStock: newStock,
                        designation: values.designation // Also update designation if changed
                    });
                     toast({
                        title: 'Stock mis à jour',
                        description: `Le stock de ${values.designation} est maintenant de ${newStock}.`,
                    });
                } else {
                    const newDrug: Omit<Drug, 'id'> = {
                        barcode: values.barcode,
                        designation: values.designation,
                        currentStock: values.quantity,
                        expiryDate: 'N/A', // Default value, you might want a field for this
                        lowStockThreshold: 10, // Default value
                    };
                    transaction.set(drugRef, newDrug);
                    toast({
                        title: 'Nouveau médicament enregistré',
                        description: `${values.designation} a été ajouté à la base de données avec un stock de ${values.quantity}.`,
                    });
                }
            });
            pchForm.reset({ barcode: '', designation: '', lotNumber: '', quantity: 1 });
            setMode('selection');
        } catch (error) {
            console.error("Error writing to database", error);
            toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'enregistrer les données." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDistributionSubmit = async (values: DistributionFormValues) => {
        if (!firestore || !user || !selectedDrugForDistribution) {
          distributionForm.setError('barcode', { message: 'Code-barres invalide ou base de données non prête.' });
          return;
        }
        if (values.quantity > selectedDrugForDistribution.currentStock) {
          distributionForm.setError('quantity', {
            message: `Stock insuffisant. Seulement ${selectedDrugForDistribution.currentStock} disponible.`,
          });
          return;
        }
        
        setIsSubmitting(true);
        const selectedService = services?.find(s => s.id === values.service);

        try {
            const drugRef = doc(firestore, 'drugs', selectedDrugForDistribution.id);

            await runTransaction(firestore, async (transaction) => {
                const drugDoc = await transaction.get(drugRef);
                if (!drugDoc.exists()) throw new Error("Le médicament n'existe plus.");

                const newStock = drugDoc.data().currentStock - values.quantity;
                if (newStock < 0) throw new Error("Stock insuffisant pendant la transaction.");

                transaction.update(drugRef, { currentStock: newStock });

                const distColRef = collection(firestore, 'distributions');
                transaction.set(doc(distColRef), {
                    barcode: values.barcode,
                    itemName: selectedDrugForDistribution.designation,
                    quantityDistributed: values.quantity,
                    service: selectedService?.name ?? 'Inconnu',
                    serviceId: values.service,
                    date: new Date().toISOString(),
                    userId: user.uid,
                    lotNumber: values.lotNumber,
                });
            });

            toast({
                title: 'Distribution réussie',
                description: `${values.quantity} unités de ${selectedDrugForDistribution.designation} distribuées.`,
            });

            distributionForm.reset({ barcode: '', lotNumber: '', quantity: 1, service: '' });
            setMode('selection');

        } catch (error: any) {
            console.error("Distribution failed:", error);
            toast({ variant: 'destructive', title: "Erreur de distribution", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
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

    const renderScanner = () => (
        <div className={cn("fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90", isScanning ? "flex" : "hidden")}>
        <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:text-white" onClick={stopScan}>
            <X className="h-8 w-8" />
        </Button>
        <div className="relative w-full max-w-lg aspect-[4/3] overflow-hidden rounded-lg">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            <div className="absolute inset-0 border-4 border-red-500/50 m-8 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
        </div>
        <p className="mt-4 text-white">Veuillez aligner le code-barres dans le cadre.</p>
        </div>
    );

    if (mode === 'pch') {
        return (
        <>
            {renderScanner()}
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
                            <Input autoFocus placeholder="Scannez ou entrez le code-barres" className="pl-10 pr-12" {...field} />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => startScan('pch')}>
                                <Camera className="h-5 w-5" />
                            </Button>
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    <FormField
                    control={pchForm.control}
                    name="designation"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nom du médicament</FormLabel>
                        <FormControl>
                            <Input placeholder="Entrez le nom du médicament" {...field} />
                        </FormControl>
                        {selectedDrugForPch && (
                            <FormDescription>
                            Stock actuel: {selectedDrugForPch.currentStock}
                            </FormDescription>
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
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Quantité à ajouter</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    <Button type="submit" className="w-full" disabled={isSubmitting || drugsLoading}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Ajouter au Stock
                    </Button>
                </form>
                </Form>
            </CardContent>
            </Card>
        </>
        );
    }

    if (mode === 'distribution') {
        return (
        <>
            {renderScanner()}
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
                            <Input autoFocus placeholder="Scannez ou entrez le code-barres" className="pl-10 pr-12" {...field} />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => startScan('distribution')}>
                                <Camera className="h-5 w-5" />
                            </Button>
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    <FormItem>
                    <FormLabel>Nom du médicament</FormLabel>
                    <FormControl>
                        <Input
                        readOnly
                        disabled
                        value={selectedDrugForDistribution?.designation || ''}
                        placeholder="Le nom du médicament apparaîtra ici"
                        />
                    </FormControl>
                    {selectedDrugForDistribution && (
                        <FormDescription>
                        Stock actuel: {selectedDrugForDistribution.currentStock}
                        </FormDescription>
                    )}
                    </FormItem>

                    <FormField
                    control={distributionForm.control}
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
                    control={distributionForm.control}
                    name="service"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Service/Section</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={servicesLoading}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionnez un service de destination" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {services?.map((service) => (
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

                    <Button type="submit" className="w-full" disabled={isSubmitting || drugsLoading || servicesLoading}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Valider la Distribution
                    </Button>
                </form>
                </Form>
            </CardContent>
            </Card>
        </>
        );
    }

    return (
        <>
        {renderScanner()}
        <audio ref={audioRef} src="https://actions.google.com/sounds/v1/alarms/beep_short.ogg" preload="auto" />
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
                    <Plus className="h-12 w-12 text-green-500" />
                    <p className="mt-4 text-lg font-semibold text-foreground">Entrée de Stock (PCH)</p>
                    <p className="text-sm text-muted-foreground">Augmenter la quantité d'un produit en stock.</p>
                </Card>

                <Card 
                    className="flex cursor-pointer flex-col items-center justify-center p-8 text-center transition-colors hover:bg-muted"
                    onClick={() => setMode('distribution')}
                >
                    <Minus className="h-12 w-12 text-red-500" />
                    <p className="mt-4 text-lg font-semibold text-foreground">Distribution aux Services</p>
                    <p className="text-sm text-muted-foreground">Diminuer la quantité et l'assigner à un service.</p>
                </Card>
            </div>
        </div>
        </>
    );
}
