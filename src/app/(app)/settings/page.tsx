'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { services as initialServices } from "@/lib/data";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export default function SettingsPage() {
    const { toast } = useToast();
    const [services, setServices] = useState(initialServices);
    const [newService, setNewService] = useState('');

    const handleSaveChanges = () => {
        toast({
            title: "Paramètres enregistrés",
            description: "Vos modifications ont été enregistrées avec succès.",
        });
    };
    
    const handleAddService = () => {
        if (newService.trim() === '') return;
        const newServiceObj = {
            id: newService.toLowerCase().replace(/\s/g, '_'),
            name: newService,
        };
        setServices([...services, newServiceObj]);
        setNewService('');
        toast({
            title: "Service ajouté",
            description: `"${newService}" a été ajouté.`
        });
    };

    const handleRemoveService = (serviceId: string) => {
        setServices(services.filter(s => s.id !== serviceId));
        toast({
            title: "Service supprimé",
            variant: "destructive",
        });
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
                        <Input id="name" defaultValue="Dr. Jeanne Dupont" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue="jeanne.dupont@hopital.com" />
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
                        {services.map(service => (
                            <div key={service.id} className="flex items-center justify-between">
                                <span>{service.name}</span>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveService(service.id)}>
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
                        <Button onClick={handleAddService}>Ajouter un service</Button>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSaveChanges}>Enregistrer toutes les modifications</Button>
            </div>
        </div>
    );
}
