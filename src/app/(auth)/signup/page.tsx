"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 px-3 sm:px-6">
      <Card className="w-full max-w-md sm:max-w-2xl lg:max-w-3xl bg-white/80 backdrop-blur-xl shadow-2xl rounded-2xl border-0">
        <CardContent className="p-4 sm:p-6 lg:p-8">
          {/* HEADER */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800">
              Society<span className="text-amber-500">365</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Create your society account
            </p>
          </div>

          {/* FORM */}
          <form
            onSubmit={handleSignup}
            className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5"
          >
            <FloatingInput
              label="Full Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              error={errors.name}
            />

            <FloatingInput
              label="Email Address"
              name="emailId"
              value={form.emailId}
              onChange={handleChange}
              error={errors.emailId}
            />

            <FloatingInput
              label="Mobile Number"
              name="mobile"
              maxLength={10}
              value={form.mobile}
              onChange={handleChange}
              error={errors.mobile}
            />

            <FloatingInput
              label="Floor"
              name="floor"
              value={form.floor}
              onChange={handleChange}
            />

            <FloatingInput
              label="Flat Number"
              name="flat"
              value={form.flat}
              onChange={handleChange}
            />

            <PasswordInput
              label="Password"
              name="password"
              value={form.password}
              onChange={handleChange}
              show={showPwd}
              toggle={() => setShowPwd((v) => !v)}
              error={errors.password}
            />

            <PasswordInput
              label="Confirm Password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              show={showPwd}
              toggle={() => setShowPwd((v) => !v)}
              error={errors.confirmPassword}
            />

            <div className="sm:col-span-2 pt-2">
              <Button
                disabled={loading}
                className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-md"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </div>
          </form>

          <p className="text-center text-xs sm:text-sm text-gray-600 mt-5">
            Already registered?{" "}
            <span
              onClick={() => router.push("/login")}
              className="text-amber-600 font-semibold cursor-pointer hover:underline"
            >
              Login
            </span>
          </p>
        </CardContent>
      </Card>
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

  return (
    <div className="relative w-full">
      <Input
        {...props}
        onFocus={() => setFocus(true)}
        onBlur={() => !props.value && setFocus(false)}
        className={`h-11 pt-4 ${
          error ? "border-red-400" : "border-gray-300"
        }`}
      />
      <label
        className={`absolute left-3 px-1 bg-white text-xs transition-all ${
          focus || props.value
            ? "-top-2 text-amber-600"
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

  return (
    <div className="relative w-full">
      <Input
        {...props}
        type={show ? "text" : "password"}
        onFocus={() => setFocus(true)}
        onBlur={() => !props.value && setFocus(false)}
        className={`h-11 pt-4 pr-10 ${
          error ? "border-red-400" : "border-gray-300"
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
          focus || props.value
            ? "-top-2 text-amber-600"
            : "top-3 text-gray-400"
        }`}
      >
        {label}
      </label>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
