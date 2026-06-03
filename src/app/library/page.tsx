import React from 'react';
import { db } from '@/lib/db/db';
import LibraryWorkspace from '@/components/LibraryWorkspace';

export const revalidate = 0; // Force fresh data load

export default async function LibraryPage() {
  // Fetch initial database state for server-side render
  const [prompts, categories, collections] = await Promise.all([
    db.getPrompts(),
    db.getCategories(),
    db.getCollections(),
  ]);

  const initialData = {
    prompts,
    categories,
    collections,
  };

  return <LibraryWorkspace initialData={initialData} />;
}
