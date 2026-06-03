import React from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db/db';
import PromptDetailWorkspace from '@/components/PromptDetailWorkspace';

export const revalidate = 0; // Force fresh data load on access

interface PromptPageProps {
  params: Promise<{ id: string }>;
}

export default async function PromptDetailPage({ params }: PromptPageProps) {
  const { id } = await params;

  // Fetch prompt from Google Sheets / JSON DB
  const [prompt, versions, categories] = await Promise.all([
    db.getPromptById(id),
    db.getVersions(id),
    db.getCategories(),
  ]);

  if (!prompt) {
    notFound();
  }

  return (
    <PromptDetailWorkspace 
      prompt={prompt} 
      versions={versions} 
      categories={categories} 
    />
  );
}
