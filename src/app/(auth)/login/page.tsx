"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

import axios from "axios";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import FloatingInput from "@/components/common/floatingInput";

interface ApiErrorResponse {
  resMsg?: string;
}

export default function LoginPage() {
  const router = useRouter();

  const [EmailId, setEmail] = useState("");
  const [Password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);

    try {
      const res = await api.post("/UserMaster/Login", {
        EmailId,
        Password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("permissions", JSON.stringify(res.data.permissions));

      const responseData = (res.data ?? {}) as Record<string, unknown>;
      const userData =
        (responseData.user as Record<string, unknown> | undefined) ??
        (responseData.result as Record<string, unknown> | undefined) ??
        (responseData.data as Record<string, unknown> | undefined);

      if (userData) {
        localStorage.setItem("user", JSON.stringify(userData));

        const roleId =
          userData.roleId ??
          userData.RoleId ??
          responseData.roleId ??
          responseData.RoleId;

        if (roleId !== undefined && roleId !== null) {
          localStorage.setItem("roleId", String(roleId));
        }
      } else {
        const fallbackUser = {
          name:
            (responseData.name as string | undefined) ??
            (responseData.fullName as string | undefined) ??
            (responseData.userName as string | undefined) ??
            (responseData.UserName as string | undefined) ??
            "",
          email:
            (responseData.email as string | undefined) ??
            (responseData.EmailId as string | undefined) ??
            EmailId,
          role:
            (responseData.roleName as string | undefined) ??
            (responseData.role as string | undefined) ??
            "",
        };

        if (fallbackUser.name || fallbackUser.email || fallbackUser.role) {
          localStorage.setItem("user", JSON.stringify(fallbackUser));
        }
      }

      toast.success("Login Successful", {
        description: "Welcome back! Redirecting...",
      });

      setTimeout(() => router.push("/dashboard"), 800);
    } catch (err: unknown) {
      if (axios.isAxiosError<ApiErrorResponse>(err)) {
        toast.error("Login Failed", {
          description: err.response?.data?.resMsg ?? "Invalid credentials",
        });
      } else {
        toast.error("Login Failed", {
          description: "Something went wrong",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] lg:h-[100dvh] flex flex-col lg:flex-row bg-gray-50 overflow-y-auto lg:overflow-hidden dark:bg-slate-950">
      <div className="hidden lg:block lg:w-[48%] relative">
        <img
          src="https://images.unsplash.com/photo-1619177982598-44fe889168cd?w=600&auto=format&fit=crop&q=60"
          alt="Society Building"
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-black/50" />

        <div className="absolute inset-0 flex flex-col justify-center px-12 text-white">
          <h1 className="text-4xl font-extrabold leading-tight">
            <span className="text-amber-300">Society-365</span>
            <br />
            Smart Society Management
          </h1>

          <p className="text-lg mt-4 max-w-md opacity-90">
            Manage apartments, residents, permissions, and operations securely
            from one platform.
          </p>

          <div className="mt-6 space-y-2 text-sm text-white/90">
            <div>Complete Apartment and Society Management</div>
            <div>Events and Meetings</div>
            <div>Secure Access Control</div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[52%] flex items-start lg:items-center justify-center p-3 py-5 sm:p-5">
        <Card className="w-full max-w-md bg-white shadow-2xl border-0 rounded-2xl dark:bg-slate-900">
          <CardContent className="pb-5 px-8">
            <div className="text-center mb-3">
              <img
                src="/logo.png"
                alt="Society365 Logo"
                className="mx-auto h-48 object-contain"
              />

              <h2 className="text-lg mb-4 font-medium text-gray-700 -mt-6 dark:text-slate-200">
                LOGIN
              </h2>
            </div>

            <div className="space-y-4">
              <FloatingInput
                label="Email Address"
                type="email"
                value={EmailId}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />

              <FloatingInput
                label="Password"
                type="password"
                value={Password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button
              onClick={handleLogin}
              className="w-full h-10 mt-6 font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging In...
                </>
              ) : (
                "Login"
              )}
            </Button>

            <div className="text-center mt-3 space-y-1">
              <p
                className="text-sm text-blue-600 cursor-pointer hover:underline"
                onClick={() => router.push("/forgotpassword")}
              >
                Forgot password?
              </p>

              <p className="text-sm text-gray-700 dark:text-slate-300">
                New here?{" "}
                <span
                  onClick={() => router.push("/signup")}
                  className="text-blue-600 cursor-pointer hover:underline"
                >
                  Create Account
                </span>
              </p>
            </div>

            <p className="text-xs text-center text-gray-500 mt-5 dark:text-slate-400">
              Managed by{" "}
              <a
                href="https://nexspiretechnologies.in"
                target="_blank"
                rel="noreferrer"
                className="font-semibold hover:underline"
              >
                Nexspire Technologies
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
