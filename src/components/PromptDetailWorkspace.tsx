'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Star, Archive, Copy, Share2, FileDown, 
  Printer, Sparkles, Edit3, Clock, RotateCcw, 
  X, FileText, ChevronRight, Bookmark, Globe, 
  Sparkle, AlertCircle, PenTool, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Prompt, PromptVersion, Category } from '@/lib/types';
import { 
  updatePromptAction, toggleFavoriteAction, archivePromptAction, 
  duplicatePromptAction, deletePromptAction, rollbackPromptVersionAction 
} from '@/app/actions';

interface PromptDetailWorkspaceProps {
  prompt: Prompt;
  versions: PromptVersion[];
  categories: Category[];
  isAdmin: boolean;
}

const editFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(250),
  prompt: z.string().min(1, 'Prompt content is required'),
  category: z.string().min(1, 'Category is required'),
  tagsInput: z.string(),
  aiTool: z.string().min(1, 'AI Tool is required'),
  language: z.string().min(1, 'Language is required'),
});

export default function PromptDetailWorkspace({ prompt, versions, categories, isAdmin }: PromptDetailWorkspaceProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const addToast = useStore((state) => state.addToast);

  // States
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [aiProcessing, setAiProcessing] = useState(false);
  const [enhancedResult, setEnhancedResult] = useState<string | null>(null);
  const [currentAiAction, setCurrentAiAction] = useState<string | null>(null);
  const [aiShowMenu, setAiShowMenu] = useState(false);

  // Stats calculation
  const wordCount = prompt.prompt.trim().split(/\s+/).filter(Boolean).length;
  const charCount = prompt.prompt.length;
  const estimatedTokens = Math.ceil(charCount / 4);

  // React Hook Form for Editing
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof editFormSchema>>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      title: prompt.title,
      description: prompt.description || '',
      prompt: prompt.prompt,
      category: prompt.category,
      tagsInput: prompt.tags.join(', '),
      aiTool: prompt.aiTool,
      language: prompt.language,
    }
  });

  // Toggle favorite
  const handleToggleFavorite = async () => {
    const result = await toggleFavoriteAction(prompt.id);
    if (result.success) {
      addToast(result.favorite ? 'Prompt starred!' : 'Star removed', 'success');
      router.refresh();
    }
  };

  // Toggle archive
  const handleToggleArchive = async () => {
    const result = await archivePromptAction(prompt.id);
    if (result.success) {
      addToast(result.archived ? 'Prompt archived!' : 'Prompt restored from archive', 'success');
      router.refresh();
    }
  };

  // Copy Prompt
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt.prompt);
    addToast('Prompt copied successfully', 'success');
    import('canvas-confetti').then((confetti) => confetti.default({ particleCount: 40, spread: 40, origin: { y: 0.8 } }));
  };

  // Share Prompt Link
  const handleShare = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    navigator.clipboard.writeText(url);
    addToast('Share link copied to clipboard', 'success');
  };

  // Export to Markdown
  const handleExportMarkdown = () => {
    const markdownContent = `# ${prompt.title}

> **Description:** ${prompt.description || 'No description'}
> **Category:** ${prompt.category}
> **AI Model:** ${prompt.aiTool}
> **Language:** ${prompt.language}
> **Tags:** ${prompt.tags.join(', ')}
> **Last Updated:** ${new Date(prompt.updatedAt).toLocaleString()}

## System / Base Prompt
\`\`\`text
${prompt.prompt}
\`\`\`
`;

    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${prompt.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Markdown file exported successfully!', 'success');
  };

  // Export to PDF (styled window print)
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addToast('Popup blocked! Please allow popups to export as PDF.', 'error');
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <title>${prompt.title} - PromptVault AI Export</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1f2937; line-height: 1.6; }
            .header { border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; color: #111827; margin: 0; }
            .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px; font-size: 13px; color: #4b5563; }
            .meta-item strong { color: #111827; }
            .prompt-title { font-size: 16px; font-weight: bold; color: #4f46e5; margin-top: 30px; margin-bottom: 10px; border-left: 4px solid #6366f1; padding-left: 10px; }
            .prompt-box { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace; font-size: 12px; white-space: pre-wrap; word-break: break-all; }
            .footer { margin-top: 50px; font-size: 11px; text-align: center; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${prompt.title}</div>
            <div class="meta-grid">
              <div class="meta-item"><strong>Category:</strong> ${prompt.category}</div>
              <div class="meta-item"><strong>AI Target Tool:</strong> ${prompt.aiTool}</div>
              <div class="meta-item"><strong>Language:</strong> ${prompt.language}</div>
              <div class="meta-item"><strong>Tags:</strong> ${prompt.tags.join(', ')}</div>
            </div>
          </div>
          <div>
            <div class="prompt-title">Prompt Content</div>
            <div class="prompt-box">${prompt.prompt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          </div>
          <div class="footer">
            Generated via PromptVault AI • ${new Date().toLocaleString()}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    addToast('PDF Print dialog loaded', 'success');
  };

  // Submit edits
  const handleEditSubmit = async (data: z.infer<typeof editFormSchema>) => {
    const tags = data.tagsInput
      ? data.tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    const result = await updatePromptAction(prompt.id, {
      title: data.title,
      description: data.description || '',
      prompt: data.prompt,
      category: data.category,
      tags,
      aiTool: data.aiTool,
      language: data.language,
    });

    if (result.success) {
      addToast('Prompt updated successfully!', 'success');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['dbData'] });
      router.refresh();
    } else {
      addToast(result.error || 'Failed to update prompt', 'error');
    }
  };

  // Rollback to Version
  const handleRollback = async (versionId: string, verNum: number) => {
    if (confirm(`Are you sure you want to rollback to Version ${verNum}? This will overwrite active contents and create a new history version.`)) {
      const result = await rollbackPromptVersionAction(prompt.id, versionId);
      if (result.success) {
        addToast(`Successfully rolled back to Version ${verNum}!`, 'success');
        queryClient.invalidateQueries({ queryKey: ['dbData'] });
        router.refresh();
      } else {
        addToast(result.error || 'Failed to rollback version', 'error');
      }
    }
  };

  // AI Actions Trigger
  const handleAIAction = async (action: 'improve' | 'detailed' | 'shorter' | 'english' | 'indonesian') => {
    setAiProcessing(true);
    setAiShowMenu(false);
    setCurrentAiAction(action);
    setEnhancedResult(null);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, promptContent: prompt.prompt })
      });

      if (!res.ok) throw new Error('AI API responded with error');
      const data = await res.json();
      
      if (data.success && data.enhancedPrompt) {
        setEnhancedResult(data.enhancedPrompt);
      } else {
        addToast(data.error || 'Failed to enhance prompt', 'error');
        setCurrentAiAction(null);
      }
    } catch {
      addToast('Connection to AI service failed.', 'error');
      setCurrentAiAction(null);
    } finally {
      setAiProcessing(false);
    }
  };

  // Save AI Enhanced Text as new version
  const handleApplyAIEnhancement = async () => {
    if (!enhancedResult) return;
    const result = await updatePromptAction(prompt.id, {
      prompt: enhancedResult
    });

    if (result.success) {
      addToast('AI enhancement applied as a new version!', 'success');
      setEnhancedResult(null);
      setCurrentAiAction(null);
      queryClient.invalidateQueries({ queryKey: ['dbData'] });
      router.refresh();
    } else {
      addToast(result.error || 'Failed to save enhanced prompt', 'error');
    }
  };

  // Duplicate prompt
  const handleDuplicate = async () => {
    const result = await duplicatePromptAction(prompt.id);
    if (result.success && result.data) {
      addToast('Prompt duplicated successfully!', 'success');
      router.push(`/prompt/${result.data.id}`);
    } else {
      addToast('Failed to duplicate prompt', 'error');
    }
  };

  // Delete prompt
  const handleDelete = async () => {
    if (confirm('Are you sure you want to permanently delete this prompt? This action cannot be undone.')) {
      const result = await deletePromptAction(prompt.id);
      if (result.success) {
        addToast('Prompt deleted successfully', 'success');
        router.push('/library');
      } else {
        addToast('Failed to delete prompt', 'error');
      }
    }
  };

  return (
    <div className="space-y-6 relative pb-12">
      {/* Back button and core settings header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => router.push('/library')}
          className="flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Library
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Favorite Toggle (Admin Only) */}
          {isAdmin && (
            <button
              onClick={handleToggleFavorite}
              className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-semibold shadow-sm transition-all ${
                prompt.favorite
                  ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                  : 'border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] text-[#5C6B60] hover:text-[#222E26] dark:text-[#899D90] dark:hover:text-[#F7F6F0] hover:bg-[#EDEBE0] dark:hover:bg-[#352D26]'
              }`}
              title="Star prompt"
            >
              <Star className={`w-3.5 h-3.5 ${prompt.favorite ? 'text-[#4A6B53] fill-[#4A6B53] dark:text-[#6E9C7C] dark:fill-[#6E9C7C]' : ''}`} />
              {prompt.favorite ? 'Starred' : 'Star'}
            </button>
          )}

          {/* Archive Toggle (Admin Only) */}
          {isAdmin && (
            <button
              onClick={handleToggleArchive}
              className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-semibold shadow-sm transition-all ${
                prompt.archived
                  ? 'border-[#4A6B53]/35 bg-[#4A6B53]/10 text-[#4A6B53] dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-500'
                  : 'border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] text-[#5C6B60] hover:text-[#222E26] dark:text-[#899D90] dark:hover:text-[#F7F6F0] hover:bg-[#EDEBE0] dark:hover:bg-[#352D26]'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              {prompt.archived ? 'Archived' : 'Archive'}
            </button>
          )}

          {/* Export MD */}
          <button
            onClick={handleExportMarkdown}
            className="p-2 rounded-xl border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] text-[#5C6B60] hover:text-[#222E26] dark:text-[#899D90] dark:hover:text-[#F7F6F0] hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] transition-all shadow-sm flex items-center gap-1.5 text-xs font-semibold"
            title="Export to Markdown (.md)"
          >
            <FileDown className="w-3.5 h-3.5 text-[#4A6B53] dark:text-amber-500" /> MD
          </button>

          {/* Export PDF */}
          <button
            onClick={handleExportPDF}
            className="p-2 rounded-xl border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] text-[#5C6B60] hover:text-[#222E26] dark:text-[#899D90] dark:hover:text-[#F7F6F0] hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] transition-all shadow-sm flex items-center gap-1.5 text-xs font-semibold"
            title="Print / Save to PDF"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" /> PDF
          </button>

          {/* Duplicate (Admin Only) */}
          {isAdmin && (
            <button
              onClick={handleDuplicate}
              className="p-2 rounded-xl border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] text-[#5C6B60] hover:text-[#222E26] dark:text-[#899D90] dark:hover:text-[#F7F6F0] hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] transition-all shadow-sm flex items-center gap-1.5 text-xs font-semibold"
            >
              Duplicate
            </button>
          )}

          {/* Delete (Admin Only) */}
          {isAdmin && (
            <button
              onClick={handleDelete}
              className="p-2 rounded-xl border border-rose-200/60 dark:border-rose-950 bg-rose-50/20 dark:bg-rose-950/10 text-rose-600 hover:text-rose-500 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-900 transition-all shadow-sm flex items-center gap-1.5 text-xs font-semibold"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Metadata Panel, Analytics & Version History */}
        <div className="space-y-6">
          
          {/* Metadata Card */}
          <div className="p-5 rounded-xl border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-white dark:bg-[#1D2620] shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider">Prompt Statistics</h3>
            
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-[#F7F6F0] dark:bg-[#151B17] border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 rounded-xl">
                <span className="text-[10px] text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider block">Words</span>
                <span className="text-base font-extrabold text-[#222E26] dark:text-[#F7F6F0] block mt-1">{wordCount}</span>
              </div>
              <div className="p-3 bg-[#F7F6F0] dark:bg-[#151B17] border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 rounded-xl">
                <span className="text-[10px] text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider block">Chars</span>
                <span className="text-base font-extrabold text-[#222E26] dark:text-[#F7F6F0] block mt-1">{charCount}</span>
              </div>
              <div className="p-3 bg-[#F7F6F0] dark:bg-[#151B17] border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 rounded-xl">
                <span className="text-[10px] text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider block">Tokens*</span>
                <span className="text-base font-extrabold text-[#222E26] dark:text-[#F7F6F0] block mt-1">{estimatedTokens}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 space-y-2 text-xs text-[#5C6B60] dark:text-[#899D90]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#5C6B60]/70"><Bookmark className="w-3.5 h-3.5" /> Category:</span>
                <span className="font-semibold text-[#222E26] dark:text-[#F7F6F0]">{prompt.category || 'Uncategorized'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#5C6B60]/70"><PenTool className="w-3.5 h-3.5" /> AI Model:</span>
                <span className="font-semibold text-[#222E26] dark:text-[#F7F6F0]">{prompt.aiTool}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#5C6B60]/70"><Globe className="w-3.5 h-3.5" /> Language:</span>
                <span className="font-semibold text-[#222E26] dark:text-[#F7F6F0]">{prompt.language}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#5C6B60]/70"><Clock className="w-3.5 h-3.5" /> Updated:</span>
                <span className="font-semibold text-[#222E26] dark:text-[#F7F6F0] font-mono text-[10px]">
                  {new Date(prompt.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <p className="text-[9px] text-[#5C6B60] dark:text-[#899D90] leading-normal italic pt-1 text-center">
              *Estimated token count using 4 chars/token approximation.
            </p>
          </div>

          {/* Navigation Tabs (Details / History) */}
          <div className="flex border-b border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 text-xs">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-2.5 font-bold border-b-2 text-center transition-all ${
                activeTab === 'details'
                  ? 'border-[#4A6B53] text-[#4A6B53] dark:border-[#6E9C7C] dark:text-[#6E9C7C]'
                  : 'border-transparent text-[#5C6B60] hover:text-[#222E26]'
              }`}
            >
              Description & Tags
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2.5 font-bold border-b-2 text-center transition-all ${
                activeTab === 'history'
                  ? 'border-[#4A6B53] text-[#4A6B53] dark:border-[#6E9C7C] dark:text-[#6E9C7C]'
                  : 'border-transparent text-[#5C6B60] hover:text-[#222E26]'
              }`}
            >
              Version History ({versions.length})
            </button>
          </div>

          {activeTab === 'details' ? (
            /* Tab: Metadata / Tags */
            <div className="p-5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-[#1D2620] shadow-sm space-y-4">
              <div className="space-y-1">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Description</h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-350 leading-relaxed">
                  {prompt.description || 'No description provided for this prompt template.'}
                </p>
              </div>
              <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-850">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tags</h4>
                {prompt.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {prompt.tags.map(tag => (
                      <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200/40 dark:border-zinc-800/40">
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 italic">No tags attached.</p>
                )}
              </div>
            </div>
          ) : (
            /* Tab: Version History */
            <div className="p-5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-950 shadow-sm space-y-4">
              <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Timeline</h4>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {versions.sort((a,b) => b.versionNumber - a.versionNumber).map((v, index) => (
                  <div key={v.id} className="flex gap-3 relative group">
                    {/* Line */}
                    {index < versions.length - 1 && (
                      <div className="absolute left-[9px] top-6 bottom-[-16px] w-[1.5px] bg-zinc-200 dark:bg-zinc-800" />
                    )}
                    {/* Circle */}
                    <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center justify-center text-[9px] font-bold">
                      {v.versionNumber}
                    </div>
                    {/* Details */}
                    <div className="flex-1 text-xs min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">Version {v.versionNumber}</span>
                        <span className="text-[9px] text-zinc-400 font-mono">{new Date(v.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1 italic mt-0.5">{v.description || 'Edited prompt text'}</p>
                      
                      {/* Rollback button (only show on historical versions if Admin) */}
                      {isAdmin && v.versionNumber < Math.max(...versions.map(vs => vs.versionNumber)) && (
                        <button
                          onClick={() => handleRollback(v.id, v.versionNumber)}
                          className="mt-1.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <RotateCcw className="w-2.5 h-2.5" /> Revert to this version
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {versions.length === 0 && (
                  <div className="text-center py-6 text-zinc-400 text-xs italic">No versions recorded.</div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Prompt Editor / Viewer and AI Enhancements */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Prompt Text Box */}
          <div className="p-6 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-950 shadow-sm flex flex-col space-y-4">
            
            {/* Header controls: Copy, Share, Edit Toggle */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-150 dark:border-zinc-850">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#4A6B53] dark:text-[#6E9C7C]" />
                Prompt Template
              </h3>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleShare}
                  className="p-2 rounded-lg border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors shadow-sm flex items-center gap-1 text-xs font-semibold"
                  title="Copy share link"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
                <button
                  onClick={handleCopyPrompt}
                  className="p-2 rounded-lg border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors shadow-sm flex items-center gap-1 text-xs font-semibold"
                  title="Copy full prompt text"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy Prompt
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`p-2 rounded-lg border flex items-center gap-1 text-xs font-semibold shadow-sm transition-colors ${
                      isEditing 
                        ? 'bg-[#4A6B53] border-[#3B5441] text-white dark:bg-[#6E9C7C] dark:border-[#3B5441] dark:text-[#151B17]' 
                        : 'border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" /> {isEditing ? 'Cancel Edit' : 'Edit Prompt'}
                  </button>
                )}
              </div>
            </div>

            {/* Read/Write Toggle View */}
            {!isEditing ? (
              /* Read View */
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-extrabold text-zinc-950 dark:text-zinc-50">{prompt.title}</h2>
                  {prompt.description && <p className="text-xs text-zinc-400 dark:text-zinc-500">{prompt.description}</p>}
                </div>
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 font-mono text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap select-all selection:bg-[#4A6B53] selection:text-white dark:selection:bg-[#6E9C7C] dark:selection:text-[#151B17]">
                  {prompt.prompt}
                </div>
              </div>
            ) : (
              /* Edit Form View */
              <form onSubmit={handleSubmit(handleEditSubmit)} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase">Title</label>
                    <input
                      type="text"
                      placeholder="Prompt title"
                      {...register('title')}
                      className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-lg"
                    />
                    {errors.title && <span className="text-[10px] text-rose-500 font-semibold">{errors.title.message}</span>}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase">Description</label>
                    <input
                      type="text"
                      placeholder="Short description"
                      {...register('description')}
                      className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase">Category</label>
                    <select                      {...register('category')}
                      className="w-full p-2.5 border border-[#DFDCD0] dark:border-[#2E3D33] bg-[#F7F6F0]/50 dark:bg-[#151B17]/20 rounded-xl text-sm focus:ring-2 focus:ring-[#4A6B53] cursor-pointer"
                    >
                      <option value="">Select Category</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    {errors.category && <span className="text-[10px] text-rose-500 font-semibold">{errors.category.message}</span>}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider">AI Tool</label>
                    <input
                      type="text"
                      {...register('aiTool')}
                      className="w-full p-2.5 border border-[#DFDCD0] dark:border-[#2E3D33] bg-[#F7F6F0]/50 dark:bg-[#151B17]/20 rounded-xl text-sm focus:ring-2 focus:ring-[#4A6B53]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider">Language</label>
                    <input
                      type="text"
                      {...register('language')}
                      className="w-full p-2.5 border border-[#DFDCD0] dark:border-[#2E3D33] bg-[#F7F6F0]/50 dark:bg-[#151B17]/20 rounded-xl text-sm focus:ring-2 focus:ring-[#4A6B53]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider">Tags (comma-separated)</label>
                  <input
                    type="text"
                    {...register('tagsInput')}
                    className="w-full p-2.5 border border-[#DFDCD0] dark:border-[#2E3D33] bg-[#F7F6F0]/50 dark:bg-[#151B17]/20 rounded-xl text-sm focus:ring-2 focus:ring-[#4A6B53]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider">Prompt Content</label>
                  <textarea
                    rows={12}
                    {...register('prompt')}
                    className="w-full p-3 border border-[#DFDCD0] dark:border-[#2E3D33] bg-[#F7F6F0]/50 dark:bg-[#151B17]/20 rounded-xl font-mono text-[11px] focus:ring-2 focus:ring-[#4A6B53]"
                  />
                  {errors.prompt && <span className="text-[10px] text-rose-500 font-semibold">{errors.prompt.message}</span>}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] rounded-xl font-bold text-[#5C6B60] dark:text-[#899D90] hover:text-[#222E26] dark:hover:text-[#F7F6F0] transition-colors"
                  >
                    Discard Changes
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#4A6B53] hover:bg-[#3B5441] text-white dark:bg-[#6E9C7C] dark:hover:bg-[#4A6B53] dark:text-[#151B17] rounded-xl font-bold transition-all shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}

          </div>

        </div>

      </div>

      {/* FLOATING ACTION AI ENHANCEMENT MENU (Admin Only) */}
      {isAdmin && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2 text-xs">
          
          {/* Expanded AI Menu options */}
          <AnimatePresence>
            {aiShowMenu && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="p-2 rounded-xl border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] shadow-2xl flex flex-col gap-1 w-52 glass-panel"
              >
                <div className="px-2.5 py-1.5 text-[9px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase border-b border-[#DFDCD0] dark:border-[#2E3D33] flex items-center gap-1"><Sparkles className="w-3 h-3 text-[#4A6B53] dark:text-[#6E9C7C]" /> AI Prompter Toolkit</div>
                
                <button
                  onClick={() => handleAIAction('improve')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#EDEBE0]/50 dark:hover:bg-[#352D26]/50 text-[#5C6B60] dark:text-[#899D90] hover:text-[#4A6B53] dark:hover:text-[#6E9C7C] font-semibold transition-colors flex items-center gap-2"
                >
                  <Sparkle className="w-3.5 h-3.5 text-[#4A6B53] dark:text-[#6E9C7C]" /> Improve Prompt
                </button>
                <button
                  onClick={() => handleAIAction('detailed')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#EDEBE0]/50 dark:hover:bg-[#352D26]/50 text-[#5C6B60] dark:text-[#899D90] hover:text-[#4A6B53] dark:hover:text-[#6E9C7C] font-semibold transition-colors flex items-center gap-2"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#4A6B53] dark:text-[#6E9C7C]" /> Make More Detailed
                </button>
                <button
                  onClick={() => handleAIAction('shorter')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#EDEBE0]/50 dark:hover:bg-[#352D26]/50 text-[#5C6B60] dark:text-[#899D90] hover:text-[#4A6B53] dark:hover:text-[#6E9C7C] font-semibold transition-colors flex items-center gap-2"
                >
                  <X className="w-3.5 h-3.5 text-[#4A6B53] dark:text-[#6E9C7C]" /> Make Shorter
                </button>
                <button
                  onClick={() => handleAIAction('english')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#EDEBE0]/50 dark:hover:bg-[#352D26]/50 text-[#5C6B60] dark:text-[#899D90] hover:text-[#4A6B53] dark:hover:text-[#6E9C7C] font-semibold transition-colors flex items-center gap-2"
                >
                  <Globe className="w-3.5 h-3.5 text-[#4A6B53] dark:text-[#6E9C7C]" /> Translate to English
                </button>
                <button
                  onClick={() => handleAIAction('indonesian')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#EDEBE0]/50 dark:hover:bg-[#352D26]/50 text-[#5C6B60] dark:text-[#899D90] hover:text-[#4A6B53] dark:hover:text-[#6E9C7C] font-semibold transition-colors flex items-center gap-2"
                >
                  <Globe className="w-3.5 h-3.5 text-[#4A6B53] dark:text-[#6E9C7C]" /> Terjemahkan Indonesia
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Core Magic Orb button */}
          <button
            onClick={() => setAiShowMenu(!aiShowMenu)}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#4A6B53] to-[#6E9C7C] hover:from-[#3B5441] hover:to-[#4A6B53] flex items-center justify-center text-white dark:text-[#151B17] shadow-xl shadow-[#4A6B53]/20 hover:scale-105 active:scale-95 transition-all group"
            title="AI Prompt Enhancer"
          >
            {aiProcessing ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            )}
          </button>
        </div>
      )}

      {/* AI Processing overlay */}
      {aiProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="p-6 rounded-xl border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] shadow-2xl flex flex-col items-center justify-center space-y-3 max-w-xs text-center glass-panel animate-pulse">
            <div className="relative">
              <Sparkles className="w-8 h-8 text-[#4A6B53] dark:text-amber-500" />
              <RefreshCw className="w-4 h-4 text-[#4A6B53] dark:text-amber-500 animate-spin absolute bottom-0 right-0" />
            </div>
            <h4 className="text-xs font-display font-bold text-[#222E26] dark:text-[#F7F6F0]">AI Orchestrating Prompt</h4>
            <p className="text-[10px] text-[#5C6B60] dark:text-[#899D90] leading-relaxed">Processing your system prompt using Gemini API. Expanding instructions and structure...</p>
          </div>
        </div>
      )}

      {/* Side-by-Side comparison interface for AI results */}
      <AnimatePresence>
        {enhancedResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 md:p-8">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-5xl rounded-xl border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] shadow-2xl overflow-hidden glass-panel max-h-[90vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 flex items-center justify-between bg-[#F7F6F0]/50 dark:bg-[#151B17]/20">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#4A6B53] dark:text-amber-500" />
                  <div>
                    <h3 className="text-sm font-display font-bold text-[#222E26] dark:text-[#F7F6F0]">AI Enhancer Workspace</h3>
                    <p className="text-[10px] text-[#5C6B60] dark:text-[#899D90]">Action: {currentAiAction?.toUpperCase()}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setEnhancedResult(null); setCurrentAiAction(null); }}
                  className="p-1.5 rounded-lg hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] text-[#5C6B60] dark:text-[#899D90]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs min-h-0">
                {/* Left Side: Original */}
                <div className="flex flex-col space-y-2 min-h-0">
                  <span className="text-[10px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider">Original Prompt</span>
                  <div className="flex-1 p-4 border border-[#DFDCD0] dark:border-[#2E3D33] bg-[#F7F6F0]/50 dark:bg-[#151B17]/20 rounded-xl overflow-y-auto font-mono text-[10px] leading-relaxed text-[#222E26] dark:text-[#F7F6F0] whitespace-pre-wrap select-all">
                    {prompt.prompt}
                  </div>
                </div>

                {/* Right Side: Enhanced */}
                <div className="flex flex-col space-y-2 min-h-0">
                  <span className="text-[10px] font-bold text-[#4A6B53] dark:text-amber-400 uppercase tracking-wider flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> AI Enhanced Version</span>
                  <div className="flex-1 p-4 border border-[#4A6B53]/20 bg-[#4A6B53]/5 dark:bg-amber-500/5 dark:border-amber-500/20 rounded-xl overflow-y-auto font-mono text-[10px] leading-relaxed text-[#222E26] dark:text-[#F7F6F0] whitespace-pre-wrap select-all">
                    {enhancedResult}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-[#F7F6F0]/50 dark:bg-[#151B17]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1 text-[#5C6B60] dark:text-[#899D90]">
                  <AlertCircle className="w-4 h-4 text-[#4A6B53] dark:text-amber-500" />
                  <span>Accepting will replace active content and save a new Version {versions.length + 1} history record.</span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0 self-end">
                  <button
                    onClick={() => { setEnhancedResult(null); setCurrentAiAction(null); }}
                    className="px-4 py-2 border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] rounded-xl font-bold text-[#5C6B60] dark:text-[#899D90] hover:text-[#222E26] dark:hover:text-[#F7F6F0] transition-colors"
                  >
                    Discard
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(enhancedResult);
                      addToast('AI Prompt copied to clipboard successfully!', 'success');
                    }}
                    className="px-4 py-2 border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] rounded-xl font-bold text-[#5C6B60] dark:text-[#899D90] hover:text-[#222E26] dark:hover:text-[#F7F6F0] transition-colors flex items-center gap-1"
                  >
                    Copy to Clipboard
                  </button>
                  <button
                    onClick={handleApplyAIEnhancement}
                    className="px-5 py-2 bg-[#4A6B53] hover:bg-[#3B5441] text-white dark:bg-[#6E9C7C] dark:hover:bg-[#4A6B53] dark:text-[#151B17] rounded-xl font-bold flex items-center gap-1 shadow-sm"
                  >
                    Apply & Save Version {versions.length + 1}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
