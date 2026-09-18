"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Menu, X, ArrowRight, ArrowUpRight } from "lucide-react";
import { Logo } from "@/app/components/Logo";
import { EASE, spring } from "./motion";

const SECTION_LINKS = [
  { label: "So funktioniert's", href: "#so-funktionierts" },
  { label: "Über Bewerbify", href: "#ueber" },
  { label: "Deine Daten", href: "#daten" },
  { label: "FAQ", href: "#faq" },
];

const APP_LINKS = [
  { label: "Neue Bewerbung", href: "/v2/apply" },
  { label: "Geplante Mails", href: "/v2/scheduled" },
  { label: "Profil", href: "/v2/profile/user" },
];

const LEGAL_LINKS = [
  { label: "Datenschutz", href: "/privacy" },
  { label: "Nutzungsbedingungen", href: "/terms" },
];

/**
 * Reads the tone of whatever section currently sits behind the header.
 *
 * The header has no background of its own, so its links have to invert when a
 * dark section scrolls under them. Sections declare themselves with
 * `data-nav-tone="dark"`; the observer's root margin collapses the viewport to
 * a thin band at the header's height, so a section "intersects" exactly while
 * it is behind the header and not a pixel sooner.
 */
function useBackdropTone(bandHeight = 88) {
  const [tone, setTone] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const marked = Array.from(document.querySelectorAll<HTMLElement>("[data-nav-tone]"));
    if (marked.length === 0) return;

    const dark = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) dark.add(entry.target);
          else dark.delete(entry.target);
        }
        setTone(dark.size > 0 ? "dark" : "light");
      },
      { rootMargin: `0px 0px -${Math.max(0, window.innerHeight - bandHeight)}px 0px`, threshold: 0 }
    );

    marked.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [bandHeight]);

  return tone;
}

/**
 * Header with no background at all: just the wordmark, the section links and
 * the call to action, floating over whatever is behind them.
 */
export function LandingNav({ revealed, isSignedIn }: { revealed: boolean; isSignedIn: boolean }) {
  const shouldReduce = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const tone = useBackdropTone();
  const onDark = tone === "dark";

  // Keep the page behind a full-screen menu from scrolling underneath it.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  const ctaLabel = isSignedIn ? "Zur App" : "Kostenlos starten";
  const ctaHref = isSignedIn ? "/v2/apply" : "/login";

  return (
    <>
      <motion.header
        initial={shouldReduce ? false : { y: -60, opacity: 0 }}
        animate={revealed ? { y: 0, opacity: 1 } : undefined}
        transition={{ ...spring, delay: 0.1 }}
        className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-8 sm:pt-6"
      >
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" aria-label="Bewerbify Startseite" className="shrink-0">
            <Logo className="text-2xl sm:text-[1.75rem]" />
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {SECTION_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={`group relative rounded-full px-4 py-2 text-sm font-medium transition-colors duration-500 ${
                    onDark ? "text-slate-200 hover:text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {link.label}
                  <span
                    aria-hidden
                    className="absolute inset-x-4 bottom-1 h-px origin-left scale-x-0 bg-current transition-transform duration-300 ease-out group-hover:scale-x-100"
                  />
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <Link
              href={ctaHref}
              className="group hidden items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 active:scale-95 sm:inline-flex"
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Menü öffnen"
              className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-500 lg:hidden ${
                onDark ? "text-white hover:bg-white/10" : "text-slate-800 hover:bg-slate-900/5"
              }`}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </nav>
      </motion.header>

      {/* Full-screen menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="menu"
            initial={{ clipPath: "circle(0% at calc(100% - 2.5rem) 2.5rem)" }}
            animate={{ clipPath: "circle(150% at calc(100% - 2.5rem) 2.5rem)" }}
            exit={{ clipPath: "circle(0% at calc(100% - 2.5rem) 2.5rem)" }}
            transition={{ duration: shouldReduce ? 0.2 : 0.6, ease: EASE }}
            className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950 lg:hidden"
          >
            <div className="flex min-h-full flex-col px-5 pb-8 pt-4">
              <div className="flex h-12 shrink-0 items-center justify-between">
                <Logo className="text-2xl" />
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Menü schließen"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <motion.div
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.22 } } }}
                className="flex flex-1 flex-col"
              >
                <ul className="mt-6">
                  {SECTION_LINKS.map((link, i) => (
                    <motion.li
                      key={link.href}
                      variants={{
                        hidden: { opacity: 0, y: 24, rotateX: -35 },
                        show: { opacity: 1, y: 0, rotateX: 0 },
                      }}
                      transition={{ duration: 0.5, ease: EASE }}
                      style={{ transformPerspective: 600 }}
                    >
                      <a
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        className="group flex items-baseline gap-3 border-b border-white/5 py-4 text-[1.75rem] font-bold text-white"
                      >
                        <span className="w-6 text-xs font-semibold text-blue-400/70">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="transition-transform duration-300 group-active:translate-x-1">
                          {link.label}
                        </span>
                      </a>
                    </motion.li>
                  ))}
                </ul>

                <motion.div
                  variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="mt-8"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">App</p>
                  <ul className="mt-3 space-y-1">
                    {APP_LINKS.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={() => setMenuOpen(false)}
                          className="group flex items-center justify-between rounded-full px-1 py-2.5 text-base text-slate-300 transition-colors hover:text-white"
                        >
                          {link.label}
                          <ArrowUpRight className="h-4 w-4 text-slate-600 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-blue-400" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                <motion.div
                  variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="mt-6"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Rechtliches
                  </p>
                  <ul className="mt-3 space-y-1">
                    {LEGAL_LINKS.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={() => setMenuOpen(false)}
                          className="block rounded-full px-1 py-2.5 text-base text-slate-300 transition-colors hover:text-white"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                {/* Call to action pinned to the very bottom of the sheet */}
                <motion.div
                  variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="mt-auto pt-10"
                >
                  <Link
                    href={ctaHref}
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-blue-500 active:scale-[0.98]"
                  >
                    {ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
