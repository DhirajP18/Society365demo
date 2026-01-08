"use client";

import * as React from "react";
import { Toaster as RadixToaster } from "sonner"; // ShadCN uses sonner under the hood

export function Toaster() {
  return <RadixToaster richColors position="top-right" />;
}
