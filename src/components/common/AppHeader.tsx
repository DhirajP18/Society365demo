"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Bell,
  Search,
  Sun,
  Moon,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Clock,
  CheckCheck,
  Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type Notification = {
  id: number
  title: string
  message: string
  time: string
  read: boolean
}

type UserInfo = {
  name: string
  email: string
  role: string
}

// ─── Demo notifications ───────────────────────────────────────────────────────

const DEMO_NOTIFICATIONS: Notification[] = [
  { id: 1, title: "New Member Added",    message: "Rahul Sharma has been added to Block A.",       time: "2 min ago",  read: false },
  { id: 2, title: "Maintenance Request", message: "Flat 304 raised a plumbing issue.",              time: "15 min ago", read: false },
  { id: 3, title: "Payment Received",    message: "₹5,000 maintenance fee received from Flat 201.", time: "1 hr ago",   read: true  },
]

// ─── Avatar Initials ──────────────────────────────────────────────────────────

function AvatarInitials({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold select-none shrink-0",
        className
      )}
    >
      {initials}
    </div>
  )
}

// ─── App Header ───────────────────────────────────────────────────────────────

export default function AppHeader() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const [user, setUser] = useState<UserInfo>({ name: "Guest User", email: "", role: "" })
  const [clientName, setClientName] = useState("Subhal Srushti Apartment")
  const [notifications, setNotifications] = useState<Notification[]>(DEMO_NOTIFICATIONS)

  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem("user")
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, string>
        setUser({
          name: parsed.name ?? parsed.fullName ?? parsed.userName ?? "User",
          email: parsed.email ?? "",
          role: parsed.roleName ?? parsed.role ?? "",
        })
      }
      const society = localStorage.getItem("societyName") ?? localStorage.getItem("clientName")
      if (society) setClientName(society)
    } catch {
      // ignore
    }
  }, [])

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("roleId")
    sessionStorage.clear()
    router.replace("/login")
  }

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))

  const markRead = (id: number) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-background/95 backdrop-blur-sm flex items-center gap-2 px-3 sm:px-4">

      {/* ── Mobile Hamburger (only visible on mobile) ── */}
      {/* SidebarTrigger from shadcn controls the Sheet on mobile */}
      <SidebarTrigger className="md:hidden h-9 w-9 shrink-0 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" />

      {/* ── Left: Client / Society Name ── */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary shrink-0">
          <Building2 className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="text-[13.5px] font-bold text-foreground tracking-tight hidden sm:block">
          {clientName}
        </span>
      </div>

      {/* ── Center: Search ── */}
      <div className="flex-1 max-w-sm mx-auto sm:mx-0 sm:max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search..."
            className="pl-9 h-9 text-[13px] bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-ring rounded-lg w-full"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* ── Right Actions ── */}
      <div className="flex items-center gap-1 shrink-0 ml-auto">

        {/* Theme Toggle */}
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-[17px] w-[17px]" /> : <Moon className="h-[17px] w-[17px]" />}
          </Button>
        )}

        {/* Notification Bell */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground relative"
            >
              <Bell className="h-[17px] w-[17px]" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-[7px] w-[7px]">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-[7px] w-[7px] bg-red-500" />
                </span>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-[320px] sm:w-[360px] p-0 rounded-xl shadow-xl border border-border overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-foreground" />
                <span className="text-[14px] font-semibold text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5 text-[10px] rounded-full">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[12px] text-primary hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[320px] overflow-y-auto divide-y divide-border/60">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Bell className="h-8 w-8 opacity-30" />
                  <p className="text-[13px] font-medium">No messages</p>
                  <p className="text-[12px] opacity-60">You&apos;re all caught up!</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markRead(notif.id)}
                    className={cn(
                      "flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50",
                      !notif.read && "bg-primary/5"
                    )}
                  >
                    <div className="mt-1.5 shrink-0">
                      <span className={cn("block h-2 w-2 rounded-full", notif.read ? "bg-transparent" : "bg-primary")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground leading-snug">{notif.title}</p>
                      <p className="text-[12.5px] text-muted-foreground mt-0.5 leading-snug">{notif.message}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground/60" />
                        <span className="text-[11px] text-muted-foreground/60">{notif.time}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-4 py-2.5 bg-muted/20">
              <button
                className="w-full text-center text-[12.5px] text-primary hover:underline font-medium"
                onClick={() => router.push("/notifications")}
              >
                View all notification history →
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Divider */}
        <div className="h-5 w-px bg-border mx-1 hidden sm:block" />

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors outline-none">
              <AvatarInitials name={user.name} className="h-7 w-7 text-[11px]" />
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-[13px] font-semibold text-foreground leading-tight max-w-[110px] truncate">
                  {user.name}
                </span>
                {user.role && (
                  <span className="text-[11px] text-muted-foreground leading-tight">{user.role}</span>
                )}
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-xl p-1.5">
            <DropdownMenuLabel className="px-2 py-2">
              <div className="flex items-center gap-2.5">
                <AvatarInitials name={user.name} className="h-9 w-9 text-[13px]" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[13.5px] font-semibold text-foreground truncate">{user.name}</span>
                  {user.email && (
                    <span className="text-[11.5px] text-muted-foreground truncate">{user.email}</span>
                  )}
                  {user.role && (
                    <span className="text-[11px] text-primary font-medium mt-0.5">{user.role}</span>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] cursor-pointer"
              onClick={() => router.push("/profile")}
            >
              <User className="h-4 w-4 text-muted-foreground" />
              My Profile
            </DropdownMenuItem>

            <DropdownMenuItem
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] cursor-pointer"
              onClick={() => router.push("/settings")}
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              Settings
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
