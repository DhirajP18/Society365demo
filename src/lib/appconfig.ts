/**
 * ============================================================
 *  CENTRAL APP CONFIG  —  lib/appConfig.ts
 * ============================================================
 *
 *  HOW TO USE:
 *  -----------
 *  Set these two variables in your environment file and
 *  NOTHING ELSE needs to change when moving between servers.
 *
 *  Development  →  .env.local
 *  Production   →  .env.production  (or server environment variables)
 *
 *  Required env variables:
 *
 *    NEXT_PUBLIC_API_BASE_URL=http://192.168.1.49:85/restapi/v1.0
 *    NEXT_PUBLIC_APP_NAME=Society 365          ← optional, shown in receipts / UI
 *
 *  When you go live just change .env.production:
 *    NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com/restapi/v1.0
 * ============================================================
 */

/** Full API base, e.g. http://192.168.1.49:85/restapi/v1.0 */
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "")

/** Server origin only, e.g. http://192.168.1.49:85  (no path) */
export const API_ORIGIN = API_BASE.replace(/\/restapi\/v1\.0\/?$/i, "")

/** App display name used in PDF receipts, titles, etc. */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Society 365"

/**
 * Resolves a receipt URL stored in the database into a full URL
 * the browser can open or download.
 *
 * Handles three cases automatically:
 *   1. Already a full URL          → returned as-is
 *   2. Old Windows absolute path   → extracts filename, routes via GetReceipt API
 *      e.g. D:\Dhiraj\wwwroot\MaintananceReciepts\file.jpg
 *   3. Relative API path           → prepends API_ORIGIN
 *      e.g. /restapi/v1.0/MaintenanceExpense/GetReceipt/file.jpg
 */
export const resolveReceiptUrl = (url?: string | null): string => {
  if (!url) return ""

  // Case 1 — already a full URL
  if (/^https?:\/\//i.test(url)) return url

  // Case 2 — Windows absolute path (old DB records)
  // e.g. D:\Dhiraj\wwwroot\MaintananceReciepts\5d2f...-697c.jpg
  if (/^[a-zA-Z]:\\/.test(url) || url.startsWith("\\\\")) {
    const normalized = url.replace(/\\/g, "/")
    const fileName   = normalized.split("/").pop() ?? ""
    if (!fileName) return ""
    return `${API_ORIGIN}/restapi/v1.0/MaintenanceExpense/GetReceipt/${fileName}`
  }

  // Case 3 — relative path
  // e.g. /restapi/v1.0/MaintenanceExpense/GetReceipt/file.jpg
  if (url.startsWith("/")) return `${API_ORIGIN}${url}`
  return `${API_ORIGIN}/${url}`
}