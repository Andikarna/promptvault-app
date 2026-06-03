import { google, sheets_v4 } from 'googleapis';
import { DbAdapter } from './interface';
import { Prompt, Category, Collection, PromptVersion, ActivityLog } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_COLLECTIONS, DEFAULT_PROMPTS, DEFAULT_ACTIVITIES } from './jsonAdapter';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class GoogleSheetsAdapter implements DbAdapter {
  private sheetsInstance: sheets_v4.Sheets;
  private spreadsheetId: string;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  // In-memory cache to mitigate API quotas
  private cache: {
    prompts?: CacheEntry<Prompt[]>;
    categories?: CacheEntry<Category[]>;
    collections?: CacheEntry<Collection[]>;
    versions?: CacheEntry<PromptVersion[]>;
    activities?: CacheEntry<ActivityLog[]>;
  } = {};

  private readonly CACHE_TTL_MS = 10000; // 10 seconds

  private clearCache() {
    this.cache = {};
  }

  constructor() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    if (!email || !privateKey || !spreadsheetId) {
      throw new Error('Missing Google Sheets configuration credentials.');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheetsInstance = google.sheets({ version: 'v4', auth });
    this.spreadsheetId = spreadsheetId;
  }

  private async ensureInitialized() {
    if (this.initialized) return;
    if (!this.initPromise) {
      this.initPromise = this.performInitialization();
    }
    await this.initPromise;
  }

  private async performInitialization() {
    const globalForSheets = global as unknown as {
      sheetsInitialized?: boolean;
    };

    if (globalForSheets.sheetsInitialized) {
      this.initialized = true;
      return;
    }

    try {
      // 1. Fetch spreadsheet to check existing sheets
      const res = await this.sheetsInstance.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheets = res.data.sheets || [];
      const sheetTitles = sheets.map(s => s.properties?.title).filter(Boolean) as string[];

      const requiredSheets = ['Prompts', 'Collections', 'Categories', 'Versions', 'Activities'];
      const sheetsToAdd = requiredSheets.filter(title => 
        !sheetTitles.some(t => t.trim().toLowerCase() === title.toLowerCase())
      );

      // 2. Add missing sheets if any
      if (sheetsToAdd.length > 0) {
        const requests = sheetsToAdd.map(title => ({
          addSheet: {
            properties: { title },
          },
        }));

        await this.sheetsInstance.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: { requests },
        });

        // Initialize headers for the new sheets
        for (const title of sheetsToAdd) {
          const headers = this.getHeadersForSheet(title);
          await this.sheetsInstance.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `${title}!A1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [headers] },
          });
        }
      }

      // Check if existing required sheets have headers
      for (const title of requiredSheets) {
        const wasAdded = sheetsToAdd.includes(title);
        if (!wasAdded) {
          const actualName = sheetTitles.find(t => t.trim().toLowerCase() === title.toLowerCase()) || title;
          const checkRes = await this.sheetsInstance.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: `${actualName}!A1:A1`,
          });
          if (!checkRes.data.values || checkRes.data.values.length === 0) {
            const headers = this.getHeadersForSheet(title);
            await this.sheetsInstance.spreadsheets.values.update({
              spreadsheetId: this.spreadsheetId,
              range: `${actualName}!A1`,
              valueInputOption: 'USER_ENTERED',
              requestBody: { values: [headers] },
            });
          }
        }
      }

      // Seed default data if Categories sheet is empty
      const categoriesCheck = await this.sheetsInstance.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Categories!A2:A2',
      });
      if (!categoriesCheck.data.values || categoriesCheck.data.values.length === 0) {
        // 1. Seed Categories
        const catRows = DEFAULT_CATEGORIES.map(c => [c.id, c.name, c.slug, c.description || '']);
        await this.sheetsInstance.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Categories!A2',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: catRows },
        });

        // 2. Seed Collections
        const colRows = DEFAULT_COLLECTIONS.map(c => [
          c.id,
          c.name,
          c.description,
          c.promptIds.join(','),
          c.createdAt,
          c.updatedAt,
        ]);
        await this.sheetsInstance.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Collections!A2',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: colRows },
        });

        // 3. Seed Prompts
        const promptRows = DEFAULT_PROMPTS.map(p => [
          p.id,
          p.title,
          p.description,
          p.prompt,
          p.category,
          p.tags.join(','),
          p.aiTool,
          p.language,
          p.favorite ? 'TRUE' : 'FALSE',
          p.archived ? 'TRUE' : 'FALSE',
          p.createdAt,
          p.updatedAt,
        ]);
        await this.sheetsInstance.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Prompts!A2',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: promptRows },
        });

        // 4. Seed Versions
        const versionRow = [
          'v-1',
          'prompt-1',
          1,
          'Create Compose layout.',
          'Jetpack Compose Clean Architecture Template',
          'Initial version',
          'kotlin,jetpack-compose',
          new Date(Date.now() - 3600000 * 24 * 3).toISOString()
        ];
        await this.sheetsInstance.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Versions!A2',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [versionRow] },
        });

        // 5. Seed Activities
        const actRows = DEFAULT_ACTIVITIES.map(a => [
          a.id,
          a.type,
          a.promptId,
          a.promptTitle,
          a.timestamp,
          a.details,
        ]);
        await this.sheetsInstance.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Activities!A2',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: actRows },
        });

        console.log('🌱 Seeded default database arrays (Categories, Collections, Prompts, Versions, Activities) into Google Sheets.');
      }

      globalForSheets.sheetsInitialized = true;
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing Google Sheets:', error);
      this.initPromise = null; // Let next attempt retry
      throw new Error(`Failed to initialize Google Sheets database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private getHeadersForSheet(title: string): string[] {
    switch (title) {
      case 'Prompts':
        return ['ID', 'Title', 'Description', 'Prompt', 'Category', 'Tags', 'AITool', 'Language', 'Favorite', 'Archived', 'CreatedAt', 'UpdatedAt'];
      case 'Collections':
        return ['ID', 'Name', 'Description', 'PromptIDs', 'CreatedAt', 'UpdatedAt'];
      case 'Categories':
        return ['ID', 'Name', 'Slug', 'Description'];
      case 'Versions':
        return ['ID', 'PromptID', 'VersionNumber', 'PromptContent', 'Title', 'Description', 'Tags', 'CreatedAt'];
      case 'Activities':
        return ['ID', 'Type', 'PromptID', 'PromptTitle', 'Timestamp', 'Details'];
      default:
        return [];
    }
  }

  // Prompts
  async getPrompts(): Promise<Prompt[]> {
    const now = Date.now();
    if (this.cache.prompts && (now - this.cache.prompts.timestamp < this.CACHE_TTL_MS)) {
      return this.cache.prompts.data;
    }

    await this.ensureInitialized();
    const res = await this.sheetsInstance.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'Prompts!A2:L',
    });

    const rows = res.data.values || [];
    const data = rows.map(row => ({
      id: row[0] || '',
      title: row[1] || '',
      description: row[2] || '',
      prompt: row[3] || '',
      category: row[4] || '',
      tags: row[5] ? row[5].split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      aiTool: row[6] || '',
      language: row[7] || '',
      favorite: row[8] === 'TRUE',
      archived: row[9] === 'TRUE',
      createdAt: row[10] || new Date().toISOString(),
      updatedAt: row[11] || new Date().toISOString(),
    }));

    this.cache.prompts = { data, timestamp: now };
    return data;
  }

  async getPromptById(id: string): Promise<Prompt | null> {
    const prompts = await this.getPrompts();
    return prompts.find(p => p.id === id) || null;
  }

  async createPrompt(prompt: Prompt): Promise<Prompt> {
    await this.ensureInitialized();
    const row = [
      prompt.id,
      prompt.title,
      prompt.description,
      prompt.prompt,
      prompt.category,
      prompt.tags.join(','),
      prompt.aiTool,
      prompt.language,
      prompt.favorite ? 'TRUE' : 'FALSE',
      prompt.archived ? 'TRUE' : 'FALSE',
      prompt.createdAt,
      prompt.updatedAt,
    ];

    await this.sheetsInstance.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: 'Prompts!A:L',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });

    this.clearCache();
    return prompt;
  }

  async updatePrompt(id: string, prompt: Partial<Prompt>): Promise<Prompt> {
    await this.ensureInitialized();
    const prompts = await this.getPrompts();
    const index = prompts.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Prompt not found');

    const updated = {
      ...prompts[index],
      ...prompt,
      updatedAt: new Date().toISOString(),
    };

    const row = [
      updated.id,
      updated.title,
      updated.description,
      updated.prompt,
      updated.category,
      updated.tags.join(','),
      updated.aiTool,
      updated.language,
      updated.favorite ? 'TRUE' : 'FALSE',
      updated.archived ? 'TRUE' : 'FALSE',
      updated.createdAt,
      updated.updatedAt,
    ];

    const rowIndex = index + 2; // +1 for header, +1 for 0-index conversion
    await this.sheetsInstance.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `Prompts!A${rowIndex}:L${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });

    this.clearCache();
    return updated;
  }

  async deletePrompt(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const prompts = await this.getPrompts();
    const filtered = prompts.filter(p => p.id !== id);
    if (filtered.length === prompts.length) return false;

    // Rewrite sheet (Clear old, write remaining)
    await this.sheetsInstance.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range: 'Prompts!A2:L',
    });

    if (filtered.length > 0) {
      const rows = filtered.map(p => [
        p.id,
        p.title,
        p.description,
        p.prompt,
        p.category,
        p.tags.join(','),
        p.aiTool,
        p.language,
        p.favorite ? 'TRUE' : 'FALSE',
        p.archived ? 'TRUE' : 'FALSE',
        p.createdAt,
        p.updatedAt,
      ]);

      await this.sheetsInstance.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Prompts!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
      });
    }

    // Clean up collections containing this ID
    const collections = await this.getCollections();
    for (const col of collections) {
      if (col.promptIds.includes(id)) {
        await this.updateCollection(col.id, {
          promptIds: col.promptIds.filter(pid => pid !== id),
        });
      }
    }

    this.clearCache();
    return true;
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    const now = Date.now();
    if (this.cache.categories && (now - this.cache.categories.timestamp < this.CACHE_TTL_MS)) {
      return this.cache.categories.data;
    }

    await this.ensureInitialized();
    const res = await this.sheetsInstance.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'Categories!A2:D',
    });

    const rows = res.data.values || [];
    const data = rows.map(row => ({
      id: row[0] || '',
      name: row[1] || '',
      slug: row[2] || '',
      description: row[3] || '',
    }));

    this.cache.categories = { data, timestamp: now };
    return data;
  }

  async createCategory(category: Category): Promise<Category> {
    await this.ensureInitialized();
    const row = [category.id, category.name, category.slug, category.description || ''];
    await this.sheetsInstance.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: 'Categories!A:D',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
    this.clearCache();
    return category;
  }

  async updateCategory(id: string, category: Partial<Category>): Promise<Category> {
    await this.ensureInitialized();
    const categories = await this.getCategories();
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Category not found');

    const updated = {
      ...categories[index],
      ...category,
    };

    const row = [updated.id, updated.name, updated.slug, updated.description || ''];
    const rowIndex = index + 2;

    await this.sheetsInstance.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `Categories!A${rowIndex}:D${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });

    this.clearCache();
    return updated;
  }

  async deleteCategory(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const categories = await this.getCategories();
    const cat = categories.find(c => c.id === id);
    if (!cat) return false;

    const filtered = categories.filter(c => c.id !== id);

    await this.sheetsInstance.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range: 'Categories!A2:D',
    });

    if (filtered.length > 0) {
      const rows = filtered.map(c => [c.id, c.name, c.slug, c.description || '']);
      await this.sheetsInstance.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Categories!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
      });
    }

    // Dissociate from prompts
    const prompts = await this.getPrompts();
    for (const p of prompts) {
      if (p.category === cat.name) {
        await this.updatePrompt(p.id, { category: '' });
      }
    }

    this.clearCache();
    return true;
  }

  // Collections
  async getCollections(): Promise<Collection[]> {
    const now = Date.now();
    if (this.cache.collections && (now - this.cache.collections.timestamp < this.CACHE_TTL_MS)) {
      return this.cache.collections.data;
    }

    await this.ensureInitialized();
    const res = await this.sheetsInstance.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'Collections!A2:F',
    });

    const rows = res.data.values || [];
    const data = rows.map(row => ({
      id: row[0] || '',
      name: row[1] || '',
      description: row[2] || '',
      promptIds: row[3] ? row[3].split(',').map((id: string) => id.trim()).filter(Boolean) : [],
      createdAt: row[4] || new Date().toISOString(),
      updatedAt: row[5] || new Date().toISOString(),
    }));

    this.cache.collections = { data, timestamp: now };
    return data;
  }

  async createCollection(collection: Collection): Promise<Collection> {
    await this.ensureInitialized();
    const row = [
      collection.id,
      collection.name,
      collection.description,
      collection.promptIds.join(','),
      collection.createdAt,
      collection.updatedAt,
    ];

    await this.sheetsInstance.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: 'Collections!A:F',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });

    this.clearCache();
    return collection;
  }

  async updateCollection(id: string, collection: Partial<Collection>): Promise<Collection> {
    await this.ensureInitialized();
    const collections = await this.getCollections();
    const index = collections.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Collection not found');

    const updated = {
      ...collections[index],
      ...collection,
      updatedAt: new Date().toISOString(),
    };

    const row = [
      updated.id,
      updated.name,
      updated.description,
      updated.promptIds.join(','),
      updated.createdAt,
      updated.updatedAt,
    ];

    const rowIndex = index + 2;
    await this.sheetsInstance.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `Collections!A${rowIndex}:F${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });

    this.clearCache();
    return updated;
  }

  async deleteCollection(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const collections = await this.getCollections();
    const filtered = collections.filter(c => c.id !== id);
    if (filtered.length === collections.length) return false;

    await this.sheetsInstance.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range: 'Collections!A2:F',
    });

    if (filtered.length > 0) {
      const rows = filtered.map(c => [
        c.id,
        c.name,
        c.description,
        c.promptIds.join(','),
        c.createdAt,
        c.updatedAt,
      ]);

      await this.sheetsInstance.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Collections!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
      });
    }

    this.clearCache();
    return true;
  }

  // Versions
  async getVersions(promptId: string): Promise<PromptVersion[]> {
    const now = Date.now();
    let allVersions: PromptVersion[];

    if (this.cache.versions && (now - this.cache.versions.timestamp < this.CACHE_TTL_MS)) {
      allVersions = this.cache.versions.data;
    } else {
      await this.ensureInitialized();
      const res = await this.sheetsInstance.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Versions!A2:H',
      });

      const rows = res.data.values || [];
      allVersions = rows.map(row => ({
        id: row[0] || '',
        promptId: row[1] || '',
        versionNumber: parseInt(row[2] || '1', 10),
        promptContent: row[3] || '',
        title: row[4] || '',
        description: row[5] || '',
        tags: row[6] ? row[6].split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        createdAt: row[7] || new Date().toISOString(),
      }));

      this.cache.versions = { data: allVersions, timestamp: now };
    }

    return allVersions.filter(v => v.promptId === promptId);
  }

  async createVersion(version: PromptVersion): Promise<PromptVersion> {
    await this.ensureInitialized();
    const row = [
      version.id,
      version.promptId,
      version.versionNumber,
      version.promptContent,
      version.title,
      version.description,
      version.tags.join(','),
      version.createdAt,
    ];

    await this.sheetsInstance.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: 'Versions!A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });

    this.clearCache();
    return version;
  }

  // Activities
  async getActivities(): Promise<ActivityLog[]> {
    const now = Date.now();
    if (this.cache.activities && (now - this.cache.activities.timestamp < this.CACHE_TTL_MS)) {
      return this.cache.activities.data;
    }

    await this.ensureInitialized();
    const res = await this.sheetsInstance.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'Activities!A2:F',
    });

    const rows = res.data.values || [];
    const logs = rows.map(row => ({
      id: row[0] || '',
      type: row[1] as ActivityLog['type'],
      promptId: row[2] || '',
      promptTitle: row[3] || '',
      timestamp: row[4] || new Date().toISOString(),
      details: row[5] || '',
    }));

    // Sort by timestamp descending
    const data = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    this.cache.activities = { data, timestamp: now };
    return data;
  }

  async logActivity(activity: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog> {
    await this.ensureInitialized();
    const id = `act-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    const row = [id, activity.type, activity.promptId, activity.promptTitle, timestamp, activity.details];

    await this.sheetsInstance.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: 'Activities!A:F',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });

    this.clearCache();
    return {
      ...activity,
      id,
      timestamp,
    };
  }
}
