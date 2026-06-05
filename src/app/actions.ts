'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db/db';
import { Prompt, Category, Collection, PromptVersion } from '@/lib/types';
import { checkIsAdmin } from '@/lib/auth';

// Helper to generate a random ID
const genId = (prefix: string) => `${prefix}-${Math.random().toString(36).substring(2, 11)}`;

// Input Validation Schemas
const promptSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(250).optional().default(''),
  prompt: z.string().min(1, 'Prompt content is required'),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).default([]),
  aiTool: z.string().min(1, 'AI Tool is required'),
  language: z.string().min(1, 'Language is required'),
  favorite: z.boolean().default(false),
  archived: z.boolean().default(false),
});

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  slug: z.string().min(1, 'Slug is required').max(50),
  description: z.string().max(150).optional(),
});

const collectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  description: z.string().max(200).optional().default(''),
  promptIds: z.array(z.string()).default([]),
});

// Prompts Server Actions
export async function createPromptAction(formData: z.infer<typeof promptSchema>) {
  try {
    if (!(await checkIsAdmin())) {
      return { success: false, error: 'Unauthorized: Read-only mode active.' };
    }
    const validated = promptSchema.parse(formData);
    const id = genId('prompt');
    const now = new Date().toISOString();

    const newPrompt: Prompt = {
      ...validated,
      id,
      createdAt: now,
      updatedAt: now,
    };

    // 1. Save prompt
    await db.createPrompt(newPrompt);

    // 2. Create version 1
    const version: PromptVersion = {
      id: genId('v'),
      promptId: id,
      versionNumber: 1,
      promptContent: validated.prompt,
      title: validated.title,
      description: validated.description,
      tags: validated.tags,
      createdAt: now,
    };
    await db.createVersion(version);

    // 3. Log activity
    await db.logActivity({
      type: 'create',
      promptId: id,
      promptTitle: validated.title,
      details: `Created new prompt in "${validated.category}".`,
    });

    revalidatePath('/');
    revalidatePath('/library');
    return { success: true, data: newPrompt };
  } catch (error) {
    console.error('Error creating prompt:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create prompt' };
  }
}

export async function updatePromptAction(id: string, formData: Partial<z.infer<typeof promptSchema>>) {
  try {
    if (!(await checkIsAdmin())) {
      return { success: false, error: 'Unauthorized: Read-only mode active.' };
    }
    const existing = await db.getPromptById(id);
    if (!existing) throw new Error('Prompt not found');

    const now = new Date().toISOString();
    const updatedFields = {
      ...formData,
      updatedAt: now,
    };

    // Check if the prompt text or title/description/tags changed significantly to increment version
    const contentChanged = formData.prompt !== undefined && formData.prompt !== existing.prompt;
    const metaChanged = (formData.title !== undefined && formData.title !== existing.title) ||
                        (formData.description !== undefined && formData.description !== existing.description) ||
                        (formData.tags !== undefined && JSON.stringify(formData.tags) !== JSON.stringify(existing.tags));

    if (contentChanged || metaChanged) {
      // Find current versions
      const currentVersions = await db.getVersions(id);
      const nextVersionNumber = currentVersions.length > 0 
        ? Math.max(...currentVersions.map(v => v.versionNumber)) + 1 
        : 1;

      // Save a new version record BEFORE updating the main prompt, or save the new state.
      // Saving the updated state as the new version:
      const newVersion: PromptVersion = {
        id: genId('v'),
        promptId: id,
        versionNumber: nextVersionNumber,
        promptContent: formData.prompt !== undefined ? formData.prompt : existing.prompt,
        title: formData.title !== undefined ? formData.title : existing.title,
        description: formData.description !== undefined ? formData.description : existing.description,
        tags: formData.tags !== undefined ? formData.tags : existing.tags,
        createdAt: now,
      };
      await db.createVersion(newVersion);
    }

    const updatedPrompt = await db.updatePrompt(id, updatedFields);

    // Log edit activity
    await db.logActivity({
      type: 'edit',
      promptId: id,
      promptTitle: updatedPrompt.title,
      details: 'Updated prompt contents/metadata.',
    });

    revalidatePath('/');
    revalidatePath('/library');
    revalidatePath(`/prompt/${id}`);
    return { success: true, data: updatedPrompt };
  } catch (error) {
    console.error('Error updating prompt:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update prompt' };
  }
}

