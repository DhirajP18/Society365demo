"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
      localStorage.setItem(
        "permissions",
        JSON.stringify(res.data.permissions)
      );

      toast.success("Login Successful", {
        description: "Welcome back! Redirecting...",
      });

      setTimeout(() => router.push("/dashboard"), 800);
    } catch (err: any) {
      toast.error("Login Failed", {
        description: err.response?.data?.resMsg || "Invalid credentials",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 overflow-hidden">

      {/* ================================================= */}
      {/* LEFT SIDE – SOCIETY / APARTMENT BUILDING THEME */}
      {/* ================================================= */}
      <div className="hidden lg:block flex-1 relative">
        <img
          src="https://images.unsplash.com/photo-1619177982598-44fe889168cd?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NjZ8fFNvY2lldHklMjBBcGFydG1lbnRzJTIwUGhvdG9zfGVufDB8fDB8fHww"
          alt="Society Building"
          className="w-full h-full object-cover"
        />

        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Text */}
        <div className="absolute inset-0 flex flex-col justify-center px-12 text-white">
          <h1 className="text-4xl font-extrabold leading-tight">
            <span className="text-amber-300">Society-365</span> <br />
            Smart Society Management
          </h1>

          <p className="text-lg mt-4 max-w-md opacity-90">
            Manage apartments, residents, permissions, and operations
            securely from one platform.
          </p>

          <div className="mt-6 space-y-2 text-sm text-white/90">
            <div>🏛️ Complete Apartment & Society Management</div>
            <div>📅 Events & Meetings</div>
            <div>🔐 Secure Access Control</div>
          </div>
        </div>
      </div>

      {/* ================================================= */}
      {/* RIGHT SIDE – LOGIN (UNCHANGED) */}
      {/* ================================================= */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm bg-white/80 backdrop-blur-xl shadow-2xl border-0 rounded-2xl">
          <CardContent className="pt-6 pb-5 px-6">

            {/* HEADER */}
            <div className="text-center mb-4">
              <img
                src="/alogo.png"
                alt="Society Management Logo"
                className="mx-auto h-20 w-auto object-contain drop-shadow-md"
              />
              <h2 className="text-base font-bold text-gray-800 mt-2">
                Society Management System
              </h2>
              <p className="text-[11px] text-gray-500">
                Secure access for residents & administrators
              </p>
            </div>

            {/* INPUTS */}
            <div className="space-y-3">
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

            {/* BUTTON */}
            <Button
              onClick={handleLogin}
              disabled={loading || !EmailId || !Password}
              className="w-full h-10 mt-4 font-semibold text-sm bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-lg shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            {/* LINKS */}
            <div className="text-center mt-3 space-y-1">
              <p
                className="text-[13px] text-amber-600 cursor-pointer font-semibold hover:underline"
                onClick={() => router.push("/forgotpassword")}
              >
                Forgot your password?
              </p>

              <p className="text-[13px] text-gray-700">
                New here?{" "}
                <span
                  onClick={() => router.push("/signup")}
                  className="text-amber-600 font-bold cursor-pointer hover:underline"
                >
                  Create Account
                </span>
              </p>
            </div>

            {/* FOOTER */}
            <p className="text-[11px] text-center text-gray-500 mt-3 tracking-wide">
              Managed by{" "}
              <a
                href="https://nexspiretechnologies.in"
                target="_blank"
                className="text-amber-500 font-semibold hover:underline"
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

/* ================================================= */
/* FLOATING INPUT – MOVES ON CLICK (FOCUS) ✔          */
/* ================================================= */

function FloatingInput({
  label,
  value,
  onFocus,
  onBlur,
  ...props
}: {
  label: string;
  value: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        value={value}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          if (!value) setFocused(false);
          onBlur?.(e);
        }}
        className="h-10 px-3 pt-4 rounded-lg border-gray-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-200 transition-all"
      />

      <label
        className={`absolute left-3 px-1 bg-white pointer-events-none transition-all duration-200 ${
          focused || value
            ? "-top-2 text-xs text-amber-600"
            : "top-2.5 text-sm text-gray-400"
        }`}
      >
        {label}
      </label>
    </div>
  );
}
