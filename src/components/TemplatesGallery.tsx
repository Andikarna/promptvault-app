'use client';

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Sparkles, Copy, X, FileText, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { createPromptAction } from '@/app/actions';

interface Template {
  title: string;
  description: string;
  prompt: string;
  category: string;
  aiTool: string;
  language: string;
  tags: string[];
}

interface TemplatesGalleryProps {
  templates: Template[];
  isAdmin: boolean;
}

export default function TemplatesGallery({ templates, isAdmin }: TemplatesGalleryProps) {
  const queryClient = useQueryClient();
  const addToast = useStore((state) => state.addToast);
  
  // Local UI States
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [duplicatingTitle, setDuplicatingTitle] = useState<string | null>(null);

  // Duplication Handler
  const handleDuplicate = async (template: Template, e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setDuplicatingTitle(template.title);

    try {
      const result = await createPromptAction({
        title: template.title,
        description: template.description,
        prompt: template.prompt,
        category: template.category,
        tags: template.tags,
        aiTool: template.aiTool,
        language: template.language,
        favorite: false,
        archived: false,
      });

      if (result.success && result.data) {
        addToast(`Template "${template.title}" duplicated to library!`, 'success');
        
        // Explode canvas-confetti
        import('canvas-confetti').then((confetti) => confetti.default({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.85 }
        }));

        queryClient.invalidateQueries({ queryKey: ['dbData'] });
        setPreviewTemplate(null);
      } else {
        addToast(result.error || 'Failed to duplicate template', 'error');
      }
    } catch {
      addToast('An error occurred during template duplication', 'error');
    } finally {
      setDuplicatingTitle(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Description Header */}
      <div className="p-6 rounded-2xl border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-white dark:bg-[#1D2620] shadow-sm space-y-1.5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#4A6B53]/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <h2 className="text-base font-display font-bold text-[#222E26] dark:text-[#F7F6F0] flex items-center gap-1.5 z-10">
          <Sparkles className="w-5 h-5 text-[#4A6B53] dark:text-[#6E9C7C]" /> CURATED STARTER TEMPLATES
        </h2>
        <p className="text-xs text-[#5C6B60] dark:text-[#899D90] max-w-2xl z-10 leading-relaxed">
          Need a quick starting point? Browse our curated gallery of developer prompts covering mobile dev, C#, API routes, UI copywriting, and agent architectures. Click &ldquo;Duplicate to Library&rdquo; to add any template to your workspace database instantly.
        </p>
      </div>

      {/* Grid Cards list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div
            key={template.title}
            className="p-5 rounded-xl border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-white dark:bg-[#1D2620] shadow-sm hover:shadow-md hover:border-[#4A6B53]/40 dark:hover:border-[#6E9C7C]/40 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px] font-mono text-[#5C6B60] dark:text-[#899D90]">
                <span className="font-semibold px-2 py-0.5 rounded-lg bg-[#EDEBE0] dark:bg-[#2E3D33] text-[#5C6B60] dark:text-[#899D90]">{template.category}</span>
                <span>{template.language}</span>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-sm font-display font-bold text-[#222E26] dark:text-[#F7F6F0] group-hover:text-[#4A6B53] dark:group-hover:text-[#6E9C7C] transition-colors">
                  {template.title}
                </h4>
                <p className="text-[11px] text-[#5C6B60] dark:text-[#899D90] line-clamp-3 leading-relaxed">
                  {template.description}
                </p>
              </div>

              {/* Tag previews */}
              <div className="flex flex-wrap gap-1 pt-1.5 animate-fade-in">
                {template.tags.map(tag => (
                  <span key={tag} className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#EDEBE0]/50 dark:bg-[#2E3D33]/50 border border-[#DFDCD0]/20 dark:border-[#2E3D33]/20 text-[#5C6B60] dark:text-[#899D90]">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-5 pt-3.5 border-t border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 justify-between text-xs">
              <span className="text-[9px] font-semibold text-[#5C6B60] dark:text-[#899D90]">{template.aiTool}</span>
              
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPreviewTemplate(template)}
                  className="p-1.5 rounded-lg border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] text-[#5C6B60] hover:text-[#222E26] dark:text-[#899D90] dark:hover:text-[#F7F6F0] hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] transition-colors shadow-sm flex items-center gap-1 text-xs font-semibold"
                  title="Preview template content"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview
                </button>
                <button
                  disabled={!isAdmin || duplicatingTitle === template.title}
                  onClick={(e) => handleDuplicate(template, e)}
                  className="px-3 py-1.5 bg-[#4A6B53] hover:bg-[#3B5441] text-white dark:bg-[#6E9C7C] dark:hover:bg-[#4A6B53] dark:text-[#151B17] rounded-xl font-bold text-[10px] shadow-sm flex items-center gap-1 active:scale-98 transition-all disabled:opacity-50"
                  title={!isAdmin ? 'Login as Admin to duplicate templates' : 'Duplicate to Library'}
                >
                  {duplicatingTitle === template.title ? 'Duplicating...' : 'Duplicate'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* OVERLAY DIALOG FOR FULL PREVIEW */}
      <AnimatePresence>
        {previewTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl rounded-2xl border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] shadow-2xl overflow-hidden glass-panel max-h-[85vh] flex flex-col animate-fade-in"
            >
              <div className="px-6 py-4 border-b border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 flex items-center justify-between">
                <h3 className="text-sm font-display font-bold text-[#222E26] dark:text-[#F7F6F0] flex items-center gap-2">
                  <FileText className="w-4.5 h-4.5 text-[#4A6B53] dark:text-amber-500" /> Template Preview
                </h3>
                <button 
                  onClick={() => setPreviewTemplate(null)}
                  className="p-1.5 rounded-lg hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] text-[#5C6B60] dark:text-[#899D90] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1 text-[#222E26] dark:text-[#F7F6F0]">
                <div>
                  <h2 className="text-base font-display font-extrabold text-[#222E26] dark:text-[#F7F6F0]">{previewTemplate.title}</h2>
                  <p className="text-[#5C6B60] dark:text-[#899D90] mt-1 leading-relaxed">{previewTemplate.description}</p>
                </div>

                <div className="grid grid-cols-3 gap-3 p-3 bg-[#F7F6F0] dark:bg-[#151B17] rounded-xl text-[11px] text-[#5C6B60] dark:text-[#899D90] border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60">
                  <div><strong>Category:</strong> {previewTemplate.category}</div>
                  <div><strong>AI Tool:</strong> {previewTemplate.aiTool}</div>
                  <div><strong>Language:</strong> {previewTemplate.language}</div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#5C6B60] dark:text-[#899D90] uppercase tracking-wider block font-semibold">Prompt Instructions</label>
                  <div className="p-4 rounded-xl border border-[#DFDCD0] dark:border-[#2E3D33] bg-[#F7F6F0]/50 dark:bg-[#151B17]/20 font-mono text-[10px] leading-relaxed text-[#222E26] dark:text-[#F7F6F0] whitespace-pre-wrap select-all">
                    {previewTemplate.prompt}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {previewTemplate.tags.map(tag => (
                    <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EDEBE0] dark:bg-[#2E3D33] text-[#5C6B60] dark:text-[#899D90]">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-[#F7F6F0]/50 dark:bg-[#151B17]/20 flex items-center justify-end gap-3 text-xs">
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="px-4 py-2 border border-[#DFDCD0] dark:border-[#2E3D33] bg-white dark:bg-[#1D2620] hover:bg-[#EDEBE0] dark:hover:bg-[#352D26] rounded-xl font-bold text-[#5C6B60] dark:text-[#899D90] hover:text-[#222E26] dark:hover:text-[#F7F6F0] transition-colors"
                >
                  Close Preview
                </button>
                <button
                  disabled={!isAdmin || duplicatingTitle === previewTemplate.title}
                  onClick={(e) => handleDuplicate(previewTemplate, e)}
                  className="px-5 py-2 bg-[#4A6B53] hover:bg-[#3B5441] text-white dark:bg-[#6E9C7C] dark:hover:bg-[#4A6B53] dark:text-[#151B17] rounded-xl font-bold flex items-center gap-1.5 shadow-sm active:scale-98 transition-all disabled:opacity-50"
                  title={!isAdmin ? 'Login as Admin to duplicate templates' : 'Duplicate to Library'}
                >
                  <Copy className="w-3.5 h-3.5" /> Duplicate to Library
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
