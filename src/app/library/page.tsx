import React from 'react';
import { db } from '@/lib/db/db';
import LibraryWorkspace from '@/components/LibraryWorkspace';
import { checkIsAdmin } from '@/lib/auth';

export const revalidate = 0; // Force fresh data load

export default async function LibraryPage() {
  // Fetch initial database state for server-side render
  const [prompts, categories, collections, isAdmin] = await Promise.all([
    db.getPrompts(),
    db.getCategories(),
    db.getCollections(),
    checkIsAdmin(),
  ]);

  const initialData = {
    prompts,
    categories,
    collections,
  };

  return <LibraryWorkspace initialData={initialData} isAdmin={isAdmin} />;
}
