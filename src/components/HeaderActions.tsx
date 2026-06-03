'use client';

import React from 'react';
import { Moon, Sun, DatabaseBackup, Info, Plus, Menu } from 'lucide-react';
import { useStore } from '@/lib/store';
import { usePathname } from 'next/navigation';

interface HeaderActionsProps {
  dbMode: 'Sheets' | 'Local';
}

export default function HeaderActions({ dbMode }: HeaderActionsProps) {
  const theme = useStore((state) => state.theme);
  const toggleTheme = useStore((state) => state.toggleTheme);
  const toggleCommandPalette = useStore((state) => state.toggleCommandPalette);
  const setSidebarMobileOpen = useStore((state) => state.setSidebarMobileOpen);
  const pathname = usePathname();

  // Map pathnames to human readable page names
  const getPageTitle = () => {
    if (pathname === '/') return 'Dashboard';
    if (pathname === '/library') return 'Prompt Library';
    if (pathname.startsWith('/prompt/')) return 'Prompt Details';
    if (pathname === '/templates') return 'Templates Gallery';
    return 'PromptVault AI';
  };

  return (
    <div className="flex flex-col shrink-0 z-10">
      {/* DB Warning Banner if local */}
      {dbMode === 'Local' && (
        <div className="bg-[#4A6B53]/10 border-b border-[#4A6B53]/20 px-6 py-2.5 flex items-center justify-between text-xs text-[#3B5441] dark:text-amber-400">
          <div className="flex items-center gap-2">
            <DatabaseBackup className="w-4.5 h-4.5 text-[#4A6B53] dark:text-amber-500 shrink-0" />
            <span className="leading-relaxed">
              <strong>Running in Local Mode</strong>: Data is saved to <code className="bg-[#4A6B53]/15 px-1.5 py-0.5 rounded font-mono font-semibold">src/data/db.json</code>. Set up your Google Sheets credentials in <code className="bg-[#4A6B53]/15 px-1.5 py-0.5 rounded font-mono font-semibold">.env</code> to sync.
            </span>
          </div>
          <a 
            href="https://console.cloud.google.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hidden sm:inline-flex items-center gap-1 hover:underline text-[10px] uppercase font-bold tracking-wider text-[#4A6B53] dark:text-amber-500 shrink-0"
          >
            Google Cloud Console <Info className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Main Top Header */}
      <header className="h-16 px-6 md:px-8 border-b border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-white/40 dark:bg-[#151B17]/20 backdrop-blur-md flex items-center justify-between transition-colors duration-300">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarMobileOpen(true)}
            className="p-2 rounded-xl border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] text-[#5C6B60] dark:text-[#899D90] md:hidden hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] active:scale-95 transition-all"
            aria-label="Open sidebar"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>
          <h1 className="text-base font-display font-bold tracking-tight text-[#222E26] dark:text-[#F7F6F0]">
            {getPageTitle()}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Actions */}
          <button 
            onClick={toggleCommandPalette}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#4A6B53] hover:bg-[#3B5441] text-white dark:bg-[#6E9C7C] dark:hover:bg-[#4A6B53] dark:text-[#151B17] shadow-sm shadow-[#4A6B53]/10 active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Quick Actions
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] text-[#5C6B60] hover:text-[#222E26] dark:text-[#899D90] dark:hover:text-[#F7F6F0] hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] transition-all shadow-sm"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4.5 h-4.5 text-amber-500" />
            ) : (
              <Moon className="w-4.5 h-4.5 text-[#4A6B53]" />
            )}
          </button>
        </div>
      </header>
    </div>
  );
}
