import { Prompt, Category, Collection, PromptVersion, ActivityLog } from '../types';

export interface DbAdapter {
  // Prompts
  getPrompts(): Promise<Prompt[]>;
  getPromptById(id: string): Promise<Prompt | null>;
  createPrompt(prompt: Prompt): Promise<Prompt>;
  updatePrompt(id: string, prompt: Partial<Prompt>): Promise<Prompt>;
  deletePrompt(id: string): Promise<boolean>;
  
  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: Category): Promise<Category>;
  updateCategory(id: string, category: Partial<Category>): Promise<Category>;
  deleteCategory(id: string): Promise<boolean>;
  
  // Collections
  getCollections(): Promise<Collection[]>;
  createCollection(collection: Collection): Promise<Collection>;
  updateCollection(id: string, collection: Partial<Collection>): Promise<Collection>;
  deleteCollection(id: string): Promise<boolean>;
  
  // Versions
  getVersions(promptId: string): Promise<PromptVersion[]>;
  createVersion(version: PromptVersion): Promise<PromptVersion>;
  
  // Activities
  getActivities(): Promise<ActivityLog[]>;
  logActivity(activity: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog>;
}
