'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Database, Folder, Star, Bookmark, BarChart3, Settings,
  Command, Cloud, DatabaseBackup, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { useStore } from '@/lib/store';

interface SidebarProps {
  dbMode: 'Sheets' | 'Local';
}

export default function Sidebar({ dbMode }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    sidebarCollapsed,
    toggleSidebarCollapsed,
    sidebarMobileOpen,
    setSidebarMobileOpen,
    setOnlyFavorites,
    toggleCommandPalette
  } = useStore();

  // Close mobile sidebar on navigation
  useEffect(() => {
    setSidebarMobileOpen(false);
  }, [pathname, setSidebarMobileOpen]);

  const handleNavClick = (href: string, key?: string) => {
    setSidebarMobileOpen(false);
    
    if (key === 'favorites') {
      setOnlyFavorites(true);
      router.push('/library?favorites=true');
      return;
    }
    
    if (key === 'collections') {
      setOnlyFavorites(false);
      router.push('/library');
      return;
    }

    if (key === 'categories') {
      setOnlyFavorites(false);
      router.push('/library');
      return;
    }

    router.push(href);
  };

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Prompt Library', href: '/library', icon: Database },
    { label: 'Collections', href: '/library', key: 'collections', icon: Folder },
    { label: 'Favorites', href: '/library?favorites=true', key: 'favorites', icon: Star },
    { label: 'Categories', href: '/library', key: 'categories', icon: Bookmark },
    { label: 'Analytics', href: '/#analytics', icon: BarChart3 },
  ];

  // Helper to check if item is active
  const isActive = (item: typeof navItems[0]) => {
    const hasWindow = typeof window !== 'undefined';
    
    if (item.key === 'favorites') {
      if (hasWindow) {
        return pathname === '/library' && window.location.search.includes('favorites=true');
      }
      return false;
    }
    
    if (item.key === 'collections') {
      if (hasWindow) {
        return pathname === '/library' && window.location.search.includes('collection=');
      }
      return false;
    }
    
    if (item.key === 'categories') {
      if (hasWindow) {
        return pathname === '/library' && window.location.search.includes('category=');
      }
      return false;
    }

    if (item.href === '/') {
      return pathname === '/';
    }

    if (item.href === '/library') {
      if (hasWindow) {
        const search = window.location.search;
        const isFav = search.includes('favorites=true');
        const isCol = search.includes('collection=');
        const isCat = search.includes('category=');
        return pathname === '/library' && !isFav && !isCol && !isCat;
      }
      return pathname === '/library';
    }

    const isFav = hasWindow && window.location.search.includes('favorites=true');
    return pathname.startsWith(item.href) && !isFav;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#F7F6F0] dark:bg-[#151B17] text-[#222E26] dark:text-[#F7F6F0] transition-colors duration-300">
      {/* Brand Header */}
      <div className={`h-16 px-4 border-b border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-[#4A6B53] hover:bg-[#3B5441] dark:bg-[#6E9C7C] dark:hover:bg-[#4A6B53] flex items-center justify-center text-white dark:text-[#151B17] shadow-sm shadow-[#4A6B53]/20 transition-all duration-300">
            <Command className="w-4.5 h-4.5" />
          </div>
          {!sidebarCollapsed && (
            <div className="animate-fade-in">
              <span className="font-display font-bold tracking-tight text-sm text-[#222E26] dark:text-[#F7F6F0] block">PromptVault AI</span>
              <span className="text-[9px] text-[#5C6B60] dark:text-[#899D90] font-mono -mt-1 block">v1.0.0</span>
            </div>
          )}
        </Link>

        {/* Database Connection Status badge (only when not collapsed) */}
        {!sidebarCollapsed && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#DFDCD0] dark:border-[#2E3D33] bg-[#EDEBE0]/50 dark:bg-[#1D2620]/40 text-[9px] font-semibold font-mono text-[#5C6B60] dark:text-[#899D90]">
            {dbMode === 'Sheets' ? (
              <>
                <Cloud className="w-3 h-3 text-emerald-600 dark:text-emerald-500 animate-pulse" />
                <span className="text-emerald-600 dark:text-emerald-500">Synced</span>
              </>
            ) : (
              <>
                <DatabaseBackup className="w-3 h-3 text-[#4A6B53] dark:text-amber-500" />
                <span className="text-[#4A6B53] dark:text-amber-500">Local</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <button
              key={item.label}
              onClick={() => handleNavClick(item.href, item.key)}
              title={sidebarCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center py-3' : 'px-3 py-2.5'} rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
                active 
                  ? 'bg-[#4A6B53] text-white dark:bg-[#6E9C7C] dark:text-[#151B17] shadow-sm shadow-[#4A6B53]/10' 
                  : 'text-[#5C6B60] dark:text-[#899D90] hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] hover:text-[#222E26] dark:hover:text-[#F7F6F0]'
              }`}
            >
              <Icon className={`${sidebarCollapsed ? 'w-5 h-5' : 'w-4.5 h-4.5 mr-3'} shrink-0`} />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}

        {/* Settings / Actions Trigger */}
        <button
          onClick={toggleCommandPalette}
          title={sidebarCollapsed ? 'Actions Menu' : undefined}
          className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center py-3' : 'px-3 py-2.5'} rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 text-[#5C6B60] dark:text-[#899D90] hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] hover:text-[#222E26] dark:hover:text-[#F7F6F0]`}
        >
          <Settings className={`${sidebarCollapsed ? 'w-5 h-5' : 'w-4.5 h-4.5 mr-3'} shrink-0`} />
          {!sidebarCollapsed && <span>Actions Menu</span>}
        </button>
      </nav>

      {/* Mini sync icon when collapsed */}
      {sidebarCollapsed && (
        <div className="p-3 border-t border-[#DFDCD0]/65 dark:border-[#2E3D33]/65 flex justify-center">
          <div 
            className="p-1.5 rounded-lg bg-[#EDEBE0]/50 dark:bg-[#1D2620]/40 border border-[#DFDCD0] dark:border-[#2E3D33]"
            title={dbMode === 'Sheets' ? "Google Sheets Synced" : "Local Backup Mode"}
          >
            {dbMode === 'Sheets' ? (
              <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
            ) : (
              <DatabaseBackup className="w-4 h-4 text-[#4A6B53] dark:text-amber-500" />
            )}
          </div>
        </div>
      )}

      {/* Command palette hint (only when expanded) */}
      {!sidebarCollapsed && (
        <div className="p-4 border-t border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-[#EDEBE0]/20 dark:bg-[#1D2620]/10">
          <div className="px-3 py-2 rounded-xl bg-white dark:bg-[#1D2620]/40 border border-[#DFDCD0]/80 dark:border-[#2E3D33]/80 flex items-center justify-between text-[11px] text-[#5C6B60] dark:text-[#899D90]">
            <span className="flex items-center gap-1.5 font-medium"><Command className="w-3.5 h-3.5" /> Actions</span>
            <div className="flex items-center gap-1 scale-90">
              <kbd className="px-1.5 py-0.5 rounded bg-[#F7F6F0] dark:bg-[#151B17] border border-[#DFDCD0] dark:border-[#2E3D33] text-[9px] font-mono shadow-sm">Ctrl</kbd>
              <span className="text-[9px] font-mono">+</span>
              <kbd className="px-1.5 py-0.5 rounded bg-[#F7F6F0] dark:bg-[#151B17] border border-[#DFDCD0] dark:border-[#2E3D33] text-[9px] font-mono shadow-sm">K</kbd>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Collapse Toggle Footer */}
      <div className="hidden md:flex p-3 border-t border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 justify-end">
        <button
          onClick={toggleSidebarCollapsed}
          className="p-1.5 rounded-lg hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] text-[#5C6B60] dark:text-[#899D90] transition-colors"
          title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Persistent Flex Column) */}
      <aside 
        className={`hidden md:flex flex-col h-screen sticky top-0 shrink-0 border-r border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 transition-all duration-300 ease-in-out z-20 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay Drawer */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${
          sidebarMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarMobileOpen(false)}
      >
        <div 
          className={`w-64 h-full relative transition-transform duration-300 ease-out ${
            sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => setSidebarMobileOpen(false)}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white dark:bg-[#1D2620] border border-[#DFDCD0] dark:border-[#2E3D33] text-[#5C6B60] dark:text-[#899D90] z-50 hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
