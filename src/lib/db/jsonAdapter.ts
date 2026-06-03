import fs from 'fs/promises';
import path from 'path';
import { DbAdapter } from './interface';
import { Prompt, Category, Collection, PromptVersion, ActivityLog } from '../types';

interface Schema {
  prompts: Prompt[];
  categories: Category[];
  collections: Collection[];
  versions: PromptVersion[];
  activities: ActivityLog[];
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Programming', slug: 'programming', description: 'General software development prompts' },
  { id: 'cat-2', name: 'Android', slug: 'android', description: 'Kotlin and Java Android development' },
  { id: 'cat-3', name: 'Flutter', slug: 'flutter', description: 'Dart and Flutter cross-platform mobile' },
  { id: 'cat-4', name: 'ASP.NET', slug: 'aspnet', description: 'C# and ASP.NET Core web development' },
  { id: 'cat-5', name: 'UI/UX', slug: 'uiux', description: 'User interface design and copywriting' },
  { id: 'cat-6', name: 'Marketing', slug: 'marketing', description: 'SEO, sales letters, and content creation' },
  { id: 'cat-7', name: 'AI Agent', slug: 'ai-agent', description: 'LLM agents and system prompt design' },
  { id: 'cat-8', name: 'Game Development', slug: 'game-dev', description: 'Unity, Unreal, and general game logic' },
];