export async function deletePromptAction(id: string) {
  try {
    if (!(await checkIsAdmin())) {
      return { success: false, error: 'Unauthorized: Read-only mode active.' };
    }
    const existing = await db.getPromptById(id);
    if (!existing) throw new Error('Prompt not found');

    const success = await db.deletePrompt(id);
    if (success) {
      await db.logActivity({
        type: 'delete',
        promptId: id,
        promptTitle: existing.title,
        details: `Deleted prompt: "${existing.title}".`,
      });
    }

    revalidatePath('/');
    revalidatePath('/library');
    return { success: true };
  } catch (error) {
    console.error('Error deleting prompt:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete prompt' };
  }
}

export async function toggleFavoriteAction(id: string) {
  try {
    if (!(await checkIsAdmin())) {
      return { success: false, error: 'Unauthorized: Read-only mode active.' };
    }
    const existing = await db.getPromptById(id);
    if (!existing) throw new Error('Prompt not found');

    const updated = await db.updatePrompt(id, { favorite: !existing.favorite });
    
    await db.logActivity({
      type: 'favorite',
      promptId: id,
      promptTitle: existing.title,
      details: updated.favorite ? 'Starred prompt.' : 'Unstarred prompt.',
    });

    revalidatePath('/');
    revalidatePath('/library');
    revalidatePath(`/prompt/${id}`);
    return { success: true, favorite: updated.favorite };
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to toggle favorite' };
  }
}

export async function archivePromptAction(id: string) {
  try {
    if (!(await checkIsAdmin())) {
      return { success: false, error: 'Unauthorized: Read-only mode active.' };
    }
    const existing = await db.getPromptById(id);
    if (!existing) throw new Error('Prompt not found');

    const updated = await db.updatePrompt(id, { archived: !existing.archived });

    await db.logActivity({
      type: 'archive',
      promptId: id,
      promptTitle: existing.title,
      details: updated.archived ? 'Archived prompt.' : 'Restored prompt from archive.',
    });

    revalidatePath('/');
    revalidatePath('/library');
    revalidatePath(`/prompt/${id}`);
    return { success: true, archived: updated.archived };
  } catch (error) {
    console.error('Error archiving prompt:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to archive prompt' };
  }
}

