"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
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
  Bell, Search, Sun, Moon, LogOut, User,
  Settings, ChevronDown, Clock, CheckCheck,
  Building2, MapPin, X,
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
  { id: 1, title: "New Member Added",    message: "Rahul Sharma has been added to Block A.",        time: "2 min ago",  read: false },
  { id: 2, title: "Maintenance Request", message: "Flat 304 raised a plumbing issue.",               time: "15 min ago", read: false },
  { id: 3, title: "Payment Received",    message: "₹5,000 maintenance fee received from Flat 201.", time: "1 hr ago",   read: true  },
]

// ─── Avatar Initials ──────────────────────────────────────────────────────────

function AvatarInitials({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div className={cn(
      "flex items-center justify-center rounded-full font-bold select-none shrink-0",
      "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm",
      size === "sm" ? "h-[30px] w-[30px] text-[11px]" : "h-9 w-9 text-[13px]"
    )}>
      {initials}
    </div>
  )
}

// ─── App Header ───────────────────────────────────────────────────────────────

export default function AppHeader() {
  const router = useRouter()

  // ✅ FIX: use resolvedTheme (not theme) — "theme" can be "system" on first load
  // which causes the toggle condition to always fail
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const [user,           setUser]           = useState<UserInfo>({ name: "Guest User", email: "", role: "" })
  const [clientName,     setClientName]     = useState("Subhal Srushti Apartment")
  const [clientAddress,  setClientAddress]  = useState("Sector 21, Navi Mumbai – 400706")
  const [searchOpen,     setSearchOpen]     = useState(false)
  const [notifications,  setNotifications]  = useState<Notification[]>(DEMO_NOTIFICATIONS)

  const unreadCount = notifications.filter((n) => !n.read).length
  const isDark = resolvedTheme === "dark"

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem("user")
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, string>
        setUser({
          name:  parsed.name ?? parsed.fullName ?? parsed.userName ?? "User",
          email: parsed.email ?? "",
          role:  parsed.roleName ?? parsed.role ?? "",
        })
      }
      const name = localStorage.getItem("societyName") ?? localStorage.getItem("clientName")
      const addr = localStorage.getItem("societyAddress") ?? localStorage.getItem("address")
      if (name) setClientName(name)
      if (addr) setClientAddress(addr)
    } catch { /* ignore */ }
  }, [])

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("roleId")
    sessionStorage.clear()
    router.replace("/login")
  }

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  const markRead    = (id: number) => setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <header className={cn(
      "sticky top-0 z-40 h-[64px] flex items-center gap-2 px-3 sm:px-5",
      "bg-white/[0.97] dark:bg-[#0d0f14]/[0.97] backdrop-blur-md",
      "border-b border-gray-100 dark:border-white/[0.05]",
      "shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_rgba(255,255,255,0.03)]",
      "transition-colors duration-200"
    )}>

      {/* ── Sidebar Hamburger (mobile only) ── */}
      <SidebarTrigger className="md:hidden h-8 w-8 flex items-center justify-center rounded-lg shrink-0
        text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors" />

      {/* ════════════════════════════════════════
          LEFT — Society / Client Branding (grows to fill space)
      ════════════════════════════════════════ */}
      <div className="flex items-center gap-3 flex-1 min-w-0">

        {/* Gradient icon badge with live-dot */}
        <div className="relative shrink-0">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0
            bg-gradient-to-br from-indigo-500 to-violet-600
            shadow-[0_3px_12px_rgba(99,102,241,0.40)]">
            <Building2 className="h-[20px] w-[20px] text-white" />
          </div>
          {/* Live green indicator */}
          <span className="absolute -bottom-[3px] -right-[3px] h-[11px] w-[11px] rounded-full
            bg-emerald-500 border-[2.5px] border-white dark:border-[#0d0f14] shadow-sm" />
        </div>

        {/* Name + Address text — hidden on mobile */}
        <div className="hidden sm:flex flex-col justify-center min-w-0">
          {/* Society Name — large, black, prominent */}
          <p className="text-[17px] font-black leading-tight tracking-tight
            text-gray-900 dark:text-white
            truncate max-w-[260px] md:max-w-[340px] lg:max-w-[500px]">
            {clientName}
          </p>
          {/* Address — vivid gradient */}
          <div className="flex items-center gap-1 mt-[3px]">
            <MapPin className="h-[10px] w-[10px] text-violet-500 shrink-0" />
            <p className="text-[11px] font-semibold leading-none
              truncate max-w-[240px] md:max-w-[320px] lg:max-w-[480px]
              bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500
              bg-clip-text text-transparent">
              {clientAddress}
            </p>
          </div>
        </div>
      </div>

      {/* Vertical divider */}
      <div className="hidden sm:block h-6 w-px bg-gray-200 dark:bg-white/[0.07] mx-1 shrink-0" />

      {/* ════════════════════════════════════════
          CENTER — Search Bar (no longer flex-1, sits right of branding)
      ════════════════════════════════════════ */}
      <div className="shrink-0 flex items-center">

        {/* Desktop search — compact width */}
        <div className="relative hidden sm:block w-full max-w-[190px] lg:max-w-[220px]">
          <Search className="absolute left-[9px] top-1/2 -translate-y-1/2 h-[12px] w-[12px]
            text-gray-400 dark:text-gray-600 pointer-events-none" />
          <input
            type="text"
            placeholder="Search…"
            className={cn(
              "w-full h-[30px] rounded-lg text-[12px] outline-none",
              "pl-[27px] pr-[34px]",
              "bg-gray-50 dark:bg-white/[0.04]",
              "border border-gray-100 dark:border-white/[0.06]",
              "text-gray-700 dark:text-gray-200",
              "placeholder:text-gray-400 dark:placeholder:text-gray-600",
              "transition-all duration-200",
              "focus:bg-white dark:focus:bg-white/[0.07]",
              "focus:border-indigo-200 dark:focus:border-indigo-500/30",
              "focus:shadow-[0_0_0_3px_rgba(99,102,241,0.08)]",
              "focus:max-w-[260px]"
            )}
          />
          <kbd className="absolute right-[8px] top-1/2 -translate-y-1/2
            hidden lg:flex items-center rounded font-mono leading-none
            border border-gray-200 dark:border-white/[0.07]
            bg-white dark:bg-white/[0.04]
            px-[5px] py-[2px] text-[9px] text-gray-400 dark:text-gray-600">
            ⌘K
          </kbd>
        </div>

        {/* Mobile search — icon tap → expands inline */}
        <div className="sm:hidden flex items-center w-full">
          {searchOpen ? (
            <div className="relative flex-1">
              <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 h-[13px] w-[13px] text-gray-400 pointer-events-none" />
              <input
                autoFocus
                type="text"
                placeholder="Search…"
                className="w-full h-8 pl-[30px] pr-8 rounded-lg text-[12.5px] outline-none
                  bg-gray-50 dark:bg-white/[0.05]
                  border border-indigo-200 dark:border-indigo-500/30
                  text-gray-700 dark:text-gray-200 placeholder:text-gray-400
                  shadow-[0_0_0_3px_rgba(99,102,241,0.07)]"
              />
              <button onClick={() => setSearchOpen(false)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded
                  text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)}
              className="h-8 w-8 flex items-center justify-center rounded-lg
                text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors">
              <Search className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════
          RIGHT — Theme + Bell + User
      ════════════════════════════════════════ */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">

        {/* ── Theme Toggle Pill ── */}
        {mounted && (
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label="Toggle dark/light mode"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className={cn(
              "relative h-[26px] w-[48px] rounded-full border transition-all duration-300 shrink-0",
              "flex items-center",
              isDark
                ? "bg-indigo-600 border-indigo-500/70 justify-end pr-[3px]"
                : "bg-gray-100 border-gray-200 justify-start pl-[3px]"
            )}
          >
            {/* Track icons */}
            <Sun  className="absolute left-[5px] h-[10px] w-[10px] text-amber-400 opacity-80 pointer-events-none" />
            <Moon className="absolute right-[5px] h-[10px] w-[10px] text-indigo-200 opacity-80 pointer-events-none" />
            {/* Sliding thumb */}
            <span className={cn(
              "relative z-10 h-[20px] w-[20px] rounded-full shadow-md",
              "flex items-center justify-center transition-all duration-300",
              isDark ? "bg-white" : "bg-white border border-gray-200"
            )}>
              {isDark
                ? <Moon className="h-[10px] w-[10px] text-indigo-600" />
                : <Sun  className="h-[10px] w-[10px] text-amber-500" />}
            </span>
          </button>
        )}

        {/* ── Notification Bell ── */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative h-8 w-8 flex items-center justify-center rounded-lg
              text-gray-500 dark:text-gray-400
              hover:bg-gray-100 dark:hover:bg-white/[0.06]
              hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              <Bell className="h-[17px] w-[17px]" />
              {unreadCount > 0 && (
                <span className="absolute top-[7px] right-[7px] flex h-[7px] w-[7px]">
                  <span className="animate-ping absolute inset-0 rounded-full bg-rose-400 opacity-70" />
                  <span className="relative rounded-full h-[7px] w-[7px] bg-rose-500" />
                </span>
              )}
            </button>
          </PopoverTrigger>

          <PopoverContent align="end" sideOffset={10}
            className="w-[300px] sm:w-[350px] p-0 rounded-2xl overflow-hidden
              border border-gray-100 dark:border-white/[0.07]
              bg-white dark:bg-[#13161f] shadow-2xl">

            {/* Bell header */}
            <div className="flex items-center justify-between px-4 py-3
              border-b border-gray-100 dark:border-white/[0.06]
              bg-gray-50/60 dark:bg-white/[0.015]">
              <div className="flex items-center gap-2">
                <Bell className="h-[15px] w-[15px] text-gray-600 dark:text-gray-300" />
                <span className="text-[13.5px] font-bold text-gray-900 dark:text-white">Notifications</span>
                {unreadCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full
                    bg-rose-500 text-white text-[10px] font-bold px-1.5">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead}
                  className="flex items-center gap-1 text-[11.5px] text-indigo-600 dark:text-indigo-400
                    hover:underline font-semibold">
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Bell list */}
            <div className="max-h-[280px] overflow-y-auto divide-y divide-gray-50 dark:divide-white/[0.04]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Bell className="h-7 w-7 text-gray-300 dark:text-gray-600" />
                  <p className="text-[12.5px] font-medium text-gray-500 dark:text-gray-400">All caught up!</p>
                </div>
              ) : notifications.map((notif) => (
                <div key={notif.id} onClick={() => markRead(notif.id)}
                  className={cn(
                    "flex gap-3 px-4 py-3 cursor-pointer transition-colors",
                    !notif.read
                      ? "bg-indigo-50/60 dark:bg-indigo-500/[0.05] hover:bg-indigo-50 dark:hover:bg-indigo-500/[0.08]"
                      : "hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  )}>
                  <div className="pt-[6px] shrink-0">
                    <span className={cn(
                      "block h-[7px] w-[7px] rounded-full",
                      notif.read ? "bg-gray-200 dark:bg-white/[0.08]" : "bg-indigo-500"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold text-gray-800 dark:text-gray-100 leading-snug">{notif.title}</p>
                    <p className="text-[11.5px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{notif.message}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Clock className="h-2.5 w-2.5 text-gray-400" />
                      <span className="text-[10.5px] text-gray-400">{notif.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bell footer */}
            <div className="px-4 py-2.5 border-t border-gray-100 dark:border-white/[0.06]
              bg-gray-50/60 dark:bg-white/[0.015]">
              <button onClick={() => router.push("/notifications")}
                className="w-full text-center text-[12px] font-semibold
                  text-indigo-600 dark:text-indigo-400 hover:underline">
                View all notification history →
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Divider */}
        <div className="hidden sm:block h-5 w-px bg-gray-200 dark:bg-white/[0.07] mx-0.5 shrink-0" />

        {/* ── User Dropdown ── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-xl px-1.5 py-1 outline-none
              hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors group">
              <AvatarInitials name={user.name} size="sm" />
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-[12.5px] font-bold text-gray-800 dark:text-gray-100 leading-tight
                  max-w-[80px] lg:max-w-[110px] truncate">
                  {user.name}
                </span>
                {user.role && (
                  <span className="text-[10.5px] text-indigo-500 dark:text-indigo-400 font-medium leading-tight">
                    {user.role}
                  </span>
                )}
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400 hidden sm:block
                group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" sideOffset={10}
            className="w-[220px] rounded-2xl p-1.5
              border border-gray-100 dark:border-white/[0.07]
              bg-white dark:bg-[#13161f] shadow-2xl">

            {/* Profile card */}
            <DropdownMenuLabel className="px-3 py-2.5">
              <div className="flex items-center gap-3">
                <AvatarInitials name={user.name} size="md" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-bold text-gray-900 dark:text-white truncate">{user.name}</span>
                  {user.email && (
                    <span className="text-[10.5px] text-gray-400 dark:text-gray-500 truncate">{user.email}</span>
                  )}
                  {user.role && (
                    <span className="text-[10.5px] text-indigo-600 dark:text-indigo-400 font-semibold">{user.role}</span>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="bg-gray-100 dark:bg-white/[0.06] mx-1" />

            <DropdownMenuItem
              onClick={() => router.push("/profile")}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12.5px] cursor-pointer
                text-gray-700 dark:text-gray-300 focus:bg-gray-50 dark:focus:bg-white/[0.04]">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10 shrink-0">
                <User className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              </div>
              My Profile
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12.5px] cursor-pointer
                text-gray-700 dark:text-gray-300 focus:bg-gray-50 dark:focus:bg-white/[0.04]">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/[0.06] shrink-0">
                <Settings className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
              </div>
              Settings
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-gray-100 dark:bg-white/[0.06] mx-1" />

            <DropdownMenuItem
              onClick={logout}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12.5px] cursor-pointer
                text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-500/[0.08]">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-500/10 shrink-0">
                <LogOut className="h-3.5 w-3.5 text-rose-500" />
              </div>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
