"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BranchToggle() {
  const pathname = usePathname();
  const isGastronomie = pathname?.includes("gastronomie");
  const isInformatik = !isGastronomie;

  return (
    <div className="flex justify-center mb-8">
      <div className="bg-gray-200 p-1 rounded-full flex gap-1 shadow-sm">
        <Link
          href="/informatik"
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            isInformatik
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Informatik
        </Link>
        <Link
          href="/gastronomie"
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            isGastronomie
              ? "bg-white text-orange-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Gastronomie
        </Link>
      </div>
    </div>
  );
}
