'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Search, Command, FileText, Sparkles, Star, Moon, Sun, 
  CornerDownLeft, X, LayoutDashboard, Database
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { Prompt } from '@/lib/types';

interface ActionItem {
  id: string;
  type: 'action' | 'prompt';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  perform: () => void;
}

export default function CommandPalette() {
  const router = useRouter();
  const isOpen = useStore((state) => state.commandPaletteOpen);
  const setIsOpen = useStore((state) => state.setCommandPaletteOpen);
  const toggleTheme = useStore((state) => state.toggleTheme);
  const setOnlyFavorites = useStore((state) => state.setOnlyFavorites);
  const theme = useStore((state) => state.theme);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch prompts for search
  const { data: dbData } = useQuery({
    queryKey: ['dbData'],
    queryFn: async () => {
      const res = await fetch('/api/prompts');
      if (!res.ok) throw new Error('Error loading database');
      return res.json();
    },
    enabled: isOpen, // Only query when palette is open
  });

  const prompts: Prompt[] = dbData?.prompts || [];

  // Toggle keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Reset query and focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Command Menu Items
  const quickActions: ActionItem[] = [
    {
      id: 'nav-dashboard',
      type: 'action',
      title: 'Go to Dashboard',
      subtitle: 'View statistics and activity',
      icon: <LayoutDashboard className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      perform: () => { router.push('/'); setIsOpen(false); }
    },
    {
      id: 'nav-library',
      type: 'action',
      title: 'Go to Prompt Library',
      subtitle: 'View and search all prompts',
      icon: <Database className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      perform: () => { router.push('/library'); setIsOpen(false); }
    },
    {
      id: 'nav-templates',
      type: 'action',
      title: 'Go to Prompt Templates',
      subtitle: 'Browse and duplicate templates',
      icon: <Sparkles className="w-4 h-4 text-amber-500" />,
      perform: () => { router.push('/templates'); setIsOpen(false); }
    },
    {
      id: 'action-favorites',
      type: 'action',
      title: 'View Favorite Prompts',
      subtitle: 'Filter library by starred prompts',
      icon: <Star className="w-4 h-4 text-amber-500 fill-amber-500/20" />,
      perform: () => { setOnlyFavorites(true); router.push('/library'); setIsOpen(false); }
    },
    {
      id: 'action-theme',
      type: 'action',
      title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      subtitle: `Toggle visual appearance to ${theme === 'dark' ? 'light' : 'dark'} theme`,
      icon: theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-amber-600" />,
      perform: () => { toggleTheme(); }
    }
  ];

  // Filter items based on query
  const filteredPrompts = prompts
    .filter(p => p.title.toLowerCase().includes(query.toLowerCase()) || 
                 p.description.toLowerCase().includes(query.toLowerCase()) ||
                 p.category.toLowerCase().includes(query.toLowerCase()))
    .map(p => ({
      id: `prompt-${p.id}`,
      type: 'prompt' as const,
      title: p.title,
      subtitle: `${p.category} • ${p.aiTool}`,
      icon: <FileText className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
      perform: () => { router.push(`/prompt/${p.id}`); setIsOpen(false); }
    }));

  const allItems = [...filteredPrompts, ...quickActions].filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) || 
    (item.subtitle && item.subtitle.toLowerCase().includes(query.toLowerCase()))
  );

  // Handle arrow keys navigation
  useEffect(() => {
    const handleNavigation = (e: KeyboardEvent) => {
      if (!isOpen || allItems.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % allItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        allItems[selectedIndex]?.perform();
      }
    };

    window.addEventListener('keydown', handleNavigation);
    return () => window.removeEventListener('keydown', handleNavigation);
  }, [isOpen, selectedIndex, allItems]);

  // Adjust selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ scale: 0.95, y: -20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: -20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-2xl overflow-hidden rounded-xl border border-[#DFDCD0] dark:border-[#2E3D33] shadow-2xl glass-panel"
            ref={containerRef}
          >
            {/* Input Bar */}
            <div className="flex items-center px-4 py-3 border-b border-[#DFDCD0]/60 dark:border-[#2E3D33]/60">
              <Search className="w-5 h-5 mr-3 text-[#5C6B60] dark:text-[#899D90]" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search prompts or type a command..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-8 bg-transparent border-0 outline-none text-[#222E26] dark:text-[#F7F6F0] placeholder-[#5C6B60]/50 dark:placeholder-[#899D90]/50 focus:ring-0 text-sm"
              />
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#EDEBE0] dark:bg-[#352D26]/60 border border-[#DFDCD0] dark:border-[#2E3D33]/60">
                <span className="text-[10px] font-semibold text-[#5C6B60] dark:text-[#899D90]">ESC</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 ml-2 rounded-lg hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] text-[#5C6B60] hover:text-[#222E26] dark:text-[#899D90] dark:hover:text-[#F7F6F0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List Results */}
            <div className="max-h-[350px] overflow-y-auto py-2">
              {allItems.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm text-[#5C6B60] dark:text-[#899D90]">No results found for &ldquo;{query}&rdquo;</p>
                </div>
              ) : (
                <>
                  {/* Category Groups */}
                  {allItems.some(i => i.type === 'prompt') && (
                    <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-[#5C6B60]/70 dark:text-[#899D90]/70 uppercase">
                      Matching Prompts
                    </div>
                  )}

                  {allItems.map((item, index) => {
                    const isSelected = index === selectedIndex;
                    const isPrompt = item.type === 'prompt';
                    
                    // Show actions heading if it's the first action item in list
                    const showActionsHeading = !isPrompt && (index === 0 || allItems[index - 1]?.type === 'prompt');

                    return (
                      <React.Fragment key={item.id}>
                        {showActionsHeading && (
                          <div className="px-3 py-1.5 mt-2 text-[10px] font-bold tracking-wider text-[#5C6B60]/70 dark:text-[#899D90]/70 uppercase border-t border-[#DFDCD0]/40 dark:border-[#2E3D33]/40">
                            Quick Actions
                          </div>
                        )}
                        <div
                          className={`flex items-center justify-between px-4 py-2.5 mx-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-[#4A6B53] text-white dark:bg-[#6E9C7C] dark:text-[#151B17]' 
                              : 'hover:bg-[#EDEBE0] dark:hover:bg-[#352D26]/50 text-[#222E26] dark:text-[#F7F6F0]'
                          }`}
                          onClick={item.perform}
                          onMouseEnter={() => setSelectedIndex(index)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={isSelected ? 'text-white' : ''}>
                              {item.icon}
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium truncate">{item.title}</span>
                              {item.subtitle && (
                                <span className={`text-xs truncate ${isSelected ? 'text-white/80 dark:text-[#151B17]/80' : 'text-[#5C6B60] dark:text-[#899D90]'}`}>
                                  {item.subtitle}
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="flex items-center gap-1 text-[10px] text-white/80 dark:text-[#151B17]/80">
                              <span>Select</span>
                              <CornerDownLeft className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer Status */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-[#F7F6F0]/50 dark:bg-[#151B17]/30 text-[11px] text-[#5C6B60] dark:text-[#899D90]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><Command className="w-3 h-3" /> + K to close</span>
                <span className="hidden sm:inline">↑↓ to navigate</span>
                <span className="hidden sm:inline">↵ to select</span>
              </div>
              <div className="flex items-center gap-1 font-semibold text-[#4A6B53]/80 dark:text-[#6E9C7C]/80">
                <Database className="w-3.5 h-3.5 mr-0.5" /> PromptVault AI
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
