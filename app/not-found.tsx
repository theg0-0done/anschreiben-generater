"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-gray-100"
      >
        <div className="flex justify-center mb-6">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.1,
            }}
            className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-600"
          >
            <FileQuestion className="w-12 h-12" />
          </motion.div>
        </div>
        
        <h1 className="text-4xl font-extrabold text-slate-800 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-slate-700 mb-4">Seite nicht gefunden</h2>
        
        <p className="text-slate-500 mb-8">
          Hoppla! Die von Ihnen gesuchte Seite existiert nicht oder wurde verschoben.
        </p>

        <Link href="/">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-colors shadow-md shadow-blue-200"
          >
            <ArrowLeft className="w-5 h-5" />
            Zurück zur Startseite
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
}
