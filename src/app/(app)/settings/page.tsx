'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import type { Service } from "@/lib/types";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, addDoc, doc, deleteDoc } from 'firebase/firestore';


export default function SettingsPage() {
    const { user } = useUser();
    const { firestore } = useFirestore();
    
    const servicesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'services') : null, [firestore]);
    const { data: services, isLoading: servicesLoading } = useCollection<Service>(servicesQuery);

    const { toast } = useToast();
    
    const [newService, setNewService] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSaveChanges = () => {
        toast({
            title: "Paramètres enregistrés",
            description: "Vos modifications ont été enregistrées avec succès.",
        });
    };
    
    const handleAddService = async () => {
        if (newService.trim() === '' || !firestore) return;
        
        setIsSubmitting(true);
        try {
            const servicesCollection = collection(firestore, 'services');
            await addDoc(servicesCollection, { name: newService });
            
            setNewService('');
            toast({
                title: "Service ajouté",
                description: `"${newService}" a été ajouté.`
            });
        } catch (error) {
            console.error("Error adding service:", error);
            toast({ title: "Erreur", description: "Impossible d'ajouter le service.", variant: "destructive"});
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveService = async (serviceId: string, serviceName: string) => {
        if (!firestore) return;

        const confirmation = confirm(`Êtes-vous sûr de vouloir supprimer le service "${serviceName}" ?`);
        if (!confirmation) return;
        
        try {
            const serviceDoc = doc(firestore, 'services', serviceId);
            await deleteDoc(serviceDoc);
            toast({
                title: "Service supprimé",
                variant: "default",
            });
        } catch (error) {
            console.error("Error removing service:", error);
            toast({ title: "Erreur", description: "Impossible de supprimer le service.", variant: "destructive"});
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Paramètres du profil</CardTitle>
                    <CardDescription>Gérez votre profil public et les informations de votre compte.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nom</Label>
                        <Input id="name" defaultValue={user?.displayName ?? ''} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue={user?.email ?? ''} readOnly disabled />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>Configurez la manière dont vous recevez les notifications.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div>
                            <Label htmlFor="low-stock-alerts">Alertes de stock faible</Label>
                            <p className="text-sm text-muted-foreground">Recevez un e-mail lorsque le stock d'un médicament est inférieur au seuil.</p>
                        </div>
                        <Switch id="low-stock-alerts" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div>
                            <Label htmlFor="expiry-alerts">Alertes d'expiration</Label>
                            <p className="text-sm text-muted-foreground">Recevez un e-mail pour les médicaments approchant de leur date d'expiration.</p>
                        </div>
                        <Switch id="expiry-alerts" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Gérer les services</CardTitle>
                    <CardDescription>Ajoutez ou supprimez des services/départements hospitaliers.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {servicesLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                        {services?.map(service => (
                            <div key={service.id} className="flex items-center justify-between">
                                <span>{service.name}</span>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveService(service.id, service.name)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                    <Separator className="my-6" />
                    <div className="flex space-x-2">
                        <Input 
                            placeholder="Nom du nouveau service" 
                            value={newService}
                            onChange={(e) => setNewService(e.target.value)}
                        />
                        <Button onClick={handleAddService} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Ajouter un service
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSaveChanges}>Enregistrer toutes les modifications</Button>
            </div>
        </div>
    );
}
