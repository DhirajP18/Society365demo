// FILE: lib/api.ts — REPLACE ENTIRE FILE

import axios from "axios";

// ─── Create instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ─── State ─────────────────────────────────────────────────────────────────────
let isReAuthenticating  = false;           // prevent duplicate popups
let pendingRetryQueue: Array<() => void> = []; // requests waiting for new token

// ─── Request interceptor — attach token ───────────────────────────────────────
api.interceptors.request.use((config) => {
  // Let browser set multipart boundary for file uploads
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (config.headers) delete config.headers["Content-Type"];
  }

  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  return config;
});

// ─── Response interceptor — handle 401 silently ───────────────────────────────
api.interceptors.response.use(
  // ✅ Success — pass through
  (response) => response,

  // ❌ Error handler
  async (error) => {
    const originalRequest = error.config;

    // Only handle 401 and don't retry the retry itself
    if (error.response?.status !== 401 || originalRequest._isRetry) {
      return Promise.reject(error);
    }

    // ── Already re-authenticating — queue this request ─────────────
    if (isReAuthenticating) {
      return new Promise((resolve) => {
        pendingRetryQueue.push(() => {
          originalRequest._isRetry = true;
          resolve(api(originalRequest));
        });
      });
    }

    // ── Start re-auth flow ─────────────────────────────────────────
    originalRequest._isRetry = true;
    isReAuthenticating = true;

    try {
      const email = localStorage.getItem("user_email");

      if (!email) {
        // No email saved — full logout
        doFullLogout();
        return Promise.reject(error);
      }

      // ── Show password prompt (same as MAUI inline re-auth) ────────
      const password = window.prompt(
        `Session needs to be refreshed.\nEnter password for ${email}:`
      );

      if (!password) {
        // User cancelled — full logout
        doFullLogout();
        return Promise.reject(error);
      }

      // ── Silent re-login ───────────────────────────────────────────
      const loginRes = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}UserMaster/Login`,
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );

      const data = loginRes.data;

      if (data?.isSuccess && data?.token) {
        // ✅ Save new token
        localStorage.setItem("token", data.token);

        // ✅ Save updated user fields if returned
        if (data.result) {
          localStorage.setItem("user_name",      data.result.name      ?? "");
          localStorage.setItem("user_email",     data.result.emailId   ?? "");
          localStorage.setItem("user_role",      data.result.roleId    ?? "");
          localStorage.setItem("user_role_name", data.result.roleName  ?? "");
        }

        // ✅ Inject new token into pending requests and retry them
        pendingRetryQueue.forEach((retry) => retry());
        pendingRetryQueue = [];

        // ✅ Retry the original failed request with new token
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);

      } else {
        doFullLogout();
        return Promise.reject(error);
      }

    } catch (reAuthError) {
      // Re-login API call itself failed
      doFullLogout();
      return Promise.reject(reAuthError);

    } finally {
      isReAuthenticating = false;
    }
  }
);

// ─── Full logout helper ────────────────────────────────────────────────────────
function doFullLogout() {
  // Clear all saved session data
  const keysToRemove = [
    "token", "user_name", "user_email",
    "user_role", "user_role_name", "user_id",
    "user_mobile", "user_floor", "user_flat",
    "user_status", "is_logged_in"
  ];
  keysToRemove.forEach((k) => localStorage.removeItem(k));

  // Redirect to login — works with Next.js App Router and Pages Router
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

export default api;