"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValueEvent, useScroll, useReducedMotion } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import { Logo } from "@/app/components/Logo";
import { EASE, spring } from "./motion";

const LINKS = [
  { label: "So funktioniert's", href: "#so-funktionierts" },
  { label: "Über Bewerbify", href: "#ueber" },
  { label: "Deine Daten", href: "#daten" },
  { label: "FAQ", href: "#faq" },
];

/**
 * Floating pill navigation: logo left, section links centre, call to action
 * right. It rides over the dark hero as frosted glass and swaps to a light
 * card once the hero is behind it, so the links stay readable against both.
 */
export function LandingNav({ revealed }: { revealed: boolean }) {
  const shouldReduce = useReducedMotion();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 80));

  return (
    <>
      <motion.header
        initial={shouldReduce ? false : { y: -80, opacity: 0 }}
        animate={revealed ? { y: 0, opacity: 1 } : undefined}
        transition={{ ...spring, delay: 0.1 }}
        className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-5"
      >
        <nav
          className={`mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-2xl pl-4 pr-2 transition-colors duration-500 sm:h-16 sm:pl-6 sm:pr-3 ${
            scrolled
              ? "border border-slate-200/80 bg-white/85 shadow-lg shadow-slate-900/5 backdrop-blur-xl"
              : "border border-white/10 bg-slate-950/40 backdrop-blur-xl"
          }`}
        >
          <Link href="/" aria-label="Bewerbify Startseite" className="shrink-0">
            <Logo tone={scrolled ? "dark" : "light"} className="text-2xl sm:text-[1.75rem]" />
          </Link>

          {/* Section links — hidden on small screens, where the menu takes over */}
          <ul className="hidden items-center gap-1 lg:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={`group relative rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    scrolled ? "text-slate-600 hover:text-slate-900" : "text-slate-300 hover:text-white"
                  }`}
                >
                  {link.label}
                  <span
                    aria-hidden
                    className="absolute inset-x-3 bottom-1 h-px origin-left scale-x-0 bg-current transition-transform duration-300 ease-out group-hover:scale-x-100"
                  />
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="group hidden items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-95 sm:inline-flex"
            >
              Kostenlos starten
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Menü öffnen"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors lg:hidden ${
                scrolled ? "text-slate-700 hover:bg-slate-100" : "text-white hover:bg-white/10"
              }`}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </nav>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] bg-slate-950/95 backdrop-blur-xl lg:hidden"
          >
            <div className="flex h-16 items-center justify-between px-5 pt-3">
              <Logo tone="light" className="text-2xl" />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Menü schließen"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <motion.ul
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } } }}
              className="mt-8 flex flex-col gap-1 px-5"
            >
              {LINKS.map((link) => (
                <motion.li
                  key={link.href}
                  variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}
                  transition={{ duration: 0.4, ease: EASE }}
                >
                  <a
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block border-b border-white/5 py-4 text-2xl font-semibold text-white"
                  >
                    {link.label}
                  </a>
                </motion.li>
              ))}
              <motion.li
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                className="pt-6"
              >
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-base font-semibold text-white"
                >
                  Kostenlos starten
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.li>
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