export async function duplicatePromptAction(id: string) {
  try {
    if (!(await checkIsAdmin())) {
      return { success: false, error: 'Unauthorized: Read-only mode active.' };
    }
    const existing = await db.getPromptById(id);
    if (!existing) throw new Error('Prompt not found');

    const now = new Date().toISOString();
    const newId = genId('prompt');
    const duplicatedPrompt: Prompt = {
      ...existing,
      id: newId,
      title: `${existing.title} (Copy)`,
      favorite: false,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    await db.createPrompt(duplicatedPrompt);

    // Initial version
    const version: PromptVersion = {
      id: genId('v'),
      promptId: newId,
      versionNumber: 1,
      promptContent: duplicatedPrompt.prompt,
      title: duplicatedPrompt.title,
      description: duplicatedPrompt.description,
      tags: duplicatedPrompt.tags,
      createdAt: now,
    };
    await db.createVersion(version);

    await db.logActivity({
      type: 'duplicate',
      promptId: newId,
      promptTitle: duplicatedPrompt.title,
      details: `Duplicated from "${existing.title}".`,
    });

    revalidatePath('/');
    revalidatePath('/library');
    return { success: true, data: duplicatedPrompt };
  } catch (error) {
    console.error('Error duplicating prompt:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to duplicate prompt' };
  }
}

// Categories Actions
export async function createCategoryAction(formData: z.infer<typeof categorySchema>) {
  try {
    if (!(await checkIsAdmin())) {
      return { success: false, error: 'Unauthorized: Read-only mode active.' };
    }
    const validated = categorySchema.parse(formData);
    const id = genId('cat');
    const newCategory: Category = {
      ...validated,
      id,
    };

    await db.createCategory(newCategory);
    revalidatePath('/');
    revalidatePath('/library');
    return { success: true, data: newCategory };
  } catch (error) {
    console.error('Error creating category:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create category' };
  }
}

export async function deleteCategoryAction(id: string) {
  try {
    if (!(await checkIsAdmin())) {
      return { success: false, error: 'Unauthorized: Read-only mode active.' };
    }
    const success = await db.deleteCategory(id);
    revalidatePath('/');
    revalidatePath('/library');
    return { success };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete category' };
  }
}

// Collections Actions
export async function createCollectionAction(formData: z.infer<typeof collectionSchema>) {
  try {
    if (!(await checkIsAdmin())) {
      return { success: false, error: 'Unauthorized: Read-only mode active.' };
    }
    const validated = collectionSchema.parse(formData);
    const id = genId('col');
    const now = new Date().toISOString();

    const newCollection: Collection = {
      ...validated,
      id,
      createdAt: now,
      updatedAt: now,
    };

    await db.createCollection(newCollection);
    revalidatePath('/');
    revalidatePath('/library');
    return { success: true, data: newCollection };
  } catch (error) {
    console.error('Error creating collection:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create collection' };
  }
}

export async function updateCollectionAction(id: string, formData: Partial<z.infer<typeof collectionSchema>>) {
  try {
    if (!(await checkIsAdmin())) {
      return { success: false, error: 'Unauthorized: Read-only mode active.' };
    }
    const updated = await db.updateCollection(id, formData);
    revalidatePath('/');
    revalidatePath('/library');
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error updating collection:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update collection' };
  }
}

export async function deleteCollectionAction(id: string) {
  try {
    if (!(await checkIsAdmin())) {
      return { success: false, error: 'Unauthorized: Read-only mode active.' };
    }
    const success = await db.deleteCollection(id);
    revalidatePath('/');
    revalidatePath('/library');
    return { success };
  } catch (error) {
    console.error('Error deleting collection:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete collection' };
  }
}

export async function rollbackPromptVersionAction(promptId: string, versionId: string) {
  try {
    if (!(await checkIsAdmin())) {
      return { success: false, error: 'Unauthorized: Read-only mode active.' };
    }
    const prompt = await db.getPromptById(promptId);
    if (!prompt) throw new Error('Prompt not found');

    const versions = await db.getVersions(promptId);
    const targetVersion = versions.find(v => v.id === versionId);
    if (!targetVersion) throw new Error('Target version not found');

    const now = new Date().toISOString();

    // 1. Update the active prompt properties
    const updatedPrompt = await db.updatePrompt(promptId, {
      title: targetVersion.title,
      description: targetVersion.description,
      prompt: targetVersion.promptContent,
      tags: targetVersion.tags,
      updatedAt: now,
    });

    // 2. Create a new version representing the rolled-back state
    const nextVersionNumber = versions.length > 0
      ? Math.max(...versions.map(v => v.versionNumber)) + 1
      : 1;

    const rollbackVersion: PromptVersion = {
      id: genId('v'),
      promptId,
      versionNumber: nextVersionNumber,
      promptContent: targetVersion.promptContent,
      title: targetVersion.title,
      description: targetVersion.description,
      tags: targetVersion.tags,
      createdAt: now,
    };
    await db.createVersion(rollbackVersion);

    // 3. Log activity
    await db.logActivity({
      type: 'rollback',
      promptId,
      promptTitle: updatedPrompt.title,
      details: `Rolled back to Version ${targetVersion.versionNumber}.`,
    });

    revalidatePath('/');
    revalidatePath('/library');
    revalidatePath(`/prompt/${promptId}`);
    return { success: true, data: updatedPrompt };
  } catch (error) {
    console.error('Error rolling back version:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to rollback version' };
  }
}
