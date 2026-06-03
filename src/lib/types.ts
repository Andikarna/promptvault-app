export interface Prompt {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: string;
  tags: string[];
  aiTool: string;
  language: string;
  favorite: boolean;
  archived: boolean;
  createdAt: string; // ISO 8601 string for clean serialization
  updatedAt: string; // ISO 8601 string for clean serialization
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  promptIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PromptVersion {
  id: string;
  promptId: string;
  versionNumber: number;
  promptContent: string;
  title: string;
  description: string;
  tags: string[];
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  type: 'create' | 'edit' | 'delete' | 'rollback' | 'favorite' | 'archive' | 'duplicate';
  promptId: string;
  promptTitle: string;
  timestamp: string;
  details: string;
}

export interface AIActionResponse {
  success: boolean;
  enhancedPrompt?: string;
  tags?: string[];
  category?: string;
  error?: string;
}
