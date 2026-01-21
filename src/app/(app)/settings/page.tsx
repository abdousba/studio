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
            title: "Settings Saved",
            description: "Your changes have been successfully saved.",
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
            title: "Service Added",
            description: `"${newService}" has been added.`
        });
    };

    const handleRemoveService = (serviceId: string) => {
        setServices(services.filter(s => s.id !== serviceId));
        toast({
            title: "Service Removed",
            variant: "destructive",
        });
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Profile Settings</CardTitle>
                    <CardDescription>Manage your public profile and account information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" defaultValue="Dr. Jane Doe" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue="jane.doe@hospital.com" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>Configure how you receive notifications.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div>
                            <Label htmlFor="low-stock-alerts">Low Stock Alerts</Label>
                            <p className="text-sm text-muted-foreground">Receive an email when a drug's stock is below the threshold.</p>
                        </div>
                        <Switch id="low-stock-alerts" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div>
                            <Label htmlFor="expiry-alerts">Expiry Alerts</Label>
                            <p className="text-sm text-muted-foreground">Receive an email for drugs nearing their expiry date.</p>
                        </div>
                        <Switch id="expiry-alerts" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Manage Services</CardTitle>
                    <CardDescription>Add or remove hospital services/departments.</CardDescription>
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
                            placeholder="New service name" 
                            value={newService}
                            onChange={(e) => setNewService(e.target.value)}
                        />
                        <Button onClick={handleAddService}>Add Service</Button>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSaveChanges}>Save All Changes</Button>
            </div>
        </div>
    );
}
