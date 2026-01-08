"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

type Step = "EMAIL" | "OTP" | "RESET";

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
      const res = await axios.post(`${API_BASE}/ForgotPassword/SendOtp`, null, {
        params: { email: form.email.trim() },
      });

      if (res.data.isSuccess) {
        toast.success(res.data.resMsg || "OTP sent successfully!");
        setStep("OTP");
        startTimer(); // Start countdown
      } else toast.error(res.data.resMsg || "Failed to send OTP");
    } catch (err: any) {
      toast.error(err.response?.data?.resMsg || "Failed to send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // VERIFY OTP
  const verifyOtp = async () => {
    if (!validateOtp()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/ForgotPassword/VerifyOtp`, null, {
        params: {
          email: form.email.trim(),
          otp: form.otp.join(""),
        },
      });

      if (res.data.isSuccess) {
        toast.success(res.data.resMsg || "OTP verified successfully!");
        setStep("RESET");
      } else toast.error(res.data.resMsg || "Invalid or expired OTP");
    } catch (err: any) {
      toast.error(err.response?.data?.resMsg || "Verification failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // RESEND OTP
  const resendOtp = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/ForgotPassword/SendOtp`, null, {
        params: { email: form.email.trim() },
      });

      if (res.data.isSuccess) {
        toast.success("OTP resent successfully!");
        startTimer();
        setForm({ ...form, otp: ["", "", "", "", "", ""] }); // Clear OTP
        document.getElementById("otp-0")?.focus();
      } else toast.error(res.data.resMsg || "Failed to resend OTP");
    } catch (err: any) {
      toast.error(err.response?.data?.resMsg || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  // RESET PASSWORD - THIS WAS MISSING!
  const resetPassword = async () => {
    if (!validatePassword()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/ForgotPassword/ResetPassword`, null, {
        params: {
          email: form.email.trim(),
          newPassword: form.password,
        },
      });

      if (res.data.isSuccess) {
        toast.success(res.data.resMsg || "Password reset successfully!");
        setTimeout(() => router.push("/login"), 2000);
      } else toast.error(res.data.resMsg || "Failed to reset password");
    } catch (err: any) {
      toast.error(err.response?.data?.resMsg || "Password reset failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4">
      <Card className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-lg shadow-2xl rounded-3xl border-0 overflow-hidden">
        <CardContent className="p-6 sm:p-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800">
              Society<span className="text-amber-500">365</span>
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              {step === "EMAIL" && "Forgot your password?"}
              {step === "OTP" && "Check your email for the OTP"}
              {step === "RESET" && "Create a new secure password"}
            </p>
          </div>

          {/* EMAIL STEP */}
          {step === "EMAIL" && (
            <div className="space-y-6">
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
                size="lg"
                className="w-full h-12 text-base font-medium bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg transition-all"
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </Button>
            </div>
          )}

          {/* OTP STEP - 6 BOXES + TIMER */}
          {step === "OTP" && (
            <div className="space-y-6">
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <Input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength={1}
                    value={form.otp[index]}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-mono border-2 rounded-xl focus:border-amber-500"
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              {errors.otp && <p className="text-center text-xs text-red-500">{errors.otp}</p>}

              {/* Timer */}
              <p className="text-center text-sm text-gray-600">
                {timer > 0 ? `Resend OTP in ${timer}s` : "Didn't receive OTP?"}
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                {timer === 0 && (
                  <Button
                    variant="outline"
                    onClick={resendOtp}
                    disabled={loading}
                    className="flex-1 h-12"
                  >
                    Resend OTP
                  </Button>
                )}
                <Button
                  onClick={verifyOtp}
                  disabled={loading}
                  size="lg"
                  className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg transition-all"
                >
                  {loading ? "Verifying..." : "Verify OTP"}
                </Button>
              </div>
            </div>
          )}

          {/* RESET STEP */}
          {step === "RESET" && (
            <div className="space-y-6">
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
                size="lg"
                className="w-full h-12 text-base font-medium bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg transition-all"
              >
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </div>
          )}

          <p className="text-center text-sm text-gray-600 mt-8">
            Remember your password?{" "}
            <button
              onClick={() => router.push("/login")}
              className="text-amber-600 font-semibold hover:underline focus:outline-none focus:underline transition-colors"
            >
              Back to Login
            </button>
          </p>
        </CardContent>
      </Card>
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
  [key: string]: any;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = props.value?.toString().length > 0;
  const isFloating = focused || hasValue;

  return (
    <div className="relative w-full">
      <Input
        {...props}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`peer h-14 px-4 pt-5 pb-2 text-base border-2 rounded-xl transition-all duration-200 ${
          error ? "border-red-400 focus:border-red-500" : "border-gray-300 focus:border-amber-500"
        } ${props.className || ""}`}
      />
      <label
        className={`absolute left-4 px-1 bg-white pointer-events-none transition-all duration-200 select-none ${
          isFloating ? "-top-3 text-xs font-medium text-amber-600" : "top-4 text-sm text-gray-500"
        } peer-focus:-top-3 peer-focus:text-xs peer-focus:font-medium peer-focus:text-amber-600`}
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
  [key: string]: any;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = props.value?.toString().length > 0;
  const isFloating = focused || hasValue;

  return (
    <div className="relative w-full">
      <Input
        {...props}
        type={show ? "text" : "password"}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`peer h-14 px-4 pt-5 pb-2 pr-12 text-base border-2 rounded-xl transition-all duration-200 ${
          error ? "border-red-400 focus:border-red-500" : "border-gray-300 focus:border-amber-500"
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
          isFloating ? "-top-3 text-xs font-medium text-amber-600" : "top-4 text-sm text-gray-500"
        } peer-focus:-top-3 peer-focus:text-xs peer-focus:font-medium peer-focus:text-amber-600`}
      >
        {label}
      </label>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}