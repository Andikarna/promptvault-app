import { DbAdapter } from './interface';
import { JsonFileAdapter } from './jsonAdapter';
import { GoogleSheetsAdapter } from './sheetsAdapter';

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY;
const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

const isSheetsConfigured = !!(email && privateKey && spreadsheetId);

const globalForDb = global as unknown as {
  dbInstance?: DbAdapter;
};

if (!globalForDb.dbInstance) {
  if (isSheetsConfigured) {
    try {
      globalForDb.dbInstance = new GoogleSheetsAdapter();
      console.log('✅ PromptVault AI: Database running in GOOGLE SHEETS mode.');
    } catch (err) {
      console.error('❌ Failed to construct GoogleSheetsAdapter. Falling back to JSON mode.', err);
      globalForDb.dbInstance = new JsonFileAdapter();
    }
  } else {
    globalForDb.dbInstance = new JsonFileAdapter();
    console.log('ℹ️ PromptVault AI: Database running in LOCAL JSON FILE mode (Google credentials not fully set in .env).');
  }
}

export const db = globalForDb.dbInstance!;
export const isSheetsMode = isSheetsConfigured;
export { DEFAULT_CATEGORIES } from './jsonAdapter'; // Export default seed categories if needed for layout fallbacks
