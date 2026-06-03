'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Folder, Plus, Trash2, Copy, Archive, Star, 
  Filter, ArrowUpDown, Check, X, FolderOpen, FolderPlus, 
  PlusCircle, Bookmark, AlertTriangle, Eye, Database
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { Prompt, Category, Collection } from '@/lib/types';
import { 
  createPromptAction, deletePromptAction, toggleFavoriteAction, 
  archivePromptAction, duplicatePromptAction, createCategoryAction, 
  deleteCategoryAction, createCollectionAction, deleteCollectionAction, 
  updateCollectionAction
} from '@/app/actions';

interface LibraryWorkspaceProps {
  initialData: {
    prompts: Prompt[];
    categories: Category[];
    collections: Collection[];
  };
}

// Zod Validation Schemas
const promptFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(250),
  prompt: z.string().min(1, 'Prompt content is required'),
  category: z.string().min(1, 'Category is required'),
  tagsInput: z.string(),
  aiTool: z.string().min(1, 'AI Tool is required'),
  language: z.string().min(1, 'Language is required'),
  favorite: z.boolean(),
  archived: z.boolean(),
});

const categoryFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  slug: z.string().min(1, 'Slug is required').max(50),
  description: z.string().max(150),
});

const collectionFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  description: z.string().max(200),
});

