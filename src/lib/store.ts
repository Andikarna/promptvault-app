import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface FilterState {
  // Search & Filters
  searchQuery: string;
  selectedCategory: string;
  selectedTags: string[];
  selectedAITool: string;
  onlyFavorites: boolean;
  showArchived: boolean;
  sortBy: 'updatedAt' | 'createdAt' | 'title';
  
  // UI States
  commandPaletteOpen: boolean;
  theme: 'light' | 'dark';
  toasts: Toast[];
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;

  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  toggleTag: (tag: string) => void;
  clearTags: () => void;
  setSelectedAITool: (tool: string) => void;
  setOnlyFavorites: (fav: boolean | ((prev: boolean) => boolean)) => void;
  setShowArchived: (archived: boolean | ((prev: boolean) => boolean)) => void;
  setSortBy: (sort: 'updatedAt' | 'createdAt' | 'title') => void;
  
  setCommandPaletteOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  toggleCommandPalette: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  resetFilters: () => void;
  
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarMobileOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  
  // Toast Actions
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useStore = create<FilterState>((set) => ({
  // Initial states
  searchQuery: '',
  selectedCategory: '',
  selectedTags: [],
  selectedAITool: '',
  onlyFavorites: false,
  showArchived: false,
  sortBy: 'updatedAt',
  commandPaletteOpen: false,
  theme: 'dark', // Dark mode by default for premium SaaS aesthetic
  toasts: [],
  sidebarCollapsed: false,
  sidebarMobileOpen: false,

  // Actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  toggleTag: (tag) => set((state) => {
    const exists = state.selectedTags.includes(tag);
    return {
      selectedTags: exists 
        ? state.selectedTags.filter((t) => t !== tag) 
        : [...state.selectedTags, tag]
    };
  }),
  clearTags: () => set({ selectedTags: [] }),
  setSelectedAITool: (tool) => set({ selectedAITool: tool }),
  setOnlyFavorites: (fav) => set((state) => ({ 
    onlyFavorites: typeof fav === 'function' ? fav(state.onlyFavorites) : fav 
  })),
  setShowArchived: (archived) => set((state) => ({ 
    showArchived: typeof archived === 'function' ? archived(state.showArchived) : archived 
  })),
  setSortBy: (sort) => set({ sortBy: sort }),
  
  setCommandPaletteOpen: (open) => set((state) => ({ 
    commandPaletteOpen: typeof open === 'function' ? open(state.commandPaletteOpen) : open 
  })),
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),
  toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
        localStorage.setItem('promptvault-theme', 'dark');
      } else {
        root.classList.remove('dark');
        localStorage.setItem('promptvault-theme', 'light');
      }
    }
    set({ theme });
  },
  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      if (nextTheme === 'dark') {
        root.classList.add('dark');
        localStorage.setItem('promptvault-theme', 'dark');
      } else {
        root.classList.remove('dark');
        localStorage.setItem('promptvault-theme', 'light');
      }
    }
    return { theme: nextTheme };
  }),
  
  resetFilters: () => set({
    searchQuery: '',
    selectedCategory: '',
    selectedTags: [],
    selectedAITool: '',
    onlyFavorites: false,
    showArchived: false,
    sortBy: 'updatedAt'
  }),

  // Toast actions
  addToast: (message, type = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, 3000);
  },

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id)
  })),
}));
