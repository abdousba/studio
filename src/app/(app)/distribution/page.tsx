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
import { drugs, services, distributions as initialDistributions, type Drug } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { PackageSearch } from 'lucide-react';

const formSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required.'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
  service: z.string().min(1, 'Service/Section is required.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function DistributionPage() {
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [distributions, setDistributions] = useState(initialDistributions);
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
  }, [barcodeValue]);

  function onSubmit(values: FormValues) {
    if (!selectedDrug) {
      form.setError('barcode', { message: 'Invalid barcode. Drug not found.' });
      return;
    }
    if (values.quantity > selectedDrug.currentStock) {
      form.setError('quantity', {
        message: `Not enough stock. Only ${selectedDrug.currentStock} available.`,
      });
      return;
    }

    const newDistribution = {
      id: `dist_${new Date().getTime()}`,
      barcode: values.barcode,
      itemName: selectedDrug.designation,
      quantityDistributed: values.quantity,
      service: services.find(s => s.id === values.service)?.name ?? 'Unknown',
      date: new Date().toISOString().split('T')[0],
    };

    setDistributions(prev => [newDistribution, ...prev]);

    // This would typically update the backend data
    const drugIndex = drugs.findIndex(d => d.barcode === values.barcode);
    if(drugIndex !== -1) {
        drugs[drugIndex].currentStock -= values.quantity;
    }

    toast({
      title: 'Distribution Successful',
      description: `${values.quantity} units of ${selectedDrug.designation} distributed.`,
    });
    form.reset();
    setSelectedDrug(null);
  }

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>New Distribution</CardTitle>
            <CardDescription>
              Scan a barcode and enter the quantity to distribute.
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
                      <FormLabel>Barcode</FormLabel>
                      <FormControl>
                        <Input placeholder="Scan or enter barcode" {...field} />
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
                        <p>In stock: {selectedDrug.currentStock}</p>
                    </div>
                  </div>
                )}
                
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
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
                            <SelectValue placeholder="Select a service" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {services.map((service) => (
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

                <Button type="submit" className="w-full">Distribute</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Distributions</CardTitle>
            <CardDescription>
              A log of the most recent drug distributions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Quantity</TableHead>
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
