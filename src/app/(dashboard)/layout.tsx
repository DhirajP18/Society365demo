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
        <div className="flex min-h-screen w-full">
          <AppSidebar />

          <div className="flex flex-col flex-1">
            <AppHeader />
            <main className="flex-1 p-3 sm:p-4 md:p-6 bg-muted/40 dark:bg-background">
              {children}
            </main>
            <AppFooter />
          </div>
        </div>
      </SidebarProvider>
    </AuthGuard>
  )
}
