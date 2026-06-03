'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useStore } from '@/lib/store';

export default function ToastContainer() {
  const toasts = useStore((state) => state.toasts);
  const removeToast = useStore((state) => state.removeToast);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';

          return (
            <motion.div
              layout
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              key={toast.id}
              className={`flex items-start gap-3 p-4 rounded-xl shadow-lg border pointer-events-auto backdrop-blur-md glass-panel ${
                isSuccess 
                  ? 'border-emerald-500/30 dark:border-emerald-500/20 bg-emerald-50/80 dark:bg-emerald-950/20' 
                  : isError 
                    ? 'border-rose-500/30 dark:border-rose-500/20 bg-rose-50/80 dark:bg-rose-950/20' 
                    : 'border-[#4A6B53]/30 dark:border-[#6E9C7C]/20 bg-amber-50/80 dark:bg-amber-950/20'
              }`}
            >
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />}
              {isError && <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
              {!isSuccess && !isError && <Info className="w-5 h-5 text-[#4A6B53] dark:text-[#6E9C7C] shrink-0 mt-0.5" />}

              <div className="flex-1 text-xs font-medium text-zinc-800 dark:text-zinc-200 pr-2">
                {toast.message}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-0.5 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
