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
  useSidebar,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

const links = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/inventory', label: 'Inventaire', icon: Boxes },
  { href: '/distribution', label: 'Distribution', icon: Truck },
  { href: '/adjustments', label: 'Ajustements', icon: Wand2 },
  { href: '/settings', label: 'Paramètres', icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <Hospital className="h-8 w-8 text-primary" />
          <span className="text-xl font-semibold">PharmaSuivi</span>
        </div>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <SidebarMenu>
          {links.map((link) => (
            <SidebarMenuItem key={link.href}>
              <Link href={link.href} className="w-full" onClick={handleLinkClick}>
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
            © 2024 PharmaSuivi Inc.
         </div>
      </SidebarFooter>
    </>
  );
}
