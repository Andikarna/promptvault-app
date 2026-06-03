import React from 'react';
import Link from 'next/link';
import { 
  Database, Star, Bookmark, Calendar, ArrowUpRight, 
  Layers, Clock, ArrowRight, Code 
} from 'lucide-react';
import { db } from '@/lib/db/db';
import DashboardCharts from '@/components/DashboardCharts';

// Force dynamic rendering to always load fresh data from Google Sheets/JSON
export const revalidate = 0;

export default async function DashboardPage() {
  // Fetch data from database
  const [prompts, categories, collections, activities] = await Promise.all([
    db.getPrompts(),
    db.getCategories(),
    db.getCollections(),
    db.getActivities(),
  ]);

  // Compute Statistics
  const totalPrompts = prompts.length;
  const favoritePrompts = prompts.filter(p => p.favorite && !p.archived).length;
  const totalCategories = categories.length;
  const totalCollections = collections.length;

  // Find last updated prompt
  const sortedByUpdate = [...prompts].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const lastUpdatedPrompt = sortedByUpdate[0] || null;

  // Find most used category
  const categoryCounts: { [key: string]: number } = {};
  prompts.forEach(p => {
    if (p.category) {
      categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    }
  });
  let mostUsedCategory = 'None';
  let maxCount = 0;
  Object.entries(categoryCounts).forEach(([cat, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostUsedCategory = cat;
    }
  });

  // Get active favorites to pin
  const pinnedFavorites = prompts.filter(p => p.favorite && !p.archived).slice(0, 3);

  const getRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 md:p-8 rounded-2xl border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-white dark:bg-[#1D2620] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#4A6B53]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 dark:bg-[#6E9C7C]/10" />
        <div className="space-y-1 z-10">
          <h2 className="text-xl md:text-2xl font-display font-bold tracking-tight text-[#222E26] dark:text-[#F7F6F0]">Welcome to PromptVault AI</h2>
          <p className="text-sm text-[#5C6B60] dark:text-[#899D90] max-w-xl">
            Save, version, and orchestrate your professional LLM prompts. Sync instantly with Google Sheets or utilize AI to enhance your instructions.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 z-10">
          <Link 
            href="/library" 
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] text-[#5C6B60] dark:text-[#899D90] hover:bg-[#EDEBE0]/50 dark:hover:bg-[#352D26] hover:text-[#222E26] dark:hover:text-[#F7F6F0] active:scale-98 transition-all shadow-sm"
          >
            Library
          </Link>
          <Link 
            href="/templates" 
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-[#4A6B53] hover:bg-[#3B5441] text-white dark:bg-[#6E9C7C] dark:hover:bg-[#4A6B53] dark:text-[#151B17] shadow-sm shadow-[#4A6B53]/10 active:scale-98 transition-all"
          >
            Browse Templates <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Prompts */}
        <div className="p-4 rounded-xl border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-white dark:bg-[#1D2620] shadow-sm flex flex-col justify-between h-28 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider">Total Prompts</span>
            <Database className="w-4.5 h-4.5 text-[#4A6B53] dark:text-[#6E9C7C]" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-[#222E26] dark:text-[#F7F6F0] leading-none block">{totalPrompts}</span>
            <span className="text-[10px] text-[#5C6B60] mt-1 block">Active repository</span>
          </div>
        </div>

        {/* Favorite Prompts */}
        <div className="p-4 rounded-xl border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-white dark:bg-[#1D2620] shadow-sm flex flex-col justify-between h-28">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider">Favorites</span>
            <Star className="w-4.5 h-4.5 text-[#4A6B53] fill-[#4A6B53]/20 dark:text-amber-500 dark:fill-amber-500/20" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-[#222E26] dark:text-[#F7F6F0] leading-none block">{favoritePrompts}</span>
            <span className="text-[10px] text-[#5C6B60] mt-1 block">Starred prompts</span>
          </div>
        </div>

        {/* Categories Count */}
        <div className="p-4 rounded-xl border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-white dark:bg-[#1D2620] shadow-sm flex flex-col justify-between h-28">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider">Categories</span>
            <Bookmark className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-500" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-[#222E26] dark:text-[#F7F6F0] leading-none block">{totalCategories}</span>
            <span className="text-[10px] text-[#5C6B60] mt-1 block">Organized domains</span>
          </div>
        </div>

        {/* Collections Count */}
        <div className="p-4 rounded-xl border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-white dark:bg-[#1D2620] shadow-sm flex flex-col justify-between h-28">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider">Collections</span>
            <Layers className="w-4.5 h-4.5 text-amber-600 dark:text-amber-500" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-[#222E26] dark:text-[#F7F6F0] leading-none block">{totalCollections}</span>
            <span className="text-[10px] text-[#5C6B60] mt-1 block">Structured folders</span>
          </div>
        </div>

        {/* Most Used Category */}
        <div className="p-4 rounded-xl border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-white dark:bg-[#1D2620] shadow-sm flex flex-col justify-between h-28 col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider">Top Category</span>
            <Code className="w-4.5 h-4.5 text-[#4A6B53]/80" />
          </div>
          <div className="min-w-0">
            <span className="text-base font-extrabold text-[#222E26] dark:text-[#F7F6F0] truncate block" title={mostUsedCategory}>{mostUsedCategory}</span>
            <span className="text-[10px] text-[#5C6B60] mt-1 block">Most popular tag</span>
          </div>
        </div>

        {/* Last Updated */}
        <div className="p-4 rounded-xl border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-white dark:bg-[#1D2620] shadow-sm flex flex-col justify-between h-28 col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider">Last Sync</span>
            <Calendar className="w-4.5 h-4.5 text-cyan-600 dark:text-cyan-500" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-extrabold text-[#222E26] dark:text-[#F7F6F0] block truncate" title={lastUpdatedPrompt?.title || 'None'}>
              {lastUpdatedPrompt ? getRelativeTime(lastUpdatedPrompt.updatedAt) : 'Never'}
            </span>
            <span className="text-[10px] text-[#5C6B60] mt-1 block truncate" title={lastUpdatedPrompt?.title || ''}>
              {lastUpdatedPrompt ? lastUpdatedPrompt.title : 'No prompts'}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Recharts */}
      <DashboardCharts prompts={prompts} activities={activities} />

      {/* Bottom Grid: Pinned Favorites & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pinned / Starred Prompts */}
        <div className="p-6 rounded-xl border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-white dark:bg-[#1D2620] shadow-sm lg:col-span-2 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-display font-bold text-[#222E26] dark:text-[#F7F6F0] flex items-center gap-1.5">
                <Star className="w-4.5 h-4.5 text-[#4A6B53] fill-[#4A6B53]/10 dark:text-[#6E9C7C] dark:fill-[#6E9C7C]/10" />
                Featured Prompts
              </h3>
              <p className="text-[11px] text-[#5C6B60] dark:text-[#899D90]">Your highly rated custom templates</p>
            </div>
            <Link 
              href="/library?favorites=true"
              className="text-xs font-semibold text-[#4A6B53] dark:text-amber-500 hover:underline flex items-center gap-1"
            >
              See all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pinnedFavorites.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[#DFDCD0] dark:border-[#2E3D33] rounded-xl p-8 text-center bg-[#EDEBE0]/10 dark:bg-[#1D2620]/10">
              <Star className="w-8 h-8 text-[#DFDCD0] dark:text-[#2E3D33] mb-2" />
              <p className="text-xs text-[#5C6B60] dark:text-[#899D90]">No favorite prompts pinned yet.</p>
              <p className="text-[10px] text-[#5C6B60] mt-0.5">Click the star icon on any prompt card in the library to pin it here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 flex-1">
              {pinnedFavorites.map(p => (
                <Link 
                  href={`/prompt/${p.id}`}
                  key={p.id}
                  className="p-4 rounded-xl border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 hover:border-[#4A6B53]/50 dark:hover:border-[#6E9C7C]/40 bg-[#EDEBE0]/10 dark:bg-[#1D2620]/10 hover:bg-[#EDEBE0]/30 dark:hover:bg-[#1D2620]/30 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-[#5C6B60] dark:text-[#899D90] font-mono">
                      <span>{p.category}</span>
                      <span>{p.language}</span>
                    </div>
                    <h4 className="text-xs font-display font-bold text-[#222E26] dark:text-[#F7F6F0] group-hover:text-[#4A6B53] dark:group-hover:text-[#6E9C7C] transition-colors line-clamp-2">
                      {p.title}
                    </h4>
                    <p className="text-[11px] text-[#5C6B60] dark:text-[#899D90] line-clamp-2 leading-relaxed">
                      {p.description || p.prompt}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#DFDCD0]/40 dark:border-[#2E3D33]/40 text-[10px] text-[#5C6B60] dark:text-[#899D90]">
                    <span className="font-semibold px-1.5 py-0.5 rounded bg-[#EDEBE0] dark:bg-[#2E3D33] text-[#222E26] dark:text-[#F7F6F0]">{p.aiTool}</span>
                    <Clock className="w-3.5 h-3.5 text-[#DFDCD0] dark:text-[#2E3D33]" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activity Timeline */}
        <div className="p-6 rounded-xl border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-white dark:bg-[#1D2620] shadow-sm flex flex-col space-y-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-display font-bold text-[#222E26] dark:text-[#F7F6F0] flex items-center gap-1.5">
              <Clock className="w-4.5 h-4.5 text-[#4A6B53] dark:text-amber-500" />
              Activity Log
            </h3>
            <p className="text-[11px] text-[#5C6B60] dark:text-[#899D90]">Recent synchronization events</p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[220px] pr-1">
            {activities.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#5C6B60] py-12">No activity events recorded yet.</div>
            ) : (
              activities.slice(0, 5).map((act, index) => (
                <div key={act.id} className="flex gap-3 relative group">
                  {/* Timeline Line */}
                  {index < Math.min(activities.length, 5) - 1 && (
                    <div className="absolute left-[9px] top-6 bottom-[-16px] w-[1.5px] bg-[#DFDCD0]/60 dark:bg-[#2E3D33]/60" />
                  )}
                  {/* Timeline Dot */}
                  <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold border ${
                    act.type === 'create' 
                      ? 'bg-emerald-50 border-emerald-500/30 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-500/10 dark:text-emerald-400' 
                      : act.type === 'delete'
                        ? 'bg-rose-50 border-rose-500/30 text-rose-600 dark:bg-rose-950/20 dark:border-rose-500/10 dark:text-rose-400'
                        : act.type === 'rollback'
                          ? 'bg-amber-50 border-amber-500/30 text-amber-600 dark:bg-amber-950/20 dark:border-amber-500/10 dark:text-amber-400'
                          : 'bg-[#EDEBE0] border-[#DFDCD0] text-[#5C6B60] dark:bg-[#2E3D33] dark:border-[#2E3D33] dark:text-[#899D90]'
                  }`}>
                    {act.type.slice(0, 1).toUpperCase()}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold text-[#222E26] dark:text-[#F7F6F0] truncate">
                        {act.details}
                      </p>
                      <span className="text-[9px] text-[#5C6B60] dark:text-[#899D90] shrink-0 font-mono">
                        {getRelativeTime(act.timestamp)}
                      </span>
                    </div>
                    {act.promptId && act.type !== 'delete' ? (
                      <Link 
                        href={`/prompt/${act.promptId}`}
                        className="text-[10px] text-[#4A6B53] dark:text-amber-500 hover:underline block mt-0.5 truncate"
                      >
                        Source: {act.promptTitle}
                      </Link>
                    ) : (
                      <span className="text-[10px] text-[#5C6B60] dark:text-[#899D90] block mt-0.5 truncate">
                        Source: {act.promptTitle}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
