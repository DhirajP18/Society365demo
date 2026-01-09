'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Users, Building2, Bell, CreditCard, Settings, LogOut } from 'lucide-react'
import clsx from 'clsx'

const menu = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Residents', href: '/residents', icon: Users },
  // { name: 'Flats', href: '/flats', icon: Building2 },
  { name: 'Notices', href: '/notices', icon: Bell },
  { name: 'Payments', href: '/payments', icon: CreditCard },
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* SIDEBAR */}
      <aside className="w-60 bg-white border-r flex flex-col">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b">
          <span className="text-lg font-semibold text-gray-900">
            Society365
          </span>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {menu.map((item) => {
            const Icon = item.icon
            const active = pathname.startsWith(item.href)

            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition',
                  active
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Footer actions */}
        <div className="border-t px-3 py-3 space-y-1">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <Settings size={18} />
            Settings
          </Link>

          <button
            className="flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-md w-full"
            onClick={() => {
              localStorage.clear()
              window.location.href = '/login'
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
