"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  type TooltipProps,
} from "recharts"
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent"
import {
  Users, Home, IndianRupee, AlertTriangle, TrendingUp,
  TrendingDown, Car, Wrench, Bell, ChevronRight, Calendar,
  ShieldCheck, Zap, Droplets, ArrowUpRight, Clock, CheckCircle2,
  XCircle, Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Dummy Data ───────────────────────────────────────────────────────────────

const monthlyCollection = [
  { month: "Aug", collected: 142000, pending: 28000 },
  { month: "Sep", collected: 158000, pending: 22000 },
  { month: "Oct", collected: 135000, pending: 45000 },
  { month: "Nov", collected: 172000, pending: 18000 },
  { month: "Dec", collected: 168000, pending: 12000 },
  { month: "Jan", collected: 185000, pending: 15000 },
]

const visitorData = [
  { day: "Mon", visitors: 24 },
  { day: "Tue", visitors: 38 },
  { day: "Wed", visitors: 29 },
  { day: "Thu", visitors: 47 },
  { day: "Fri", visitors: 56 },
  { day: "Sat", visitors: 72 },
  { day: "Sun", visitors: 43 },
]

const flatStatusData = [
  { name: "Owned",  value: 68, color: "#6366f1" },
  { name: "Rented", value: 22, color: "#f59e0b" },
  { name: "Vacant", value: 10, color: "#10b981" },
]

const recentActivities = [
  { id: 1, icon: IndianRupee, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10",  title: "Maintenance Paid",    desc: "Flat 304 – Rahul Mehta",      time: "2 min ago"  },
  { id: 2, icon: Wrench,      color: "text-orange-600 bg-orange-50 dark:bg-orange-500/10",    title: "Complaint Raised",     desc: "Flat 102 – Water leakage",    time: "18 min ago" },
  { id: 3, icon: Car,         color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10",          title: "Visitor Entry",        desc: "Gate 1 – Swiggy Delivery",    time: "34 min ago" },
  { id: 4, icon: Bell,        color: "text-violet-600 bg-violet-50 dark:bg-violet-500/10",    title: "Notice Published",     desc: "Annual AGM – Feb 25, 2026",  time: "1 hr ago"   },
  { id: 5, icon: IndianRupee, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10", title: "Maintenance Paid",    desc: "Flat 201 – Priya Shah",       time: "2 hr ago"   },
  { id: 6, icon: Wrench,      color: "text-orange-600 bg-orange-50 dark:bg-orange-500/10",    title: "Complaint Resolved",   desc: "Flat 412 – Lift issue fixed", time: "3 hr ago"   },
]

const defaulters = [
  { flat: "Flat 105", name: "Amit Verma",  months: 3, amount: 15000 },
  { flat: "Flat 208", name: "Sonal Gupta", months: 2, amount: 10000 },
  { flat: "Flat 310", name: "Rajan Patel", months: 4, amount: 20000 },
  { flat: "Flat 402", name: "Neha Joshi",  months: 1, amount:  5000 },
]

const upcomingEvents = [
  { date: "25 Feb", day: "Wed", title: "Annual AGM Meeting", tag: "Meeting", color: "bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20" },
  { date: "01 Mar", day: "Sun", title: "Holi Celebration",   tag: "Event",   color: "bg-pink-100 dark:bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-500/20"           },
  { date: "05 Mar", day: "Thu", title: "Maintenance Due",    tag: "Finance", color: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"     },
  { date: "10 Mar", day: "Tue", title: "Lift Servicing",     tag: "Service", color: "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20"           },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: string
  sub: string
  icon: React.FC<{ className?: string }>
  trend: number
  iconColor: string
  iconBg: string
  valueColor: string
  borderColor: string
}

// ─── Compact Stat Card (light/dark) ──────────────────────────────────────────

function StatCard({ title, value, sub, icon: Icon, trend, iconColor, iconBg, valueColor, borderColor }: StatCardProps) {
  const isUp = trend >= 0
  return (
    <Card className={cn(
      "border shadow-sm relative overflow-hidden",
      "bg-white dark:bg-[#161923]",
      "border-gray-100 dark:border-white/[0.06]",
    )}>
      {/* Left accent bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl", borderColor)} />

      <CardContent className="pl-4 pr-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          {/* Icon */}
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl shrink-0", iconBg)}>
            <Icon className={cn("h-[18px] w-[18px]", iconColor)} />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 leading-none mb-1">
              {title}
            </p>
            <p className={cn("text-[22px] font-black leading-tight", valueColor)}>
              {value}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
          </div>

          {/* Trend */}
          <div className={cn(
            "flex flex-col items-end gap-0.5 shrink-0",
          )}>
            <div className={cn(
              "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
              isUp
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}>
              {isUp
                ? <TrendingUp   className="h-2.5 w-2.5" />
                : <TrendingDown className="h-2.5 w-2.5" />}
              {isUp ? "+" : ""}{trend}%
            </div>
            <span className="text-[9.5px] text-gray-400 dark:text-gray-600">vs last mo</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface TooltipPayloadItem { name: string; value: number; color: string }

function CustomTooltip({ active, payload, label }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1d27] px-3 py-2 shadow-lg text-[12px]">
      <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{label}</p>
      {(payload as TooltipPayloadItem[]).map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500 dark:text-gray-400">{p.name}:</span>
          <span className="font-semibold text-gray-800 dark:text-gray-100">
            {typeof p.value === "number" && p.value > 999 ? `₹${(p.value / 1000).toFixed(0)}k` : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"week" | "month">("week")

  return (
    // ✅ NO top padding (pt-0) — no gap between header and content
    // bg works in both light and dark
    <div className="min-h-screen bg-[#f5f6fa] dark:bg-[#0a0c11] px-3 sm:px-5 pt-3 pb-6 space-y-4">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-[18px] sm:text-[22px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
            Dashboard
          </h1>
          <p className="text-[12px] sm:text-[13px] text-gray-500 dark:text-gray-400">
            Green Park Society — February 2026
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"
            className="text-[12px] gap-1.5 h-8 border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-gray-700 dark:text-gray-300">
            <Calendar className="h-3.5 w-3.5" />Feb 2026
          </Button>
          <Button size="sm"
            className="text-[12px] gap-1.5 h-8 bg-indigo-600 hover:bg-indigo-700 text-white">
            <ArrowUpRight className="h-3.5 w-3.5" />Export
          </Button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          TOP 4 STAT CARDS — compact, light-colored
      ════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Members"  value="248"     sub="Across 4 Wings"
          icon={Users}           trend={4.2}
          iconBg="bg-indigo-50 dark:bg-indigo-500/10"
          iconColor="text-indigo-600 dark:text-indigo-400"
          valueColor="text-indigo-700 dark:text-indigo-300"
          borderColor="bg-indigo-400"
        />
        <StatCard
          title="Total Flats"   value="120"     sub="108 Occupied"
          icon={Home}           trend={0}
          iconBg="bg-violet-50 dark:bg-violet-500/10"
          iconColor="text-violet-600 dark:text-violet-400"
          valueColor="text-violet-700 dark:text-violet-300"
          borderColor="bg-violet-400"
        />
        <StatCard
          title="Collected"     value="₹1.85L"  sub="This month"
          icon={IndianRupee}   trend={9.8}
          iconBg="bg-emerald-50 dark:bg-emerald-500/10"
          iconColor="text-emerald-600 dark:text-emerald-400"
          valueColor="text-emerald-700 dark:text-emerald-300"
          borderColor="bg-emerald-400"
        />
        <StatCard
          title="Pending"       value="₹15K"    sub="12 flats pending"
          icon={AlertTriangle} trend={-18.4}
          iconBg="bg-rose-50 dark:bg-rose-500/10"
          iconColor="text-rose-600 dark:text-rose-400"
          valueColor="text-rose-700 dark:text-rose-300"
          borderColor="bg-rose-400"
        />
      </div>

      {/* ── Quick Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Complaints",      value: "7 Open",     icon: Wrench,      iconColor: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-500/10",  border: "border-orange-100 dark:border-orange-500/20" },
          { label: "Visitors Today",  value: "43 Entries", icon: Car,         iconColor: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-500/10",      border: "border-blue-100 dark:border-blue-500/20"    },
          { label: "Active Notices",  value: "3 Live",     icon: Bell,        iconColor: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-500/10",  border: "border-violet-100 dark:border-violet-500/20"},
          { label: "Security Guards", value: "8 On Duty",  icon: ShieldCheck, iconColor: "text-emerald-500",bg: "bg-emerald-50 dark:bg-emerald-500/10",border: "border-emerald-100 dark:border-emerald-500/20"},
        ].map(item => (
          <Card key={item.label} className={cn("border shadow-none", item.bg, item.border)}>
            <CardContent className="p-3 sm:p-4 flex items-center gap-2.5">
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-white/[0.06] border", item.border)}>
                <item.icon className={cn("h-4 w-4", item.iconColor)} />
              </div>
              <div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-none">{item.label}</p>
                <p className="text-[13.5px] font-bold text-gray-900 dark:text-white mt-0.5">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Bar Chart */}
        <Card className="lg:col-span-2 border border-gray-100 dark:border-white/[0.06] shadow-sm bg-white dark:bg-[#161923]">
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[14px] font-semibold text-gray-900 dark:text-white">Monthly Collection</CardTitle>
                <CardDescription className="text-[12px] text-gray-400 dark:text-gray-500">Collected vs Pending — last 6 months</CardDescription>
              </div>
              <Badge variant="outline" className="text-[11px] text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10">
                ₹11.6L Total
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyCollection} barSize={18} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.15)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${v/1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="collected" name="Collected" fill="#6366f1" radius={[4,4,0,0]} />
                <Bar dataKey="pending"   name="Pending"   fill="#fca5a5" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="border border-gray-100 dark:border-white/[0.06] shadow-sm bg-white dark:bg-[#161923]">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-[14px] font-semibold text-gray-900 dark:text-white">Flat Status</CardTitle>
            <CardDescription className="text-[12px] text-gray-400 dark:text-gray-500">Owned · Rented · Vacant</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4 flex flex-col items-center">
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={flatStatusData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} dataKey="value" stroke="none">
                  {flatStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: ValueType) => [`${v}%`, ""]} contentStyle={{ fontSize: 12, borderRadius: 8, background: "var(--background)", border: "1px solid var(--border)" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-2 mt-1">
              {flatStatusData.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                    <span className="text-[12px] text-gray-500 dark:text-gray-400">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={item.value} className="w-14 h-1.5" />
                    <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-200 w-8 text-right">{item.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Visitors + Activity + Events ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Area Chart */}
        <Card className="border border-gray-100 dark:border-white/[0.06] shadow-sm bg-white dark:bg-[#161923]">
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[14px] font-semibold text-gray-900 dark:text-white">Visitor Traffic</CardTitle>
                <CardDescription className="text-[12px] text-gray-400 dark:text-gray-500">This weeks entries</CardDescription>
              </div>
              <div className="flex gap-0.5 bg-gray-100 dark:bg-white/[0.06] rounded-lg p-0.5">
                {(["week","month"] as const).map(t => (
                  <button key={t} onClick={() => setActiveTab(t)}
                    className={cn(
                      "px-2.5 py-1 text-[10.5px] font-medium rounded-md transition-colors capitalize",
                      activeTab === t
                        ? "bg-white dark:bg-white/[0.08] shadow-sm text-gray-900 dark:text-white"
                        : "text-gray-400 dark:text-gray-500"
                    )}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <ResponsiveContainer width="100%" height={155}>
              <AreaChart data={visitorData}>
                <defs>
                  <linearGradient id="visitorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.15)" vertical={false} />
                <XAxis dataKey="day"   tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis                 tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="visitors" name="Visitors"
                  stroke="#6366f1" strokeWidth={2.5} fill="url(#visitorGrad)"
                  dot={{ fill: "#6366f1", r: 2.5 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border border-gray-100 dark:border-white/[0.06] shadow-sm bg-white dark:bg-[#161923]">
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[14px] font-semibold text-gray-900 dark:text-white">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" className="text-[11.5px] text-indigo-600 dark:text-indigo-400 h-6 px-1.5">
                View All <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4 space-y-0.5 overflow-y-auto max-h-[220px]">
            {recentActivities.map(act => (
              <div key={act.id} className="flex items-start gap-2.5 py-1.5 border-b border-gray-50 dark:border-white/[0.04] last:border-0">
                <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", act.color)}>
                  <act.icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-gray-900 dark:text-white leading-tight">{act.title}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{act.desc}</p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
                  <Clock className="h-2.5 w-2.5 text-gray-300 dark:text-gray-600" />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">{act.time}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="border border-gray-100 dark:border-white/[0.06] shadow-sm bg-white dark:bg-[#161923]">
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[14px] font-semibold text-gray-900 dark:text-white">Upcoming Events</CardTitle>
              <Button variant="ghost" size="sm" className="text-[11.5px] text-indigo-600 dark:text-indigo-400 h-6 px-1.5">
                Add <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4 space-y-2">
            {upcomingEvents.map((ev, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex flex-col items-center w-9 shrink-0">
                  <span className="text-[9.5px] font-bold text-gray-400 dark:text-gray-500 uppercase">{ev.day}</span>
                  <span className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight">{ev.date.split(" ")[0]}</span>
                  <span className="text-[9.5px] text-gray-400 dark:text-gray-500">{ev.date.split(" ")[1]}</span>
                </div>
                <div className="h-9 w-px bg-gray-100 dark:bg-white/[0.07] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-gray-900 dark:text-white leading-tight truncate">{ev.title}</p>
                  <Badge variant="outline" className={cn("mt-0.5 text-[10px] px-1.5 py-0 h-4 border", ev.color)}>
                    {ev.tag}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Defaulters + Amenities ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Defaulters */}
        <Card className="lg:col-span-2 border border-gray-100 dark:border-white/[0.06] shadow-sm bg-white dark:bg-[#161923]">
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[14px] font-semibold text-gray-900 dark:text-white">Maintenance Defaulters</CardTitle>
                <CardDescription className="text-[12px] text-gray-400 dark:text-gray-500">Flats with overdue payments</CardDescription>
              </div>
              <Badge className="text-[11px] bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20 border hover:bg-rose-100 dark:hover:bg-rose-500/10">
                {defaulters.length} Pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/[0.06]">
                    {["Flat","Owner","Months","Amount","Action"].map(h => (
                      <th key={h} className="text-left py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                  {defaulters.map((d, i) => (
                    <tr key={i} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-50 dark:bg-rose-500/10">
                            <Building2 className="h-3 w-3 text-rose-500 dark:text-rose-400" />
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white">{d.flat}</span>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[9px] bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                              {d.name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-gray-700 dark:text-gray-300 text-[12px]">{d.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <Badge variant="outline" className={cn("text-[10.5px] border",
                          d.months >= 3
                            ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                            : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20")}>
                          {d.months} mo
                        </Badge>
                      </td>
                      <td className="py-2.5">
                        <span className="font-bold text-rose-600 dark:text-rose-400">₹{d.amount.toLocaleString("en-IN")}</span>
                      </td>
                      <td className="py-2.5">
                        <Button variant="outline" size="sm"
                          className="h-6 text-[11px] border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 bg-transparent">
                          Send Reminder
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Amenities */}
        <Card className="border border-gray-100 dark:border-white/[0.06] shadow-sm bg-white dark:bg-[#161923]">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-[14px] font-semibold text-gray-900 dark:text-white">Amenities Status</CardTitle>
            <CardDescription className="text-[12px] text-gray-400 dark:text-gray-500">Live operational status</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4 space-y-1">
            {[
              { name: "Water Supply",  icon: Droplets,  ok: true,  detail: "6 AM – 10 AM",  status: "Operational"  },
              { name: "Power Backup",  icon: Zap,       ok: true,  detail: "All floors",     status: "Active"       },
              { name: "Lift – Wing A", icon: Building2, ok: false, detail: "Est. 4 hrs",     status: "Maintenance"  },
              { name: "Gym",           icon: Users,     ok: true,  detail: "6 AM – 10 PM",   status: "Open"         },
              { name: "Swimming Pool", icon: Droplets,  ok: false, detail: "Cleaning day",   status: "Closed"       },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-white/[0.04] last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg",
                    item.ok ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-rose-50 dark:bg-rose-500/10")}>
                    <item.icon className={cn("h-3.5 w-3.5", item.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400")} />
                  </div>
                  <div>
                    <p className="text-[12.5px] font-semibold text-gray-900 dark:text-white leading-tight">{item.name}</p>
                    <p className="text-[10.5px] text-gray-400 dark:text-gray-500">{item.detail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {item.ok
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    : <XCircle      className="h-3.5 w-3.5 text-rose-500"   />}
                  <span className={cn("text-[11px] font-medium",
                    item.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400")}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}