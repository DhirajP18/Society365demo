import { useState } from "react";
import { Input } from "../ui/input";

export default function FloatingInput({
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
                    setFocused(true)
                    onFocus?.(e)
                }}
                onBlur={(e) => {
                    if (!value) setFocused(false)
                    onBlur?.(e)
                }}
              className="
  h-10 px-3 pt-4 rounded-lg
  border border-gray-300
  focus-visible:border-transparent
  focus-visible:ring-1
  focus-visible:ring-blue-400
  focus-visible:ring-offset-0
  focus-visible:outline-none
"
            />
            <label
                className={`absolute left-3 px-1 bg-white pointer-events-none transition-all duration-200 ${focused || value
                    ? "-top-2 text-sm text-gray-600"
                    : "top-2.5 text-sm text-gray-400"
                    }`}
            >
                {label}
            </label>
        </div>
    );
}