export const DEFAULT_COLLECTIONS: Collection[] = [
  { id: 'col-1', name: 'Mobile Development', description: 'Android, iOS, and Flutter prompts', promptIds: ['prompt-1', 'prompt-3'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'col-2', name: 'Web & Backend', description: 'Next.js, React, C# and databases', promptIds: ['prompt-2'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'col-3', name: 'AI Engineering', description: 'System prompts and agent architectures', promptIds: ['prompt-4'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

export const DEFAULT_PROMPTS: Prompt[] = [
  {
    id: 'prompt-1',
    title: 'Jetpack Compose Clean Architecture Template',
    description: 'Generates a clean architecture boilerplate for a Compose feature block.',
    prompt: 'Create a clean architecture directory layout and starter file code structure in Kotlin for an Android feature called [FeatureName]. Include the Data layer (Repository Implementation, API/Database DataSource), Domain layer (Repository Interface, Use Cases), and Presentation layer (MVI State, Intent, ViewModel, Compose Screen). Ensure compliance with SOLID principles.',
    category: 'Android',
    tags: ['kotlin', 'jetpack-compose', 'mvi', 'clean-architecture'],
    aiTool: 'Claude 3.5 Sonnet',
    language: 'English',
    favorite: true,
    archived: false,
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), // 3 days ago
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString()       // 12 hours ago
  },
  {
    id: 'prompt-2',
    title: 'Next.js 15 Server Action Wrapper',
    description: 'An elegant template for wrapping Next.js Server Actions with error handling and zod validation.',
    prompt: 'Write an NPM-free Next.js 15 Server Action wrapper in TypeScript. It should take a Zod schema for input validation, run the server action, handle database exception catch blocks, and return a standardized JSON response format `{ success: boolean, data?: T, error?: string }`. Document how to use it inside a component with `useActionState`.',
    category: 'Programming',
    tags: ['nextjs', 'typescript', 'server-actions', 'zod'],
    aiTool: 'ChatGPT 4o',
    language: 'English',
    favorite: true,
    archived: false,
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(), // 5 days ago
    updatedAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString()
  },
  {
    id: 'prompt-3',
    title: 'Flutter BLoC Pattern Boilerplate',
    description: 'Builds a robust state management structure using flutter_bloc.',
    prompt: 'Generate Dart code for a complete Flutter BLoC package for a [FeatureName] feature. Provide the state definitions, the event definitions, and the BLoC implementation mapping events to state transitions. Use dynamic lists and asynchronous data fetching mock templates.',
    category: 'Flutter',
    tags: ['flutter', 'dart', 'bloc', 'state-management'],
    aiTool: 'Claude 3.5 Sonnet',
    language: 'English',
    favorite: false,
    archived: false,
    createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(), // 1 day ago
    updatedAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString()
  },
  {
    id: 'prompt-4',
    title: 'ReAct Agent Prompt Template',
    description: 'Core prompt to configure an LLM agent to follow the Reason-and-Action loop.',
    prompt: 'You are an AI Agent with access to tools [tools]. Solve the user request by iterating in a Reason-and-Action loop. For each turn, output: \nThought: [Your reasoning about the current step]\nAction: [The tool name to invoke with inputs]\nObservation: [Wait for tool output]\n\nRepeat this cycle until you have the final answer, then output:\nFinal Answer: [Your final concise solution]\n\nBegin!',
    category: 'AI Agent',
    tags: ['system-prompt', 'react', 'agent', 'llm'],
    aiTool: 'Gemini 1.5 Pro',
    language: 'English',
    favorite: false,
    archived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const DEFAULT_ACTIVITIES: ActivityLog[] = [
  { id: 'act-1', type: 'create', promptId: 'prompt-1', promptTitle: 'Jetpack Compose Clean Architecture Template', timestamp: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), details: 'Created Android prompt.' },
  { id: 'act-2', type: 'create', promptId: 'prompt-2', promptTitle: 'Next.js 15 Server Action Wrapper', timestamp: new Date(Date.now() - 3600000 * 24 * 5).toISOString(), details: 'Created Programming prompt.' },
  { id: 'act-3', type: 'favorite', promptId: 'prompt-1', promptTitle: 'Jetpack Compose Clean Architecture Template', timestamp: new Date(Date.now() - 3600000 * 12).toISOString(), details: 'Marked Jetpack Compose template as favorite.' }
];

export class JsonFileAdapter implements DbAdapter {
  private filePath: string;

  constructor() {
    this.filePath = path.join(process.cwd(), 'src', 'data', 'db.json');
  }

  private async readData(): Promise<Schema> {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      try {
        const fileContent = await fs.readFile(this.filePath, 'utf-8');
        return JSON.parse(fileContent) as Schema;
      } catch {
        // File does not exist, write seed data
        const initialSchema: Schema = {
          prompts: DEFAULT_PROMPTS,
          categories: DEFAULT_CATEGORIES,
          collections: DEFAULT_COLLECTIONS,
          versions: [
            {
              id: 'v-1',
              promptId: 'prompt-1',
              versionNumber: 1,
              promptContent: 'Create Compose layout.',
              title: 'Jetpack Compose Clean Architecture Template',
              description: 'Initial version',
              tags: ['kotlin', 'jetpack-compose'],
              createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
            }
          ],
          activities: DEFAULT_ACTIVITIES
        };
        await this.writeData(initialSchema);
        return initialSchema;
      }
    } catch (e) {
      console.error('Error reading JSON DB file:', e);
      return { prompts: [], categories: [], collections: [], versions: [], activities: [] };
    }
  }

  private async writeData(data: Schema): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing JSON DB file:', e);
    }
  }

  // Prompts
  async getPrompts(): Promise<Prompt[]> {
    const data = await this.readData();
    return data.prompts;
  }

  async getPromptById(id: string): Promise<Prompt | null> {
    const data = await this.readData();
    return data.prompts.find(p => p.id === id) || null;
  }

  async createPrompt(prompt: Prompt): Promise<Prompt> {
    const data = await this.readData();
    data.prompts.push(prompt);
    await this.writeData(data);
    return prompt;
  }

  async updatePrompt(id: string, prompt: Partial<Prompt>): Promise<Prompt> {
    const data = await this.readData();
    const index = data.prompts.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Prompt not found');
    
    data.prompts[index] = {
      ...data.prompts[index],
      ...prompt,
      updatedAt: new Date().toISOString()
    };
    
    await this.writeData(data);
    return data.prompts[index];
  }

  async deletePrompt(id: string): Promise<boolean> {
    const data = await this.readData();
    const lengthBefore = data.prompts.length;
    data.prompts = data.prompts.filter(p => p.id !== id);
    
    // Also remove prompt from collections
    data.collections = data.collections.map(c => ({
      ...c,
      promptIds: c.promptIds.filter(pid => pid !== id)
    }));

    // Also remove prompt versions
    data.versions = data.versions.filter(v => v.promptId !== id);

    await this.writeData(data);
    return data.prompts.length < lengthBefore;
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    const data = await this.readData();
    return data.categories;
  }

  async createCategory(category: Category): Promise<Category> {
    const data = await this.readData();
    data.categories.push(category);
    await this.writeData(data);
    return category;
  }

  async updateCategory(id: string, category: Partial<Category>): Promise<Category> {
    const data = await this.readData();
    const index = data.categories.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Category not found');
    
    data.categories[index] = {
      ...data.categories[index],
      ...category
    };
    
    await this.writeData(data);
    return data.categories[index];
  }

  async deleteCategory(id: string): Promise<boolean> {
    const data = await this.readData();
    const cat = data.categories.find(c => c.id === id);
    if (!cat) return false;
    
    data.categories = data.categories.filter(c => c.id !== id);
    
    // Dissociate from prompts
    data.prompts = data.prompts.map(p => {
      if (p.category === cat.name) {
        return { ...p, category: '' };
      }
      return p;
    });

    await this.writeData(data);
    return true;
  }

  // Collections
  async getCollections(): Promise<Collection[]> {
    const data = await this.readData();
    return data.collections;
  }

  async createCollection(collection: Collection): Promise<Collection> {
    const data = await this.readData();
    data.collections.push(collection);
    await this.writeData(data);
    return collection;
  }

  async updateCollection(id: string, collection: Partial<Collection>): Promise<Collection> {
    const data = await this.readData();
    const index = data.collections.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Collection not found');
    
    data.collections[index] = {
      ...data.collections[index],
      ...collection,
      updatedAt: new Date().toISOString()
    };
    
    await this.writeData(data);
    return data.collections[index];
  }

  async deleteCollection(id: string): Promise<boolean> {
    const data = await this.readData();
    const lengthBefore = data.collections.length;
    data.collections = data.collections.filter(c => c.id !== id);
    await this.writeData(data);
    return data.collections.length < lengthBefore;
  }

  // Versions
  async getVersions(promptId: string): Promise<PromptVersion[]> {
    const data = await this.readData();
    return data.versions.filter(v => v.promptId === promptId);
  }

  async createVersion(version: PromptVersion): Promise<PromptVersion> {
    const data = await this.readData();
    data.versions.push(version);
    await this.writeData(data);
    return version;
  }

  // Activities
  async getActivities(): Promise<ActivityLog[]> {
    const data = await this.readData();
    // Sort activities by timestamp descending
    return [...data.activities].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async logActivity(activity: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog> {
    const data = await this.readData();
    const newActivity: ActivityLog = {
      ...activity,
      id: `act-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };
    data.activities.push(newActivity);
    await this.writeData(data);
    return newActivity;
  }
}
