"use client"

import Image from "next/image"
import Link from "next/link"
import { Bell, User, Menu, LogOut, AlertTriangle, CalendarClock } from "lucide-react"
import { getAuth, signOut } from "firebase/auth";
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"
import { useUser, useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { Search } from "./Search";
import { useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { collection } from "firebase/firestore";
import type { Drug } from "@/lib/types";

export function Header() {
  const router = useRouter();
  const { user } = useUser();
  
  const { firestore, isUserLoading } = useFirebase();
  const drugsQuery = useMemoFirebase(() => (firestore && !isUserLoading) ? collection(firestore, 'drugs') : null, [firestore, isUserLoading]);
  const { data: drugs } = useCollection<Drug>(drugsQuery);

  type Notification = {
    id: string;
    type: 'low_stock' | 'nearing_expiry';
    title: string;
    description: string;
    drugId: string;
  };

  const notifications = useMemo(() => {
    if (!drugs) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isExpired = (drug: Drug) => {
      if (!drug.expiryDate || drug.expiryDate === 'N/A') return false;
      const expiryDate = new Date(drug.expiryDate);
      return expiryDate < today;
    };
    
    const nearingExpiryItems = drugs.filter(d => {
      if (!d.expiryDate || d.expiryDate === 'N/A' || isExpired(d)) return false;
      const expiryDate = new Date(d.expiryDate);
      const next3Months = new Date();
      next3Months.setMonth(today.getMonth() + 3);
      return expiryDate <= next3Months;
    });

    const lowStockItems = drugs.filter(d => d.currentStock < d.lowStockThreshold && !isExpired(d));

    const allNotifications: Notification[] = [];

    lowStockItems.forEach(drug => {
      allNotifications.push({
        id: `low_stock_${drug.id}`,
        type: 'low_stock',
        title: 'Stock Faible',
        description: `${drug.designation} (Lot: ${drug.lotNumber ?? 'N/A'}) est en dessous du seuil.`,
        drugId: drug.id
      });
    });

    nearingExpiryItems.forEach(drug => {
      allNotifications.push({
        id: `nearing_expiry_${drug.id}`,
        type: 'nearing_expiry',
        title: 'Péremption Proche',
        description: `${drug.designation} (Lot: ${drug.lotNumber ?? 'N/A'}) expire le ${drug.expiryDate}.`,
        drugId: drug.id
      });
    });

    return allNotifications;
  }, [drugs]);

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    router.push('/login');
  }

  const handleNotificationClick = (drugId: string) => {
    router.push(`/inventory?highlight=${drugId}`);
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="flex">
            <Menu />
        </SidebarTrigger>
      </div>
      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <div className="ml-auto flex-1 sm:flex-initial">
          <Search />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-full">
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {notifications.length > 9 ? "9+" : notifications.length}
                </span>
              )}
              <span className="sr-only">Toggle notifications</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-96 p-0">
            <div className="flex items-center justify-between p-3">
              <h3 className="font-medium">Notifications</h3>
              {notifications.length > 0 && (
                <span className="text-sm text-muted-foreground">{notifications.length} non lues</span>
              )}
            </div>
            <Separator />
            {notifications.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="cursor-pointer border-b p-3 last:border-b-0 hover:bg-accent"
                    onClick={() => handleNotificationClick(notif.drugId)}
                  >
                    <div className="flex items-start gap-3">
                      <div>
                        {notif.type === "low_stock" && <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-500" />}
                        {notif.type === "nearing_expiry" && <CalendarClock className="mt-0.5 h-5 w-5 text-orange-500" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{notif.title}</p>
                        <p className="text-sm text-muted-foreground">{notif.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Aucune nouvelle notification.
              </div>
            )}
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
              {user?.photoURL ? (
                 <Image
                    src={user.photoURL}
                    alt={user.displayName || 'User avatar'}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
              ) : <User className="h-5 w-5" /> }
             
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.displayName || 'Mon Compte'}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/settings">
              <DropdownMenuItem>Paramètres</DropdownMenuItem>
            </Link>
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4"/>
              <span>Déconnexion</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
