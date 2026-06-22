"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import localforage from "localforage";
import { Sparkles } from "lucide-react";

export default function RootPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const hasOnboarded = await localforage.getItem("hasOnboarded");
        if (hasOnboarded) {
          router.replace("/dashboard");
        } else {
          router.replace("/onboarding");
        }
      } catch (err) {
        console.error("Storage error", err);
        router.replace("/onboarding");
      }
    }
    checkOnboarding();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-blue-600">
        <Sparkles className="w-8 h-8 animate-pulse" />
        <p className="font-medium">Loading Invo...</p>
      </div>
    </div>
  );
}
