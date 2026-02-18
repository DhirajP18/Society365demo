// components/Layout.tsx
import React, { ReactNode } from "react"
import AppSidebar from "./common/AppSidebar"

type LayoutProps = {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow p-4 sticky top-0 z-10">
          <h1 className="text-xl font-bold">Dashboard Header</h1>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 bg-gray-50">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white shadow p-4 text-center">
          &copy; {new Date().getFullYear()} My Company
        </footer>
      </div>
    </div>
  )
}
