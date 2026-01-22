"use client"

import Image from "next/image"
import Link from "next/link"
import { Bell, User, Menu, LogOut, AlertTriangle, CalendarClock, Check, MoreHorizontal } from "lucide-react"
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
import { useMemo, useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { collection } from "firebase/firestore";
import type { Drug } from "@/lib/types";
import { cn } from "@/lib/utils";

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
    isRead: boolean;
  };

  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);


  useEffect(() => {
    try {
      const storedReadIds = localStorage.getItem('readNotificationIds');
      if (storedReadIds) {
          setReadNotifications(JSON.parse(storedReadIds));
      }
    } catch (error) {
      console.error("Failed to parse read notifications from localStorage", error);
      localStorage.removeItem('readNotificationIds');
    }
  }, []);

  const { allNotifications, unreadCount } = useMemo(() => {
    if (!drugs) return { allNotifications: [], unreadCount: 0 };

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

    const allNotifs: Notification[] = [
        ...lowStockItems.map(drug => ({
            id: `low_stock_${drug.id}`,
            type: 'low_stock' as const,
            title: 'Stock Faible',
            description: `${drug.designation} (Lot: ${drug.lotNumber ?? 'N/A'}) est en dessous du seuil.`,
            drugId: drug.id,
            isRead: readNotifications.includes(`low_stock_${drug.id}`)
        })),
        ...nearingExpiryItems.map(drug => ({
            id: `nearing_expiry_${drug.id}`,
            type: 'nearing_expiry' as const,
            title: 'Péremption Proche',
            description: `${drug.designation} (Lot: ${drug.lotNumber ?? 'N/A'}) expire le ${drug.expiryDate}.`,
            drugId: drug.id,
            isRead: readNotifications.includes(`nearing_expiry_${drug.id}`)
        }))
    ];

    // This crude sort pushes unread notifications to the top.
    allNotifs.sort((a, b) => (a.isRead === b.isRead) ? 0 : a.isRead ? 1 : -1);

    const currentUnreadCount = allNotifs.filter(n => !n.isRead).length;

    return { allNotifications: allNotifs, unreadCount: currentUnreadCount };
  }, [drugs, readNotifications]);


  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    router.push('/login');
  }

  const handleNotificationClick = (drugId: string, notificationId: string) => {
    if (!readNotifications.includes(notificationId)) {
        const newReadIds = [...new Set([...readNotifications, notificationId])];
        setReadNotifications(newReadIds);
        localStorage.setItem('readNotificationIds', JSON.stringify(newReadIds));
    }
    router.push(`/inventory?highlight=${drugId}`);
  };
  
  const handleMarkAllAsRead = () => {
    const unreadIds = allNotifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) return;
    
    const newReadIds = [...new Set([...readNotifications, ...unreadIds])];
    setReadNotifications(newReadIds);
    localStorage.setItem('readNotificationIds', JSON.stringify(newReadIds));
  };

  const displayedNotifications = showAll ? allNotifications : allNotifications.slice(0, 10);

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

        <Popover onOpenChange={() => setShowAll(false)}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-full">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              <span className="sr-only">Toggle notifications</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-96 p-0">
            <div className="flex items-center justify-between p-3">
              <h3 className="font-medium">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-sm text-muted-foreground">{unreadCount} non lues</span>
              )}
            </div>
            <Separator />
            {allNotifications.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                {displayedNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={cn("cursor-pointer border-b p-3 last:border-b-0 hover:bg-accent", notif.isRead && 'opacity-60')}
                    onClick={() => handleNotificationClick(notif.drugId, notif.id)}
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
            
            {(allNotifications.length > 10 || unreadCount > 0) && <Separator />}
            
            <div className="p-2 space-y-1">
                {allNotifications.length > 10 && (
                    <Button size="sm" variant="ghost" className="w-full" onClick={() => setShowAll(!showAll)}>
                        {showAll ? 'Afficher moins' : `Afficher ${allNotifications.length - 10} de plus`}
                    </Button>
                )}
                {unreadCount > 0 && (
                    <Button size="sm" variant="outline" className="w-full" onClick={handleMarkAllAsRead}>
                        <Check className="mr-2 h-4 w-4" />
                        Tout marquer comme lu
                    </Button>
                )}
            </div>

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
