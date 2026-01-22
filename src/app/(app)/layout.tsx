import type { ReactNode } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar"
import { SidebarNav } from "@/components/layout/SidebarNav"
import { Header } from "@/components/layout/Header"
import { BottomNavBar } from "@/components/layout/BottomNavBar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar>
          <SidebarNav />
      </Sidebar>
      <SidebarInset>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 p-4 pb-20 md:p-6 lg:p-8">
                {children}
            </main>
            <BottomNavBar />
          </div>
          <Tooltip>
              <TooltipTrigger asChild>
                  <Button asChild className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full shadow-lg md:bottom-8 md:right-8">
                      <Link href="/scan" aria-label="Ajouter un produit ou une distribution">
                          <Plus className="h-7 w-7" />
                          <span className="sr-only">Ajouter un produit</span>
                      </Link>
                  </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                  <p>Scanner un produit</p>
              </TooltipContent>
          </Tooltip>
      </SidebarInset>
    </SidebarProvider>
  )
}
