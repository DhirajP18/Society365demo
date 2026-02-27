"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Mail, KeyRound, ShieldCheck } from "lucide-react";

/* ---------------- TYPES ---------------- */
type Step = "EMAIL" | "OTP" | "RESET";

interface ApiResponse {
  isSuccess: boolean;
  resMsg?: string;
}

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("EMAIL");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [form, setForm] = useState({
    email: "",
    otp: ["", "", "", "", "", ""], // 6-digit array
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Countdown timer state
  const [timer, setTimer] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

  /* ---------------- VALIDATION ---------------- */
  const validateEmail = () => {
    const e: Record<string, string> = {};
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email address";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateOtp = () => {
    const otpString = form.otp.join("");
    const e: Record<string, string> = {};
    if (!/^[0-9]{6}$/.test(otpString)) e.otp = "Enter a valid 6-digit OTP";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validatePassword = () => {
    const e: Record<string, string> = {};
    if (form.password.length < 6) e.password = "Password must be at least 6 characters";
    if (form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ---------------- HANDLERS ---------------- */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "email" || name === "password" || name === "confirmPassword") {
      setForm({ ...form, [name]: value });
    }
    setErrors({ ...errors, [name]: "" });
  };

  // Handle individual OTP digit input
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return; // only single digit or empty

    const newOtp = [...form.otp];
    newOtp[index] = value;
    setForm({ ...form, otp: newOtp });
    setErrors({ ...errors, otp: "" });

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  // Handle OTP backspace for previous focus
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !form.otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  // Start 60-second countdown
  const startTimer = () => {
    setTimer(60);
  };

  useEffect(() => {
    if (timer > 0) {
      intervalRef.current = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timer]);

  // SEND OTP
   const sendOtp = async () => {
    if (!validateEmail()) return;
    setLoading(true);
    try {
      const res = await axios.post<ApiResponse>(
        `${API_BASE}/ForgotPassword/SendOtp`,
        null,
        { params: { email: form.email.trim() } }
      );

      if (res.data.isSuccess) {
        toast.success(res.data.resMsg || "OTP sent successfully!");
        setStep("OTP");
        startTimer();
      } else toast.error(res.data.resMsg);
    } catch (err: unknown) {
      if (axios.isAxiosError<ApiResponse>(err)) {
        toast.error(err.response?.data?.resMsg || "Failed to send OTP");
      } else {
        toast.error("Failed to send OTP");
      }
    } finally {
      setLoading(false);
    }
  };

  // VERIFY OTP
  const verifyOtp = async () => {
    if (!validateOtp()) return;
    setLoading(true);
    try {
      const res = await axios.post<ApiResponse>(
        `${API_BASE}/ForgotPassword/VerifyOtp`,
        null,
        {
          params: { email: form.email.trim(), otp: form.otp.join("") },
        }
      );

      if (res.data.isSuccess) {
        toast.success(res.data.resMsg || "OTP verified!");
        setStep("RESET");
      } else toast.error(res.data.resMsg);
    } catch (err: unknown) {
      if (axios.isAxiosError<ApiResponse>(err)) {
        toast.error(err.response?.data?.resMsg || "Verification failed");
      } else {
        toast.error("Verification failed");
      }
    } finally {
      setLoading(false);
    }
  };

  // RESEND OTP
 const resendOtp = async () => {
    setLoading(true);
    try {
      const res = await axios.post<ApiResponse>(
        `${API_BASE}/ForgotPassword/SendOtp`,
        null,
        { params: { email: form.email.trim() } }
      );

      if (res.data.isSuccess) {
        toast.success("OTP resent successfully!");
        startTimer();
        setForm({ ...form, otp: ["", "", "", "", "", ""] });
        document.getElementById("otp-0")?.focus();
      } else toast.error(res.data.resMsg);
    } catch (err: unknown) {
      if (axios.isAxiosError<ApiResponse>(err)) {
        toast.error(err.response?.data?.resMsg || "Failed to resend OTP");
      } else {
        toast.error("Failed to resend OTP");
      }
    } finally {
      setLoading(false);
    }
  };

  // RESET PASSWORD - THIS WAS MISSING!
  const resetPassword = async () => {
    if (!validatePassword()) return;
    setLoading(true);
    try {
      const res = await axios.post<ApiResponse>(
        `${API_BASE}/ForgotPassword/ResetPassword`,
        null,
        {
          params: { email: form.email.trim(), newPassword: form.password },
        }
      );

      if (res.data.isSuccess) {
        toast.success(res.data.resMsg || "Password reset successful!");
        setTimeout(() => router.push("/login"), 2000);
      } else toast.error(res.data.resMsg);
    } catch (err: unknown) {
      if (axios.isAxiosError<ApiResponse>(err)) {
        toast.error(err.response?.data?.resMsg || "Password reset failed");
      } else {
        toast.error("Password reset failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] lg:h-[100dvh] flex flex-col lg:flex-row bg-gray-50 overflow-y-auto lg:overflow-hidden">
      <div className="hidden lg:block lg:w-[48%] relative">
        <img
          src="https://images.unsplash.com/photo-1619177982598-44fe889168cd?w=600&auto=format&fit=crop&q=60"
          alt="Society Building"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-900/55" />
        <div className="absolute inset-0 flex flex-col justify-center px-12 text-white">
          <h1 className="text-4xl font-extrabold leading-tight">
            Recover Access to
            <br />
            <span className="text-sky-300">Society-365</span>
          </h1>
          <p className="text-base mt-4 max-w-md opacity-90">
            Secure password recovery with OTP verification and reset.
          </p>
          <div className="mt-6 space-y-3 text-sm text-white/90">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-sky-300" />
              OTP sent to registered email
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-sky-300" />
              Verified step-by-step flow
            </div>
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-sky-300" />
              Create a new secure password
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[52%] flex items-start lg:items-center justify-center p-3 py-5 sm:p-5">
        <Card className="w-full max-w-md bg-white shadow-2xl border-0 rounded-2xl">
          <CardContent className="p-6 sm:p-7">
            <div className="text-center mb-6">
              <img src="/logo.png" alt="Society365 Logo" className="mx-auto h-14 object-contain" />
              <h2 className="text-lg font-semibold text-gray-800 mt-2">Forgot Password</h2>
              <p className="text-xs text-gray-500 mt-1">
                {step === "EMAIL" && "Enter your registered email to receive OTP"}
                {step === "OTP" && "Enter the 6-digit OTP sent to your email"}
                {step === "RESET" && "Set your new password and continue"}
              </p>
            </div>

            {step === "EMAIL" && (
              <div className="space-y-4">
                <FloatingInput
                  label="Registered Email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  error={errors.email}
                  autoFocus
                />
                <Button
                  onClick={sendOtp}
                  disabled={loading}
                  className="w-full h-10 text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-md"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    "Send OTP"
                  )}
                </Button>
              </div>
            )}

            {step === "OTP" && (
              <div className="space-y-4">
                <div className="flex justify-center gap-2 sm:gap-3">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <Input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      maxLength={1}
                      value={form.otp[index]}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-11 h-12 sm:w-12 sm:h-12 text-center text-lg font-mono border-2 rounded-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-300/30 transition-all"
                      autoFocus={index === 0}
                    />
                  ))}
                </div>

                {errors.otp && <p className="text-center text-xs text-red-500">{errors.otp}</p>}
                <p className="text-center text-xs text-gray-500">
                  {timer > 0 ? `Resend OTP in ${timer}s` : "Did not receive OTP?"}
                </p>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  {timer === 0 && (
                    <Button variant="outline" onClick={resendOtp} disabled={loading} className="flex-1 h-10">
                      Resend OTP
                    </Button>
                  )}
                  <Button
                    onClick={verifyOtp}
                    disabled={loading}
                    className="flex-1 h-10 text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-md"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify OTP"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === "RESET" && (
              <div className="space-y-4">
                <PasswordInput
                  label="New Password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  show={showPwd}
                  toggle={() => setShowPwd(!showPwd)}
                  error={errors.password}
                  autoFocus
                />
                <PasswordInput
                  label="Confirm Password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  show={showPwd}
                  toggle={() => setShowPwd(!showPwd)}
                  error={errors.confirmPassword}
                />
                <Button
                  onClick={resetPassword}
                  disabled={loading}
                  className="w-full h-10 text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-md"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </div>
            )}

            <p className="text-center text-sm text-gray-600 mt-6">
              Remember your password?{" "}
              <button onClick={() => router.push("/login")} className="text-sky-600 font-semibold hover:underline">
                Back to Login
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- FLOATING INPUT ---------------- */
function FloatingInput({
  label,
  error,
  autoFocus = false,
  ...props
}: {
  label: string;
  error?: string;
  autoFocus?: boolean;
} & React.ComponentProps<typeof Input>) {
  const [focused, setFocused] = useState(false);
 const hasValue = props.value !== undefined && String(props.value).length > 0;

  const isFloating = focused || hasValue;

  return (
    <div className="relative w-full">
      <Input
        {...props}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`peer h-11 px-3 pt-4 pb-1 text-sm border rounded-lg transition-all duration-200 bg-white ${
          error ? "border-red-400 focus:border-red-500" : "border-gray-300 focus:border-sky-500"
        } ${props.className || ""}`}
      />
      <label
        className={`absolute left-4 px-1 bg-white pointer-events-none transition-all duration-200 select-none ${
          isFloating ? "-top-2 text-xs font-medium text-sky-600" : "top-3 text-xs text-gray-500"
        } peer-focus:-top-2 peer-focus:text-xs peer-focus:font-medium peer-focus:text-sky-600`}
      >
        {label}
      </label>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}

/* ---------------- PASSWORD INPUT ---------------- */
function PasswordInput({
  label,
  show,
  toggle,
  error,
  autoFocus = false,
  ...props
}: {
  label: string;
  show: boolean;
  toggle: () => void;
  error?: string;
  autoFocus?: boolean;
} & React.ComponentProps<typeof Input>) {
  const [focused, setFocused] = useState(false);
  const hasValue = props.value !== undefined && String(props.value).length > 0;
  const isFloating = focused || hasValue;

  return (
    <div className="relative w-full">
      <Input
        {...props}
        type={show ? "text" : "password"}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`peer h-11 px-3 pt-4 pb-1 pr-10 text-sm border rounded-lg transition-all duration-200 bg-white ${
          error ? "border-red-400 focus:border-red-500" : "border-gray-300 focus:border-sky-500"
        }`}
      />
      <button
        type="button"
        onClick={toggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors focus:outline-none"
      >
        {show ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
      <label
        className={`absolute left-4 px-1 bg-white pointer-events-none transition-all duration-200 select-none ${
          isFloating ? "-top-2 text-xs font-medium text-sky-600" : "top-3 text-xs text-gray-500"
        } peer-focus:-top-2 peer-focus:text-xs peer-focus:font-medium peer-focus:text-sky-600`}
      >
        {label}
      </label>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
