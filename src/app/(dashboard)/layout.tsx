"use client"

import AppSidebar from "@/components/common/AppSidebar"
import AppHeader from "@/components/common/AppHeader"
import AppFooter from "@/components/common/AppFooter"
import AuthGuard from "@/components/common/AuthGuard"
import { SidebarProvider } from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="flex h-[100dvh] min-h-[100dvh] w-full overflow-hidden">
          <AppSidebar />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <AppHeader />
            <main className="min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden bg-muted/40 p-2 sm:p-4 md:p-6 dark:bg-background">
              {children}
            </main>
            <AppFooter />
          </div>
        </div>
      </SidebarProvider>
    </AuthGuard>
  )
}
