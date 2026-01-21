"use client"

import Image from "next/image"
import Link from "next/link"
import { Bell, Search, User, Menu, LogOut } from "lucide-react"
import { getAuth, signOut } from "firebase/auth";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { usePathname, useRouter } from "next/navigation"
import { useUser } from "@/firebase";

const pageTitles: { [key: string]: string } = {
  "/dashboard": "Tableau de bord",
  "/inventory": "Inventaire des médicaments",
  "/scan": "Scanner Produits",
  "/adjustments": "Ajustements des stocks",
  "/settings": "Paramètres",
}

export function Header() {
  const pathname = usePathname()
  const router = useRouter();
  const { user } = useUser();

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    router.push('/login');
  }


  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="flex">
            <Menu />
        </SidebarTrigger>
        <h1 className="text-lg font-semibold md:text-2xl">
          {pageTitles[pathname] ?? "PharmaSuivi"}
        </h1>
      </div>
      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <form className="ml-auto flex-1 sm:flex-initial">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher des médicaments..."
              className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
            />
          </div>
        </form>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Toggle notifications</span>
        </Button>
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
