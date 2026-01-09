"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import FloatingInput from "@/components/common/floatingInput";

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
    <div className="h-screen flex flex-col lg:flex-row bg-gray-50 overflow-hidden">

      {/* LEFT SIDE – SOCIETY / APARTMENT BUILDING THEME */}
      <div className="hidden lg:block lg:w-[48%] relative">
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

      {/* RIGHT SIDE – LOGIN (UNCHANGED) */}
      <div className="w-full lg:w-[52%] flex items-center justify-center p-4">
        <Card className="w-full max-w-md h-auto bg-white backdrop-blur-xl shadow-2xl border-0 rounded-2xl">
          <CardContent className="pt-0.5 pb-5 px-8">

            {/* HEADER */}
            <div className="text-center mb-3">
              <img
                src="/logo.png"
                alt="Society365 Logo"
                className="mx-auto h-48 w-auto object-contain"
              />

              <h2 className="text-lg mb-4 font-medium text-gray-700 -mt-6 tracking-wide">
                LOGIN
              </h2>

            </div>


            {/* INPUTS */}
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

            {/* BUTTON */}
            <Button
              onClick={handleLogin}
              // disabled={loading || !EmailId || !Password}
              className="w-full h-10 mb-2 cursor-pointer mt-6 font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-md"
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

            {/* LINKS */}
            <div className="text-center mt-3 space-y-1">
              <p
                className="text-sm text-blue-600 cursor-pointer font-medium hover:underline"
                onClick={() => router.push("/forgotpassword")}
              >
                Forgot password?
              </p>

              <p className="text-sm text-gray-700">
                New here?{" "}
                <span
                  onClick={() => router.push("/signup")}
                  className="text-blue-600 font-medium cursor-pointer hover:underline"
                >
                  Create Account
                </span>
              </p>
            </div>

            {/* FOOTER */}
            <p className="text-xs text-center text-gray-500 mt-5 tracking-wide">
              Managed by{" "}
              <a
                href="https://nexspiretechnologies.in"
                target="_blank"
                className="text-gray-500 font-semibold hover:underline"
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

