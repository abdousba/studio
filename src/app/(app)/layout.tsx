import type { ReactNode } from "react"
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar"
import { SidebarNav } from "@/components/layout/SidebarNav"
import { Header } from "@/components/layout/Header"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar>
          <SidebarNav />
      </Sidebar>
      <SidebarInset>
          <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 p-4 md:p-6 lg:p-8">
              {children}
          </main>
          </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
