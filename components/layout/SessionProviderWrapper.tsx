"use client";

import { useEffect, useState } from "react";
import { SessionProvider } from "next-auth/react";
import dynamic from "next/dynamic";

const Agentation = dynamic(
  () => import("agentation").then((mod) => mod.Agentation),
  { ssr: false }
);

export function SessionProviderWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <SessionProvider>
      {children}
      {mounted && process.env.NODE_ENV === "development" && <Agentation />}
    </SessionProvider>
  );
}