export default function LibraryWorkspace({ initialData }: LibraryWorkspaceProps) {
  const queryClient = useQueryClient();
  const addToast = useStore((state) => state.addToast);
  
  // Connect to Zustand Search & Filters
  const {
    searchQuery, setSearchQuery,
    selectedCategory, setSelectedCategory,
    selectedTags, toggleTag,
    selectedAITool, setSelectedAITool,
    onlyFavorites, setOnlyFavorites,
    showArchived, setShowArchived,
    sortBy, setSortBy,
    resetFilters
  } = useStore();

  // Local UI States
  const [activeCollectionId, setActiveCollectionId] = useState<string>('');
  const [createPromptOpen, setCreatePromptOpen] = useState(false);
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  const [createCollectionOpen, setCreateCollectionOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Synchronize state with URL search parameters
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const fav = params.get('favorites');
      const cat = params.get('category');
      const col = params.get('collection');
      
      if (fav === 'true') {
        setOnlyFavorites(true);
      } else {
        setOnlyFavorites(false);
      }
      if (cat) {
        setSelectedCategory(cat);
      }
      if (col) {
        setActiveCollectionId(col);
      }
    }
  }, [setOnlyFavorites, setSelectedCategory, setActiveCollectionId]);
  
  // React Query for live state syncing
  const { data: dbData, refetch } = useQuery({
    queryKey: ['dbData'],
    queryFn: async () => {
      const res = await fetch('/api/prompts');
      if (!res.ok) throw new Error('Failed to load database');
      return res.json();
    },
    initialData: { success: true, ...initialData },
  });

  const prompts: Prompt[] = dbData?.prompts || [];
  const categories: Category[] = dbData?.categories || [];
  const collections: Collection[] = dbData?.collections || [];

  // React Hook Forms
  const { register: registerPrompt, handleSubmit: handleSubmitPrompt, reset: resetPrompt, formState: { errors: promptErrors } } = useForm<z.infer<typeof promptFormSchema>>({
    resolver: zodResolver(promptFormSchema),
    defaultValues: {
      title: '',
      description: '',
      prompt: '',
      category: '',
      tagsInput: '',
      favorite: false,
      archived: false,
      aiTool: 'ChatGPT 4o',
      language: 'English',
    }
  });

  const { register: registerCategory, handleSubmit: handleSubmitCategory, reset: resetCategory, formState: { errors: categoryErrors } } = useForm<z.infer<typeof categoryFormSchema>>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
    }
  });

  const { register: registerCollection, handleSubmit: handleSubmitCollection, reset: resetCollection, formState: { errors: collectionErrors } } = useForm<z.infer<typeof collectionFormSchema>>({
    resolver: zodResolver(collectionFormSchema),
    defaultValues: {
      name: '',
      description: '',
    }
  });

  // Unique AI Tools in DB for dropdown
  const aiToolsList = Array.from(new Set(prompts.map(p => p.aiTool).filter(Boolean)));

  // Copy Handler with Confetti
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Prompt copied successfully', 'success');
    import('canvas-confetti').then((confetti) => {
      confetti.default({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.85 }
      });
    });
  };

  // Mutators wrapped in Next.js Server Actions
  const handleCreatePromptSubmit = async (data: z.infer<typeof promptFormSchema>) => {
    const tags = data.tagsInput
      ? data.tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    const result = await createPromptAction({
      title: data.title,
      description: data.description || '',
      prompt: data.prompt,
      category: data.category,
      tags,
      aiTool: data.aiTool,
      language: data.language,
      favorite: data.favorite,
      archived: data.archived,
    });

    if (result.success && result.data) {
      addToast('Prompt created successfully!', 'success');
      
      // If a collection is selected, associate this prompt with it
      if (activeCollectionId) {
        const col = collections.find(c => c.id === activeCollectionId);
        if (col) {
          await updateCollectionAction(col.id, {
            promptIds: [...col.promptIds, result.data.id]
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['dbData'] });
      refetch();
      setCreatePromptOpen(false);
      resetPrompt();
    } else {
      addToast(result.error || 'Failed to create prompt', 'error');
    }
  };

  const handleCreateCategorySubmit = async (data: z.infer<typeof categoryFormSchema>) => {
    const result = await createCategoryAction(data);
    if (result.success) {
      addToast('Category created successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['dbData'] });
      refetch();
      resetCategory();
    } else {
      addToast(result.error || 'Failed to create category', 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const result = await deleteCategoryAction(id);
    if (result.success) {
      addToast('Category deleted successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['dbData'] });
      refetch();
    } else {
      addToast('Failed to delete category', 'error');
    }
  };

  const handleCreateCollectionSubmit = async (data: z.infer<typeof collectionFormSchema>) => {
    const result = await createCollectionAction({
      name: data.name,
      description: data.description || '',
      promptIds: []
    });
    if (result.success) {
      addToast('Collection created successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['dbData'] });
      refetch();
      setCreateCollectionOpen(false);
      resetCollection();
    } else {
      addToast(result.error || 'Failed to create collection', 'error');
    }
  };

  const handleDeleteCollection = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop navigation click
    e.preventDefault();
    
    if (confirm(`Are you sure you want to delete this collection? Prompts inside will not be deleted.`)) {
      const result = await deleteCollectionAction(id);
      if (result.success) {
        addToast('Collection deleted successfully!', 'success');
        if (activeCollectionId === id) {
          setActiveCollectionId('');
        }
        queryClient.invalidateQueries({ queryKey: ['dbData'] });
        refetch();
      } else {
        addToast('Failed to delete collection', 'error');
      }
    }
  };

  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const result = await toggleFavoriteAction(id);
    if (result.success) {
      addToast(result.favorite ? 'Prompt marked as favorite!' : 'Removed from favorites', 'success');
      queryClient.invalidateQueries({ queryKey: ['dbData'] });
      refetch();
    }
  };

  const handleToggleArchive = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const result = await archivePromptAction(id);
    if (result.success) {
      addToast(result.archived ? 'Prompt archived successfully!' : 'Prompt restored from archive', 'success');
      queryClient.invalidateQueries({ queryKey: ['dbData'] });
      refetch();
    }
  };

  const handleDuplicatePrompt = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const result = await duplicatePromptAction(id);
    if (result.success && result.data) {
      addToast('Prompt duplicated successfully!', 'success');
      
      // If collection is active, append duplicate to that collection
      if (activeCollectionId) {
        const col = collections.find(c => c.id === activeCollectionId);
        if (col) {
          await updateCollectionAction(col.id, {
            promptIds: [...col.promptIds, result.data.id]
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['dbData'] });
      refetch();
    } else {
      addToast('Failed to duplicate prompt', 'error');
    }
  };

  const handleDeletePrompt = async (id: string) => {
    const result = await deletePromptAction(id);
    if (result.success) {
      addToast('Prompt deleted successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['dbData'] });
      refetch();
      setConfirmDeleteId(null);
    } else {
      addToast('Failed to delete prompt', 'error');
    }
  };

  // Add Prompt to Collection (via dropdown menu selection)
  const handleAddToCollection = async (promptId: string, collectionId: string) => {
    const col = collections.find(c => c.id === collectionId);
    if (col) {
      if (col.promptIds.includes(promptId)) {
        // Already exists, remove it (toggle off)
        const updatedIds = col.promptIds.filter(id => id !== promptId);
        await updateCollectionAction(collectionId, { promptIds: updatedIds });
        addToast(`Prompt removed from collection "${col.name}"`, 'success');
      } else {
        // Add it
        const updatedIds = [...col.promptIds, promptId];
        await updateCollectionAction(collectionId, { promptIds: updatedIds });
        addToast(`Prompt added to collection "${col.name}"`, 'success');
      }
      queryClient.invalidateQueries({ queryKey: ['dbData'] });
      refetch();
    }
  };

  // CLIENT-SIDE SEARCH & FILTER PIPELINE
  const filteredPrompts = prompts
    .filter((p) => {
      // 1. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesDesc = p.description.toLowerCase().includes(q);
        const matchesPrompt = p.prompt.toLowerCase().includes(q);
        const matchesCat = p.category.toLowerCase().includes(q);
        const matchesTags = p.tags.some(tag => tag.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesPrompt && !matchesCat && !matchesTags) {
          return false;
        }
      }

      // 2. Category Filter
      if (selectedCategory && p.category !== selectedCategory) {
        return false;
      }

      // 3. Tags Filter (Prompt must match ALL selected tags)
      if (selectedTags.length > 0) {
        const matchesAllTags = selectedTags.every(tag => p.tags.includes(tag));
        if (!matchesAllTags) return false;
      }

      // 4. AI Tool Filter
      if (selectedAITool && p.aiTool !== selectedAITool) {
        return false;
      }

      // 5. Favorites Filter
      if (onlyFavorites && !p.favorite) {
        return false;
      }

      // 6. Archived Filter
      if (p.archived !== showArchived) {
        return false;
      }

      // 7. Collection Filter (if folders/collections selected)
      if (activeCollectionId) {
        const currentCollection = collections.find(c => c.id === activeCollectionId);
        if (!currentCollection || !currentCollection.promptIds.includes(p.id)) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      // Sort functions
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'createdAt') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      // Default: updatedAt descending
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      
      {/* Workspace Sidebar (Collections Folder list) */}
      <aside className="w-full lg:w-60 shrink-0 space-y-6">
        
        {/* Collections Pane */}
        <div className="p-4 rounded-xl border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-white dark:bg-[#1D2620]/40 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-[#4A6B53] dark:text-amber-500" />
              Collections
            </h3>
            <button
              onClick={() => setCreateCollectionOpen(true)}
              className="p-1 rounded-lg hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] text-[#4A6B53] hover:text-[#3B5441] transition-colors"
              title="New Collection"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setActiveCollectionId('')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-all ${
                activeCollectionId === ''
                  ? 'bg-[#4A6B53] text-white dark:bg-[#6E9C7C] dark:text-[#151B17]'
                  : 'hover:bg-[#EDEBE0]/50 dark:hover:bg-[#352D26]/50 text-[#5C6B60] dark:text-[#899D90]'
              }`}
            >
              <span className="flex items-center gap-2">📁 All Prompts</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${activeCollectionId === '' ? 'bg-[#3B5441]/80 dark:bg-[#4A6B53]/40 text-white dark:text-[#151B17]' : 'bg-[#EDEBE0] dark:bg-[#352D26] text-[#5C6B60]'}`}>{prompts.length}</span>
            </button>

            {collections.map(col => (
              <button
                key={col.id}
                onClick={() => setActiveCollectionId(col.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-all group ${
                  activeCollectionId === col.id
                    ? 'bg-[#4A6B53] text-white dark:bg-[#6E9C7C] dark:text-[#151B17]'
                    : 'hover:bg-[#EDEBE0]/50 dark:hover:bg-[#352D26]/50 text-[#5C6B60] dark:text-[#899D90]'
                }`}
              >
                <span className="flex items-center gap-2 truncate" title={col.name}>
                  📁 {col.name}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${activeCollectionId === col.id ? 'bg-[#3B5441]/80 dark:bg-[#4A6B53]/40 text-white dark:text-[#151B17]' : 'bg-[#EDEBE0] dark:bg-[#352D26] text-[#5C6B60]'}`}>
                    {col.promptIds.length}
                  </span>
                  <span 
                    onClick={(e) => handleDeleteCollection(col.id, e)}
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 text-rose-500 transition-opacity"
                    title="Delete collection"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            ))}

            {collections.length === 0 && (
              <div className="text-[10px] text-center text-zinc-400 py-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                No custom folders.
              </div>
            )}
          </div>
        </div>

        {/* Categories Manager Button */}
        <div className="p-4 rounded-xl border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-white dark:bg-[#1D2620]/40 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider flex items-center gap-1.5">
              <Bookmark className="w-4 h-4 text-amber-600 dark:text-amber-500" />
              Categories
            </h3>
          </div>
          <p className="text-[10px] text-[#5C6B60] dark:text-[#899D90] mb-3 leading-relaxed">
            Manage tags like Programming, Android, Flutter, UI/UX, etc.
          </p>
          <button
            onClick={() => setManageCategoriesOpen(true)}
            className="w-full py-2 px-3 border border-[#DFDCD0] dark:border-[#2E3D33] hover:border-[#4A6B53]/40 dark:hover:border-[#6E9C7C]/40 hover:bg-[#EDEBE0]/50 dark:hover:bg-[#352D26]/50 rounded-xl text-xs font-bold text-[#5C6B60] dark:text-[#899D90] hover:text-[#222E26] dark:hover:text-[#F7F6F0] transition-colors flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#4A6B53] dark:text-amber-500" /> Configure Categories
          </button>
        </div>

      </aside>

      {/* Main Workspace Pane */}
      <div className="flex-1 w-full space-y-6">
        
        {/* Multi-Filter Toolbar */}
        <div className="p-4 rounded-xl border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-white dark:bg-[#1D2620] shadow-sm space-y-4">
          
          {/* Top row: Search input, Sort select, Add Button */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#5C6B60] dark:text-[#899D90] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search prompts by title, content, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[#DFDCD0] dark:border-[#2E3D33] rounded-xl bg-[#F7F6F0]/50 dark:bg-[#151B17]/20 text-sm focus:ring-2 focus:ring-[#4A6B53] text-[#222E26] dark:text-[#F7F6F0] placeholder-[#5C6B60]/60 dark:placeholder-[#899D90]/50 transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded absolute right-2 top-1/2 -translate-y-1/2 text-[#5C6B60] hover:text-[#222E26]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Sort Selector */}
              <div className="flex items-center gap-1.5 border border-[#DFDCD0] dark:border-[#2E3D33] bg-[#F7F6F0]/50 dark:bg-[#151B17]/20 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#5C6B60] dark:text-[#899D90]">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#5C6B60]" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'updatedAt' | 'createdAt' | 'title')}
                  className="bg-transparent border-none outline-none cursor-pointer pr-1 text-[#222E26] dark:text-[#F7F6F0]"
                >
                  <option value="updatedAt" className="bg-[#F7F6F0] dark:bg-[#1D2620]">Recently Updated</option>
                  <option value="createdAt" className="bg-[#F7F6F0] dark:bg-[#1D2620]">Date Created</option>
                  <option value="title" className="bg-[#F7F6F0] dark:bg-[#1D2620]">Alphabetical (A-Z)</option>
                </select>
              </div>

              {/* Add Prompt Button */}
              <button
                onClick={() => setCreatePromptOpen(true)}
                className="flex items-center gap-1.5 py-2 px-4 bg-[#4A6B53] hover:bg-[#3B5441] text-white dark:bg-[#6E9C7C] dark:hover:bg-[#4A6B53] dark:text-[#151B17] rounded-xl text-xs font-bold shadow-sm shadow-[#4A6B53]/10 active:scale-98 transition-all"
              >
                <Plus className="w-4 h-4" /> Create Prompt
              </button>
            </div>
          </div>

          {/* Bottom row: Filter Chips & Toggles */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 text-xs">
            <span className="text-[10px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider mr-1 flex items-center gap-1"><Filter className="w-3 h-3" /> Filters:</span>

            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-full border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] text-xs font-semibold text-[#5C6B60] dark:text-[#899D90] cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>

            {/* AI Tool Select */}
            <select
              value={selectedAITool}
              onChange={(e) => setSelectedAITool(e.target.value)}
              className="px-2.5 py-1.5 rounded-full border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] text-xs font-semibold text-[#5C6B60] dark:text-[#899D90] cursor-pointer"
            >
              <option value="">All AI Tools</option>
              {aiToolsList.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Favorites Toggle */}
            <button
              onClick={() => setOnlyFavorites(prev => !prev)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1 transition-all ${
                onlyFavorites
                  ? 'border-[#4A6B53]/35 bg-[#4A6B53]/10 text-[#4A6B53] dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-500'
                  : 'border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] text-[#5C6B60] dark:text-[#899D90]'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-current' : ''}`} /> Favorites
            </button>

            {/* Archive Toggle */}
            <button
              onClick={() => setShowArchived(prev => !prev)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1 transition-all ${
                showArchived
                  ? 'border-[#4A6B53]/35 bg-[#4A6B53]/10 text-[#4A6B53] dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-500'
                  : 'border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] text-[#5C6B60] dark:text-[#899D90]'
              }`}
            >
              <Archive className="w-3.5 h-3.5" /> Archived
            </button>

            {/* Reset Filters button */}
            {(selectedCategory || selectedAITool || onlyFavorites || showArchived || searchQuery || selectedTags.length > 0 || activeCollectionId) && (
              <button
                onClick={() => { resetFilters(); setActiveCollectionId(''); }}
                className="text-[11px] font-bold text-[#4A6B53] dark:text-amber-500 hover:underline ml-auto flex items-center gap-0.5 shrink-0"
              >
                Clear all filters <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Active Tags list */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 text-xs animate-fade-in">
              <span className="text-[10px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider mr-1">Active Tags:</span>
              {selectedTags.map(tag => (
                <span
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="px-2 py-0.5 rounded-full bg-[#EDEBE0] dark:bg-[#2E3D33] border border-[#DFDCD0] dark:border-[#2E3D33] text-[#222E26] dark:text-[#F7F6F0] font-semibold cursor-pointer hover:bg-rose-500/20 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center gap-1"
                >
                  #{tag} <X className="w-3 h-3" />
                </span>
              ))}
            </div>
          )}

        </div>

        {/* Selected Collection Folder Banner */}
        {activeCollectionId && (
          <div className="px-5 py-3 border border-[#4A6B53]/20 bg-[#4A6B53]/5 dark:border-amber-500/20 dark:bg-amber-500/5 rounded-xl flex items-center justify-between text-xs text-[#4A6B53] dark:text-amber-400 animate-fade-in">
            <span className="font-semibold flex items-center gap-2">
              <Folder className="w-4.5 h-4.5" /> Showing prompts inside collection: &ldquo;{collections.find(c => c.id === activeCollectionId)?.name}&rdquo;
            </span>
            <button 
              onClick={() => setActiveCollectionId('')} 
              className="p-1 rounded-full hover:bg-[#4A6B53]/10 dark:hover:bg-amber-500/10 text-[#4A6B53] dark:text-amber-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Prompt Workspace Grid */}
        {filteredPrompts.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-[#DFDCD0] dark:border-[#2E3D33] rounded-xl bg-white dark:bg-[#1D2620]/10 flex flex-col items-center justify-center p-6 animate-fade-in">
            <Database className="w-10 h-10 text-[#DFDCD0] dark:text-[#2E3D33] mb-3" />
            <h4 className="text-sm font-display font-bold text-[#222E26] dark:text-[#F7F6F0]">No prompts found</h4>
            <p className="text-xs text-[#5C6B60] dark:text-[#899D90] mt-1 max-w-sm leading-relaxed">
              Try adjusting your search criteria, clearing active filters, or creating a new prompt to populate this workspace.
            </p>
            {(selectedCategory || selectedAITool || onlyFavorites || showArchived || searchQuery || selectedTags.length > 0 || activeCollectionId) && (
              <button
                onClick={() => { resetFilters(); setActiveCollectionId(''); }}
                className="mt-4 px-4 py-2 border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] rounded-xl text-xs font-semibold text-[#5C6B60] dark:text-[#899D90] transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <AnimatePresence mode="popLayout">
              {filteredPrompts.map(p => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  key={p.id}
                  className="rounded-xl border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-white dark:bg-[#1D2620] shadow-sm hover:shadow-md hover:border-[#4A6B53]/40 dark:hover:border-[#6E9C7C]/40 flex flex-col justify-between group overflow-hidden relative transition-all duration-300"
                >
                  {/* Glass Card Header */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#5C6B60] dark:text-[#899D90]">
                        <span className="font-semibold text-[#5C6B60] dark:text-[#899D90] bg-[#EDEBE0] dark:bg-[#2E3D33] px-1.5 py-0.5 rounded">{p.category || 'Uncategorized'}</span>
                        <span>•</span>
                        <span>{p.language}</span>
                      </div>
                      
                      <div className="flex items-center gap-0.5">
                        {/* Collection addition dropdown */}
                        <div className="relative group/folder">
                          <button
                            className="p-1.5 rounded-lg hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] text-[#5C6B60] dark:text-[#899D90] hover:text-[#222E26] dark:hover:text-[#F7F6F0] transition-colors"
                            title="Add to Collection"
                          >
                            <Folder className="w-3.5 h-3.5" />
                          </button>
                          <div className="absolute right-0 top-6 hidden group-hover/folder:block w-48 rounded-xl border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] shadow-xl py-1 z-20 text-[11px] text-[#222E26] dark:text-[#F7F6F0]">
                            <div className="px-2.5 py-1.5 text-[10px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase border-b border-[#DFDCD0] dark:border-[#2E3D33]">Toggle Collection</div>
                            {collections.map(col => {
                              const isIncluded = col.promptIds.includes(p.id);
                              return (
                                <button
                                  key={col.id}
                                  onClick={() => handleAddToCollection(p.id, col.id)}
                                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#EDEBE0]/50 dark:hover:bg-[#352D26]/50 flex items-center justify-between transition-colors"
                                >
                                  <span>{col.name}</span>
                                  {isIncluded && <Check className="w-3.5 h-3.5 text-[#4A6B53] dark:text-[#6E9C7C]" />}
                                </button>
                              );
                            })}
                            {collections.length === 0 && (
                              <div className="px-2.5 py-2 text-center text-[#5C6B60] text-[10px]">Create a collection first</div>
                            )}
                          </div>
                        </div>

                        {/* Favorite Button */}
                        <button
                          onClick={(e) => handleToggleFavorite(p.id, e)}
                          className="p-1.5 rounded-lg hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] text-[#5C6B60] dark:text-[#899D90] hover:text-[#4A6B53] dark:hover:text-amber-500 transition-colors"
                          title="Star prompt"
                        >
                          <Star className={`w-3.5 h-3.5 ${p.favorite ? 'text-[#4A6B53] fill-[#4A6B53] dark:text-[#6E9C7C] dark:fill-[#6E9C7C]' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Link 
                        href={`/prompt/${p.id}`}
                        className="text-sm font-display font-bold text-[#222E26] dark:text-[#F7F6F0] hover:text-[#4A6B53] dark:hover:text-[#6E9C7C] transition-colors block line-clamp-1"
                      >
                        {p.title}
                      </Link>
                      <p className="text-[11px] text-[#5C6B60] dark:text-[#899D90] line-clamp-2 leading-relaxed">
                        {p.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Tag list */}
                    {p.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.tags.map(tag => (
                          <span
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full cursor-pointer transition-all border ${
                              selectedTags.includes(tag)
                                ? 'bg-[#4A6B53] border-[#4A6B53] text-white dark:bg-[#6E9C7C] dark:border-[#6E9C7C] dark:text-[#151B17]'
                                : 'bg-[#EDEBE0] border-[#DFDCD0] dark:bg-[#2E3D33] dark:border-[#2E3D33] hover:bg-[#DFDCD0] dark:hover:bg-[#483A2E] text-[#5C6B60] dark:text-[#899D90] hover:text-[#222E26] dark:hover:text-[#F7F6F0]'
                            }`}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Actions Panel */}
                  <div className="px-5 py-3.5 border-t border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-[#F7F6F0]/50 dark:bg-[#151B17]/20 flex items-center justify-between text-xs">
                    <span className="text-[10px] font-semibold text-[#5C6B60] dark:text-[#899D90] px-2 py-0.5 rounded-lg border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] shadow-sm">{p.aiTool}</span>
                    
                    <div className="flex items-center gap-1.5">
                      {/* Duplicate */}
                      <button
                        onClick={(e) => handleDuplicatePrompt(p.id, e)}
                        className="p-1.5 rounded-lg border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] text-[#5C6B60] hover:text-[#222E26] dark:text-[#899D90] dark:hover:text-[#F7F6F0] hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] transition-colors shadow-sm"
                        title="Duplicate prompt"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Archive */}
                      <button
                        onClick={(e) => handleToggleArchive(p.id, e)}
                        className={`p-1.5 rounded-lg border transition-all shadow-sm ${
                          p.archived 
                            ? 'border-[#4A6B53]/20 bg-[#4A6B53]/5 text-[#4A6B53] dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-500' 
                            : 'border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] text-[#5C6B60] dark:text-[#899D90] hover:bg-[#EDEBE0] dark:hover:bg-[#352D26]'
                        }`}
                        title={p.archived ? 'Restore prompt' : 'Archive prompt'}
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>

                      {/* View Details */}
                      <Link
                        href={`/prompt/${p.id}`}
                        className="p-1.5 rounded-lg border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] text-[#5C6B60] hover:text-[#222E26] dark:text-[#899D90] dark:hover:text-[#F7F6F0] hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] transition-colors shadow-sm"
                        title="View Full Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>

                      {/* Delete */}
                      <button
                        onClick={() => setConfirmDeleteId(p.id)}
                        className="p-1.5 rounded-lg border border-rose-200/60 dark:border-rose-950 bg-rose-50/20 dark:bg-rose-950/10 text-rose-600 hover:text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900 transition-colors shadow-sm"
                        title="Delete prompt"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* One Click Copy Main Accent Button */}
                      <button
                        onClick={() => handleCopy(p.prompt)}
                        className="flex items-center gap-1.5 py-1.5 px-3 bg-[#4A6B53] hover:bg-[#3B5441] text-white dark:bg-[#6E9C7C] dark:hover:bg-[#4A6B53] dark:text-[#151B17] rounded-xl text-[10px] font-bold shadow-sm shadow-[#4A6B53]/10 active:scale-95 transition-all"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* Absolute positioning alert overlay for confirm delete */}
                  {confirmDeleteId === p.id && (
                    <div className="absolute inset-0 bg-[#F7F6F0]/95 dark:bg-[#151B17]/95 flex flex-col items-center justify-center p-4 text-center z-10 animate-fade-in">
                      <AlertTriangle className="w-8 h-8 text-rose-500 mb-2 animate-bounce" />
                      <h4 className="text-xs font-display font-bold text-[#222E26] dark:text-[#F7F6F0]">Delete this prompt?</h4>
                      <p className="text-[10px] text-[#5C6B60] dark:text-[#899D90] max-w-xs mt-1 leading-relaxed">This action is permanent and will remove versions and collection links.</p>
                      <div className="flex items-center gap-2 mt-4">
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-1.5 rounded-xl bg-[#EDEBE0] hover:bg-[#DFDCD0] dark:bg-[#2E3D33] dark:hover:bg-[#483A2E] text-[#222E26] dark:text-[#F7F6F0] text-xs font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDeletePrompt(p.id)}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}

                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

      </div>

      {/* DIALOGS / MODALS */}

      {/* 1. Create Prompt Modal */}
      {createPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-[#1D2620] rounded-2xl border border-[#DFDCD0] dark:border-[#2E3D33] shadow-2xl overflow-hidden glass-panel max-h-[90vh] flex flex-col animate-fade-in">
            <div className="px-6 py-4 border-b border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 flex items-center justify-between">
              <h3 className="text-sm font-display font-bold text-[#222E26] dark:text-[#F7F6F0] flex items-center gap-2">
                <PlusCircle className="w-4.5 h-4.5 text-[#4A6B53] dark:text-amber-500" /> Create Prompt Template
              </h3>
              <button 
                onClick={() => { setCreatePromptOpen(false); resetPrompt(); }} 
                className="p-1.5 rounded-lg hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] text-[#5C6B60] dark:text-[#899D90] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitPrompt(handleCreatePromptSubmit)} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs text-[#222E26] dark:text-[#F7F6F0]">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider">Prompt Title</label>
                  <input
                    type="text"
                    placeholder="Jetpack Compose MVI Boilerplate"
                    {...registerPrompt('title')}
                    className="w-full p-2.5 border border-[#DFDCD0] dark:border-[#2E3D33] bg-[#F7F6F0]/50 dark:bg-[#151B17]/20 rounded-xl text-sm focus:ring-2 focus:ring-[#4A6B53]"
                  />
                  {promptErrors.title && <span className="text-[10px] text-rose-500 font-semibold">{promptErrors.title.message}</span>}
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider">Description</label>
                  <input
                    type="text"
                    placeholder="Short description of prompt use case..."
                    {...registerPrompt('description')}
                    className="w-full p-2.5 border border-[#DFDCD0] dark:border-[#2E3D33] bg-[#F7F6F0]/50 dark:bg-[#151B17]/20 rounded-xl text-sm focus:ring-2 focus:ring-[#4A6B53]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider">Category</label>
                  <select
                    {...registerPrompt('category')}
                    className="w-full p-2.5 border border-[#DFDCD0] dark:border-[#2E3D33] bg-[#F7F6F0]/50 dark:bg-[#151B17]/20 rounded-xl text-sm focus:ring-2 focus:ring-[#4A6B53] cursor-pointer"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  {promptErrors.category && <span className="text-[10px] text-rose-500 font-semibold">{promptErrors.category.message}</span>}
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider">Target AI Tool</label>
                  <input
                    type="text"
                    placeholder="ChatGPT 4o, Claude 3.5..."
                    {...registerPrompt('aiTool')}
                    className="w-full p-2.5 border border-[#DFDCD0] dark:border-[#2E3D33] bg-[#F7F6F0]/50 dark:bg-[#151B17]/20 rounded-xl text-sm focus:ring-2 focus:ring-[#4A6B53]"
                  />
                  {promptErrors.aiTool && <span className="text-[10px] text-rose-500 font-semibold">{promptErrors.aiTool.message}</span>}
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider">Language</label>
                  <input
                    type="text"
                    placeholder="English, Indonesian..."
                    {...registerPrompt('language')}
                    className="w-full p-2.5 border border-[#DFDCD0] dark:border-[#2E3D33] bg-[#F7F6F0]/50 dark:bg-[#151B17]/20 rounded-xl text-sm focus:ring-2 focus:ring-[#4A6B53]"
                  />
                  {promptErrors.language && <span className="text-[10px] text-rose-500 font-semibold">{promptErrors.language.message}</span>}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="kotlin, android, boilerplate, mvi"
                  {...registerPrompt('tagsInput')}
                  className="w-full p-2.5 border border-[#DFDCD0] dark:border-[#2E3D33] bg-[#F7F6F0]/50 dark:bg-[#151B17]/20 rounded-xl text-sm focus:ring-2 focus:ring-[#4A6B53]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider">Prompt Content</label>
                <textarea
                  placeholder="Enter the full structured prompt content here..."
                  rows={8}
                  {...registerPrompt('prompt')}
                  className="w-full p-3 border border-[#DFDCD0] dark:border-[#2E3D33] bg-[#F7F6F0]/50 dark:bg-[#151B17]/20 rounded-xl font-mono text-[11px] focus:ring-2 focus:ring-[#4A6B53]"
                />
                {promptErrors.prompt && <span className="text-[10px] text-rose-500 font-semibold">{promptErrors.prompt.message}</span>}
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" {...registerPrompt('favorite')} className="rounded border-[#DFDCD0] text-[#4A6B53] focus:ring-[#4A6B53]" />
                  <span className="font-semibold text-[#5C6B60] dark:text-[#899D90] flex items-center gap-1"><Star className="w-3.5 h-3.5 text-[#4A6B53] fill-[#4A6B53]/10" /> Mark as Favorite</span>
                </label>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#DFDCD0]/60 dark:border-[#2E3D33]/60">
                <button
                  type="button"
                  onClick={() => { setCreatePromptOpen(false); resetPrompt(); }}
                  className="px-4 py-2 border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] rounded-xl font-bold text-[#5C6B60] dark:text-[#899D90] hover:text-[#222E26] dark:hover:text-[#F7F6F0] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#4A6B53] hover:bg-[#3B5441] text-white dark:bg-[#6E9C7C] dark:hover:bg-[#4A6B53] dark:text-[#151B17] rounded-xl font-bold transition-all shadow-sm"
                >
                  Save Prompt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Manage Categories Modal */}
      {manageCategoriesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#1D2620] rounded-2xl border border-[#DFDCD0] dark:border-[#2E3D33] shadow-2xl overflow-hidden glass-panel max-h-[85vh] flex flex-col animate-fade-in">
            <div className="px-6 py-4 border-b border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 flex items-center justify-between">
              <h3 className="text-sm font-display font-bold text-[#222E26] dark:text-[#F7F6F0] flex items-center gap-2">
                <Bookmark className="w-4.5 h-4.5 text-amber-600 dark:text-amber-500" /> Categories Manager
              </h3>
              <button 
                onClick={() => setManageCategoriesOpen(false)} 
                className="p-1.5 rounded-lg hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] text-[#5C6B60] dark:text-[#899D90] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1 text-[#222E26] dark:text-[#F7F6F0]">
              {/* Add New Category form */}
              <form onSubmit={handleSubmitCategory(handleCreateCategorySubmit)} className="space-y-3 p-4 border border-[#DFDCD0] dark:border-[#2E3D33] bg-[#F7F6F0]/40 dark:bg-[#151B17]/30 rounded-xl">
                <h4 className="text-[10px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider">Create New Category</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#5C6B60]">Name</label>
                    <input 
                      type="text" 
                      placeholder="UI/UX, Marketing" 
                      {...registerCategory('name')} 
                      className="w-full p-2 border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] rounded-xl focus:ring-2 focus:ring-[#4A6B53]"
                    />
                    {categoryErrors.name && <span className="text-[9px] text-rose-500">{categoryErrors.name.message}</span>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#5C6B60]">Slug</label>
                    <input 
                      type="text" 
                      placeholder="ui-ux, marketing" 
                      {...registerCategory('slug')} 
                      className="w-full p-2 border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] rounded-xl focus:ring-2 focus:ring-[#4A6B53]"
                    />
                    {categoryErrors.slug && <span className="text-[9px] text-rose-500">{categoryErrors.slug.message}</span>}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-[#5C6B60] font-semibold">Description</label>
                  <input 
                    type="text" 
                    placeholder="Short description of this category..." 
                    {...registerCategory('description')} 
                    className="w-full p-2 border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] rounded-xl focus:ring-2 focus:ring-[#4A6B53]"
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full py-2 bg-[#4A6B53] hover:bg-[#3B5441] text-white dark:bg-[#6E9C7C] dark:hover:bg-[#4A6B53] dark:text-[#151B17] rounded-xl font-bold mt-1.5 transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-[#4A6B53]/10"
                >
                  <Plus className="w-4 h-4" /> Add Category
                </button>
              </form>

              {/* Existing Categories list */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider">Existing Categories</h4>
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {categories.map(c => (
                    <div 
                      key={c.id} 
                      className="flex items-center justify-between p-3 border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 rounded-xl hover:bg-[#EDEBE0]/30 dark:hover:bg-[#352D26]/30 transition-colors"
                    >
                      <div>
                        <span className="font-bold text-[#222E26] dark:text-[#F7F6F0]">{c.name}</span>
                        <code className="text-[9px] text-[#5C6B60] dark:text-[#899D90] ml-1.5 font-mono px-1.5 py-0.5 rounded-lg bg-[#EDEBE0] dark:bg-[#2E3D33]">/{c.slug}</code>
                        {c.description && <p className="text-[10px] text-[#5C6B60] dark:text-[#899D90] mt-0.5">{c.description}</p>}
                      </div>
                      <button
                        onClick={() => handleDeleteCategory(c.id)}
                        className="p-1.5 rounded-lg border border-rose-200/40 bg-rose-50/10 text-rose-500 hover:bg-rose-100/50 dark:hover:bg-rose-950/20 shrink-0 transition-colors"
                        title="Delete category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <div className="text-center py-6 text-[#5C6B60] border border-dashed border-[#DFDCD0] dark:border-[#2E3D33] rounded-xl">No custom categories.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Create Collection Modal */}
      {createCollectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#1D2620] rounded-2xl border border-[#DFDCD0] dark:border-[#2E3D33] shadow-2xl overflow-hidden glass-panel animate-fade-in">
            <div className="px-6 py-4 border-b border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 flex items-center justify-between">
              <h3 className="text-sm font-display font-bold text-[#222E26] dark:text-[#F7F6F0] flex items-center gap-2">
                <FolderOpen className="w-4.5 h-4.5 text-[#4A6B53] dark:text-amber-500" /> Create Collection Folder
              </h3>
              <button 
                onClick={() => { setCreateCollectionOpen(false); resetCollection(); }} 
                className="p-1.5 rounded-lg hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] text-[#5C6B60] dark:text-[#899D90] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCollection(handleCreateCollectionSubmit)} className="p-6 space-y-4 text-xs text-[#222E26] dark:text-[#F7F6F0]">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider">Collection Name</label>
                <input
                  type="text"
                  placeholder="Android Development, Startup Ideas"
                  {...registerCollection('name')}
                  className="w-full p-2.5 border border-[#DFDCD0] dark:border-[#2E3D33] bg-[#F7F6F0]/50 dark:bg-[#151B17]/20 rounded-xl text-sm focus:ring-2 focus:ring-[#4A6B53]"
                />
                {collectionErrors.name && <span className="text-[9px] text-rose-500 font-semibold">{collectionErrors.name.message}</span>}
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Short description of this group of prompts..."
                  {...registerCollection('description')}
                  className="w-full p-2.5 border border-[#DFDCD0] dark:border-[#2E3D33] bg-[#F7F6F0]/50 dark:bg-[#151B17]/20 rounded-xl text-sm focus:ring-2 focus:ring-[#4A6B53]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#DFDCD0]/60 dark:border-[#2E3D33]/60">
                <button
                  type="button"
                  onClick={() => { setCreateCollectionOpen(false); resetCollection(); }}
                  className="px-4 py-2 border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] rounded-xl font-bold text-[#5C6B60] dark:text-[#899D90] hover:text-[#222E26] dark:hover:text-[#F7F6F0] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#4A6B53] hover:bg-[#3B5441] text-white dark:bg-[#6E9C7C] dark:hover:bg-[#4A6B53] dark:text-[#151B17] rounded-xl font-bold transition-all shadow-sm shadow-[#4A6B53]/10"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
