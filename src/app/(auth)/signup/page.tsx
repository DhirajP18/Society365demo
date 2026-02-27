"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Building2, ShieldCheck, Users2 } from "lucide-react";

/* ============================
   TYPES
============================ */

interface ApiErrorResponse {
  resMsg?: string;
}

interface SignupForm {
  name: string;
  emailId: string;
  mobile: string;
  floor: string;
  flat: string;
  password: string;
  confirmPassword: string;
}

type FormErrors = Partial<Record<keyof SignupForm, string>>;

/* ============================
   PAGE
============================ */

export default function SignupPage() {
  const router = useRouter();

  const [form, setForm] = useState<SignupForm>({
    name: "",
    emailId: "",
    mobile: "",
    floor: "",
    flat: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  /* ---------------- VALIDATION ---------------- */
  const validate = (): boolean => {
    const e: FormErrors = {};

    if (!form.name.trim()) e.name = "Full name required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailId))
      e.emailId = "Invalid email address";
    if (!/^[0-9]{10}$/.test(form.mobile))
      e.mobile = "Enter 10 digit mobile number";
    if (form.password.length < 6)
      e.password = "Minimum 6 characters";
    if (form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ---------------- INPUT CHANGE ---------------- */
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "mobile" && !/^\d*$/.test(value)) return;

    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  /* ---------------- SUBMIT ---------------- */
  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const res = await api.post("/UserMaster/Insert", {
        Name: form.name,
        EmailId: form.emailId,
        Password: form.password,
        Mobile: form.mobile,
        Floor: form.floor,
        Flat: form.flat,
        Status: "PENDING"
      });

      if (res.data?.isSuccess) {
        toast.success("Registration Successful", {
          description: "Waiting for admin approval",
        });
        setTimeout(() => router.push("/login"), 2000);
      } else {
        toast.error(res.data?.resMsg ?? "Signup failed");
      }
    } catch (err: unknown) {
      if (axios.isAxiosError<ApiErrorResponse>(err)) {
        toast.error(err.response?.data?.resMsg ?? "Signup failed");
      } else {
        toast.error("Something went wrong");
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
            Join <span className="text-sky-300">Society-365</span>
            <br />
            Resident Portal
          </h1>
          <p className="text-base mt-4 max-w-md opacity-90">
            Register your account and get access after admin approval.
          </p>
          <div className="mt-6 space-y-3 text-sm text-white/90">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-sky-300" />
              Complete society services in one place
            </div>
            <div className="flex items-center gap-2">
              <Users2 className="h-4 w-4 text-sky-300" />
              Profile linked with your flat and floor
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-sky-300" />
              Secure onboarding with admin verification
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[52%] flex items-start lg:items-center justify-center p-3 py-5 sm:p-5">
        <Card className="w-full max-w-xl bg-white shadow-2xl border-0 rounded-2xl">
          <CardContent className="p-5 sm:p-7">
            <div className="text-center mb-5">
              <img src="/logo.png" alt="Society365 Logo" className="mx-auto h-16 object-contain" />
              <h2 className="text-lg font-semibold text-gray-800 mt-2">Create Account</h2>
              <p className="text-xs text-gray-500 mt-1">Fill details to register your resident profile</p>
            </div>

            <form onSubmit={handleSignup} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FloatingInput label="Full Name" name="name" value={form.name} onChange={handleChange} error={errors.name} />
              <FloatingInput label="Email Address" name="emailId" value={form.emailId} onChange={handleChange} error={errors.emailId} />
              <FloatingInput label="Mobile Number" name="mobile" maxLength={10} value={form.mobile} onChange={handleChange} error={errors.mobile} />
              <FloatingInput label="Floor" name="floor" value={form.floor} onChange={handleChange} />
              <FloatingInput label="Flat Number" name="flat" value={form.flat} onChange={handleChange} />
              <PasswordInput
                label="Password"
                name="password"
                value={form.password}
                onChange={handleChange}
                show={showPwd}
                toggle={() => setShowPwd((v) => !v)}
                error={errors.password}
              />
              <div className="sm:col-span-2">
                <PasswordInput
                  label="Confirm Password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  show={showPwd}
                  toggle={() => setShowPwd((v) => !v)}
                  error={errors.confirmPassword}
                />
              </div>

              <div className="sm:col-span-2 pt-1">
                <Button
                  disabled={loading}
                  className="w-full h-10 text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-md"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </div>
            </form>

            <p className="text-center text-sm text-gray-600 mt-4">
              Already registered?{" "}
              <span onClick={() => router.push("/login")} className="text-sky-600 font-semibold cursor-pointer hover:underline">
                Login
              </span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ============================
   FLOATING INPUT
============================ */

interface FloatingInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

function FloatingInput({ label, error, ...props }: FloatingInputProps) {
  const [focus, setFocus] = useState(false);
  const hasValue = props.value !== undefined && String(props.value).length > 0;

  return (
    <div className="relative w-full">
      <Input
        {...props}
        onFocus={() => setFocus(true)}
        onBlur={() => !props.value && setFocus(false)}
        className={`h-11 pt-4 bg-white ${
          error ? "border-red-400 focus-visible:ring-red-200" : "border-gray-300 focus-visible:ring-sky-200"
        }`}
      />
      <label
        className={`absolute left-3 px-1 bg-white text-xs transition-all ${
          focus || hasValue
            ? "-top-2 text-sky-600"
            : "top-3 text-gray-400"
        }`}
      >
        {label}
      </label>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

/* ============================
   PASSWORD INPUT
============================ */

interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  show: boolean;
  toggle: () => void;
  error?: string;
} 

function PasswordInput({
  label,
  show,
  toggle,
  error,
  ...props
}: PasswordInputProps) {
  const [focus, setFocus] = useState(false);
  const hasValue = props.value !== undefined && String(props.value).length > 0;

  return (
    <div className="relative w-full">
      <Input
        {...props}
        type={show ? "text" : "password"}
        onFocus={() => setFocus(true)}
        onBlur={() => !props.value && setFocus(false)}
        className={`h-11 pt-4 pr-10 bg-white ${
          error ? "border-red-400 focus-visible:ring-red-200" : "border-gray-300 focus-visible:ring-sky-200"
        }`}
      />

      <button
        type="button"
        className="absolute right-3 top-3 text-gray-500"
        onClick={toggle}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>

      <label
        className={`absolute left-3 px-1 bg-white text-xs transition-all ${
          focus || hasValue
            ? "-top-2 text-sky-600"
            : "top-3 text-gray-400"
        }`}
      >
        {label}
      </label>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
