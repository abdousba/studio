'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Boxes, Hospital, LayoutDashboard, Settings, Truck, Wand2 } from 'lucide-react';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarContent,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/distribution', label: 'Distribution', icon: Truck },
  { href: '/adjustments', label: 'Adjustments', icon: Wand2 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <Hospital className="h-8 w-8 text-primary" />
          <span className="text-xl font-semibold">PharmaTrack</span>
        </div>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <SidebarMenu>
          {links.map((link) => (
            <SidebarMenuItem key={link.href}>
              <Link href={link.href} className="w-full">
                <SidebarMenuButton
                  isActive={pathname === link.href}
                  tooltip={link.label}
                >
                  <link.icon />
                  <span>{link.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <Separator />
         <div className="p-4 text-xs text-muted-foreground">
            © 2024 PharmaTrack Inc.
         </div>
      </SidebarFooter>
    </>
  );
}
